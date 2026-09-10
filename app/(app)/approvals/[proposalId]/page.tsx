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

  const { proposal, version, decisions, changesSinceLastReview, reviewContext } = review;
  const { snapshot } = version;
  const isPending = proposal.status === "pending_approval";
  const latestDecision = decisions[0] ?? null;
  const groundedSections = reviewContext.sections.filter((s) => s.grounded);
  const previousFeedback = decisions.filter((d) => d.comments);

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

      <dl className="grid gap-x-6 gap-y-1 text-sm sm:grid-cols-3">
        <div>
          <dt className="text-muted-foreground">Date of call</dt>
          <dd>{snapshot.client.dateOfCall || "—"}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Client email</dt>
          <dd>{proposal.client_email || "—"}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Salesperson</dt>
          <dd>{snapshot.client.salespersonName}</dd>
        </div>
      </dl>

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
                    {change.changedSections.length > 0
                      ? `: ${change.changedSections.map((s) => SECTION_DISPLAY_LABELS[s]).join(", ")}`
                      : ""}
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
        <CardContent className="grid gap-4 text-sm sm:grid-cols-2">
          <div>
            <p className="font-medium">Sources used</p>
            {reviewContext.sourcesUsed.length > 0 ? (
              <ul className="mt-1 list-disc pl-5 text-muted-foreground">
                {reviewContext.sourcesUsed.map((filename) => (
                  <li key={filename}>{filename}</li>
                ))}
              </ul>
            ) : (
              <p className="mt-1 text-muted-foreground">No supporting material was used.</p>
            )}
          </div>
          <div>
            <p className="font-medium">AI-grounded sections</p>
            {groundedSections.length > 0 ? (
              <ul className="mt-1 list-disc pl-5 text-muted-foreground">
                {groundedSections.map((s) => (
                  <li key={s.section}>
                    {SECTION_DISPLAY_LABELS[s.section]} — informed by {s.filenames.join(", ")}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-1 text-muted-foreground">No section was grounded in supporting material.</p>
            )}
          </div>
          <div>
            <p className="font-medium">Open clarification items</p>
            {version.clarification_flags.length > 0 ? (
              <ul className="mt-1 list-disc pl-5 text-muted-foreground">
                {version.clarification_flags.map((flag) => (
                  <li key={flag.id}>
                    {flag.section ? `${SECTION_DISPLAY_LABELS[flag.section]}: ` : ""}
                    {flag.message}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-1 text-muted-foreground">None.</p>
            )}
          </div>
          <div>
            <p className="font-medium">Your previous feedback on this proposal</p>
            {previousFeedback.length > 0 ? (
              <ul className="mt-1 list-disc pl-5 text-muted-foreground">
                {previousFeedback.map((d) => (
                  <li key={d.id}>
                    <LocalDateTime value={d.created_at} />: &ldquo;{d.comments}&rdquo;
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-1 text-muted-foreground">None.</p>
            )}
          </div>
        </CardContent>
      </Card>

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
