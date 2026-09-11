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

  function requestChanges() {
    startTransition(async () => {
      const result = await decideApprovalAction(proposalId, versionId, "changes_requested", comments);
      if (result.ok) {
        toast.success("Changes requested.");
        router.push("/approvals");
      } else {
        toast.error(result.error.message);
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
    toast.error(result.error.message);
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
