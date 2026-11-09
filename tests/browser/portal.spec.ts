import { test, expect, type Page } from "@playwright/test";
const ownerId = "00000000-0000-4000-8000-000000000001";
const businessId = "00000000-0000-4000-8000-000000000002";
async function backend(
  page: Page,
  admin = false,
  coordinates?: { lat: number; lng: number },
) {
  let business = {
    id: businessId,
    owner_id: ownerId,
    name: "Hjørnekafeen",
    slug: "hjornekafeen",
    description: "Den lille kafeen i byen.",
    city: "Kristiansand",
    address: "Demogata 1",
    postal_code: "4611",
    phone: "",
    email: "",
    website: "",
    cover_url: null,
    category_id: 1,
    lat: coordinates?.lat ?? null,
    lng: coordinates?.lng ?? null,
    status: "pending",
  };
  let deals: Record<string, unknown>[] = [];
  let used = false;
  const content: Record<string, Record<string, unknown>[]> = {
    events: [],
    news_posts: [],
  };
  const user = {
    id: ownerId,
    email: admin ? "admin@test.example" : "owner@test.example",
    aud: "authenticated",
    role: "authenticated",
    user_metadata: {},
    app_metadata: {},
    created_at: new Date().toISOString(),
  };
  const jwt = `${Buffer.from('{"alg":"HS256"}').toString("base64url")}.${Buffer.from(JSON.stringify({ sub: ownerId, exp: Math.floor(Date.now() / 1000) + 3600 })).toString("base64url")}.test`;
  await page.route("https://tile.openstreetmap.org/**", (route) =>
    route.fulfill({
      contentType: "image/png",
      body: Buffer.from(
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a6ioAAAAASUVORK5CYII=",
        "base64",
      ),
    }),
  );
  await page.route("https://ws.geonorge.no/adresser/v1/**", (route) => {
    const query = new URL(route.request().url()).searchParams.get("sok") ?? "";
    return route.fulfill({
      contentType: "application/json",
      headers: { "access-control-allow-origin": "*" },
      body: JSON.stringify({
        adresser: query.includes("Markens gate 12A")
          ? [
              {
                adressetekst: "Markens gate 12A",
                postnummer: "4611",
                poststed: "KRISTIANSAND S",
                kommunenavn: "KRISTIANSAND",
                representasjonspunkt: { lat: 58.145, lon: 7.995 },
              },
            ]
          : [],
      }),
    });
  });
  await page.route("https://dinvenn-test.supabase.co/**", async (route) => {
    const req = route.request(),
      url = new URL(req.url());
    const path = url.pathname;
    const method = req.method();
    const data = req.postDataJSON();
    const send = (value: unknown, status = 200) =>
      route.fulfill({
        status,
        contentType: "application/json",
        body: JSON.stringify(value),
        headers: { "access-control-allow-origin": "*" },
      });
    const rows = (value: unknown[]) =>
      send(
        req.headers()["accept"]?.includes("vnd.pgrst.object+json")
          ? value[0]
          : value,
      );
    if (method === "OPTIONS") return send({});
    if (path.endsWith("/token"))
      return data.password === "wrongpass"
        ? send({ msg: "Feil e-post eller passord" }, 400)
        : send({
            access_token: jwt,
            refresh_token: "test-refresh",
            expires_in: 3600,
            token_type: "bearer",
            user,
          });
    if (path.endsWith("/signup"))
      return send({ id: ownerId, email: data.email, identities: [] });
    if (path.endsWith("/recover") || path.endsWith("/logout")) return send({});
    if (path.endsWith("/user")) return send(user);
    if (path.endsWith("/profiles"))
      return rows([
        { id: ownerId, display_name: "Kari", role: admin ? "admin" : "user" },
      ]);
    if (path.endsWith("/business_members"))
      return rows([
        { business_id: businessId, user_id: ownerId, member_role: "owner" },
      ]);
    if (path.endsWith("/categories"))
      return rows([{ id: 1, name: "Mat & Drikke" }]);
    if (path.endsWith("/businesses")) {
      if (method === "PATCH") business = { ...business, ...data };
      return rows([business]);
    }
    if (path.endsWith("/deals")) {
      if (method === "POST")
        deals.push({
          ...data,
          id: "deal1",
          created_at: new Date().toISOString(),
          image_url: null,
        });
      if (method === "PATCH") deals = deals.map((d) => ({ ...d, ...data }));
      return rows(deals);
    }
    if (path.endsWith("/subscriptions"))
      return rows([
        {
          id: "subscription1",
          plan: "basic",
          status: "trialing",
          current_period_end: null,
        },
      ]);
    for (const table of ["events", "news_posts"]) {
      if (path.endsWith("/" + table)) {
        if (method === "POST")
          content[table].push({
            id: crypto.randomUUID(),
            created_at: new Date().toISOString(),
            published_at: new Date().toISOString(),
            ...data,
          });
        if (method === "PATCH")
          content[table] = content[table].map((item) => ({ ...item, ...data }));
        return rows(content[table]);
      }
    }
    if (path.endsWith("/deal_redemptions"))
      return rows(
        used
          ? [
              {
                id: "r1",
                deal_id: "deal1",
                status: "redeemed",
                redeemed_at: new Date().toISOString(),
              },
            ]
          : [],
      );
    if (path.endsWith("/rpc/redeem_deal")) {
      if (used)
        return send({ message: "Koden er allerede brukt", code: "P0001" }, 400);
      used = true;
      return send({ id: "r1", deal_id: "deal1", status: "redeemed" });
    }
    return send({ message: `Uventet testforespørsel: ${path}` }, 500);
  });
}
async function login(page: Page) {
  await page.goto("/");
  await page.getByLabel("E-post", { exact: true }).fill("owner@test.example");
  await page.getByLabel("Passord (minst 8 tegn)").fill("goodpass123");
  await page.getByRole("button", { name: "Logg inn", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Hjørnekafeen" }),
  ).toBeVisible();
}
test("bedrift kan redigere profil, publisere/pause tilbud og løse inn kode", async ({
  page,
}) => {
  await backend(page);
  await login(page);
  await expect(page.getByText("Venter på godkjenning")).toBeVisible();
  await page
    .getByRole("button", { name: "Bedriftsprofil", exact: true })
    .click();
  await page.getByLabel("Adresse", { exact: true }).fill("Storgata 2");
  await page.getByRole("button", { name: "Lagre profil" }).click();
  await expect(page.getByText("Profilen er lagret.")).toBeVisible();
  await page.getByRole("button", { name: "Vennepriser", exact: true }).click();
  await page.getByRole("button", { name: "+ Ny vennepris" }).click();
  await page.getByLabel("Tittel", { exact: true }).fill("20 % på kaffe");
  await page
    .getByRole("combobox", { name: "Status", exact: true })
    .selectOption("active");
  await page.getByRole("button", { name: "Lagre vennepris" }).click();
  await expect(page.getByText("20 % på kaffe", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Pause", exact: true }).click();
  await expect(page.getByText(/Pauset/)).toBeVisible();
  await page.getByRole("button", { name: "Publiser", exact: true }).click();
  await expect(page.getByText(/Publisert/)).toBeVisible();
  await page.getByRole("button", { name: "Løs inn kode", exact: true }).click();
  await page.getByLabel("Kundens kode").fill("qr-test-code");
  await page.getByRole("button", { name: "Bekreft innløsning" }).click();
  await expect(
    page.getByRole("status").filter({ hasText: "Innløsning bekreftet" }),
  ).toBeVisible();
  await page.getByLabel("Kundens kode").fill("qr-test-code");
  await page.getByRole("button", { name: "Bekreft innløsning" }).click();
  await expect(page.getByRole("alert")).toContainText(
    "Koden er allerede brukt",
  );
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBeTruthy();
});
test("admin kan godkjenne og suspendere bedrift", async ({ page }) => {
  await backend(page, true);
  await login(page);
  await page.getByRole("button", { name: "Godkjenning", exact: true }).click();
  await page.getByRole("button", { name: "Godkjenn", exact: true }).click();
  await expect(page.getByText("Godkjent", { exact: true })).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Godkjenn", exact: true }),
  ).toHaveCount(0);
  await page.getByRole("button", { name: "Suspender", exact: true }).click();
  await expect(page.getByText("Suspendert", { exact: true })).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Suspender", exact: true }),
  ).toHaveCount(0);
  await page.getByRole("button", { name: "Godkjenn", exact: true }).click();
  await expect(page.getByText("Godkjent", { exact: true })).toBeVisible();
});
test("innloggingsfeil og glemt passord gir forståelig tilbakemelding", async ({
  page,
}) => {
  await backend(page);
  await page.goto("/");
  await page.getByLabel("E-post", { exact: true }).fill("owner@test.example");
  await page.getByLabel("Passord (minst 8 tegn)").fill("wrongpass");
  await page.getByRole("button", { name: "Logg inn", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText(
    "Feil e-post eller passord",
  );
  await page.getByRole("button", { name: "Glemt passord?" }).click();
  await page
    .getByRole("button", { name: "Send tilbakestillingslenke" })
    .click();
  await expect(page.getByRole("status")).toContainText("Hvis kontoen finnes");
});

test("ny konto sender e-postbekreftelse", async ({ page }) => {
  await backend(page);
  await page.goto("/");
  await page.getByRole("button", { name: "Ny her? Opprett konto" }).click();
  await page.getByLabel("Navnet ditt").fill("Kari");
  await page.getByLabel("E-post", { exact: true }).fill("kari@test.example");
  await page.getByLabel("Passord (minst 8 tegn)").fill("goodpass123");
  await page
    .getByRole("button", { name: "Opprett konto", exact: true })
    .click();
  await expect(page.getByRole("status")).toContainText("Sjekk e-posten din");
});
test("passord kan oppdateres fra en gjenopprettingsøkt", async ({ page }) => {
  await backend(page);
  await login(page);
  await page.goto("/?recovery=1");
  await page.getByLabel("Passord (minst 8 tegn)").fill("newpassword123");
  await page.getByRole("button", { name: "Lagre passord" }).click();
  await expect(page.getByRole("status")).toContainText(
    "Passordet er oppdatert",
  );
});

test("arrangementer kan opprettes, redigeres, publiseres og pauses", async ({
  page,
}) => {
  await backend(page);
  await login(page);
  await page
    .getByRole("button", { name: "Arrangementer", exact: true })
    .click();
  await page
    .getByRole("button", { name: "+ Nytt arrangement", exact: true })
    .click();
  await page.getByLabel("Tittel", { exact: true }).fill("Latte art-workshop");
  await page
    .getByLabel("Beskrivelse", { exact: true })
    .fill("Lær å lage latte art sammen med oss.");
  await page.getByLabel("Starter (lokal tid)").fill("2099-11-12T17:00");
  await page.getByLabel("Slutter (valgfritt)").fill("2099-11-12T19:00");
  await page.getByLabel("Sted / adresse").fill("Markens gate 12");
  await page.getByLabel("Pris", { exact: true }).fill("150 kr");
  await page
    .getByRole("button", { name: "Lagre arrangement", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Latte art-workshop", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("article").getByText("Utkast", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Publiser", exact: true }).click();
  await expect(
    page.getByRole("article").getByText("Publisert", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Rediger", exact: true }).click();
  await page.getByLabel("Tittel", { exact: true }).fill("Latte art for alle");
  await page
    .getByRole("button", { name: "Lagre og publiser", exact: true })
    .click();
  await page.getByRole("button", { name: "Oversikt", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Latte art for alle", exact: true }),
  ).toBeVisible();
  await page.screenshot({
    path: test.info().outputPath("dashboard.png"),
    fullPage: true,
  });
  await page
    .getByRole("button", { name: "Arrangementer", exact: true })
    .click();
  await page.getByRole("button", { name: "Pause", exact: true }).click();
  await expect(
    page.getByRole("article").getByText("Pauset", { exact: true }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBeTruthy();
});
test("arrangement avviser slutt før start uten å lagre", async ({ page }) => {
  await backend(page);
  await login(page);
  await page
    .getByRole("button", { name: "Arrangementer", exact: true })
    .click();
  await page.getByRole("button", { name: "+ Nytt arrangement" }).click();
  await page.getByLabel("Tittel", { exact: true }).fill("Workshop");
  await page
    .getByLabel("Beskrivelse", { exact: true })
    .fill("En hyggelig kveld.");
  await page.getByLabel("Starter (lokal tid)").fill("2099-11-12T17:00");
  await page.getByLabel("Slutter (valgfritt)").fill("2099-11-12T16:00");
  await page
    .getByRole("button", { name: "Lagre arrangement", exact: true })
    .click();
  await expect(page.getByRole("alert")).toContainText(
    "Slutt må være etter start",
  );
  await expect(
    page.getByRole("heading", { name: "Nytt arrangement", exact: true }),
  ).toBeVisible();
});
test("nyheter støtter publisering, redigering, pause og statusfilter", async ({
  page,
}) => {
  await backend(page);
  await login(page);
  await page.getByRole("button", { name: "Nyheter", exact: true }).click();
  await page.getByRole("button", { name: "+ Ny nyhet" }).click();
  await page.getByLabel("Tittel", { exact: true }).fill("Ny lunsjmeny");
  await page
    .getByLabel("Nyhetstekst")
    .fill("Nå får du suppe og hjemmebakt brød hos oss.");
  await page
    .getByRole("combobox", { name: "Status", exact: true })
    .selectOption("active");
  await page.getByRole("button", { name: "Lagre og publiser" }).click();
  await expect(
    page.getByRole("heading", { name: "Ny lunsjmeny", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Rediger", exact: true }).click();
  await page.getByLabel("Tittel", { exact: true }).fill("Nye lunsjpriser");
  await page.getByRole("button", { name: "Lagre og publiser" }).click();
  await page.getByRole("button", { name: "Pause", exact: true }).click();
  await expect(
    page.getByRole("article").getByText("Pauset", { exact: true }),
  ).toBeVisible();
  await page.getByLabel("Vis status").selectOption("active");
  await expect(page.getByText("Ingen treff", { exact: true })).toBeVisible();
  await page.getByLabel("Vis status").selectOption("all");
  await expect(
    page.getByRole("heading", { name: "Nye lunsjpriser", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Oversikt", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Nye lunsjpriser", exact: true }),
  ).toBeVisible();
});
test("abonnement viser tydelige prisforslag uten aktiv betaling", async ({
  page,
}) => {
  await backend(page);
  await login(page);
  await page.getByRole("button", { name: "Abonnement", exact: true }).click();
  await expect(
    page.getByText("Prisene og pakkene under er forslag.", { exact: false }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Pluss", exact: true }),
  ).toBeVisible();
  const buttons = page.getByRole("button", {
    name: "Kommer senere",
    exact: true,
  });
  await expect(buttons).toHaveCount(2);
  await expect(buttons.nth(0)).toBeDisabled();
  await expect(buttons.nth(1)).toBeDisabled();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBeTruthy();
});

test("bedriftsprofil slår opp adresse, lagrer kartpinne og viser den etter ny innlasting", async ({
  page,
}) => {
  await backend(page);
  await login(page);
  await page
    .getByRole("button", { name: "Bedriftsprofil", exact: true })
    .click();
  await page.getByLabel("Adresse", { exact: true }).fill("Markens gate 12A");
  await expect(page.getByLabel("Kartkoordinater")).toHaveText(
    "58.145000, 7.995000",
  );
  await expect(page.getByTitle("Bedriftens kartpinne")).toBeVisible();
  const request = page.waitForRequest(
    (r) =>
      r.method() === "PATCH" &&
      new URL(r.url()).pathname.endsWith("/businesses"),
  );
  await page.getByRole("button", { name: "Lagre profil" }).click();
  const payload = (await request).postDataJSON();
  expect(payload.lat).toBe(58.145);
  expect(payload.lng).toBe(7.995);
  await expect(page.getByText("Profilen er lagret.")).toBeVisible();
  await page.reload();
  await page
    .getByRole("button", { name: "Bedriftsprofil", exact: true })
    .click();
  await expect(page.getByLabel("Kartkoordinater")).toHaveText(
    "58.145000, 7.995000",
  );
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBeTruthy();
});
test("adresseendring fjerner gammel kartpinne når ny adresse ikke finnes", async ({
  page,
}) => {
  await backend(page, false, { lat: 58.145, lng: 7.995 });
  await login(page);
  await page
    .getByRole("button", { name: "Bedriftsprofil", exact: true })
    .click();
  await expect(page.getByLabel("Kartkoordinater")).toHaveText(
    "58.145000, 7.995000",
  );
  await page.getByLabel("Adresse", { exact: true }).fill("Finnes ikke 99");
  await expect(
    page.getByText("Fant ingen entydig adresse.", { exact: false }),
  ).toBeVisible();
  await expect(page.getByTitle("Bedriftens kartpinne")).toHaveCount(0);
  const request = page.waitForRequest(
    (r) =>
      r.method() === "PATCH" &&
      new URL(r.url()).pathname.endsWith("/businesses"),
  );
  await page.getByRole("button", { name: "Lagre profil" }).click();
  const payload = (await request).postDataJSON();
  expect(payload.lat).toBeNull();
  expect(payload.lng).toBeNull();
});
test("kartpinne kan flyttes manuelt og korrigerte koordinater lagres", async ({
  page,
}) => {
  await backend(page, false, { lat: 58.145, lng: 7.995 });
  await login(page);
  await page
    .getByRole("button", { name: "Bedriftsprofil", exact: true })
    .click();
  await expect(page.getByLabel("Kartkoordinater")).toHaveText(
    "58.145000, 7.995000",
  );
  if (test.info().project.name === "desktop") {
    const marker = page.getByTitle("Bedriftens kartpinne");
    await marker.scrollIntoViewIfNeeded();
    const box = (await marker.boundingBox())!;
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(
      box.x + box.width / 2 + 45,
      box.y + box.height / 2 - 30,
      { steps: 10 },
    );
    await page.mouse.up();
  } else {
    await page
      .getByRole("region", { name: "Kart for bedriftsadressen", exact: true })
      .click({ position: { x: 120, y: 240 } });
  }
  await expect(page.getByLabel("Kartkoordinater")).not.toHaveText(
    "58.145000, 7.995000",
  );
  const [lat, lng] = (await page.getByLabel("Kartkoordinater").textContent())!
    .split(",")
    .map(Number);
  const request = page.waitForRequest(
    (r) =>
      r.method() === "PATCH" &&
      new URL(r.url()).pathname.endsWith("/businesses"),
  );
  await page.getByRole("button", { name: "Lagre profil" }).click();
  const payload = (await request).postDataJSON();
  expect(payload.lat).toBeCloseTo(lat, 5);
  expect(payload.lng).toBeCloseTo(lng, 5);
  await page.screenshot({
    path: test.info().outputPath("profile-map.png"),
    fullPage: true,
  });
});
