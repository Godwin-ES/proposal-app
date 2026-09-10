import type { ClarificationFlag, ProposalSectionKey } from "@/lib/domain/types";
import type { AIClarificationFlag } from "@/lib/ai/schemas";

/** Converts the AI's raw flags (section is "general" instead of null — see
 * lib/ai/schemas.ts for why) into our internal shape, assigning each a
 * stable id so it can be targeted by a later dismiss action. The AI itself
 * never produces ids or a status — every freshly-raised flag starts "open". */
export function withFlagIds(raw: AIClarificationFlag[]): ClarificationFlag[] {
  return raw.map((f) => ({
    id: crypto.randomUUID(),
    section: f.section === "general" ? null : (f.section as ProposalSectionKey),
    message: f.message,
    status: "open",
  }));
}

/**
 * Computes the next version's clarification flags from the previous
 * version's, given which sections (if any) this edit/regeneration just
 * addressed. Flags are never removed — only re-statused — so an Approver can
 * later see the full history, not just what's still open:
 *
 * - A still-open, section-tagged flag becomes "resolved" the moment its own
 *   section is touched. Every other flag (including already-dismissed or
 *   already-resolved ones) carries forward completely untouched.
 * - Flags with no section (e.g. "this uploaded file seems unrelated") never
 *   auto-resolve this way — there's no single section whose edit would
 *   address them — they only change status via an explicit dismiss.
 */
/** Only "open" flags are actionable — block submission, or show in the
 * Salesperson's banner. Dismissed/resolved ones are history for the
 * Approver, not something still requiring attention. */
export function openClarificationFlags(flags: ClarificationFlag[]): ClarificationFlag[] {
  return flags.filter((f) => f.status === "open");
}

export function carryForwardClarificationFlags(
  previousFlags: ClarificationFlag[],
  changedSections: ProposalSectionKey[],
  freshFlags: ClarificationFlag[] = []
): ClarificationFlag[] {
  const carried = previousFlags.map((f) =>
    f.status === "open" && f.section !== null && changedSections.includes(f.section)
      ? { ...f, status: "resolved" as const }
      : f
  );
  return [...carried, ...freshFlags];
}
