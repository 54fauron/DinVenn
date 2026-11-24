import { test, expect } from "@playwright/test";
test.beforeEach(async ({ page }) => {
  await page.route("https://dinvenn-test.supabase.co/**", (route) => {
    const path = new URL(route.request().url()).pathname;
    const rows = path.endsWith("/businesses")
      ? [
          {
            id: "b1",
            name: "Testkafeen",
            status: "approved",
            city: "Drammen",
            address: "Testgata 1",
            category_id: 1,
            lat: 59.74,
            lng: 10.2,
          },
        ]
      : path.endsWith("/categories")
        ? [{ id: 1, name: "Mat & Drikke", slug: "mat-drikke" }]
        : [];
    return route.fulfill({ json: rows });
  });
  await page.route("https://*.tile.openstreetmap.org/**", (route) =>
    route.fulfill({ status: 204 }),
  );
});
test("utforsk, innloggingskrav og lagrede innstillinger", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await expect(page.getByText("Små steder.")).toBeVisible();
  await expect(page.getByRole("link", { name: "For bedrifter" })).toBeVisible();
  await page.getByRole("tab", { name: "Favoritter", exact: true }).click();
  await page
    .getByRole("button", { name: "Logg inn for å se favorittene dine" })
    .click();
  await expect(
    page.getByRole("button", { name: "Logg inn", exact: true }),
  ).toBeVisible();
  await page.getByRole("tab", { name: "Meg", exact: true }).click();
  await page.getByRole("button", { name: "Bytt til engelsk" }).click();
  await page.getByRole("button", { name: "Switch to dark mode" }).click();
  await page.reload();
  await page.getByRole("tab", { name: "Me", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Switch to Norwegian" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Switch to light mode" }),
  ).toBeVisible();
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  expect(errors).toEqual([]);
});
test("kartkort vises ved markørtrykk og lukkes på kartet", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("tab", { name: "Kart", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Se bedrift", exact: true }),
  ).toHaveCount(0);
  await page.locator(".leaflet-interactive").first().click({ force: true });
  await expect(
    page.getByRole("button", { name: "Se bedrift", exact: true }),
  ).toBeVisible();
  await page
    .locator(".leaflet-container")
    .click({ position: { x: 80, y: 90 } });
  await expect(
    page.getByRole("button", { name: "Se bedrift", exact: true }),
  ).toHaveCount(0);
  const manifest = await page.request.get("/manifest.webmanifest");
  expect((await manifest.json()).display).toBe("standalone");
});

test("avdelinger vises som separate markører med riktig kort og by", async ({
  page,
}) => {
  await page.route("**/rest/v1/business_locations?**", (route) =>
    route.fulfill({
      json: [
        {
          id: "l1",
          business_id: "b1",
          name: "Sentrum",
          address: "Storgata 2",
          city: "Oslo",
          postal_code: "0155",
          lat: 59.91,
          lng: 10.75,
        },
        {
          id: "l2",
          business_id: "b1",
          name: "Vest",
          address: "Vestgata 3",
          city: "Drammen",
          postal_code: "3015",
          lat: 59.75,
          lng: 10.18,
        },
        {
          id: "hidden",
          business_id: "unapproved",
          name: "Skjult",
          address: "Gate 1",
          city: "Drammen",
          postal_code: "3015",
          lat: 59.76,
          lng: 10.17,
        },
      ],
    }),
  );
  await page.goto("/");
  await page.getByRole("tab", { name: "Kart", exact: true }).click();
  await expect(page.locator(".leaflet-interactive")).toHaveCount(3);
  await page.getByRole("button", { name: "Oslo", exact: true }).click();
  await expect(page.locator(".leaflet-interactive")).toHaveCount(1);
  const marker = page.getByRole("button", {
    name: "Testkafeen · Sentrum",
    exact: true,
  });
  await marker.focus();
  await marker.press("Enter");
  await expect(
    page.getByText("Storgata 2, Oslo", { exact: true }),
  ).toBeVisible();
  await page
    .locator(".leaflet-container")
    .click({ position: { x: 80, y: 90 } });
  await expect(
    page.getByRole("button", { name: "Se bedrift", exact: true }),
  ).toHaveCount(0);
  await page.getByRole("button", { name: "Alle byer", exact: true }).click();
  await expect(page.locator(".leaflet-interactive")).toHaveCount(3);
  await page
    .getByRole("button", { name: "Testkafeen · Vest", exact: true })
    .focus();
  await page
    .getByRole("button", { name: "Testkafeen · Vest", exact: true })
    .press("Enter");
  await expect(
    page.getByText("Vestgata 3, Drammen", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Se bedrift", exact: true }).click();
  await expect(
    page.getByText("Testgata 1", { exact: false }).first(),
  ).toBeVisible();
});

test("avdelingsnavn vises som tekst i kartetiketter", async ({ page }) => {
  await page.route("**/rest/v1/business_locations?**", (route) =>
    route.fulfill({
      json: [
        {
          id: "l1",
          business_id: "b1",
          name: "<b>Vest</b>",
          address: "Gate 2",
          city: "Drammen",
          postal_code: "3015",
          lat: 59.75,
          lng: 10.18,
        },
      ],
    }),
  );
  await page.goto("/");
  await page.getByRole("tab", { name: "Kart", exact: true }).click();
  await page
    .getByRole("button", { name: "Testkafeen · <b>Vest</b>", exact: true })
    .hover();
  await expect(page.locator(".leaflet-tooltip")).toContainText(
    "Testkafeen · <b>Vest</b>",
  );
  await expect(page.locator(".leaflet-tooltip b")).toHaveCount(0);
});
