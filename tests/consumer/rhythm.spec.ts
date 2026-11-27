import { test, expect } from "@playwright/test";
import { cheeseTargets, rhythmScore } from "../../apps/mobile/src/rhythm";
async function observeAudio(page: import("@playwright/test").Page) {
  await page.addInitScript(() => {
    const Base = window.AudioContext;
    class ObservedAudio extends Base {
      createBufferSource() {
        const source = super.createBufferSource();
        const start = source.start.bind(source);
        source.start = (
          ...args: Parameters<AudioBufferSourceNode["start"]>
        ) => {
          (window as any).__audio = {
            context: this,
            zero: args[0] ?? this.currentTime,
          };
          return start(...args);
        };
        return source;
      }
    }
    window.AudioContext = ObservedAudio;
  });
}
test("Ost på rømmen spiller hele lydrunden før QR", async ({ page }, info) => {
  test.setTimeout(95000);
  await observeAudio(page);
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  const user = {
    id: "memory-user",
    email: "memory@example.com",
    aud: "authenticated",
    role: "authenticated",
    user_metadata: { display_name: "Spiller" },
    app_metadata: {},
    created_at: new Date().toISOString(),
  };
  const jwt = `${Buffer.from('{"alg":"HS256"}').toString("base64url")}.${Buffer.from(JSON.stringify({ sub: user.id, exp: Math.floor(Date.now() / 1000) + 3600 })).toString("base64url")}.test`;

  let state: any = { phase: "ready", result: "" },
    revision = 0,
    result = "",
    claimed = false,
    claimCalls = 0;
  const kind = "cheese_rhythm";
  const snapshot = () => ({
    id: "rhythm-session",
    kind,
    state,
    revision,
    completed: result === "win",
    expires_at: "2099-01-01T00:00:00Z",
  });
  const redemption = {
    id: "r1",
    deal_id: "d1",
    user_id: user.id,
    status: "issued",
    token: "rhythm-unique-token",
    issued_at: new Date().toISOString(),
    expires_at: "2099-01-01T00:00:00Z",
  };
  await page.route("https://dinvenn-test.supabase.co/**", (route) => {
    const request = route.request(),
      path = new URL(request.url()).pathname,
      data = request.postDataJSON();
    const send = (json: unknown) => route.fulfill({ json });
    if (request.method() === "OPTIONS") return send({});
    if (path.endsWith("/token"))
      return send({
        access_token: jwt,
        refresh_token: "refresh",
        expires_in: 3600,
        token_type: "bearer",
        user,
      });
    if (path.endsWith("/user")) return send(user);
    if (path.endsWith("/profiles"))
      return send({
        id: user.id,
        role: "user",
        display_name: "Spiller",
        home_city: "Drammen",
      });
    if (path.endsWith("/businesses"))
      return send([
        { id: "b1", name: "Testkafeen", status: "approved", city: "Drammen" },
      ]);
    if (path.endsWith("/deals"))
      return send([
        {
          id: "d1",
          business_id: "b1",
          title: "Ostepris",
          discount_type: "percent",
          discount_value: 10,
          requires_game: true,
          status: "active",
          starts_at: "2026-01-01T00:00:00Z",
          max_per_user: 1,
          terms: "10 % på lunsj.",
        },
      ]);
    if (path.endsWith("/start_deal_game")) return send(snapshot());
    if (path.endsWith("/play_deal_game")) {
      expect(data.p_action).toBe(-2);
      expect(data.p_revision).toBe(revision);
      revision++;
      state = { phase: "running", result: "" };
      return send(snapshot());
    }
    if (path.endsWith("/finish_rhythm_game")) {
      expect(data.p_revision).toBe(revision);
      const score = rhythmScore(data.p_taps);
      expect(score.hits).toBeGreaterThanOrEqual(14);
      expect(score.extras).toBeLessThanOrEqual(5);
      result = score.win ? "win" : "loss";
      state = { phase: "done", result, hits: score.hits, extras: score.extras };
      revision++;
      return send(snapshot());
    }
    if (path.endsWith("/claim_deal")) {
      expect(result).toBe("win");
      claimCalls++;
      claimed = true;
      return send(redemption);
    }
    if (path.endsWith("/deal_redemptions"))
      return send(claimed ? [redemption] : []);
    return send([]);
  });

  await page.goto("/");
  await page.getByRole("tab", { name: "Meg", exact: true }).click();
  await page.getByLabel("E-post", { exact: true }).fill(user.email);
  await page.getByLabel("Passord (minst 8 tegn)").fill("testpassword");
  await page.getByRole("button", { name: "Logg inn", exact: true }).click();
  await page.getByText("Ostepris", { exact: true }).first().click();
  await page
    .getByRole("button", { name: "Spill og hent venneprisen", exact: true })
    .click();
  await expect(
    page.getByText("UTAKT · 116 BPM", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Start runden", exact: true }).click();
  await expect(page.getByTestId("rhythm-catch")).toBeVisible();
  expect(claimCalls).toBe(0);
  await page.evaluate((targets) => {
    let next = 0;
    const tap = () => {
      const playback = (window as any).__audio;
      if (!playback) return;
      const time = playback.context.currentTime - playback.zero;
      if (next < targets.length && time >= targets[next]) {
        (
          document.querySelector('[data-testid="rhythm-catch"]') as HTMLElement
        )?.click();
        next++;
      }
      if (next < targets.length) requestAnimationFrame(tap);
    };
    requestAnimationFrame(tap);
  }, cheeseTargets);
  await page.screenshot({
    path: info.outputPath("cheese.png"),
    fullPage: true,
  });
  await expect(
    page.getByText("Venneprisen er låst opp!", { exact: true }),
  ).toBeVisible({ timeout: 75000 });
  await page
    .getByRole("button", { name: "Hent venneprisen min", exact: true })
    .click();
  await expect(
    page.getByRole("img", { name: "QR", exact: true }),
  ).toBeVisible();
  expect(claimCalls).toBe(1);
  expect(errors).toEqual([]);
});
test("Ost på rømmen kan spilles fritt og lyden stopper ved lukking", async ({
  page,
}) => {
  await observeAudio(page);
  await page.route("https://dinvenn-test.supabase.co/**", (r) =>
    r.fulfill({ json: [] }),
  );
  await page.goto("/");
  await page.getByRole("tab", { name: "Meg", exact: true }).click();
  await page
    .getByRole("button", { name: "Ost på rømmen", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Spill for moro skyld", exact: true })
    .click();
  await page.getByRole("button", { name: "Start runden", exact: true }).click();
  await expect(page.getByTestId("rhythm-catch")).toBeVisible();
  await page.getByRole("button", { name: "Lukk spillet", exact: true }).click();
  await expect
    .poll(() => page.evaluate(() => (window as any).__audio.context.state))
    .toBe("closed");
});

test("lydfeil gir nytt forsøk uten å starte en runde", async ({ page }) => {
  await page.route("https://dinvenn-test.supabase.co/**", (r) =>
    r.fulfill({ json: [] }),
  );
  await page.route("**/*.wav*", (r) => r.abort());
  await page.goto("/");
  await page.getByRole("tab", { name: "Meg", exact: true }).click();
  await page
    .getByRole("button", { name: "Ost på rømmen", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Spill for moro skyld", exact: true })
    .click();
  await page.getByRole("button", { name: "Start runden", exact: true }).click();
  await expect(page.getByRole("alert")).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Start runden", exact: true }),
  ).toBeEnabled();
  await expect(page.getByTestId("rhythm-catch")).toHaveCount(0);
});

test("osten og sokkeosten har tegnet kropp og fast bordkontakt", async ({
  page,
}, info) => {
  await observeAudio(page);
  await page.addInitScript(() => {
    const Base = window.AudioContext;
    (window as any).__cheeseOffset = 0;
    class AdjustableAudio extends Base {
      get currentTime() {
        return super.currentTime + ((window as any).__cheeseOffset ?? 0);
      }
    }
    window.AudioContext = AdjustableAudio;
  });
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.route("https://dinvenn-test.supabase.co/**", (r) =>
    r.fulfill({ json: [] }),
  );
  await page.goto("/");
  await page.getByRole("tab", { name: "Meg", exact: true }).click();
  await page
    .getByRole("button", { name: "Ost på rømmen", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Spill for moro skyld", exact: true })
    .click();
  const cheese = page.getByTestId("rhythm-cheese"),
    counter = page.getByTestId("rhythm-counter");
  await expect(
    page.getByTestId("rhythm-cheese-art").locator("svg"),
  ).toBeVisible();
  const before = await cheese.boundingBox(),
    table = await counter.boundingBox();
  expect(before!.y + before!.height).toBeGreaterThan(table!.y);
  expect(before!.y + before!.height).toBeLessThan(
    table!.y + table!.height * 0.35,
  );
  await counter
    .locator("..")
    .screenshot({ path: info.outputPath("grounded-cheese.png") });
  await page.getByRole("button", { name: "Start runden", exact: true }).click();
  await expect(page.getByTestId("rhythm-catch")).toBeVisible();
  await page.evaluate(() => {
    (window as any).__cheeseOffset = 25;
  });
  await expect(
    page.getByTestId("rhythm-sock-cheese").locator("svg"),
  ).toBeVisible();
  const after = await cheese.boundingBox();
  const afterTable = await counter.boundingBox();
  expect(
    Math.abs(
      after!.y +
        after!.height -
        afterTable!.y -
        (before!.y + before!.height - table!.y),
    ),
  ).toBeLessThan(1);
  await expect(cheese).not.toContainText("🧀");
  await expect(cheese).not.toContainText("🧦");
  await expect(cheese).not.toContainText("••");
  await counter
    .locator("..")
    .screenshot({ path: info.outputPath("grounded-sock-cheese.png") });
  await page.getByRole("button", { name: "Lukk spillet", exact: true }).click();
  expect(errors).toEqual([]);
});
