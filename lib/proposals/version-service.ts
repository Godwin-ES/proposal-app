import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import type { CurrentUser } from "@/lib/auth/current-user";
import type { ProposalSnapshot } from "@/lib/domain/types";
import { getProposalForOwner } from "@/lib/proposals/service";
import { getVersion, listVersionsForProposal, createProposalVersion, type VersionRow } from "@/lib/repositories/versions";
import { proposalSnapshotSchema } from "@/lib/domain/schemas";
import { hashProposalSnapshot } from "@/lib/domain/hashing";
import { evaluateApprovalReadiness } from "@/lib/domain/readiness";
import { computeEditableStatus, assertVersionWritableStatus } from "@/lib/domain/state-machine";
import { DomainError } from "@/lib/domain/errors";

export async function saveManualRevision(
  supabase: SupabaseClient<Database>,
  proposalId: string,
  expectedVersionId: string,
  snapshot: ProposalSnapshot,
  user: CurrentUser
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

  const approvalBlockers = evaluateApprovalReadiness({ snapshot: parsed.data, hasCurrentVersion: true });
  const nextStatus = computeEditableStatus(approvalBlockers, []);
  const contentHash = hashProposalSnapshot(parsed.data);

  return createProposalVersion(supabase, {
    proposalId,
    expectedCurrentVersionId: expectedVersionId,
    snapshot: parsed.data,
    contentHash,
    changeType: "manual_edit",
    changedSection: null,
    revisionInstruction: null,
    clarificationFlags: [],
    nextStatus,
  });
}

export async function getVersionHistory(
  supabase: SupabaseClient<Database>,
  proposalId: string,
  user: CurrentUser
): Promise<VersionRow[]> {
  await getProposalForOwner(supabase, proposalId, user);
  return listVersionsForProposal(supabase, proposalId);
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
