"use client";

import { NumberStepper } from "@/components/shared/number-stepper";
import { formatPricing, parsePricing } from "@/lib/domain/quantity-fields";

/** Fully controlled from `value` — parsed fresh every render, same reasoning
 * as TimelineInput. */
export function PricingInput({
  value,
  onChange,
  disabled,
}: {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}) {
  const amount = parsePricing(value);

  return (
    <NumberStepper
      value={amount}
      min={0}
      step={100}
      prefix="$"
      disabled={disabled}
      onChange={(next) => onChange(formatPricing(next))}
      className="w-40"
    />
  );
}
