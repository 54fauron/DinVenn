// Opt-in: real Auth/PostgREST/Storage + independent concurrent HTTP requests.
// Creates isolated test users/businesses and removes them in finally.
import { test } from "node:test";
import assert from "node:assert/strict";
import { createClient } from "@supabase/supabase-js";
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
