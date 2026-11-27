import { useEffect, useState } from "react";
import {
  api,
  t,
  locale,
  message,
  type Client,
  type Review,
} from "@dinvenn/core";
import type { Run } from "./content";
export function ReviewsPanel({
  db,
  businessId,
  admin,
  run,
  busy,
}: {
  db: Client;
  businessId?: string;
  admin: boolean;
  run: Run;
  busy: boolean;
}) {
  const [rows, setRows] = useState<Review[]>([]);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  const [notice, setNotice] = useState("");
  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");
    setNotice("");
    setRows([]);
    setDrafts({});
    api(db)
      .reviews(businessId)
      .then((reviews) => {
        if (active) {
          setRows(reviews);
          setDrafts(
            Object.fromEntries(
              reviews.map((r) => [r.id, r.business_reply ?? ""]),
            ),
          );
        }
      })
      .catch((e) => {
        if (active) setError(message(e));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [db, businessId, retry]);
  async function reload() {
    setRows(await api(db).reviews(businessId));
  }
  return (
    <section className="card">
      <h2>{t(businessId ? "Anmeldelser" : "Moderering av anmeldelser")}</h2>
      <p>
        {t(
          "Du kan redigere eller slette bedriftens svar. Bare forfatteren og administrator kan slette selve anmeldelsen.",
        )}
      </p>
      <p>
        {t(
          "Diskriminerende og nedsettende ord er ikke tillatt i anmeldelser eller svar.",
        )}
      </p>
      {loading && <p role="status">{t("Laster anmeldelser …")}</p>}
      {error && (
        <div role="alert">
          {t(error)}{" "}
          <button className="quiet" onClick={() => setRetry((v) => v + 1)}>
            {t("Prøv igjen")}
          </button>
        </div>
      )}
      {notice && (
        <p className="notice" role="status">
          {t(notice)}
        </p>
      )}
      {!loading && !error && !rows.length && (
        <p>{t("Ingen anmeldelser ennå.")}</p>
      )}
      {rows.map((r) => (
        <article className="review-card" key={r.id}>
          {!businessId && <h3>{r.business_name}</h3>}
          <strong>
            {r.is_anonymous ? t("Anonym") : (r.author_name ?? t("Bruker"))}
          </strong>
          <p aria-label={t("{0} stjerner", r.rating)}>
            {"★".repeat(r.rating)}
            {"☆".repeat(5 - r.rating)} ·{" "}
            {new Date(r.created_at).toLocaleDateString(locale())}
          </p>
          <p className="review-text">{r.comment}</p>
          {r.business_reply && (
            <blockquote>
              <strong>{t("Svar fra bedriften")}</strong>
              <p className="review-text">{r.business_reply}</p>
            </blockquote>
          )}
          {businessId && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                void run(async () => {
                  setNotice("");
                  await api(db).reply(r.id, drafts[r.id] ?? "");
                  await reload();
                  setNotice("Svaret er lagret.");
                });
              }}
            >
              <label>
                {t("Bedriftens svar")}
                <textarea
                  aria-label={t(
                    "Svar på anmeldelse fra {0}",
                    r.is_anonymous
                      ? t("Anonym")
                      : (r.author_name ?? t("Bruker")),
                  )}
                  required
                  maxLength={1000}
                  value={drafts[r.id] ?? ""}
                  disabled={busy}
                  onChange={(e) =>
                    setDrafts((v) => ({ ...v, [r.id]: e.target.value }))
                  }
                />
              </label>
              <button
                disabled={busy || !(drafts[r.id] ?? "").trim()}
                type="submit"
              >
                {t("Lagre svar")}
              </button>
            </form>
          )}
          {businessId && r.business_reply && (
            <button
              type="button"
              className="quiet delete-button"
              disabled={busy}
              onClick={() => {
                if (
                  !window.confirm(
                    t(
                      "Vil du slette bedriftens svar? Kundens anmeldelse beholdes.",
                    ),
                  )
                )
                  return;
                void run(async () => {
                  setNotice("");
                  await api(db).deleteReply(r.id);
                  setDrafts((current) => ({ ...current, [r.id]: "" }));
                  setRows((current) =>
                    current.map((row) =>
                      row.id === r.id
                        ? { ...row, business_reply: null, replied_at: null }
                        : row,
                    ),
                  );
                  setNotice("Svaret er slettet.");
                });
              }}
            >
              {t("Slett bedriftens svar")}
            </button>
          )}
          {admin && (
            <button
              type="button"
              className="quiet delete-button"
              disabled={busy}
              onClick={() => {
                if (
                  !window.confirm(
                    t("Vil du slette anmeldelsen? Dette kan ikke angres."),
                  )
                )
                  return;
                void run(async () => {
                  setNotice("");
                  await api(db).deleteReview(r.id);
                  await reload();
                  setNotice("Anmeldelsen er slettet.");
                });
              }}
            >
              {t("Slett anmeldelse")}
            </button>
          )}
        </article>
      ))}
    </section>
  );
}
