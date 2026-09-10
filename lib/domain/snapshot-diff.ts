import type { ChangedSectionLabel, ProposalSnapshot } from "@/lib/domain/types";

/**
 * Compares two snapshots field-by-field to determine exactly which
 * user-facing sections differ. Used to record an accurate "what changed" list
 * for a version that batches several local edits together — diffing content
 * rather than tracking edit events means a field edited and then reverted
 * back to its original value is correctly not counted as changed.
 */
export function diffChangedSections(previous: ProposalSnapshot, next: ProposalSnapshot): ChangedSectionLabel[] {
  const sections: ChangedSectionLabel[] = [];

  if (previous.content.introduction !== next.content.introduction) sections.push("introduction");
  if (previous.content.projectScope !== next.content.projectScope) sections.push("projectScope");
  if (previous.content.recommendedApproach !== next.content.recommendedApproach) {
    sections.push("recommendedApproach");
  }
  if (previous.content.deliverables.join("\n") !== next.content.deliverables.join("\n")) {
    sections.push("deliverables");
  }
  if (previous.content.nextSteps !== next.content.nextSteps) sections.push("nextSteps");
  if (previous.content.timeline !== next.content.timeline) sections.push("timeline");
  if (previous.content.pricing !== next.content.pricing) sections.push("pricing");

  const prevClient = previous.client;
  const nextClient = next.client;
  if (
    prevClient.clientName !== nextClient.clientName ||
    prevClient.companyName !== nextClient.companyName ||
    prevClient.dateOfCall !== nextClient.dateOfCall ||
    prevClient.salespersonName !== nextClient.salespersonName
  ) {
    sections.push("clientDetails");
  }

  return sections;
}
