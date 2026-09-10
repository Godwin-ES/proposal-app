"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Sparkles } from "lucide-react";
import { regenerateSectionPreviewAction } from "@/actions/generation";
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
import type { ClarificationFlag, GenerationProvider, ProposalSectionKey, ProposalSnapshot } from "@/lib/domain/types";

export function RegenerateSectionDialog({
  proposalId,
  targetSection,
  sectionLabel,
  materialCount,
  currentSnapshot,
  onRegenerated,
}: {
  proposalId: string;
  targetSection: ProposalSectionKey;
  sectionLabel: string;
  materialCount: number;
  /** The caller's current draft (possibly with other unsaved edits already
   * on it) — regeneration is based on this, not the last-saved version, so
   * it never contradicts an edit made earlier in the same unsaved batch. */
  currentSnapshot: ProposalSnapshot;
  /** Drops the result straight into the shared draft buffer — no version is
   * created here; see ProposalWorkspace's Save Version flow. */
  onRegenerated: (result: {
    snapshot: ProposalSnapshot;
    clarificationFlags: ClarificationFlag[];
    generationRunId: string;
  }) => void;
}) {
  const [open, setOpen] = useState(false);
  const [instruction, setInstruction] = useState("");
  const [provider, setProvider] = useState<GenerationProvider>("anthropic");
  const [pending, setPending] = useState(false);

  async function handleRegenerate() {
    setPending(true);
    const result = await regenerateSectionPreviewAction(proposalId, targetSection, instruction, provider, currentSnapshot);
    setPending(false);
    if (result.ok) {
      onRegenerated(result.data);
      toast.success(`${sectionLabel} regenerated — review and Save Version to apply.`);
      setOpen(false);
      setInstruction("");
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
            Only this section will change. Nothing is saved yet — the result lands in your draft alongside any other
            unsaved edits, for you to review and Save Version together.
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
                <SelectItem value="anthropic">Claude Sonnet 5</SelectItem>
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
