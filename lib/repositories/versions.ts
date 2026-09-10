import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import type {
  ChangedSectionLabel,
  ClarificationFlag,
  ProposalChangeType,
  ProposalSnapshot,
} from "@/lib/domain/types";
import { DomainError, mapRpcError } from "@/lib/domain/errors";

type VersionRowBase = Database["public"]["Tables"]["proposal_versions"]["Row"];
export type VersionRow = Omit<
  VersionRowBase,
  "change_type" | "pdf_status" | "changed_sections" | "snapshot" | "clarification_flags"
> & {
  change_type: ProposalChangeType;
  pdf_status: "not_generated" | "generating" | "ready" | "failed";
  changed_sections: ChangedSectionLabel[];
  snapshot: ProposalSnapshot;
  clarification_flags: ClarificationFlag[];
};

export async function createProposalVersion(
  supabase: SupabaseClient<Database>,
  input: {
    proposalId: string;
    expectedCurrentVersionId: string | null;
    snapshot: ProposalSnapshot;
    contentHash: string;
    changeType: ProposalChangeType;
    changedSections: ChangedSectionLabel[];
    revisionInstruction: string | null;
    clarificationFlags: ClarificationFlag[];
    nextStatus: "draft" | "needs_clarification";
  }
): Promise<VersionRow> {
  const { data, error } = await supabase
    .rpc("create_proposal_version", {
      p_proposal_id: input.proposalId,
      // The generated Args type says `string` for this, but the SQL param
      // is nullable (uuid with no NOT NULL constraint) — the type generator
      // can't see nullability for function arguments.
      p_expected_current_version_id: input.expectedCurrentVersionId as unknown as string,
      p_snapshot: input.snapshot as never,
      p_content_hash: input.contentHash,
      p_change_type: input.changeType,
      p_changed_sections: input.changedSections,
      p_revision_instruction: input.revisionInstruction as unknown as string,
      p_clarification_flags: input.clarificationFlags as never,
      p_next_status: input.nextStatus,
    })
    .single();

  if (error) throw mapRpcError(error, "create-version");
  return data as unknown as VersionRow;
}

export async function getVersion(supabase: SupabaseClient<Database>, versionId: string): Promise<VersionRow> {
  const { data, error } = await supabase.from("proposal_versions").select().eq("id", versionId).maybeSingle();
  if (error) throw new DomainError("VALIDATION_ERROR", "version-lookup", error.message, true);
  if (!data) throw new DomainError("NOT_FOUND", "version-lookup", "This proposal version does not exist.", false);
  return data as unknown as VersionRow;
}

export async function dismissClarificationFlag(
  supabase: SupabaseClient<Database>,
  proposalId: string,
  versionId: string,
  flagId: string
): Promise<VersionRow> {
  const { data, error } = await supabase
    .rpc("dismiss_clarification_flag", {
      p_proposal_id: proposalId,
      p_version_id: versionId,
      p_flag_id: flagId,
    })
    .single();

  if (error) throw mapRpcError(error, "dismiss-clarification-flag");
  return data as unknown as VersionRow;
}

export type VersionChangeSummary = {
  versionNumber: number;
  changeType: ProposalChangeType;
  changedSections: ChangedSectionLabel[];
  createdAt: string;
};

export async function listVersionChangesForApprover(
  supabase: SupabaseClient<Database>,
  proposalId: string,
  sinceVersionNumber: number
): Promise<VersionChangeSummary[]> {
  const { data, error } = await supabase.rpc("list_version_changes_for_approver", {
    p_proposal_id: proposalId,
    p_since_version_number: sinceVersionNumber,
  });

  if (error) throw mapRpcError(error, "version-change-summary");
  return (data ?? []).map((row) => ({
    versionNumber: row.version_number,
    changeType: row.change_type as ProposalChangeType,
    changedSections: (row.changed_sections ?? []) as ChangedSectionLabel[],
    createdAt: row.created_at,
  }));
}

export async function getReviewMaterialsContext(
  supabase: SupabaseClient<Database>,
  proposalId: string
): Promise<{
  versions: { id: string; versionNumber: number; changeType: ProposalChangeType; changedSections: string[] }[];
  generationRuns: { outputVersionId: string; materialUsage: { materialId: string; sections: string[]; factUsed: string }[] }[];
  materials: { id: string; filename: string }[];
}> {
  const { data, error } = await supabase.rpc("get_review_materials_context", { p_proposal_id: proposalId });
  if (error) throw mapRpcError(error, "review-materials-context");
  return data as unknown as {
    versions: { id: string; versionNumber: number; changeType: ProposalChangeType; changedSections: string[] }[];
    generationRuns: {
      outputVersionId: string;
      materialUsage: { materialId: string; sections: string[]; factUsed: string }[];
    }[];
    materials: { id: string; filename: string }[];
  };
}

export async function getReviewMaterialText(
  supabase: SupabaseClient<Database>,
  proposalId: string,
  materialId: string
): Promise<{ filename: string; extractedText: string | null }> {
  const { data, error } = await supabase.rpc("get_review_material_text", {
    p_proposal_id: proposalId,
    p_material_id: materialId,
  });
  if (error) throw mapRpcError(error, "review-material-text");
  return data as unknown as { filename: string; extractedText: string | null };
}

export async function listVersionsForProposal(
  supabase: SupabaseClient<Database>,
  proposalId: string
): Promise<VersionRow[]> {
  const { data, error } = await supabase
    .from("proposal_versions")
    .select()
    .eq("proposal_id", proposalId)
    .order("version_number", { ascending: false });

  if (error) throw new DomainError("VALIDATION_ERROR", "version-list", error.message, true);
  return (data ?? []) as unknown as VersionRow[];
}
