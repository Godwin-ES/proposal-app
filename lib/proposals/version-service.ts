import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import type { CurrentUser } from "@/lib/auth/current-user";
import type { ChangedSectionLabel, ClarificationFlag, ProposalSectionKey, ProposalSnapshot } from "@/lib/domain/types";
import { PROPOSAL_SECTION_KEYS } from "@/lib/domain/types";
import { getProposalForOwner } from "@/lib/proposals/service";
import {
  getVersion,
  listVersionsForProposal,
  createProposalVersion,
  dismissClarificationFlag as dismissClarificationFlagRepo,
  type VersionRow,
} from "@/lib/repositories/versions";
import { attachGenerationRunsToVersion } from "@/lib/repositories/generations";
import { proposalSnapshotSchema } from "@/lib/domain/schemas";
import { hashProposalSnapshot } from "@/lib/domain/hashing";
import { evaluateApprovalReadiness } from "@/lib/domain/readiness";
import { computeEditableStatus, assertVersionWritableStatus } from "@/lib/domain/state-machine";
import { carryForwardClarificationFlags, openClarificationFlags } from "@/lib/domain/clarification";
import { DomainError } from "@/lib/domain/errors";

export async function saveManualRevision(
  supabase: SupabaseClient<Database>,
  proposalId: string,
  expectedVersionId: string,
  snapshot: ProposalSnapshot,
  user: CurrentUser,
  changedSections: ChangedSectionLabel[] = [],
  // Fresh flags raised by any section regeneration(s) folded into this same
  // batch (see regenerateSectionPreview) — never carried automatically like
  // previousFlags, since they only became real once the batch is actually
  // saved, not at the moment the AI call happened.
  freshClarificationFlags: ClarificationFlag[] = [],
  // generation_runs rows produced by regenerations in this same batch, to be
  // retroactively linked to whatever version this call creates — see
  // attachGenerationRunsToVersion.
  regenerationRunIds: string[] = []
): Promise<VersionRow> {
  const proposal = await getProposalForOwner(supabase, proposalId, user);
  assertVersionWritableStatus(proposal.status);

  const parsed = proposalSnapshotSchema.safeParse(snapshot);
  if (!parsed.success) {
    throw new DomainError(
      "VALIDATION_ERROR",
      "manual-edit",
      parsed.error.issues[0]?.message ?? "The proposal content is invalid.",
      true
    );
  }

  // Only the AI-regeneratable sections can carry a clarification flag, so
  // only editing one of those can resolve one — a Next Steps/Timeline/
  // Pricing/Client Details edit still records `changedSections` for history
  // below, but must not silently clear an unrelated flag.
  const resolvedSections = changedSections.filter((s): s is ProposalSectionKey =>
    (PROPOSAL_SECTION_KEYS as string[]).includes(s)
  );
  const previousFlags = (await getVersion(supabase, expectedVersionId)).clarification_flags as ClarificationFlag[];
  const clarificationFlags = carryForwardClarificationFlags(previousFlags, resolvedSections, freshClarificationFlags);

  const approvalBlockers = evaluateApprovalReadiness({ snapshot: parsed.data, hasCurrentVersion: true });
  const nextStatus = computeEditableStatus(approvalBlockers, openClarificationFlags(clarificationFlags));
  const contentHash = hashProposalSnapshot(parsed.data);

  // A batch that folded in any section regeneration is labeled as such even
  // if it also included plain manual edits — the changed-sections list
  // already itemizes exactly what changed either way; this label is what
  // material-attribution.ts no longer even depends on (it derives
  // groundedness from linked generation_runs directly), so it's purely
  // descriptive history at this point.
  const changeType = regenerationRunIds.length > 0 ? "section_regeneration" : "manual_edit";

  const version = await createProposalVersion(supabase, {
    proposalId,
    expectedCurrentVersionId: expectedVersionId,
    snapshot: parsed.data,
    contentHash,
    changeType,
    changedSections,
    revisionInstruction: null,
    clarificationFlags,
    nextStatus,
  });

  if (regenerationRunIds.length > 0) {
    await attachGenerationRunsToVersion(supabase, regenerationRunIds, version.id);
  }

  return version;
}

export async function getVersionHistory(
  supabase: SupabaseClient<Database>,
  proposalId: string,
  user: CurrentUser
): Promise<VersionRow[]> {
  await getProposalForOwner(supabase, proposalId, user);
  return listVersionsForProposal(supabase, proposalId);
}

export async function dismissClarificationFlag(
  supabase: SupabaseClient<Database>,
  proposalId: string,
  versionId: string,
  flagId: string,
  user: CurrentUser
): Promise<VersionRow> {
  await getProposalForOwner(supabase, proposalId, user);
  return dismissClarificationFlagRepo(supabase, proposalId, versionId, flagId);
}

export async function getVersionSnapshot(
  supabase: SupabaseClient<Database>,
  versionId: string,
  user: CurrentUser
): Promise<VersionRow> {
  const version = await getVersion(supabase, versionId);
  await getProposalForOwner(supabase, version.proposal_id, user);
  return version;
}
