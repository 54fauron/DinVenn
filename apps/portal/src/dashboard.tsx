import { t, locale } from "@dinvenn/core";
import { discount, type Deal, type Redemption } from "@dinvenn/core";
import {
  dateLabel,
  Status,
  type BusinessEvent,
  type NewsPost,
} from "./content";
export function NavIcon({ name }: { name: string }) {
  const paths: Record<string, string> = {
    overview: "M3 3h7v7H3z M14 3h7v7h-7z M3 14h7v7H3z M14 14h7v7h-7z",
    profile: "M3 10h18 M5 10v11h14V10 M3 10l2-7h14l2 7 M9 21v-7h6v7",
    deals: "M3 3h8l10 10-8 8L3 11z M7 7h.01",
    events: "M4 5h16v16H4z M8 2v6 M16 2v6 M4 10h16 M8 14h2 M14 14h2 M8 18h2",
    news: "M4 3h13v18H4z M17 7h4v12a2 2 0 0 1-2 2 M8 7h5 M8 11h5 M8 15h5",
    redeem:
      "M3 8V3h5 M16 3h5v5 M21 16v5h-5 M8 21H3v-5 M7 7h3v3H7z M14 7h3v3h-3z M7 14h3v3H7z M14 14h3v3h-3z",
    subscription: "M3 5h18v14H3z M3 10h18 M6 15h4",
    new: "M12 3v18 M3 12h18",
    admin: "M12 2l8 4v6c0 5-8 10-8 10S4 17 4 12V6z M8 12l3 3 5-6",
  };
  return (
    <svg
      className="nav-icon"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={paths[name] ?? paths.overview} />
    </svg>
  );
}
const osloDateFormat = new Intl.DateTimeFormat("sv-SE", {
  timeZone: "Europe/Oslo",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});
