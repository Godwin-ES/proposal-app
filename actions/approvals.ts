"use server";

import { revalidatePath } from "next/cache";
import { requireSalesperson, requireApprover } from "@/lib/auth/guards";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  submitProposalForApproval,
  decideProposalApproval,
  getReviewMaterialTextForApprover,
} from "@/lib/approvals/service";
import { getProposal } from "@/lib/repositories/proposals";
import { toLoggedActionError } from "@/lib/notifications/action-error";
import { bestEffort, notifyApproverProposalSubmitted, notifySalespersonDecision } from "@/lib/notifications/discord";
import type { ActionResult } from "@/lib/domain/types";
import type { CurrentUser } from "@/lib/auth/current-user";

export async function submitForApprovalAction(
  proposalId: string,
  expectedVersionId: string
): Promise<ActionResult<null>> {
  let user: CurrentUser | undefined;
  const supabase = await createSupabaseServerClient();
  try {
    user = await requireSalesperson();
    await submitProposalForApproval(supabase, proposalId, expectedVersionId, user);
    revalidatePath(`/proposals/${proposalId}`);
    revalidatePath("/dashboard");

    await bestEffort(async () => {
      const proposal = await getProposal(supabase, proposalId);
      await notifyApproverProposalSubmitted({
        proposalId,
        clientName: proposal.client_name,
        companyName: proposal.company_name,
        salespersonName: proposal.salesperson_name,
      });
    });

    return { ok: true, data: null };
  } catch (error) {
    return {
      ok: false,
      error: await toLoggedActionError(error, "submit-approval", {
        supabase,
        proposalId,
        userId: user?.userId,
        role: user?.role,
      }),
    };
  }
}

export async function getReviewMaterialTextAction(
  proposalId: string,
  materialId: string
): Promise<ActionResult<{ filename: string; extractedText: string | null }>> {
  let user: CurrentUser | undefined;
  const supabase = await createSupabaseServerClient();
  try {
    user = await requireApprover();
    const result = await getReviewMaterialTextForApprover(supabase, proposalId, materialId);
    return { ok: true, data: result };
  } catch (error) {
    return {
      ok: false,
      error: await toLoggedActionError(error, "review-material-text", {
        supabase,
        proposalId,
        userId: user?.userId,
        role: user?.role,
      }),
    };
  }
}

export async function decideApprovalAction(
  proposalId: string,
  versionId: string,
  decision: "approved" | "changes_requested",
  comments: string
): Promise<ActionResult<null>> {
  let user: CurrentUser | undefined;
  const supabase = await createSupabaseServerClient();
  try {
    user = await requireApprover();
    await decideProposalApproval(supabase, {
      proposalId,
      versionId,
      decision,
      comments: comments.trim() || null,
    });
    revalidatePath(`/approvals/${proposalId}`);
    revalidatePath("/approvals");

    await bestEffort(async () => {
      const proposal = await getProposal(supabase, proposalId);
      await notifySalespersonDecision({
        proposalId,
        clientName: proposal.client_name,
        companyName: proposal.company_name,
        decision,
        comments: comments.trim() || null,
      });
    });

    return { ok: true, data: null };
  } catch (error) {
    return {
      ok: false,
      error: await toLoggedActionError(error, "approval-decision", {
        supabase,
        proposalId,
        versionId,
        userId: user?.userId,
        role: user?.role,
      }),
    };
  }
}
