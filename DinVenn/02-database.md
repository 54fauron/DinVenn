# DinVenn – Databasestruktur

Ferdig SQL for Supabase ligger i `schema.sql` (kjernen) og fem utvidelsesfiler. Kjør dem i denne rekkefølgen:

| Fil | Innhold |
|---|---|
| `schema.sql` | Kjernen: profiler, bedrifter, tilbud, innløsning, arrangementer, nyheter, favoritter, abonnement |
| `schema-v2-01-hardening.sql` | Sikkerhetsfikser av kjernen (se under), hjelpefunksjoner, `friend_code`, uclaimede bedrifter |
| `schema-v2-02-analytics-deals.sql` | Analytics, statistikkfunksjoner, ukeplan/maler/lynsalg/gruppe/student på tilbud, studentverifisering |
| `schema-v2-03-notifications-loyalty.sql` | Varsler, push-tokens, poeng, merker, stempelkort |
| `schema-v2-04-social-redeem.sql` | Venner, deling, referrals, anmeldelser, følging, `claim_deal`, `redeem_deal`, kundestatistikk |
| `schema-v2-05-business-ops.sql` | Tags, nabolag, org.nr, overta profil, rapportering, endringslogg, vedlikehold, låsing av funksjoner |

Alt er testet mot Postgres (PGlite) med en mock av Supabase-roller og `auth.uid()`.

## Relasjoner (forenklet)

```
auth.users 1─1 profiles
profiles   1─N business_members N─1 businesses
businesses 1─N business_images
businesses 1─N opening_hours
businesses 1─N deals ─── 1─N deal_redemptions N─1 profiles
businesses 1─N events
businesses 1─N news_posts
categories 1─N businesses
profiles   N─N deals / events / businesses  (via favorites)
businesses 1─1 subscriptions
```

## Tabeller

### profiles (brukere)
| Felt | Type | Merknad |
|---|---|---|
| id | uuid (PK) | = auth.users.id |
| role | enum | `user`, `business`, `admin` |
| display_name | text | |
| avatar_url | text | |
| birth_year | int | Aldersgruppe, ikke full fødselsdato |
| home_city | text | |
| interests | text[] | Brukes til personlig feed |
| created_at | timestamptz | |

### businesses
| Felt | Type | Merknad |
|---|---|---|
| id | uuid (PK) | |
| owner_id | uuid (FK profiles) | |
| name | text | |
| slug | text | Unik, for delbare lenker |
| description | text | |
| category_id | FK categories | |
| logo_url, cover_url | text | |
| address, city, postal_code | text | |
| lat, lng | double | For kart |
| phone, email, website, instagram | text | |
| status | enum | `pending`, `approved`, `suspended` |
| is_featured | bool | Fremhevet (Pluss-abonnement) |
| created_at | timestamptz | |

### business_members
Gjør at flere ansatte kan administrere samme bedrift.
| business_id, user_id | FK | |
| member_role | enum | `owner`, `editor` |

### business_images
id, business_id, image_url, sort_order

### opening_hours
id, business_id, weekday (0–6), opens_at, closes_at, is_closed

### categories
id, name, slug, icon, color
Startverdier: Mat & Drikke, Shopping, Aktiviteter, Kultur, Skjønnhet, Trening.

### deals (vennepriser)
| Felt | Type | Merknad |
|---|---|---|
| id | uuid (PK) | |
| business_id | FK | |
| title | text | "20 % på alle lattes" |
| description | text | |
| image_url | text | |
| discount_type | enum | `percent`, `amount`, `freebie`, `other` |
| discount_value | numeric | |
| redeem_method | enum | `show_screen`, `code`, `qr` |
| promo_code | text | Hvis eksklusiv kode |
| starts_at, ends_at | timestamptz | Nedtelling bruker `ends_at` |
| max_redemptions | int | Total grense (valgfri) |
| max_per_user | int | Standard 1 |
| terms | text | Vilkår |
| status | enum | `draft`, `active`, `expired`, `paused` |
| created_at | timestamptz | |

