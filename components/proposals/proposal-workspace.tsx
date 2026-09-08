"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { saveManualRevisionAction } from "@/actions/proposals";
import { ProposalHeader } from "@/components/proposals/proposal-header";
import { ReadinessPanel } from "@/components/shared/readiness-panel";
import { ProposalSectionCard } from "@/components/proposals/proposal-section-card";
import { ProposalEditorDialog } from "@/components/proposals/proposal-editor-dialog";
import { ProposalDetailsEditor } from "@/components/proposals/proposal-details-editor";
import { RegenerateSectionDialog } from "@/components/proposals/regenerate-section-dialog";
import { VersionHistory, type VersionHistoryEntry } from "@/components/proposals/version-history";
import { Button } from "@/components/ui/button";
import { Pencil } from "lucide-react";
import type { ProposalSnapshot, ProposalStatus } from "@/lib/domain/types";

export function ProposalWorkspace({
  proposalId,
  status,
  ownerName,
  updatedAt,
  versionId,
  versionNumber,
  snapshot,
  approvalBlockers,
  editable,
  versions,
  materialCount,
}: {
  proposalId: string;
  status: ProposalStatus;
  ownerName: string;
  updatedAt: string;
  versionId: string;
  versionNumber: number;
  snapshot: ProposalSnapshot;
  approvalBlockers: string[];
  editable: boolean;
  versions: VersionHistoryEntry[];
  materialCount: number;
}) {
  const router = useRouter();

  async function saveSnapshot(next: ProposalSnapshot): Promise<boolean> {
    const result = await saveManualRevisionAction(proposalId, versionId, next);
    if (result.ok) {
      toast.success("Proposal updated.");
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

      <ReadinessPanel title="Approval readiness" blockers={editable ? approvalBlockers : []} />

      <div className="flex items-center justify-between">
        <h2 className="text-lg font-medium">Client Details</h2>
        {editable ? (
          <ProposalDetailsEditor
            client={snapshot.client}
            onSave={(client) => saveSnapshot({ ...snapshot, client })}
          />
        ) : null}
      </div>

      <ProposalSectionCard
        title="Introduction"
        content={snapshot.content.introduction}
        actions={
          editable ? (
            <div className="flex items-center gap-1">
              <ProposalEditorDialog
                trigger={editButton("Introduction")}
                title="Edit Introduction"
                initialValue={snapshot.content.introduction}
                onSave={(value) => saveSnapshot({ ...snapshot, content: { ...snapshot.content, introduction: value } })}
              />
              <RegenerateSectionDialog
                proposalId={proposalId}
                versionId={versionId}
                targetSection="introduction"
                sectionLabel="Introduction"
                materialCount={materialCount}
              />
            </div>
          ) : null
        }
      />

      <ProposalSectionCard
        title="Project Scope"
        content={snapshot.content.projectScope}
        actions={
          editable ? (
            <div className="flex items-center gap-1">
              <ProposalEditorDialog
                trigger={editButton("Project Scope")}
                title="Edit Project Scope"
                initialValue={snapshot.content.projectScope}
                onSave={(value) => saveSnapshot({ ...snapshot, content: { ...snapshot.content, projectScope: value } })}
              />
              <RegenerateSectionDialog
                proposalId={proposalId}
                versionId={versionId}
                targetSection="projectScope"
                sectionLabel="Project Scope"
                materialCount={materialCount}
              />
            </div>
          ) : null
        }
      />

      <ProposalSectionCard
        title="Recommended Approach"
        content={snapshot.content.recommendedApproach}
        actions={
          editable ? (
            <div className="flex items-center gap-1">
              <ProposalEditorDialog
                trigger={editButton("Recommended Approach")}
                title="Edit Recommended Approach"
                initialValue={snapshot.content.recommendedApproach}
                onSave={(value) =>
                  saveSnapshot({ ...snapshot, content: { ...snapshot.content, recommendedApproach: value } })
                }
              />
              <RegenerateSectionDialog
                proposalId={proposalId}
                versionId={versionId}
                targetSection="recommendedApproach"
                sectionLabel="Recommended Approach"
                materialCount={materialCount}
              />
            </div>
          ) : null
        }
      />

      <ProposalSectionCard
        title="Deliverables"
        content={
          <ul className="list-disc pl-5">
            {snapshot.content.deliverables.map((item, i) => (
              <li key={i}>{item}</li>
            ))}
          </ul>
        }
        actions={
          editable ? (
            <div className="flex items-center gap-1">
              <ProposalEditorDialog
                trigger={editButton("Deliverables")}
                title="Edit Deliverables"
                description="One deliverable per line."
                initialValue={snapshot.content.deliverables.join("\n")}
                onSave={(value) =>
                  saveSnapshot({
                    ...snapshot,
                    content: {
                      ...snapshot.content,
                      deliverables: value
                        .split("\n")
                        .map((line) => line.trim())
                        .filter(Boolean),
                    },
                  })
                }
              />
              <RegenerateSectionDialog
                proposalId={proposalId}
                versionId={versionId}
                targetSection="deliverables"
                sectionLabel="Deliverables"
                materialCount={materialCount}
              />
            </div>
          ) : null
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
                multiline={false}
                initialValue={snapshot.content.timeline}
                onSave={(value) => saveSnapshot({ ...snapshot, content: { ...snapshot.content, timeline: value } })}
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
                multiline={false}
                initialValue={snapshot.content.pricing}
                onSave={(value) => saveSnapshot({ ...snapshot, content: { ...snapshot.content, pricing: value } })}
              />
            ) : null
          }
        />
      </div>

      <ProposalSectionCard
        title="Next Steps"
        content={snapshot.content.nextSteps}
        actions={
          editable ? (
            <ProposalEditorDialog
              trigger={editButton("Next Steps")}
              title="Edit Next Steps"
              initialValue={snapshot.content.nextSteps}
              onSave={(value) => saveSnapshot({ ...snapshot, content: { ...snapshot.content, nextSteps: value } })}
            />
          ) : null
        }
      />

      <div>
        <h2 className="mb-3 text-lg font-medium">Version History</h2>
        <VersionHistory versions={versions} />
      </div>
    </div>
  );
}
