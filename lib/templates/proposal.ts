import type { ProposalSnapshot } from "@/lib/domain/types";

/**
 * Deterministic reference copy adapted from ../../assets/proposal-template.md.
 * Encoded here so the deployed app never reads outside its own repository at runtime.
 */
export function buildNextSteps(): string {
  return "If you are happy with this proposal, we will send over an agreement to formalize the engagement and start the project. You can reach us with any questions. Looking forward to working together.";
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

Project Scope
${content.projectScope}

Recommended Approach
${content.recommendedApproach}

3. Deliverables

${deliverables}

4. Timeline

${content.timeline}

5. Pricing

${content.pricing}

6. Next Steps

${content.nextSteps}

Warm regards,
${client.salespersonName}
Koya Talent`;
}
