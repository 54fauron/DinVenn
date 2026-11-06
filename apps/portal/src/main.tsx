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
  type Business,
  type Category,
  type Client,
  type Deal,
  type Profile,
  type Redemption,
} from "@dinvenn/core";
import "./style.css";
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
      <span className="eyebrow">LOKALT ER FINT</span>
      <h1>{recovery ? "Velg nytt passord" : "Flere kunder. Flere venner."}</h1>
      <p>
        Velkommen til bedriftsportalen. Gi folk en god grunn til å besøke
        nettopp dere.
      </p>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void run(async () => {
            setNotice("");
            if (recovery) {
              check(await db.auth.updateUser({ password }));
              setNotice(
                "Passordet er endret. Du kan også logge inn i mobilappen.",
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
                "Sjekk e-posten din for å bekrefte kontoen. Deretter kan du logge inn.",
              );
            } else {
              check(
                await db.auth.resetPasswordForEmail(email, {
                  redirectTo: location.origin + "/?recovery=1",
                }),
              );
              setNotice("Hvis kontoen finnes, får du en lenke på e-post.");
            }
          });
        }}
      >
        {!recovery && mode === "register" && (
          <Field
            label="Navnet ditt"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoComplete="name"
          />
        )}
        {!recovery && (
          <Field
            label="E-post"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
          />
        )}
        {(recovery || mode !== "reset") && (
          <Field
            label="Passord (minst 8 tegn)"
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
            ? "Lagre passord"
            : mode === "login"
              ? "Logg inn"
              : mode === "register"
                ? "Opprett konto"
                : "Send tilbakestillingslenke"}
        </button>
      </form>
      {notice && <p role="status">{notice}</p>}
      {!recovery && (
        <div className="actions">
          <button
            className="quiet"
            onClick={() => setMode(mode === "register" ? "login" : "register")}
          >
            {mode === "register" ? "Til innlogging" : "Ny her? Opprett konto"}
          </button>
          <button
            className="quiet"
            onClick={() => setMode(mode === "reset" ? "login" : "reset")}
          >
            {mode === "reset" ? "Til innlogging" : "Glemt passord?"}
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
  const change = (key: keyof typeof form, value: string) =>
    setForm((f) => ({ ...f, [key]: value }));
  return (
    <section className="card">
      <h2>{business ? "Bedriftsprofil" : "La oss bli kjent med bedriften"}</h2>
      <p>Nye bedrifter blir synlige når DinVenn har godkjent profilen.</p>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void run(async () => {
            const values = {
              ...form,
              name: form.name.trim(),
              category_id: form.category_id ? Number(form.category_id) : null,
            };
            if (!values.name) throw new Error("Skriv bedriftens navn.");
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
                  "Bedriftsnavn",
                  "By",
                  "Adresse",
                  "Postnummer",
                  "Telefon",
                  "E-post",
                  "Nettside",
                ][i]
              }
              value={form[key]}
              type={
                key === "email" ? "email" : key === "website" ? "url" : "text"
              }
              required={key === "name" || key === "city"}
              onChange={(e) => change(key, e.target.value)}
            />
          ))}
          <label>
            Kategori
            <select
              value={form.category_id}
              required
              onChange={(e) => change("category_id", e.target.value)}
            >
              <option value="">Velg kategori</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
        </div>
        <label>
          Om bedriften
          <textarea
            value={form.description}
            onChange={(e) => change("description", e.target.value)}
          />
        </label>
        {business?.cover_url && (
          <img
            className="cover"
            src={business.cover_url}
            alt="Bedriftens forsidebilde"
          />
        )}
        <Field
          label="Forsidebilde (JPG, PNG eller WebP, maks 5 MB)"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={(e) => setCover(e.target.files?.[0] ?? null)}
        />
        <button type="submit">
          {business ? "Lagre profil" : "Send til godkjenning"}
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
  return (
    <section className="card">
      <h2>{deal ? "Rediger vennepris" : "En ny grunn til å komme innom"}</h2>
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
                kind === "percent" || kind === "amount" ? Number(value) : null,
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
          label="Tittel"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
        />
        <label>
          Beskrivelse
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </label>
        <div className="formgrid">
          <label>
            Type rabatt
            <select
              value={kind}
              onChange={(e) => setKind(e.target.value as Deal["discount_type"])}
            >
              <option value="percent">Prosent</option>
              <option value="amount">Kroner</option>
              <option value="freebie">Gratis gave</option>
              <option value="other">Annet / 2 for 1</option>
            </select>
          </label>
          {(kind === "percent" || kind === "amount") && (
            <Field
              label="Rabatt"
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
            label="Starter (lokal tid)"
            type="datetime-local"
            value={start}
            onChange={(e) => setStart(e.target.value)}
            required
          />
          <Field
            label="Slutter (valgfritt)"
            type="datetime-local"
            value={end}
            onChange={(e) => setEnd(e.target.value)}
          />
          <Field
            label="Totalt antall innløsninger (tomt = ubegrenset)"
            type="number"
            min="1"
            value={max}
            onChange={(e) => setMax(e.target.value)}
          />
          <Field
            label="Maks per bruker"
            type="number"
            min="1"
            value={perUser}
            onChange={(e) => setPerUser(e.target.value)}
            required
          />
        </div>
        <label>
          Vilkår
          <textarea value={terms} onChange={(e) => setTerms(e.target.value)} />
        </label>
        {deal?.image_url && (
          <img className="cover" src={deal.image_url} alt="Tilbudsbilde" />
        )}
        <Field
          label="Tilbudsbilde (maks 5 MB)"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={(e) => setImage(e.target.files?.[0] ?? null)}
        />
        <label>
          Status
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as Deal["status"])}
          >
            <option value="draft">Utkast</option>
            <option value="active">Publisert</option>
            <option value="paused">Pauset</option>
            <option value="expired">Utløpt</option>
          </select>
        </label>
        {business.status !== "approved" && (
          <p className="notice">
            Tilbudet blir ikke synlig for brukere før bedriften er godkjent.
          </p>
        )}
        <div className="actions">
          <button type="submit">Lagre vennepris</button>
          <button type="button" className="quiet" onClick={cancel}>
            Avbryt
          </button>
        </div>
      </form>
    </section>
  );
}
function App() {
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
    const ds = unwrap(
      await db
        .from("deals")
        .select("*")
        .eq("business_id", id)
        .order("created_at", { ascending: false }),
    );
    setDeals(ds);
    setRedemptions(
      ds.length
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
        : [],
    );
  }
  useEffect(() => {
    setTab("overview");
    setEditing(null);
    if (session) void run(load);
  }, [session?.user.id]);
  useEffect(() => {
    setDeals([]);
    setRedemptions([]);
    setEditing(null);
    if (selected)
      void loadBusiness(selected).catch((e) => setError(message(e)));
  }, [selected]);
  async function reload() {
    await load();
    if (selected) await loadBusiness(selected);
  }
  return (
    <>
      <header>
        <a className="brand" href="/">
          <img src="/dinvenn-logo.png" alt="" className="brand-logo" />
          <span>DinVenn</span>
        </a>
        <span>FOR LOKALE BEDRIFTER</span>
        {session && (
          <button
            className="quiet"
            onClick={() =>
              void run(async () => {
                check(await db!.auth.signOut());
              })
            }
          >
            Logg ut
          </button>
        )}
      </header>
      <main aria-busy={busy}>
        {error && (
          <div className="alert" role="alert">
            {error}
            <button className="quiet" onClick={() => setError("")}>
              Lukk
            </button>
          </div>
        )}
        {notice && (
          <div className="notice" role="status">
            {notice}
          </div>
        )}
        {busy && <p role="status">Jobber …</p>}
        {!configured ? (
          <section className="card auth">
            <span className="eyebrow">DINVENN PILOT</span>
            <h1>
              En liten portal.
              <br />
              En stor forskjell lokalt.
            </h1>
            <p>
              Appen er klar for tilkobling til Supabase. Kopier{" "}
              <code>apps/portal/.env.example</code> til <code>.env</code> og
              fyll inn prosjektets URL og offentlige nøkkel.
            </p>
            <p>Se README for databaseoppsett og testkontoer.</p>
          </section>
        ) : !ready ? (
          <p>Laster innlogging …</p>
        ) : !session || recovery ? (
          <Auth
            db={db!}
            run={run}
            recovery={recovery}
            done={() => {
              setRecovery(false);
              history.replaceState(null, "", "/");
              setNotice("Passordet er oppdatert.");
            }}
          />
        ) : (
          <div className="layout">
            <aside>
              <p className="eyebrow">HEI, {profile?.display_name ?? "VENN"}!</p>
              <label>
                Din bedrift
                <select
                  value={selected}
                  onChange={(e) => {
                    setSelected(e.target.value);
                    setTab("overview");
                  }}
                >
                  {!businesses.length && (
                    <option value="">Ingen bedrifter ennå</option>
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
                  ["overview", "Oversikt"],
                  ["profile", "Bedriftsprofil"],
                  ["deals", "Vennepriser"],
                  ["redeem", "Løs inn kode"],
                  ["new", "Registrer bedrift"],
                  ...(profile?.role === "admin"
                    ? [["admin", "Godkjenning"]]
                    : []),
                ].map(([key, label]) => (
                  <button
                    className={tab === key ? "nav active" : "nav"}
                    key={key}
                    onClick={() => {
                      setTab(key);
                      setEditing(null);
                      setScanning(false);
                    }}
                  >
                    {label}
                  </button>
                ))}
              </nav>
              <button className="quiet" onClick={() => void run(reload)}>
                Oppdater data
              </button>
            </aside>
            <div className="content">
              {business && (
                <div className="pageheading">
                  <div>
                    <span className="eyebrow">DITT LOKALE HJØRNE</span>
                    <h1>{business.name}</h1>
                  </div>
                  <span className={`badge ${business.status}`}>
                    {
                      {
                        pending: "Venter på godkjenning",
                        approved: "Godkjent",
                        suspended: "Suspendert",
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
                    setNotice("Bedriften er sendt til godkjenning.");
                  }}
                />
              ) : tab === "admin" ? (
                <section className="card">
                  <h2>Bedriftsgodkjenning</h2>
                  {!adminBusinesses.length && <p>Ingen bedrifter ennå.</p>}
                  {adminBusinesses.map((b) => (
                    <article className="listitem" key={b.id}>
                      <div>
                        <strong>{b.name}</strong>
                        <p>
                          {b.city} · {businessStatusLabels[b.status]}
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
                                  setNotice("Bedriftsstatus oppdatert.");
                                })
                              }
                            >
                              {status === "approved" ? "Godkjenn" : "Suspender"}
                            </button>
                          ))}
                      </div>
                    </article>
                  ))}
                </section>
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
                    setNotice("Profilen er lagret.");
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
                      setNotice("Venneprisen er lagret.");
                    }}
                  />
                ) : (
                  <section className="card">
                    <div className="pageheading">
                      <h2>Venneprisene dine</h2>
                      <button onClick={() => setEditing("new")}>
                        + Ny vennepris
                      </button>
                    </div>
                    {!deals.length && (
                      <p>
                        Lag din første vennepris og gi folk en grunn til å komme
                        innom.
                      </p>
                    )}
                    {deals.map((d) => (
                      <article className="listitem" key={d.id}>
                        <div>
                          <strong>{d.title}</strong>
                          <p>
                            {discount(d)} · {contentStatusLabels[d.status]} ·{" "}
                            {
                              redemptions.filter(
                                (r) =>
                                  r.deal_id === d.id && r.status === "redeemed",
                              ).length
                            }{" "}
                            innløst
                          </p>
                        </div>
                        <div className="actions">
                          <button
                            className="quiet"
                            onClick={() => setEditing(d)}
                          >
                            Rediger
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
                            {d.status === "active" ? "Pause" : "Publiser"}
                          </button>
                        </div>
                      </article>
                    ))}
                  </section>
                )
              ) : tab === "redeem" ? (
                <section className="card">
                  <span className="eyebrow">VELKOMMEN INNOM</span>
                  <h2>Gjør en kode til et besøk</h2>
                  <p>
                    Skann kundens QR-kode eller lim inn koden. Kontroller koden
                    og trykk «Bekreft innløsning».
                  </p>
                  <button
                    className="quiet"
                    onClick={() => setScanning((s) => !s)}
                  >
                    {scanning ? "Stopp kamera" : "Åpne QR-skanner"}
                  </button>
                  {scanning && (
                    <Scanner
                      found={(code) => {
                        setToken(code);
                        setScanning(false);
                      }}
                      error={(e) => {
                        setError(
                          "Kunne ikke åpne kamera. Bruk HTTPS eller localhost, gi kameratilgang, eller lim inn kode. " +
                            message(e),
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
                          `Innløsning bekreftet: ${deals.find((d) => d.id === r.deal_id)?.title ?? "Vennepris"}.`,
                        );
                      });
                    }}
                  >
                    <Field
                      label="Kundens kode"
                      value={token}
                      onChange={(e) => setToken(e.target.value)}
                      required
                      autoComplete="off"
                    />
                    <button type="submit">Bekreft innløsning</button>
                  </form>
                </section>
              ) : (
                <>
                  <section className="hero">
                    <span className="eyebrow">SMÅ STEDER. GODE MØTER.</span>
                    <h2>
                      Din neste stamkunde
                      <br />
                      kan være rett rundt hjørnet.
                    </h2>
                    <p>Del en vennepris og gjør det lettere å velge lokalt.</p>
                    <button
                      onClick={() => {
                        setTab("deals");
                        setEditing("new");
                      }}
                    >
                      Lag en vennepris ↗
                    </button>
                  </section>
                  <div className="stats">
                    <section className="card">
                      <b>
                        {
                          deals.filter(
                            (d) =>
                              d.status === "active" &&
                              Date.parse(d.starts_at) <= Date.now() &&
                              (!d.ends_at ||
                                Date.parse(d.ends_at) > Date.now()),
                          ).length
                        }
                      </b>
                      <span>Aktive tilbud</span>
                    </section>
                    <section className="card">
                      <b>{redemptions.length}</b>
                      <span>Hentede koder</span>
                    </section>
                    <section className="card">
                      <b>
                        {
                          redemptions.filter((r) => r.status === "redeemed")
                            .length
                        }
                      </b>
                      <span>Innløsninger</span>
                    </section>
                  </div>
                  <section className="card">
                    <h2>Siste innløsninger</h2>
                    {!redemptions.some((r) => r.status === "redeemed") && (
                      <p>
                        Besøkene deres dukker opp her når en kode løses inn.
                      </p>
                    )}
                    {redemptions
                      .filter((r) => r.status === "redeemed")
                      .slice(0, 10)
                      .map((r) => (
                        <div className="listitem" key={r.id}>
                          <strong>
                            {deals.find((d) => d.id === r.deal_id)?.title ??
                              "Vennepris"}
                          </strong>
                          <time>
                            {new Date(r.redeemed_at!).toLocaleString("nb-NO")}
                          </time>
                        </div>
                      ))}
                  </section>
                </>
              )}
            </div>
          </div>
        )}
      </main>
      <footer>DinVenn ♥ Heia de lokale.</footer>
    </>
  );
}
createRoot(document.getElementById("root")!).render(<App />);