### deal_redemptions (innløsninger)
| Felt | Type | Merknad |
|---|---|---|
| id | uuid (PK) | |
| deal_id | FK | |
| user_id | FK | |
| token | text (unik) | Det QR-koden inneholder |
| status | enum | `issued`, `redeemed`, `expired` |
| issued_at, redeemed_at | timestamptz | |

### events (arrangementer / "Hva skjer")
id, business_id, title, description, image_url, starts_at, ends_at, location_text (standard = bedriftens adresse), lat, lng, price_text ("Gratis"), ticket_url, status, created_at

### news_posts
id, business_id, title, body, image_url, published_at, status

### favorites
| user_id | FK | |
| target_type | enum | `deal`, `event`, `business` |
| target_id | uuid | |
| created_at | timestamptz | |
Unik på (user_id, target_type, target_id).

### subscriptions
id, business_id, plan (`basic`/`plus`), status, stripe_customer_id, stripe_subscription_id, current_period_end

## Sikkerhetsregler (Row Level Security)
- Alle kan **lese** godkjente bedrifter og aktive tilbud/arrangementer.
- Bedrift kan bare **endre** egne rader (via `business_members`).
- Bruker kan bare lese/endre egne `favorites` og `deal_redemptions`.
- Kun admin kan sette `businesses.status = approved`.
- Innløsning bekreftes av bedrift ved å skanne QR (funksjon `redeem_deal(token)`).
- Brukere kan **ikke** sette inn i `deal_redemptions` selv. De bruker `claim_deal(deal_id)`, som sjekker alle regler.

## Typiske spørringer
- **Hjem-feed:** aktive deals + kommende events der bedriften er `approved`, sortert på `is_featured`, så `ends_at`/`starts_at`.
- **Kart:** businesses innenfor radius (PostGIS eller enkel bounding box på lat/lng).
- **Dashboard-statistikk:** antall visninger, favoritter og innløsninger per deal.


---

# Utvidelse (schema v2)

## Rettet i det opprinnelige skjemaet (fil 01)
| Problem | Løsning |
|---|---|
| Bruker kunne sette `role = 'admin'` på seg selv | Trigger `guard_profile_role` |
| Bedrift kunne sette `status = 'approved'` / `is_featured` selv | Trigger `guard_business_columns` (kun admin og service_role) |
| `business_members`, `business_images`, `opening_hours`, `categories`, `subscriptions` hadde ikke RLS (Stripe-IDer lå åpent) | RLS og policyer |
| Bruker kunne opprette innløsning som allerede var `redeemed`, uten å respektere grenser | Insert-policy fjernet, `claim_deal()` brukes |
| Eier ble ikke lagt til i `business_members` | Trigger `on_business_created` (legger også til abonnement i prøveperiode) |
| Tilbud/arrangement fra ikke-godkjente bedrifter var synlige | Lesepolicyer sjekker at bedriften er synlig |
| Ingen profil ble opprettet ved registrering | Trigger `handle_new_user` |

Vaktene bruker `is_client_write()`: de gjelder kun skriving direkte fra appen (rolle `authenticated`). Databasefunksjoner og `service_role` (Stripe-webhook, Edge Functions) går utenom.

## Relasjoner (nye)
```
businesses 1─N analytics_events
deals      1─N deal_schedules            (tom = gjelder alltid)
deals      N─1 deal_templates
profiles   1─1 student_verifications N─1 institutions
businesses 1─N loyalty_programs 1─N loyalty_cards 1─N loyalty_stamps
profiles   1─N point_ledger, user_badges N─1 badges
profiles   N─N profiles (friendships) ── shared_deals (deal + fra + til)
profiles   1─N referrals (bruker eller bedrift som invitert)
businesses 1─N reviews N─1 profiles
profiles   N─N businesses (follows)
profiles   1─N notifications, push_tokens;  1─1 notification_preferences
businesses N─N tags (business_tags);  businesses N─1 neighborhoods
businesses 1─N business_claims, audit_log;  reports (alle typer)
```

