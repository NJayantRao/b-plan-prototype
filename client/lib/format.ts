const dateTime = new Intl.DateTimeFormat("en-IN", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});
const dateOnly = new Intl.DateTimeFormat("en-IN", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});

export const formatDateTime = (value: string | null | undefined): string =>
  value ? dateTime.format(new Date(value)) : "—";

export const formatDate = (value: string | null | undefined): string =>
  value ? dateOnly.format(new Date(value)) : "—";

export const initials = (first: string, last: string): string =>
  `${first.charAt(0)}${last.charAt(0)}`.toUpperCase();

export const fullName = (first: string, last: string): string =>
  `${first} ${last}`.trim();
