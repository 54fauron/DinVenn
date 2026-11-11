import { t, locale } from "@dinvenn/core";
export {
  validPoint,
  storedPoint,
  chooseAddressPoint,
  addressSearchUrl,
  directionsUrl,
} from "@dinvenn/core";
export type { Point, AddressHit } from "@dinvenn/core";
export function remainingTime(ends: string | null, now = Date.now()): string {
  if (!ends) return t("Ingen fast sluttdato");
  const diff = Date.parse(ends) - now;
  if (!Number.isFinite(diff) || diff <= 0) return t("Utløpt");
  const mins = Math.ceil(diff / 60000);
  if (mins < 60) return t("{0} min igjen", mins);
  if (mins < 1440)
    return t("{0} t {1} min igjen", Math.floor(mins / 60), mins % 60);
  return t("{0} dager igjen", Math.ceil(mins / 1440));
}
export const eventWhen = (value: string) =>
  new Date(value).toLocaleString(locale(), {
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
