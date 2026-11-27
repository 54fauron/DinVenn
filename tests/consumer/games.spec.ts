import { test, expect } from "@playwright/test";
for (const kind of ["tic_tac_toe"])
  test(`spillflyt ${kind} fullføres før QR`, async ({ page }, info) => {
    const user = {
      id: "u1",
      email: "game@example.com",
      aud: "authenticated",
      role: "authenticated",
      user_metadata: { display_name: "Spiller" },
      app_metadata: {},
      created_at: new Date().toISOString(),
    };
    const jwt = `${Buffer.from('{"alg":"HS256"}').toString("base64url")}.${Buffer.from(JSON.stringify({ sub: user.id, exp: Math.floor(Date.now() / 1000) + 3600 })).toString("base64url")}.test`;
    let state: any = { board: Array(9).fill(""), result: "" };
    let game = {
        id: "session1",
        kind,
        state,
        revision: 0,
        completed: false,
        expires_at: "2099-01-01T00:00:00Z",
      },
      pending = -1,
      claimed = false,
      claimCalls = 0;
    const board = [0, 1, 2, 0, 1, 2];
    const result = (b: string[]) =>
      [
        [0, 1, 2],
        [3, 4, 5],
        [6, 7, 8],
        [0, 3, 6],
        [1, 4, 7],
        [2, 5, 8],
        [0, 4, 8],
        [2, 4, 6],
      ].some((line) => b[line[0]] && line.every((i) => b[i] === b[line[0]])) ||
      !b.includes("");
    const redemption = {
      id: "r1",
      deal_id: "d1",
      user_id: user.id,
      status: "issued",
      token: "unique-qr-token",
      issued_at: new Date().toISOString(),
      expires_at: "2099-01-01T00:00:00Z",
    };
    await page.route("https://dinvenn-test.supabase.co/**", (route) => {
      const request = route.request(),
        path = new URL(request.url()).pathname,
        data = request.postDataJSON();
      const send = (json: unknown, status = 200) =>
        route.fulfill({ status, json });
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
            title: "Spillpris",
            discount_type: "percent",
            discount_value: 10,
            requires_game: true,
            status: "active",
            starts_at: "2026-01-01T00:00:00Z",
            max_per_user: 1,
            terms: "10 % på lunsj.",
          },
        ]);
      if (path.endsWith("/start_deal_game")) return send(game);
      if (path.endsWith("/play_deal_game")) {
        expect(data.p_revision).toBe(game.revision);
        const a = data.p_action;
        state.board[a] = "X";
        if (!result(state.board)) state.board[state.board.indexOf("")] = "O";
        game.completed = result(state.board);
        game = { ...game, state, revision: game.revision + 1 };
        return send(game);
      }
      if (path.endsWith("/claim_deal")) {
        claimCalls++;
        expect(game.completed).toBeTruthy();
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
    await page.getByText("Spillpris", { exact: true }).first().click();
    await page
      .getByRole("button", { name: "Spill og hent venneprisen", exact: true })
      .click();
    await expect(
      page.getByText("SPILL OG HENT VENNEPRISEN", { exact: true }),
    ).toBeVisible();
    expect(claimCalls).toBe(0);
    await page.screenshot({
      path: info.outputPath(`${kind}.png`),
      fullPage: true,
    });
    {
      for (let i = 0; i < 5 && !game.completed; i++) {
        const square = state.board.indexOf("") + 1;
        const response = page.waitForResponse((r) =>
          r.url().endsWith("/rpc/play_deal_game"),
        );
        await page
          .getByRole("button", { name: `Rute ${square}`, exact: true })
          .click();
        await response;
      }
    }
    await expect(
      page.getByText("Runden er fullført!", { exact: true }),
    ).toBeVisible();
    expect(claimCalls).toBe(0);
    await page
      .getByRole("button", { name: "Hent venneprisen min", exact: true })
      .click();
    await expect(
      page.getByRole("img", { name: "QR", exact: true }),
    ).toBeVisible();
    expect(claimCalls).toBe(1);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBeTruthy();
  });
