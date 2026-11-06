import { test, expect, type Page } from "@playwright/test";
const ownerId = "00000000-0000-4000-8000-000000000001";
const businessId = "00000000-0000-4000-8000-000000000002";
async function backend(page: Page, admin = false) {
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
    status: "pending",
  };
  let deals: Record<string, unknown>[] = [];
  let used = false;
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
  await page.getByRole("button", { name: "Suspender", exact: true }).click();
  await expect(page.getByText("Suspendert", { exact: true })).toBeVisible();
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
