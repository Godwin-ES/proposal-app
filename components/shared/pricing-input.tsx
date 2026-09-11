"use client";

import { NumberStepper } from "@/components/shared/number-stepper";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  CURRENCY_CODES,
  PRICING_NO_COST,
  formatPricing,
  parsePricing,
  type CurrencyCode,
} from "@/lib/domain/quantity-fields";

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
  const isNoCost = value.trim() === PRICING_NO_COST;
  const { amount, currency } = parsePricing(isNoCost ? "" : value);

  function update(nextAmount: number, nextCurrency: CurrencyCode) {
    onChange(formatPricing(nextAmount, nextCurrency));
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <Select
          value={currency}
          onValueChange={(next) => update(amount, next as CurrencyCode)}
          disabled={disabled || isNoCost}
        >
          <SelectTrigger className="w-24">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {CURRENCY_CODES.map((c) => (
              <SelectItem key={c} value={c}>
                {c}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <NumberStepper
          value={amount}
          min={0}
          step={100}
          disabled={disabled || isNoCost}
          onChange={(next) => update(next, currency)}
          className="w-32"
        />
      </div>
      <Label className="text-sm font-normal text-muted-foreground">
        <Checkbox
          checked={isNoCost}
          disabled={disabled}
          onCheckedChange={(checked) => onChange(checked ? PRICING_NO_COST : formatPricing(amount, currency))}
        />
        No-cost engagement
      </Label>
    </div>
  );
}
