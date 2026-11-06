import { test } from "node:test";
import assert from "node:assert/strict";
import {
  validPoint,
  storedPoint,
  chooseAddressPoint,
  addressSearchUrl,
  directionsUrl,
  remainingTime,
} from "../apps/mobile/src/discovery.ts";
const b = {
  name: "Kafé",
  address: "Markens gate 12A",
  postal_code: "4611",
  city: "Kristiansand",
  lat: null,
  lng: null,
};
const hit = {
  adressetekst: "Markens gate 12A",
  postnummer: "4611",
  poststed: "KRISTIANSAND S",
  kommunenavn: "KRISTIANSAND",
  representasjonspunkt: { lat: 58.145, lon: 7.995 },
};
test("kart validerer koordinater og bruker lagrede punkter", () => {
  assert.equal(validPoint(null, null), false);
  assert.equal(validPoint(NaN, 7), false);
  assert.equal(validPoint(91, 7), false);
  assert.equal(validPoint(58, 181), false);
  assert.deepEqual(storedPoint({ ...b, lat: 58, lng: 7 }), {
    latitude: 58,
    longitude: 7,
  });
  assert.equal(storedPoint(b), null);
});
test("adresseoppslag krever gate og by eller postnummer", () => {
  assert.equal(addressSearchUrl({ ...b, address: null }), null);
  assert.equal(addressSearchUrl({ ...b, city: null, postal_code: null }), null);
  const url = new URL(addressSearchUrl(b));
  assert.equal(url.searchParams.get("utkoordsys"), "4258");
  assert.ok(url.searchParams.get("sok").includes("Kristiansand"));
});
test("kart plasserer bare entydige treff i riktig by/postnummer", () => {
  assert.deepEqual(chooseAddressPoint(b, [hit]), {
    latitude: 58.145,
    longitude: 7.995,
  });
  assert.equal(
    chooseAddressPoint(b, [
      { ...hit, postnummer: "0150", kommunenavn: "OSLO" },
    ]),
    null,
  );
  assert.equal(
    chooseAddressPoint(b, [{ ...hit, adressetekst: "Markens gate 12B" }]),
    null,
  );
  assert.equal(
    chooseAddressPoint(b, [
      hit,
      { ...hit, representasjonspunkt: { lat: 59, lon: 8 } },
    ]),
    null,
  );
  assert.deepEqual(chooseAddressPoint(b, [hit, hit]), {
    latitude: 58.145,
    longitude: 7.995,
  });
});
test("ufullstendig husbokstav gir ingen gjettet kartmarkør", () => {
  assert.equal(
    chooseAddressPoint({ ...b, address: "Markens gate 12" }, [
      hit,
      { ...hit, adressetekst: "Markens gate 12B" },
    ]),
    null,
  );
});
test("veibeskrivelse bruker koordinat eller URL-kodet gateadresse", () => {
  const url = new URL(directionsUrl(b));
  assert.equal(
    url.searchParams.get("destination"),
    "Markens gate 12A, 4611, Kristiansand",
  );
  assert.equal(
    new URL(directionsUrl({ ...b, lat: 58, lng: 7 })).searchParams.get(
      "destination",
    ),
    "58,7",
  );
});
test("tilbud viser riktig nedtelling og utløp", () => {
  const now = Date.parse("2026-11-06T10:00:00Z");
  assert.equal(remainingTime("2026-11-06T10:15:00Z", now), "15 min igjen");
  assert.equal(remainingTime("2026-11-06T12:15:00Z", now), "2 t 15 min igjen");
  assert.equal(remainingTime("2026-11-08T10:00:00Z", now), "2 dager igjen");
  assert.equal(remainingTime("2026-11-06T10:00:00Z", now), "Utløpt");
  assert.equal(remainingTime(null, now), "Ingen fast sluttdato");
});
