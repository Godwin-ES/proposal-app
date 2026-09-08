import type { ReactNode } from "react";
import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function ProposalSectionCard({
  title,
  content,
  actions,
}: {
  title: string;
  content: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
        {actions ? <CardAction>{actions}</CardAction> : null}
      </CardHeader>
      <CardContent className="whitespace-pre-wrap text-sm leading-relaxed text-foreground/90">{content}</CardContent>
    </Card>
  );
}
