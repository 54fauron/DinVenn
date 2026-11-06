import { test } from "node:test";
import assert from "node:assert/strict";
import {
  filterDeals,
  redemptionStatus,
  validateDeal,
} from "../packages/core/src/index.ts";
test("filter kombinerer tekst, by og kategori", () => {
  const b = [
    { id: "b1", name: "Kafé", city: "Kristiansand", category_id: 1 },
    { id: "b2", name: "Butikk", city: "Oslo", category_id: 2 },
  ];
  const d = [
    { id: "d1", business_id: "b1", title: "Kaffe" },
    { id: "d2", business_id: "b2", title: "Klær" },
  ];
  assert.deepEqual(
    filterDeals(d, b, "KAFÉ", "Kristiansand", "1").map((x) => x.id),
    ["d1"],
  );
  assert.equal(filterDeals(d, b, "Kaffe", "Oslo", "").length, 0);
});
test("QR forsvinner ved utløp, innløst overstyrer tidspunkt", () => {
  const r = { status: "issued", expires_at: "2026-11-06T10:00:00Z" };
  assert.equal(
    redemptionStatus(r, Date.parse("2026-11-06T09:59:59Z")),
    "Klar til bruk",
  );
  assert.equal(redemptionStatus(r, Date.parse(r.expires_at)), "Utløpt");
  assert.equal(
    redemptionStatus({ ...r, status: "redeemed" }, Date.parse(r.expires_at)),
    "Innløst",
  );
});
test("validering fanger ugyldig rabatt, grenser og tidsrom", () => {
  const valid = {
    title: "Kaffe",
    starts_at: "2026-11-06T10:00:00Z",
    ends_at: "2026-11-06T11:00:00Z",
    max_per_user: 1,
    discount_type: "percent",
    discount_value: 20,
  };
  assert.doesNotThrow(() => validateDeal(valid));
  for (const update of [
    { title: " " },
    { max_per_user: 0 },
    { max_redemptions: 1.5 },
    { discount_value: 101 },
    { ends_at: valid.starts_at },
  ])
    assert.throws(() => validateDeal({ ...valid, ...update }));
});
