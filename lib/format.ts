/**
 * Formats a timestamp as day/month/year, 12-hour clock with AM/PM, no
 * seconds — e.g. "8/9/2026, 8:23 AM". Built manually rather than relying on
 * a locale string so the day/month order and AM/PM are guaranteed
 * regardless of the deployment environment's default locale.
 */
export function formatDateTime(value: string | Date): string {
  const date = typeof value === "string" ? new Date(value) : value;

  const day = date.getDate();
  const month = date.getMonth() + 1;
  const year = date.getFullYear();

  let hours = date.getHours();
  const minutes = date.getMinutes().toString().padStart(2, "0");
  const meridiem = hours >= 12 ? "PM" : "AM";
  hours = hours % 12;
  if (hours === 0) hours = 12;

  return `${day}/${month}/${year}, ${hours}:${minutes} ${meridiem}`;
}

/** Date only, no time — day/month/year, e.g. "8/9/2026". */
export function formatDate(value: string | Date): string {
  const date = typeof value === "string" ? new Date(value) : value;
  return `${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()}`;
}