const osloDay = (value: Date) => osloDateFormat.format(value);
export function Dashboard({
  deals,
  redemptions,
  events,
  news,
  onNewDeal,
  onDeals,
  onEditDeal,
  onEvents,
  onNews,
}: {
  deals: Deal[];
  redemptions: Redemption[];
  events: BusinessEvent[];
  news: NewsPost[];
  onNewDeal: () => void;
  onDeals: () => void;
  onEditDeal: (deal: Deal) => void;
  onEvents: () => void;
  onNews: () => void;
}) {
  const now = Date.now();
  const active = deals.filter(
    (d) =>
      d.status === "active" &&
      Date.parse(d.starts_at) <= now &&
      (!d.ends_at || Date.parse(d.ends_at) > now),
  );
  const redeemed = redemptions.filter((r) => r.status === "redeemed");
  const upcoming = events
    .filter((e) => e.status === "active" && Date.parse(e.starts_at) >= now)
    .sort((a, b) => Date.parse(a.starts_at) - Date.parse(b.starts_at));
  const today = new Date(osloDay(new Date()) + "T12:00:00Z");
  const days = Array.from({ length: 7 }, (_, i) => {
    const date = new Date(today.getTime() - (6 - i) * 86400000);
    const key = osloDay(date);
    return {
      key,
      date,
      count: redeemed.filter(
        (r) => r.redeemed_at && osloDay(new Date(r.redeemed_at)) === key,
      ).length,
    };
  });
  const peak = Math.max(1, ...days.map((d) => d.count));
  const total = days.reduce((sum, d) => sum + d.count, 0);
  const stats = [
    [
      t("Aktive vennepriser"),
      active.length,
      t("Tilbud som gjelder akkurat nå"),
      "deals",
    ],
    [
      t("Hentede koder"),
      redemptions.length,
      t("Alle hentinger hos dere"),
      "redeem",
    ],
    [
      t("Innløst i butikk"),
      redeemed.length,
      t("Bekreftede besøk, totalt"),
      "profile",
    ],
    [
      t("Kommende arrangementer"),
      upcoming.length,
      t("Publisert og klar til å deles"),
      "events",
    ],
  ] as const;
  return (
    <>
      <section className="dashboard-welcome">
        <div>
          <span className="eyebrow">{t("HEIA DE LOKALE")}</span>
          <h2>{t("Gode tilbud. Nye bekjentskaper.")}</h2>
          <p>
            {" "}
            {t(
              "Her er det som skjer hos dere. Gjør neste besøk til starten på noe fint.",
            )}{" "}
          </p>
        </div>
        <button onClick={onNewDeal}>{t("+ Ny vennepris")}</button>
      </section>
      <div className="stats dashboard-stats">
        {stats.map(([label, value, caption, icon]) => (
          <section key={label} className="card stat-card">
            <div className="stat-heading">
              <span>{label}</span>
              <span className="stat-icon">
                <NavIcon name={icon} />
              </span>
            </div>
            <b>{value}</b>
            <small>{caption}</small>
          </section>
        ))}
      </div>
      <div className="dashboard-columns">
        <section className="card offers-panel">
          <div className="section-heading">
            <div>
              <h2>{t("Venneprisene dine")}</h2>
              <p>{t("Et lite overblikk over tilbudene deres.")}</p>
            </div>
            <button className="text-button" onClick={onDeals}>
              {" "}
              {t("Se alle →")}{" "}
            </button>
          </div>
          {!deals.length ? (
            <div className="empty-state">
              <h3>{t("Den første venneprisen venter")}</h3>
              <p>{t("Inviter noen innom med et godt tilbud.")}</p>
              <button className="quiet" onClick={onNewDeal}>
                {" "}
                {t("Lag en vennepris")}{" "}
              </button>
            </div>
          ) : (
            <div className="table-scroll">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>{t("Tilbud")}</th>
                    <th>{t("Slutter")}</th>
                    <th>{t("Innløst")}</th>
                    <th>{t("Status")}</th>
                    <th>
                      <span className="sr-only">{t("Handling")}</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {deals.slice(0, 5).map((d) => (
                    <tr key={d.id}>
                      <td>
                        <strong>{d.title}</strong>
                        <span className="table-subtitle">{discount(d)}</span>
                      </td>
                      <td>
                        {d.ends_at
                          ? new Date(d.ends_at).toLocaleDateString(locale(), {
                              day: "numeric",
                              month: "short",
                            })
                          : "–"}
                      </td>
                      <td>
                        {redeemed.filter((r) => r.deal_id === d.id).length}
                      </td>
                      <td>
                        <Status
                          status={
                            d.status === "active" &&
                            d.ends_at &&
                            Date.parse(d.ends_at) <= now
                              ? "expired"
                              : d.status
                          }
                        />
                      </td>
                      <td>
                        <button
                          className="text-button"
                          aria-label={t("Rediger {0}", d.title)}
                          onClick={() => onEditDeal(d)}
                        >
                          {" "}
                          {t("Rediger")}{" "}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
        <section className="card chart-panel">
          <div className="section-heading">
            <div>
              <h2>{t("Innløsninger")}</h2>
              <p>{t("Siste 7 dager · norsk tid")}</p>
            </div>
            <span className="chart-total">{total}</span>
          </div>
          <div
            className="bar-chart"
            role="img"
            aria-label={t(
              "Innløsninger siste 7 dager: {0}",
              days.map((d) => `${d.key}: ${d.count}`).join(", "),
            )}
          >
            {days.map((d) => (
              <div className="chart-column" key={d.key}>
                <span className="bar-number">{d.count}</span>
                <div className="bar-track">
                  <span
                    className="bar"
                    style={{ height: `${(d.count / peak) * 100}%` }}
                  />
                </div>
                <span className="day-label">
                  {new Intl.DateTimeFormat(locale(), {
                    timeZone: "Europe/Oslo",
                    weekday: "short",
                  }).format(d.date)}
                </span>
              </div>
            ))}
          </div>
          {!total && (
            <p className="chart-note">
              {" "}
              {t(
                "Her vokser grafen når kundene bruker venneprisene deres.",
              )}{" "}
            </p>
          )}
        </section>
      </div>
      <div className="dashboard-columns lower-panels">
        <section className="card">
          <div className="section-heading">
            <div>
              <span className="eyebrow">{t("NOE Å GLEDE SEG TIL")}</span>
              <h2>{t("Kommende arrangementer")}</h2>
            </div>
            <button className="text-button" onClick={onEvents}>
              {" "}
              {t("Se alle →")}{" "}
            </button>
          </div>
          {!upcoming.length ? (
            <div className="empty-state compact">
              <p>
                {" "}
                {t(
                  "Skap et møtepunkt. Inviter til en workshop, et marked eller en hyggelig kveld.",
                )}{" "}
              </p>
              <button className="quiet" onClick={onEvents}>
                {" "}
                {t("Lag et arrangement")}{" "}
              </button>
            </div>
          ) : (
            upcoming.slice(0, 3).map((e) => (
              <div key={e.id} className="agenda-row">
                <div className="date-tile">
                  <b>
                    {new Date(e.starts_at).toLocaleDateString(locale(), {
                      day: "numeric",
                    })}
                  </b>
                  <span>
                    {new Date(e.starts_at).toLocaleDateString(locale(), {
                      month: "short",
                    })}
                  </span>
                </div>
                <div>
                  <h3>{e.title}</h3>
                  <small>
                    {dateLabel(e.starts_at)} · {e.price_text ?? t("Gratis")}
                  </small>
                </div>
              </div>
            ))
          )}
        </section>
        <section className="card">
          <div className="section-heading">
            <div>
              <span className="eyebrow">{t("DET SISTE FRA DERE")}</span>
              <h2>{t("Nyheter og oppdateringer")}</h2>
            </div>
            <button className="text-button" onClick={onNews}>
              {" "}
              {t("Se alle →")}{" "}
            </button>
          </div>
          {!news.length ? (
            <div className="empty-state compact">
              <p>
                {" "}
                {t(
                  "En ny rett på menyen? Nye priser? Del det med kundene deres.",
                )}{" "}
              </p>
              <button className="quiet" onClick={onNews}>
                {" "}
                {t("Skriv en nyhet")}{" "}
              </button>
            </div>
          ) : (
            news.slice(0, 3).map((n) => (
              <div className="news-summary" key={n.id}>
                <div>
                  <h3>{n.title}</h3>
                  <small>{dateLabel(n.published_at)}</small>
                </div>
                <Status status={n.status} />
              </div>
            ))
          )}
        </section>
      </div>
      <section className="card">
        <div className="section-heading">
          <div>
            <h2>{t("Siste innløsninger")}</h2>
            <p>{t("Små koder som blir til lokale besøk.")}</p>
          </div>
          <span className="subtle-tag">
            {redeemed.length} {t("totalt")}
          </span>
        </div>
        {!redeemed.length ? (
          <p className="muted">
            {" "}
            {t("Besøkene deres dukker opp her når en kode løses inn.")}{" "}
          </p>
        ) : (
          redeemed.slice(0, 5).map((r) => (
            <div key={r.id} className="redemption-row">
              <span className="redemption-check" aria-hidden="true">
                ✓
              </span>
              <strong>
                {deals.find((d) => d.id === r.deal_id)?.title ?? t("Vennepris")}
              </strong>
              <time>{dateLabel(r.redeemed_at)}</time>
            </div>
          ))
        )}
      </section>
    </>
  );
}
