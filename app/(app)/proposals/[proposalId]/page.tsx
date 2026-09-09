import { notFound } from "next/navigation";
import { requireSalesperson } from "@/lib/auth/guards";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getProposalForOwner } from "@/lib/proposals/service";
import { getVersionHistory } from "@/lib/proposals/version-service";
import { rowToIntake } from "@/lib/repositories/proposals";
import { listMaterials } from "@/lib/materials/service";
import { listApprovalsForProposal } from "@/lib/repositories/approvals";
import { evaluateApprovalReadiness, evaluateGenerationReadiness } from "@/lib/domain/readiness";
import { isEditableStatus, isVersionWritableStatus } from "@/lib/domain/state-machine";
import { PageHeader } from "@/components/shared/page-header";
import { ReadinessPanel } from "@/components/shared/readiness-panel";
import { StatusBadge } from "@/components/shared/status-badge";
import { IntakeForm } from "@/components/proposals/intake-form";
import { SupportingMaterialPanel } from "@/components/proposals/supporting-material-panel";
import { GenerateDraftPanel } from "@/components/proposals/generate-draft-panel";
import { ProposalWorkspace } from "@/components/proposals/proposal-workspace";
import { DomainError } from "@/lib/domain/errors";

export default async function ProposalPage({
  params,
}: {
  params: Promise<{ proposalId: string }>;
}) {
  const { proposalId } = await params;
  const user = await requireSalesperson();
  const supabase = await createSupabaseServerClient();

  let proposal;
  try {
    proposal = await getProposalForOwner(supabase, proposalId, user);
  } catch (error) {
    if (error instanceof DomainError && (error.code === "NOT_FOUND" || error.code === "PERMISSION_DENIED")) {
      notFound();
    }
    throw error;
  }

  const intake = rowToIntake(proposal);
  const hasVersion = proposal.current_version_id !== null;
  const materials = await listMaterials(supabase, proposal.id, user);
  const materialsEditable = isEditableStatus(proposal.status);

  if (!hasVersion) {
    const generationBlockers = evaluateGenerationReadiness(intake);
    const failedMaterials = materials.filter((m) => m.extraction_status === "failed");
    const pendingMaterials = materials.filter((m) => m.extraction_status === "pending");
    if (failedMaterials.length > 0) {
      generationBlockers.push(`Remove or retry failed file(s): ${failedMaterials.map((m) => m.filename).join(", ")}`);
    }
    if (pendingMaterials.length > 0) {
      generationBlockers.push("Supporting material is still processing");
    }

    return (
      <div className="flex flex-col gap-6">
        <PageHeader
          title={proposal.client_name || "New proposal"}
          description={proposal.company_name || undefined}
          actions={<StatusBadge status={proposal.status} />}
        />
        <ReadinessPanel title="Generation readiness" blockers={generationBlockers} />
        <IntakeForm proposalId={proposal.id} defaultValues={intake} editable />
        <SupportingMaterialPanel
          proposalId={proposal.id}
          editable={materialsEditable}
          initialMaterials={materials.map((m) => ({
            id: m.id,
            filename: m.filename,
            sizeBytes: m.size_bytes,
            extractionStatus: m.extraction_status,
            warning: m.warning,
          }))}
        />
        <GenerateDraftPanel proposalId={proposal.id} ready={generationBlockers.length === 0} />
      </div>
    );
  }

  const [versions, approvals] = await Promise.all([
    getVersionHistory(supabase, proposal.id, user),
    listApprovalsForProposal(supabase, proposal.id),
  ]);

  const currentVersion = versions.find((v) => v.id === proposal.current_version_id);
  if (!currentVersion) notFound();

  const approvedVersionIds = new Set(approvals.filter((a) => a.decision === "approved").map((a) => a.version_id));
  const approvalBlockers = evaluateApprovalReadiness({
    snapshot: currentVersion.snapshot,
    hasCurrentVersion: true,
  });

  // While status is changes_requested, current_version_id still points at
  // exactly the version the approver decided on (a revision moves the
  // proposal out of changes_requested — see computeEditableStatus in
  // lib/proposals/version-service.ts), so the decision tied to that version
  // is always the one to surface.
  const changeRequest =
    proposal.status === "changes_requested"
      ? (approvals.find((a) => a.version_id === currentVersion.id && a.decision === "changes_requested") ?? null)
      : null;

  return (
    <ProposalWorkspace
      proposalId={proposal.id}
      status={proposal.status}
      ownerName={intake.salespersonName || "—"}
      updatedAt={proposal.updated_at}
      versionId={currentVersion.id}
      versionNumber={currentVersion.version_number}
      snapshot={currentVersion.snapshot}
      approvalBlockers={approvalBlockers}
      clarificationFlags={(currentVersion.clarification_flags as string[] | null) ?? []}
      changeRequest={changeRequest ? { comments: changeRequest.comments, createdAt: changeRequest.created_at } : null}
      editable={isVersionWritableStatus(proposal.status)}
      materialCount={materials.filter((m) => m.extraction_status === "ready").length}
      canSubmitForApproval={isEditableStatus(proposal.status) && approvalBlockers.length === 0 && !changeRequest}
      versions={versions.map((v) => ({
        id: v.id,
        versionNumber: v.version_number,
        createdAt: v.created_at,
        changeType: v.change_type,
        changedSection: v.changed_section,
        snapshot: v.snapshot,
        isCurrent: v.id === proposal.current_version_id,
        isApproved: approvedVersionIds.has(v.id),
      }))}
    />
  );
}
