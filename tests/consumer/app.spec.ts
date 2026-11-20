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
