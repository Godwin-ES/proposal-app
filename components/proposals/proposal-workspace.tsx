"use client";

import { useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { saveManualRevisionAction, updateClientEmailAction, dismissClarificationFlagAction } from "@/actions/proposals";
import { submitForApprovalAction } from "@/actions/approvals";
import { ProposalHeader } from "@/components/proposals/proposal-header";
import { LocalDateTime } from "@/components/shared/local-datetime";
import { ReadinessPanel } from "@/components/shared/readiness-panel";
import { ProposalSectionCard } from "@/components/proposals/proposal-section-card";
import { InlineSectionCard } from "@/components/proposals/inline-section-card";
import { ProposalEditorDialog } from "@/components/proposals/proposal-editor-dialog";
import { ProposalDetailsEditor } from "@/components/proposals/proposal-details-editor";
import { RegenerateSectionDialog } from "@/components/proposals/regenerate-section-dialog";
import { TimelineInput } from "@/components/shared/timeline-input";
import { PricingInput } from "@/components/shared/pricing-input";
import { VersionHistory, type VersionHistoryEntry } from "@/components/proposals/version-history";
import { Button } from "@/components/ui/button";
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
import { Pencil, Send, X } from "lucide-react";
import type { ChangedSectionLabel, ClarificationFlag, ProposalSnapshot, ProposalStatus } from "@/lib/domain/types";
import { SECTION_DISPLAY_LABELS } from "@/lib/domain/section-labels";

export function ProposalWorkspace({
  proposalId,
  status,
  ownerName,
  updatedAt,
  versionId,
  versionNumber,
  snapshot,
  approvalBlockers,
  clarificationFlags,
  editable,
  versions,
  materialCount,
  canSubmitForApproval,
  changeRequest,
  clientEmail,
}: {
  proposalId: string;
  status: ProposalStatus;
  ownerName: string;
  updatedAt: string;
  versionId: string;
  versionNumber: number;
  snapshot: ProposalSnapshot;
  approvalBlockers: string[];
  clarificationFlags: ClarificationFlag[];
  editable: boolean;
  versions: VersionHistoryEntry[];
  materialCount: number;
  canSubmitForApproval: boolean;
  changeRequest: { comments: string | null; createdAt: string } | null;
  clientEmail: string;
}) {
  const router = useRouter();
  const [submitting, startSubmitTransition] = useTransition();

  function handleSubmitForApproval() {
    startSubmitTransition(async () => {
      const result = await submitForApprovalAction(proposalId, versionId);
      if (result.ok) {
        toast.success("Submitted for approval.");
        router.refresh();
      } else {
        toast.error(result.error.message);
      }
    });
  }

  async function saveSnapshot(next: ProposalSnapshot, changedSection: ChangedSectionLabel | null = null): Promise<boolean> {
    const result = await saveManualRevisionAction(proposalId, versionId, next, changedSection);
    if (result.ok) {
      toast.success("Proposal updated.");
      router.refresh();
      return true;
    }
    toast.error(result.error.message);
    return false;
  }

  async function dismissFlag(flagId: string) {
    const result = await dismissClarificationFlagAction(proposalId, versionId, flagId);
    if (result.ok) {
      toast.success("Flag dismissed.");
      router.refresh();
    } else {
      toast.error(result.error.message);
    }
  }

  async function saveClientEmail(email: string): Promise<boolean> {
    const result = await updateClientEmailAction(proposalId, email);
    if (result.ok) {
      toast.success("Client email updated.");
      router.refresh();
      return true;
    }
    toast.error(result.error.message);
    return false;
  }

  function editButton(label: string) {
    return (
      <Button variant="ghost" size="icon" aria-label={`Edit ${label}`}>
        <Pencil className="size-4" />
      </Button>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <ProposalHeader
        clientName={snapshot.client.clientName}
        companyName={snapshot.client.companyName}
        status={status}
        versionNumber={versionNumber}
        ownerName={ownerName}
        updatedAt={updatedAt}
      />

      {changeRequest ? (
        <div className="rounded-md border border-amber-300 bg-amber-50 p-4 text-sm dark:border-amber-900 dark:bg-amber-950">
          <p className="font-medium text-amber-900 dark:text-amber-200">
            Changes requested on <LocalDateTime value={changeRequest.createdAt} />
          </p>
          <p className="mt-1 text-amber-800 dark:text-amber-300">
            {changeRequest.comments ? `“${changeRequest.comments}”` : "No additional comments were left."}
          </p>
        </div>
      ) : null}

      {clarificationFlags.length > 0 ? (
        <div className="rounded-md border border-blue-300 bg-blue-50 p-4 text-sm dark:border-blue-900 dark:bg-blue-950">
          <p className="font-medium text-blue-900 dark:text-blue-200">
            The AI flagged this — resolve or dismiss before submitting:
          </p>
          <ul className="mt-1 flex flex-col gap-1.5 text-blue-800 dark:text-blue-300">
            {clarificationFlags.map((flag) => (
              <li key={flag.id} className="flex items-start justify-between gap-3">
                <span>
                  {flag.section ? (
                    <span className="font-medium">{SECTION_DISPLAY_LABELS[flag.section] ?? flag.section}: </span>
                  ) : null}
                  {flag.message}
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  className="shrink-0 text-blue-800 hover:text-blue-900 dark:text-blue-300"
                  aria-label="Dismiss flag"
                  onClick={() => dismissFlag(flag.id)}
                >
                  <X className="size-3.5" />
                </Button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <ReadinessPanel
        title="Approval readiness"
        blockers={
          editable
            ? [
                ...(changeRequest ? ["Revise this version based on the approver's notes above"] : []),
                ...(clarificationFlags.length > 0 ? ["Resolve or dismiss the AI's flagged concerns above"] : []),
                ...approvalBlockers,
              ]
            : []
        }
      />

      {status === "approved" || status === "delivered" ? (
        <div>
          <Button asChild variant="secondary">
            <Link href={`/delivery/${proposalId}`}>Go to Delivery</Link>
          </Button>
        </div>
      ) : null}

      {canSubmitForApproval ? (
        <div>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button disabled={submitting}>
                <Send className="size-4" /> Submit for Approval
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Submit version {versionNumber} for approval?</AlertDialogTitle>
                <AlertDialogDescription>
                  This proposal becomes read-only until an approver decides. You will not be able to edit or
                  regenerate content while it is pending.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleSubmitForApproval}>Submit</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      ) : null}

      <div className="flex items-center justify-between">
        <h2 className="text-lg font-medium">Client Details</h2>
        {editable ? (
          <ProposalDetailsEditor
            client={snapshot.client}
            clientEmail={clientEmail}
            onSave={(client) => saveSnapshot({ ...snapshot, client }, "clientDetails")}
            onSaveEmail={saveClientEmail}
          />
        ) : null}
      </div>

      <InlineSectionCard
        title="Introduction"
        value={snapshot.content.introduction}
        displayContent={snapshot.content.introduction}
        editable={editable}
        onSave={(value) =>
          saveSnapshot({ ...snapshot, content: { ...snapshot.content, introduction: value } }, "introduction")
        }
        extraActions={
          <RegenerateSectionDialog
            proposalId={proposalId}
            versionId={versionId}
            targetSection="introduction"
            sectionLabel="Introduction"
            materialCount={materialCount}
          />
        }
      />

      <InlineSectionCard
        title="Project Scope"
        value={snapshot.content.projectScope}
        displayContent={snapshot.content.projectScope}
        editable={editable}
        onSave={(value) =>
          saveSnapshot({ ...snapshot, content: { ...snapshot.content, projectScope: value } }, "projectScope")
        }
        extraActions={
          <RegenerateSectionDialog
            proposalId={proposalId}
            versionId={versionId}
            targetSection="projectScope"
            sectionLabel="Project Scope"
            materialCount={materialCount}
          />
        }
      />

      <InlineSectionCard
        title="Recommended Approach"
        value={snapshot.content.recommendedApproach}
        displayContent={snapshot.content.recommendedApproach}
        editable={editable}
        onSave={(value) =>
          saveSnapshot(
            { ...snapshot, content: { ...snapshot.content, recommendedApproach: value } },
            "recommendedApproach"
          )
        }
        extraActions={
          <RegenerateSectionDialog
            proposalId={proposalId}
            versionId={versionId}
            targetSection="recommendedApproach"
            sectionLabel="Recommended Approach"
            materialCount={materialCount}
          />
        }
      />

      <InlineSectionCard
        title="Deliverables"
        value={snapshot.content.deliverables.join("\n")}
        displayContent={
          <ul className="list-disc pl-5">
            {snapshot.content.deliverables.map((item, i) => (
              <li key={i}>{item}</li>
            ))}
          </ul>
        }
        description="One deliverable per line."
        editable={editable}
        onSave={(value) =>
          saveSnapshot(
            {
              ...snapshot,
              content: {
                ...snapshot.content,
                deliverables: value
                  .split("\n")
                  .map((line) => line.trim())
                  .filter(Boolean),
              },
            },
            "deliverables"
          )
        }
        extraActions={
          <RegenerateSectionDialog
            proposalId={proposalId}
            versionId={versionId}
            targetSection="deliverables"
            sectionLabel="Deliverables"
            materialCount={materialCount}
          />
        }
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <ProposalSectionCard
          title="Timeline"
          content={snapshot.content.timeline}
          actions={
            editable ? (
              <ProposalEditorDialog
                trigger={editButton("Timeline")}
                title="Edit Timeline"
                initialValue={snapshot.content.timeline}
                renderInput={(value, onChange) => <TimelineInput value={value} onChange={onChange} />}
                onSave={(value) =>
                  saveSnapshot({ ...snapshot, content: { ...snapshot.content, timeline: value } }, "timeline")
                }
              />
            ) : null
          }
        />
        <ProposalSectionCard
          title="Pricing"
          content={snapshot.content.pricing}
          actions={
            editable ? (
              <ProposalEditorDialog
                trigger={editButton("Pricing")}
                title="Edit Pricing"
                initialValue={snapshot.content.pricing}
                renderInput={(value, onChange) => <PricingInput value={value} onChange={onChange} />}
                onSave={(value) =>
                  saveSnapshot({ ...snapshot, content: { ...snapshot.content, pricing: value } }, "pricing")
                }
              />
            ) : null
          }
        />
      </div>

      <InlineSectionCard
        title="Next Steps"
        value={snapshot.content.nextSteps}
        displayContent={snapshot.content.nextSteps}
        editable={editable}
        onSave={(value) =>
          saveSnapshot({ ...snapshot, content: { ...snapshot.content, nextSteps: value } }, "nextSteps")
        }
      />

      <div>
        <h2 className="mb-3 text-lg font-medium">Version History</h2>
        <VersionHistory versions={versions} />
      </div>
    </div>
  );
}
