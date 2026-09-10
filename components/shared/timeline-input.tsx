"use client";

import { NumberStepper } from "@/components/shared/number-stepper";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  TIMELINE_UNITS,
  TIMELINE_SAME_DAY,
  formatTimeline,
  parseTimeline,
  type TimelineUnit,
} from "@/lib/domain/quantity-fields";

const UNIT_LABELS: Record<TimelineUnit, string> = {
  days: "Days",
  weeks: "Weeks",
  months: "Months",
};

/** Fully controlled from `value` — parsed fresh every render, no internal
 * state — so it stays correct if `value` changes from outside (e.g. a
 * dialog reopening with a different initial value) without needing a
 * remount. */
export function TimelineInput({
  value,
  onChange,
  disabled,
}: {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}) {
  const isSameDay = value.trim() === TIMELINE_SAME_DAY;
  const { amount, unit } = parseTimeline(isSameDay ? "" : value);

  function update(nextAmount: number, nextUnit: TimelineUnit) {
    onChange(formatTimeline(nextAmount, nextUnit));
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <NumberStepper
          value={amount}
          min={1}
          disabled={disabled || isSameDay}
          onChange={(next) => update(next, unit)}
          className="w-28"
        />
        <Select
          value={unit}
          onValueChange={(next) => update(amount, next as TimelineUnit)}
          disabled={disabled || isSameDay}
        >
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {TIMELINE_UNITS.map((u) => (
              <SelectItem key={u} value={u}>
                {UNIT_LABELS[u]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <Label className="text-sm font-normal text-muted-foreground">
        <Checkbox
          checked={isSameDay}
          disabled={disabled}
          onCheckedChange={(checked) => onChange(checked ? TIMELINE_SAME_DAY : formatTimeline(amount, unit))}
        />
        Same-day engagement
      </Label>
    </div>
  );
}
