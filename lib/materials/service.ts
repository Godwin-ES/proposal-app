import "server-only";
import { randomUUID } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import * as materialsRepo from "@/lib/repositories/materials";
import { getProposalForOwner } from "@/lib/proposals/service";
import { assertEditableStatus } from "@/lib/domain/state-machine";
import { DomainError } from "@/lib/domain/errors";
import {
  extensionFromFilename,
  extractText,
  isSupportedExtension,
  MAX_ACTIVE_MATERIALS,
  MAX_AGGREGATE_EXTRACTED_CHARS,
  MAX_FILE_SIZE_BYTES,
} from "@/lib/materials/extract";
import type { CurrentUser } from "@/lib/auth/current-user";

export async function prepareMaterialUpload(
  supabase: SupabaseClient<Database>,
  input: { proposalId: string; filename: string; mimeType: string; sizeBytes: number },
  user: CurrentUser
) {
  const proposal = await getProposalForOwner(supabase, input.proposalId, user);
  assertEditableStatus(proposal.status);

  const extension = extensionFromFilename(input.filename);
  if (!isSupportedExtension(extension)) {
    throw new DomainError(
      "MATERIAL_UPLOAD_FAILED",
      "material-upload",
      "Only .pdf, .docx, .md, and .txt files are supported.",
      false
    );
  }

  if (input.sizeBytes <= 0) {
    throw new DomainError("MATERIAL_UPLOAD_FAILED", "material-upload", "The selected file is empty.", false);
  }

  if (input.sizeBytes > MAX_FILE_SIZE_BYTES) {
    throw new DomainError(
      "MATERIAL_UPLOAD_FAILED",
      "material-upload",
      "Files must be 10 MB or smaller.",
      false
    );
  }

  const activeCount = await materialsRepo.countActiveMaterials(supabase, input.proposalId);
  if (activeCount >= MAX_ACTIVE_MATERIALS) {
    throw new DomainError(
      "MATERIAL_LIMIT_EXCEEDED",
      "material-upload",
      `A proposal can have at most ${MAX_ACTIVE_MATERIALS} supporting files. Remove one before adding another.`,
      false
    );
  }

  const materialId = randomUUID();
  const storagePath = materialsRepo.materialStoragePath(user.userId, input.proposalId, materialId, input.filename);

  await materialsRepo.insertMaterial(supabase, {
    id: materialId,
    proposalId: input.proposalId,
    filename: input.filename,
    mimeType: input.mimeType,
    sizeBytes: input.sizeBytes,
    storagePath,
    createdBy: user.userId,
  });

  const { data, error } = await supabase.storage
    .from(materialsRepo.SUPPORTING_MATERIAL_BUCKET)
    .createSignedUploadUrl(storagePath);

  if (error) {
    await materialsRepo.deleteMaterial(supabase, materialId);
    throw new DomainError("MATERIAL_UPLOAD_FAILED", "material-upload", error.message, true);
  }

  return { materialId, storagePath, signedUrl: data.signedUrl, token: data.token };
}

export async function finalizeMaterialUpload(
  supabase: SupabaseClient<Database>,
  materialId: string,
  user: CurrentUser
) {
  const material = await materialsRepo.getMaterial(supabase, materialId);
  const proposal = await getProposalForOwner(supabase, material.proposal_id, user);
  assertEditableStatus(proposal.status);

  return runExtraction(supabase, material);
}

export async function retryMaterialExtraction(
  supabase: SupabaseClient<Database>,
  materialId: string,
  user: CurrentUser
) {
  const material = await materialsRepo.getMaterial(supabase, materialId);
  const proposal = await getProposalForOwner(supabase, material.proposal_id, user);
  assertEditableStatus(proposal.status);

  return runExtraction(supabase, material);
}

