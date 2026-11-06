# DinVenn – Tech-stack og plan

## Anbefaling (rask prototype, lite kode)

| Behov | Verktøy | Hvorfor |
|---|---|---|
| Design / prototype | **Figma** | Gratis for elever, lett å teste med brukere før man bygger |
| App (ungdom, iOS + Android) | **FlutterFlow** | Visuell bygger, ekte app, kan eksportere kode senere |
| Bedrifts-dashboard | **FlutterFlow (web-app)** | Samme prosjekt og database. Bedrifter bruker PC, så web passer best |
| Database + innlogging + bilder | **Supabase** (PostgreSQL) | Gratisnivå, innebygd auth, fillagring og sikkerhetsregler per rad |
| Kart | **Google Maps** (FlutterFlow-widget) | Innebygd støtte. Lagre lat/lng i databasen |
| QR-koder | FlutterFlow `QR code`-widget + skanner | Hver innløsning får et unikt engangs-token |
| Betaling (bedrifter) | **Stripe** (eller Vipps MobilePay) | Månedlig abonnement. Start med manuell faktura i prototypen |
| Push-varsler | Firebase Cloud Messaging | Innebygd i FlutterFlow |
| Prosjektstyring | Notion / Trello | Backlog og sprinter |

### Alternativer
- **Mest no-code:** Bubble (alt i ett, men dyrere og låst til plattformen, ikke ekte app).
- **Mest kode / fleksibelt:** React Native (Expo) + Supabase. Bra hvis dere har en utvikler i teamet.

### Én app eller to?
- **Ungdomsappen:** mobil (iOS/Android).
- **Bedriftsportalen:** nettside med egen innlogging (rolle = `business`).
- Begge snakker mot samme Supabase-database. Rolle avgjør hva man ser.

## Roller
- `user` – ungdom/student, gratis
- `business` – bedriftseier/ansatt, betaler abonnement
- `admin` – dere i ungdomsbedriften (godkjenner bedrifter, modererer)

## Veikart

**Fase 0 – Validering (uke 1–2)**
- Snakk med 10 ungdommer og 5 bedrifter. Hva vil de ha?
- Lag Figma-prototype av skjermene i `03-wireframes.html`.

**Fase 1 – MVP (uke 3–6)**
- Innlogging (bruker + bedrift)
- Bedriftsprofil + dashboard (opprett/rediger)
- Publiser vennepris og arrangement
- Hjem-feed, kategorier, bedriftsside
- Favoritter

**Fase 2 – Kart og innløsning (uke 7–9)**
- Kartvisning med nærhetssøk
- QR-innløsning og nedtelling
- Statistikk i dashboard

**Fase 3 – Lansering (uke 10–12)**
- Pilot med 5–10 lokale bedrifter
- Betaling/abonnement
- Push-varsler, App Store / Google Play

## Forretningsmodell (forslag til diskusjon)
- Brukere: gratis.
- Bedrifter: f.eks. 199 kr/mnd (Basis: profil + 2 aktive tilbud) og 399 kr/mnd (Pluss: ubegrenset + fremhevet plassering + statistikk).
- Gratis prøvemåned for pilotbedrifter.

## Viktig å tenke på
- **Personvern/GDPR:** brukere er 15+, så vær nøye med samtykke, minimal datainnsamling og posisjon kun når appen er i bruk.
- **Misbruk av rabatter:** engangs-QR, maks innløsninger per bruker, utløpstid.
- **Moderering:** admin godkjenner nye bedrifter før de vises.
- **Universell utforming:** god kontrast (pastell + mørk tekst), store trykkflater.

## Implementert pilot (november 2026)

Piloten bruker nå **Expo / React Native (SDK 58)** for iPhone/Android og **React / Vite** for bedriftsportalen, med TypeScript og delte Supabase-typer. FlutterFlow-anbefalingen over er historisk konseptmateriale. Test på mobil gjøres først med Expo Go; publisering i appbutikkene inngår ikke ennå.

Se [oppstartsguiden](../README.md). Appkode ligger i `apps/`, delte grensesnitt i `packages/core/`, og kjørbare databasemigrasjoner i `supabase/migrations/`.
