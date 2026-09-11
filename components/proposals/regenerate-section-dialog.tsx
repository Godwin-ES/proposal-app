"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Loader2, Sparkles } from "lucide-react";
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
import type { ClarificationFlag, ProposalSectionKey, ProposalSnapshot } from "@/lib/domain/types";
import { CLAUDE_MODELS, CLAUDE_MODEL_LABELS, DEFAULT_CLAUDE_MODEL, type ClaudeModel } from "@/lib/domain/types";

export function RegenerateSectionDialog({
  proposalId,
  targetSection,
  sectionLabel,
  materialCount,
  currentSnapshot,
  onRegenerated,
  disabled = false,
  onRegenerationStart,
  onRegenerationEnd,
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
  /** Disables opening this dialog — used while a *different* section is
   * already regenerating, since a second concurrent regeneration would race
   * with the first over the same shared draft. */
  disabled?: boolean;
  /** Fired the moment this section's regeneration starts/ends, so the
   * caller can lock everything else that writes to the shared draft
   * (other sections' Regenerate/Edit, Timeline/Pricing, Client Details)
   * until this one is done. */
  onRegenerationStart?: () => void;
  onRegenerationEnd?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [instruction, setInstruction] = useState("");
  const [model, setModel] = useState<ClaudeModel>(DEFAULT_CLAUDE_MODEL);
  const [pending, setPending] = useState(false);

  async function handleRegenerate() {
    setPending(true);
    onRegenerationStart?.();
    const result = await regenerateSectionPreviewAction(proposalId, targetSection, instruction, model, currentSnapshot);
    setPending(false);
    onRegenerationEnd?.();
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
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (pending) return;
        setOpen(next);
      }}
    >
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" aria-label={`Regenerate ${sectionLabel}`} disabled={disabled}>
          <Sparkles className="size-4" />
        </Button>
      </DialogTrigger>
      <DialogContent closeDisabled={pending}>
        <DialogHeader>
          <DialogTitle>Regenerate: {sectionLabel}</DialogTitle>
          <DialogDescription>
            Only this section will change. Nothing is saved yet — the result lands in your draft alongside any other
            unsaved edits, for you to review and Save Version together.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium" htmlFor="regen-model">
              Claude Model
            </label>
            <Select value={model} onValueChange={(v) => setModel(v as ClaudeModel)} disabled={pending}>
              <SelectTrigger id="regen-model" className="w-48">
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
              disabled={pending}
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
            {pending ? (
              <>
                <Loader2 className="size-4 animate-spin" /> Regenerating...
              </>
            ) : (
              "Regenerate"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
