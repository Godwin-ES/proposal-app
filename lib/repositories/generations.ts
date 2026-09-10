import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import type { GenerationProvider, GenerationStatus, ProposalSectionKey } from "@/lib/domain/types";
import { DomainError } from "@/lib/domain/errors";

type GenerationRunRowBase = Database["public"]["Tables"]["generation_runs"]["Row"];
export type GenerationRunRow = Omit<GenerationRunRowBase, "provider" | "status" | "operation" | "target_section"> & {
  provider: GenerationProvider;
  status: GenerationStatus;
  operation: "initial_generation" | "section_regeneration";
  target_section: ProposalSectionKey | null;
};

export async function insertGenerationRun(
  supabase: SupabaseClient<Database>,
  input: {
    proposalId: string;
    baseVersionId: string | null;
    provider: GenerationProvider;
    model: string;
    operation: "initial_generation" | "section_regeneration";
    targetSection: ProposalSectionKey | null;
    createdBy: string;
  }
): Promise<GenerationRunRow> {
  const { data, error } = await supabase
    .from("generation_runs")
    .insert({
      proposal_id: input.proposalId,
      base_version_id: input.baseVersionId,
      provider: input.provider,
      model: input.model,
      operation: input.operation,
      target_section: input.targetSection,
      status: "running",
      created_by: input.createdBy,
    })
    .select()
    .single();

  if (error) throw new DomainError("VALIDATION_ERROR", "generation-run", error.message, true);
  return data as GenerationRunRow;
}

export async function completeGenerationRun(
  supabase: SupabaseClient<Database>,
  runId: string,
  patch: {
    status: "succeeded" | "failed" | "stale";
    outputVersionId?: string | null;
    latencyMs?: number | null;
    inputTokens?: number | null;
    outputTokens?: number | null;
    materialUsage?: unknown[];
    error?: string | null;
  }
): Promise<GenerationRunRow> {
  const { data, error } = await supabase
    .from("generation_runs")
    .update({
      status: patch.status,
      output_version_id: patch.outputVersionId ?? null,
      latency_ms: patch.latencyMs ?? null,
      input_tokens: patch.inputTokens ?? null,
      output_tokens: patch.outputTokens ?? null,
      material_usage: (patch.materialUsage ?? []) as never,
      error: patch.error ?? null,
      finished_at: new Date().toISOString(),
    })
    .eq("id", runId)
    .select()
    .single();

  if (error) throw new DomainError("VALIDATION_ERROR", "generation-run", error.message, true);
  return data as GenerationRunRow;
}

/**
 * Retroactively links one or more generation_runs to the version their
 * regeneration output ended up saved into — needed now that a regeneration
 * no longer creates its own version immediately (see
 * regenerateSectionPreview in lib/ai/service.ts), so at the time the run
 * completes there's no version yet to attach it to.
 */
export async function attachGenerationRunsToVersion(
  supabase: SupabaseClient<Database>,
  runIds: string[],
  versionId: string
): Promise<void> {
  if (runIds.length === 0) return;
  const { error } = await supabase.from("generation_runs").update({ output_version_id: versionId }).in("id", runIds);
  if (error) throw new DomainError("VALIDATION_ERROR", "generation-run-attach", error.message, true);
}

export async function listGenerationRuns(
  supabase: SupabaseClient<Database>,
  proposalId: string
): Promise<GenerationRunRow[]> {
  const { data, error } = await supabase
    .from("generation_runs")
    .select()
    .eq("proposal_id", proposalId)
    .order("created_at", { ascending: false });

  if (error) throw new DomainError("VALIDATION_ERROR", "generation-run-list", error.message, true);
  return (data ?? []) as GenerationRunRow[];
}
