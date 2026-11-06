import type { Business } from "@dinvenn/core";
export type Point = { latitude: number; longitude: number };
export function validPoint(lat: unknown, lng: unknown): boolean {
  return (
    typeof lat === "number" &&
    typeof lng === "number" &&
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    Math.abs(lat) <= 90 &&
    Math.abs(lng) <= 180
  );
}
export function storedPoint(b: Pick<Business, "lat" | "lng">): Point | null {
  return validPoint(b.lat, b.lng)
    ? { latitude: b.lat!, longitude: b.lng! }
    : null;
}
const normalized = (value: string) =>
  value
    .toLocaleLowerCase("nb-NO")
    .normalize("NFKC")
    .replace(/[.,]/g, "")
    .replace(/\s+/g, " ")
    .trim();
export type AddressHit = {
  adressetekst?: string;
  postnummer?: string;
  poststed?: string;
  kommunenavn?: string;
  representasjonspunkt?: { lat?: number; lon?: number };
};
export function chooseAddressPoint(
  b: Pick<Business, "address" | "city" | "postal_code">,
  hits: AddressHit[],
): Point | null {
  const street = normalized((b.address ?? "").split(",")[0]);
  const city = normalized(b.city ?? "");
  const postal = b.postal_code?.trim();
  if (!street || (!city && !postal)) return null;
  const matches = hits.filter(
    (h) =>
      normalized(h.adressetekst ?? "") === street &&
      (postal
        ? h.postnummer === postal
        : [h.poststed, h.kommunenavn].some(
            (p) => normalized(p ?? "") === city,
          )) &&
      validPoint(h.representasjonspunkt?.lat, h.representasjonspunkt?.lon),
  );
  const points = new Map(
    matches.map((h) => [
      `${h.representasjonspunkt!.lat},${h.representasjonspunkt!.lon}`,
      {
        latitude: h.representasjonspunkt!.lat!,
        longitude: h.representasjonspunkt!.lon!,
      },
    ]),
  );
  return points.size === 1 ? [...points.values()][0] : null;
}
export function addressSearchUrl(
  b: Pick<Business, "address" | "city" | "postal_code">,
): string | null {
  if (!b.address?.trim() || (!b.city?.trim() && !b.postal_code?.trim()))
    return null;
  const params = new URLSearchParams({
    sok: [b.address, b.postal_code, b.city].filter(Boolean).join(" "),
    treffPerSide: "10",
    utkoordsys: "4258",
  });
  return `https://ws.geonorge.no/adresser/v1/sok?${params}`;
}
export function directionsUrl(
  b: Pick<
    Business,
    "name" | "address" | "city" | "postal_code" | "lat" | "lng"
  >,
  point: Point | null = storedPoint(b),
): string {
  const destination = point
    ? `${point.latitude},${point.longitude}`
    : [b.address, b.postal_code, b.city].filter(Boolean).join(", ") || b.name;
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destination)}`;
}
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
