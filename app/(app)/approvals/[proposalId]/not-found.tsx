import Link from "next/link";
import { FileX } from "lucide-react";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";

export default function ApprovalReviewNotFound() {
  return (
    <EmptyState
      icon={FileX}
      title="This proposal is no longer available for review"
      description="It may have been withdrawn or updated by the salesperson since you opened it, or you may not have access to it."
      action={
        <Button asChild variant="secondary">
          <Link href="/approvals">Back to your queue</Link>
        </Button>
      }
    />
  );
}
