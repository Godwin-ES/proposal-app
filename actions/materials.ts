"use server";

import { revalidatePath } from "next/cache";
import { requireSalesperson } from "@/lib/auth/guards";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import * as materialsService from "@/lib/materials/service";
import { DomainError } from "@/lib/domain/errors";
import type { ActionResult } from "@/lib/domain/types";

function toActionError(error: unknown, stage: string) {
  if (error instanceof DomainError) return error.toActionError();
  return {
    code: "VALIDATION_ERROR" as const,
    stage,
    message: error instanceof Error ? error.message : "Something went wrong.",
    retrySafe: true,
  };
}

export async function prepareMaterialUploadAction(input: {
  proposalId: string;
  filename: string;
  mimeType: string;
  sizeBytes: number;
}): Promise<ActionResult<{ materialId: string; storagePath: string; signedUrl: string; token: string }>> {
  try {
    const user = await requireSalesperson();
    const supabase = await createSupabaseServerClient();
    const result = await materialsService.prepareMaterialUpload(supabase, input, user);
    return { ok: true, data: result };
  } catch (error) {
    return { ok: false, error: toActionError(error, "material-upload") };
  }
}

export async function finalizeMaterialUploadAction(
  proposalId: string,
  materialId: string
): Promise<ActionResult<null>> {
  try {
    const user = await requireSalesperson();
    const supabase = await createSupabaseServerClient();
    await materialsService.finalizeMaterialUpload(supabase, materialId, user);
    revalidatePath(`/proposals/${proposalId}`);
    return { ok: true, data: null };
  } catch (error) {
    return { ok: false, error: toActionError(error, "material-extraction") };
  }
}

export async function retryMaterialExtractionAction(
  proposalId: string,
  materialId: string
): Promise<ActionResult<null>> {
  try {
    const user = await requireSalesperson();
    const supabase = await createSupabaseServerClient();
    await materialsService.retryMaterialExtraction(supabase, materialId, user);
    revalidatePath(`/proposals/${proposalId}`);
    return { ok: true, data: null };
  } catch (error) {
    return { ok: false, error: toActionError(error, "material-extraction") };
  }
}

export async function removeMaterialAction(proposalId: string, materialId: string): Promise<ActionResult<null>> {
  try {
    const user = await requireSalesperson();
    const supabase = await createSupabaseServerClient();
    await materialsService.removeMaterial(supabase, materialId, user);
    revalidatePath(`/proposals/${proposalId}`);
    return { ok: true, data: null };
  } catch (error) {
    return { ok: false, error: toActionError(error, "material-remove") };
  }
}
