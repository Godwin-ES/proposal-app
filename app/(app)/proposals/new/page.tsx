import { createProposalAction } from "@/actions/proposals";
import { PageHeader } from "@/components/shared/page-header";
import { SubmitButton } from "@/components/shared/submit-button";
import { Card, CardContent } from "@/components/ui/card";

export default function NewProposalPage() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="New Proposal" description="Start a new proposal draft from a discovery call." />
      <Card className="max-w-lg">
        <CardContent className="flex flex-col gap-4 pt-6">
          <p className="text-sm text-muted-foreground">
            We&apos;ll create an empty draft you can fill in with client details, discovery notes, and commercial
            terms before generating the first version.
          </p>
          <form action={createProposalAction}>
            <SubmitButton pendingLabel="Creating...">Start New Proposal</SubmitButton>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
