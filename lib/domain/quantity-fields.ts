/**
 * Timeline and Pricing are stored as plain strings ("6 weeks", "$14,500") so
 * the rest of the pipeline (compose.ts, the PDF renderer, templates) never
 * needs to change — these helpers just constrain how that string gets
 * constructed and parsed back for a controlled numeric input, instead of
 * letting either field be freeform text.
 */

export const TIMELINE_UNITS = ["minutes", "hours", "days", "weeks", "months"] as const;
export type TimelineUnit = (typeof TIMELINE_UNITS)[number];

const TIMELINE_UNIT_ALIASES: Record<string, TimelineUnit> = {
  minute: "minutes",
  minutes: "minutes",
  min: "minutes",
  mins: "minutes",
  hour: "hours",
  hours: "hours",
  hr: "hours",
  hrs: "hours",
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

export function formatPricing(amount: number): string {
  return `$${amount.toLocaleString("en-US")}`;
}

export function parsePricing(value: string): number {
  const numeric = Number(value.replace(/[^0-9.]/g, ""));
  return Number.isFinite(numeric) ? numeric : 0;
}
