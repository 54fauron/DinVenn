import { test, expect, type Page } from "@playwright/test";
const ownerId = "00000000-0000-4000-8000-000000000001";
const businessId = "00000000-0000-4000-8000-000000000002";
async function backend(
  page: Page,
  admin = false,
  coordinates?: { lat: number; lng: number },
  initialOrg: string | null = "123456789",
  initialReviews: Record<string, unknown>[] = [],
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
    phone: "12345678",
    email: "kontakt@test.example",
    website: "",
    cover_url: null,
    category_id: 1,
    lat: coordinates?.lat ?? null,
    lng: coordinates?.lng ?? null,
    status: "pending",
  };
  let deals: Record<string, unknown>[] = [];
  let locations: Record<string, unknown>[] = [];
  let orgNumber = initialOrg;
  let reviews = initialReviews.map((r) => ({ ...r }));
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
    if (path.endsWith("/rpc/get_business_org")) return send(orgNumber);
    if (path.endsWith("/rpc/save_business_org")) {
      if (orgNumber !== data.p_org_number && business.status === "approved")
        business.status = "pending";
      orgNumber = data.p_org_number;
      return send(null);
    }
    if (path.endsWith("/rpc/list_business_reviews")) return send(reviews);
    if (path.endsWith("/rpc/reply_to_review")) {
      reviews = reviews.map((r) =>
        r.id === data.p_review_id ? { ...r, business_reply: data.p_reply } : r,
      );
      return send(null);
    }
    if (path.endsWith("/rpc/delete_business_reply")) {
      reviews = reviews.map((r) =>
        r.id === data.p_review_id
          ? { ...r, business_reply: null, replied_at: null }
          : r,
      );
      return send(null);
    }
    if (path.endsWith("/rpc/delete_business_review")) {
      if (!admin) return send({ message: "Ikke tilgang" }, 403);
      reviews = reviews.filter((r) => r.id !== data.p_review_id);
      return send(null);
    }

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
    if (path.endsWith("/business_locations")) {
      const id = url.searchParams.get("id")?.replace(/^eq\./, "");
      const scoped = url.searchParams.get("business_id")?.replace(/^eq\./, "");
      if (method === "POST") {
        const row = { ...data, created_at: new Date().toISOString() };
        locations.push(row);
        return rows([row]);
      }
      if (method === "PATCH") {
        locations = locations.map((r) =>
          r.id === id && r.business_id === scoped ? { ...r, ...data } : r,
        );
      }
      const matching = locations.filter(
        (r) => (!id || r.id === id) && (!scoped || r.business_id === scoped),
      );
      if (method === "DELETE")
        locations = locations.filter((r) => !matching.includes(r));
      return rows(matching);
    }
    if (path.endsWith("/deals")) {
      if (method === "DELETE") {
        const id = url.searchParams.get("id")?.replace(/^eq\./, "");
        const business = url.searchParams
          .get("business_id")
          ?.replace(/^eq\./, "");
        const removed = deals.filter(
          (item) => item.id === id && item.business_id === business,
        );
        deals = deals.filter((item) => !removed.includes(item));
        return rows(removed);
      }
      if (method === "POST")
        deals.push({
          ...data,
          id: deals.length ? crypto.randomUUID() : "deal1",
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
        if (method === "DELETE") {
          const id = url.searchParams.get("id")?.replace(/^eq\./, "");
          const business = url.searchParams
            .get("business_id")
            ?.replace(/^eq\./, "");
          const removed = content[table].filter(
            (item) => item.id === id && item.business_id === business,
          );
          content[table] = content[table].filter(
            (item) => !removed.includes(item),
          );
          return rows(removed);
        }
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
  await page
    .getByRole("button", { name: "Lukk bekreftelse", exact: true })
    .click();
  await expect(page.getByText("Profilen er lagret.")).toHaveCount(0);
  await page.getByRole("button", { name: "Lagre profil" }).click();
  await expect(page.getByText("Profilen er lagret.")).toBeVisible();
  await page.getByRole("button", { name: "Vennepriser", exact: true }).click();
  await expect(page.getByText("Profilen er lagret.")).toHaveCount(0);
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

test("språkvelger oversetter portalen, bevarer DinVenn og husker valget", async ({
  page,
}) => {
  await backend(page);
  await login(page);
  const picker = page.getByRole("group", { name: "Språk", exact: true });
  await expect(picker.getByRole("button")).toHaveCount(1);
  await expect(picker.getByRole("button")).toHaveText("🇳🇴");
  await page.getByRole("button", { name: "Bytt til engelsk" }).click();
  await expect(
    page
      .getByRole("group", { name: "Language", exact: true })
      .getByRole("button"),
  ).toHaveText("🇬🇧");
  await expect(
    page.getByRole("button", { name: "Overview", exact: true }),
  ).toBeVisible();
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await expect(
    page.getByRole("link", { name: "DinVenn", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Business profile", exact: true })
    .click();
  await expect(page.getByLabel("Business name", { exact: true })).toHaveValue(
    "Hjørnekafeen",
  );
  await page.reload();
  await expect(
    page.getByRole("button", { name: "Overview", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Switch to Norwegian" }).click();
  await expect(
    page.getByRole("button", { name: "Oversikt", exact: true }),
  ).toBeVisible();
  await expect(page.locator("html")).toHaveAttribute("lang", "nb");
});

test("tema bytter logo, farger og lagres ved oppdatering", async ({ page }) => {
  await backend(page);
  await login(page);
  const brandImage = page.locator(".brand img");
  await expect(brandImage).toHaveAttribute("src", "/dinvenn-logo.png");
  await page
    .getByRole("button", { name: "Bytt til mørk modus", exact: true })
    .click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await expect(brandImage).toHaveAttribute("src", "/dinvenn-logo-dark.png");
  await expect(page.locator("body")).toHaveCSS(
    "background-color",
    "rgb(21, 19, 25)",
  );
  await page
    .getByRole("button", { name: "Bedriftsprofil", exact: true })
    .click();
  await expect(page.getByLabel("Bedriftsnavn", { exact: true })).toHaveCSS(
    "background-color",
    "rgb(32, 28, 36)",
  );
  await expect(page.getByLabel("Bedriftsnavn", { exact: true })).toHaveValue(
    "Hjørnekafeen",
  );
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: `test-results/dark-profile-${test.info().project.name}.png`,
    fullPage: true,
  });
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await expect(brandImage).toHaveAttribute("src", "/dinvenn-logo-dark.png");
  await page
    .getByRole("button", { name: "Bytt til lys modus", exact: true })
    .click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await expect(brandImage).toHaveAttribute("src", "/dinvenn-logo.png");
});

for (const entry of [
  {
    table: "deals",
    tab: "Vennepriser",
    create: "+ Ny vennepris",
    save: "Lagre vennepris",
    notice: "Venneprisen er slettet.",
  },
  {
    table: "events",
    tab: "Arrangementer",
    create: "+ Nytt arrangement",
    save: "Lagre arrangement",
    notice: "Arrangementet er slettet.",
  },
  {
    table: "news_posts",
    tab: "Nyheter",
    create: "+ Ny nyhet",
    save: "Lagre nyhet",
    notice: "Nyheten er slettet.",
  },
]) {
  test(`${entry.tab}: sletting kan avbrytes, håndterer feil og sletter bare valgt innhold`, async ({
    page,
  }) => {
    await backend(page);
    await login(page);
    await page.getByRole("button", { name: entry.tab, exact: true }).click();
    for (const title of ["Slett meg", "Behold meg"]) {
      await page
        .getByRole("button", { name: entry.create, exact: true })
        .click();
      await page.getByLabel("Tittel", { exact: true }).fill(title);
      if (entry.table === "events") {
        await page
          .getByLabel("Beskrivelse", { exact: true })
          .fill("Beskrivelse av arrangementet.");
        await page.getByLabel("Starter (lokal tid)").fill("2099-11-12T17:00");
      }
      if (entry.table === "news_posts")
        await page
          .getByLabel("Nyhetstekst")
          .fill("En oppdatering fra bedriften.");
      await page.getByRole("button", { name: entry.save, exact: true }).click();
      await expect(
        page.getByRole("article").filter({ hasText: title }),
      ).toBeVisible();
    }
    const item = page.getByRole("article").filter({ hasText: "Slett meg" });
    page.once("dialog", (dialog) => dialog.dismiss());
    await item
      .getByRole("button", { name: "Slett Slett meg", exact: true })
      .click();
    await expect(item).toBeVisible();
    let rejectDelete = true;
    await page.route(`**/rest/v1/${entry.table}?*`, async (route) => {
      if (route.request().method() === "DELETE" && rejectDelete) {
        await route.fulfill({
          status: 403,
          contentType: "application/json",
          body: JSON.stringify({ message: "Ikke tilgang" }),
        });
      } else await route.fallback();
    });
    page.once("dialog", (dialog) => dialog.accept());
    await item
      .getByRole("button", { name: "Slett Slett meg", exact: true })
      .click();
    await expect(page.getByRole("alert")).toContainText("Ikke tilgang");
    await expect(item).toBeVisible();
    rejectDelete = false;
    page.once("dialog", (dialog) => dialog.accept());
    const request = page.waitForRequest((r) => r.method() === "DELETE");
    await item
      .getByRole("button", { name: "Slett Slett meg", exact: true })
      .click();
    expect(new URL((await request).url()).searchParams.get("business_id")).toBe(
      `eq.${businessId}`,
    );
    await expect(page.getByText(entry.notice, { exact: true })).toBeVisible();
    await expect(item).toHaveCount(0);
    await expect(
      page.getByRole("article").filter({ hasText: "Behold meg" }),
    ).toBeVisible();
    await page.reload();
    await page.getByRole("button", { name: entry.tab, exact: true }).click();
    await expect(
      page.getByRole("article").filter({ hasText: "Slett meg" }),
    ).toHaveCount(0);
    await expect(
      page.getByRole("article").filter({ hasText: "Behold meg" }),
    ).toBeVisible();
  });
}

const reviewFixture = {
  id: "review1",
  business_id: businessId,
  business_name: "Hjørnekafeen",
  is_anonymous: true,
  author_name: null,
  rating: 5,
  comment: "En fin opplevelse",
  business_reply: null,
  replied_at: null,
  created_at: "2026-11-20T10:00:00Z",
  is_own: false,
};
test("bedriften kan svare på en anonym anmeldelse uten sletteknapp", async ({
  page,
}) => {
  await backend(page, false, undefined, "123456789", [reviewFixture]);
  await login(page);
  await page.getByRole("button", { name: "Anmeldelser", exact: true }).click();
  await expect(page.getByText("Anonym", { exact: true })).toBeVisible();
  await page
    .getByLabel("Svar på anmeldelse fra Anonym")
    .fill("Takk for besøket!");
  await page.getByRole("button", { name: "Lagre svar", exact: true }).click();
  await expect(page.getByText("Svaret er lagret.")).toBeVisible();
  await expect(page.locator("blockquote")).toContainText("Takk for besøket!");
  await expect(
    page.getByRole("button", { name: "Slett anmeldelse", exact: true }),
  ).toHaveCount(0);
});
test("administrator kan slette anmeldelser og kan ikke godkjenne uten organisasjonsnummer", async ({
  page,
}) => {
  await backend(page, true, undefined, null, [reviewFixture]);
  await login(page);
  await page.getByRole("button", { name: "Godkjenning", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Godkjenn", exact: true }),
  ).toBeDisabled();
  await expect(
    page.getByText("Mangler organisasjonsnummer", { exact: false }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Moderering av anmeldelser", exact: true })
    .click();
  page.once("dialog", (dialog) => dialog.dismiss());
  await page
    .getByRole("button", { name: "Slett anmeldelse", exact: true })
    .click();
  await expect(page.getByText("En fin opplevelse")).toBeVisible();
  page.once("dialog", (dialog) => dialog.accept());
  await page
    .getByRole("button", { name: "Slett anmeldelse", exact: true })
    .click();
  await expect(page.getByText("Anmeldelsen er slettet.")).toBeVisible();
  await expect(page.getByText("En fin opplevelse")).toHaveCount(0);
});

test("bedriftsprofil markerer og krever alle felt unntatt nettside og forsidebilde", async ({
  page,
}) => {
  await backend(page);
  await login(page);
  await page
    .getByRole("button", { name: "Bedriftsprofil", exact: true })
    .click();
  for (const name of [
    "Organisasjonsnummer",
    "Bedriftsnavn",
    "By",
    "Adresse",
    "Postnummer",
    "Telefon",
    "E-post",
    "Kategori",
    "Om bedriften",
  ]) {
    const field = page.getByLabel(name, { exact: true });
    await expect(field).toHaveAttribute("required", "");
    await expect(field.locator("..").locator(".required-marker")).toHaveText(
      "*",
    );
    const sameLine = await field.locator("..").evaluate((label) => {
      const caption = label.querySelector(".field-label")!;
      const marker = label.querySelector(".required-marker")!;
      const range = document.createRange();
      range.selectNodeContents(caption.firstChild!);
      const text = range.getBoundingClientRect();
      const star = marker.getBoundingClientRect();
      return (
        Math.abs((text.top + text.bottom) / 2 - (star.top + star.bottom) / 2) <
        3
      );
    });
    expect(sameLine).toBe(true);
  }
  await expect(
    page.getByLabel("Nettside", { exact: true }),
  ).not.toHaveAttribute("required", "");
  await expect(
    page.getByLabel("Forsidebilde (JPG, PNG eller WebP, maks 5 MB)", {
      exact: true,
    }),
  ).not.toHaveAttribute("required", "");
  await page.getByLabel("Telefon", { exact: true }).fill("");
  await page.getByRole("button", { name: "Lagre profil", exact: true }).click();
  expect(
    await page
      .getByLabel("Telefon", { exact: true })
      .evaluate((el: HTMLInputElement) => el.validity.valueMissing),
  ).toBe(true);
  await page.getByLabel("Telefon", { exact: true }).fill("12345678");
  await page.getByRole("button", { name: "Lagre profil", exact: true }).click();
  await expect(
    page.getByText("Profilen er lagret.", { exact: true }),
  ).toBeVisible();
});

test("flere avdelinger kan opprettes, redigeres og slettes uten å endre hovedadressen", async ({
  page,
}) => {
  await backend(page);
  await login(page);
  await page
    .getByRole("button", { name: "Bedriftsprofil", exact: true })
    .click();
  await expect(page.getByText("Ingen ekstra avdelinger ennå.")).toBeVisible();
  await page
    .getByRole("button", { name: "Legg til avdeling", exact: true })
    .click();
  await page.getByLabel("Avdelingsnavn", { exact: true }).fill("Sentrum");
  await page
    .getByLabel("Avdelingsadresse", { exact: true })
    .fill("Markens gate 12A");
  await page.getByLabel("Avdelingens postnummer", { exact: true }).fill("4611");
  await page.getByLabel("Avdelingens by", { exact: true }).fill("Kristiansand");
  const editor = page.getByRole("form", { name: "Avdelingsskjema" });
  await expect(editor.getByLabel("Kartkoordinater")).toContainText("58.145000");
  const request = page.waitForRequest(
    (r) => r.url().includes("/business_locations") && r.method() === "POST",
  );
  await page
    .getByRole("button", { name: "Lagre avdeling", exact: true })
    .click();
  const body = (await request).postDataJSON();
  expect(body.business_id).toBe(businessId);
  expect(body.lat).toBe(58.145);
  expect(body.lng).toBe(7.995);
  await expect(page.getByText("Avdelingen er lagret.")).toBeVisible();
  await page.reload();
  await page
    .getByRole("button", { name: "Bedriftsprofil", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Rediger avdeling Sentrum", exact: true })
    .click();
  await page.getByLabel("Avdelingsnavn", { exact: true }).fill("Sentrum øst");
  // Ny adresse må ikke beholde den gamle pinnen.
  await page
    .getByLabel("Avdelingsadresse", { exact: true })
    .fill("Ukjent gate 99");
  const update = page.waitForRequest(
    (r) => r.url().includes("/business_locations") && r.method() === "PATCH",
  );
  await page
    .getByRole("button", { name: "Lagre avdeling", exact: true })
    .click();
  expect((await update).postDataJSON().lat).toBeNull();
  expect((await update).postDataJSON().lng).toBeNull();
  await expect(
    page.getByRole("button", {
      name: "Rediger avdeling Sentrum øst",
      exact: true,
    }),
  ).toBeVisible();
  page.once("dialog", (d) => d.dismiss());
  await page
    .getByRole("button", { name: "Slett avdeling Sentrum øst", exact: true })
    .click();
  await expect(
    page.getByRole("button", {
      name: "Rediger avdeling Sentrum øst",
      exact: true,
    }),
  ).toBeVisible();
  page.once("dialog", (d) => d.accept());
  await page
    .getByRole("button", { name: "Slett avdeling Sentrum øst", exact: true })
    .click();
  await expect(page.getByText("Ingen ekstra avdelinger ennå.")).toBeVisible();
  await expect(page.getByLabel("Adresse", { exact: true })).toHaveValue(
    "Demogata 1",
  );
});

test("avdelinger kan ikke overskrives når lasting feiler, og kan lastes på nytt", async ({
  page,
}) => {
  await backend(page);
  let fail = true;
  await page.route("**/rest/v1/business_locations?**", (route) =>
    fail
      ? route.fulfill({
          status: 500,
          json: { message: "Avdelingene kunne ikke lastes." },
        })
      : route.fallback(),
  );
  await login(page);
  await page
    .getByRole("button", { name: "Bedriftsprofil", exact: true })
    .click();
  await expect(
    page
      .getByRole("alert")
      .filter({ hasText: "Avdelingene kunne ikke lastes." }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Legg til avdeling", exact: true }),
  ).toHaveCount(0);
  fail = false;
  await page.getByRole("button", { name: "Prøv igjen", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Legg til avdeling", exact: true }),
  ).toBeEnabled();
});

test("gratisgave og 2-for-1 har forklaring og valgfri egen kode", async ({
  page,
}) => {
  await backend(page);
  await login(page);
  await page.getByRole("button", { name: "Vennepriser", exact: true }).click();
  await page.getByRole("button", { name: "+ Ny vennepris" }).click();
  await page.getByLabel("Tittel", { exact: true }).fill("Lunsjgave");
  await page
    .getByRole("checkbox", {
      name: "Krev et spill før venneprisen hentes",
      exact: true,
    })
    .check();
  await page
    .getByRole("combobox", { name: "Type rabatt", exact: true })
    .selectOption("freebie");
  await page
    .getByLabel("Hva får kunden i gave?", { exact: true })
    .fill("Gratis mineralvann når du kjøper lunsj");
  await page
    .getByRole("combobox", { name: "Valg av rabattkode", exact: true })
    .selectOption("custom");
  await page.getByLabel("Egen rabattkode", { exact: true }).fill("LUNSJVENN");
  await expect(
    page.getByText("Rabattkode: LUNSJVENN", { exact: true }),
  ).toBeVisible();
  const request = page.waitForRequest(
    (r) => r.url().includes("/rest/v1/deals") && r.method() === "POST",
  );
  await page
    .getByRole("button", { name: "Lagre vennepris", exact: true })
    .click();
  const body = (await request).postDataJSON();
  expect(body.requires_game).toBe(true);
  expect(body.discount_details).toBe("Gratis mineralvann når du kjøper lunsj");
  expect(body.promo_code).toBe("LUNSJVENN");
  expect(body.discount_value).toBeNull();
  await page.getByRole("button", { name: "Rediger", exact: true }).click();
  await expect(page.getByLabel("Egen rabattkode", { exact: true })).toHaveValue(
    "LUNSJVENN",
  );
  await expect(
    page.getByLabel("Hva får kunden i gave?", { exact: true }),
  ).toHaveValue(body.discount_details);
  await page
    .getByRole("combobox", { name: "Type rabatt", exact: true })
    .selectOption("other");
  await page
    .getByLabel("Hva gjelder tilbudet?", { exact: true })
    .fill("To mineralvann for prisen av ett");
  await page
    .getByRole("combobox", { name: "Valg av rabattkode", exact: true })
    .selectOption("automatic");
  const update = page.waitForRequest(
    (r) => r.url().includes("/rest/v1/deals") && r.method() === "PATCH",
  );
  await page
    .getByRole("button", { name: "Lagre vennepris", exact: true })
    .click();
  expect((await update).postDataJSON().promo_code).toBeNull();
  expect((await update).postDataJSON().discount_details).toBe(
    "To mineralvann for prisen av ett",
  );
});

test("bedrift kan slette eget svar men ikke kundens anmeldelse", async ({
  page,
}) => {
  await backend(page, false, undefined, "123456789", [
    {
      id: "review1",
      business_id: businessId,
      business_name: "Hjørnekafeen",
      author_name: "Kunde",
      rating: 4,
      comment: "God kaffe",
      is_anonymous: false,
      is_own: false,
      business_reply: "Takk for besøket",
      created_at: "2026-11-27T10:00:00Z",
    },
  ]);
  await login(page);
  await page.getByRole("button", { name: "Anmeldelser", exact: true }).click();
  await expect(
    page.locator("blockquote").getByText("Takk for besøket", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Slett anmeldelse", exact: true }),
  ).toHaveCount(0);
  page.once("dialog", (d) => d.dismiss());
  await page
    .getByRole("button", { name: "Slett bedriftens svar", exact: true })
    .click();
  await expect(
    page.locator("blockquote").getByText("Takk for besøket", { exact: true }),
  ).toBeVisible();
  page.once("dialog", (d) => d.accept());
  await page
    .getByRole("button", { name: "Slett bedriftens svar", exact: true })
    .click();
  await expect(
    page.getByText("Svaret er slettet.", { exact: true }),
  ).toBeVisible();
  await expect(page.getByText("God kaffe", { exact: true })).toBeVisible();
  await expect(
    page.locator("blockquote").getByText("Takk for besøket", { exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByLabel("Svar på anmeldelse fra Kunde", { exact: true }),
  ).toHaveValue("");
  await page.reload();
  await page.getByRole("button", { name: "Anmeldelser", exact: true }).click();
  await expect(page.getByText("God kaffe", { exact: true })).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Slett bedriftens svar", exact: true }),
  ).toHaveCount(0);
});
