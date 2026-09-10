import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import type { CurrentUser } from "@/lib/auth/current-user";
import { getProposalForOwner } from "@/lib/proposals/service";
import { getProposal } from "@/lib/repositories/proposals";
import { getVersion } from "@/lib/repositories/versions";
import * as approvalsRepo from "@/lib/repositories/approvals";
import * as proposalsRepo from "@/lib/repositories/proposals";
import { evaluateApprovalReadiness } from "@/lib/domain/readiness";
import { isEditableStatus } from "@/lib/domain/state-machine";
import { DomainError } from "@/lib/domain/errors";
import type { ProposalStatus } from "@/lib/domain/types";

export async function submitProposalForApproval(
  supabase: SupabaseClient<Database>,
  proposalId: string,
  expectedVersionId: string,
  user: CurrentUser
) {
  const proposal = await getProposalForOwner(supabase, proposalId, user);

  if (!isEditableStatus(proposal.status)) {
    throw new DomainError(
      "INVALID_STATE",
      "submit-approval",
      `This proposal cannot be submitted for approval in its current status (${proposal.status}).`,
      false
    );
  }

  if (!proposal.current_version_id) {
    throw new DomainError("READINESS_ERROR", "submit-approval", "There is no generated version to submit.", true);
  }

  const version = await getVersion(supabase, proposal.current_version_id);
  const approvalBlockers = evaluateApprovalReadiness({ snapshot: version.snapshot, hasCurrentVersion: true });
  if (approvalBlockers.length > 0) {
    throw new DomainError(
      "READINESS_ERROR",
      "submit-approval",
      `Cannot submit yet — missing: ${approvalBlockers.join(", ")}.`,
      true
    );
  }

  if (version.clarification_flags.length > 0) {
    throw new DomainError(
      "READINESS_ERROR",
      "submit-approval",
      "Resolve or dismiss the AI's flagged concerns before submitting.",
      true
    );
  }

  return approvalsRepo.submitForApproval(supabase, proposalId, expectedVersionId);
}

export async function decideProposalApproval(
  supabase: SupabaseClient<Database>,
  input: { proposalId: string; versionId: string; decision: "approved" | "changes_requested"; comments: string | null }
) {
  return approvalsRepo.decideApproval(supabase, input);
}

export async function getApprovalQueue(supabase: SupabaseClient<Database>) {
  return approvalsRepo.listPendingApprovalReviewProposals(supabase);
}

// Everything an approver may ever open a read-only review for. `pending_approval`
// is the one they can still act on; `changes_requested` and `approved` are past
// decisions kept visible for reference — current_version_id keeps pointing at
// exactly the version that was decided on regardless of which way it went (see
// decide_proposal_approval in supabase/migrations/003_week3_business_rpcs.sql),
// so the same lookup works for all three.
const APPROVER_VIEWABLE_STATUSES: ProposalStatus[] = ["pending_approval", "changes_requested", "approved"];

export async function listApprovalStatusProposals(supabase: SupabaseClient<Database>, statuses: ProposalStatus[]) {
  return proposalsRepo.listProposalsByStatuses(supabase, statuses);
}

export async function getApprovalReview(supabase: SupabaseClient<Database>, proposalId: string) {
  const proposal = await getProposal(supabase, proposalId);

  if (!APPROVER_VIEWABLE_STATUSES.includes(proposal.status) || !proposal.current_version_id) {
    throw new DomainError("NOT_FOUND", "approval-review", "This proposal is not available for review.", false);
  }

  const version = await getVersion(supabase, proposal.current_version_id);
  const decisions = await approvalsRepo.listApprovalsForProposal(supabase, proposalId);
  return { proposal, version, decisions };
}
