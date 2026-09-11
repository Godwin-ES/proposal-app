import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import type { CurrentUser } from "@/lib/auth/current-user";
import type { ClarificationFlag, ClaudeModel, ProposalSectionKey, ProposalSnapshot } from "@/lib/domain/types";
import { PROPOSAL_SECTION_KEYS } from "@/lib/domain/types";
import { withFlagIds, openClarificationFlags } from "@/lib/domain/clarification";
import { rowToIntake } from "@/lib/repositories/proposals";
import { getProposalForOwner } from "@/lib/proposals/service";
import { getGenerationMaterials } from "@/lib/materials/service";
import { insertGenerationRun, completeGenerationRun } from "@/lib/repositories/generations";
import { createProposalVersion, type VersionRow } from "@/lib/repositories/versions";
import { getProvider } from "@/lib/ai/provider";
import { composeInitialSnapshot, composeRegeneratedSnapshot } from "@/lib/proposals/compose";
import { hashProposalSnapshot } from "@/lib/domain/hashing";
import { evaluateApprovalReadiness, evaluateGenerationReadiness } from "@/lib/domain/readiness";
import { proposalSnapshotSchema } from "@/lib/domain/schemas";
import {
  computeEditableStatus,
  assertEditableStatus,
  assertVersionWritableStatus,
} from "@/lib/domain/state-machine";
import { DomainError } from "@/lib/domain/errors";

export async function generateInitialDraft(
  supabase: SupabaseClient<Database>,
  proposalId: string,
  model: ClaudeModel,
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

  const run = await insertGenerationRun(supabase, {
    proposalId,
    baseVersionId: null,
    provider: "anthropic",
    model,
    operation: "initial_generation",
    targetSection: null,
    createdBy: user.userId,
  });

  let aiResult;
  try {
    aiResult = await getProvider().generate({ model, intake, supportingMaterials: materialsResult.materials });
  } catch (error) {
    await completeGenerationRun(supabase, run.id, {
      status: "failed",
      error: error instanceof Error ? error.message : "Generation failed.",
    });
    throw error;
  }

  const snapshot = composeInitialSnapshot(intake, aiResult.data);
  const contentHash = hashProposalSnapshot(snapshot);
  const approvalBlockers = evaluateApprovalReadiness({ snapshot, hasCurrentVersion: true });
  const clarificationFlags = withFlagIds(aiResult.data.clarificationFlags);
  const nextStatus = computeEditableStatus(approvalBlockers, openClarificationFlags(clarificationFlags));

  let version: VersionRow;
  try {
    version = await createProposalVersion(supabase, {
      proposalId,
      expectedCurrentVersionId: null,
      snapshot,
      contentHash,
      changeType: "initial_generation",
      changedSections: [],
      revisionInstruction: null,
      clarificationFlags,
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

/**
 * Regenerates one section against the caller's current (possibly still
 * unsaved) draft snapshot, without creating a version or persisting
 * anything beyond the generation_runs audit row itself (its
 * `output_version_id` stays null). This lets a regeneration be combined
 * with other manual edits and saved together as a single version — see
 * saveManualRevision, which merges the returned clarificationFlags in and
 * attaches this run's id to whatever version the batch eventually becomes.
 */
export async function regenerateSectionPreview(
  supabase: SupabaseClient<Database>,
  proposalId: string,
  targetSection: ProposalSectionKey,
  instruction: string,
  model: ClaudeModel,
  currentSnapshot: ProposalSnapshot,
  user: CurrentUser
): Promise<{ snapshot: ProposalSnapshot; clarificationFlags: ClarificationFlag[]; generationRunId: string }> {
  if (!PROPOSAL_SECTION_KEYS.includes(targetSection)) {
    throw new DomainError("VALIDATION_ERROR", "section-regeneration", "Unsupported regeneration target.", false);
  }
  if (!instruction.trim()) {
    throw new DomainError("VALIDATION_ERROR", "section-regeneration", "A revision instruction is required.", false);
  }

  const proposal = await getProposalForOwner(supabase, proposalId, user);
  assertVersionWritableStatus(proposal.status);

  if (!proposal.current_version_id) {
    throw new DomainError(
      "INVALID_STATE",
      "section-regeneration",
      "This proposal has no generated version yet.",
      false
    );
  }

  const parsedSnapshot = proposalSnapshotSchema.safeParse(currentSnapshot);
  if (!parsedSnapshot.success) {
    throw new DomainError(
      "VALIDATION_ERROR",
      "section-regeneration",
      parsedSnapshot.error.issues[0]?.message ?? "The current proposal content is invalid.",
      true
    );
  }

  const materialsResult = await getGenerationMaterials(supabase, proposalId, user);
  if (!materialsResult.ok) {
    throw new DomainError("READINESS_ERROR", "section-regeneration", materialsResult.reason, true);
  }

  const run = await insertGenerationRun(supabase, {
    proposalId,
    baseVersionId: proposal.current_version_id,
    provider: "anthropic",
    model,
    operation: "section_regeneration",
    targetSection,
    createdBy: user.userId,
  });

  let aiResult;
  try {
    aiResult = await getProvider().regenerateSection({
      model,
      targetSection,
      instruction,
      currentSnapshot: parsedSnapshot.data,
      supportingMaterials: materialsResult.materials,
    });
  } catch (error) {
    await completeGenerationRun(supabase, run.id, {
      status: "failed",
      error: error instanceof Error ? error.message : "Regeneration failed.",
    });
    throw error;
  }

  const newSnapshot = composeRegeneratedSnapshot(
    parsedSnapshot.data,
    targetSection,
    aiResult.data.content as never
  );
  const clarificationFlags = withFlagIds(aiResult.data.clarificationFlags);

  await completeGenerationRun(supabase, run.id, {
    status: "succeeded",
    outputVersionId: null,
    latencyMs: aiResult.latencyMs,
    inputTokens: aiResult.inputTokens,
    outputTokens: aiResult.outputTokens,
    materialUsage: aiResult.data.supportingMaterialUsage,
  });

  return { snapshot: newSnapshot, clarificationFlags, generationRunId: run.id };
}
