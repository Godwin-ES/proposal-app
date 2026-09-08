"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Sparkles } from "lucide-react";
import { regenerateSectionAction } from "@/actions/generation";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { GenerationProvider, ProposalSectionKey } from "@/lib/domain/types";

export function RegenerateSectionDialog({
  proposalId,
  versionId,
  targetSection,
  sectionLabel,
  materialCount,
}: {
  proposalId: string;
  versionId: string;
  targetSection: ProposalSectionKey;
  sectionLabel: string;
  materialCount: number;
}) {
  const [open, setOpen] = useState(false);
  const [instruction, setInstruction] = useState("");
  const [provider, setProvider] = useState<GenerationProvider>("anthropic");
  const [pending, setPending] = useState(false);
  const router = useRouter();

  async function handleRegenerate() {
    setPending(true);
    const result = await regenerateSectionAction(proposalId, versionId, targetSection, instruction, provider);
    setPending(false);
    if (result.ok) {
      toast.success(`${sectionLabel} regenerated.`);
      setOpen(false);
      setInstruction("");
      router.refresh();
    } else {
      toast.error(result.error.message);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" aria-label={`Regenerate ${sectionLabel}`}>
          <Sparkles className="size-4" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Regenerate: {sectionLabel}</DialogTitle>
          <DialogDescription>
            Only this section will change. Every other part of the current proposal remains exactly as it is until
            this completes successfully.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium" htmlFor="regen-provider">
              AI Provider
            </label>
            <Select value={provider} onValueChange={(v) => setProvider(v as GenerationProvider)}>
              <SelectTrigger id="regen-provider" className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="anthropic">Claude (official)</SelectItem>
                <SelectItem value="google">Gemini</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium" htmlFor="regen-instruction">
              Revision instruction
            </label>
            <Textarea
              id="regen-instruction"
              rows={4}
              placeholder={`Tell the model how to change ${sectionLabel.toLowerCase()}...`}
              value={instruction}
              onChange={(e) => setInstruction(e.target.value)}
            />
          </div>

          <p className="text-xs text-muted-foreground">
            {materialCount > 0
              ? `${materialCount} supporting file${materialCount === 1 ? "" : "s"} will be included as context.`
              : "No supporting material is attached."}
          </p>
        </div>

        <DialogFooter>
          <Button variant="secondary" onClick={() => setOpen(false)} disabled={pending}>
            Cancel
          </Button>
          <Button onClick={handleRegenerate} disabled={pending || !instruction.trim()}>
            {pending ? "Regenerating..." : "Regenerate"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
