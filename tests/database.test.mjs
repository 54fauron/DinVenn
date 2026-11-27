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
      .filter((x) => x.endsWith(".sql") && !x.includes("000015_"))
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
    await t.test("organisasjonsnummer er påkrevd og privat", async () => {
      await assert.rejects(
        as("admin", () =>
          query("update businesses set status='approved' where id=$1", [
            business.id,
          ]),
        ),
        /Organisasjonsnummer/,
      );
      await as("owner", () =>
        query("select save_business_org($1, '123456789')", [business.id]),
      );
      await as("owner2", () =>
        query("select save_business_org($1, '987654321')", [business2.id]),
      );
      assert.equal(
        (
          await as("owner", () =>
            query("select get_business_org($1) as org", [business.id]),
          )
        )[0].org,
        "123456789",
      );
      assert.equal(
        (
          await as("other", () =>
            query("select * from business_private_details"),
          )
        ).length,
        0,
      );
      await assert.rejects(
        as("other", () => query("select get_business_org($1)", [business.id])),
        /tilgang/,
      );
      await assert.rejects(
        as("owner2", () =>
          query("select save_business_org($1, '111111111')", [business.id]),
        ),
        /tilgang/,
      );
      await assert.rejects(
        as("owner", () =>
          query("select save_business_org($1, '')", [business.id]),
        ),
        /ni sifre/,
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
    await t.test(
      "avdelinger har egen adresse, kartpinne og tilgang per bedrift",
      async () => {
        const branch = (
          await as("owner", () =>
            query(
              "insert into business_locations(business_id,name,address,postal_code,city,lat,lng) values($1,'Sentrum','Storgata 2','3015','Drammen',59.74,10.2) returning *",
              [business.id],
            ),
          )
        )[0];
        await as("admin", () =>
          query("update businesses set status='pending' where id=$1", [
            business2.id,
          ]),
        );
        const hidden = (
          await as("owner2", () =>
            query(
              "insert into business_locations(business_id,name,address,postal_code,city) values($1,'Vest','Vestgata 1','3016','Drammen') returning *",
              [business2.id],
            ),
          )
        )[0];
        assert.equal(
          (
            await as(
              null,
              () => query("select * from business_locations"),
              "anon",
            )
          ).length,
          1,
        );
        assert.equal(
          (
            await as("owner2", () =>
              query("select * from business_locations where id=$1", [
                hidden.id,
              ]),
            )
          ).length,
          1,
        );
        await assert.rejects(
          as("owner2", () =>
            query(
              "insert into business_locations(business_id,name,address,postal_code,city) values($1,'Juks','Gate 1','3015','Drammen')",
              [business.id],
            ),
          ),
          /row-level security/,
        );
        assert.equal(
          (
            await as("owner2", () =>
              query(
                "update business_locations set name='Juks' where id=$1 returning id",
                [branch.id],
              ),
            )
          ).length,
          0,
        );
        assert.equal(
          (
            await as("owner2", () =>
              query("delete from business_locations where id=$1 returning id", [
                branch.id,
              ]),
            )
          ).length,
          0,
        );
        await assert.rejects(
          as("owner", () =>
            query("update business_locations set business_id=$1 where id=$2", [
              business2.id,
              branch.id,
            ]),
          ),
          /row-level security/,
        );
        await as("owner", () =>
          query(
            "update business_locations set name='Nytt navn',lat=null,lng=null where id=$1",
            [branch.id],
          ),
        );
        assert.equal(
          (
            await query("select name from business_locations where id=$1", [
              branch.id,
            ])
          )[0].name,
          "Nytt navn",
        );
        await as("admin", () =>
          query("update businesses set status='suspended' where id=$1", [
            business.id,
          ]),
        );
        assert.equal(
          (
            await as(
              null,
              () => query("select * from business_locations"),
              "anon",
            )
          ).length,
          0,
        );
        assert.equal(
          (await as("admin", () => query("select * from business_locations")))
            .length,
          2,
        );
        await as("admin", () =>
          query("update businesses set status='approved' where id=$1", [
            business.id,
          ]),
        );
        for (const [field, value] of [
          ["postal_code", "12"],
          ["name", "   "],
          ["city", ""],
        ]) {
          await assert.rejects(
            as("owner", () =>
              query(`update business_locations set ${field}=$1 where id=$2`, [
                value,
                branch.id,
              ]),
            ),
            /check constraint/,
          );
        }
        for (const coords of [
          [91, 10],
          [60, 181],
          [60, null],
          [null, 10],
        ]) {
          await assert.rejects(
            as("owner", () =>
              query("update business_locations set lat=$1,lng=$2 where id=$3", [
                ...coords,
                branch.id,
              ]),
            ),
            /check constraint/,
          );
        }
        await as("admin", () =>
          query(
            "update business_locations set name='Adminrettelse' where id=$1",
            [hidden.id],
          ),
        );
        const original = (
          await query("select address from businesses where id=$1", [
            business.id,
          ])
        )[0].address;
        await as("owner", () =>
          query("delete from business_locations where id=$1", [branch.id]),
        );
        assert.equal(
          (
            await query("select address from businesses where id=$1", [
              business.id,
            ])
          )[0].address,
          original,
        );
        assert.ok(
          (
            await query(
              "select id from audit_log where table_name='business_locations' and row_id=$1",
              [branch.id],
            )
          ).length >= 3,
        );
        await as("owner2", () =>
          query("delete from business_locations where id=$1", [hidden.id]),
        );
        await as("admin", () =>
          query("update businesses set status='approved' where id=$1", [
            business2.id,
          ]),
        );
      },
    );
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

    await t.test(
      "anmeldelser krever innlogging, starter på fem stjerner og skjuler identitet",
      async () => {
        await assert.rejects(
          as(
            null,
            () => query("select submit_business_review($1)", [business.id]),
            "anon",
          ),
          /permission denied/,
        );
        await as("other", () =>
          query(
            "select submit_business_review($1, 5, 'Anonym erfaring', true)",
            [business.id],
          ),
        );
        const publicRows = await as(
          null,
          () => query("select * from list_business_reviews($1)", [business.id]),
          "anon",
        );
        const anonymous = publicRows.find(
          (r) => r.comment === "Anonym erfaring",
        );
        assert.equal(anonymous.author_name, null);
        assert.equal(anonymous.rating, 5);
        assert.equal("user_id" in anonymous, false);
        assert.equal(anonymous.is_own, false);
        assert.equal(
          (
            await as("owner", () =>
              query("select * from public_profiles where id=$1", [ids.other]),
            )
          ).length,
          0,
        );
        for (const who of ["other", "owner", "admin"])
          await assert.rejects(
            as(who, () => query("select * from reviews")),
            /permission denied/,
          );
        await as("user", () =>
          query("select submit_business_review($1)", [business.id]),
        );
        const named = (
          await as("user", () =>
            query("select * from list_business_reviews($1)", [business.id]),
          )
        ).find((r) => r.is_own);
        assert.equal(named.rating, 5);
        assert.equal(named.author_name, "user");
        await assert.rejects(
          as("user", () =>
            query("select submit_business_review($1, 0)", [business.id]),
          ),
          /stjerner/,
        );
        await assert.rejects(
          as("user", () =>
            query("select submit_business_review($1, 5, $2)", [
              business.id,
              "a".repeat(1001),
            ]),
          ),
          /1000/,
        );
        await assert.rejects(
          as("other", () => query("select * from list_business_reviews()")),
          /tilgang/,
        );
      },
    );
    await t.test("bare admin kan lese og endre ordlisten", async () => {
      assert.equal(
        (await as("user", () => query("select * from review_blocked_terms")))
          .length,
        0,
      );
      await assert.rejects(
        as("user", () =>
          query("insert into review_blocked_terms(term) values ('filtertest')"),
        ),
        /row-level security/,
      );
      await assert.rejects(
        as(null, () => query("select * from review_blocked_terms"), "anon"),
        /permission denied/,
      );
      await as("admin", () =>
        query(
          "insert into review_blocked_terms(term) values ('filtertest'), ('test uttrykk')",
        ),
      );
      assert.equal(
        (
          await as("owner", () =>
            query("delete from review_blocked_terms returning term"),
          )
        ).length,
        0,
      );
      assert.equal(
        (
          await as("user", () =>
            query(
              "update review_blocked_terms set is_active=false returning term",
            ),
          )
        ).length,
        0,
      );
      assert.ok(
        (await as("admin", () => query("select * from review_blocked_terms")))
          .length > 2,
      );
    });
    await t.test(
      "ordfilter blokkerer nye anmeldelser og redigering, med normalisering",
      async () => {
        for (const text of [
          "FILTERTEST!",
          "Hei, test---uttrykk!",
          "filter\u200btest",
          "ｆｉｌｔｅｒｔｅｓｔ",
          "NIGGER",
        ]) {
          await assert.rejects(
            as("user", () =>
              query("select submit_business_review($1, 5, $2, true)", [
                business.id,
                text,
              ]),
            ),
            /ikke er tillatt/,
          );
        }
        await assert.rejects(
          as("owner2", () =>
            query("select submit_business_review($1, 5, 'filtertest')", [
              business.id,
            ]),
          ),
          /ikke er tillatt/,
        );
        assert.equal(
          (
            await query(
              "select count(*)::int n from reviews where user_id=$1",
              [ids.owner2],
            )
          )[0].n,
          0,
        );
        const own = (
          await as("other", () =>
            query("select * from list_business_reviews($1)", [business.id]),
          )
        ).find((r) => r.is_own);
        await assert.rejects(
          as("other", () =>
            query("select submit_business_review($1, 1, 'filtertest')", [
              business.id,
            ]),
          ),
          /ikke er tillatt/,
        );
        assert.equal(
          (await query("select comment from reviews where id=$1", [own.id]))[0]
            .comment,
          "Anonym erfaring",
        );
        // Hele ord: vanlig omtale og ord som bare inneholder et oppført ord bevares.
        await as("user", () =>
          query(
            "select submit_business_review($1, 2, 'Dårlig service. filtertesten var treg. Vi er et homofilt par.')",
            [business.id],
          ),
        );
        await as("user", () =>
          query("select submit_business_review($1, 5, '')", [business.id]),
        );
      },
    );
    await t.test(
      "bedriftssvar og direkte databaseskriving følger samme filter",
      async () => {
        const r = (
          await query(
            "select id from reviews where user_id=$1 and business_id=$2",
            [ids.other, business.id],
          )
        )[0];
        await assert.rejects(
          as("owner", () =>
            query("select reply_to_review($1, 'filtertest')", [r.id]),
          ),
          /ikke er tillatt/,
        );
        await assert.rejects(
          query("update reviews set comment='filtertest' where id=$1", [r.id]),
          /ikke er tillatt/,
        );
        await assert.rejects(
          query("update reviews set business_reply='filtertest' where id=$1", [
            r.id,
          ]),
          /ikke er tillatt/,
        );
        assert.equal(
          (
            await query("select business_reply from reviews where id=$1", [
              r.id,
            ])
          )[0].business_reply,
          null,
        );
        await as("admin", () =>
          query(
            "update review_blocked_terms set is_active=false where term='filtertest'",
          ),
        );
        await as("owner", () =>
          query("select reply_to_review($1, 'filtertest')", [r.id]),
        );
        // Et nytt ord blokkerer ikke moderering av uendret eldre innhold.
        await as("admin", () =>
          query(
            "update review_blocked_terms set is_active=true where term='filtertest'",
          ),
        );
        await query("update reviews set status='published' where id=$1", [
          r.id,
        ]);
        await as("owner", () =>
          query("select reply_to_review($1, 'Takk')", [r.id]),
        );
        await as("admin", () =>
          query(
            "delete from review_blocked_terms where term in ('filtertest', 'test uttrykk')",
          ),
        );
      },
    );
    await t.test(
      "bedriften svarer, rå sletting nektes og administrator kan moderere",
      async () => {
        const r = (
          await as("other", () =>
            query("select * from list_business_reviews($1)", [business.id]),
          )
        ).find((r) => r.is_own);
        await assert.rejects(
          as("other", () =>
            query("select reply_to_review($1, 'Brukersvar')", [r.id]),
          ),
          /tilgang/,
        );
        await assert.rejects(
          as("owner2", () =>
            query("select reply_to_review($1, 'Feil bedrift')", [r.id]),
          ),
          /tilgang/,
        );
        await as("owner", () =>
          query("select reply_to_review($1, 'Takk for besøket')", [r.id]),
        );
        await as("other", () =>
          query("select submit_business_review($1, 4, 'Oppdatert', true)", [
            business.id,
          ]),
        );
        const own = (
          await as("other", () =>
            query("select * from list_business_reviews($1)", [business.id]),
          )
        ).find((x) => x.is_own);
        assert.equal(own.business_reply, "Takk for besøket");
        await assert.rejects(
          as("other", () =>
            query("delete from profiles where id=$1", [ids.other]),
          ),
          /permission denied/,
        );
        for (const who of ["other", "owner", "owner2"]) {
          await assert.rejects(
            as(who, () => query("delete from reviews where id=$1", [r.id])),
            /permission denied/,
          );
          if (who !== "other")
            await assert.rejects(
              as(who, () => query("select delete_business_review($1)", [r.id])),
              /egne anmeldelser/,
            );
        }
        await as("admin", () =>
          query("select delete_business_review($1)", [r.id]),
        );
        assert.equal(
          (
            await as(
              null,
              () =>
                query("select * from list_business_reviews($1)", [business.id]),
              "anon",
            )
          ).some((x) => x.id === r.id),
          false,
        );
      },
    );
    await t.test(
      "gavebeskrivelse og egen kode lagres mens QR fortsatt er unik og engangs",
      async () => {
        for (const kind of ["freebie", "other"]) {
          await assert.rejects(
            as("owner", () =>
              query(
                "insert into deals(business_id,title,discount_type) values($1,'Mangler forklaring',$2)",
                [business.id, kind],
              ),
            ),
            /Beskriv hva/,
          );
        }
        const gift = (
          await as("owner", () =>
            query(
              "insert into deals(business_id,title,discount_type,discount_details,promo_code,status,max_redemptions) values($1,'Lunsjgave','freebie',' Gratis mineralvann ved kjøp av lunsj ',' LUNSJVENN ','active',2) returning *",
              [business.id],
            ),
          )
        )[0];
        assert.equal(
          gift.discount_details,
          "Gratis mineralvann ved kjøp av lunsj",
        );
        assert.equal(gift.promo_code, "LUNSJVENN");
        await assert.rejects(
          as("owner", () =>
            query("update deals set discount_details=' ' where id=$1", [
              gift.id,
            ]),
          ),
          /Beskriv hva/,
        );
        await assert.rejects(
          as("owner", () =>
            query("update deals set promo_code=$1 where id=$2", [
              "a".repeat(65),
              gift.id,
            ]),
          ),
          /check constraint/,
        );
        await assert.rejects(
          as("owner", () =>
            query("update deals set promo_code=$1 where id=$2", [
              "CODE\nCODE",
              gift.id,
            ]),
          ),
          /check constraint/,
        );
        const first = (
          await as("user", () =>
            query("select * from claim_deal($1)", [gift.id]),
          )
        )[0];
        assert.equal(first.display_code, "LUNSJVENN");
        assert.notEqual(first.token, first.display_code);
        await as("owner", () =>
          query("update deals set promo_code='NYKODE' where id=$1", [gift.id]),
        );
        const again = (
          await as("user", () =>
            query("select * from claim_deal($1)", [gift.id]),
          )
        )[0];
        assert.equal(again.display_code, "LUNSJVENN");
        assert.equal(again.token, first.token);
        const second = (
          await as("other", () =>
            query("select * from claim_deal($1)", [gift.id]),
          )
        )[0];
        assert.equal(second.display_code, "NYKODE");
        assert.notEqual(second.token, first.token);
        await assert.rejects(
          as("owner", () => query("select * from redeem_deal('NYKODE')")),
          /Ugyldig kode/,
        );
        await as("owner", () =>
          query("select * from redeem_deal($1)", [first.token]),
        );
        await assert.rejects(
          as("owner", () =>
            query("select * from redeem_deal($1)", [first.token]),
          ),
          /allerede brukt/,
        );
        await assert.rejects(
          as("user", () => query("select * from claim_deal($1)", [gift.id])),
          /allerede brukt/,
        );
        await as("owner", () =>
          query("select * from redeem_deal($1)", [second.token]),
        );
        const pair = (
          await as("owner", () =>
            query(
              "insert into deals(business_id,title,discount_type,discount_details,status) values($1,'To for én','other','To mineralvann for prisen av ett','active') returning *",
              [business.id],
            ),
          )
        )[0];
        const normal = (
          await as("user", () =>
            query("select * from claim_deal($1)", [pair.id]),
          )
        )[0];
        assert.equal(normal.display_code, null);
        assert.ok(normal.token);
      },
    );
    await t.test(
      "Min side redigerer bare egen profil og røper bare egne anmeldelser",
      async () => {
        await assert.rejects(
          as(
            null,
            () => query("select save_my_profile('Test','Oslo')"),
            "anon",
          ),
          /permission denied/,
        );
        const other = (
          await query("select display_name from profiles where id=$1", [
            ids.other,
          ])
        )[0].display_name;
        await as("user", () =>
          query("select save_my_profile('  Nytt navn  ', '  Drammen  ')"),
        );
        const profile = (
          await query(
            "select display_name,home_city,role from profiles where id=$1",
            [ids.user],
          )
        )[0];
        assert.equal(profile.display_name, "Nytt navn");
        assert.equal(profile.home_city, "Drammen");
        assert.equal(profile.role, "user");
        assert.equal(
          (
            await query("select display_name from profiles where id=$1", [
              ids.other,
            ])
          )[0].display_name,
          other,
        );
        await assert.rejects(
          as("user", () => query("select save_my_profile(' ','Oslo')")),
          /1 og 80/,
        );
        await assert.rejects(
          as("user", () =>
            query("select save_my_profile('Test',$1)", ["a".repeat(121)]),
          ),
          /120/,
        );
        await as("user", () =>
          query(
            "select submit_business_review($1, 4, 'Min egen anmeldelse',true)",
            [business.id],
          ),
        );
        await as("other", () =>
          query(
            "select submit_business_review($1, 3, 'En annen brukers anmeldelse',false)",
            [business.id],
          ),
        );
        const own = await as("user", () =>
          query("select * from list_my_reviews()"),
        );
        assert.ok(own.some((r) => r.comment === "Min egen anmeldelse"));
        assert.ok(
          own.every((r) => r.comment !== "En annen brukers anmeldelse"),
        );
        assert.ok(own.every((r) => r.is_own));
        assert.ok(own.every((r) => !("user_id" in r)));
        const r = own.find((r) => r.comment === "Min egen anmeldelse");
        assert.equal(r.author_name, null);
        await query("update reviews set status='hidden' where id=$1", [r.id]);
        await as("admin", () =>
          query("update businesses set status='suspended' where id=$1", [
            business.id,
          ]),
        );
        const hidden = (
          await as("user", () => query("select * from list_my_reviews()"))
        ).find((x) => x.id === r.id);
        assert.equal(hidden.status, "hidden");
        assert.equal(hidden.business_status, "suspended");
        await assert.rejects(
          as(null, () => query("select * from list_my_reviews()"), "anon"),
          /permission denied/,
        );
        await as("admin", () =>
          query("update businesses set status='approved' where id=$1", [
            business.id,
          ]),
        );
      },
    );
    await t.test(
      "forfatter sletter egen anmeldelse og bedriften sletter bare sitt svar",
      async () => {
        const rows = await query(
          "select id,user_id,comment,rating,is_anonymous,status from reviews where business_id=$1",
          [business.id],
        );
        const own = rows.find((r) => r.user_id === ids.user),
          other = rows.find((r) => r.user_id === ids.other);
        assert.ok(own);
        assert.ok(other);
        await as("owner", () =>
          query("select reply_to_review($1,'Svar som kan slettes')", [own.id]),
        );
        for (const who of ["user", "other", "owner2", "admin"])
          await assert.rejects(
            as(who, () => query("select delete_business_reply($1)", [own.id])),
            /egen bedrift/,
          );
        await assert.rejects(
          as(
            null,
            () => query("select delete_business_reply($1)", [own.id]),
            "anon",
          ),
          /permission denied/,
        );
        await as("owner", () =>
          query("select delete_business_reply($1)", [own.id]),
        );
        const after = (
          await query("select * from reviews where id=$1", [own.id])
        )[0];
        assert.equal(after.business_reply, null);
        assert.equal(after.replied_at, null);
        for (const field of ["comment", "rating", "is_anonymous", "status"])
          assert.equal(after[field], own[field]);
        for (const who of ["other", "owner", "owner2"])
          await assert.rejects(
            as(who, () => query("select delete_business_review($1)", [own.id])),
            /egne anmeldelser/,
          );
        await assert.rejects(
          as(
            null,
            () => query("select delete_business_review($1)", [own.id]),
            "anon",
          ),
          /permission denied/,
        );
        await as("owner", () =>
          query(
            "select reply_to_review($1,'Dette svaret følger anmeldelsen')",
            [own.id],
          ),
        );
        await as("user", () =>
          query("select delete_business_review($1)", [own.id]),
        );
        assert.equal(
          (await query("select * from reviews where id=$1", [own.id])).length,
          0,
        );
        assert.equal(
          (await query("select * from reviews where id=$1", [other.id])).length,
          1,
        );
        await as("admin", () =>
          query("select delete_business_review($1)", [other.id]),
        );
        assert.equal(
          (await query("select * from reviews where id=$1", [other.id])).length,
          0,
        );
      },
    );
    await t.test(
      "obligatorisk tre på rad oppgraderer eksisterende tilbud",
      async () => {
        const legacy = (
          await query(
            "insert into deals(business_id,title,discount_type,discount_value,status) values($1,'Eksisterende pris','percent',10,'active') returning id",
            [business.id],
          )
        )[0];
        const voucher = (
          await as("user", () =>
            query("select * from claim_deal($1)", [legacy.id]),
          )
        )[0];
        const oldRound = (
          await query(
            "insert into deal_game_sessions(user_id,deal_id,kind,state,expires_at) values($1,$2,'memory','{}',now()+interval '1 hour') returning id",
            [ids.other, legacy.id],
          )
        )[0];
        await db.exec(
          await readFile(
            "supabase/migrations/20261127000015_tic_tac_toe_required.sql",
            "utf8",
          ),
        );
        const converted = (
          await query(
            "select kind,state,revision from deal_game_sessions where id=$1",
            [oldRound.id],
          )
        )[0];
        assert.equal(converted.kind, "tic_tac_toe");
        assert.equal(converted.state.board.length, 9);
        assert.equal(converted.revision, 1);
        assert.equal(
          (
            await as("user", () =>
              query("select * from claim_deal($1)", [legacy.id]),
            )
          )[0].token,
          voucher.token,
        );
        assert.equal(
          (
            await query(
              "select count(*)::int n from deals where not requires_game",
            )
          )[0].n,
          0,
        );
        await assert.rejects(
          as("owner", () =>
            query("update deals set requires_game=false where business_id=$1", [
              business.id,
            ]),
          ),
          /deals_game_required/,
        );
      },
    );
    await t.test(
      "tre på rad krever lovlige trekk før QR og beholder samme runde",
      async () => {
        for (const kind of ["tic_tac_toe"]) {
          const d = (
            await as("owner", () =>
              query(
                "insert into deals(business_id,title,discount_type,discount_value,status) values($1,'Spillpris','percent',10,'active') returning id",
                [business.id],
              ),
            )
          )[0];
          const start = async (who) =>
            (
              await as(who, () =>
                query("select start_deal_game($1) data", [d.id]),
              )
            )[0].data;
          let g = await start("user");
          assert.equal(g.kind, "tic_tac_toe");
          assert.equal(g.id, (await start("user")).id);
          await assert.rejects(
            as("user", () => query("select * from claim_deal($1)", [d.id])),
            /Fullfør spillet/,
          );
          await assert.rejects(
            as("other", () => query("select play_deal_game($1,0,0)", [g.id])),
            /finnes ikke/,
          );
          await assert.rejects(
            as("user", () =>
              query(
                "update deal_game_sessions set completed_at=now() where id=$1",
                [g.id],
              ),
            ),
            /permission denied/,
          );
          await assert.rejects(
            as("user", () => query("select * from deal_game_sessions")),
            /permission denied/,
          );
          const step = async (action) => {
            g = (
              await as("user", () =>
                query("select play_deal_game($1,$2,$3) data", [
                  g.id,
                  g.revision,
                  action,
                ]),
              )
            )[0].data;
          };
          await assert.rejects(
            as("user", () => query("select play_deal_game($1,999,0)", [g.id])),
            /oppdatert/,
          );
          await assert.rejects(
            as("user", () =>
              query("select play_deal_game($1,$2,99)", [g.id, g.revision]),
            ),
            /Ugyldig/,
          );
          while (!g.completed) await step(g.state.board.indexOf(""));
          assert.equal(g.completed, true);
          assert.equal((await start("user")).completed, true);
          const r = (
            await as("user", () =>
              query("select * from claim_deal($1)", [d.id]),
            )
          )[0];
          assert.ok(r.token);
          assert.equal(
            (
              await as("user", () =>
                query("select * from claim_deal($1)", [d.id]),
              )
            )[0].token,
            r.token,
          );
          await as("owner", () => query("select redeem_deal($1)", [r.token]));
          await assert.rejects(
            as("user", () => query("select * from claim_deal($1)", [d.id])),
            /allerede brukt/,
          );
        }
      },
    );
    await t.test(
      "spillreservasjon respekterer kapasitet og utløp",
      async () => {
        const d = (
          await as("owner", () =>
            query(
              "insert into deals(business_id,title,discount_type,discount_value,status,requires_game,max_redemptions) values($1,'Siste plass','percent',10,'active',true,1) returning id",
              [business.id],
            ),
          )
        )[0];
        const g = (
          await as("user", () =>
            query("select start_deal_game($1) data", [d.id]),
          )
        )[0].data;
        await assert.rejects(
          as("other", () => query("select start_deal_game($1)", [d.id])),
          /utsolgt/,
        );
        await query(
          "update deal_game_sessions set expires_at=now()-interval '1 second' where id=$1",
          [g.id],
        );
        await assert.rejects(
          as("user", () => query("select play_deal_game($1,0,0)", [g.id])),
          /utløpt/,
        );
        const other = (
          await as("other", () =>
            query("select start_deal_game($1) data", [d.id]),
          )
        )[0].data;
        assert.ok(other.id);
        await assert.rejects(
          as(null, () => query("select start_deal_game($1)", [d.id]), "anon"),
          /permission denied/,
        );
      },
    );
    await t.test(
      "offentlig bedriftsdata røper ikke nummer, og nummerendring krever ny godkjenning",
      async () => {
        assert.equal(
          (
            await as(
              null,
              () =>
                query("select * from businesses where id=$1", [business.id]),
              "anon",
            )
          )[0].org_number,
          null,
        );
        await as("owner", () =>
          query("select save_business_org($1, '111111111')", [business.id]),
        );
        assert.equal(
          (
            await as("owner", () =>
              query("select status from businesses where id=$1", [business.id]),
            )
          )[0].status,
          "pending",
        );
        await as("admin", () =>
          query("update businesses set status='approved' where id=$1", [
            business.id,
          ]),
        );
      },
    );
  } finally {
    await db.close();
  }
});
