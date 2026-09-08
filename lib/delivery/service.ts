import "server-only";
import { randomUUID } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import type { CurrentUser } from "@/lib/auth/current-user";
import { getProposalForOwner } from "@/lib/proposals/service";
import { getVersion } from "@/lib/repositories/versions";
import {
  prepareDeliveryAttempt,
  finalizeDeliveryAttempt,
  recordDeliveryProblem,
  getDeliveryAttempt,
  listDeliveryAttempts,
  type DeliveryAttemptRow,
} from "@/lib/repositories/deliveries";
import { downloadFinalPdf, FINAL_DOCUMENTS_BUCKET } from "@/lib/documents/service";
import { createResendProvider } from "@/lib/delivery/resend";
import type { EmailProvider } from "@/lib/delivery/provider";
import { buildClientEmail } from "@/lib/templates/client-email";
import { DomainError } from "@/lib/domain/errors";

const SIGNED_URL_TTL_SECONDS = 604_800; // 7 days

export async function getDeliveryHistory(supabase: SupabaseClient<Database>, proposalId: string, user: CurrentUser) {
  await getProposalForOwner(supabase, proposalId, user);
  return listDeliveryAttempts(supabase, proposalId);
}

export async function sendProposal(
  supabase: SupabaseClient<Database>,
  proposalId: string,
  versionId: string,
  user: CurrentUser,
  emailProvider: EmailProvider = createResendProvider()
): Promise<DeliveryAttemptRow> {
  const proposal = await getProposalForOwner(supabase, proposalId, user);

  if (!proposal.client_email) {
    throw new DomainError(
      "DELIVERY_PREPARATION_FAILED",
      "delivery-send",
      "A valid client email address is required before sending.",
      false
    );
  }

  const version = await getVersion(supabase, versionId);
  const idempotencyKey = randomUUID();

  // Steps 1-4 of the safe send sequence: re-evaluate readiness, confirm exact
  // version + approval + pdf-ready, and log a pending attempt — all enforced
  // atomically inside prepare_delivery_attempt (see migration 003).
  const attempt = await prepareDeliveryAttempt(supabase, {
    proposalId,
    versionId,
    recipient: proposal.client_email,
    provider: "resend",
    idempotencyKey,
  });

  const pdfBuffer = await downloadFinalPdf(supabase, proposalId, versionId, user);

  const { data: signedUrlData } = await supabase.storage
    .from(FINAL_DOCUMENTS_BUCKET)
    .createSignedUrl(version.pdf_storage_path as string, SIGNED_URL_TTL_SECONDS);

  const { subject, body } = buildClientEmail({
    clientName: version.snapshot.client.clientName,
    companyName: version.snapshot.client.companyName,
    salespersonName: version.snapshot.client.salespersonName,
    proposalLink: signedUrlData?.signedUrl ?? "(attached)",
  });

  // Step 5: call the provider with the same idempotency key as the DB attempt.
  let sendResult: { providerMessageId: string };
  try {
    sendResult = await emailProvider.sendProposal({
      to: proposal.client_email,
      subject,
      body,
      pdf: pdfBuffer,
      idempotencyKey,
    });
  } catch (error) {
    // Step 6: known provider failure — proposal remains approved, retry is
    // safe with a new explicit send action (new idempotency key).
    await recordDeliveryProblem(supabase, {
      attemptId: attempt.id,
      status: "failed",
      error: error instanceof Error ? error.message : "The email provider failed.",
    });
    throw new DomainError(
      "DELIVERY_FAILED",
      "delivery-send",
      error instanceof Error ? error.message : "The email provider failed.",
      true
    );
  }

  // Step 7: provider succeeded — finalize atomically (attempt sent + proposal delivered).
  try {
    return await finalizeDeliveryAttempt(supabase, attempt.id, sendResult.providerMessageId);
  } catch {
    // Step 8: finalization ambiguity — re-read before declaring uncertainty.
    const current = await getDeliveryAttempt(supabase, attempt.id);
    if (current.status === "sent" && current.provider_message_id === sendResult.providerMessageId) {
      return current;
    }

    await recordDeliveryProblem(supabase, {
      attemptId: attempt.id,
      status: "uncertain",
      error: "The email provider reported success, but the delivery record could not be confirmed.",
      providerMessageId: sendResult.providerMessageId,
    }).catch(() => undefined);

    throw new DomainError(
      "DELIVERY_OUTCOME_UNCERTAIN",
      "delivery-finalization",
      "The email provider reported success, but the application could not confirm the final delivery record. Do not resend automatically.",
      false
    );
  }
}
