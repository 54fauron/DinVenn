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

test("gavebeskrivelse og bedriftens kode vises med unik QR ved uthenting", async ({
  page,
}) => {
  const user = {
    id: "00000000-0000-4000-8000-000000000001",
    email: "test@example.com",
    aud: "authenticated",
    role: "authenticated",
    user_metadata: { display_name: "Test" },
    app_metadata: {},
    created_at: new Date().toISOString(),
  };
  const jwt = `${Buffer.from('{"alg":"HS256"}').toString("base64url")}.${Buffer.from(JSON.stringify({ sub: user.id, exp: Math.floor(Date.now() / 1000) + 3600 })).toString("base64url")}.test`;
  const redemption = {
    id: "r1",
    deal_id: "gift1",
    user_id: user.id,
    token: "unique-redemption-token",
    display_code: "LUNSJVENN",
    status: "issued",
    issued_at: new Date().toISOString(),
    expires_at: "2099-01-01T00:00:00Z",
  };
  await page.route("**/auth/v1/token?**", (route) =>
    route.fulfill({
      json: {
        access_token: jwt,
        refresh_token: "refresh-test",
        expires_in: 3600,
        token_type: "bearer",
        user,
      },
    }),
  );
  await page.route("**/auth/v1/user", (route) => route.fulfill({ json: user }));
  await page.route("**/rest/v1/deals?**", (route) =>
    route.fulfill({
      json: [
        {
          id: "gift1",
          business_id: "b1",
          title: "Gave med lunsj",
          discount_type: "freebie",
          discount_details: "Gratis mineralvann når du kjøper lunsj",
          promo_code: "NYKODE",
          max_per_user: 1,
          status: "active",
          starts_at: "2026-01-01T00:00:00Z",
          ends_at: null,
        },
      ],
    }),
  );
  await page.route("**/rest/v1/rpc/claim_deal", (route) =>
    route.fulfill({ json: redemption }),
  );
  await page.route("**/rest/v1/deal_redemptions?**", (route) =>
    route.fulfill({ json: [redemption] }),
  );
  await page.goto("/");
  await page.getByRole("tab", { name: "Meg", exact: true }).click();
  await page.getByLabel("E-post", { exact: true }).fill(user.email);
  await page
    .getByLabel("Passord (minst 8 tegn)", { exact: true })
    .fill("testpassword");
  await page.getByRole("button", { name: "Logg inn", exact: true }).click();
  await page.getByText("Gave med lunsj", { exact: true }).first().click();
  await expect(
    page.getByText("Gratis mineralvann når du kjøper lunsj", { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Hent vennepris", exact: true })
    .click();
  await expect(page.getByText("LUNSJVENN", { exact: true })).toBeVisible();
  await expect(
    page.getByText("unique-redemption-token", { exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("img", { name: "QR", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Vis innløsningskode", exact: true })
    .click();
  await expect(
    page.getByText("unique-redemption-token", { exact: true }),
  ).toBeVisible();
});

test("Min side lagrer profil, teller aktive koder og redigerer egne anmeldelser", async ({
  page,
}, testInfo) => {
  const user = {
    id: "00000000-0000-4000-8000-000000000001",
    email: "kari@example.com",
    aud: "authenticated",
    role: "authenticated",
    user_metadata: { display_name: "Kari" },
    app_metadata: {},
    created_at: new Date().toISOString(),
  };
  let profile = {
    id: user.id,
    role: "user",
    display_name: "Kari Hansen",
    home_city: "Oslo",
  };
  let review = {
    id: "review1",
    business_id: "b1",
    business_name: "Testkafeen",
    author_name: null,
    is_anonymous: true,
    rating: 4,
    comment: "God kaffe",
    business_reply: "Takk for besøket!",
    replied_at: null,
    created_at: "2026-11-27T10:00:00Z",
    is_own: true,
    status: "published",
    business_status: "approved",
  };
  const jwt = `${Buffer.from('{"alg":"HS256"}').toString("base64url")}.${Buffer.from(JSON.stringify({ sub: user.id, exp: Math.floor(Date.now() / 1000) + 3600 })).toString("base64url")}.test`;
  await page.route("**/auth/v1/token?**", (route) =>
    route.fulfill({
      json: {
        access_token: jwt,
        refresh_token: "refresh-test",
        expires_in: 3600,
        token_type: "bearer",
        user,
      },
    }),
  );
  await page.route("**/auth/v1/user", (route) => route.fulfill({ json: user }));
  await page.route("**/rest/v1/profiles?**", (route) =>
    route.fulfill({ json: profile }),
  );
  await page.route("**/rest/v1/favorites?**", (route) =>
    route.fulfill({
      json: [
        { target_type: "business", target_id: "b1" },
        { target_type: "deal", target_id: "d1" },
      ],
    }),
  );
  await page.route("**/rest/v1/deal_redemptions?**", (route) =>
    route.fulfill({
      json: [
        { id: "active", status: "issued", expires_at: "2099-01-01T00:00:00Z" },
        { id: "expired", status: "issued", expires_at: "2020-01-01T00:00:00Z" },
        { id: "used", status: "redeemed", expires_at: "2099-01-01T00:00:00Z" },
      ],
    }),
  );
  await page.route("**/rest/v1/rpc/save_my_profile", (route) => {
    const args = route.request().postDataJSON();
    expect(Object.keys(args).sort()).toEqual(["p_display_name", "p_home_city"]);
    profile = {
      ...profile,
      display_name: args.p_display_name,
      home_city: args.p_home_city,
    };
    return route.fulfill({ json: null });
  });
  await page.route("**/rest/v1/rpc/list_my_reviews", (route) =>
    route.fulfill({ json: [review] }),
  );
  await page.route("**/rest/v1/rpc/list_business_reviews", (route) =>
    route.fulfill({ json: [review] }),
  );
  await page.route("**/rest/v1/rpc/submit_business_review", (route) => {
    const args = route.request().postDataJSON();
    review = {
      ...review,
      rating: args.p_rating,
      comment: args.p_comment,
      is_anonymous: args.p_anonymous,
    };
    return route.fulfill({ json: null });
  });
  await page.goto("/");
  await page.getByRole("tab", { name: "Meg", exact: true }).click();
  const title = await page
    .getByText("Bli en lokal venn", { exact: true })
    .boundingBox();
  const settings = await page
    .getByText("Innstillinger", { exact: true })
    .boundingBox();
  expect(title!.y).toBeLessThan(settings!.y);
  await page.getByLabel("E-post", { exact: true }).fill(user.email);
  await page
    .getByLabel("Passord (minst 8 tegn)", { exact: true })
    .fill("testpassword");
  await page.getByRole("button", { name: "Logg inn", exact: true }).click();
  await page.getByRole("tab", { name: "Meg", exact: true }).click();
  await expect(page.getByText("Kari Hansen", { exact: true })).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Åpne aktive koder", exact: true }),
  ).toContainText("1");
  await expect(
    page.getByRole("button", { name: "Åpne favoritter", exact: true }),
  ).toContainText("2");
  await page
    .getByRole("button", { name: "Rediger profil", exact: true })
    .click();
  await page.getByLabel("Navnet ditt", { exact: true }).fill("Kari Ny");
  await page.getByLabel("Hjemby (valgfritt)", { exact: true }).fill("Drammen");
  await page
    .getByRole("button", { name: "Lagre profilen min", exact: true })
    .click();
  await expect(
    page.getByText("Profilen din er oppdatert.", { exact: true }),
  ).toBeVisible();
  await expect(page.getByText("Kari Ny", { exact: true })).toBeVisible();
  await page.reload();
  await page.getByRole("tab", { name: "Meg", exact: true }).click();
  await expect(page.getByText("Kari Ny", { exact: true })).toBeVisible();
  await page.screenshot({
    path: testInfo.outputPath("min-side.png"),
    fullPage: true,
  });
  await page
    .getByRole("button", { name: "Mine anmeldelser", exact: true })
    .click();
  await expect(page.getByText("God kaffe", { exact: true })).toBeVisible();
  await expect(
    page.getByText("Takk for besøket!", { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", {
      name: "Rediger anmeldelse hos Testkafeen",
      exact: true,
    })
    .click();
  await page.getByLabel("Anmeldelse", { exact: true }).fill("Enda bedre kaffe");
  await page
    .getByRole("button", { name: "Lagre anmeldelse", exact: true })
    .click();
  await expect(
    page.getByText("Enda bedre kaffe", { exact: true }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBeTruthy();
  await page
    .getByRole("button", { name: "Bytt til engelsk", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Switch to dark mode", exact: true })
    .click();
  await expect(page.getByText("My account", { exact: true })).toBeVisible();
  await page.screenshot({
    path: testInfo.outputPath("my-account-dark.png"),
    fullPage: true,
  });
});
