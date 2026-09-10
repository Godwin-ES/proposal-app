import { requireApprover } from "@/lib/auth/guards";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { listApprovalStatusProposals } from "@/lib/approvals/service";
import { getVersion } from "@/lib/repositories/versions";
import { PageHeader } from "@/components/shared/page-header";
import { ApprovalStatusTabs } from "@/components/approvals/approval-status-tabs";
import type { ApprovalQueueRow } from "@/components/approvals/approval-queue";
import type { ProposalStatus } from "@/lib/domain/types";
import type { ProposalRow } from "@/lib/repositories/proposals";

const STATUSES: ProposalStatus[] = ["pending_approval", "changes_requested", "approved", "delivered"];

async function toRows(supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>, proposals: ProposalRow[]) {
  return Promise.all(
    proposals.map(async (p): Promise<ApprovalQueueRow> => {
      const version = p.current_version_id ? await getVersion(supabase, p.current_version_id) : null;
      return {
        proposalId: p.id,
        clientName: p.client_name,
        companyName: p.company_name,
        salespersonName: p.salesperson_name,
        versionNumber: version?.version_number ?? 0,
        submittedAt: p.approval_submitted_at,
      };
    })
  );
}

export default async function ApprovalsPage() {
  await requireApprover();
  const supabase = await createSupabaseServerClient();
  const proposals = await listApprovalStatusProposals(supabase, STATUSES);

  const rowsByStatus = {} as Record<ProposalStatus, ApprovalQueueRow[]>;
  for (const status of STATUSES) {
    rowsByStatus[status] = await toRows(
      supabase,
      proposals.filter((p) => p.status === status)
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Approvals" description="Proposals awaiting your review or already decided." />
      <ApprovalStatusTabs rowsByStatus={rowsByStatus} />
    </div>
  );
}
