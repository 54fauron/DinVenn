// Kun lokal, eksplisitt demo. Service role brukes bare i dette Node-skriptet.
import { createClient } from "@supabase/supabase-js";
const url = process.env.SUPABASE_URL;
if (!url || !["localhost", "127.0.0.1"].includes(new URL(url).hostname))
  throw new Error("Demodata er bare tillatt mot lokal Supabase.");
if (
  !process.env.SUPABASE_SERVICE_ROLE_KEY ||
  !process.env.DEMO_PASSWORD ||
  process.env.DEMO_PASSWORD.length < 8
)
  throw new Error(
    "Sett lokal SUPABASE_SERVICE_ROLE_KEY og DEMO_PASSWORD (minst 8 tegn).",
  );
const db = createClient(url, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});
const check = (r) => {
  if (r.error) throw r.error;
  return r.data;
};
const existing = check(await db.auth.admin.listUsers({ perPage: 1000 })).users;
async function user(email, name) {
  const found = existing.find((u) => u.email === email);
  if (found) return found;
  return check(
    await db.auth.admin.createUser({
      email,
      password: process.env.DEMO_PASSWORD,
      email_confirm: true,
      user_metadata: { display_name: name },
    }),
  ).user;
}
const owner = await user("bedrift@dinvenn.example", "DEMO Bedrift");
const other = await user("annen@dinvenn.example", "DEMO Annen bedrift");
await user("bruker@dinvenn.example", "DEMO Bruker");
const admin = await user("admin@dinvenn.example", "DEMO Admin");
check(await db.from("profiles").update({ role: "admin" }).eq("id", admin.id));
for (const [id, name, slug] of [
  [owner.id, "DEMO Hjørnekafeen", "demo-hjornekafeen"],
  [other.id, "DEMO Lille butikken", "demo-lille-butikken"],
]) {
  const b = check(
    await db
      .from("businesses")
      .upsert(
        {
          owner_id: id,
          name,
          slug,
          city: "Kristiansand",
          address: "Demogata 1",
          description:
            "Dette er tydelig merkede eksempeldata, ikke en ekte bedrift.",
          status: "approved",
          category_id: 1,
        },
        { onConflict: "slug" },
      )
      .select()
      .single(),
  );
  const found = check(
    await db.from("deals").select("id").eq("business_id", b.id),
  );
  if (!found.length)
    check(
      await db.from("deals").insert({
        business_id: b.id,
        title: "DEMO – 20 % på kaffe",
        discount_type: "percent",
        discount_value: 20,
        status: "active",
        max_per_user: 1,
        max_redemptions: 100,
        starts_at: new Date().toISOString(),
        ends_at: new Date(Date.now() + 7 * 86400000).toISOString(),
        terms: "Kun eksempeldata. Kan ikke brukes hos en ekte bedrift.",
      }),
    );
}
console.log(
  "Lokale demokontoer klare: bruker, bedrift, annen og admin @dinvenn.example. Bruk DEMO_PASSWORD.",
);
