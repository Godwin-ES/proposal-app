import { notFound } from "next/navigation";
import { requireSalesperson } from "@/lib/auth/guards";
import { getProposalForOwner } from "@/lib/proposals/service";
import { rowToIntake } from "@/lib/repositories/proposals";
import { evaluateGenerationReadiness } from "@/lib/domain/readiness";
import { PageHeader } from "@/components/shared/page-header";
import { ReadinessPanel } from "@/components/shared/readiness-panel";
import { StatusBadge } from "@/components/shared/status-badge";
import { IntakeForm } from "@/components/proposals/intake-form";
import { DomainError } from "@/lib/domain/errors";

export default async function ProposalPage({
  params,
}: {
  params: Promise<{ proposalId: string }>;
}) {
  const { proposalId } = await params;
  const user = await requireSalesperson();

  let proposal;
  try {
    proposal = await getProposalForOwner(proposalId, user);
  } catch (error) {
    if (error instanceof DomainError && (error.code === "NOT_FOUND" || error.code === "PERMISSION_DENIED")) {
      notFound();
    }
    throw error;
  }

  const intake = rowToIntake(proposal);
  const hasVersion = proposal.current_version_id !== null;
  const generationBlockers = evaluateGenerationReadiness(intake);

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
