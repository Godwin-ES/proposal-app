import "server-only";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import * as proposalsRepo from "@/lib/repositories/proposals";
import { proposalIntakeSchema, clientEmailSchema } from "@/lib/domain/schemas";
import { DomainError } from "@/lib/domain/errors";
import type { CurrentUser } from "@/lib/auth/current-user";
import type { ProposalIntake } from "@/lib/domain/types";

export async function createProposal(user: CurrentUser) {
  const supabase = await createSupabaseServerClient();
  return proposalsRepo.createProposal(supabase, user.userId, user.fullName);
}

export async function getProposalForOwner(proposalId: string, user: CurrentUser) {
  const supabase = await createSupabaseServerClient();
  const proposal = await proposalsRepo.getProposal(supabase, proposalId);
  if (proposal.created_by !== user.userId) {
    throw new DomainError("PERMISSION_DENIED", "authorization", "You do not have access to this proposal.", false);
  }
  return proposal;
}

export async function listMyProposals(user: CurrentUser) {
  const supabase = await createSupabaseServerClient();
  return proposalsRepo.listProposalsForOwner(supabase, user.userId);
}

export async function updateIntake(proposalId: string, input: ProposalIntake) {
  const parsed = proposalIntakeSchema.safeParse(input);
  if (!parsed.success) {
    throw new DomainError("VALIDATION_ERROR", "update-intake", parsed.error.issues[0]?.message ?? "Invalid intake.", true);
  }

  const supabase = await createSupabaseServerClient();
  return proposalsRepo.updatePreGenerationIntake(supabase, proposalId, parsed.data);
}

export async function updateClientEmail(proposalId: string, email: string) {
  const parsed = clientEmailSchema.safeParse(email);
  if (!parsed.success) {
    throw new DomainError("VALIDATION_ERROR", "update-client-email", "Enter a valid email address.", true);
  }

  const supabase = await createSupabaseServerClient();
  return proposalsRepo.updateClientEmail(supabase, proposalId, parsed.data);
}
