import { notFound } from "next/navigation";
import { requireApprover } from "@/lib/auth/guards";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getApprovalReview } from "@/lib/approvals/service";
import { PageHeader } from "@/components/shared/page-header";
import { ProposalSectionCard } from "@/components/proposals/proposal-section-card";
import { ApprovalDecisionPanel } from "@/components/approvals/approval-decision-panel";
import { Badge } from "@/components/ui/badge";
import { formatDateTime } from "@/lib/format";
import { DomainError } from "@/lib/domain/errors";

export default async function ApprovalReviewPage({
  params,
}: {
  params: Promise<{ proposalId: string }>;
}) {
  const { proposalId } = await params;
  await requireApprover();
  const supabase = await createSupabaseServerClient();

  let review;
  try {
    review = await getApprovalReview(supabase, proposalId);
  } catch (error) {
    if (error instanceof DomainError && error.code === "NOT_FOUND") notFound();
    throw error;
  }

  const { proposal, version } = review;
  const { snapshot } = version;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={snapshot.client.clientName}
        description={snapshot.client.companyName}
        actions={<Badge variant="secondary">Reviewing v{version.version_number} (exact submitted version)</Badge>}
      />

      <p className="text-sm text-muted-foreground">
        Submitted by {proposal.salesperson_name} on{" "}
        {proposal.approval_submitted_at ? formatDateTime(proposal.approval_submitted_at) : "—"}. This
        review is read-only.
      </p>

      <ProposalSectionCard title="Introduction" content={snapshot.content.introduction} />
      <ProposalSectionCard title="Project Scope" content={snapshot.content.projectScope} />
      <ProposalSectionCard title="Recommended Approach" content={snapshot.content.recommendedApproach} />
      <ProposalSectionCard
        title="Deliverables"
        content={
          <ul className="list-disc pl-5">
            {snapshot.content.deliverables.map((item, i) => (
              <li key={i}>{item}</li>
            ))}
          </ul>
        }
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <ProposalSectionCard title="Timeline" content={snapshot.content.timeline} />
        <ProposalSectionCard title="Pricing" content={snapshot.content.pricing} />
      </div>
      <ProposalSectionCard title="Next Steps" content={snapshot.content.nextSteps} />

      <ApprovalDecisionPanel proposalId={proposal.id} versionId={version.id} versionNumber={version.version_number} />
    </div>
  );
}
