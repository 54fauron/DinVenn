export {
  validPoint,
  storedPoint,
  chooseAddressPoint,
  addressSearchUrl,
  directionsUrl,
} from "@dinvenn/core";
export type { Point, AddressHit } from "@dinvenn/core";
export function remainingTime(ends: string | null, now = Date.now()): string {
  if (!ends) return "Ingen fast sluttdato";
  const diff = Date.parse(ends) - now;
  if (!Number.isFinite(diff) || diff <= 0) return "Utløpt";
  const mins = Math.ceil(diff / 60000);
  if (mins < 60) return `${mins} min igjen`;
  if (mins < 1440) return `${Math.floor(mins / 60)} t ${mins % 60} min igjen`;
  return `${Math.ceil(mins / 1440)} dager igjen`;
}
export const eventWhen = (value: string) =>
  new Date(value).toLocaleString("nb-NO", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
export function initials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toLocaleUpperCase("nb-NO");
}
