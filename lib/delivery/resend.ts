import "server-only";
import { Resend } from "resend";
import { DomainError } from "@/lib/domain/errors";
import type { EmailProvider } from "@/lib/delivery/provider";

export function createResendProvider(): EmailProvider {
  const resend = new Resend(process.env.RESEND_API_KEY);
  const from = process.env.EMAIL_FROM!;

  return {
    async sendProposal({ to, subject, body, pdf, idempotencyKey }) {
      const { data, error } = await resend.emails.send(
        {
          from,
          to,
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
