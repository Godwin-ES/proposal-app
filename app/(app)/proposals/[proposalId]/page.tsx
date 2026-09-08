import { notFound } from "next/navigation";
import { requireSalesperson } from "@/lib/auth/guards";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getProposalForOwner } from "@/lib/proposals/service";
import { rowToIntake } from "@/lib/repositories/proposals";
import { listMaterials } from "@/lib/materials/service";
import { evaluateGenerationReadiness } from "@/lib/domain/readiness";
import { isEditableStatus } from "@/lib/domain/state-machine";
import { PageHeader } from "@/components/shared/page-header";
import { ReadinessPanel } from "@/components/shared/readiness-panel";
import { StatusBadge } from "@/components/shared/status-badge";
import { IntakeForm } from "@/components/proposals/intake-form";
import { SupportingMaterialPanel } from "@/components/proposals/supporting-material-panel";
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
  const generationBlockers = evaluateGenerationReadiness(intake);
  const materials = await listMaterials(supabase, proposal.id, user);
  const materialsEditable = isEditableStatus(proposal.status);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={proposal.client_name || "New proposal"}
        description={proposal.company_name || undefined}
        actions={<StatusBadge status={proposal.status} />}
      />

      {!hasVersion ? (
        <>
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
        </>
      ) : (
        <p className="text-sm text-muted-foreground">
          This proposal has a generated version. The full Proposal Workspace (sections, version history, approval,
          delivery) is available once those areas of the build are complete.
        </p>
      )}
    </div>
  );
}
