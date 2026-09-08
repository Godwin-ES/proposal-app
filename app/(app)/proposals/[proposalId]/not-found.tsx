import Link from "next/link";
import { FileX } from "lucide-react";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";

export default function ProposalNotFound() {
  return (
    <EmptyState
      icon={FileX}
      title="Proposal not found"
      description="It may have been removed, or you may not have access to it."
      action={
        <Button asChild variant="secondary">
          <Link href="/dashboard">Back to dashboard</Link>
        </Button>
      }
    />
  );
}
