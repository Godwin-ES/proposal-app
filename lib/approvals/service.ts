import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import type { CurrentUser } from "@/lib/auth/current-user";
import { getProposalForOwner } from "@/lib/proposals/service";
import { getProposal, rowToIntake } from "@/lib/repositories/proposals";
import { getVersion } from "@/lib/repositories/versions";
import * as approvalsRepo from "@/lib/repositories/approvals";
import { evaluateApprovalReadiness } from "@/lib/domain/readiness";
import { isEditableStatus } from "@/lib/domain/state-machine";
import { DomainError } from "@/lib/domain/errors";

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
  const intake = rowToIntake(proposal);
  const approvalBlockers = evaluateApprovalReadiness({ intake, snapshot: version.snapshot, hasCurrentVersion: true });
  if (approvalBlockers.length > 0) {
    throw new DomainError(
      "READINESS_ERROR",
      "submit-approval",
      `Cannot submit yet — missing: ${approvalBlockers.join(", ")}.`,
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

export async function getApprovalReview(supabase: SupabaseClient<Database>, proposalId: string) {
  const proposal = await getProposal(supabase, proposalId);

  if (proposal.status !== "pending_approval" || !proposal.current_version_id) {
    throw new DomainError(
      "NOT_FOUND",
      "approval-review",
      "This proposal is not currently awaiting approval.",
      false
    );
  }

  const version = await getVersion(supabase, proposal.current_version_id);
  return { proposal, version };
}
