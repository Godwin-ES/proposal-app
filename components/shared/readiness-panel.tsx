import { AlertTriangle, CheckCircle2 } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export function ReadinessPanel({
  title,
  blockers,
  warnings = [],
}: {
  title: string;
  blockers: string[];
  warnings?: string[];
}) {
  if (blockers.length === 0 && warnings.length === 0) {
    return (
      <Alert className="border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-200">
        <CheckCircle2 className="size-4" />
        <AlertTitle>{title}: ready</AlertTitle>
      </Alert>
    );
  }

  return (
    <Alert variant={blockers.length > 0 ? "destructive" : "default"}>
      <AlertTriangle className="size-4" />
      <AlertTitle>{title}: {blockers.length > 0 ? "not ready" : "ready with warnings"}</AlertTitle>
      <AlertDescription>
        {blockers.length > 0 ? (
          <div>
            <p className="font-medium">Missing before this can proceed:</p>
            <ul className="mt-1 list-disc pl-5">
              {blockers.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        ) : null}
        {warnings.length > 0 ? (
          <div className={blockers.length > 0 ? "mt-2" : undefined}>
            <p className="font-medium">Worth reviewing:</p>
            <ul className="mt-1 list-disc pl-5">
              {warnings.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        ) : null}
      </AlertDescription>
    </Alert>
  );
}
