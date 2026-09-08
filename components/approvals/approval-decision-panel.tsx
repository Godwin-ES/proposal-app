"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Check, X } from "lucide-react";
import { decideApprovalAction } from "@/actions/approvals";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

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

  function decide(decision: "approved" | "changes_requested") {
    startTransition(async () => {
      const result = await decideApprovalAction(proposalId, versionId, decision, comments);
      if (result.ok) {
        toast.success(decision === "approved" ? "Proposal approved." : "Changes requested.");
        router.push("/approvals");
        router.refresh();
      } else {
        toast.error(result.error.message);
      }
    });
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
        />
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" onClick={() => decide("changes_requested")} disabled={pending}>
            <X className="size-4" /> Request Changes
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button disabled={pending}>
                <Check className="size-4" /> Approve Proposal
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Approve version {versionNumber}?</AlertDialogTitle>
                <AlertDialogDescription>
                  You are authorizing exactly version {versionNumber} of this proposal for client delivery. Any
                  later revision will require a new approval.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={() => decide("approved")}>Approve</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </CardContent>
    </Card>
  );
}
