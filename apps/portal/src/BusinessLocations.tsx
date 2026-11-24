import React, { useEffect, useRef, useState } from "react";
import {
  api,
  message,
  t,
  addressIdentity,
  storedPoint,
  type BusinessLocation,
  type Client,
  type Point,
} from "@dinvenn/core";
const AddressMap = React.lazy(() => import("./AddressMap"));
type Draft = {
  id: string;
  existing: boolean;
  name: string;
  address: string;
  postal_code: string;
  city: string;
};
export function BusinessLocations({
  db,
  businessId,
}: {
  db: Client;
  businessId: string;
}) {
  const [rows, setRows] = useState<BusinessLocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [retry, setRetry] = useState(0);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [pin, setPin] = useState<{ address: string; point: Point | null }>({
    address: "",
    point: null,
  });
  useEffect(() => {
    let active = true;
    setLoading(true);
    setLoadFailed(false);
    setError("");
    void api(db)
      .businessLocations(businessId)
      .then((data) => {
        if (active) setRows(data);
      })
      .catch((e) => {
        if (active) {
          setError(message(e));
          setLoadFailed(true);
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [db, businessId, retry]);
  async function run(action: () => Promise<void>) {
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
  }
  function edit(row?: BusinessLocation) {
    const next: Draft = row
      ? { ...row, existing: true }
      : {
          id: crypto.randomUUID(),
          existing: false,
          name: "",
          address: "",
          postal_code: "",
          city: "",
        };
    setDraft(next);
    setPin({
      address: addressIdentity(next),
      point: row ? storedPoint(row) : null,
    });
    setError("");
    setNotice("");
  }
  const point =
    draft && pin.address === addressIdentity(draft) ? pin.point : null;
  return (
    <section className="business-locations" aria-labelledby="locations-heading">
      <h3 id="locations-heading">{t("Avdelinger og flere adresser")}</h3>
      <p className="muted">
        {t(
          "Hovedadressen redigeres i profilen over. Legg til andre lokaler her. Avdelingene deler bedriftsprofil og tilbud.",
        )}
      </p>
      {loading && <p role="status">{t("Laster avdelinger …")}</p>}
      {error && (
        <div className="alert" role="alert">
          {t(error)}{" "}
          <button type="button" className="quiet" onClick={() => setError("")}>
            {t("Lukk")}
          </button>
        </div>
      )}
      {notice && (
        <p className="notice" role="status">
          {t(notice)}
        </p>
      )}
      {loadFailed ? (
        <button
          type="button"
          className="quiet"
          onClick={() => setRetry((v) => v + 1)}
        >
          {t("Prøv igjen")}
        </button>
      ) : (
        <>
          {!loading && !rows.length && (
            <p>{t("Ingen ekstra avdelinger ennå.")}</p>
          )}
          <div className="location-list">
            {rows.map((row) => (
              <article className="location-card" key={row.id}>
                <div>
                  <h4>{row.name}</h4>
                  <p>
                    {row.address}
                    <br />
                    {row.postal_code} {row.city}
                  </p>
                </div>
                <div className="actions">
                  <button
                    type="button"
                    className="quiet"
                    disabled={busy || !!draft}
                    aria-label={t("Rediger avdeling {0}", row.name)}
                    onClick={() => edit(row)}
                  >
                    {t("Rediger")}
                  </button>
                  <button
                    type="button"
                    className="quiet"
                    disabled={busy || !!draft}
                    aria-label={t("Slett avdeling {0}", row.name)}
                    onClick={() => {
                      if (
                        !window.confirm(
                          t(
                            "Vil du slette avdelingen {0}? Hovedadressen og tilbudene beholdes.",
                            row.name,
                          ),
                        )
                      )
                        return;
                      void run(async () => {
                        await api(db).deleteBusinessLocation(
                          businessId,
                          row.id,
                        );
                        setRows((current) =>
                          current.filter((r) => r.id !== row.id),
                        );
                        setNotice(t("Avdelingen er slettet."));
                      });
                    }}
                  >
                    {t("Slett")}
                  </button>
                </div>
              </article>
            ))}
          </div>
          {!draft && (
            <button
              type="button"
              className="quiet"
              disabled={loading || busy}
              onClick={() => edit()}
            >
              {t("Legg til avdeling")}
            </button>
          )}
        </>
      )}
      {draft && (
        <form
          className="location-editor"
          aria-label={t("Avdelingsskjema")}
          onSubmit={(e) => {
            e.preventDefault();
            void run(async () => {
              const values = {
                name: draft.name.trim(),
                address: draft.address.trim(),
                postal_code: draft.postal_code.trim(),
                city: draft.city.trim(),
                lat: point?.latitude ?? null,
                lng: point?.longitude ?? null,
              };
              if (!values.name || !values.address || !values.city)
                throw new Error(t("Fyll ut alle påkrevde felt."));
              if (!/^\d{4}$/.test(values.postal_code))
                throw new Error(t("Postnummer må ha fire sifre."));
              const saved = await api(db).saveBusinessLocation(
                businessId,
                draft.id,
                values,
                draft.existing,
              );
              setRows((current) =>
                draft.existing
                  ? current.map((r) => (r.id === saved.id ? saved : r))
                  : [...current, saved],
              );
              setDraft(null);
              setNotice(t("Avdelingen er lagret."));
            });
          }}
        >
          <h4>{t(draft.existing ? "Rediger avdeling" : "Ny avdeling")}</h4>
          <fieldset disabled={busy}>
            <div className="formgrid">
              {(
                [
                  ["name", "Avdelingsnavn"],
                  ["address", "Avdelingsadresse"],
                  ["postal_code", "Avdelingens postnummer"],
                  ["city", "Avdelingens by"],
                ] as const
              ).map(([key, label]) => (
                <label key={key}>
                  <span className="field-label">
                    {t(label)}{" "}
                    <span className="required-marker" aria-hidden="true">
                      *
                    </span>
                  </span>
                  <input
                    aria-label={t(label)}
                    required
                    maxLength={
                      key === "postal_code" ? 4 : key === "address" ? 250 : 120
                    }
                    inputMode={key === "postal_code" ? "numeric" : undefined}
                    pattern={key === "postal_code" ? "[0-9]{4}" : undefined}
                    value={draft[key]}
                    onChange={(e) => {
                      const value = e.target.value;
                      setDraft((current) =>
                        current ? { ...current, [key]: value } : null,
                      );
                    }}
                  />
                </label>
              ))}
            </div>
          </fieldset>
          <React.Suspense fallback={<p role="status">{t("Laster kart …")}</p>}>
            <AddressMap
              address={draft}
              point={point}
              onChange={(next) =>
                setPin({ address: addressIdentity(draft), point: next })
              }
            />
          </React.Suspense>
          <div className="actions">
            <button type="submit" disabled={busy}>
              {t(busy ? "Jobber …" : "Lagre avdeling")}
            </button>
            <button
              type="button"
              className="quiet"
              disabled={busy}
              onClick={() => {
                setDraft(null);
                setError("");
              }}
            >
              {t("Avbryt")}
            </button>
          </div>
        </form>
      )}
    </section>
  );
}
