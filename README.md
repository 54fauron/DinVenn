# DinVenn

En pilot for lokale vennepriser: Expo-app for ungdom, React/Vite-portal for bedrifter og Supabase for innlogging, database og bilder. Originalskissene og konseptdokumentene ligger fortsatt i `DinVenn/`.

## Start appene

Bruk Node 22.13+ (testet med Node 26), npm og Expo Go som støtter Expo SDK 58.

```sh
npm ci
cp apps/portal/.env.example apps/portal/.env
cp apps/mobile/.env.example apps/mobile/.env
```

Fyll inn Supabase URL og **publishable key** (eventuelt eldre anon key) i begge `.env`-filene. Default publishable key i Supabase → Settings → API Keys er riktig. Miljøfilene ignoreres av Git. Bruk aldri service-role/secret key i klientappene.

```sh
npm run portal
```

Åpne http://localhost:5173. I en annen terminal:

```sh
npm run mobile
```

Skann Expo-koden med Expo Go på Android eller Kamera/Expo Go på iPhone. Telefon og utviklermaskin må kunne nå hverandre på nettverket. Portalen kan åpnes på telefon via Vite-serverens Network-adresse. Sett `EXPO_PUBLIC_PORTAL_URL` til denne adressen for å åpne bekreftelses- og passordlenker på telefonen. Start Expo på nytt etter miljøendringer.

## Database i Supabase-prosjektet ditt

For et **nytt, tomt prosjekt**:

1. Åpne prosjektets **SQL Editor**.
2. Kjør hele [supabase/setup.sql](supabase/setup.sql). Filen er generert fra sju versjonerte migrasjoner og kjører i én transaksjon. Den skal bare kjøres én gang på en tom database.
3. Kontroller at `categories`, `businesses`, `deals` og bucket `business-images` finnes.
4. Under **Authentication → URL Configuration**: sett Site URL til portaladressen. Legg til portalens URL og samme URL med `/?recovery=1` som Redirect URLs. For lokal bruk inkluder `http://localhost:5173`, `http://localhost:5173/?recovery=1`, og telefonens bruk av maskinens LAN-adresse tilsvarende.
5. Behold e-postbekreftelse på. Sett minimum passordlengde til 8. Bruk Supabase sine standard e-postmaler som følger redirect-adressen. Konfigurer SMTP for e-post til pilotbrukerne hvis prosjektets standard e-posttjeneste begrenser mottakere eller sendinger.

Registrer din egen konto og bekreft e-posten. Gjør deretter akkurat den kontoen til administrator gjennom SQL Editor (erstatt e-postadressen):

```sql
update public.profiles
set role = 'admin'
where id = (select id from auth.users where email = 'din-epost@example.no');
```

Logg inn eller oppdater portalen. Under **Godkjenning** kan du godkjenne og suspendere bedrifter. Kontoer trenger ikke `business`-rolle for å registrere bedrift; `business_members` styrer tilgangen.

Alternativt kan du bruke Supabase CLI (`npx supabase login`, `npx supabase link --project-ref DIN_PROSJEKTREF`, `npx supabase db push --remote`) med egen administratortilgang. **Ikke kjør db push etter manuell setup.sql uten å registrere migrasjonene som allerede brukt** med `npx supabase migration repair --remote --status applied` for versjonene `20261106000001` til `20261106000007`. CLI skal ikke forsøke å opprette tabellene igjen.

### Lokal Supabase (valgfritt)

Supabase CLI 3 er installert som prosjektavhengighet. På Apple silicon/macOS 14+ eller støttet Linux kan native runtime brukes uten Docker. På andre plattformer brukes en Docker-kompatibel runtime og `--runtime docker`. Prosjektet har allerede `supabase/config.toml`; ikke kjør init over den.

```sh
npx supabase start --runtime native
npx supabase db reset
npx supabase status
```

`db reset` sletter **lokal** database og kjører migrasjonene på nytt. Kopier lokal API URL og anon key fra `npx supabase status` til miljøfilene. På fysisk telefon må mobilens Supabase URL bruke utviklermaskinens LAN-IP i stedet for `127.0.0.1`. Lokale bekreftelsesmailer kan leses i Mailpit på http://localhost:54324. Tilpass lokal auth-allowlist i `config.toml` for LAN-adressen.

