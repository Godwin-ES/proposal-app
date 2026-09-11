"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireSalesperson } from "@/lib/auth/guards";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import * as proposalService from "@/lib/proposals/service";
import { getProposal } from "@/lib/repositories/proposals";
import { saveManualRevision, dismissClarificationFlag } from "@/lib/proposals/version-service";
import { toLoggedActionError } from "@/lib/notifications/action-error";
import { bestEffort, notifyApproverProposalWithdrawn } from "@/lib/notifications/discord";
import type {
  ActionResult,
  ChangedSectionLabel,
  ClarificationFlag,
  ProposalIntake,
  ProposalSnapshot,
} from "@/lib/domain/types";
import type { CurrentUser } from "@/lib/auth/current-user";

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
  let user: CurrentUser | undefined;
  const supabase = await createSupabaseServerClient();
  try {
    user = await requireSalesperson();
    await proposalService.updateIntake(supabase, proposalId, input);
    revalidatePath(`/proposals/${proposalId}`);
    revalidatePath("/dashboard");
    return { ok: true, data: null };
  } catch (error) {
    return {
      ok: false,
      error: await toLoggedActionError(error, "update-intake", { supabase, proposalId, userId: user?.userId, role: user?.role }),
    };
  }
}

export async function updateClientEmailAction(
  proposalId: string,
  email: string
): Promise<ActionResult<null>> {
  let user: CurrentUser | undefined;
  const supabase = await createSupabaseServerClient();
  try {
    user = await requireSalesperson();
    await proposalService.updateClientEmail(supabase, proposalId, email);
    revalidatePath(`/proposals/${proposalId}`);
    return { ok: true, data: null };
  } catch (error) {
    return {
      ok: false,
      error: await toLoggedActionError(error, "update-client-email", {
        supabase,
        proposalId,
        userId: user?.userId,
        role: user?.role,
      }),
    };
  }
}

export async function updateDocumentProvidesFieldsAction(
  proposalId: string,
  documentProvidesFields: boolean
): Promise<ActionResult<null>> {
  let user: CurrentUser | undefined;
  const supabase = await createSupabaseServerClient();
  try {
    user = await requireSalesperson();
    await proposalService.updateDocumentProvidesFields(supabase, proposalId, documentProvidesFields);
    revalidatePath(`/proposals/${proposalId}`);
    return { ok: true, data: null };
  } catch (error) {
    return {
      ok: false,
      error: await toLoggedActionError(error, "update-document-provides-fields", {
        supabase,
        proposalId,
        userId: user?.userId,
        role: user?.role,
      }),
    };
  }
}

export async function withdrawSubmissionAction(proposalId: string): Promise<ActionResult<null>> {
  let user: CurrentUser | undefined;
  const supabase = await createSupabaseServerClient();
  try {
    user = await requireSalesperson();
    await proposalService.withdrawSubmission(supabase, user, proposalId);
    revalidatePath(`/proposals/${proposalId}`);
    revalidatePath("/dashboard");

    await bestEffort(async () => {
      const proposal = await getProposal(supabase, proposalId);
      await notifyApproverProposalWithdrawn({
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
      error: await toLoggedActionError(error, "withdraw-submission", {
        supabase,
        proposalId,
        userId: user?.userId,
        role: user?.role,
      }),
    };
  }
}

export async function saveManualRevisionAction(
  proposalId: string,
  expectedVersionId: string,
  snapshot: ProposalSnapshot,
  changedSections: ChangedSectionLabel[] = [],
  freshClarificationFlags: ClarificationFlag[] = [],
  regenerationRunIds: string[] = []
): Promise<ActionResult<{ versionId: string }>> {
  let user: CurrentUser | undefined;
  const supabase = await createSupabaseServerClient();
  try {
    user = await requireSalesperson();
    const version = await saveManualRevision(
      supabase,
      proposalId,
      expectedVersionId,
      snapshot,
      user,
      changedSections,
      freshClarificationFlags,
      regenerationRunIds
    );
    revalidatePath(`/proposals/${proposalId}`);
    return { ok: true, data: { versionId: version.id } };
  } catch (error) {
    return {
      ok: false,
      error: await toLoggedActionError(error, "manual-edit", {
        supabase,
        proposalId,
        versionId: expectedVersionId,
        userId: user?.userId,
        role: user?.role,
      }),
    };
  }
}

export async function dismissClarificationFlagAction(
  proposalId: string,
  versionId: string,
  flagId: string
): Promise<ActionResult<null>> {
  let user: CurrentUser | undefined;
  const supabase = await createSupabaseServerClient();
  try {
    user = await requireSalesperson();
    await dismissClarificationFlag(supabase, proposalId, versionId, flagId, user);
    revalidatePath(`/proposals/${proposalId}`);
    return { ok: true, data: null };
  } catch (error) {
    return {
      ok: false,
      error: await toLoggedActionError(error, "dismiss-clarification-flag", {
        supabase,
        proposalId,
        versionId,
        userId: user?.userId,
        role: user?.role,
      }),
    };
  }
}

export async function deleteProposalAction(proposalId: string): Promise<ActionResult<null>> {
  let user: CurrentUser | undefined;
  const supabase = await createSupabaseServerClient();
  try {
    user = await requireSalesperson();
    await proposalService.deleteDraftProposal(supabase, user, proposalId);
    revalidatePath("/dashboard");
    return { ok: true, data: null };
  } catch (error) {
    return {
      ok: false,
      error: await toLoggedActionError(error, "delete-proposal", { supabase, proposalId, userId: user?.userId, role: user?.role }),
    };
  }
}
