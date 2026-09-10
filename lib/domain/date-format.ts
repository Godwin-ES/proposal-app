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
