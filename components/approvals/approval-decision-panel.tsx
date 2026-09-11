"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Check, X } from "lucide-react";
import { decideApprovalAction } from "@/actions/approvals";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";

export function ApprovalDecisionPanel({
  proposalId,
  versionId,
  versionNumber,
}: {
  proposalId: string;
  versionId: string;
  versionNumber: number;
}) {
  const [comments, setComments] = useState("");
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  /** The salesperson can withdraw or resubmit a new version while this page
   * is still open in the approver's browser — the decide RPC then correctly
   * rejects with INVALID_STATE (no longer pending) or STALE_VERSION (a newer
   * version exists). Rather than surface that as a raw error, treat it as
   * "this proposal moved on without you" and send them back to a fresh
   * queue instead of leaving them stuck on a page they can no longer act on. */
  function handleDecisionError(error: { code: string; message: string }): void {
    if (error.code === "INVALID_STATE" || error.code === "STALE_VERSION") {
      toast.info("This proposal was withdrawn or updated by the salesperson since you opened it. Returning to your queue.");
      router.push("/approvals");
      router.refresh();
      return;
    }
    toast.error(error.message);
  }

  function requestChanges() {
    startTransition(async () => {
      const result = await decideApprovalAction(proposalId, versionId, "changes_requested", comments);
      if (result.ok) {
        toast.success("Changes requested.");
        router.push("/approvals");
      } else {
        handleDecisionError(result.error);
      }
    });
  }

  async function approve(): Promise<boolean> {
    const result = await decideApprovalAction(proposalId, versionId, "approved", comments);
    if (result.ok) {
      toast.success("Proposal approved.");
      router.push("/approvals");
      return true;
    }
    handleDecisionError(result.error);
    return false;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Decision</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <Textarea
          placeholder="Optional comments for the salesperson..."
          value={comments}
          onChange={(e) => setComments(e.target.value)}
          rows={3}
          disabled={pending}
        />
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" onClick={requestChanges} disabled={pending}>
            <X className="size-4" />
            {pending ? "Requesting Changes..." : "Request Changes"}
          </Button>
          <ConfirmDialog
            trigger={
              <Button disabled={pending}>
                <Check className="size-4" />
                Approve Proposal
              </Button>
            }
            title={`Approve version ${versionNumber}?`}
            description={
              <>
                You are authorizing exactly version {versionNumber} of this proposal for client delivery. Any later
                revision will require a new approval.
              </>
            }
            confirmLabel="Approve"
            pendingLabel="Approving..."
            onConfirm={approve}
          />
        </div>
      </CardContent>
    </Card>
  );
}
