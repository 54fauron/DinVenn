import { test, expect } from "@playwright/test";
for (const kind of ["burgers", "sliding_puzzle"])
  test(`${kind} fra spill til QR`, async ({ page }, info) => {
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

    const initial = (): any =>
      kind === "burgers"
        ? { target: [0, 1, 2, 3, 4, 5], stack: [], mistakes: 0, result: "" }
        : { tiles: [1, 2, 3, 4, 5, 6, 0, 7, 8], moves: 0, result: "" };
    let state = initial(),
      revision = 0,
      result = "",
      claimed = false,
      claimCalls = 0;
    const snapshot = () => ({
      id: "side-session",
      kind,
      state,
      revision,
      completed: state.result === "win",
      expires_at: "2099-01-01T00:00:00Z",
    });
    const redemption = {
      id: "r1",
      deal_id: "d1",
      user_id: user.id,
      status: "issued",
      token: "side-unique-token",
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
            title: "Sidespillpris",
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
        const action = data.p_action;
        if (action === -1) {
          state = initial();
        } else if (kind === "burgers") {
          if (action === state.target[state.stack.length])
            state.stack.push(action);
          else state.mistakes++;
          state.result =
            state.stack.length === 6
              ? "win"
              : state.mistakes >= 3
                ? "loss"
                : "";
        } else {
          const blank = state.tiles.indexOf(0);
          expect(
            Math.abs(Math.floor(action / 3) - Math.floor(blank / 3)) +
              Math.abs((action % 3) - (blank % 3)),
          ).toBe(1);
          [state.tiles[action], state.tiles[blank]] = [
            state.tiles[blank],
            state.tiles[action],
          ];
          state.moves++;
          state.result = state.tiles.every(
            (v: number, i: number) => v === [1, 2, 3, 4, 5, 6, 7, 8, 0][i],
          )
            ? "win"
            : "";
        }
        result = state.result;
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
    await page.getByText("Sidespillpris", { exact: true }).first().click();
    await page
      .getByRole("button", { name: "Spill og hent venneprisen", exact: true })
      .click();
    if (kind === "burgers") {
      for (let i = 0; i < 3; i++)
        await page
          .getByRole("button", { name: "Legg til Burgertopp", exact: true })
          .click();
      await expect(
        page.getByText("Tre feil – prøv en ny bestilling", { exact: true }),
      ).toBeVisible();
      expect(claimCalls).toBe(0);
      await page
        .getByRole("button", { name: "Prøv igjen", exact: true })
        .click();
      for (const name of ["Burgerbunn", "Burger", "Ost"])
        await page
          .getByRole("button", { name: `Legg til ${name}`, exact: true })
          .click();
      await page.waitForTimeout(450); // Let the native-driven reveal animation settle for visual QA.
      await page.screenshot({
        path: info.outputPath("burger.png"),
        fullPage: true,
      });
      for (const name of ["Tomat", "Salat", "Burgertopp"])
        await page
          .getByRole("button", { name: `Legg til ${name}`, exact: true })
          .click();
      await expect(
        page.getByText("Bestillingen er klar!", { exact: true }),
      ).toBeVisible();
    } else {
      await expect(
        page.getByRole("button", { name: "Flytt brikke 1", exact: true }),
      ).toBeDisabled();
      await page.waitForTimeout(450); // Let the native-driven reveal animation settle for visual QA.
      await page.screenshot({
        path: info.outputPath("sliding.png"),
        fullPage: true,
      });
      await page
        .getByRole("button", { name: "Flytt brikke 7", exact: true })
        .click();
      await page
        .getByRole("button", { name: "Flytt brikke 8", exact: true })
        .click();
      await expect(
        page.getByText("Alle brikkene er på plass!", { exact: true }),
      ).toBeVisible();
    }
    expect(claimCalls).toBe(0);
    await page
      .getByRole("button", { name: "Hent venneprisen min", exact: true })
      .click();
    await expect(
      page.getByRole("img", { name: "QR", exact: true }),
    ).toBeVisible();
    expect(claimCalls).toBe(1);
    expect(errors).toEqual([]);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBeTruthy();
  });
