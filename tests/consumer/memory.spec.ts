import { test, expect } from "@playwright/test";
for (const retry of [false, true])
  test(`Memory krever åtte par, nytt forsøk: ${retry}`, async ({
    page,
  }, info) => {
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
    const board = Array.from({ length: 16 }, (_, i) => i % 8);
    let matched: number[] = [],
      revealed: number[] = [],
      pending = -1,
      mistakes = 0,
      revision = 0,
      result = "",
      claimed = false,
      claimCalls = 0;
    const snapshot = () => ({
      id: "memory-session",
      kind: "memory",
      revision,
      completed: result === "win",
      expires_at: "2099-01-01T00:00:00Z",
      state: {
        faces: board.map((v, i) =>
          matched.includes(i) || revealed.includes(i) ? v : null,
        ),
        matched,
        revealed,
        mistakes,
        max_mistakes: 6,
        result,
      },
    });
    const redemption = {
      id: "r1",
      deal_id: "d1",
      user_id: user.id,
      status: "issued",
      token: "memory-unique-token",
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
            title: "Memorypris",
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
        expect(data.p_revision).toBe(revision);
        const a = data.p_action;
        if (a === -1) {
          expect(result).toBe("loss");
          matched = [];
          revealed = [];
          pending = -1;
          mistakes = 0;
          result = "";
        } else if (pending === -1) {
          revealed = [a];
          pending = a;
        } else {
          revealed = [pending, a];
          if (board[a] === board[pending]) matched.push(pending, a);
          else mistakes++;
          pending = -1;
          result = matched.length === 16 ? "win" : mistakes >= 6 ? "loss" : "";
        }
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
    await page.getByText("Memorypris", { exact: true }).first().click();
    await page
      .getByRole("button", { name: "Spill og hent venneprisen", exact: true })
      .click();
    await expect(
      page.getByText("FINN DE LOKALE FAVORITTENE", { exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: /^Snu kort \d+$/ }),
    ).toHaveCount(16);
    if (retry) {
      for (let i = 0; i < 6; i++) {
        const first = page.getByRole("button", {
          name: "Snu kort 1",
          exact: true,
        });
        await expect(first).toBeEnabled();
        await first.click();
        await page
          .getByRole("button", { name: "Snu kort 2", exact: true })
          .click();
        await expect(
          page.getByText(`${5 - i} feil igjen`, { exact: true }),
        ).toBeVisible();
      }
      await expect(
        page.getByText("Seks feil – prøv en ny runde", { exact: true }),
      ).toBeVisible();
      expect(claimCalls).toBe(0);
      await expect(
        page.getByRole("button", { name: "Hent venneprisen min", exact: true }),
      ).toHaveCount(0);
      await page
        .getByRole("button", { name: "Prøv igjen", exact: true })
        .click();
      await expect(
        page.getByText("6 feil igjen", { exact: true }),
      ).toBeVisible();
    }
    await page.screenshot({
      path: info.outputPath("memory.png"),
      fullPage: true,
    });
    for (let i = 0; i < 8; i++) {
      await page
        .getByRole("button", { name: `Snu kort ${i + 1}`, exact: true })
        .click();
      await page
        .getByRole("button", { name: `Snu kort ${i + 9}`, exact: true })
        .click();
    }
    await expect(
      page.getByText("Alle parene er funnet!", { exact: true }),
    ).toBeVisible();
    expect(claimCalls).toBe(0);
    await page
      .getByRole("button", { name: "Hent venneprisen min", exact: true })
      .click();
    await expect(
      page.getByRole("img", { name: "QR", exact: true }),
    ).toBeVisible();
    expect(claimCalls).toBe(1);
    expect(errors).toEqual([]);
  });
