import Link from "next/link";
import { requireSalesperson } from "@/lib/auth/guards";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { listMyProposals } from "@/lib/proposals/service";
import { PageHeader } from "@/components/shared/page-header";
import { StatusSummary } from "@/components/dashboard/status-summary";
import { RecentProposals } from "@/components/dashboard/recent-proposals";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

export default async function DashboardPage() {
  const user = await requireSalesperson();
  const supabase = await createSupabaseServerClient();
  const proposals = await listMyProposals(supabase, user);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Dashboard"
        description={`Welcome back, ${user.fullName}.`}
        actions={
          <Button asChild>
            <Link href="/proposals/new">
              <Plus className="size-4" /> New Proposal
            </Link>
          </Button>
        }
      />
      <StatusSummary statuses={proposals.map((p) => p.status)} />
      <RecentProposals proposals={proposals} />
    </div>
  );
}
