export interface EmailProvider {
  sendProposal(input: {
    to: string;
    subject: string;
    body: string;
    pdf: Uint8Array;
    idempotencyKey: string;
  }): Promise<{ providerMessageId: string }>;
}
