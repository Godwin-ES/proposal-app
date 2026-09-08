import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import type { DeliveryStatus } from "@/lib/domain/types";
import { DomainError, mapRpcError } from "@/lib/domain/errors";

type DeliveryAttemptRowBase = Database["public"]["Tables"]["delivery_attempts"]["Row"];
export type DeliveryAttemptRow = Omit<DeliveryAttemptRowBase, "status"> & { status: DeliveryStatus };

export async function prepareDeliveryAttempt(
  supabase: SupabaseClient<Database>,
  input: { proposalId: string; versionId: string; recipient: string; provider: string; idempotencyKey: string }
): Promise<DeliveryAttemptRow> {
  const { data, error } = await supabase
    .rpc("prepare_delivery_attempt", {
      p_proposal_id: input.proposalId,
      p_version_id: input.versionId,
      p_recipient: input.recipient,
      p_provider: input.provider,
      p_idempotency_key: input.idempotencyKey,
    })
    .single();

  if (error) throw mapRpcError(error, "delivery-preparation");
  return data as unknown as DeliveryAttemptRow;
}

export async function finalizeDeliveryAttempt(
  supabase: SupabaseClient<Database>,
  attemptId: string,
  providerMessageId: string
): Promise<DeliveryAttemptRow> {
  const { data, error } = await supabase
    .rpc("finalize_delivery_attempt", { p_attempt_id: attemptId, p_provider_message_id: providerMessageId })
    .single();

  if (error) throw mapRpcError(error, "delivery-finalization");
  return data as unknown as DeliveryAttemptRow;
}

export async function recordDeliveryProblem(
  supabase: SupabaseClient<Database>,
  input: { attemptId: string; status: "failed" | "uncertain"; error: string; providerMessageId?: string | null }
): Promise<DeliveryAttemptRow> {
  const { data, error } = await supabase
    .rpc("record_delivery_problem", {
      p_attempt_id: input.attemptId,
      p_status: input.status,
      p_error: input.error,
      p_provider_message_id: (input.providerMessageId ?? null) as unknown as string,
    })
    .single();

  if (error) throw mapRpcError(error, "delivery-problem");
  return data as unknown as DeliveryAttemptRow;
}

export async function getDeliveryAttempt(
  supabase: SupabaseClient<Database>,
  attemptId: string
): Promise<DeliveryAttemptRow> {
  const { data, error } = await supabase.from("delivery_attempts").select().eq("id", attemptId).maybeSingle();
  if (error) throw new DomainError("VALIDATION_ERROR", "delivery-lookup", error.message, true);
  if (!data) throw new DomainError("NOT_FOUND", "delivery-lookup", "Delivery attempt not found.", false);
  return data as unknown as DeliveryAttemptRow;
}

export async function listDeliveryAttempts(
  supabase: SupabaseClient<Database>,
  proposalId: string
): Promise<DeliveryAttemptRow[]> {
  const { data, error } = await supabase
    .from("delivery_attempts")
    .select()
    .eq("proposal_id", proposalId)
    .order("created_at", { ascending: false });

  if (error) throw new DomainError("VALIDATION_ERROR", "delivery-list", error.message, true);
  return (data ?? []) as unknown as DeliveryAttemptRow[];
}
