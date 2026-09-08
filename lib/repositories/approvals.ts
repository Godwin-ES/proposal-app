import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { DomainError, mapRpcError } from "@/lib/domain/errors";

type ApprovalRowBase = Database["public"]["Tables"]["approvals"]["Row"];
export type ApprovalRow = Omit<ApprovalRowBase, "decision"> & { decision: "approved" | "changes_requested" };

export async function listApprovalsForProposal(
  supabase: SupabaseClient<Database>,
  proposalId: string
): Promise<ApprovalRow[]> {
  const { data, error } = await supabase
    .from("approvals")
    .select()
    .eq("proposal_id", proposalId)
    .order("created_at", { ascending: false });

  if (error) throw new DomainError("VALIDATION_ERROR", "approval-list", error.message, true);
  return (data ?? []) as ApprovalRow[];
}

export async function submitForApproval(
  supabase: SupabaseClient<Database>,
  proposalId: string,
  expectedCurrentVersionId: string
) {
  const { data, error } = await supabase
    .rpc("submit_proposal_for_approval", {
      p_proposal_id: proposalId,
      p_expected_current_version_id: expectedCurrentVersionId,
    })
    .single();

  if (error) throw mapRpcError(error, "submit-approval");
  return data;
}

export async function decideApproval(
  supabase: SupabaseClient<Database>,
  input: { proposalId: string; versionId: string; decision: "approved" | "changes_requested"; comments: string | null }
): Promise<ApprovalRow> {
  const { data, error } = await supabase
    .rpc("decide_proposal_approval", {
      p_proposal_id: input.proposalId,
      p_version_id: input.versionId,
      p_decision: input.decision,
      p_comments: input.comments as unknown as string,
    })
    .single();

  if (error) throw mapRpcError(error, "decide-approval");
  return data as ApprovalRow;
}

export async function listPendingApprovalReviewProposals(supabase: SupabaseClient<Database>) {
  const { data, error } = await supabase
    .from("proposals")
    .select()
    .eq("status", "pending_approval")
    .order("approval_submitted_at", { ascending: true });

  if (error) throw new DomainError("VALIDATION_ERROR", "approval-queue", error.message, true);
  return data ?? [];
}
