"use server";

import { revalidatePath } from "next/cache";
import { requireSalesperson } from "@/lib/auth/guards";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { ensureFinalPdf } from "@/lib/documents/service";
import { DomainError } from "@/lib/domain/errors";
import type { ActionResult } from "@/lib/domain/types";

export async function generateFinalPdfAction(
  proposalId: string,
  versionId: string
): Promise<ActionResult<{ storagePath: string; sha256: string }>> {
  try {
    const user = await requireSalesperson();
    const supabase = await createSupabaseServerClient();
    const doc = await ensureFinalPdf(supabase, proposalId, versionId, user);
    revalidatePath(`/delivery/${proposalId}`);
    return { ok: true, data: { storagePath: doc.storagePath, sha256: doc.sha256 } };
  } catch (error) {
    if (error instanceof DomainError) return { ok: false, error: error.toActionError() };
    return {
      ok: false,
      error: {
        code: "DOCUMENT_GENERATION_FAILED",
        stage: "document-generation",
        message: error instanceof Error ? error.message : "PDF generation failed unexpectedly.",
        retrySafe: true,
      },
    };
  }
}
