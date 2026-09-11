"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, Sparkles } from "lucide-react";
import { generateInitialDraftAction } from "@/actions/generation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CLAUDE_MODELS, CLAUDE_MODEL_LABELS, DEFAULT_CLAUDE_MODEL, type ClaudeModel } from "@/lib/domain/types";

export function GenerateDraftPanel({ proposalId, ready }: { proposalId: string; ready: boolean }) {
  const [model, setModel] = useState<ClaudeModel>(DEFAULT_CLAUDE_MODEL);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function handleGenerate() {
    startTransition(async () => {
      const result = await generateInitialDraftAction(proposalId, model);
      if (result.ok) {
        toast.success("Proposal draft generated.");
        router.refresh();
      } else {
        toast.error(result.error.message);
      }
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Generate Draft</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-end sm:gap-3">
        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium" htmlFor="ai-model">
            Claude Model
          </label>
          <Select value={model} onValueChange={(v) => setModel(v as ClaudeModel)} disabled={pending}>
            <SelectTrigger id="ai-model" className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CLAUDE_MODELS.map((m) => (
                <SelectItem key={m} value={m}>
                  {CLAUDE_MODEL_LABELS[m]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button onClick={handleGenerate} disabled={!ready || pending}>
          {pending ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
          {pending ? "Generating..." : "Generate Draft"}
        </Button>
        {!ready ? (
          <p className="text-sm text-muted-foreground sm:ml-2">
            Resolve the generation blockers above before generating.
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}
