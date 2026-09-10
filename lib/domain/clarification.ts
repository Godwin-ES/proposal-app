import type { ClarificationFlag, ProposalSectionKey } from "@/lib/domain/types";
import type { AIClarificationFlag } from "@/lib/ai/schemas";

/** Converts the AI's raw flags (section is "general" instead of null — see
 * lib/ai/schemas.ts for why) into our internal shape, assigning each a
 * stable id so it can be targeted by a later dismiss action. The AI itself
 * never produces ids. */
export function withFlagIds(raw: AIClarificationFlag[]): ClarificationFlag[] {
  return raw.map((f) => ({
    id: crypto.randomUUID(),
    section: f.section === "general" ? null : (f.section as ProposalSectionKey),
    message: f.message,
  }));
}

/**
 * Computes the next version's clarification flags from the previous
 * version's, given which section (if any) this edit/regeneration just
 * addressed. A section-tagged flag clears automatically the moment its own
 * section is touched — every other flag carries forward untouched, instead
 * of the old behaviour of wiping the whole array on any edit. Flags with no
 * section (e.g. "this uploaded file seems unrelated") never auto-clear —
 * there's no single section whose edit would resolve them — they only go
 * away via an explicit dismiss.
 */
export function carryForwardClarificationFlags(
  previousFlags: ClarificationFlag[],
  changedSection: ProposalSectionKey | null,
  freshFlags: ClarificationFlag[] = []
): ClarificationFlag[] {
  const carried = changedSection ? previousFlags.filter((f) => f.section !== changedSection) : previousFlags;
  return [...carried, ...freshFlags];
}
