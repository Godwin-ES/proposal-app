import "server-only";
import { Resend } from "resend";
import { DomainError } from "@/lib/domain/errors";
import type { EmailProvider } from "@/lib/delivery/provider";

export function createResendProvider(): EmailProvider {
  const resend = new Resend(process.env.RESEND_API_KEY);
  const from = process.env.EMAIL_FROM!;
  // Demo/staging safety valve: Resend's sandbox sender (no verified domain)
  // only delivers to the account's own verified address, and this app has no
  // real clients to email anyway. When set, every send is redirected here at
  // the provider boundary only — proposal.client_email (used everywhere else:
  // delivery_attempts, the UI's "Recipient" display, readiness checks) is
  // untouched, so the app behaves exactly as it would with real recipients.
  const sandboxRecipient = process.env.RESEND_SANDBOX_RECIPIENT;

  return {
    async sendProposal({ to, subject, body, pdf, idempotencyKey }) {
      const { data, error } = await resend.emails.send(
        {
          from,
          to: sandboxRecipient || to,
          subject,
          text: body,
          attachments: [{ filename: "proposal.pdf", content: Buffer.from(pdf) }],
        },
        { idempotencyKey }
      );

      if (error || !data) {
        throw new DomainError(
          "DELIVERY_FAILED",
          "delivery-send",
          error?.message ?? "The email provider did not return a message id.",
          true
        );
      }

      return { providerMessageId: data.id };
    },
  };
}
