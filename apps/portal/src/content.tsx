import { t, locale } from "@dinvenn/core";
import { useEffect, useState } from "react";
import {
  api,
  unwrap,
  contentStatusLabels,
  type Business,
  type Client,
  type ContentStatus,
  type Database,
} from "@dinvenn/core";
export type BusinessEvent = Database["public"]["Tables"]["events"]["Row"];
export type NewsPost = Database["public"]["Tables"]["news_posts"]["Row"];
export type Subscription = Pick<
  Database["public"]["Tables"]["subscriptions"]["Row"],
  "id" | "plan" | "status" | "current_period_end"
>;
export type Run = (action: () => Promise<void>) => Promise<void>;
export function useImagePreview(file: File | null, original: string | null) {
  const [url, setUrl] = useState(original);
  useEffect(() => {
    if (!file) {
      setUrl(original);
      return;
    }
    const next = URL.createObjectURL(file);
    setUrl(next);
    return () => URL.revokeObjectURL(next);
  }, [file, original]);
  return url;
}
export function localDate(value: string) {
  const date = new Date(value);
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 16);
}
export function dateLabel(value: string | null) {
  return value
    ? new Date(value).toLocaleString(locale(), {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : t("Ingen sluttdato");
}
export function Status({ status }: { status: ContentStatus }) {
  return (
    <span className={`content-status ${status}`}>
      {t(contentStatusLabels[status])}
    </span>
  );
}
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
function ContentEditor({
  db,
  business,
  kind,
  item,
  run,
  busy,
  saved,
  cancel,
}: {
  db: Client;
  business: Business;
  kind: "events" | "news_posts";
  item?: BusinessEvent | NewsPost;
  run: Run;
  busy: boolean;
  saved: () => Promise<void>;
  cancel: () => void;
}) {
  const isEvent = kind === "events";
  const event = item && "starts_at" in item ? item : undefined;
  const [title, setTitle] = useState(item?.title ?? "");
  const [body, setBody] = useState(
    item ? ("body" in item ? (item.body ?? "") : (item.description ?? "")) : "",
  );
  const [start, setStart] = useState(
    localDate(
      event?.starts_at ?? new Date(Date.now() + 86400000).toISOString(),
    ),
  );
  const [end, setEnd] = useState(
    event?.ends_at ? localDate(event.ends_at) : "",
  );
  const [place, setPlace] = useState(
    event?.location_text ?? business.address ?? "",
  );
  const [price, setPrice] = useState(event?.price_text ?? t("Gratis"));
  const [ticket, setTicket] = useState(event?.ticket_url ?? "");
  const [file, setFile] = useState<File | null>(null);
  const previewImage = useImagePreview(file, item?.image_url ?? null);
  const [status, setStatus] = useState<ContentStatus>(item?.status ?? "draft");
  async function save() {
    if (!title.trim()) throw new Error(t("Skriv en tittel."));
    if (!body.trim())
      throw new Error(
        isEvent ? t("Beskriv arrangementet.") : t("Skriv nyhetsteksten."),
      );
    if (
      isEvent &&
      (!start ||
        !Number.isFinite(Date.parse(start)) ||
        (end &&
          (!Number.isFinite(Date.parse(end)) ||
            Date.parse(end) <= Date.parse(start))))
    )
      throw new Error(t("Velg gyldig starttid. Slutt må være etter start."));
    if (ticket && !/^https?:\/\//i.test(ticket))
      throw new Error(t("Billettlenken må starte med https:// eller http://."));
    const image_url = file
      ? await api(db).upload(business.id, file)
      : (item?.image_url ?? null);
    if (isEvent) {
      const values = {
        business_id: business.id,
        title: title.trim(),
        description: body.trim(),
        starts_at: new Date(start).toISOString(),
        ends_at: end ? new Date(end).toISOString() : null,
        location_text: place.trim() || business.address,
        price_text: price.trim() || t("Gratis"),
        ticket_url: ticket.trim() || null,
        image_url,
        status,
      };
      unwrap(
        item
          ? await db
              .from("events")
              .update(values)
              .eq("id", item.id)
              .eq("business_id", business.id)
              .select()
              .single()
          : await db.from("events").insert(values).select().single(),
      );
    } else {
      const values = {
        business_id: business.id,
        title: title.trim(),
        body: body.trim(),
        image_url,
        status,
        ...(status === "active" && (!item || item.status === "draft")
          ? { published_at: new Date().toISOString() }
          : {}),
      };
      unwrap(
        item
          ? await db
              .from("news_posts")
              .update(values)
              .eq("id", item.id)
              .eq("business_id", business.id)
              .select()
              .single()
          : await db.from("news_posts").insert(values).select().single(),
      );
    }
    await saved();
  }
  return (
    <section className="card editor-card">
      <div className="section-heading">
        <div>
          <span className="eyebrow">
            {isEvent ? t("SAMLE FOLK") : t("HOLD KONTAKTEN")}
          </span>
          <h2>
            {item ? t("Rediger") : isEvent ? t("Nytt") : t("Ny")}{" "}
            {isEvent ? "arrangement" : "nyhet"}
          </h2>
        </div>
        <button className="quiet" onClick={cancel} disabled={busy}>
          {" "}
          {t("← Tilbake")}{" "}
        </button>
      </div>
      <div className="editor-layout">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void run(save);
          }}
        >
          <fieldset disabled={busy}>
            <Field
              label={t("Tittel")}
              value={title}
              maxLength={160}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={
                isEvent
                  ? "F.eks. latte art-workshop"
                  : t("F.eks. møt den nye lunsjmenyen")
              }
              required
            />
            <label>
              {isEvent ? t("Beskrivelse") : t("Nyhetstekst")}
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                rows={6}
                required
                placeholder={
                  isEvent
                    ? t("Hva skjer, og hvem passer det for?")
                    : t(
                        "Fortell om nye retter, nye åpningstider eller andre oppdateringer.",
                      )
                }
              />
            </label>
            {isEvent && (
              <>
                <div className="formgrid">
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
                </div>
                <Field
                  label={t("Sted / adresse")}
                  value={place}
                  onChange={(e) => setPlace(e.target.value)}
                />
                <div className="formgrid">
                  <Field
                    label={t("Pris")}
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    placeholder={t("Gratis / 150 kr")}
                  />
                  <Field
                    label={t("Billettlenke (valgfritt)")}
                    type="url"
                    value={ticket}
                    onChange={(e) => setTicket(e.target.value)}
                  />
                </div>
              </>
            )}
            <Field
              label={t("Bilde (JPG, PNG eller WebP, maks 5 MB)")}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
            {file && (
              <p className="muted">
                {t("Valgt bilde:")} {file.name}
              </p>
            )}
            <label>
              {" "}
              {t("Status")}{" "}
              <select
                aria-label={t("Status")}
                value={status}
                onChange={(e) => setStatus(e.target.value as ContentStatus)}
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
                  "Innholdet blir synlig først når bedriften er godkjent.",
                )}{" "}
              </p>
            )}
            <div className="actions">
              <button type="submit">
                {status === "active"
                  ? t("Lagre og publiser")
                  : t("Lagre ") + (isEvent ? "arrangement" : "nyhet")}
              </button>
              <button type="button" className="quiet" onClick={cancel}>
                {" "}
                {t("Avbryt")}{" "}
              </button>
            </div>
          </fieldset>
        </form>
        <section className="preview-panel">
          <span className="eyebrow">{t("FORHÅNDSVISNING")}</span>
          <article className="content-preview">
            {previewImage ? (
              <img
                src={previewImage}
                className="cover"
                alt={t("Innholdsbilde")}
              />
            ) : (
              <div
                className={`preview-placeholder ${isEvent ? "event" : "news"}`}
                aria-hidden="true"
              >
                {isEvent ? "✦" : "✎"}
              </div>
            )}
            <div className="preview-body">
              <span className="eyebrow">{business.name}</span>
              <h3>
                {title ||
                  (isEvent
                    ? t("Ditt neste arrangement")
                    : t("En nyhet fra dere"))}
              </h3>
              <p className="preserve-lines">
                {body || t("Teksten du skriver vises her.")}
              </p>
              {isEvent && (
                <>
                  <p>
                    {start
                      ? dateLabel(new Date(start).toISOString())
                      : t("Velg tidspunkt")}
                  </p>
                  <small>
                    {place} · {price || t("Gratis")}
                  </small>
                </>
              )}
              <Status status={status} />
            </div>
          </article>
          <p className="muted">
            {" "}
            {t(
              "Innholdet lagres i bedriftens felles database. Dette er en forhåndsvisning av teksten og bildet.",
            )}{" "}
          </p>
        </section>
      </div>
    </section>
  );
}
export function ContentManager({
  db,
  business,
  kind,
  items,
  run,
  busy,
  reload,
}: {
  db: Client;
  business: Business;
  kind: "events" | "news_posts";
  items: BusinessEvent[] | NewsPost[];
  run: Run;
  busy: boolean;
  reload: () => Promise<void>;
}) {
  const [editing, setEditing] = useState<
    BusinessEvent | NewsPost | "new" | null
  >(null);
  const [filter, setFilter] = useState("all");
  const [query, setQuery] = useState("");
  const isEvent = kind === "events";
  const visible = items.filter(
    (i) =>
      (filter === "all" || i.status === filter) &&
      `${i.title} ${"body" in i ? i.body : i.description}`
        .toLocaleLowerCase("nb-NO")
        .includes(query.toLocaleLowerCase("nb-NO")),
  );
  if (editing)
    return (
      <ContentEditor
        db={db}
        business={business}
        kind={kind}
        item={editing === "new" ? undefined : editing}
        run={run}
        busy={busy}
        saved={async () => {
          await reload();
          setEditing(null);
        }}
        cancel={() => setEditing(null)}
      />
    );
  return (
    <section className="card">
      <div className="section-heading">
        <div>
          <h2>{isEvent ? t("Arrangementer") : t("Nyheter")}</h2>
          <p>
            {isEvent
              ? t("Gi folk noe å glede seg til.")
              : t("Små oppdateringer som holder kundene nær.")}
          </p>
        </div>
        <button disabled={busy} onClick={() => setEditing("new")}>
          + {isEvent ? t("Nytt arrangement") : t("Ny nyhet")}
        </button>
      </div>
      <div className="list-toolbar">
        <Field
          label={isEvent ? t("Søk i arrangementer") : t("Søk i nyheter")}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t("Søk etter tittel eller tekst …")}
        />
        <label>
          {" "}
          {t("Vis status")}{" "}
          <select value={filter} onChange={(e) => setFilter(e.target.value)}>
            <option value="all">{t("Alle")}</option>
            {Object.entries(contentStatusLabels).map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>
        </label>
      </div>
      {!visible.length ? (
        <div className="empty-state">
          <div className="empty-icon" aria-hidden="true">
            {isEvent ? "✦" : "✎"}
          </div>
          <h3>
            {items.length
              ? t("Ingen treff")
              : isEvent
                ? t("Inviter til noe hyggelig")
                : t("Hva er nytt hos dere?")}
          </h3>
          <p>
            {items.length
              ? t("Prøv et annet søk eller statusfilter.")
              : isEvent
                ? t(
                    "En workshop, en konsert eller en kveld litt utenom det vanlige.",
                  )
                : t(
                    "Del en ny rett, oppdaterte priser eller en liten historie fra bedriften.",
                  )}
          </p>
        </div>
      ) : (
        <div className="content-list">
          {visible.map((item) => (
            <article className="content-row" key={item.id}>
              {item.image_url ? (
                <img className="content-thumb" src={item.image_url} alt="" />
              ) : (
                <div
                  className={`content-thumb placeholder ${isEvent ? "event" : "news"}`}
                  aria-hidden="true"
                >
                  {isEvent ? "✦" : "✎"}
                </div>
              )}
              <div className="content-row-body">
                <h3>{item.title}</h3>
                <p className="excerpt">
                  {"body" in item ? item.body : item.description}
                </p>
                <small>
                  {"starts_at" in item
                    ? `${dateLabel(item.starts_at)} · ${item.location_text ?? business.address ?? ""} · ${item.price_text ?? t("Gratis")}`
                    : t("Publiseringsdato: {0}", dateLabel(item.published_at))}
                </small>
              </div>
              <Status status={item.status} />
              <div className="actions">
                <button
                  className="quiet small-button"
                  disabled={busy}
                  onClick={() => setEditing(item)}
                >
                  {" "}
                  {t("Rediger")}{" "}
                </button>
                <button
                  className="quiet small-button"
                  disabled={busy}
                  onClick={() =>
                    void run(async () => {
                      const nextStatus =
                        item.status === "active" ? "paused" : "active";
                      const operation = isEvent
                        ? db.from("events").update({ status: nextStatus })
                        : db.from("news_posts").update({
                            status: nextStatus,
                            ...(item.status === "draft"
                              ? { published_at: new Date().toISOString() }
                              : {}),
                          });
                      unwrap(
                        await operation
                          .eq("id", item.id)
                          .eq("business_id", business.id)
                          .select()
                          .single(),
                      );
                      await reload();
                    })
                  }
                >
                  {item.status === "active" ? t("Pause") : t("Publiser")}
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
export function SubscriptionPage({
  subscription,
}: {
  subscription: Subscription | null;
}) {
  const status =
    subscription?.status === "trialing"
      ? t("Prøveperiode")
      : subscription?.status === "active"
        ? t("Aktivt")
        : subscription?.status === "canceled"
          ? t("Avsluttet")
          : subscription?.status === "past_due"
            ? t("Forfalt")
            : subscription?.status
              ? t("Ikke aktivt")
              : t("Ikke opprettet");
  return (
    <>
      <section className="subscription-intro">
        <span className="eyebrow">{t("VOKS SAMMEN MED OSS")}</span>
        <h2>
          {" "}
          {t("Små bedrifter.")} <br /> {t("Store muligheter.")}{" "}
        </h2>
        <p>
          {" "}
          {t(
            "DinVenn skal gjøre det enkelt å bli oppdaget, få besøk og bygge et lokalt fellesskap.",
          )}{" "}
        </p>
      </section>
      <section className="card subscription-current">
        <div>
          <span className="eyebrow">{t("REGISTRERT ABONNEMENT")}</span>
          <h3>
            {subscription
              ? subscription.plan === "plus"
                ? t("Pluss")
                : t("Basis")
              : t("Ingen abonnement registrert")}
          </h3>
          <p>
            {status}
            {subscription?.current_period_end
              ? t(
                  " · Periode til {0}",
                  dateLabel(subscription.current_period_end),
                )
              : ""}
          </p>
        </div>
        <span className="content-status draft">{t("Pilot")}</span>
      </section>
      <div className="notice">
        {" "}
        {t(
          "Prisene og pakkene under er forslag. Betaling er ikke åpnet, og du blir ikke belastet. Funksjonsgrenser er ikke aktivert i piloten.",
        )}{" "}
      </div>
      <div className="pricing-grid">
        {[
          {
            name: t("Basis"),
            price: 199,
            caption: t("Et godt sted å begynne"),
            features: [
              t("Bedriftsprofil med bilder"),
              t("Forslag: 2 aktive vennepriser"),
              t("Arrangementer og nyheter"),
              t("QR-innløsning"),
            ],
          },
          {
            name: t("Pluss"),
            price: 399,
            caption: t("Mer plass til å vokse"),
            features: [
              t("Alt i Basis"),
              t("Forslag: ubegrenset antall vennepriser"),
              t("Forslag: fremhevet plassering"),
              t("Forslag: utvidet statistikk"),
            ],
          },
        ].map((plan, i) => (
          <section
            key={plan.name}
            className={`card price-card ${i ? "featured-plan" : ""}`}
          >
            <span className="eyebrow">
              {i ? t("FOR DEG SOM VIL MER") : t("DIN LOKALE START")}
            </span>
            <h3>{plan.name}</h3>
            <p>{plan.caption}</p>
            <div className="price">
              {plan.price}
              <span> {t("kr / måned")}</span>
            </div>
            <small>
              {t("Prisforslag · avgiftsbehandling fastsettes før salg")}
            </small>
            <ul>
              {plan.features.map((f) => (
                <li key={f}>{f}</li>
              ))}
            </ul>
            <button disabled>{t("Kommer senere")}</button>
          </section>
        ))}
      </div>
      <section className="card">
        <h3>{t("Ingen betaling i piloten")}</h3>
        <p>
          {" "}
          {t(
            "Du kan teste publisering og innløsning nå. Endelige priser, vilkår og en betalingsløsning settes opp før betalte abonnementer åpnes.",
          )}{" "}
        </p>
      </section>
    </>
  );
}
