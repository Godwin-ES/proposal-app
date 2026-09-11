"use server";

import { revalidatePath } from "next/cache";
import { requireSalesperson } from "@/lib/auth/guards";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import * as materialsService from "@/lib/materials/service";
import { toLoggedActionError } from "@/lib/notifications/action-error";
import type { ActionResult } from "@/lib/domain/types";
import type { CurrentUser } from "@/lib/auth/current-user";

export async function prepareMaterialUploadAction(input: {
  proposalId: string;
  filename: string;
  mimeType: string;
  sizeBytes: number;
}): Promise<ActionResult<{ materialId: string; storagePath: string; signedUrl: string; token: string }>> {
  let user: CurrentUser | undefined;
  const supabase = await createSupabaseServerClient();
  try {
    user = await requireSalesperson();
    const result = await materialsService.prepareMaterialUpload(supabase, input, user);
    return { ok: true, data: result };
  } catch (error) {
    return {
      ok: false,
      error: await toLoggedActionError(error, "material-upload", {
        supabase,
        proposalId: input.proposalId,
        userId: user?.userId,
        role: user?.role,
      }),
    };
  }
}

export async function finalizeMaterialUploadAction(
  proposalId: string,
  materialId: string
): Promise<ActionResult<{ extractionStatus: "ready" | "failed"; warning: string | null }>> {
  let user: CurrentUser | undefined;
  const supabase = await createSupabaseServerClient();
  try {
    user = await requireSalesperson();
    const material = await materialsService.finalizeMaterialUpload(supabase, materialId, user);
    revalidatePath(`/proposals/${proposalId}`);
    // runExtraction always resolves to "ready" or "failed" — never leaves the
    // row "pending" — but setMaterialExtractionResult's return type is the
    // general MaterialRow shape, which can't reflect that narrower guarantee.
    return {
      ok: true,
      data: { extractionStatus: material.extraction_status as "ready" | "failed", warning: material.warning },
    };
  } catch (error) {
    return {
      ok: false,
      error: await toLoggedActionError(error, "material-extraction", {
        supabase,
        proposalId,
        userId: user?.userId,
        role: user?.role,
      }),
    };
  }
}

export async function retryMaterialExtractionAction(
  proposalId: string,
  materialId: string
): Promise<ActionResult<{ extractionStatus: "ready" | "failed"; warning: string | null }>> {
  let user: CurrentUser | undefined;
  const supabase = await createSupabaseServerClient();
  try {
    user = await requireSalesperson();
    const material = await materialsService.retryMaterialExtraction(supabase, materialId, user);
    revalidatePath(`/proposals/${proposalId}`);
    return {
      ok: true,
      data: { extractionStatus: material.extraction_status as "ready" | "failed", warning: material.warning },
    };
  } catch (error) {
    return {
      ok: false,
      error: await toLoggedActionError(error, "material-extraction", {
        supabase,
        proposalId,
        userId: user?.userId,
        role: user?.role,
      }),
    };
  }
}

export async function getMaterialTextAction(
  materialId: string
): Promise<ActionResult<{ filename: string; text: string }>> {
  let user: CurrentUser | undefined;
  const supabase = await createSupabaseServerClient();
  try {
    user = await requireSalesperson();
    const result = await materialsService.getMaterialText(supabase, materialId, user);
    return { ok: true, data: result };
  } catch (error) {
    return {
      ok: false,
      error: await toLoggedActionError(error, "material-text", { supabase, userId: user?.userId, role: user?.role }),
    };
  }
}

export async function removeMaterialAction(proposalId: string, materialId: string): Promise<ActionResult<null>> {
  let user: CurrentUser | undefined;
  const supabase = await createSupabaseServerClient();
  try {
    user = await requireSalesperson();
    await materialsService.removeMaterial(supabase, materialId, user);
    revalidatePath(`/proposals/${proposalId}`);
    return { ok: true, data: null };
  } catch (error) {
    return {
      ok: false,
      error: await toLoggedActionError(error, "material-remove", {
        supabase,
        proposalId,
        userId: user?.userId,
        role: user?.role,
      }),
    };
  }
}
