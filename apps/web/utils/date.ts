/**
 * Date formatting utilities for LMS (Africa/Nairobi UTC+3 aware).
 */

const NAIROBI_TIMEZONE = "Africa/Nairobi";

export function formatDate(
  isoDate: string | Date | null | undefined,
  includeTime = false,
): string {
  if (!isoDate) return "—";

  const date = typeof isoDate === "string" ? new Date(isoDate) : isoDate;
  if (Number.isNaN(date.getTime())) return "—";

  const options: Intl.DateTimeFormatOptions = {
    timeZone: NAIROBI_TIMEZONE,
    day: "2-digit",
    month: "short",
    year: "numeric",
    ...(includeTime
      ? {
          hour: "2-digit",
          minute: "2-digit",
        }
      : {}),
  };

  return date.toLocaleString("en-KE", options);
}

export function formatTime(isoDate: string | Date | null | undefined): string {
  if (!isoDate) return "—";

  const date = typeof isoDate === "string" ? new Date(isoDate) : isoDate;
  if (Number.isNaN(date.getTime())) return "—";

  return date.toLocaleTimeString("en-KE", {
    timeZone: NAIROBI_TIMEZONE,
    hour: "2-digit",
    minute: "2-digit",
  });
}
