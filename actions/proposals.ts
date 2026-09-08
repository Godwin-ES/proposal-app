"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireSalesperson } from "@/lib/auth/guards";
import * as proposalService from "@/lib/proposals/service";
import { DomainError } from "@/lib/domain/errors";
import type { ActionResult, ProposalIntake } from "@/lib/domain/types";

export async function createProposalAction(): Promise<void> {
  const user = await requireSalesperson();
  const proposal = await proposalService.createProposal(user);
  revalidatePath("/dashboard");
  redirect(`/proposals/${proposal.id}`);
}

export async function updateIntakeAction(
  proposalId: string,
  input: ProposalIntake
): Promise<ActionResult<null>> {
  try {
    await requireSalesperson();
    await proposalService.updateIntake(proposalId, input);
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
    await proposalService.updateClientEmail(proposalId, email);
    revalidatePath(`/proposals/${proposalId}`);
    return { ok: true, data: null };
  } catch (error) {
    return { ok: false, error: toActionError(error, "update-client-email") };
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
