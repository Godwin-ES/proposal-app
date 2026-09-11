"use server";

import { revalidatePath } from "next/cache";
import { requireSalesperson } from "@/lib/auth/guards";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { sendProposal } from "@/lib/delivery/service";
import { toLoggedActionError } from "@/lib/notifications/action-error";
import type { ActionResult } from "@/lib/domain/types";
import type { CurrentUser } from "@/lib/auth/current-user";

export async function sendProposalAction(
  proposalId: string,
  versionId: string
): Promise<ActionResult<{ attemptId: string; status: string }>> {
  let user: CurrentUser | undefined;
  const supabase = await createSupabaseServerClient();
  try {
    user = await requireSalesperson();
    const attempt = await sendProposal(supabase, proposalId, versionId, user);
    revalidatePath(`/delivery/${proposalId}`);
    return { ok: true, data: { attemptId: attempt.id, status: attempt.status } };
  } catch (error) {
    return {
      ok: false,
      error: await toLoggedActionError(error, "delivery-send", {
        supabase,
        proposalId,
        versionId,
        userId: user?.userId,
        role: user?.role,
        fallbackCode: "DELIVERY_FAILED",
      }),
    };
  }
}
