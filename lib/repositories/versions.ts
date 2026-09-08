import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import type { ProposalChangeType, ProposalSectionKey, ProposalSnapshot } from "@/lib/domain/types";
import { DomainError, mapRpcError } from "@/lib/domain/errors";

type VersionRowBase = Database["public"]["Tables"]["proposal_versions"]["Row"];
export type VersionRow = Omit<VersionRowBase, "change_type" | "pdf_status" | "changed_section" | "snapshot"> & {
  change_type: ProposalChangeType;
  pdf_status: "not_generated" | "generating" | "ready" | "failed";
  changed_section: ProposalSectionKey | null;
  snapshot: ProposalSnapshot;
};

export async function createProposalVersion(
  supabase: SupabaseClient<Database>,
  input: {
    proposalId: string;
    expectedCurrentVersionId: string | null;
    snapshot: ProposalSnapshot;
    contentHash: string;
    changeType: ProposalChangeType;
    changedSection: ProposalSectionKey | null;
    revisionInstruction: string | null;
    clarificationFlags: string[];
    nextStatus: "draft" | "needs_clarification";
  }
): Promise<VersionRow> {
  const { data, error } = await supabase
    .rpc("create_proposal_version", {
      p_proposal_id: input.proposalId,
      // The generated Args type says `string` for these three, but the SQL
      // params are nullable (uuid/text with no NOT NULL constraint) — the
      // type generator can't see nullability for function arguments.
      p_expected_current_version_id: input.expectedCurrentVersionId as unknown as string,
      p_snapshot: input.snapshot as never,
      p_content_hash: input.contentHash,
      p_change_type: input.changeType,
      p_changed_section: input.changedSection as unknown as string,
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
