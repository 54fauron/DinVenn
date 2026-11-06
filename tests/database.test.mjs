import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";

test("Pilotens migrasjoner og tilgangsregler i PostgreSQL (PGlite, mock av Supabase auth/storage)", async (t) => {
  const db = new PGlite();
  try {
    await db.exec(`
 create role anon nologin; create role authenticated nologin; create role service_role nologin bypassrls;
 create schema auth; create schema storage; create schema extensions;
 create table auth.users(id uuid primary key, email text, raw_user_meta_data jsonb default '{}');
 create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true),'')::uuid $$;
 -- Test-only random bytes shim. Production uses pgcrypto, never this function.
 create function extensions.gen_random_bytes(n int) returns bytea language sql volatile as $$
 select decode(substr(string_agg(md5(random()::text),'') ,1,n*2),'hex') from generate_series(1,ceil(n/16.0)::int) $$;
 create table storage.buckets(id text primary key, name text, public boolean, file_size_limit bigint, allowed_mime_types text[]);
 create table storage.objects(id uuid primary key default gen_random_uuid(), bucket_id text, name text);
 alter table storage.objects enable row level security;
 create function storage.foldername(name text) returns text[] language sql immutable as $$ select string_to_array(name,'/') $$;
 grant usage on schema public, auth, storage, extensions to anon, authenticated, service_role;
 grant all on storage.objects to authenticated;
 alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
 alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;
 alter default privileges in schema public grant execute on functions to anon, authenticated, service_role;
 `);
    for (const name of (await readdir("supabase/migrations"))
      .filter((x) => x.endsWith(".sql"))
      .sort()) {
      let sql = await readFile(`supabase/migrations/${name}`, "utf8");
      sql = sql.replace(
        "create extension if not exists pgcrypto with schema extensions;",
        "-- pgcrypto shim above, only for PGlite tests",
      );
      await t.test(`migrasjon ${name}`, async () => {
        await db.exec(sql);
      });
    }
    const ids = Object.fromEntries(
      ["user", "other", "owner", "owner2", "admin"].map((k, i) => [
        k,
        `00000000-0000-4000-8000-${String(i + 1).padStart(12, "0")}`,
      ]),
    );
    for (const [name, id] of Object.entries(ids))
      await db.query("insert into auth.users (id,email) values ($1,$2)", [
        id,
        `${name}@test.example`,
      ]);
    await db.query("update profiles set role='admin' where id=$1", [ids.admin]);
    async function as(name, fn, role = "authenticated") {
      await db.exec(`set role ${role}`);
      await db.query("select set_config('request.jwt.claim.sub',$1,false)", [
        ids[name] ?? "",
      ]);
      try {
        return await fn();
      } finally {
        await db.exec("reset role");
        await db.exec("select set_config('request.jwt.claim.sub','',false)");
      }
    }
    const query = async (sql, params = []) =>
      (await db.query(sql, params)).rows;
    let business, business2, deal, token;
    await t.test("registrering oppretter profil automatisk", async () => {
      assert.equal(
        (await query("select count(*)::int as n from profiles"))[0].n,
        5,
      );
    });
    await t.test("bruker kan ikke gi seg selv admin", async () => {
      await assert.rejects(
        as("user", () =>
          query("update profiles set role='admin' where id=$1", [ids.user]),
        ),
        /admin/,
      );
    });
    await t.test("bedrift får eiermedlemskap og pending-status", async () => {
      business = (
        await as("owner", () =>
          query(
            "insert into businesses(owner_id,name,slug,status) values ($1,'Kafe','kafe','approved') returning *",
            [ids.owner],
          ),
        )
      )[0];
      assert.equal(business.status, "pending");
      business2 = (
        await as("owner2", () =>
          query(
            "insert into businesses(owner_id,name,slug) values ($1,'Butikk','butikk') returning *",
            [ids.owner2],
          ),
        )
      )[0];
      assert.equal(
        (
          await as("owner", () =>
            query("select * from business_members where business_id=$1", [
              business.id,
            ]),
          )
        ).length,
        1,
      );
    });
    await t.test("bedrift kan ikke godkjenne seg selv", async () => {
      await assert.rejects(
        as("owner", () =>
          query("update businesses set status='approved' where id=$1", [
            business.id,
          ]),
        ),
        /admin/,
      );
    });
    await t.test("pending er skjult for anonyme", async () => {
      assert.equal(
        (await as(null, () => query("select * from businesses"), "anon"))
          .length,
        0,
      );
    });
    await t.test("admin kan godkjenne", async () => {
      await as("admin", () => query("update businesses set status='approved'"));
      assert.equal(
        (await as(null, () => query("select * from businesses"), "anon"))
          .length,
        2,
      );
    });
    await t.test("annen bedrift kan ikke redigere profilen", async () => {
      assert.equal(
        (
          await as("owner2", () =>
            query(
              "update businesses set name='Feil' where id=$1 returning id",
              [business.id],
            ),
          )
        ).length,
        0,
      );
    });
    await t.test("eier kan opprette tilbud", async () => {
      deal = (
        await as("owner", () =>
          query(
            "insert into deals(business_id,title,discount_value,status,max_redemptions) values($1,'20 prosent',20,'active',1) returning *",
            [business.id],
          ),
        )
      )[0];
    });
    await t.test("annen bedrift kan ikke endre tilbud", async () => {
      assert.equal(
        (
          await as("owner2", () =>
            query("update deals set title='Feil' where id=$1 returning id", [
              deal.id,
            ]),
          )
        ).length,
        0,
      );
    });
    await t.test("anonyme kan lese tilbud, men ikke hente QR", async () => {
      assert.equal(
        (await as(null, () => query("select * from deals"), "anon")).length,
        1,
      );
      await assert.rejects(
        as(
          null,
          () => query("select * from claim_deal($1)", [deal.id]),
          "anon",
        ),
        /permission denied/,
      );
    });
    await t.test("favoritter er private", async () => {
      await as("user", () =>
        query(
          "insert into favorites(user_id,target_type,target_id) values($1,'deal',$2)",
          [ids.user, deal.id],
        ),
      );
      assert.equal(
        (await as("other", () => query("select * from favorites"))).length,
        0,
      );
    });
    await t.test("egen innløsning kan ikke settes inn direkte", async () => {
      await assert.rejects(
        as("user", () =>
          query(
            "insert into deal_redemptions(deal_id,user_id,status) values($1,$2,'redeemed')",
            [deal.id, ids.user],
          ),
        ),
        /row-level security/,
      );
    });
    await t.test(
      "claim returnerer gjenbrukbar reservasjon og begrenser kapasitet",
      async () => {
        token = (
          await as("user", () =>
            query("select * from claim_deal($1)", [deal.id]),
          )
        )[0];
        const again = (
          await as("user", () =>
            query("select * from claim_deal($1)", [deal.id]),
          )
        )[0];
        assert.equal(token.id, again.id);
        await assert.rejects(
          as("other", () => query("select * from claim_deal($1)", [deal.id])),
          /utsolgt/,
        );
      },
    );
    await t.test("andre brukere kan ikke lese koden", async () => {
      assert.equal(
        (await as("other", () => query("select * from deal_redemptions")))
          .length,
        0,
      );
    });
    await t.test("feil bedrift kan ikke løse inn", async () => {
      await assert.rejects(
        as("owner2", () =>
          query("select * from redeem_deal($1)", [token.token]),
        ),
        /tilgang/,
      );
    });
    await t.test("suspendert bedrift kan ikke løse inn", async () => {
      await as("admin", () =>
        query("update businesses set status='suspended' where id=$1", [
          business.id,
        ]),
      );
      await assert.rejects(
        as("owner", () =>
          query("select * from redeem_deal($1)", [token.token]),
        ),
        /godkjent/,
      );
      await as("admin", () =>
        query("update businesses set status='approved' where id=$1", [
          business.id,
        ]),
      );
    });
    await t.test("pause av tilbud blokkerer innløsning", async () => {
      await as("owner", () =>
        query("update deals set status='paused' where id=$1", [deal.id]),
      );
      await assert.rejects(
        as("owner", () =>
          query("select * from redeem_deal($1)", [token.token]),
        ),
        /aktivt/,
      );
      await as("owner", () =>
        query("update deals set status='active' where id=$1", [deal.id]),
      );
    });
    await t.test("riktig bedrift kan løse inn én gang", async () => {
      const r = (
        await as("owner", () =>
          query("select * from redeem_deal($1)", [token.token]),
        )
      )[0];
      assert.equal(r.status, "redeemed");
      await assert.rejects(
        as("owner", () =>
          query("select * from redeem_deal($1)", [token.token]),
        ),
        /allerede brukt/,
      );
      await assert.rejects(
        as("user", () => query("select * from claim_deal($1)", [deal.id])),
        /allerede brukt/,
      );
    });
    await t.test("utløpte koder blir avvist", async () => {
      const d = (
        await as("owner", () =>
          query(
            "insert into deals(business_id,title,discount_value,status) values($1,'Utløpsprøve',10,'active') returning *",
            [business.id],
          ),
        )
      )[0];
      const r = (
        await as("other", () => query("select * from claim_deal($1)", [d.id]))
      )[0];
      await query(
        "update deal_redemptions set expires_at=now()-interval '1 minute' where id=$1",
        [r.id],
      );
      await assert.rejects(
        as("owner", () => query("select * from redeem_deal($1)", [r.token])),
        /utløpt/,
      );
    });
    await t.test(
      "ugyldige grenser, datoer og rabatt avvises av databasen",
      async () => {
        for (const extra of [
          "max_per_user=0",
          "max_redemptions=-1",
          "ends_at=starts_at",
          "discount_value=120",
        ])
          await assert.rejects(
            as("owner", () =>
              query(`update deals set ${extra} where id=$1`, [deal.id]),
            ),
            /check constraint/,
          );
      },
    );
    await t.test(
      "bilder kan bare lastes opp og endres i egen bedriftsmappe",
      async () => {
        await as("owner", () =>
          query(
            "insert into storage.objects(bucket_id,name) values('business-images',$1)",
            [business.id + "/test.jpg"],
          ),
        );
        await assert.rejects(
          as("owner2", () =>
            query(
              "insert into storage.objects(bucket_id,name) values('business-images',$1)",
              [business.id + "/evil.jpg"],
            ),
          ),
          /row-level security/,
        );
        assert.equal(
          (
            await as("owner2", () =>
              query(
                "update storage.objects set name=$1 where name=$2 returning id",
                [business.id + "/evil.jpg", business.id + "/test.jpg"],
              ),
            )
          ).length,
          0,
        );
        await assert.rejects(
          as("owner", () =>
            query("update storage.objects set name=$1 where name=$2", [
              business2.id + "/moved.jpg",
              business.id + "/test.jpg",
            ]),
          ),
          /row-level security/,
        );
      },
    );
    await t.test(
      "interne poengfunksjoner kan ikke kalles av brukere",
      async () => {
        await assert.rejects(
          as("user", () =>
            query("select award_points($1,999,'juks',null,null)", [ids.user]),
          ),
          /permission denied/,
        );
      },
    );
  } finally {
    await db.close();
  }
});
