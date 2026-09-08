"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { OctagonAlert } from "lucide-react";

export default function ProposalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex flex-col items-center gap-3 rounded-lg border border-destructive/30 bg-destructive/5 py-16 text-center">
      <OctagonAlert className="size-8 text-destructive" aria-hidden />
      <div>
        <p className="font-medium">Something went wrong loading this proposal.</p>
        <p className="mt-1 text-sm text-muted-foreground">Your proposal data has not been changed.</p>
      </div>
      <Button onClick={reset} variant="secondary">
        Try again
      </Button>
    </div>
  );
}
