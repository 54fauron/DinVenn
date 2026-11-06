// Opt-in: real Auth/PostgREST/Storage + independent concurrent HTTP requests.
// Creates isolated test users/businesses and removes them in finally.
import { test } from "node:test";
import assert from "node:assert/strict";
import { createClient } from "@supabase/supabase-js";
import { api } from "../packages/core/src/index.ts";
const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_PUBLISHABLE_KEY;
const secret = process.env.SUPABASE_SERVICE_ROLE_KEY;
const enabled = !!url && !!key && !!secret;
test(
  "Ekte Supabase: kontoer, RLS, bilder, favoritter og samtidige QR-forespørsler",
  { skip: !enabled },
  async () => {
    const options = {
      auth: { persistSession: false, autoRefreshToken: false },
    };
    const service = createClient(url, secret, options);
    const anon = createClient(url, key, options);
    const stamp = crypto.randomUUID();
    const password = crypto.randomUUID() + "!a9";
    const users = [];
    const businesses = [];
    const uploaded = [];
    const check = (r) => {
      if (r.error) throw new Error(r.error.message);
      return r.data;
    };
    try {
      const clients = {};
      for (const name of ["user", "other", "owner", "owner2", "admin"]) {
        const email = `${name}-${stamp}@dinvenn.example`;
        const { user } = check(
          await service.auth.admin.createUser({
            email,
            password,
            email_confirm: true,
          }),
        );
        users.push(user.id);
        const client = createClient(url, key, options);
        check(await client.auth.signInWithPassword({ email, password }));
        clients[name] = { client, id: user.id };
      }
      check(
        await service
          .from("profiles")
          .update({ role: "admin" })
          .eq("id", clients.admin.id),
      );
      const { client: owner, id: ownerId } = clients.owner;
      const { client: owner2 } = clients.owner2;
      const { client: admin } = clients.admin;
      const { client: user, id: userId } = clients.user;
      const { client: other } = clients.other;
      const b = check(
        await owner
          .from("businesses")
          .insert({
            name: "TEST Kafé",
            slug: `test-${stamp}`,
            owner_id: ownerId,
          })
          .select()
          .single(),
      );
      businesses.push(b.id);
      const b2 = check(
        await owner2
          .from("businesses")
          .insert({
            name: "TEST Annen",
            slug: `test-other-${stamp}`,
            owner_id: clients.owner2.id,
          })
          .select()
          .single(),
      );
      businesses.push(b2.id);
      assert.equal(b.status, "pending");
      assert.equal(
        check(await anon.from("businesses").select("id").eq("id", b.id)).length,
        0,
      );
      assert.ok(
        (
          await owner
            .from("businesses")
            .update({ status: "approved" })
            .eq("id", b.id)
        ).error,
      );
      check(
        await admin
          .from("businesses")
          .update({ status: "approved" })
          .eq("id", b.id),
      );
      assert.equal(
        check(
          await owner2
            .from("businesses")
            .update({ name: "Juks" })
            .eq("id", b.id)
            .select(),
        ).length,
        0,
      );
      const event = check(
        await owner
          .from("events")
          .insert({
            business_id: b.id,
            title: "TEST Workshop",
            description: "En lokal kveld.",
            starts_at: new Date(Date.now() + 86400000).toISOString(),
            price_text: "Gratis",
            status: "active",
          })
          .select()
          .single(),
      );
      assert.equal(
        check(await anon.from("events").select("id").eq("id", event.id)).length,
        1,
      );
      assert.ok(
        (await api(anon).catalog()).events.some((e) => e.id === event.id),
      );
      await api(user).favorite(userId, "event", event.id, true);
      assert.ok(
        (await api(user).favorites(userId)).some(
          (f) => f.target_type === "event" && f.target_id === event.id,
        ),
      );
      assert.equal(
        check(
          await owner2
            .from("events")
            .update({ title: "Juks" })
            .eq("id", event.id)
            .select(),
        ).length,
        0,
      );
      check(
        await owner
          .from("events")
          .update({ status: "paused" })
          .eq("id", event.id),
      );
      assert.equal(
        check(await anon.from("events").select("id").eq("id", event.id)).length,
        0,
      );
      const news = check(
        await owner
          .from("news_posts")
          .insert({
            business_id: b.id,
            title: "TEST Ny meny",
            body: "Suppe og nybakt brød.",
            status: "active",
          })
          .select()
          .single(),
      );
      assert.equal(
        check(await anon.from("news_posts").select("id").eq("id", news.id))
          .length,
        1,
      );
      assert.ok((await api(anon).catalog()).news.some((n) => n.id === news.id));
      assert.equal(
        check(
          await owner2
            .from("news_posts")
            .update({ body: "Juks" })
            .eq("id", news.id)
            .select(),
        ).length,
        0,
      );
      check(
        await owner
          .from("news_posts")
          .update({ body: "Oppdatert meny.", status: "paused" })
          .eq("id", news.id),
      );
      assert.equal(
        check(await anon.from("news_posts").select("id").eq("id", news.id))
          .length,
        0,
      );
      const oldEvent = check(
        await owner
          .from("events")
          .insert({
            business_id: b.id,
            title: "TEST Avsluttet",
            starts_at: new Date(Date.now() - 172800000).toISOString(),
            ends_at: new Date(Date.now() - 86400000).toISOString(),
            status: "active",
          })
          .select()
          .single(),
      );
      const futureNews = check(
        await owner
          .from("news_posts")
          .insert({
            business_id: b.id,
            title: "TEST Fremtid",
            body: "Ikke publisert ennå.",
            published_at: new Date(Date.now() + 86400000).toISOString(),
            status: "active",
          })
          .select()
          .single(),
      );
      const mobileFeed = await api(anon).catalog();
      assert.ok(
        !mobileFeed.events.some(
          (e) => e.id === event.id || e.id === oldEvent.id,
        ),
      );
      assert.ok(
        !mobileFeed.news.some(
          (n) => n.id === news.id || n.id === futureNews.id,
        ),
      );
      assert.equal(
        check(
          await owner
            .from("subscriptions")
            .select("plan")
            .eq("business_id", b.id),
        ).length,
        1,
      );
      assert.equal(
        check(
          await owner2
            .from("subscriptions")
            .select("plan")
            .eq("business_id", b.id),
        ).length,
        0,
      );
      const d = check(
        await owner
          .from("deals")
          .insert({
            business_id: b.id,
            title: "TEST 20 %",
            discount_type: "percent",
            discount_value: 20,
            status: "active",
            max_redemptions: 1,
          })
          .select()
          .single(),
      );
      check(
        await user
          .from("favorites")
          .insert({ user_id: userId, target_type: "deal", target_id: d.id }),
      );
      assert.equal(
        check(await other.from("favorites").select("*").eq("user_id", userId))
          .length,
        0,
      );
      assert.equal(
        check(await anon.from("deals").select("id").eq("id", d.id)).length,
        1,
      );
      const results = await Promise.all([
        user.rpc("claim_deal", { p_deal_id: d.id }),
        other.rpc("claim_deal", { p_deal_id: d.id }),
      ]);
      assert.equal(
        results.filter((r) => !r.error).length,
        1,
        "only one reservation with capacity 1",
      );
      const r = check(results.find((r) => !r.error));
      assert.ok((await owner2.rpc("redeem_deal", { p_token: r.token })).error);
      const redeemed = await Promise.all([
        owner.rpc("redeem_deal", { p_token: r.token }),
        owner.rpc("redeem_deal", { p_token: r.token }),
      ]);
      assert.equal(
        redeemed.filter((r) => !r.error).length,
        1,
        "only one concurrent redemption succeeds",
      );
      const exp = check(
        await owner
          .from("deals")
          .insert({
            business_id: b.id,
            title: "TEST Utløp",
            discount_value: 10,
            status: "active",
          })
          .select()
          .single(),
      );
      const expCode = check(
        await user.rpc("claim_deal", { p_deal_id: exp.id }),
      );
      check(
        await service
          .from("deal_redemptions")
          .update({ expires_at: new Date(Date.now() - 60000).toISOString() })
          .eq("id", expCode.id),
      );
      assert.ok(
        (await owner.rpc("redeem_deal", { p_token: expCode.token })).error,
      );
      // A valid 1x1 PNG: verifies actual Storage service, not just SQL policies.
      const png = Buffer.from(
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a6ioAAAAASUVORK5CYII=",
        "base64",
      );
      const path = `${b.id}/${stamp}.png`;
      check(
        await owner.storage
          .from("business-images")
          .upload(path, png, { contentType: "image/png" }),
      );
      uploaded.push(path);
      assert.ok(
        (
          await owner2.storage
            .from("business-images")
            .upload(`${b.id}/wrong-${stamp}.png`, png, {
              contentType: "image/png",
            })
        ).error,
      );
      console.log(
        "Ekte Supabase-kjerneflyt og samtidighet bestått. E-postlevering og kamera krever manuell enhetstest.",
      );
    } finally {
      if (uploaded.length)
        check(await service.storage.from("business-images").remove(uploaded));
      if (businesses.length)
        check(await service.from("businesses").delete().in("id", businesses));
      for (const id of users) check(await service.auth.admin.deleteUser(id));
    }
  },
);
