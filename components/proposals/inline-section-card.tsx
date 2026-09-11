"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Pencil } from "lucide-react";

/**
 * A generated-content section that edits in place, instead of opening a
 * modal: clicking the pencil turns the displayed text directly into an
 * auto-growing textarea in the same spot, with Save/Cancel at the bottom of
 * the card — editing the document itself rather than filling out a
 * separate form.
 */
export function InlineSectionCard({
  title,
  value,
  displayContent,
  editable,
  onSave,
  extraActions,
  description,
  locked = false,
}: {
  title: string;
  /** The raw editable string (for Deliverables, this is the list joined by newlines). */
  value: string;
  /** How to render `value` when not editing — plain text, or e.g. a bullet list for Deliverables. */
  displayContent: ReactNode;
  editable: boolean;
  onSave: (value: string) => Promise<boolean>;
  /** Extra actions (e.g. the Regenerate button) shown next to the pencil, hidden while editing. */
  extraActions?: ReactNode;
  /** Shown above the textarea while editing, e.g. "One deliverable per line." */
  description?: string;
  /** Hides the inline "Edit" pencil (but keeps `extraActions` mounted and
   * visible) while some other operation elsewhere on the page has claimed
   * the shared draft — e.g. another section is mid-regeneration. Keeping
   * `extraActions` mounted matters: it may itself be an in-progress dialog
   * (like Regenerate) whose own state would be lost if it unmounted. */
  locked?: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const [saving, setSaving] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!editing || !textareaRef.current) return;
    const el = textareaRef.current;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [editing, draft]);

  function startEditing() {
    setDraft(value);
    setEditing(true);
  }

  function cancel() {
    setEditing(false);
  }

  async function save() {
    setSaving(true);
    const ok = await onSave(draft);
    setSaving(false);
    if (ok) setEditing(false);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
        {editable && !editing ? (
          <CardAction>
            <div className="flex items-center gap-1">
              {!locked ? (
                <Button variant="ghost" size="icon" aria-label={`Edit ${title}`} onClick={startEditing}>
                  <Pencil className="size-4" />
                </Button>
              ) : null}
              {extraActions}
            </div>
          </CardAction>
        ) : null}
      </CardHeader>
      <CardContent className="text-sm leading-relaxed text-foreground/90">
        {editing ? (
          <div className="flex flex-col gap-3">
            {description ? <p className="text-xs text-muted-foreground">{description}</p> : null}
            <Textarea
              ref={textareaRef}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              autoFocus
              disabled={saving}
              className="min-h-0 resize-none overflow-hidden text-sm leading-relaxed text-foreground/90 md:text-sm"
            />
            <div className="flex justify-end gap-2">
              <Button variant="secondary" size="sm" onClick={cancel} disabled={saving}>
                Cancel
              </Button>
              <Button size="sm" onClick={save} disabled={saving || draft.trim() === value.trim()}>
                {saving ? "Saving..." : "Save"}
              </Button>
            </div>
          </div>
        ) : (
          <div className="whitespace-pre-wrap">{displayContent}</div>
        )}
      </CardContent>
    </Card>
  );
}