## 1. Måling (hjelper bedriften se at appen virker)
- **`analytics_events`**: `business_id, target_type, target_id, event_type (view/click/share/directions/call/website), user_id, created_at`. Appen logger, bedriften leser. Slettes etter 13 måneder.
- **`deal_redemptions.is_first_time`**: settes av `redeem_deal`. Sann når brukeren aldri har løst inn noe hos denne bedriften før, altså en **ny kunde**.
- **Funksjoner for dashboardet** (kun for medlemmer av bedriften og admin):
  - `business_deal_stats(business_id, fra, til)`: visninger, klikk, favoritter, hentet, innløst og konvertering per tilbud.
  - `business_daily_stats(business_id, dager)`: visninger og innløsninger per dag (norsk tid), til graf.
  - `business_customer_stats(business_id, fra, til)`: innløsninger, unike kunder, **nye kunder**, følgere, anmeldelser og snitt, stempler, fullførte kort og profilvisninger.
    - `new_customers` er brukere hvis første innløsning hos bedriften skjedde i perioden. `returning_customers` er brukere som også hadde innløst før perioden.

## 2. Smartere tilbud
Nye felt på `deals`: `is_flash`, `flash_radius_m`, `min_group_size`, `student_only`, `template_id`.
- **Ukeplan** (`deal_schedules`): tilbud som bare gjelder bestemte ukedager og tider, f.eks. tirsdag 13-17 for å fylle stille timer. `deal_is_valid_now(deal_id)` sjekker, og `redeem_deal` håndhever det.
- **Maler** (`deal_templates`): seks ferdige maler (Rolig tirsdag, Ta med en venn, Studentpris ...), styrt av admin.
- **Lynsalg**: krever `ends_at`. Ved publisering varsles følgere og brukere i nærheten som vil ha lynsalg (`nearby_flash_audience`).
- **Gruppetilbud**: `min_group_size`. Bedriften oppgir antall personer ved skanning: `redeem_deal(token, party_size)`.
- **`active_deals`** (view): feed-spørringen. Aktive tilbud fra godkjente bedrifter, med `valid_now`.

### Livssyklus for en vennepris
```
claim_deal(deal_id)        bruker henter -> QR-token (sjekker status, tid, student, grenser)
redeem_deal(token, antall) bedrift skanner -> sjekker ukeplan og gruppe, setter is_first_time, gir poeng
run_maintenance()          (cron) markerer utløpte koder, tilbud og arrangementer
```

## 3. Lojalitet
- **`loyalty_programs`**: "Kjøp 6, få den 7. gratis". `stamps_required`, `reward_text`, `stamp_cooldown_minutes` (hindrer juksing med skjermbilde).
- **`loyalty_cards`**: ett åpent kort per bruker og program. QR-koden er `token`.
- **`loyalty_stamps`**: logg over stempler.
- Funksjoner: `join_loyalty_program`, `add_stamp(card_token)`, `claim_loyalty_reward(card_token)`.
- **Poeng** (`point_ledger`, view `my_points`): 10 per innløsning, +20 første besøk hos et sted, 5 per stempel, +25 for fullt kort, 15 til begge ved delt tilbud, 50/25 ved vellykket invitasjon, 100 for bedrift som blir med.
- **Merker** (`badges`, `user_badges`): Første vennepris, Utforsker (5 steder), Stamgjest, Vennebud. Deles ut av `award_badges` og gir varsel.

## 4. Venner og sosialt
- **`friendships`**: man legger til venner med `profiles.friend_code`, ikke via søk. `send_friend_request(code)` og `respond_friend_request(id, godta)`.
- **`public_profiles`** (view): navn og bilde for deg selv, venner og de som har skrevet anmeldelse. Resten av profilen er privat.
- **`shared_deals`**: `share_deal(deal_id, venn_id, melding)`. Når vennen løser inn, får begge bonuspoeng.
- **`referrals`**: `apply_referral(kode)` for brukere (første 7 dager), `apply_business_referral(business_id, kode)` for bedrifter.
- **`reviews`**: kun for de som har løst inn et tilbud eller fått stempel hos bedriften. En per bruker og bedrift. Bedriften svarer med `reply_to_review`. Snitt i view `business_ratings`.

