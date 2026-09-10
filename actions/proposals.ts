"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireSalesperson } from "@/lib/auth/guards";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import * as proposalService from "@/lib/proposals/service";
import { saveManualRevision, dismissClarificationFlag } from "@/lib/proposals/version-service";
import { DomainError } from "@/lib/domain/errors";
import type { ActionResult, ChangedSectionLabel, ProposalIntake, ProposalSnapshot } from "@/lib/domain/types";

export async function createProposalAction(): Promise<void> {
  const user = await requireSalesperson();
  const supabase = await createSupabaseServerClient();
  const proposal = await proposalService.createProposal(supabase, user);
  revalidatePath("/dashboard");
  redirect(`/proposals/${proposal.id}`);
}

export async function updateIntakeAction(
  proposalId: string,
  input: ProposalIntake
): Promise<ActionResult<null>> {
  try {
    await requireSalesperson();
    const supabase = await createSupabaseServerClient();
    await proposalService.updateIntake(supabase, proposalId, input);
    revalidatePath(`/proposals/${proposalId}`);
    revalidatePath("/dashboard");
    return { ok: true, data: null };
  } catch (error) {
    return { ok: false, error: toActionError(error, "update-intake") };
  }
}

export async function updateClientEmailAction(
  proposalId: string,
  email: string
): Promise<ActionResult<null>> {
  try {
    await requireSalesperson();
    const supabase = await createSupabaseServerClient();
    await proposalService.updateClientEmail(supabase, proposalId, email);
    revalidatePath(`/proposals/${proposalId}`);
    return { ok: true, data: null };
  } catch (error) {
    return { ok: false, error: toActionError(error, "update-client-email") };
  }
}

export async function withdrawSubmissionAction(proposalId: string): Promise<ActionResult<null>> {
  try {
    const user = await requireSalesperson();
    const supabase = await createSupabaseServerClient();
    await proposalService.withdrawSubmission(supabase, user, proposalId);
    revalidatePath(`/proposals/${proposalId}`);
    revalidatePath("/dashboard");
    return { ok: true, data: null };
  } catch (error) {
    return { ok: false, error: toActionError(error, "withdraw-submission") };
  }
}

export async function saveManualRevisionAction(
  proposalId: string,
  expectedVersionId: string,
  snapshot: ProposalSnapshot,
  changedSections: ChangedSectionLabel[] = []
): Promise<ActionResult<{ versionId: string }>> {
  try {
    const user = await requireSalesperson();
    const supabase = await createSupabaseServerClient();
    const version = await saveManualRevision(supabase, proposalId, expectedVersionId, snapshot, user, changedSections);
    revalidatePath(`/proposals/${proposalId}`);
    return { ok: true, data: { versionId: version.id } };
  } catch (error) {
    return { ok: false, error: toActionError(error, "manual-edit") };
  }
}

export async function dismissClarificationFlagAction(
  proposalId: string,
  versionId: string,
  flagId: string
): Promise<ActionResult<null>> {
  try {
    const user = await requireSalesperson();
    const supabase = await createSupabaseServerClient();
    await dismissClarificationFlag(supabase, proposalId, versionId, flagId, user);
    revalidatePath(`/proposals/${proposalId}`);
    return { ok: true, data: null };
  } catch (error) {
    return { ok: false, error: toActionError(error, "dismiss-clarification-flag") };
  }
}

export async function deleteProposalAction(proposalId: string): Promise<ActionResult<null>> {
  try {
    const user = await requireSalesperson();
    const supabase = await createSupabaseServerClient();
    await proposalService.deleteDraftProposal(supabase, user, proposalId);
    revalidatePath("/dashboard");
    return { ok: true, data: null };
  } catch (error) {
    return { ok: false, error: toActionError(error, "delete-proposal") };
  }
}

function toActionError(error: unknown, stage: string) {
  if (error instanceof DomainError) return error.toActionError();
  return {
    code: "VALIDATION_ERROR" as const,
    stage,
    message: error instanceof Error ? error.message : "Something went wrong.",
    retrySafe: true,
  };
}
