"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Sparkles } from "lucide-react";
import { generateInitialDraftAction } from "@/actions/generation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { GenerationProvider } from "@/lib/domain/types";

export function GenerateDraftPanel({ proposalId, ready }: { proposalId: string; ready: boolean }) {
  const [provider, setProvider] = useState<GenerationProvider>("anthropic");
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function handleGenerate() {
    startTransition(async () => {
      const result = await generateInitialDraftAction(proposalId, provider);
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
          <label className="text-sm font-medium" htmlFor="ai-provider">
            AI Provider
          </label>
          <Select value={provider} onValueChange={(v) => setProvider(v as GenerationProvider)}>
            <SelectTrigger id="ai-provider" className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="anthropic">Claude Sonnet 5</SelectItem>
              <SelectItem value="google">Gemini</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button onClick={handleGenerate} disabled={!ready || pending}>
          <Sparkles className="size-4" />
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
