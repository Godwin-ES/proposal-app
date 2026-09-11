"use server";

import { revalidatePath } from "next/cache";
import { requireSalesperson } from "@/lib/auth/guards";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { generateInitialDraft, regenerateSectionPreview } from "@/lib/ai/service";
import { DomainError } from "@/lib/domain/errors";
import type {
  ActionResult,
  ClarificationFlag,
  ClaudeModel,
  ProposalSectionKey,
  ProposalSnapshot,
} from "@/lib/domain/types";

function toActionError(error: unknown, stage: string) {
  if (error instanceof DomainError) return error.toActionError();
  return {
    code: "AI_PROVIDER_FAILED" as const,
    stage,
    message: error instanceof Error ? error.message : "Generation failed unexpectedly.",
    retrySafe: true,
  };
}

export async function generateInitialDraftAction(
  proposalId: string,
  model: ClaudeModel
): Promise<ActionResult<{ versionId: string }>> {
  try {
    const user = await requireSalesperson();
    const supabase = await createSupabaseServerClient();
    const version = await generateInitialDraft(supabase, proposalId, model, user);
    revalidatePath(`/proposals/${proposalId}`);
    revalidatePath("/dashboard");
    return { ok: true, data: { versionId: version.id } };
  } catch (error) {
    return { ok: false, error: toActionError(error, "ai-generation") };
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
  try {
    const user = await requireSalesperson();
    const supabase = await createSupabaseServerClient();
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
    return { ok: false, error: toActionError(error, "ai-generation") };
  }
}
