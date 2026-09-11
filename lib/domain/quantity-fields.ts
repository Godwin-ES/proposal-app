/**
 * Timeline and Pricing are stored as plain strings ("6 weeks", "USD 14,500")
 * so the rest of the pipeline (compose.ts, the PDF renderer, templates)
 * never needs to change — these helpers just constrain how that string gets
 * constructed and parsed back for a controlled input, instead of letting
 * either field be freeform text.
 */

export const TIMELINE_UNITS = ["days", "weeks", "months"] as const;
export type TimelineUnit = (typeof TIMELINE_UNITS)[number];

/** The only way to represent an immediate/free engagement — never a plain
 * "0 days"/"0 [currency] 0", which reads as an omission, not a deliberate
 * choice. Produced only by the Same day / No cost checkbox, never typed. */
export const TIMELINE_SAME_DAY = "Same day";
export const PRICING_NO_COST = "No cost";

const TIMELINE_UNIT_ALIASES: Record<string, TimelineUnit> = {
  day: "days",
  days: "days",
  week: "weeks",
  weeks: "weeks",
  month: "months",
  months: "months",
};

export function formatTimeline(amount: number, unit: TimelineUnit): string {
  const singular = unit.slice(0, -1);
  return `${amount} ${amount === 1 ? singular : unit}`;
}

export function parseTimeline(value: string): { amount: number; unit: TimelineUnit } {
  const match = value.trim().match(/^(\d+(?:\.\d+)?)\s*([a-zA-Z]+)$/);
  if (match) {
    const amount = Number(match[1]);
    const unit = TIMELINE_UNIT_ALIASES[match[2].toLowerCase()];
    if (unit && Number.isFinite(amount)) return { amount, unit };
  }
  return { amount: 0, unit: "weeks" };
}

/** A genuinely zero amount ("0 weeks", "0 days" in any unit) is this field's
 * "not yet specified" state, distinct from a deliberate `TIMELINE_SAME_DAY`/
 * `PRICING_NO_COST` choice (those are real business facts, not placeholders)
 * — used wherever the app needs to tell "nobody has set this yet" apart from
 * "the salesperson entered a value." */
export function isTimelineUnset(value: string): boolean {
  return value.trim() !== TIMELINE_SAME_DAY && parseTimeline(value).amount === 0;
}

export const CURRENCY_CODES = ["USD", "EUR", "GBP", "CAD", "AUD"] as const;
export type CurrencyCode = (typeof CURRENCY_CODES)[number];

export function formatPricing(amount: number, currency: CurrencyCode): string {
  return `${currency} ${amount.toLocaleString("en-US")}`;
}

export function parsePricing(value: string): { amount: number; currency: CurrencyCode } {
  const trimmed = value.trim();

  const codeMatch = trimmed.match(/^([A-Za-z]{3})\s+([\d,]*\.?\d*)$/);
  if (codeMatch) {
    const code = codeMatch[1].toUpperCase();
    const amount = Number(codeMatch[2].replace(/,/g, ""));
    if ((CURRENCY_CODES as readonly string[]).includes(code) && Number.isFinite(amount)) {
      return { amount, currency: code as CurrencyCode };
    }
  }

  // Legacy "$14,500"-style values from before currency selection existed —
  // those proposals are otherwise untouched (frozen snapshots), this just
  // lets the field still parse sensibly if it's ever reopened for editing.
  const numeric = Number(trimmed.replace(/[^0-9.]/g, ""));
  return { amount: Number.isFinite(numeric) ? numeric : 0, currency: "USD" };
}

/** Same "not yet specified" concept as `isTimelineUnset`, for Pricing. */
export function isPricingUnset(value: string): boolean {
  return value.trim() !== PRICING_NO_COST && parsePricing(value).amount === 0;
}
