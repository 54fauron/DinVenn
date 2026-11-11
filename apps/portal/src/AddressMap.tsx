import { t, locale } from "@dinvenn/core";
import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import {
  addressIdentity,
  addressSearchUrl,
  chooseAddressPoint,
  validPoint,
  type AddressHit,
  type Point,
} from "@dinvenn/core";
import "leaflet/dist/leaflet.css";
type Address = { address: string; city: string; postal_code: string };
export default function AddressMap({
  address,
  point,
  onChange,
}: {
  address: Address;
  point: Point | null;
  onChange: (point: Point | null) => void;
}) {
  const container = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const marker = useRef<L.Marker | null>(null);
  const callback = useRef(onChange);
  callback.current = onChange;
  const controller = useRef<AbortController | null>(null);
  const epoch = useRef(0);
  const [retry, setRetry] = useState(0);
  const [phase, setPhase] = useState<
    "empty" | "loading" | "ready" | "missing" | "error"
  >(point ? "ready" : "empty");
  const [tilesFailed, setTilesFailed] = useState(false);
  const identity = addressIdentity(address);
  const identityRef = useRef(identity);
  identityRef.current = identity;
  function manual(next: Point) {
    if (!validPoint(next.latitude, next.longitude)) return;
    epoch.current++;
    controller.current?.abort();
    setPhase("ready");
    callback.current(next);
  }
  const manualRef = useRef(manual);
  manualRef.current = manual;
  useEffect(() => {
    if (!container.current) return;
    const instance = L.map(container.current, {
      scrollWheelZoom: false,
    }).setView([64.2, 12], 4);
    map.current = instance;
    const tiles = L.tileLayer(
      "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
      {
        maxZoom: 19,
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors',
      },
    ).addTo(instance);
    tiles.on("tileerror", () => setTilesFailed(true));
    instance.on("click", (event: L.LeafletMouseEvent) =>
      manualRef.current({
        latitude: event.latlng.lat,
        longitude: event.latlng.lng,
      }),
    );
    const resize = new ResizeObserver(() => instance.invalidateSize());
    resize.observe(container.current);
    return () => {
      resize.disconnect();
      instance.remove();
      map.current = null;
      marker.current = null;
    };
  }, []);
  useEffect(() => {
    const instance = map.current;
    if (!instance) return;
    if (!point) {
      marker.current?.remove();
      marker.current = null;
      return;
    }
    const position: L.LatLngExpression = [point.latitude, point.longitude];
    if (!marker.current) {
      marker.current = L.marker(position, {
        draggable: true,
        title: t("Bedriftens kartpinne"),
        alt: t("Bedriftens kartpinne"),
        icon: L.divIcon({
          className: "business-map-marker",
          html: '<span aria-hidden="true"></span>',
          iconSize: [34, 42],
          iconAnchor: [17, 42],
        }),
      }).addTo(instance);
      marker.current.on("dragend", () => {
        const latlng = marker.current!.getLatLng();
        manualRef.current({ latitude: latlng.lat, longitude: latlng.lng });
      });
    } else marker.current.setLatLng(position);
    instance.setView(position, Math.max(instance.getZoom(), 16), {
      animate: false,
    });
  }, [point?.latitude, point?.longitude]);
  useEffect(() => {
    const request = ++epoch.current;
    const abort = new AbortController();
    controller.current = abort;
    if (point) {
      setPhase("ready");
      return () => abort.abort();
    }
    const url = addressSearchUrl(address);
    if (!url) {
      setPhase("empty");
      return () => abort.abort();
    }
    setPhase("loading");
    let timeout: ReturnType<typeof setTimeout> | undefined;
    const debounce = setTimeout(() => {
      timeout = setTimeout(() => abort.abort(), 10000);
      void fetch(url, { signal: abort.signal })
        .then(async (response) => {
          if (!response.ok) throw new Error(t("Adresseoppslaget feilet"));
          const data: { adresser?: AddressHit[] } = await response.json();
          if (request !== epoch.current || identityRef.current !== identity)
            return;
          const found = chooseAddressPoint(
            address,
            Array.isArray(data.adresser) ? data.adresser : [],
          );
          if (found) {
            setPhase("ready");
            callback.current(found);
          } else setPhase("missing");
        })
        .catch(() => {
          if (request === epoch.current && identityRef.current === identity)
            setPhase("error");
        })
        .finally(() => clearTimeout(timeout));
    }, 650);
    return () => {
      epoch.current++;
      abort.abort();
      clearTimeout(debounce);
      clearTimeout(timeout);
    };
  }, [identity, retry, !!point]);
  return (
    <section className="profile-location" aria-labelledby="profile-map-title">
      <span className="eyebrow">{t("FINN RIKTIG INNGANG")}</span>
      <h3 id="profile-map-title">{t("Plassering på kart")}</h3>
      <p>
        {" "}
        {t(
          "Skriv gateadresse og by eller postnummer. Sjekk at pinnen står riktig, og dra den eller trykk i kartet for å flytte den.",
        )}{" "}
      </p>
      <div
        ref={container}
        className="profile-map"
        role="region"
        aria-label={t("Kart for bedriftsadressen")}
      />
      <div className="map-lookup-status" role="status">
        {phase === "loading"
          ? t("Søker etter adressen …")
          : phase === "ready"
            ? t(
                "Kartpinnen er klar. Lagre profilen for å beholde plasseringen.",
              )
            : phase === "missing"
              ? t(
                  "Fant ingen entydig adresse. Kontroller adressen, eller plasser pinnen selv i kartet.",
                )
              : phase === "error"
                ? t(
                    "Adresseoppslaget svarte ikke. Prøv igjen, eller plasser pinnen selv.",
                  )
                : t(
                    "Fyll inn gateadresse og by eller postnummer for å finne stedet.",
                  )}
      </div>
      {point ? (
        <output className="map-coordinates" aria-label={t("Kartkoordinater")}>
          {point.latitude.toFixed(6)}, {point.longitude.toFixed(6)}
        </output>
      ) : (
        <p className="map-coordinates">{t("Ingen kartpinne er valgt ennå.")}</p>
      )}
      <div className="actions">
        <button
          type="button"
          className="quiet small-button"
          onClick={() => {
            epoch.current++;
            controller.current?.abort();
            callback.current(null);
            setRetry((v) => v + 1);
          }}
        >
          {" "}
          {t("Søk opp adressen på nytt")}{" "}
        </button>
        <button
          type="button"
          className="quiet small-button"
          onClick={() => {
            const center = map.current?.getCenter();
            if (center) manual({ latitude: center.lat, longitude: center.lng });
          }}
        >
          {" "}
          {t("Plasser pinnen midt i kartet")}{" "}
        </button>
      </div>
      {tilesFailed && (
        <p className="map-tile-warning">
          {" "}
          {t(
            "Kartbakgrunnen kunne ikke lastes helt. Sjekk nettet før du kontrollerer plasseringen.",
          )}{" "}
        </p>
      )}
      <small>
        {" "}
        {t(
          "Adresseoppslag: Kartverket. Lagret pinne brukes også i mobilappen.",
        )}{" "}
      </small>
    </section>
  );
}
