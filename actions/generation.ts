"use server";

import { revalidatePath } from "next/cache";
import { requireSalesperson } from "@/lib/auth/guards";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { generateInitialDraft, regenerateSectionPreview } from "@/lib/ai/service";
import { toLoggedActionError } from "@/lib/notifications/action-error";
import type {
  ActionResult,
  ClarificationFlag,
  ClaudeModel,
  ProposalSectionKey,
  ProposalSnapshot,
} from "@/lib/domain/types";
import type { CurrentUser } from "@/lib/auth/current-user";

export async function generateInitialDraftAction(
  proposalId: string,
  model: ClaudeModel
): Promise<ActionResult<{ versionId: string }>> {
  let user: CurrentUser | undefined;
  const supabase = await createSupabaseServerClient();
  try {
    user = await requireSalesperson();
    const version = await generateInitialDraft(supabase, proposalId, model, user);
    revalidatePath(`/proposals/${proposalId}`);
    revalidatePath("/dashboard");
    return { ok: true, data: { versionId: version.id } };
  } catch (error) {
    return {
      ok: false,
      error: await toLoggedActionError(error, "ai-generation", {
        supabase,
        proposalId,
        userId: user?.userId,
        role: user?.role,
        fallbackCode: "AI_PROVIDER_FAILED",
      }),
    };
  }
}

export async function regenerateSectionPreviewAction(
  proposalId: string,
  targetSection: ProposalSectionKey,
  instruction: string,
  model: ClaudeModel,
  currentSnapshot: ProposalSnapshot
): Promise<
  ActionResult<{ snapshot: ProposalSnapshot; clarificationFlags: ClarificationFlag[]; generationRunId: string }>
> {
  let user: CurrentUser | undefined;
  const supabase = await createSupabaseServerClient();
  try {
    user = await requireSalesperson();
    const result = await regenerateSectionPreview(
      supabase,
      proposalId,
      targetSection,
      instruction,
      model,
      currentSnapshot,
      user
    );
    return { ok: true, data: result };
  } catch (error) {
    return {
      ok: false,
      error: await toLoggedActionError(error, "ai-generation", {
        supabase,
        proposalId,
        userId: user?.userId,
        role: user?.role,
        fallbackCode: "AI_PROVIDER_FAILED",
      }),
    };
  }
}
