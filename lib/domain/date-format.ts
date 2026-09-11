const MONTH_ABBREVIATIONS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

/**
 * Formats a stored ISO date ("2026-02-03") as "03-Feb-2026" for any
 * client-facing or reviewer-facing display — the proposal text preview, the
 * final PDF, the approver's metadata. The stored/edited value stays plain
 * ISO throughout (schema validation, the date input's own value, sorting) —
 * only display goes through this.
 */
export function formatDateOfCall(isoDate: string): string {
  const match = isoDate.trim().match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return isoDate;
  const [, year, month, day] = match;
  const monthName = MONTH_ABBREVIATIONS[Number(month) - 1];
  if (!monthName) return isoDate;
  return `${day}-${monthName}-${year}`;
}

/**
 * Today's date, in the caller's local timezone, as plain ISO ("2026-02-03")
 * — for a date input's `max` attribute (a discovery call can't have
 * happened in the future). `Date.toISOString()` alone would give UTC's
 * date, which is wrong right around midnight in any timezone ahead of UTC;
 * this shifts by the local offset first so it matches what the browser's
 * own clock says "today" is.
 */
export function todayIsoDate(): string {
  const now = new Date();
  const localMidnightUtc = new Date(now.getTime() - now.getTimezoneOffset() * 60_000);
  return localMidnightUtc.toISOString().slice(0, 10);
}
