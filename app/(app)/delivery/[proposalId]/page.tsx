import { notFound } from "next/navigation";
import { requireSalesperson } from "@/lib/auth/guards";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getProposalForOwner } from "@/lib/proposals/service";
import { getVersion } from "@/lib/repositories/versions";
import { listApprovalsForProposal } from "@/lib/repositories/approvals";
import { getDeliveryHistory } from "@/lib/delivery/service";
import { evaluateDeliveryReadiness } from "@/lib/domain/readiness";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { DeliveryReadiness } from "@/components/delivery/delivery-readiness";
import { DeliveryHistory } from "@/components/delivery/delivery-history";
import { DomainError } from "@/lib/domain/errors";

export default async function DeliveryPage({
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

  if (!proposal.current_version_id) notFound();

  const [version, approvals, attempts] = await Promise.all([
    getVersion(supabase, proposal.current_version_id),
    listApprovalsForProposal(supabase, proposal.id),
    getDeliveryHistory(supabase, proposal.id, user),
  ]);

  const isCurrentVersionApproved = approvals.some(
    (a) => a.decision === "approved" && a.version_id === proposal.current_version_id
  );
  const hasUnresolvedUncertainAttempt = attempts.some(
    (a) => a.version_id === proposal.current_version_id && a.status === "uncertain"
  );

  const blockers = evaluateDeliveryReadiness({
    clientEmail: proposal.client_email ?? "",
    status: proposal.status,
    isCurrentVersionApproved,
    pdfStatus: version.pdf_status,
    hasUnresolvedUncertainAttempt,
  });

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={proposal.client_name}
        description={proposal.company_name}
        actions={<StatusBadge status={proposal.status} />}
      />

      <DeliveryReadiness
        proposalId={proposal.id}
        versionId={version.id}
        recipient={proposal.client_email}
        delivered={proposal.status === "delivered"}
        blockers={blockers}
        pdfStatus={version.pdf_status}
        pdfError={version.pdf_error}
      />

      <div>
        <h2 className="mb-3 text-lg font-medium">Delivery History</h2>
        <DeliveryHistory
          attempts={attempts.map((a) => ({
            id: a.id,
            status: a.status,
            recipient: a.recipient,
            createdAt: a.created_at,
            error: a.error,
          }))}
        />
      </div>
    </div>
  );
}
