"use server";

import { revalidatePath } from "next/cache";
import { requireSalesperson } from "@/lib/auth/guards";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { ensureFinalPdf } from "@/lib/documents/service";
import { toLoggedActionError } from "@/lib/notifications/action-error";
import type { ActionResult } from "@/lib/domain/types";
import type { CurrentUser } from "@/lib/auth/current-user";

export async function generateFinalPdfAction(
  proposalId: string,
  versionId: string
): Promise<ActionResult<{ storagePath: string; sha256: string }>> {
  let user: CurrentUser | undefined;
  const supabase = await createSupabaseServerClient();
  try {
    user = await requireSalesperson();
    const doc = await ensureFinalPdf(supabase, proposalId, versionId, user);
    revalidatePath(`/delivery/${proposalId}`);
    return { ok: true, data: { storagePath: doc.storagePath, sha256: doc.sha256 } };
  } catch (error) {
    return {
      ok: false,
      error: await toLoggedActionError(error, "document-generation", {
        supabase,
        proposalId,
        versionId,
        userId: user?.userId,
        role: user?.role,
        fallbackCode: "DOCUMENT_GENERATION_FAILED",
      }),
    };
  }
}
