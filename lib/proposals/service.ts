import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import * as proposalsRepo from "@/lib/repositories/proposals";
import { proposalIntakeSchema, clientEmailSchema } from "@/lib/domain/schemas";
import { DomainError } from "@/lib/domain/errors";
import { removeProposalStorage } from "@/lib/storage/cleanup";
import type { CurrentUser } from "@/lib/auth/current-user";
import type { ProposalIntake, ProposalStatus } from "@/lib/domain/types";

// Only statuses with no approval history are safe to delete outright: a
// `changes_requested` proposal already has an approver's decision recorded
// in the `approvals` table, and that row cascades-deletes with the proposal
// (see supabase/migrations/001_week3_schema.sql). Deleting it would erase
// that audit trail, so it's deliberately excluded here.
const DELETABLE_STATUSES: ProposalStatus[] = ["draft", "needs_clarification"];

export async function createProposal(supabase: SupabaseClient<Database>, user: CurrentUser) {
  return proposalsRepo.createProposal(supabase, user.userId, user.fullName);
}

export async function getProposalForOwner(supabase: SupabaseClient<Database>, proposalId: string, user: CurrentUser) {
  const proposal = await proposalsRepo.getProposal(supabase, proposalId);
  if (proposal.created_by !== user.userId) {
    throw new DomainError("PERMISSION_DENIED", "authorization", "You do not have access to this proposal.", false);
  }
  return proposal;
}

export async function listMyProposals(supabase: SupabaseClient<Database>, user: CurrentUser) {
  return proposalsRepo.listProposalsForOwner(supabase, user.userId);
}

export async function updateIntake(supabase: SupabaseClient<Database>, proposalId: string, input: ProposalIntake) {
  const parsed = proposalIntakeSchema.safeParse(input);
  if (!parsed.success) {
    throw new DomainError("VALIDATION_ERROR", "update-intake", parsed.error.issues[0]?.message ?? "Invalid intake.", true);
  }

  return proposalsRepo.updatePreGenerationIntake(supabase, proposalId, parsed.data);
}

export async function updateClientEmail(supabase: SupabaseClient<Database>, proposalId: string, email: string) {
  const parsed = clientEmailSchema.safeParse(email);
  if (!parsed.success) {
    throw new DomainError("VALIDATION_ERROR", "update-client-email", "Enter a valid email address.", true);
  }

  return proposalsRepo.updateClientEmail(supabase, proposalId, parsed.data);
}

export async function deleteDraftProposal(
  supabase: SupabaseClient<Database>,
  user: CurrentUser,
  proposalId: string
): Promise<void> {
  const proposal = await getProposalForOwner(supabase, proposalId, user);

  if (!DELETABLE_STATUSES.includes(proposal.status)) {
    throw new DomainError(
      "INVALID_STATE",
      "delete-proposal",
      `This proposal cannot be deleted in its current status (${proposal.status}).`,
      false
    );
  }

  await removeProposalStorage(supabase, user.userId, proposalId);
  await proposalsRepo.deleteProposal(supabase, proposalId);
}