Tydelig merkede eksempelbedrifter og kontoer kan opprettes **kun lokalt**. Sett `SUPABASE_URL`, lokal `SUPABASE_SERVICE_ROLE_KEY` og et eget `DEMO_PASSWORD` i terminalens miljø og kjør:

```sh
npm run seed:demo
```

Kontoene er `bruker@dinvenn.example`, `bedrift@dinvenn.example`, `annen@dinvenn.example` og `admin@dinvenn.example`. Alle bruker passordet du valgte. Ikke bruk dem i offentlig pilot.

## Dette er implementert

- Mobil: wireframe-inspirert forside med horisontale vennepriskort og nedtelling, arrangementer, nyheter, tekst/by/kategorifilter, egne detaljsider og en kartfane. Bedriftsprofiler viser tilbud, arrangementer, nyheter og praktisk informasjon. Favoritter støtter også arrangementer. Konto, QR-innløsning og egne koder er beholdt.
- Portal: registrering, innlogging, passordtilbakestilling, bedriftsprofil og bilder, tilbudsredigering med datoer/vilkår/grenser, publisering/pause, QR-kamera eller manuell kode, innløsningsoversikt og admin-godkjenning. Wireframe-inspirert oversikt med nøkkeltall, tilbudstabell, sjudagersgraf og kommende arrangementer. Egne sider for oppretting/redigering/publisering/pause av arrangementer og nyheter, med bilde og forhåndsvisning. Abonnementsside med registrert status og prisforslag (199/399 kr), uten betaling.
- E-postbekreftelse og passordtilbakestilling åpnes i portalen; etterpå kan samme konto/passord brukes i mobilappen. Dette fungerer uten en egen mobil-deeplink i Expo Go.
- Native økter lagres i Expo SecureStore med små segmenter for å håndtere store tokens. AppState starter/stopper tokenfornyelse. Browserøkter håndteres av Supabase-klienten.
- `claim_deal` og `redeem_deal` håndhever innløsningsgrenser og engangsbruk på serveren. Begge låser tilbud først. Innløsning avvises også hvis bedriften er suspendert eller tilbudet er pauset/utløpt.
- Bilder: JPG/PNG/WebP, maks 5 MB, mappe per bedrift, medlemskap kreves for skriving. Bilder som er lastet opp er offentlig lesbare; ikke last opp private dokumenter.

Portalen er vanlig lokal Vite-utvikling; ingen nettside er publisert. Push, venner, studentkontroll og lojalitet har ingen pilotgrensesnitt. Arrangementer og nyheter administreres i bedriftsportalen og vises nå i ungdomsappen når de er publisert og bedriften er godkjent. Nyheter med fremtidig publiseringsdato og avsluttede arrangementer vises ikke i mobilfeeden. Abonnementspakkene er forslag, uten betalingsflyt eller håndhevede plangrenser. Ingen nye SQL-migrasjoner er nødvendige for denne dashboardoppdateringen.

## Tester og videre verifisering

Se [verifiseringsrapporten](tests/VERIFICATION.md) for faktisk gjennomførte kontroller, inkludert den ekte lokale Supabase-testen.

```sh
npm run typecheck
npm test
npm run test:mobile
npm run build
npm run mobile:export
npx playwright install chromium
npm run test:browser
```

- `npm test`: PostgreSQL/PGlite med mock av Supabase auth/storage, samt filter-, validerings- og QR-statuslogikk. Mock av tilfeldige bytes er bare i testen; Supabase bruker pgcrypto.
- `test:browser`: Chromium på desktop og mobilstørrelse, med simulerte Supabase HTTP-svar. Tester skjemaer, godkjenning, tilbud, manuell innløsning og passordflyt. Beviser ikke ekte e-postlevering eller kameratilgang.
- `mobile:export`: lager iOS/Android JavaScript-bundles. Dette er ikke en fysisk enhetstest eller en appbutikkbygging.
- `test:live`: ekte Supabase Auth/PostgREST/Storage og samtidige forespørsler. Sett `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SERVICE_ROLE_KEY` i **terminalmiljøet**, og kjør `npm run test:live`. Bruk et dedikert testprosjekt. Testen oppretter isolerte testkontoer, bedrifter og bilder og rydder dem opp etterpå. Uten variablene markeres testen som hoppet over. Service-role-nøkkelen skal ikke i klientenes `.env`-filer.

