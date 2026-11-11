import { t } from "./i18n.ts";
import type { Database } from "./database.types";
export type { Database } from "./database.types";
import {
  createClient,
  type SupabaseClient,
  type SupabaseClientOptions,
} from "@supabase/supabase-js";
export type BusinessStatus = "pending" | "approved" | "suspended";
export type ContentStatus = "draft" | "active" | "paused" | "expired";
export type Profile = {
  id: string;
  role: "user" | "business" | "admin";
  display_name: string | null;
};
export type Category = {
  id: number;
  name: string;
  slug: string;
  icon: string | null;
  color: string | null;
};
export type Business = {
  id: string;
  owner_id: string | null;
  name: string;
  slug: string;
  description: string | null;
  category_id: number | null;
  cover_url: string | null;
  logo_url: string | null;
  address: string | null;
  city: string | null;
  postal_code: string | null;
  lat: number | null;
  lng: number | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  status: BusinessStatus;
  is_featured: boolean;
  created_at: string;
};
export type Deal = {
  id: string;
  business_id: string;
  title: string;
  description: string | null;
  image_url: string | null;
  discount_type: "percent" | "amount" | "freebie" | "other";
  discount_value: number | null;
  starts_at: string;
  ends_at: string | null;
  max_redemptions: number | null;
  max_per_user: number;
  terms: string | null;
  status: ContentStatus;
  student_only: boolean;
  min_group_size: number;
  created_at: string;
};
export type Redemption = {
  id: string;
  deal_id: string;
  user_id: string;
  token: string;
  status: "issued" | "redeemed" | "expired";
  issued_at: string;
  redeemed_at: string | null;
  expires_at: string;
};
export type Favorite = {
  user_id: string;
  target_type: "deal" | "event" | "business";
  target_id: string;
  created_at: string;
};
export type BusinessEvent = Database["public"]["Tables"]["events"]["Row"];
export type NewsPost = Database["public"]["Tables"]["news_posts"]["Row"];
export type Client = SupabaseClient<Database>;
export function makeClient(
  url: string,
  key: string,
  options?: SupabaseClientOptions<"public">,
) {
  if (!url || !key)
    throw new Error(
      "Supabase er ikke konfigurert. Følg oppstartsguiden i README.",
    );
  return createClient<Database>(url, key, options);
}
export function unwrap<T>({
  data,
  error,
}: {
  data: T;
  error: { message: string } | null;
}): NonNullable<T> {
  if (error) throw new Error(error.message);
  if (data === null || data === undefined) throw new Error("Fant ingen data.");
  return data as NonNullable<T>;
}
export function message(error: unknown): string {
  const text =
    error instanceof Error ? error.message : "Noe gikk galt. Prøv igjen.";
  if (/Invalid login credentials/i.test(text))
    return "Feil e-post eller passord.";
  if (/Email not confirmed/i.test(text))
    return "Bekreft e-postadressen din før du logger inn.";
  if (/Failed to fetch|fetch failed|Network request failed/i.test(text))
    return "Kunne ikke kontakte tjenesten. Sjekk nettet og prøv igjen.";
  if (/Could not find the table|schema cache/i.test(text))
    return "Tjenesten er ikke ferdig satt opp ennå. Prøv igjen senere.";
  return t(text);
}
export const contentStatusLabels: Record<ContentStatus, string> = {
  draft: "Utkast",
  active: "Publisert",
  paused: "Pauset",
  expired: "Utløpt",
};
export const businessStatusLabels: Record<BusinessStatus, string> = {
  pending: "Venter på godkjenning",
  approved: "Godkjent",
  suspended: "Suspendert",
};
export function discount(deal: Deal) {
  return deal.discount_type === "percent"
    ? `${deal.discount_value ?? 0} %`
    : deal.discount_type === "amount"
      ? `${deal.discount_value ?? 0} kr`
      : deal.discount_type === "freebie"
        ? t("En gave til deg")
        : t("Vennepris");
}
export function redemptionStatus(r: Redemption, now = Date.now()) {
  return r.status === "redeemed"
    ? t("Innløst")
    : r.status === "expired" || Date.parse(r.expires_at) <= now
      ? t("Utløpt")
      : t("Klar til bruk");
}
export function filterDeals(
  deals: Deal[],
  businesses: Business[],
  search: string,
  city: string,
  category: string,
) {
  const query = search.trim().toLocaleLowerCase("nb-NO");
  return deals.filter((d) => {
    const b = businesses.find((b) => b.id === d.business_id);
    return (
      !!b &&
      (!city || b.city === city) &&
      (!category || String(b.category_id) === category) &&
      (!query ||
        `${d.title} ${d.description ?? ""} ${b.name}`
          .toLocaleLowerCase("nb-NO")
          .includes(query))
    );
  });
}
export function validateDeal(d: Partial<Deal>) {
  if (!d.title?.trim()) throw new Error("Skriv en tittel.");
  if (!d.starts_at || !Number.isFinite(Date.parse(d.starts_at)))
    throw new Error("Velg gyldig starttid.");
  if (
    d.ends_at &&
    (!Number.isFinite(Date.parse(d.ends_at)) ||
      Date.parse(d.ends_at) <= Date.parse(d.starts_at))
  )
    throw new Error("Slutt må være etter start.");
  for (const n of [d.max_per_user, d.max_redemptions])
    if (n != null && (!Number.isInteger(n) || n < 1))
      throw new Error("Innløsningsgrenser må være positive heltall.");
  if (
    ["percent", "amount"].includes(d.discount_type ?? "") &&
    (d.discount_value == null ||
      !Number.isFinite(d.discount_value) ||
      d.discount_value <= 0)
  )
    throw new Error("Oppgi en positiv rabatt.");
  if (d.discount_type === "percent" && (d.discount_value ?? 0) > 100)
    throw new Error("Prosent kan ikke være over 100.");
}
export const api = (db: Client) => ({
  async catalog() {
    const now = new Date().toISOString();
    const [bs, ds, cs, es, ns] = await Promise.all([
      db.from("businesses").select("*").eq("status", "approved").order("name"),
      db
        .from("deals")
        .select("*")
        .eq("status", "active")
        .eq("student_only", false)
        .eq("min_group_size", 1)
        .lte("starts_at", now)
        .or(`ends_at.is.null,ends_at.gt.${now}`)
        .order("created_at", { ascending: false }),
      db.from("categories").select("*").order("name"),
      db
        .from("events")
        .select("*")
        .eq("status", "active")
        .or(`ends_at.gt.${now},and(ends_at.is.null,starts_at.gte.${now})`)
        .order("starts_at"),
      db
        .from("news_posts")
        .select("*")
        .eq("status", "active")
        .lte("published_at", now)
        .order("published_at", { ascending: false }),
    ]);
    const businesses = unwrap(bs);
    const approved = new Set(businesses.map((b) => b.id));
    return {
      businesses,
      deals: unwrap(ds).filter((d) => approved.has(d.business_id)),
      categories: unwrap(cs),
      events: unwrap(es).filter((e) => approved.has(e.business_id)),
      news: unwrap(ns).filter((n) => approved.has(n.business_id)),
    };
  },
  async profile(id: string) {
    return unwrap(await db.from("profiles").select("*").eq("id", id).single());
  },
  async favorites(id: string) {
    return unwrap(await db.from("favorites").select("*").eq("user_id", id));
  },
  async favorite(
    user: string,
    type: Favorite["target_type"],
    id: string,
    on: boolean,
  ) {
    const q = on
      ? db
          .from("favorites")
          .upsert({ user_id: user, target_type: type, target_id: id })
      : db
          .from("favorites")
          .delete()
          .eq("user_id", user)
          .eq("target_type", type)
          .eq("target_id", id);
    const { error } = await q;
    if (error) throw new Error(error.message);
  },
  async claim(id: string) {
    return unwrap(await db.rpc("claim_deal", { p_deal_id: id }));
  },
  async redeem(token: string) {
    return unwrap(
      await db.rpc("redeem_deal", { p_token: token.trim(), p_party_size: 1 }),
    );
  },
  async redemptions(id: string) {
    return unwrap(
      await db
        .from("deal_redemptions")
        .select("*")
        .eq("user_id", id)
        .order("issued_at", { ascending: false }),
    );
  },
  async upload(business: string, file: File) {
    if (
      !["image/jpeg", "image/png", "image/webp"].includes(file.type) ||
      file.size > 5 * 1024 * 1024
    )
      throw new Error("Bruk JPG, PNG eller WebP under 5 MB.");
    const ext = {
      "image/jpeg": "jpg",
      "image/png": "png",
      "image/webp": "webp",
    }[file.type];
    const path = `${business}/${crypto.randomUUID()}.${ext}`;
    unwrap(
      await db.storage
        .from("business-images")
        .upload(path, file, { contentType: file.type }),
    );
    return db.storage.from("business-images").getPublicUrl(path).data.publicUrl;
  },
});
export { processLock } from "@supabase/supabase-js";
export type { Session } from "@supabase/supabase-js";

export function check(result: { error: { message: string } | null }) {
  if (result.error) throw new Error(result.error.message);
}

export {
  validPoint,
  storedPoint,
  chooseAddressPoint,
  addressSearchUrl,
  directionsUrl,
  addressIdentity,
} from "./geo.ts";
export type { Point, AddressHit } from "./geo.ts";

export {
  t,
  locale,
  getLanguage,
  setLanguage,
  subscribeLanguage,
  type Language,
} from "./i18n.ts";
