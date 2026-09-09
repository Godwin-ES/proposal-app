import type { ProposalSnapshot } from "@/lib/domain/types";

/**
 * Deterministic reference copy adapted from ../../assets/proposal-template.md.
 * Encoded here so the deployed app never reads outside its own repository at
 * runtime. These sections carry no AI involvement — timeline/pricing come
 * directly from intake and deliverables' framing sentence is fixed; only the
 * deliverables list items themselves are AI-authored.
 */
export function buildProposedSolutionIntro(clientName: string): string {
  return `Here is a high-level overview of what we are proposing for ${clientName}.`;
}

export function buildDeliverablesIntro(): string {
  return "This engagement includes the following key deliverables:";
}

export function buildTimelineIntro(): string {
  return "This engagement is estimated to be completed within:";
}

export function buildTimelineOutro(): string {
  return "Covers implementation, testing, and iteration based on your feedback.";
}

export function buildPricingIntro(): string {
  return "The estimated investment for this engagement is:";
}

export function buildPricingOutro(): string {
  return "Scope and pricing can be adjusted as your needs evolve.";
}

export function buildNextSteps(): string {
  return "If this proposal aligns with your goals, we'll prepare a formal agreement to get started right away. We're happy to answer any questions in the meantime, and we're looking forward to working together.";
}

export function buildProposalText(snapshot: ProposalSnapshot): string {
  const { client, content } = snapshot;
  const deliverables = content.deliverables.map((item) => `- ${item}`).join("\n");

  return `Proposal for ${client.clientName}

Prepared by ${client.salespersonName}
Date: ${client.dateOfCall}

1. Introduction

${content.introduction}

2. Proposed Solution

${buildProposedSolutionIntro(client.clientName)}

Project Scope
${content.projectScope}

Recommended Approach
${content.recommendedApproach}

3. Deliverables

${buildDeliverablesIntro()}

${deliverables}

4. Timeline

${buildTimelineIntro()}

${content.timeline}

${buildTimelineOutro()}

5. Pricing

${buildPricingIntro()}

${content.pricing}

${buildPricingOutro()}

6. Next Steps

${content.nextSteps}

Warm regards,
${client.salespersonName}
Koya Talent`;
}
