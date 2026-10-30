# DinVenn – Databasestruktur

Ferdig SQL for Supabase ligger i `schema.sql`. Her er oversikten.

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

## Typiske spørringer
- **Hjem-feed:** aktive deals + kommende events der bedriften er `approved`, sortert på `is_featured`, så `ends_at`/`starts_at`.
- **Kart:** businesses innenfor radius (PostGIS eller enkel bounding box på lat/lng).
- **Dashboard-statistikk:** antall visninger, favoritter og innløsninger per deal.
