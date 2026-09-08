"use server";

import { revalidatePath } from "next/cache";
import { requireSalesperson } from "@/lib/auth/guards";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { sendProposal } from "@/lib/delivery/service";
import { DomainError } from "@/lib/domain/errors";
import type { ActionResult } from "@/lib/domain/types";

export async function sendProposalAction(
  proposalId: string,
  versionId: string
): Promise<ActionResult<{ attemptId: string; status: string }>> {
  try {
    const user = await requireSalesperson();
    const supabase = await createSupabaseServerClient();
    const attempt = await sendProposal(supabase, proposalId, versionId, user);
    revalidatePath(`/delivery/${proposalId}`);
    return { ok: true, data: { attemptId: attempt.id, status: attempt.status } };
  } catch (error) {
    if (error instanceof DomainError) return { ok: false, error: error.toActionError() };
    return {
      ok: false,
      error: {
        code: "DELIVERY_FAILED",
        stage: "delivery-send",
        message: error instanceof Error ? error.message : "Delivery failed unexpectedly.",
        retrySafe: true,
      },
    };
  }
}
