import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import type { ProposalIntake, ProposalStatus } from "@/lib/domain/types";
import { DomainError, mapRpcError, NotFoundError } from "@/lib/domain/errors";

// supabase gen types cannot see the CHECK constraint on `status`, so it widens
// to `string`; narrow it back to our domain union at the repository boundary.
export type ProposalRow = Omit<Database["public"]["Tables"]["proposals"]["Row"], "status"> & {
  status: ProposalStatus;
};

export function rowToIntake(row: ProposalRow): ProposalIntake {
  return {
    clientName: row.client_name,
    clientEmail: row.client_email ?? "",
    companyName: row.company_name,
    dateOfCall: row.date_of_call ?? "",
    salespersonName: row.salesperson_name,
    clientNeedsSummary: row.client_needs_summary,
    projectScope: row.project_scope,
    goalsAndObjectives: row.goals_and_objectives,
    recommendedServices: row.recommended_services,
    proposedTimeline: row.proposed_timeline,
    estimatedPricing: row.estimated_pricing,
  };
}

export async function createProposal(
  supabase: SupabaseClient<Database>,
  userId: string,
  salespersonName: string
): Promise<ProposalRow> {
  const { data, error } = await supabase
    .from("proposals")
    .insert({ created_by: userId, salesperson_name: salespersonName })
    .select()
    .single();

  if (error) throw new DomainError("VALIDATION_ERROR", "create-proposal", error.message, true);
  return data as ProposalRow;
}

export async function getProposal(
  supabase: SupabaseClient<Database>,
  proposalId: string
): Promise<ProposalRow> {
  const { data, error } = await supabase.from("proposals").select().eq("id", proposalId).maybeSingle();
  if (error) throw new DomainError("VALIDATION_ERROR", "lookup", error.message, true);
  if (!data) throw new NotFoundError("This proposal does not exist or you do not have access to it.");
  return data as ProposalRow;
}

export async function listProposalsForOwner(
  supabase: SupabaseClient<Database>,
  userId: string
): Promise<ProposalRow[]> {
  const { data, error } = await supabase
    .from("proposals")
    .select()
    .eq("created_by", userId)
    .order("updated_at", { ascending: false });

  if (error) throw new DomainError("VALIDATION_ERROR", "list-proposals", error.message, true);
  return (data ?? []) as ProposalRow[];
}

export async function listPendingApprovalProposals(
  supabase: SupabaseClient<Database>
): Promise<ProposalRow[]> {
  const { data, error } = await supabase
    .from("proposals")
    .select()
    .eq("status", "pending_approval")
    .order("approval_submitted_at", { ascending: true });

  if (error) throw new DomainError("VALIDATION_ERROR", "list-approval-queue", error.message, true);
  return (data ?? []) as ProposalRow[];
}

export async function updatePreGenerationIntake(
  supabase: SupabaseClient<Database>,
  proposalId: string,
  intake: ProposalIntake
): Promise<ProposalRow> {
  const { data, error } = await supabase
    .rpc("update_pre_generation_intake", {
      p_proposal_id: proposalId,
      p_client_name: intake.clientName,
      p_company_name: intake.companyName,
      // The generated Args type says `string`, but the SQL param is a
      // nullable `date` column with no NOT NULL constraint — the type
      // generator can't see that nullability for function arguments.
      p_date_of_call: (intake.dateOfCall || null) as unknown as string,
      p_salesperson_name: intake.salespersonName,
      p_client_needs_summary: intake.clientNeedsSummary,
      p_project_scope: intake.projectScope,
      p_goals_and_objectives: intake.goalsAndObjectives,
      p_recommended_services: intake.recommendedServices,
      p_proposed_timeline: intake.proposedTimeline,
      p_estimated_pricing: intake.estimatedPricing,
    })
    .single();

  if (error) throw mapRpcError(error, "update-intake");
  return data as ProposalRow;
}

export async function updateClientEmail(
  supabase: SupabaseClient<Database>,
  proposalId: string,
  clientEmail: string
): Promise<ProposalRow> {
  const { data, error } = await supabase
    .rpc("update_client_email", { p_proposal_id: proposalId, p_client_email: clientEmail })
    .single();

  if (error) throw mapRpcError(error, "update-client-email");
  return data as ProposalRow;
}
