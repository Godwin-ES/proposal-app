"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { CheckCircle2, FileDown, Loader2, Mail, Sparkles } from "lucide-react";
import { generateFinalPdfAction } from "@/actions/documents";
import { sendProposalAction } from "@/actions/delivery";
import { ReadinessPanel } from "@/components/shared/readiness-panel";
import { Alert, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";

export function DeliveryReadiness({
  proposalId,
  versionId,
  recipient,
  delivered,
  blockers,
  pdfStatus,
  pdfError,
}: {
  proposalId: string;
  versionId: string;
  recipient: string | null;
  delivered: boolean;
  blockers: string[];
  pdfStatus: "not_generated" | "generating" | "ready" | "failed";
  pdfError: string | null;
}) {
  const router = useRouter();
  const [pdfPending, startPdfTransition] = useTransition();

  function handleGeneratePdf() {
    startPdfTransition(async () => {
      const result = await generateFinalPdfAction(proposalId, versionId);
      if (result.ok) {
        toast.success("Final PDF ready.");
        router.refresh();
      } else {
        toast.error(result.error.message);
      }
    });
  }

  async function handleSend(): Promise<boolean> {
    const result = await sendProposalAction(proposalId, versionId);
    if (result.ok) {
      toast.success(
        result.data.status === "sent"
          ? "Proposal sent to the client."
          : "Delivery outcome uncertain — check delivery history before resending."
      );
      router.refresh();
      return true;
    }
    toast.error(result.error.message);
    return false;
  }

  const canSend = blockers.length === 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Delivery</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {delivered ? (
          <>
            <Alert className="border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-200">
              <CheckCircle2 className="size-4" />
              <AlertTitle>Delivered to {recipient}</AlertTitle>
            </Alert>
            <div>
              <Button asChild variant="secondary">
                <a href={`/api/documents/${versionId}`}>
                  <FileDown className="size-4" /> Download PDF
                </a>
              </Button>
            </div>
          </>
        ) : (
          <>
            <ReadinessPanel title="Delivery readiness" blockers={blockers} />

            <p className="text-sm text-muted-foreground">
              Recipient: {recipient ?? <span className="text-destructive">no client email set</span>}
            </p>

            {pdfStatus === "failed" && pdfError ? (
              <p className="text-sm text-destructive">Final PDF generation failed: {pdfError}</p>
            ) : null}

            <div className="flex flex-wrap gap-2">
              {pdfStatus !== "ready" ? (
                <Button onClick={handleGeneratePdf} disabled={pdfPending} variant="secondary">
                  {pdfPending ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
                  {pdfPending ? "Generating..." : "Generate Final PDF"}
                </Button>
              ) : (
                <Button asChild variant="secondary">
                  <a href={`/api/documents/${versionId}`}>
                    <FileDown className="size-4" /> Download PDF
                  </a>
                </Button>
              )}

              <ConfirmDialog
                trigger={
                  <Button disabled={!canSend || pdfPending}>
                    <Mail className="size-4" /> Send Proposal
                  </Button>
                }
                title={`Send this proposal to ${recipient}?`}
                description="This sends the exact approved PDF to the client and marks the proposal delivered. This cannot be undone."
                confirmLabel="Send"
                pendingLabel="Sending..."
                onConfirm={handleSend}
              />
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
