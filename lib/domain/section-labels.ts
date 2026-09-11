import type { ChangedSectionLabel } from "@/lib/domain/types";

/** Human-readable label for every field a manual edit can touch — shared
 * between the clarification-flag banner and version history so both read
 * the same names. */
export const SECTION_DISPLAY_LABELS: Record<ChangedSectionLabel, string> = {
  introduction: "Introduction",
  projectScope: "Project Scope",
  recommendedApproach: "Recommended Approach",
  deliverables: "Deliverables",
  nextSteps: "Next Steps",
  timeline: "Timeline",
  pricing: "Pricing",
  clientDetails: "Client Details",
};

/** The exact placeholder text generation must write into a section it can't
 * responsibly ground in anything (incoherent/missing input, nothing usable
 * in supporting material either) — see the grounding rules in
 * lib/ai/prompts.ts. Kept as one literal convention so it's recognizable
 * wherever it shows up (the draft, a saved version, the final PDF) rather
 * than each generation inventing its own wording. */
export function placeholderContent(label: string): string {
  return `[${label}]`;
}
