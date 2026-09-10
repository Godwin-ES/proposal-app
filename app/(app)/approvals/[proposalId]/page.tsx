import { notFound } from "next/navigation";
import { requireApprover } from "@/lib/auth/guards";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getApprovalReview } from "@/lib/approvals/service";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { ApprovalDecisionPanel } from "@/components/approvals/approval-decision-panel";
import { Badge } from "@/components/ui/badge";
import { LocalDateTime } from "@/components/shared/local-datetime";
import { buildProposalText } from "@/lib/templates/proposal";
import { SECTION_DISPLAY_LABELS } from "@/lib/domain/section-labels";
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

  const { proposal, version, decisions, changesSinceLastReview } = review;
  const { snapshot } = version;
  const isPending = proposal.status === "pending_approval";
  const latestDecision = decisions[0] ?? null;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={snapshot.client.clientName}
        description={snapshot.client.companyName}
        actions={<Badge variant="secondary">Reviewing v{version.version_number} (exact submitted version)</Badge>}
      />

      <p className="text-sm text-muted-foreground">
        Submitted by {proposal.salesperson_name} on{" "}
        {proposal.approval_submitted_at ? <LocalDateTime value={proposal.approval_submitted_at} /> : "—"}. This
        review is read-only.
      </p>

      {!isPending && latestDecision ? (
        <div className="rounded-md border bg-muted/40 p-4 text-sm">
          <p className="font-medium">
            {latestDecision.decision === "approved" ? "Approved" : "Changes requested"} on{" "}
            <LocalDateTime value={latestDecision.created_at} />
          </p>
          {latestDecision.comments ? (
            <p className="mt-1 text-muted-foreground">&ldquo;{latestDecision.comments}&rdquo;</p>
          ) : null}
        </div>
      ) : null}

      {isPending && latestDecision ? (
        <div className="rounded-md border bg-muted/40 p-4 text-sm">
          <p className="font-medium">
            You previously requested changes on <LocalDateTime value={latestDecision.created_at} />
          </p>
          {latestDecision.comments ? (
            <p className="mt-1 text-muted-foreground">&ldquo;{latestDecision.comments}&rdquo;</p>
          ) : null}
          {changesSinceLastReview.length > 0 ? (
            <div className="mt-3">
              <p className="font-medium">
                Changes since then (v{changesSinceLastReview[0].versionNumber - 1} → v{version.version_number}):
              </p>
              <ul className="mt-1 list-disc pl-5 text-muted-foreground">
                {changesSinceLastReview.map((change) => (
                  <li key={change.versionNumber}>
                    v{change.versionNumber} —{" "}
                    {change.changeType === "section_regeneration"
                      ? "regenerated"
                      : change.changeType === "manual_edit"
                        ? "manually edited"
                        : "generated"}
                    {change.changedSection ? `: ${SECTION_DISPLAY_LABELS[change.changedSection]}` : ""}
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <p className="mt-2 text-muted-foreground">
              Resubmitted with no recorded changes since your last review.
            </p>
          )}
        </div>
      ) : null}

      <Card>
        <CardContent className="whitespace-pre-wrap text-sm leading-relaxed text-foreground/90">
          {buildProposalText(snapshot)}
        </CardContent>
      </Card>

      {isPending ? (
        <ApprovalDecisionPanel proposalId={proposal.id} versionId={version.id} versionNumber={version.version_number} />
      ) : null}
    </div>
  );
}
