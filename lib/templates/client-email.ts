/**
 * Deterministic reference copy adapted from ../../assets/client-email-template.md.
 * Delivery emails are never AI-generated; the routine client email is deterministic.
 */
export type ClientEmailInput = {
  clientName: string;
  companyName: string;
  salespersonName: string;
  proposalLink: string;
};

export function buildClientEmail(input: ClientEmailInput): {
  subject: string;
  body: string;
} {
  const { clientName, companyName, salespersonName, proposalLink } = input;

  const subject = `Proposal for ${companyName}`;

  const body = `Hi ${clientName},

Thanks again for taking the time to speak with us. Based on our conversation, we have put together a customized proposal for your review.

You can view the proposal here: ${proposalLink}

This document outlines the project scope, timeline, pricing details, and recommended approach.

If you have any questions or would like to make adjustments, feel free to reach out. We are happy to iterate with you.

Looking forward to hearing your thoughts.

Best regards,
${salespersonName}
Koya Talent`;

  return { subject, body };
}
