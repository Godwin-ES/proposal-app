import { requireApprover } from "@/lib/auth/guards";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getApprovalQueue } from "@/lib/approvals/service";
import { getVersion } from "@/lib/repositories/versions";
import { PageHeader } from "@/components/shared/page-header";
import { ApprovalQueue, type ApprovalQueueRow } from "@/components/approvals/approval-queue";

export default async function ApprovalsPage() {
  await requireApprover();
  const supabase = await createSupabaseServerClient();
  const proposals = await getApprovalQueue(supabase);

  const rows: ApprovalQueueRow[] = await Promise.all(
    proposals.map(async (p) => {
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

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Approvals" description="Proposals awaiting your review." />
      <ApprovalQueue rows={rows} />
    </div>
  );
}
