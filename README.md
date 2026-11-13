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
