"use client";

import { Minus, Plus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export function NumberStepper({
  value,
  onChange,
  min = 0,
  step = 1,
  disabled,
  prefix,
  className,
}: {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  step?: number;
  disabled?: boolean;
  prefix?: string;
  className?: string;
}) {
  function clamp(next: number): number {
    return Number.isFinite(next) ? Math.max(min, next) : min;
  }

  return (
    <div className={cn("flex items-stretch", className)}>
      {prefix ? (
        <span className="flex items-center rounded-l-lg border border-r-0 border-input bg-muted px-2.5 text-sm text-muted-foreground">
          {prefix}
        </span>
      ) : null}
      <Input
        type="number"
        inputMode="numeric"
        min={min}
        // Deliberately not `step={step}` — the native HTML5 step constraint
        // would reject any manually-typed value that doesn't land exactly on
        // the min+n*step grid (e.g. typing "18500" with step=100), even
        // though that's a perfectly valid price. `step` here only governs
        // the +/- buttons below, not what a typed value is allowed to be.
        step="any"
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(clamp(Number(e.target.value)))}
        className={cn(
          "rounded-r-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none",
          prefix && "rounded-l-none"
        )}
      />
      <div className="flex flex-col overflow-hidden rounded-r-lg border border-l-0 border-input">
        <button
          type="button"
          disabled={disabled}
          aria-label="Increase"
          onClick={() => onChange(clamp(value + step))}
          className="flex h-4 flex-1 items-center justify-center px-1.5 text-muted-foreground hover:bg-muted hover:text-foreground disabled:pointer-events-none disabled:opacity-50"
        >
          <Plus className="size-3" />
        </button>
        <button
          type="button"
          disabled={disabled}
          aria-label="Decrease"
          onClick={() => onChange(clamp(value - step))}
          className="flex h-4 flex-1 items-center justify-center border-t border-input px-1.5 text-muted-foreground hover:bg-muted hover:text-foreground disabled:pointer-events-none disabled:opacity-50"
        >
          <Minus className="size-3" />
        </button>
      </div>
    </div>
  );
}
