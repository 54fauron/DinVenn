import { LanguagePicker, useLanguage } from "./LanguagePicker";
import { t, locale } from "@dinvenn/core";
import React, { useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import type { Session } from "@supabase/supabase-js";
import type { Html5Qrcode as ScannerType } from "html5-qrcode";
import {
  api,
  contentStatusLabels,
  businessStatusLabels,
  check,
  makeClient,
  message,
  unwrap,
  validateDeal,
  discount,
  addressIdentity,
  storedPoint,
  type Point,
  type Business,
  type Category,
  type Client,
  type Deal,
  type Profile,
  type Redemption,
} from "@dinvenn/core";
import {
  ContentManager,
  useImagePreview,
  SubscriptionPage,
  type BusinessEvent,
  type NewsPost,
  type Subscription,
} from "./content";
import { Dashboard, NavIcon } from "./dashboard";
import "./style.css";
const AddressMap = React.lazy(() => import("./AddressMap"));
const configured =
  !!import.meta.env.VITE_SUPABASE_URL &&
  !!import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
const db = configured
  ? makeClient(
      import.meta.env.VITE_SUPABASE_URL,
      import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
    )
  : null;
const recovering =
  new URLSearchParams(location.hash.slice(1)).get("type") === "recovery";
type Run = (action: () => Promise<void>) => Promise<void>;
function Field({
  label,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  return (
    <label>
      {label}
      <input {...props} />
    </label>
  );
}
function Auth({
  db,
  run,
  recovery,
  done,
}: {
  db: Client;
  run: Run;
  recovery: boolean;
  done: () => void;
}) {
  const [mode, setMode] = useState<"login" | "register" | "reset">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [notice, setNotice] = useState("");
  return (
    <section className="auth card">
      <span className="eyebrow">{t("LOKALT ER FINT")}</span>
      <h1>
        {recovery ? t("Velg nytt passord") : t("Flere kunder. Flere venner.")}
      </h1>
      <p>
        {" "}
        {t(
          "Velkommen til bedriftsportalen. Gi folk en god grunn til å besøke nettopp dere.",
        )}{" "}
      </p>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void run(async () => {
            setNotice("");
            if (recovery) {
              check(await db.auth.updateUser({ password }));
              setNotice(
                t("Passordet er endret. Du kan også logge inn i mobilappen."),
              );
              done();
            } else if (mode === "login")
              check(await db.auth.signInWithPassword({ email, password }));
            else if (mode === "register") {
              check(
                await db.auth.signUp({
                  email,
                  password,
                  options: {
                    data: { display_name: name },
                    emailRedirectTo: location.origin,
                  },
                }),
              );
              setNotice(
                t(
                  "Sjekk e-posten din for å bekrefte kontoen. Deretter kan du logge inn.",
                ),
              );
            } else {
              check(
                await db.auth.resetPasswordForEmail(email, {
                  redirectTo: location.origin + "/?recovery=1",
                }),
              );
              setNotice(t("Hvis kontoen finnes, får du en lenke på e-post."));
            }
          });
        }}
      >
        {!recovery && mode === "register" && (
          <Field
            label={t("Navnet ditt")}
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoComplete="name"
          />
        )}
        {!recovery && (
          <Field
            label={t("E-post")}
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
          />
        )}
        {(recovery || mode !== "reset") && (
          <Field
            label={t("Passord (minst 8 tegn)")}
            type="password"
            minLength={8}
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete={
              mode === "login" && !recovery
                ? "current-password"
                : "new-password"
            }
          />
        )}
        <button type="submit">
          {recovery
            ? t("Lagre passord")
            : mode === "login"
              ? t("Logg inn")
              : mode === "register"
                ? t("Opprett konto")
                : t("Send tilbakestillingslenke")}
        </button>
      </form>
      {notice && <p role="status">{t(notice)}</p>}
      {!recovery && (
        <div className="actions">
          <button
            className="quiet"
            onClick={() => setMode(mode === "register" ? "login" : "register")}
          >
            {mode === "register"
              ? t("Til innlogging")
              : t("Ny her? Opprett konto")}
          </button>
          <button
            className="quiet"
            onClick={() => setMode(mode === "reset" ? "login" : "reset")}
          >
            {mode === "reset" ? t("Til innlogging") : t("Glemt passord?")}
          </button>
        </div>
      )}
    </section>
  );
}
function Scanner({
  found,
  error,
}: {
  found: (code: string) => void;
  error: (error: unknown) => void;
}) {
  const id = useRef(`scanner-${crypto.randomUUID()}`);
  useEffect(() => {
    let scanner: ScannerType | undefined;
    let cancelled = false;
    let accepted = false;
    const start = (async () => {
      const { Html5Qrcode } = await import("html5-qrcode");
      if (cancelled) return;
      scanner = new Html5Qrcode(id.current);
      await scanner.start(
        { facingMode: "environment" },
        { fps: 8, qrbox: { width: 220, height: 220 } },
        (code) => {
          if (!cancelled && !accepted) {
            accepted = true;
            found(code);
          }
        },
        () => {},
      );
    })();
    void start
      .then(async () => {
        if (cancelled && scanner?.isScanning) await scanner.stop();
      })
      .catch((e) => {
        if (!cancelled) error(e);
      });
    return () => {
      cancelled = true;
      void start
        .then(async () => {
          if (scanner?.isScanning) await scanner.stop();
          scanner?.clear();
        })
        .catch(() => {});
    };
  }, []);
  return <div id={id.current} className="scanner" />;
}
function BusinessForm({
  db,
  user,
  business,
  categories,
  run,
  saved,
}: {
  db: Client;
  user: string;
  business?: Business;
  categories: Category[];
  run: Run;
  saved: () => Promise<void>;
}) {
  const [form, setForm] = useState({
    name: business?.name ?? "",
    description: business?.description ?? "",
    address: business?.address ?? "",
    city: business?.city ?? "",
    postal_code: business?.postal_code ?? "",
    phone: business?.phone ?? "",
    email: business?.email ?? "",
    website: business?.website ?? "",
    category_id: String(business?.category_id ?? ""),
  });
  const [cover, setCover] = useState<File | null>(null);
  const [pin, setPin] = useState<{ address: string; point: Point | null }>(
    () => ({
      address: addressIdentity(form),
      point: business ? storedPoint(business) : null,
    }),
  );
  const addressKey = addressIdentity(form);
  const point = pin.address === addressKey ? pin.point : null;

  const change = (key: keyof typeof form, value: string) =>
    setForm((f) => ({ ...f, [key]: value }));
  return (
    <section className="card">
      <h2>
        {business ? t("Bedriftsprofil") : t("La oss bli kjent med bedriften")}
      </h2>
      <p>
        {t("Nye bedrifter blir synlige når DinVenn har godkjent profilen.")}
      </p>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void run(async () => {
            const values = {
              ...form,
              lat: point?.latitude ?? null,
              lng: point?.longitude ?? null,
              name: form.name.trim(),
              category_id: form.category_id ? Number(form.category_id) : null,
            };
            if (!values.name) throw new Error(t("Skriv bedriftens navn."));
            const b = business
              ? unwrap(
                  await db
                    .from("businesses")
                    .update(values)
                    .eq("id", business.id)
                    .select()
                    .single(),
                )
              : unwrap(
                  await db
                    .from("businesses")
                    .insert({
                      ...values,
                      owner_id: user,
                      slug: `${
                        values.name
                          .toLowerCase()
                          .replace(/[^a-z0-9]+/g, "-")
                          .replace(/^-|-$/g, "") || "bedrift"
                      }-${crypto.randomUUID().slice(0, 8)}`,
                    })
                    .select()
                    .single(),
                );
            if (cover) {
              const cover_url = await api(db).upload(b.id, cover);
              unwrap(
                await db
                  .from("businesses")
                  .update({ cover_url })
                  .eq("id", b.id)
                  .select()
                  .single(),
              );
            }
            await saved();
          });
        }}
      >
        <div className="business-profile-layout">
          <div className="business-profile-fields">
            <div className="formgrid">
              {(
                [
                  "name",
                  "city",
                  "address",
                  "postal_code",
                  "phone",
                  "email",
                  "website",
                ] as const
              ).map((key, i) => (
                <Field
                  key={key}
                  label={
                    [
                      t("Bedriftsnavn"),
                      t("By"),
                      t("Adresse"),
                      t("Postnummer"),
                      t("Telefon"),
                      t("E-post"),
                      t("Nettside"),
                    ][i]
                  }
                  value={form[key]}
                  type={
                    key === "email"
                      ? "email"
                      : key === "website"
                        ? "url"
                        : "text"
                  }
                  required={key === "name" || key === "city"}
                  onChange={(e) => change(key, e.target.value)}
                />
              ))}
              <label>
                {" "}
                {t("Kategori")}{" "}
                <select
                  value={form.category_id}
                  required
                  onChange={(e) => change("category_id", e.target.value)}
                >
                  <option value="">{t("Velg kategori")}</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {t(c.name)}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <label>
              {" "}
              {t("Om bedriften")}{" "}
              <textarea
                value={form.description}
                onChange={(e) => change("description", e.target.value)}
              />
            </label>
            {business?.cover_url && (
              <img
                className="cover"
                src={business.cover_url}
                alt={t("Bedriftens forsidebilde")}
              />
            )}
            <Field
              label={t("Forsidebilde (JPG, PNG eller WebP, maks 5 MB)")}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={(e) => setCover(e.target.files?.[0] ?? null)}
            />
          </div>
          <React.Suspense fallback={<p role="status">{t("Laster kart …")}</p>}>
            <AddressMap
              address={form}
              point={point}
              onChange={(next) => setPin({ address: addressKey, point: next })}
            />
          </React.Suspense>
        </div>
        <button type="submit">
          {business ? t("Lagre profil") : t("Send til godkjenning")}
        </button>
      </form>
    </section>
  );
}
function localDate(value: string) {
  const d = new Date(value);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 16);
}
function DealForm({
  db,
  business,
  deal,
  run,
  saved,
  cancel,
}: {
  db: Client;
  business: Business;
  deal?: Deal;
  run: Run;
  saved: () => Promise<void>;
  cancel: () => void;
}) {
  const [title, setTitle] = useState(deal?.title ?? "");
  const [description, setDescription] = useState(deal?.description ?? "");
  const [terms, setTerms] = useState(deal?.terms ?? "");
  const [kind, setKind] = useState<Deal["discount_type"]>(
    deal?.discount_type ?? "percent",
  );
  const [value, setValue] = useState(String(deal?.discount_value ?? 20));
  const [start, setStart] = useState(
    localDate(deal?.starts_at ?? new Date().toISOString()),
  );
  const [end, setEnd] = useState(deal?.ends_at ? localDate(deal.ends_at) : "");
  const [max, setMax] = useState(String(deal?.max_redemptions ?? ""));
  const [perUser, setPerUser] = useState(String(deal?.max_per_user ?? 1));
  const [status, setStatus] = useState<Deal["status"]>(deal?.status ?? "draft");
  const [image, setImage] = useState<File | null>(null);
  const previewImage = useImagePreview(image, deal?.image_url ?? null);
  return (
    <section className="card">
      <h2>
        {deal ? t("Rediger vennepris") : t("En ny grunn til å komme innom")}
      </h2>
      <div className="editor-layout">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void run(async () => {
              const values = {
                business_id: business.id,
                title: title.trim(),
                description,
                terms,
                discount_type: kind,
                discount_value:
                  kind === "percent" || kind === "amount"
                    ? Number(value)
                    : null,
                starts_at: new Date(start).toISOString(),
                ends_at: end ? new Date(end).toISOString() : null,
                max_redemptions: max ? Number(max) : null,
                max_per_user: Number(perUser),
                status,
              };
              validateDeal(values);
              const image_url = image
                ? await api(db).upload(business.id, image)
                : (deal?.image_url ?? null);
              unwrap(
                deal
                  ? await db
                      .from("deals")
                      .update({ ...values, image_url })
                      .eq("id", deal.id)
                      .select()
                      .single()
                  : await db
                      .from("deals")
                      .insert({ ...values, image_url })
                      .select()
                      .single(),
              );
              await saved();
            });
          }}
        >
          <Field
            label={t("Tittel")}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />
          <label>
            {" "}
            {t("Beskrivelse")}{" "}
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </label>
          <div className="formgrid">
            <label>
              {" "}
              {t("Type rabatt")}{" "}
              <select
                value={kind}
                onChange={(e) =>
                  setKind(e.target.value as Deal["discount_type"])
                }
              >
                <option value="percent">{t("Prosent")}</option>
                <option value="amount">{t("Kroner")}</option>
                <option value="freebie">{t("Gratis gave")}</option>
                <option value="other">{t("Annet / 2 for 1")}</option>
              </select>
            </label>
            {(kind === "percent" || kind === "amount") && (
              <Field
                label={t("Rabatt")}
                type="number"
                min="0.01"
                max={kind === "percent" ? 100 : undefined}
                step="0.01"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                required
              />
            )}
            <Field
              label={t("Starter (lokal tid)")}
              type="datetime-local"
              value={start}
              onChange={(e) => setStart(e.target.value)}
              required
            />
            <Field
              label={t("Slutter (valgfritt)")}
              type="datetime-local"
              value={end}
              onChange={(e) => setEnd(e.target.value)}
            />
            <Field
              label={t("Totalt antall innløsninger (tomt = ubegrenset)")}
              type="number"
              min="1"
              value={max}
              onChange={(e) => setMax(e.target.value)}
            />
            <Field
              label={t("Maks per bruker")}
              type="number"
              min="1"
              value={perUser}
              onChange={(e) => setPerUser(e.target.value)}
              required
            />
          </div>
          <label>
            {" "}
            {t("Vilkår")}{" "}
            <textarea
              value={terms}
              onChange={(e) => setTerms(e.target.value)}
            />
          </label>
          {deal?.image_url && (
            <img
              className="cover"
              src={deal.image_url}
              alt={t("Tilbudsbilde")}
            />
          )}
          <Field
            label={t("Tilbudsbilde (maks 5 MB)")}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={(e) => setImage(e.target.files?.[0] ?? null)}
          />
          <label>
            {" "}
            {t("Status")}{" "}
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as Deal["status"])}
            >
              <option value="draft">{t("Utkast")}</option>
              <option value="active">{t("Publisert")}</option>
              <option value="paused">{t("Pauset")}</option>
              <option value="expired">{t("Utløpt")}</option>
            </select>
          </label>
          {business.status !== "approved" && (
            <p className="notice">
              {" "}
              {t(
                "Tilbudet blir ikke synlig for brukere før bedriften er godkjent.",
              )}{" "}
            </p>
          )}
          <div className="actions">
            <button type="submit">{t("Lagre vennepris")}</button>
            <button type="button" className="quiet" onClick={cancel}>
              {" "}
              {t("Avbryt")}{" "}
            </button>
          </div>
        </form>
        <section className="preview-panel">
          <span className="eyebrow">{t("FORHÅNDSVISNING")}</span>
          <article className="content-preview">
            {previewImage && (
              <img
                src={previewImage}
                className="cover"
                alt={t("Tilbudsbilde")}
              />
            )}
            <div className="preview-body">
              <span className="eyebrow">{business.name}</span>
              <p className="preview-discount">
                {kind === "percent"
                  ? `${value || 0} %`
                  : kind === "amount"
                    ? `${value || 0} kr`
                    : kind === "freebie"
                      ? t("En gave til deg")
                      : t("Vennepris")}
              </p>
              <h3>{title || t("Din neste vennepris")}</h3>
              <p className="preserve-lines">
                {description || t("Et godt tilbud fra et lokalt sted.")}
              </p>
              <p className="muted">{terms || t("Vilkårene dine vises her.")}</p>
            </div>
          </article>
        </section>
      </div>
    </section>
  );
}
function App() {
  useLanguage();
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);
  const [recovery, setRecovery] = useState(
    recovering || new URLSearchParams(location.search).has("recovery"),
  );
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);
  const [notice, setNotice] = useState("");
  const [profile, setProfile] = useState<Profile | null>(null);
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selected, setSelected] = useState("");
  const [deals, setDeals] = useState<Deal[]>([]);
  const [redemptions, setRedemptions] = useState<Redemption[]>([]);
  const [events, setEvents] = useState<BusinessEvent[]>([]);
  const [news, setNews] = useState<NewsPost[]>([]);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const businessRequest = useRef(0);
  const [adminBusinesses, setAdminBusinesses] = useState<Business[]>([]);
  const [tab, setTab] = useState("overview");
  const [editing, setEditing] = useState<Deal | "new" | null>(null);
  const [scanning, setScanning] = useState(false);
  const [token, setToken] = useState("");
  const business = businesses.find((b) => b.id === selected);
  const run: Run = async (action) => {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await action();
    } catch (e) {
      setError(message(e));
    } finally {
      lock.current = false;
      setBusy(false);
    }
  };
  useEffect(() => {
    if (!db) {
      setReady(true);
      return;
    }
    const sub = db.auth.onAuthStateChange((event, s) => {
      setSession(s);
      setReady(true);
      if (event === "PASSWORD_RECOVERY") setRecovery(true);
      if (!s) {
        setProfile(null);
        setBusinesses([]);
        setSelected("");
        setDeals([]);
        setRedemptions([]);
        setAdminBusinesses([]);
        setEvents([]);
        setNews([]);
        setSubscription(null);
        businessRequest.current++;
      }
    });
    return () => sub.data.subscription.unsubscribe();
  }, []);
  async function load() {
    if (!db || !session) return;
    const [p, members, cats] = await Promise.all([
      api(db).profile(session.user.id),
      db.from("business_members").select("*").eq("user_id", session.user.id),
      db.from("categories").select("*").order("name"),
    ]);
    setProfile(p);
    setCategories(unwrap(cats));
    const ids = unwrap(members).map((m) => m.business_id);
    const bs = ids.length
      ? unwrap(
          await db.from("businesses").select("*").in("id", ids).order("name"),
        )
      : [];
    setBusinesses(bs);
    setSelected((id) => (bs.some((b) => b.id === id) ? id : (bs[0]?.id ?? "")));
    if (p.role === "admin")
      setAdminBusinesses(
        unwrap(
          await db
            .from("businesses")
            .select("*")
            .order("created_at", { ascending: false }),
        ),
      );
  }
  async function loadBusiness(id: string) {
    if (!db) return;
    const request = ++businessRequest.current;
    const [dealResult, eventResult, newsResult, subscriptionResult] =
      await Promise.all([
        db
          .from("deals")
          .select("*")
          .eq("business_id", id)
          .order("created_at", { ascending: false }),
        db
          .from("events")
          .select("*")
          .eq("business_id", id)
          .order("starts_at", { ascending: true }),
        db
          .from("news_posts")
          .select("*")
          .eq("business_id", id)
          .order("published_at", { ascending: false }),
        db
          .from("subscriptions")
          .select("id, plan, status, current_period_end")
          .eq("business_id", id)
          .maybeSingle(),
      ]);
    const ds = unwrap(dealResult);
    const es = unwrap(eventResult);
    const ns = unwrap(newsResult);
    check(subscriptionResult);
    const rs = ds.length
      ? unwrap(
          await db
            .from("deal_redemptions")
            .select("*")
            .in(
              "deal_id",
              ds.map((d) => d.id),
            )
            .order("issued_at", { ascending: false }),
        )
      : [];
    if (request !== businessRequest.current) return;
    setDeals(ds);
    setEvents(es);
    setNews(ns);
    setSubscription(subscriptionResult.data);
    setRedemptions(rs);
  }
  useEffect(() => {
    setTab("overview");
    setEditing(null);
    if (session) void run(load);
  }, [session?.user.id]);
  useEffect(() => {
    businessRequest.current++;
    setDeals([]);
    setRedemptions([]);
    setEvents([]);
    setNews([]);
    setSubscription(null);
    setEditing(null);
    if (selected)
      void loadBusiness(selected).catch((e) => setError(message(e)));
  }, [selected]);
  function navigate(next: string) {
    setNotice("");
    setTab(next);
  }
  async function reload() {
    await load();
    if (selected) await loadBusiness(selected);
  }
  return (
    <>
      <header>
        <a className="brand" href="/">
          <span className="brand-logo-frame">
            <img src="/dinvenn-logo.png" alt="" className="brand-logo" />
          </span>
          <span>DinVenn</span>
        </a>
        <span>{t("FOR LOKALE BEDRIFTER")}</span>
        <div className="header-actions">
          <LanguagePicker />
          {session && (
            <button
              className="quiet"
              onClick={() =>
                void run(async () => {
                  check(await db!.auth.signOut());
                })
              }
            >
              {" "}
              {t("Logg ut")}{" "}
            </button>
          )}
        </div>
      </header>
      <main aria-busy={busy}>
        {error && (
          <div className="alert" role="alert">
            {t(error)}
            <button className="quiet" onClick={() => setError("")}>
              {" "}
              {t("Lukk")}{" "}
            </button>
          </div>
        )}
        {notice && (
          <div className="notice dismissible-notice" role="status">
            <span>{t(notice)}</span>
            <button
              type="button"
              className="notice-close"
              aria-label={t("Lukk bekreftelse")}
              onClick={() => setNotice("")}
            >
              ×
            </button>
          </div>
        )}
        {busy && <p role="status">{t("Jobber …")}</p>}
        {!configured ? (
          <section className="card auth">
            <span className="eyebrow">{t("DINVENN PILOT")}</span>
            <h1>
              {" "}
              {t("En liten portal.")} <br />{" "}
              {t("En stor forskjell lokalt.")}{" "}
            </h1>
            <p>
              {" "}
              {t("Appen er klar for tilkobling til Supabase. Kopier")}{" "}
              <code>apps/portal/.env.example</code> {t("til")} <code>.env</code>{" "}
              {t("og fyll inn prosjektets URL og offentlige nøkkel.")}{" "}
            </p>
            <p>{t("Se README for databaseoppsett og testkontoer.")}</p>
          </section>
        ) : !ready ? (
          <p>{t("Laster innlogging …")}</p>
        ) : !session || recovery ? (
          <Auth
            db={db!}
            run={run}
            recovery={recovery}
            done={() => {
              setRecovery(false);
              history.replaceState(null, "", "/");
              setNotice(t("Passordet er oppdatert."));
            }}
          />
        ) : (
          <div className="layout">
            <aside className="sidebar">
              <p className="eyebrow">
                {t("HEI,")} {profile?.display_name ?? t("VENN")}!
              </p>
              <label>
                {" "}
                {t("Din bedrift")}{" "}
                <select
                  value={selected}
                  onChange={(e) => {
                    setSelected(e.target.value);
                    navigate("overview");
                  }}
                >
                  {!businesses.length && (
                    <option value="">{t("Ingen bedrifter ennå")}</option>
                  )}
                  {businesses.map((b) => (
                    <option value={b.id} key={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </label>
              <nav>
                {[
                  ["overview", t("Oversikt")],
                  ["profile", t("Bedriftsprofil")],
                  ["deals", t("Vennepriser")],
                  ["events", t("Arrangementer")],
                  ["news", t("Nyheter")],
                  ["redeem", t("Løs inn kode")],
                  ["subscription", t("Abonnement")],
                  ["new", t("Registrer bedrift")],
                  ...(profile?.role === "admin"
                    ? [["admin", t("Godkjenning")]]
                    : []),
                ].map(([key, label]) => (
                  <button
                    className={tab === key ? "nav active" : "nav"}
                    key={key}
                    onClick={() => {
                      navigate(key);
                      setEditing(null);
                      setScanning(false);
                    }}
                  >
                    <NavIcon name={key} />
                    <span>{label}</span>
                  </button>
                ))}
              </nav>
              <button className="quiet" onClick={() => void run(reload)}>
                {" "}
                {t("Oppdater data")}{" "}
              </button>
            </aside>
            <div className="content" key={selected || "no-business"}>
              {business && (
                <div className="pageheading">
                  <div>
                    <span className="eyebrow">{t("DITT LOKALE HJØRNE")}</span>
                    <h1>{business.name}</h1>
                  </div>
                  <span className={`badge ${business.status}`}>
                    {
                      {
                        pending: t("Venter på godkjenning"),
                        approved: t("Godkjent"),
                        suspended: t("Suspendert"),
                      }[business.status]
                    }
                  </span>
                </div>
              )}
              {tab === "new" || (!business && tab !== "admin") ? (
                <BusinessForm
                  key="new"
                  db={db!}
                  user={session.user.id}
                  categories={categories}
                  run={run}
                  saved={async () => {
                    await load();
                    setTab("overview");
                    setNotice(t("Bedriften er sendt til godkjenning."));
                  }}
                />
              ) : tab === "admin" ? (
                <section className="card">
                  <h2>{t("Bedriftsgodkjenning")}</h2>
                  {!adminBusinesses.length && (
                    <p>{t("Ingen bedrifter ennå.")}</p>
                  )}
                  {adminBusinesses.map((b) => (
                    <article className="listitem" key={b.id}>
                      <div>
                        <strong>{b.name}</strong>
                        <p>
                          {b.city} · {t(businessStatusLabels[b.status])}
                        </p>
                        <p>{b.description}</p>
                        <small>
                          {b.address} · {b.email} · {b.website}
                        </small>
                      </div>
                      <div className="actions">
                        {(["approved", "suspended"] as const)
                          .filter((status) => status !== b.status)
                          .map((status) => (
                            <button
                              key={status}
                              disabled={busy}
                              className={status === "suspended" ? "quiet" : ""}
                              onClick={() =>
                                void run(async () => {
                                  unwrap(
                                    await db!
                                      .from("businesses")
                                      .update({ status })
                                      .eq("id", b.id)
                                      .select()
                                      .single(),
                                  );
                                  await load();
                                  setNotice(t("Bedriftsstatus oppdatert."));
                                })
                              }
                            >
                              {status === "approved"
                                ? t("Godkjenn")
                                : t("Suspender")}
                            </button>
                          ))}
                      </div>
                    </article>
                  ))}
                </section>
              ) : tab === "events" || tab === "news" ? (
                <ContentManager
                  key={selected + tab}
                  db={db!}
                  business={business!}
                  kind={tab === "events" ? "events" : "news_posts"}
                  items={tab === "events" ? events : news}
                  run={run}
                  busy={busy}
                  reload={async () => {
                    await loadBusiness(selected);
                    setNotice(
                      tab === "events"
                        ? t("Arrangementet er lagret.")
                        : t("Nyheten er lagret."),
                    );
                  }}
                />
              ) : tab === "subscription" ? (
                <SubscriptionPage subscription={subscription} />
              ) : tab === "profile" ? (
                <BusinessForm
                  key={business!.id}
                  db={db!}
                  user={session.user.id}
                  business={business}
                  categories={categories}
                  run={run}
                  saved={async () => {
                    await load();
                    setNotice(t("Profilen er lagret."));
                  }}
                />
              ) : tab === "deals" ? (
                editing ? (
                  <DealForm
                    key={editing === "new" ? "new" : editing.id}
                    db={db!}
                    business={business!}
                    deal={editing === "new" ? undefined : editing}
                    run={run}
                    cancel={() => setEditing(null)}
                    saved={async () => {
                      await loadBusiness(selected);
                      setEditing(null);
                      setNotice(t("Venneprisen er lagret."));
                    }}
                  />
                ) : (
                  <section className="card">
                    <div className="pageheading">
                      <h2>{t("Venneprisene dine")}</h2>
                      <button onClick={() => setEditing("new")}>
                        {" "}
                        {t("+ Ny vennepris")}{" "}
                      </button>
                    </div>
                    {!deals.length && (
                      <p>
                        {" "}
                        {t(
                          "Lag din første vennepris og gi folk en grunn til å komme innom.",
                        )}{" "}
                      </p>
                    )}
                    {deals.map((d) => (
                      <article className="listitem" key={d.id}>
                        <div>
                          <strong>{d.title}</strong>
                          <p>
                            {discount(d)} · {t(contentStatusLabels[d.status])} ·{" "}
                            {
                              redemptions.filter(
                                (r) =>
                                  r.deal_id === d.id && r.status === "redeemed",
                              ).length
                            }{" "}
                            {t("innløst")}{" "}
                          </p>
                        </div>
                        <div className="actions">
                          <button
                            className="quiet"
                            onClick={() => setEditing(d)}
                          >
                            {" "}
                            {t("Rediger")}{" "}
                          </button>
                          <button
                            className="quiet"
                            onClick={() =>
                              void run(async () => {
                                unwrap(
                                  await db!
                                    .from("deals")
                                    .update({
                                      status:
                                        d.status === "active"
                                          ? "paused"
                                          : "active",
                                    })
                                    .eq("id", d.id)
                                    .select()
                                    .single(),
                                );
                                await loadBusiness(selected);
                              })
                            }
                          >
                            {d.status === "active" ? t("Pause") : t("Publiser")}
                          </button>
                        </div>
                      </article>
                    ))}
                  </section>
                )
              ) : tab === "redeem" ? (
                <section className="card">
                  <span className="eyebrow">{t("VELKOMMEN INNOM")}</span>
                  <h2>{t("Gjør en kode til et besøk")}</h2>
                  <p>
                    {" "}
                    {t(
                      "Skann kundens QR-kode eller lim inn koden. Kontroller koden og trykk «Bekreft innløsning».",
                    )}{" "}
                  </p>
                  <button
                    className="quiet"
                    onClick={() => setScanning((s) => !s)}
                  >
                    {scanning ? t("Stopp kamera") : t("Åpne QR-skanner")}
                  </button>
                  {scanning && (
                    <Scanner
                      found={(code) => {
                        setToken(code);
                        setScanning(false);
                      }}
                      error={(e) => {
                        setError(
                          t(
                            "Kunne ikke åpne kamera. Bruk HTTPS eller localhost, gi kameratilgang, eller lim inn kode. ",
                          ) + message(e),
                        );
                        setScanning(false);
                      }}
                    />
                  )}
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      void run(async () => {
                        const r = await api(db!).redeem(token);
                        setToken("");
                        setScanning(false);
                        await loadBusiness(selected);
                        setNotice(
                          t(
                            "Innløsning bekreftet: {0}.",
                            deals.find((d) => d.id === r.deal_id)?.title ??
                              t("Vennepris"),
                          ),
                        );
                      });
                    }}
                  >
                    <Field
                      label={t("Kundens kode")}
                      value={token}
                      onChange={(e) => setToken(e.target.value)}
                      required
                      autoComplete="off"
                    />
                    <button type="submit">{t("Bekreft innløsning")}</button>
                  </form>
                </section>
              ) : (
                <Dashboard
                  deals={deals}
                  redemptions={redemptions}
                  events={events}
                  news={news}
                  onNewDeal={() => {
                    navigate("deals");
                    setEditing("new");
                  }}
                  onDeals={() => navigate("deals")}
                  onEditDeal={(deal) => {
                    navigate("deals");
                    setEditing(deal);
                  }}
                  onEvents={() => navigate("events")}
                  onNews={() => navigate("news")}
                />
              )}
            </div>
          </div>
        )}
      </main>
      <footer>{t("DinVenn ♥ Heia de lokale.")}</footer>
    </>
  );
}
createRoot(document.getElementById("root")!).render(<App />);