Før pilot med ekte brukere: kjør live-testen, registrer og bekreft en konto gjennom faktisk e-post, test passordlenken, og prøv begge mobilplattformene fysisk. Bruk to kontoer og en bedrift: godkjenn bedrift → publiser tilbud → lagre favoritt → hent QR på telefon → skann i portal over HTTPS/localhost → bekreft innløsning → kontroller at samme kode og utløpte koder avvises. Mobilkamera i nettleser krever sikker origin (HTTPS eller localhost); manuell innliming fungerer også ved lokal HTTP over LAN.

### Ved databaseendringer

Legg til en ny fil i `supabase/migrations/`; originalfilene i `DinVenn/` er referansemateriale. Kjør `npm run db:bundle` etterpå for å oppdatere den samlede SQL-filen for nye databaser. Delte TypeScript-typer ligger i `packages/core/src/database.types.ts` og kan erstattes med output fra `npx supabase gen types typescript` (eller `--project-id` for skyprosjekt). Oppdater API-et og kjør typekontroll ved kontraktsendringer.

Dokumentasjon: [Supabase CLI](https://supabase.com/docs/guides/local-development/cli/getting-started), [Auth redirect-adresser](https://supabase.com/docs/guides/auth/redirect-urls), [Expo SecureStore](https://docs.expo.dev/versions/latest/sdk/securestore/).

Supabase CLI 3 bruker lokal database som standard; bruk eksplisitt `--remote` for skydatabase. Hjelperen `node scripts/local-stack.mjs start` starter en redusert lokal native stack, `node scripts/local-stack.mjs test` kjører live-testen uten å skrive ut nøklene, og `node scripts/local-stack.mjs stop` stopper den.

Avhengighetskontrollen fant fem moderate varsler i Expo-verktøyenes transitive `glob`/`minimatch`-avhengigheter. npm foreslår en inkompatibel Expo-nedgradering; den er ikke anvendt.

### Kart i ungdomsappen

Kartfanen bruker `react-native-maps` (versjonen som følger Expo SDK 58). Den kan testes i Expo Go uten egne kartnøkler. Egne appbutikkbygg krever ytterligere Google Maps-oppsett på Android. Se [Expo-dokumentasjonen](https://docs.expo.dev/versions/latest/sdk/map-view/).

Bedrifter med gyldig `lat`/`lng` vises direkte. Andre norske gateadresser slås opp i [Kartverkets åpne adresse-API](https://www.kartverket.no/api-og-data/eiendomsdata/brukarrettleiing-adresse-api), med maksimalt tre samtidige oppslag og tidsavbrudd. Gate, husnummer og eventuell husbokstav bør fylles ut korrekt i bedriftsprofilen, sammen med by/postnummer. Tvetydige eller ukjente adresser vises i listen uten gjettet markør. «Veibeskrivelse» åpner en ekstern karttjeneste.

Ingen brukerposisjon samles inn eller etterspørres. Kun bedriftenes offentlige adresser sendes til adresse-API-et. Nye koordinater mellomlagres i appens minne; ingen SQL-endringer er nødvendige. Kartet trenger nettverk. Hvis en adresse ikke vises, bruk «Vis liste» eller «Prøv igjen».

Etter denne oppdateringen: stopp Expo-serveren med Ctrl+C og kjør `npm run mobile` igjen, og last prosjektet på nytt i Expo Go. Bruk `npm ci` først på andre maskiner for å få de nye avhengighetene.

### Kontroller kartpinnen i bedriftsprofilen

Bedriftsprofilen har nå et kart med automatisk adresseoppslag etter at gateadresse og by/postnummer er skrevet inn. Dra pinnen eller trykk i kartet for å korrigere plasseringen, og trykk **Lagre profil**. De lagrede `lat`/`lng`-feltene brukes direkte av mobilappen. «Søk opp adressen på nytt» erstatter manuell plassering med et nytt adresseoppslag. Hvis adressen endres, fjernes gammel pinne slik at den ikke blir lagret sammen med feil adresse.

Webkartet bruker Leaflet og OpenStreetMap-kartfliser med synlig kildehenvisning. Adresseoppslaget deles med mobilappen og bruker Kartverket. Ved manglende eller tvetydig treff kan pinnen settes manuelt. Ingen nye API-nøkler eller SQL-migrasjoner er nødvendige. Kartbakgrunn og adresseoppslag krever nettverk.

### Språk

Bedriftsportalen har én flaggknapp øverst (🇳🇴 / 🇬🇧) som viser valgt språk og bytter språk ved trykk. Mobilappen har samme valg under **Meg → Innstillinger → Språk**, også uten innlogging. Valget lagres på hver enhet. Grensesnitt, kategorier, statuser og datoformat følger språket. DinVenn-navnet og bedriftenes egne navn, beskrivelser, tilbud og nyheter beholdes slik de er skrevet.

Felles oversettelser ligger i `packages/core/src/i18n.ts`. Nye grensesnitttekster legges i ordboken og vises med `t(...)`; bruk `locale()` for datoer. Språkvalget krever ingen databaseendring.

### Lys og mørk modus

Sol-/måneknappen ved språkvalget i webportalen og under **Meg → Innstillinger → Utseende** i mobilappen bytter tema. Solen viser lys modus, månen viser mørk modus. Lys modus er standard og beholder det opprinnelige designet. Valget lagres lokalt på hver enhet, uavhengig av språk og konto. Mørk modus bruker den alternative DinVenn-logoen. QR-koder vises på hvit bakgrunn også i mørk modus.

Felles temavalg ligger i `packages/core/src/theme.ts`. Web bruker CSS-variabler, og mobil bruker paletten og `themeStyles` i `apps/mobile/src/theme.ts`. Ingen databaseendring er nødvendig.

### Publisering på Cloudflare Workers

`wrangler.jsonc` i prosjektroten peker på webportalens ferdige bygg. Bruk disse innstillingene i Cloudflare Workers Builds:

- Root directory: prosjektroten (ikke `apps/portal`, siden prosjektet bruker npm workspaces).
- Build command: `npm run build`.
- Deploy command: `npx wrangler deploy`.
- Worker-navn: `dinvenn` (må samsvare med `name` i `wrangler.jsonc`; tilpass begge hvis du velger et annet navn).
- Byggvariabler: `VITE_SUPABASE_URL` og `VITE_SUPABASE_PUBLISHABLE_KEY`. Disse må være tilgjengelige under bygging, siden Vite bygger dem inn i klienten.

Etter publisering må den faktiske HTTPS-adressen legges inn i Supabase Auth sine URL-innstillinger og i mobilens `EXPO_PUBLIC_PORTAL_URL`. Denne konfigurasjonen gjelder Workers; Pages bruker egne byggeinnstillinger.

### Installerbar pilotapp (Expo Build)

Mobilappen er koblet til [din-venn/dinvenn](https://expo.dev/accounts/din-venn/projects/dinvenn). Byggekonfigurasjonen ligger i `apps/mobile/eas.json`. Kjør EAS-kommandoer fra `apps/mobile`, ikke repositoriroten.

`preview` lager en selvstendig Android-APK eller en intern iOS-testapp med JavaScript inkludert, slik at Expo Go og en lokal Metro-server ikke trengs. `simulator` lager en iPhone-simulatorversjon for Mac. Deling til fysiske iPhone-enheter gjennom EAS krever et aktivt Apple Developer-medlemskap og registrerte testenheter; simulatorprofilen er ikke installerbar på en iPhone.

Før Android-bygg:

1. Opprett/velg et Google Cloud-prosjekt, konfigurer fakturering og aktiver **Maps SDK for Android**.
2. Opprett en API-nøkkel og begrens den til Maps SDK for Android. Før deling begrenses den også til Android-pakken `no.dinvenn.pilot` og SHA-1 fra appens signeringssertifikat i EAS. iOS bruker Apple Maps og trenger ikke denne Google-nøkkelen.
3. Legg `GOOGLE_MAPS_ANDROID_API_KEY` i `apps/mobile/.env`, og overfør appvariablene til Expo-miljøet:

   ```bash
   cd apps/mobile
   npx eas-cli env:push preview --path .env
   ```

   Preview-miljøet skal ha `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `EXPO_PUBLIC_PORTAL_URL` (`https://dinvenn.app`) og Google Maps-nøkkelen. Ingen service-role-nøkkel eller databasepassord skal legges inn. `.env` og signeringsfiler er utelatt fra Git.
4. Start bygg og la EAS håndtere Android-signeringen:

   ```bash
   npx eas-cli build --platform android --profile preview
   ```

   Build-lenken gir nedlasting av APK-en når bygget er ferdig. Android-enheten må tillate installasjon fra valgt kilde. Google Maps-nøkkelens Android-begrensning må bruke SHA-1 fra signeringen som faktisk ble brukt i APK-en.

Bygg for iOS Simulator: `npx eas-cli build --platform ios --profile simulator`. Et slikt bygg bruker også Expo sin byggekvote. Android-signering er opprettet i Expo, og første APK-bygg er fullført med profilen `preview`. Byggestatus og installasjonslenker finnes i Expo-prosjektets Builds-side.

### Anmeldelser og privat organisasjonsnummer

Mobilens bedriftsprofil har anmeldelser med 1–5 stjerner (5 som standard), tekst og valgfri anonym visning. Innlogging kreves for å skrive; én anmeldelse per bruker og bedrift kan redigeres av forfatteren. Bedriften svarer på sin egen side **Anmeldelser** i portalen. Andre brukere kan ikke svare. Forfatteren kan slette sin egen anmeldelse; administrator kan moderere alle gjennom **Moderering av anmeldelser**. Bedriften kan slette sitt eget svar, men ikke kundens anmeldelse.

Rå anmeldelsesrader er ikke tilgjengelige gjennom klient-API-et, fordi de inneholder forfatterens bruker-ID. `list_business_reviews` returnerer bare visningsdata og et `is_own`-flagg; anonyme anmeldelser inneholder verken forfatternavn eller bruker-ID. Klienter kan ikke slette profiler direkte for å omgå sletteforbudet gjennom kaskadesletting. Eventuell kontosletting må håndteres gjennom server/admin.

Organisasjonsnummer lagres i `business_private_details`, med lesetilgang bare for medlemmer av bedriften og administrator. Det gamle offentlige `businesses.org_number` beholdes alltid tomt for å støtte eldre klienters `select('*')`. Nummeret krever ni sifre; dette er formatkontroll, **ikke automatisk verifisering mot Brønnøysundregistrene**. Administrator godkjenner bedriften manuelt. Endring av nummer opphever eksisterende godkjenning og krever ny godkjenning.

For en eksisterende Supabase-pilotdatabase:

1. Kjør **hele `supabase/upgrade-reviews.sql` én gang** i SQL Editor. Filen kjører oppgraderingen i én transaksjon. Ikke kjør `setup.sql` i en eksisterende database.
2. Oppgraderingen flytter eksisterende organisasjonsnumre til den private tabellen. Godkjente bedrifter som mangler nummer blir satt til `pending` og er skjult fra den offentlige katalogen til nummer er lagt inn og administrator har godkjent igjen.
3. Publiser den nye portalversjonen og last inn mobilappen på nytt i Expo Go (eller bygg ny APK). Den tidligere installerte APK-en får ikke ny kode automatisk.
4. Fyll inn manglende nummer på bedriftsprofilene og godkjenn dem i administratorens **Godkjenning**.

For en ny, tom database brukes `setup.sql` som vanlig. Alle nye API-funksjoner og tilgangsregler finnes i migrasjonen `20261120000008_reviews_business_identity.sql`.

## Brukerappen på web (PWA)

Brukerappen er tilgjengelig på **https://dinvenn.app**. Bedriftsportalen ligger på
**https://bedrift.dinvenn.app**, med en lenke fra brukerappens toppfelt.
Mobilkoden gjenbrukes via React Native Web; iOS og Android beholder sine native kart
og sikker lagring. På web brukes Leaflet/OpenStreetMap og nettleserens lokale lagring.
Økter lagres kun i den aktuelle nettleseren, og ingen hemmelige servernøkler brukes.

- Lokal brukerapp: `npm run web` (http://localhost:5174).
- Lokal bedriftsportal: `npm run portal` (http://localhost:5173).
- Bygg begge: `npm run build:all`.
- Nettlesertester av brukerappen: `npm run test:web`.
- Publiser begge til Cloudflare: `npm run deploy:web` (krever Wrangler-innlogging).

`wrangler.jsonc` publiserer bedriftsportalen som Worker `dinvenn`.
`wrangler.consumer.jsonc` publiserer brukerappen som Worker `dinvenn-app`.
Dagens automatiske Cloudflare-bygg for portalen publiserer fortsatt bare portalen;
bruk kommandoen over når brukerappen endres, eller koble en egen Workers Build til
`dinvenn-app` med byggkommando `npm run build:web` og deploykommando
`npx wrangler@4.165.0 deploy --config wrangler.consumer.jsonc`.
Sett `EXPO_PUBLIC_SUPABASE_URL` og `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY` i dette
byggmiljøet (VITE-variantene støttes også), samt
`EXPO_PUBLIC_PORTAL_URL=https://bedrift.dinvenn.app`. Kun offentlige klientnøkler.

I Supabase → Authentication → URL Configuration beholdes Site URL som
`https://dinvenn.app`. Redirect URLs må inneholde begge domenene og
`https://bedrift.dinvenn.app/?recovery=1`, i tillegg til lokale utviklingsadresser.
Webregistrering bekrefter e-post tilbake til brukerappen. Passordtilbakestilling
bruker portalens eksisterende skjerm. Eldre tilbakestillingslenker til hoveddomenet
videresendes til portalen med parametere og token bevart. Supabase-innstillingene
må lagres manuelt dersom administratortilgang ikke er tilgjengelig.

På iPhone: åpne dinvenn.app i Safari → Del → Legg til på Hjem-skjerm.
På Android: åpne i Chrome → meny → Installer app / Legg til på startskjermen.
Appen krever internett for katalog, innlogging og QR-status; frakoblet navigasjon
viser en melding med «Prøv igjen». Service worker lagrer aldri API-svar eller
brukerdata. Nye kodeversjoner lastes ved neste åpning/oppdatering av siden.
Webappen krever ikke Xcode eller Apple-signering og har ingen syvdagersgrense.

## Ordfilter for anmeldelser

Kjør hele `supabase/upgrade-review-filter.sql` **én gang** i SQL Editor på den
allerede oppgraderte pilotdatabasen (etter `upgrade-reviews.sql`). Ikke kjør
`setup.sql` i en eksisterende database. Oppgraderingen er atomisk og legger til
ordliste og databasetrigger; den endrer eller sletter ikke eldre anmeldelser.

Filteret gjelder nye og endrede anmeldelsestekster og bedriftssvar, inkludert
API-kall og direkte databaseskriving. Anonym publisering gir ikke unntak.
Teksten avvises med en forståelig melding og lagres ikke delvis. Kun
administrator kan lese eller endre `public.review_blocked_terms` gjennom API-et.
Supabase SQL Editor / Table Editor kan også brukes til å vedlikeholde listen.

Startlisten inneholder tydelige norske og engelske diskriminerende skjellsord.
Den er ment som et utgangspunkt, og kan gjennomgås i migrasjonsfilen. For å legge
til et ord eller uttrykk fra SQL Editor, erstatt eksemplet nedenfor:

```sql
insert into public.review_blocked_terms (term)
values (public.normalize_review_text('ord eller uttrykk'))
on conflict (term) do update set is_active = true;
```

For å deaktivere et uttrykk uten å slette det:

```sql
update public.review_blocked_terms
set is_active = false
where term = public.normalize_review_text('ord eller uttrykk');
```

Nye ord gjelder med én gang, uten ny publisering av webappen. Filteret bruker hele
ord/uttrykk, Unicode NFKC, små bokstaver, fjerning av utvalgte usynlige tegn og
normalisering av tegnsetting/mellomrom. Vanlig negativ kritikk og nøytrale
identitetsord blokkeres ikke av startlisten. Bøyninger må legges til separat.
Ordlisten tolker ikke kontekst: sitater kan også avvises, og omskrivinger,
feilstavinger og diskriminerende setninger uten listeord kan slippe gjennom.
Administratorens eksisterende moderering og sletting beholdes.

## Flere avdelinger i bedriftsportalen

Kjør hele `supabase/upgrade-business-locations.sql` én gang i Supabase SQL Editor
på den eksisterende pilotdatabasen. Ikke kjør `setup.sql` der. For nye tomme
databaser er endringen inkludert i den samlede oppsettsfilen. Dagens hovedadresse
og kartpinne i `businesses` beholdes; oppgraderingen flytter eller sletter ingen
adresser, anmeldelser eller tilbud.

Etter registrering finnes **Avdelinger og flere adresser** nederst under
**Bedriftsprofil**. Hvert ekstra lokale har eget navn, gateadresse, norsk
postnummer, by og valgfri kartpinne. Kartverket-oppslaget og manuell flytting av
pinnen fungerer som for hovedadressen. Adresseendring fjerner en tidligere pinne,
slik at gamle koordinater ikke lagres for en ny adresse. Avdelinger lagres separat
med **Lagre avdeling**; profilknappen over lagrer hovedprofilen. Sletting krever
bekreftelse og berører bare det valgte ekstra lokalet.

Alle avdelinger deler organisasjonsnummer, medlemskap, godkjenningsstatus og
tilbud med bedriften. Dette er ikke separate bedriftskontoer eller egne
innløsningsgrenser. Bedriftsmedlemmer kan administrere egne lokaler;
administrator kan administrere alle. Godkjente bedrifters avdelinger er lesbare
med RLS, mens ventende/suspenderte bedrifters lokaler kun vises for medlemmer og
administrator. Skriving føres i eksisterende endringslogg.

Brukerappens kart og kartliste viser både hovedadressen og ekstra avdelinger.
Kartets byfilter og søk bruker hver avdelings adresse, by og navn. Kartkort og
veibeskrivelse bruker den valgte avdelingens plassering; «Se bedrift» åpner den
felles profilen med samme tilbud og favoritt-ID. Utforsk og profilens praktiske
informasjon bruker fortsatt hovedadressen. Avdelinger hos bedrifter som ikke er
godkjent inngår ikke i den offentlige katalogen. Ingen ny SQL-oppgradering kreves
for kartvisningen utover `upgrade-business-locations.sql`.

## Gave, 2-for-1 og egen rabattkode

Kjør hele `supabase/upgrade-deal-details.sql` én gang i SQL Editor på en eksisterende
pilotdatabase, før den nye portalversjonen tas i bruk. Nye tomme databaser bruker
`setup.sql`. Eksisterende tilbud og innløsninger beholdes.

Ved **Gratis gave** eller **Annet / 2 for 1** fyller bedriften inn hva kunden får,
og eventuelle kjøpskrav, i eget felt (maks 500 tegn). Beskrivelsen vises i
forhåndsvisningen og i tilbudsdetaljene hos brukeren. Prisavslag i prosent/kroner
beholder tallfeltet. Nye gaver/andre tilbud krever beskrivelse i databasen også;
eldre tilbud uten denne informasjonen kan fortsatt pauses, mens redigering i
portalen ber om en utfylt forklaring.

**Valg av rabattkode → Egen rabattkode** lar bedriften angi en kode på 1–64 tegn.
Koden vises på brukerens kodekort i stedet for tilfeldig kodetekst. Hver uthenting
har fortsatt en unik QR-token, og bedriften må skanne denne eller bruke den unike
innløsningskoden for at DinVenn skal håndheve engangsbruk og kapasitet. Brukeren
kan velge **Vis innløsningskode** hvis kameraet ikke kan brukes. Den felles
rabattkoden er ikke en erstatning for registrert innløsning, og koder brukt i
bedriftens eksterne kasse/nettbutikk må også kontrolleres av det systemet.
Tilbudskoden ligger på offentlig tilbudsdata og skal ikke brukes som en hemmelighet.

Visningskoden fryses på innløsningen ved uthenting. Endret tilbudskode påvirker
bare nye uthentinger; gamle kodekort beholdes. Eksisterende innløsninger fra før
oppgraderingen viser sin opprinnelige tilfeldige kode. Valget **Automatisk kode**
fjerner tilbudets egen kode ved lagring og bruker normal QR/engangskodeflyt igjen.

## Min side

Kjør `supabase/upgrade-my-account.sql` én gang i SQL Editor på den eksisterende
pilotdatabasen for sikker profilredigering og egen anmeldelseshistorikk. Den
endrer ikke eksisterende data. Nye tomme databaser bruker den samlede `setup.sql`.

Min side har profilkort med initialer, navn og valgfri hjemby, snarveier til
favoritter og aktive (utstedte, ikke utløpte) koder, Mine anmeldelser og kompakte
språk-/temavalg. Utloggede brukere får innlogging og registrering før innstillinger.
Profilnavnet brukes også i navngitte anmeldelser; redigeringen endrer bare
`profiles.display_name` og `profiles.home_city`, aldri roller, e-post eller passord.
Auth-metadata er ikke profilens kilde etter at profilen er lastet.

`list_my_reviews()` identifiserer brukeren fra innloggingen og tar ikke imot en
valgfri bruker-ID. Den viser bare egne anmeldelser, også skjulte anmeldelser og
anmeldelser av bedrifter som ikke lenger er godkjent. Redigering er tilgjengelig
når bedriften er godkjent, gjennom eksisterende anmeldelsesfunksjon og ordfilter.
Forfatteren kan slette egne anmeldelser, og administrator kan moderere alle. Anonym visning beholdes.

Den offentlige kontaktadressen konfigureres med `EXPO_PUBLIC_SUPPORT_EMAIL` ved
bygging. Når den er satt, viser Hjelp og personvern knapper som åpner e-postklienten
for støtte/problemrapportering og forespørsel om kontosletting. Brukeren må sende
meldingen selv; det slettes ikke automatisk data. Uten en konfigurert adresse
skjules disse knappene. Denne kontoinformasjonen erstatter ikke en fullstendig
personvernerklæring for offentlig drift.


## Sletting av egne anmeldelser og bedriftssvar

Kjør hele `supabase/upgrade-review-deletion.sql` én gang i Supabase SQL Editor for
å aktivere de nye rettighetene. Oppgraderingen sletter ingen data. For nye tomme
databaser er den inkludert i `setup.sql`.

Forfatteren får **Slett min anmeldelse** ved sin anmeldelse og under
**Min side → Mine anmeldelser**. Sletting krever bekreftelse og fjerner hele
anmeldelsen, inkludert bedriftens svar. Det fungerer også for egne skjulte
anmeldelser og anmeldelser av bedrifter som ikke lenger er godkjent via Min side.
Andre brukere og bedrifter kan ikke slette kundens anmeldelse. Administrator
beholder retten til å moderere alle anmeldelser.

I portalen får bedriften **Slett bedriftens svar**. Bekreftet sletting nullstiller
bare `business_reply` og `replied_at`; stjerner, anmeldelsestekst og anonymitet
beholdes. Medlemmer av samme bedrift administrerer det felles bedriftssvaret,
i likhet med dagens tilgang til å skrive/redigere det. Medlemmer av en annen
bedrift har ikke tilgang. Urelaterte administratorer får ikke automatisk
svarrettigheter; deres eksisterende moderering av hele anmeldelser beholdes.

Begge operasjoner skjer i avgrensede databasefunksjoner med kontroll av den
innloggede brukeren. Rå lesing og sletting fra `reviews` er fortsatt sperret i
klient-API-et for å beskytte anonym forfatteridentitet.

## Spill for å hente en vennepris

Kjør `supabase/upgrade-required-tic-tac-toe.sql` én gang i Supabase SQL Editor etter den tidligere spilloppgraderingen. Ikke kjør setup.sql på en eksisterende database.

Alle nye uthentinger krever én fullført runde tre på rad. Bedriften har ikke lenger et valg for å skru spill av eller på. Seier, tap og uavgjort gir samme rabatt. De fire andre spillene er fjernet fra appen. Allerede utstedte QR-koder beholdes. Påbegynte andre spill byttes til tre på rad; fullførte runder kan fortsatt brukes.

Det er ingen betaling for spill, tilfeldige premier, tidsbasert poengkrav eller
krav om å vinne. Tilbud, rabatt og vilkår vises før spill. Ved tilbud med kapasitet
reserverer en påbegynt runde én plass i opptil én time, begrenset av tilbudets
sluttid. En pause/suspensjon eller endring av tilbudets grenser kan fortsatt gjøre
uthenting utilgjengelig. Spillet har ingen kort nedtelling eller krav til
reaksjonshastighet. En runde som er startet, hentes igjen når samme bruker åpner
spillet på nytt, også etter sideoppdatering. Ingen omtrekking før runden er brukt
eller utløpt. Eksisterende gyldig QR-kode åpnes uten ny runde.

Spilltilstanden ligger i privat `deal_game_sessions`, uten klientens direkte
lese-/skrivetilgang.
`start_deal_game` og `play_deal_game` kontrollerer bruker, tilbud, utløp, lovlige
handlinger og revisjonsnummer. En trigger på `deal_redemptions` krever en
fullført, ubrukt runde for alle nye QR-koder. Den eksisterende
`claim_deal`/`redeem_deal`-flyten beholder grenser, låsing og engangsbruk.
Serverkontrollen hindrer å hoppe direkte til «fullført» eller QR; den er ikke
bevis på at et menneske fysisk har trykket, og kan ikke alene stoppe automatiserte
klienter som sender en lovlig sekvens av handlinger.

Sessioner slettes ved kontosletting eller sletting av tilbudet. Ved regelmessig
vedlikehold kan prosjekteier også rydde eldre historikk i SQL Editor, for eksempel
`delete from public.deal_game_sessions where expires_at < now() - interval '7 days';`.
Dette påvirker ikke QR-koder som allerede er utstedt.
