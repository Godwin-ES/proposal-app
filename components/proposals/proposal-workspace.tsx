"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  saveManualRevisionAction,
  updateClientEmailAction,
  dismissClarificationFlagAction,
  withdrawSubmissionAction,
} from "@/actions/proposals";
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
import { Loader2, Pencil, Send, X } from "lucide-react";
import type { ClarificationFlag, ProposalSnapshot, ProposalStatus } from "@/lib/domain/types";
import { SECTION_DISPLAY_LABELS } from "@/lib/domain/section-labels";
import { diffChangedSections } from "@/lib/domain/snapshot-diff";

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
  const [withdrawing, startWithdrawTransition] = useTransition();
  const [saving, setSaving] = useState(false);
  const [dismissingFlagId, setDismissingFlagId] = useState<string | null>(null);

  // Local, unsaved editing buffer — edits to any section update this only;
  // nothing reaches the database until "Save Version" is clicked, so
  // several sections can be changed and recorded as a single version
  // instead of one version per field. Reset whenever the persisted current
  // version actually changes (a real save, a regeneration, or a revision
  // requested elsewhere) — not on every server refresh, so an in-flight
  // draft survives e.g. saving the client email separately. Adjusted during
  // render (React's "reset state on prop change" pattern) rather than in an
  // effect, which would cause an extra render pass.
  const [renderedVersionId, setRenderedVersionId] = useState(versionId);
  const [draft, setDraft] = useState(snapshot);
  if (versionId !== renderedVersionId) {
    setRenderedVersionId(versionId);
    setDraft(snapshot);
  }

  const dirtySections = diffChangedSections(snapshot, draft);
  const isDirty = dirtySections.length > 0;

  useEffect(() => {
    if (!isDirty) return;
    function handler(e: BeforeUnloadEvent) {
      e.preventDefault();
      e.returnValue = "";
    }
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [isDirty]);

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

  function handleWithdraw() {
    startWithdrawTransition(async () => {
      const result = await withdrawSubmissionAction(proposalId);
      if (result.ok) {
        toast.success("Submission withdrawn — back to Draft.");
        router.refresh();
      } else {
        toast.error(result.error.message);
      }
    });
  }

  /** Updates the local draft only — does not touch the database. Matches the
   * `(value) => Promise<boolean>` contract every section editor already
   * expects, so those components need no changes. */
  async function updateDraft(next: ProposalSnapshot): Promise<boolean> {
    setDraft(next);
    return true;
  }

  async function handleSaveVersion() {
    setSaving(true);
    const result = await saveManualRevisionAction(proposalId, versionId, draft, dirtySections);
    setSaving(false);
    if (result.ok) {
      toast.success(
        dirtySections.length === 1
          ? `${SECTION_DISPLAY_LABELS[dirtySections[0]]} saved.`
          : `Saved ${dirtySections.length} changed sections.`
      );
      router.refresh();
    } else {
      toast.error(result.error.message);
    }
  }

  function handleDiscardDraft() {
    setDraft(snapshot);
    toast.info("Unsaved changes discarded.");
  }

  function handleRevert(version: VersionHistoryEntry) {
    setDraft(version.snapshot);
    toast.info(`Loaded v${version.versionNumber} — review below and Save Version to apply.`);
  }

  async function dismissFlag(flagId: string) {
    setDismissingFlagId(flagId);
    const result = await dismissClarificationFlagAction(proposalId, versionId, flagId);
    setDismissingFlagId(null);
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

  const regenerateDisabledReason = isDirty ? "Save or discard your unsaved changes first." : undefined;

  return (
    <div className="flex flex-col gap-6 pb-20">
      <ProposalHeader
        clientName={draft.client.clientName}
        companyName={draft.client.companyName}
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
                  disabled={dismissingFlagId === flag.id}
                  onClick={() => dismissFlag(flag.id)}
                >
                  {dismissingFlagId === flag.id ? (
                    <Loader2 className="size-3.5 animate-spin" />
                  ) : (
                    <X className="size-3.5" />
                  )}
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
                ...(isDirty ? ["Save or discard your unsaved changes before submitting"] : []),
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

      {status === "pending_approval" ? (
        <div className="rounded-md border bg-muted/40 p-4 text-sm">
          <p className="font-medium">Awaiting approval</p>
          <p className="mt-1 text-muted-foreground">
            This proposal is read-only until the approver decides. Submitted the wrong version, or need to fix
            something first? You can withdraw it back to Draft as long as no decision has been made yet.
          </p>
          <div className="mt-3">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="secondary" disabled={withdrawing}>
                  {withdrawing ? "Withdrawing..." : "Withdraw Submission"}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Withdraw this submission?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This returns the proposal to Draft so you can make changes and resubmit. Nothing in its version
                    history is lost.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleWithdraw}>Withdraw</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      ) : null}

      {canSubmitForApproval ? (
        <div>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button disabled={submitting || isDirty} title={isDirty ? "Save or discard your unsaved changes first." : undefined}>
                <Send className="size-4" /> {submitting ? "Submitting..." : "Submit for Approval"}
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
            client={draft.client}
            clientEmail={clientEmail}
            onSave={(client) => updateDraft({ ...draft, client })}
            onSaveEmail={saveClientEmail}
          />
        ) : null}
      </div>

      <InlineSectionCard
        title="Introduction"
        value={draft.content.introduction}
        displayContent={draft.content.introduction}
        editable={editable}
        onSave={(value) => updateDraft({ ...draft, content: { ...draft.content, introduction: value } })}
        extraActions={
          <RegenerateSectionDialog
            proposalId={proposalId}
            versionId={versionId}
            targetSection="introduction"
            sectionLabel="Introduction"
            materialCount={materialCount}
            disabled={isDirty}
            disabledReason={regenerateDisabledReason}
          />
        }
      />

      <InlineSectionCard
        title="Project Scope"
        value={draft.content.projectScope}
        displayContent={draft.content.projectScope}
        editable={editable}
        onSave={(value) => updateDraft({ ...draft, content: { ...draft.content, projectScope: value } })}
        extraActions={
          <RegenerateSectionDialog
            proposalId={proposalId}
            versionId={versionId}
            targetSection="projectScope"
            sectionLabel="Project Scope"
            materialCount={materialCount}
            disabled={isDirty}
            disabledReason={regenerateDisabledReason}
          />
        }
      />

      <InlineSectionCard
        title="Recommended Approach"
        value={draft.content.recommendedApproach}
        displayContent={draft.content.recommendedApproach}
        editable={editable}
        onSave={(value) => updateDraft({ ...draft, content: { ...draft.content, recommendedApproach: value } })}
        extraActions={
          <RegenerateSectionDialog
            proposalId={proposalId}
            versionId={versionId}
            targetSection="recommendedApproach"
            sectionLabel="Recommended Approach"
            materialCount={materialCount}
            disabled={isDirty}
            disabledReason={regenerateDisabledReason}
          />
        }
      />

      <InlineSectionCard
        title="Deliverables"
        value={draft.content.deliverables.join("\n")}
        displayContent={
          <ul className="list-disc pl-5">
            {draft.content.deliverables.map((item, i) => (
              <li key={i}>{item}</li>
            ))}
          </ul>
        }
        description="One deliverable per line."
        editable={editable}
        onSave={(value) =>
          updateDraft({
            ...draft,
            content: {
              ...draft.content,
              deliverables: value
                .split("\n")
                .map((line) => line.trim())
                .filter(Boolean),
            },
          })
        }
        extraActions={
          <RegenerateSectionDialog
            proposalId={proposalId}
            versionId={versionId}
            targetSection="deliverables"
            sectionLabel="Deliverables"
            materialCount={materialCount}
            disabled={isDirty}
            disabledReason={regenerateDisabledReason}
          />
        }
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <ProposalSectionCard
          title="Timeline"
          content={draft.content.timeline}
          actions={
            editable ? (
              <ProposalEditorDialog
                trigger={editButton("Timeline")}
                title="Edit Timeline"
                initialValue={draft.content.timeline}
                renderInput={(value, onChange) => <TimelineInput value={value} onChange={onChange} />}
                onSave={(value) => updateDraft({ ...draft, content: { ...draft.content, timeline: value } })}
              />
            ) : null
          }
        />
        <ProposalSectionCard
          title="Pricing"
          content={draft.content.pricing}
          actions={
            editable ? (
              <ProposalEditorDialog
                trigger={editButton("Pricing")}
                title="Edit Pricing"
                initialValue={draft.content.pricing}
                renderInput={(value, onChange) => <PricingInput value={value} onChange={onChange} />}
                onSave={(value) => updateDraft({ ...draft, content: { ...draft.content, pricing: value } })}
              />
            ) : null
          }
        />
      </div>

      <InlineSectionCard
        title="Next Steps"
        value={draft.content.nextSteps}
        displayContent={draft.content.nextSteps}
        editable={editable}
        onSave={(value) => updateDraft({ ...draft, content: { ...draft.content, nextSteps: value } })}
      />

      <div>
        <h2 className="mb-3 text-lg font-medium">Version History</h2>
        <VersionHistory versions={versions} editable={editable} onRevert={handleRevert} />
      </div>

      {isDirty ? (
        <div className="fixed inset-x-0 bottom-0 z-20 border-t bg-background/95 p-4 shadow-lg backdrop-blur supports-[backdrop-filter]:bg-background/80">
          <div className="mx-auto flex max-w-4xl flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
            <p className="text-sm">
              <span className="font-medium">
                {dirtySections.length} unsaved change{dirtySections.length === 1 ? "" : "s"}
              </span>
              <span className="text-muted-foreground">
                {" "}
                ({dirtySections.map((s) => SECTION_DISPLAY_LABELS[s]).join(", ")})
              </span>
            </p>
            <div className="flex gap-2">
              <Button variant="secondary" size="sm" onClick={handleDiscardDraft} disabled={saving}>
                Discard
              </Button>
              <Button size="sm" onClick={handleSaveVersion} disabled={saving}>
                {saving ? "Saving..." : "Save Version"}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
