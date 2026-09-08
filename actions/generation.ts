"use server";

import { revalidatePath } from "next/cache";
import { requireSalesperson } from "@/lib/auth/guards";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { generateInitialDraft } from "@/lib/ai/service";
import { DomainError } from "@/lib/domain/errors";
import type { ActionResult, GenerationProvider } from "@/lib/domain/types";

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
  provider: GenerationProvider
): Promise<ActionResult<{ versionId: string }>> {
  try {
    const user = await requireSalesperson();
    const supabase = await createSupabaseServerClient();
    const version = await generateInitialDraft(supabase, proposalId, provider, user);
    revalidatePath(`/proposals/${proposalId}`);
    revalidatePath("/dashboard");
    return { ok: true, data: { versionId: version.id } };
  } catch (error) {
    return { ok: false, error: toActionError(error, "ai-generation") };
  }
}
