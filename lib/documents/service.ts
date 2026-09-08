import "server-only";
import { createHash } from "node:crypto";
import { renderToBuffer } from "@react-pdf/renderer";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import type { CurrentUser } from "@/lib/auth/current-user";
import { getProposalForOwner } from "@/lib/proposals/service";
import { getVersion, type VersionRow } from "@/lib/repositories/versions";
import { ProposalDocument } from "@/lib/documents/proposal-document";
import { DomainError, mapRpcError } from "@/lib/domain/errors";

export const FINAL_DOCUMENTS_BUCKET = "proposal-final-documents";

async function setVersionPdfState(
  supabase: SupabaseClient<Database>,
  input: {
    proposalId: string;
    versionId: string;
    status: "generating" | "ready" | "failed";
    storagePath?: string | null;
    sha256?: string | null;
    generatedAt?: string | null;
    error?: string | null;
  }
): Promise<VersionRow> {
  const { data, error } = await supabase
    .rpc("set_version_pdf_state", {
      p_proposal_id: input.proposalId,
      p_version_id: input.versionId,
      p_status: input.status,
      p_storage_path: (input.storagePath ?? null) as unknown as string,
      p_sha256: (input.sha256 ?? null) as unknown as string,
      p_generated_at: (input.generatedAt ?? null) as unknown as string,
      p_error: (input.error ?? null) as unknown as string,
    })
    .single();

  if (error) throw mapRpcError(error, "document-generation");
  return data as unknown as VersionRow;
}

export type FinalDocument = {
  storagePath: string;
  sha256: string;
  generatedAt: string;
};

export async function ensureFinalPdf(
  supabase: SupabaseClient<Database>,
  proposalId: string,
  versionId: string,
  user: CurrentUser
): Promise<FinalDocument> {
  const proposal = await getProposalForOwner(supabase, proposalId, user);

  if (proposal.status !== "approved" || proposal.current_version_id !== versionId) {
    throw new DomainError(
      "INVALID_STATE",
      "document-generation",
      "The final PDF can only be generated for the exact current approved version.",
      false
    );
  }

  const version = await getVersion(supabase, versionId);

  if (version.pdf_status === "ready" && version.pdf_storage_path && version.pdf_sha256 && version.pdf_generated_at) {
    return {
      storagePath: version.pdf_storage_path,
      sha256: version.pdf_sha256,
      generatedAt: version.pdf_generated_at,
    };
  }

  await setVersionPdfState(supabase, { proposalId, versionId, status: "generating" });

  let buffer: Buffer;
  try {
    buffer = await renderToBuffer(ProposalDocument({ snapshot: version.snapshot }));
  } catch (error) {
    const message = error instanceof Error ? error.message : "PDF rendering failed.";
    await setVersionPdfState(supabase, { proposalId, versionId, status: "failed", error: message });
    throw new DomainError("DOCUMENT_GENERATION_FAILED", "document-generation", message, true);
  }

  const sha256 = createHash("sha256").update(buffer).digest("hex");
  const storagePath = `${user.userId}/${proposalId}/${versionId}/proposal.pdf`;

  const { error: uploadError } = await supabase.storage
    .from(FINAL_DOCUMENTS_BUCKET)
    .upload(storagePath, buffer, { contentType: "application/pdf", upsert: true });

  if (uploadError) {
    await setVersionPdfState(supabase, { proposalId, versionId, status: "failed", error: uploadError.message });
    throw new DomainError("DOCUMENT_GENERATION_FAILED", "document-generation", uploadError.message, true);
  }

  const generatedAt = new Date().toISOString();
  await setVersionPdfState(supabase, {
    proposalId,
    versionId,
    status: "ready",
    storagePath,
    sha256,
    generatedAt,
  });

  return { storagePath, sha256, generatedAt };
}

export async function downloadFinalPdf(
  supabase: SupabaseClient<Database>,
  proposalId: string,
  versionId: string,
  user: CurrentUser
): Promise<Buffer> {
  await getProposalForOwner(supabase, proposalId, user);
  const version = await getVersion(supabase, versionId);

  if (version.pdf_status !== "ready" || !version.pdf_storage_path) {
    throw new DomainError("NOT_FOUND", "document-download", "The final PDF is not ready for this version.", false);
  }

  const { data, error } = await supabase.storage.from(FINAL_DOCUMENTS_BUCKET).download(version.pdf_storage_path);
  if (error || !data) {
    throw new DomainError(
      "DOCUMENT_GENERATION_FAILED",
      "document-download",
      error?.message ?? "Could not download the final PDF.",
      true
    );
  }

  return Buffer.from(await data.arrayBuffer());
}