## 5. Kommunikasjon
- **`follows`**: følg en bedrift for å få varsler. `favorites` er bare bokmerke.
- **`notifications`**: lages av databasen (nytt tilbud, arrangement, nyhet, lynsalg, venneforespørsel, merke, svar på anmeldelse ...). Appen kan bare sette `read_at`.
- **`notification_preferences`**: av/på per type, kategorier, og et område (`notify_lat/lng` + radius) brukeren velger selv. Brukes til lynsalg, og ingen posisjon spores.
- **`push_tokens`**: én rad per enhet. En Edge Function (service_role) sender push via Firebase når en rad kommer i `notifications`, og respekterer `push_enabled` og stille timer.

## 6. Bedriftsside og drift
- **`tags` / `business_tags`**: vegansk, hundevennlig, studentvennlig, gratis wifi ...
- **`neighborhoods`** og `businesses.neighborhood_id`. Må fylles med nabolag per by.
- **`businesses.org_number`** og `org_verified_at`. Verifiseringen settes av en Edge Function mot Brønnøysund, ikke fra appen.
- **Overta profil**: admin oppretter bedrift med `is_claimed = false` og uten eier. Eieren sender `business_claims`, og admin kjører `approve_business_claim(id)`.
- **`reports`**: brukere melder inn bedrifter, tilbud, anmeldelser og andre brukere. Admin behandler.
- **`audit_log`**: trigger på bedrift, medlemmer, tilbud, arrangementer, nyheter, åpningstider og lojalitetsprogram. Eier og admin kan lese.

## 7. Studentspesifikt
- **`institutions`**: skoler med e-postdomener. **Kontroller domenene før lansering.**
- **`student_verifications`**: `request_student_verification(skole-epost)` lager en token som en Edge Function sender på e-post (via database-webhook). `verify_student(token)` bekrefter, gyldig i ett år. Brukeren kan aldri lese token selv.
- `deals.student_only = true` krever verifisert student i `claim_deal`.

## Oppsett som ikke ligger i SQL
1. Aktiver **pg_cron** og kjør: `select cron.schedule('dinvenn-vedlikehold', '*/15 * * * *', 'select run_maintenance()');`
2. **Edge Function** for push: lytt på insert i `notifications`, slå opp `push_tokens` og `notification_preferences`, send via FCM.
3. **Edge Function** for studentverifisering: lytt på `student_verifications`, send e-post med token.
4. **Edge Function** for Brønnøysund-oppslag (org.nr) som setter `org_verified_at`.
5. **Stripe-webhook** (service_role) oppdaterer `subscriptions` og `businesses.is_featured`.
6. Rate limiting på vennekoder (8 tegn) og `claim_deal` bør legges i API-gatewayen eller en Edge Function.

## Valg du bør ta stilling til
- **Betalte funksjoner:** Skal lynsalg og lojalitetsprogram kun være i `plus`-abonnementet? Det er enkelt å håndheve i en trigger, men ikke gjort ennå.
- **Navn på anmeldelser:** I dag vises `display_name`. For ungdom kan det være bedre å vise bare fornavn eller initialer.
- **Aldersgrense:** `birth_year` finnes, men ingenting begrenser funksjoner for under 18 år. Det bør vurderes juridisk (GDPR/samtykke).

## Pilotintegrasjon (november 2026)

Kjørbare, versjonerte kopier av SQL-filene over ligger nå i `supabase/migrations/`. Den sjuende migrasjonen legger til bilde-bucket med medlemsbaserte skriverettigheter, validering av rabatter/datoer/grenser og eksplisitte RPC-rettigheter. `redeem_deal` låser tilbudet før innløsningen, kontrollerer godkjent bedrift og sjekker gjeldende grenser på nytt.

For en tom database kan hele `supabase/setup.sql` kjøres én gang. Se [README](../README.md) for oppsett, adminrolle, migrasjonshistorikk og testbegrensninger. De eldre SQL-filene i denne mappen bevares som referanse; videre endringer skal skje som nye migrasjoner.