async function runExtraction(supabase: SupabaseClient<Database>, material: materialsRepo.MaterialRow) {
  const extension = extensionFromFilename(material.filename);

  if (!isSupportedExtension(extension)) {
    return materialsRepo.setMaterialExtractionResult(supabase, material.id, {
      status: "failed",
      extractedText: null,
      warning: "Unsupported file type.",
    });
  }

  const { data: fileBlob, error: downloadError } = await supabase.storage
    .from(materialsRepo.SUPPORTING_MATERIAL_BUCKET)
    .download(material.storage_path);

  if (downloadError || !fileBlob) {
    return materialsRepo.setMaterialExtractionResult(supabase, material.id, {
      status: "failed",
      extractedText: null,
      warning: `Could not download the uploaded file: ${downloadError?.message ?? "unknown storage error"}.`,
    });
  }

  const buffer = Buffer.from(await fileBlob.arrayBuffer());

  try {
    const text = await extractText(extension, buffer);
    if (!text || text.trim().length === 0) {
      return materialsRepo.setMaterialExtractionResult(supabase, material.id, {
        status: "failed",
        extractedText: null,
        warning: "No extractable text was found in this file (it may be scanned or image-only).",
      });
    }
    return materialsRepo.setMaterialExtractionResult(supabase, material.id, {
      status: "ready",
      extractedText: text,
      warning: null,
    });
  } catch (error) {
    const message = error instanceof DomainError ? error.message : "Text extraction failed.";
    return materialsRepo.setMaterialExtractionResult(supabase, material.id, {
      status: "failed",
      extractedText: null,
      warning: message,
    });
  }
}

export async function getMaterialText(supabase: SupabaseClient<Database>, materialId: string, user: CurrentUser) {
  const material = await materialsRepo.getMaterial(supabase, materialId);
  await getProposalForOwner(supabase, material.proposal_id, user);

  if (material.extraction_status !== "ready" || !material.extracted_text) {
    throw new DomainError(
      "NOT_FOUND",
      "material-text",
      "No extracted text is available for this file yet.",
      false
    );
  }

  return { filename: material.filename, text: material.extracted_text };
}

export async function removeMaterial(supabase: SupabaseClient<Database>, materialId: string, user: CurrentUser) {
  const material = await materialsRepo.getMaterial(supabase, materialId);
  const proposal = await getProposalForOwner(supabase, material.proposal_id, user);
  assertEditableStatus(proposal.status);

  // Fail-closed, same as lib/storage/cleanup.ts: an unconfirmed Storage
  // removal must abort before the DB row is deleted, or the file becomes an
  // invisible orphan with nothing left pointing at it.
  const { data: removed, error } = await supabase.storage
    .from(materialsRepo.SUPPORTING_MATERIAL_BUCKET)
    .remove([material.storage_path]);
  if (error) {
    throw new DomainError(
      "STORAGE_CLEANUP_FAILED",
      "material-removal",
      `Could not delete the file for this material: ${error.message}`,
      true
    );
  }
  if (!removed || removed.length < 1) {
    throw new DomainError(
      "STORAGE_CLEANUP_FAILED",
      "material-removal",
      "The file removal for this material was not confirmed.",
      true
    );
  }

  await materialsRepo.deleteMaterial(supabase, materialId);
}

export type GenerationMaterialsResult =
  | { ok: true; materials: { id: string; filename: string; text: string }[] }
  | { ok: false; reason: string };

/**
 * Materials used as AI generation context. Any `failed` material blocks
 * generation until removed/retried (invariant 18); the aggregate extracted
 * text is capped rather than silently truncated (invariant per §12).
 */
export async function getGenerationMaterials(
  supabase: SupabaseClient<Database>,
  proposalId: string,
  user: CurrentUser
): Promise<GenerationMaterialsResult> {
  await getProposalForOwner(supabase, proposalId, user);
  const materials = await materialsRepo.listMaterialsForProposal(supabase, proposalId);

  const failed = materials.filter((m) => m.extraction_status === "failed");
  if (failed.length > 0) {
    return {
      ok: false,
      reason: `Remove or retry the failed file(s) before generating: ${failed.map((m) => m.filename).join(", ")}.`,
    };
  }

  const pending = materials.filter((m) => m.extraction_status === "pending");
  if (pending.length > 0) {
    return { ok: false, reason: "Supporting material is still being processed. Try again shortly." };
  }

  const ready = materials.filter((m) => m.extraction_status === "ready" && m.extracted_text);
  const aggregateChars = ready.reduce((sum, m) => sum + (m.extracted_text?.length ?? 0), 0);

  if (aggregateChars > MAX_AGGREGATE_EXTRACTED_CHARS) {
    return {
      ok: false,
      reason: `Supporting material totals ${aggregateChars.toLocaleString()} characters, which exceeds the ${MAX_AGGREGATE_EXTRACTED_CHARS.toLocaleString()} character limit. Remove some material before generating.`,
    };
  }

  return {
    ok: true,
    materials: ready.map((m) => ({ id: m.id, filename: m.filename, text: m.extracted_text as string })),
  };
}

export async function listMaterials(supabase: SupabaseClient<Database>, proposalId: string, user: CurrentUser) {
  await getProposalForOwner(supabase, proposalId, user);
  return materialsRepo.listMaterialsForProposal(supabase, proposalId);
}
