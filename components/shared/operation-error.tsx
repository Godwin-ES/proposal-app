import { OctagonAlert } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import type { ActionError } from "@/lib/domain/types";

const STAGE_LABELS: Record<string, string> = {
  "sign-in": "Sign in",
  "readiness-check": "Readiness check",
  "version-write": "Saving version",
  "status-check": "Status check",
  authorization: "Authorization",
  lookup: "Lookup",
};

export function OperationError({ error }: { error: ActionError }) {
  const stageLabel = STAGE_LABELS[error.stage] ?? error.stage;

  return (
    <Alert variant="destructive">
      <OctagonAlert className="size-4" />
      <AlertTitle>{stageLabel} failed</AlertTitle>
      <AlertDescription>
        <p>{error.message}</p>
        <p className="mt-1 text-xs opacity-80">
          {error.retrySafe ? "Retry is safe." : "Review the current state before retrying."}
        </p>
      </AlertDescription>
    </Alert>
  );
}
