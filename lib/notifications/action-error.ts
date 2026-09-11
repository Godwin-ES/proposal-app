import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { DomainError } from "@/lib/domain/errors";
import { notifySystemError } from "@/lib/notifications/discord";
import type { ActionError, ProposalErrorCode } from "@/lib/domain/types";

/** Routine, expected outcomes of normal use — not incidents. Anything else
 * (an AI/document/delivery/material/storage failure, or a raw non-DomainError
 * exception) is "unexpected" and gets logged + posted to #system-errors. */
const EXPECTED_CODES = new Set<ProposalErrorCode>([
  "VALIDATION_ERROR",
  "READINESS_ERROR",
  "PERMISSION_DENIED",
  "NOT_FOUND",
  "STALE_VERSION",
  "INVALID_STATE",
  "APPROVAL_REQUIRED",
  "MATERIAL_LIMIT_EXCEEDED",
]);

/** Next.js's `redirect()`/`notFound()` work by throwing a special error with
 * a `digest` starting "NEXT_REDIRECT"/"NEXT_NOT_FOUND" that the framework
 * expects to propagate all the way up uncaught — never treat this as a real
 * error to log or convert into an ActionResult. */
function isNextControlFlowSignal(error: unknown): boolean {
  const digest = (error as { digest?: unknown } | null)?.digest;
  return typeof digest === "string" && (digest.startsWith("NEXT_REDIRECT") || digest.startsWith("NEXT_NOT_FOUND"));
}

async function logAndNotify(
  supabase: SupabaseClient<Database> | undefined,
  actionError: ActionError,
  context: { userId?: string; role?: string }
): Promise<void> {
  if (supabase) {
    try {
      await supabase.from("error_logs").insert({
        proposal_id: actionError.proposalId ?? null,
        stage: actionError.stage,
        code: actionError.code,
        message: actionError.message,
        role: context.role ?? null,
        created_by: context.userId ?? null,
      });
    } catch (insertError) {
      console.error("Failed to write error_logs row:", insertError);
    }
  }

  await notifySystemError({
    stage: actionError.stage,
    code: actionError.code,
    message: actionError.message,
    role: context.role,
    proposalId: actionError.proposalId,
  });
}

/**
 * The single place every Server Action's catch block should funnel through.
 * Maps a caught error to the `ActionError` shape the UI expects, and — only
 * for unexpected/system-level failures, never routine ones like a
 * validation or permission error — logs it to `error_logs` and posts to the
 * #system-errors Discord channel. Rethrows Next.js redirect/notFound
 * signals untouched.
 */
export async function toLoggedActionError(
  error: unknown,
  stage: string,
  context: {
    supabase?: SupabaseClient<Database>;
    userId?: string;
    role?: string;
    proposalId?: string;
    versionId?: string;
    /** Fallback code for a raw (non-DomainError) exception. Defaults to
     * VALIDATION_ERROR to match this codebase's existing convention for an
     * unclassified failure. */
    fallbackCode?: ProposalErrorCode;
  } = {}
): Promise<ActionError> {
  if (isNextControlFlowSignal(error)) throw error;

  const actionError: ActionError =
    error instanceof DomainError
      ? error.toActionError({ proposalId: context.proposalId, versionId: context.versionId })
      : {
          code: context.fallbackCode ?? "VALIDATION_ERROR",
          stage,
          message: error instanceof Error ? error.message : "Something went wrong.",
          retrySafe: true,
          proposalId: context.proposalId,
          versionId: context.versionId,
        };

  const isExpected = error instanceof DomainError && EXPECTED_CODES.has(actionError.code);
  if (!isExpected) {
    await logAndNotify(context.supabase, actionError, { userId: context.userId, role: context.role });
  }

  return actionError;
}
