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
