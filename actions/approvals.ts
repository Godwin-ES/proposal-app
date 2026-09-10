"use server";

import { revalidatePath } from "next/cache";
import { requireSalesperson, requireApprover } from "@/lib/auth/guards";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  submitProposalForApproval,
  decideProposalApproval,
  getReviewMaterialTextForApprover,
} from "@/lib/approvals/service";
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

export async function submitForApprovalAction(
  proposalId: string,
  expectedVersionId: string
): Promise<ActionResult<null>> {
  try {
    const user = await requireSalesperson();
    const supabase = await createSupabaseServerClient();
    await submitProposalForApproval(supabase, proposalId, expectedVersionId, user);
    revalidatePath(`/proposals/${proposalId}`);
    revalidatePath("/dashboard");
    return { ok: true, data: null };
  } catch (error) {
    return { ok: false, error: toActionError(error, "submit-approval") };
  }
}

export async function getReviewMaterialTextAction(
  proposalId: string,
  materialId: string
): Promise<ActionResult<{ filename: string; extractedText: string | null }>> {
  try {
    await requireApprover();
    const supabase = await createSupabaseServerClient();
    const result = await getReviewMaterialTextForApprover(supabase, proposalId, materialId);
    return { ok: true, data: result };
  } catch (error) {
    return { ok: false, error: toActionError(error, "review-material-text") };
  }
}

export async function decideApprovalAction(
  proposalId: string,
  versionId: string,
  decision: "approved" | "changes_requested",
  comments: string
): Promise<ActionResult<null>> {
  try {
    await requireApprover();
    const supabase = await createSupabaseServerClient();
    await decideProposalApproval(supabase, {
      proposalId,
      versionId,
      decision,
      comments: comments.trim() || null,
    });
    revalidatePath(`/approvals/${proposalId}`);
    revalidatePath("/approvals");
    return { ok: true, data: null };
  } catch (error) {
    return { ok: false, error: toActionError(error, "approval-decision") };
  }
}
