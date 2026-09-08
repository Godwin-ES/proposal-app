import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import type { CurrentUser } from "@/lib/auth/current-user";
import type { GenerationProvider } from "@/lib/domain/types";
import { rowToIntake } from "@/lib/repositories/proposals";
import { getProposalForOwner } from "@/lib/proposals/service";
import { getGenerationMaterials } from "@/lib/materials/service";
import { insertGenerationRun, completeGenerationRun } from "@/lib/repositories/generations";
import { createProposalVersion, type VersionRow } from "@/lib/repositories/versions";
import { getProvider, defaultModelFor } from "@/lib/ai/provider";
import { composeInitialSnapshot } from "@/lib/proposals/compose";
import { hashProposalSnapshot } from "@/lib/domain/hashing";
import { evaluateApprovalReadiness, evaluateGenerationReadiness } from "@/lib/domain/readiness";
import { computeEditableStatus, assertEditableStatus } from "@/lib/domain/state-machine";
import { DomainError } from "@/lib/domain/errors";

export async function generateInitialDraft(
  supabase: SupabaseClient<Database>,
  proposalId: string,
  provider: GenerationProvider,
  user: CurrentUser
): Promise<VersionRow> {
  const proposal = await getProposalForOwner(supabase, proposalId, user);
  assertEditableStatus(proposal.status);

  if (proposal.current_version_id) {
    throw new DomainError(
      "INVALID_STATE",
      "generation-readiness",
      "This proposal already has a generated draft. Use section regeneration or manual edits instead.",
      false
    );
  }

  const intake = rowToIntake(proposal);
  const generationBlockers = evaluateGenerationReadiness(intake);
  if (generationBlockers.length > 0) {
    throw new DomainError(
      "READINESS_ERROR",
      "generation-readiness",
      `Cannot generate yet — missing: ${generationBlockers.join(", ")}.`,
      true
    );
  }

  const materialsResult = await getGenerationMaterials(supabase, proposalId, user);
  if (!materialsResult.ok) {
    throw new DomainError("READINESS_ERROR", "generation-readiness", materialsResult.reason, true);
  }

  const model = defaultModelFor(provider);
  const run = await insertGenerationRun(supabase, {
    proposalId,
    baseVersionId: null,
    provider,
    model,
    operation: "initial_generation",
    targetSection: null,
    createdBy: user.userId,
  });

  let aiResult;
  try {
    aiResult = await getProvider(provider).generate({ model, intake, supportingMaterials: materialsResult.materials });
  } catch (error) {
    await completeGenerationRun(supabase, run.id, {
      status: "failed",
      error: error instanceof Error ? error.message : "Generation failed.",
    });
    throw error;
  }

  const snapshot = composeInitialSnapshot(intake, aiResult.data);
  const contentHash = hashProposalSnapshot(snapshot);
  const approvalBlockers = evaluateApprovalReadiness({ intake, snapshot, hasCurrentVersion: true });
  const nextStatus = computeEditableStatus(approvalBlockers, aiResult.data.clarificationFlags);

  let version: VersionRow;
  try {
    version = await createProposalVersion(supabase, {
      proposalId,
      expectedCurrentVersionId: null,
      snapshot,
      contentHash,
      changeType: "initial_generation",
      changedSection: null,
      revisionInstruction: null,
      clarificationFlags: aiResult.data.clarificationFlags,
      nextStatus,
    });
  } catch (error) {
    await completeGenerationRun(supabase, run.id, {
      status: error instanceof DomainError && error.code === "STALE_VERSION" ? "stale" : "failed",
      error: error instanceof Error ? error.message : "Version creation failed.",
    });
    throw error;
  }

  await completeGenerationRun(supabase, run.id, {
    status: "succeeded",
    outputVersionId: version.id,
    latencyMs: aiResult.latencyMs,
    inputTokens: aiResult.inputTokens,
    outputTokens: aiResult.outputTokens,
    materialUsage: aiResult.data.supportingMaterialUsage,
  });

  return version;
}
