# Verifisering – 6. november 2026

Gjennomført i dette arbeidsområdet:

| Kontroll | Resultat |
| --- | --- |
| TypeScript for mobil, portal og delt API | Bestått |
| Enhets-/PostgreSQL-tester med PGlite og mock av Supabase auth/storage | 39 bestått |
| Chromium, desktop og mobilstørrelse, simulerte Supabase HTTP-svar | 18 bestått |
| Ekte lokal Supabase native runtime (CLI 3, PostgreSQL 17) | Startet; alle migrasjoner kjørt |
| Ekte Auth/PostgREST/Storage-integrasjon | Bestått, inkludert samtidige reservasjoner og innløsninger |
| Produksjonsbygg av webportal | Bestått |
| Expo-eksport av iOS/Android JavaScript-bundles | Bestått |
| Generering av delte databasetyper | Fra den ekte lokale Supabase-databasen |

Live-testen opprettet og slettet isolerte testkontoer, to bedrifter, tilbud og et PNG-bilde. Bare én av to samtidige reservasjoner fikk siste tilgjengelige plass. Bare én av to samtidige innløsninger av samme token lyktes.

Skyprosjektet som brukeren oppga ble kontaktet med den offentlige publishable-nøkkelen. Prosjektet svarte, men tabellene `categories`, `businesses` og `deals` manglet. Ingen sky-migrasjoner eller endringer i skyprosjektets Auth-konfigurasjon er kjørt. Appenes lokale, Git-ignorerte miljøfiler peker på skyprosjektet.

Gjenstående manuell verifisering: faktisk e-postbekreftelse/passordtilbakestilling med prosjektets e-posttjeneste, kameraskanning i sikker nettleser-origin, og Expo Go på fysiske iPhone-/Android-enheter. Nettlesertesten av mobilvisning er ikke en native enhetstest.

npm audit rapporterte fem moderate varsler i transitive Expo CLI/fingerprint-avhengigheter (`glob`/`minimatch`). Ingen automatisk inkompatibel nedgradering er anvendt.

Dashboardoppdatering: nettlesertestene dekker oppretting, redigering, publisering og pause av arrangementer og nyheter, ugyldig tidsrom og statusfilter. Abonnementssiden kontrolleres for tydelig prisforslag og deaktiverte betalingsknapper. Desktop og mobil er visuelt kontrollert med skjermbilder. Den lokale live-testen er utvidet med arrangementer, nyheter og privat abonnementstilgang. Ingen skydata endres av disse testene.

Mobiloppdatering: 6 React Native-skjermtester med mock av native kart, Supabase og Expo-kontekst dekker fem bunnfaner, forsideinnhold, arrangementsdetaljer, innloggingskrav ved lagring, kartmarkører, søk, valgt by og ukjente adresser. 6 nye rene tester dekker koordinater, entydige adresser, veibeskrivelse og nedtelling. Kartverkets offentlige API er kontrollert med en ekte offentlig adresse. Native karttegning og faktiske trykk/zoom på fysisk iPhone/Android er ikke testet her; ingen simulator var startet. JavaScript-pakkene for begge plattformer er eksportert uten feil.

Den utvidede lokale Supabase-testen bekrefter også katalogspørringene som mobilappen faktisk bruker, lagring av arrangementfavoritter, og at pauset/avsluttet innhold og fremtidige nyheter utelates.

## Kart i bedriftsprofil – 9. november 2026

Nye nettlesertester på desktop og mobilvisning dekker automatisk adresseoppslag, lagring og gjeninnlasting av koordinater, at adresseendring fjerner gammel pinne, og manuell flytting før lagring. Desktop-testen drar selve Leaflet-markøren, mens mobilvisningen setter pinnen ved karttrykk. Kartverkets svar og kartfliser er simulerte i nettlesertestene; Leaflet-kartet og interaksjonene kjører i nettleseren. Delte adressefunksjoner testes også av de eksisterende logikktestene.

## Anmeldelser og organisasjonsnummer – 20. november 2026

- Migrasjonen er testet i PGlite og brukt i lokal Supabase native runtime.
- SQL- og faktiske Auth/PostgREST-tester dekker anonym visning uten bruker-ID, sperring av rå anmeldelsesdata, påkrevd innlogging, fem stjerner som standard, svar kun fra riktig bedrift, admin-sletting, privat organisasjonsnummer og ny godkjenning ved nummerendring.
- SQL-testen dekker også at profilsletting fra klienten ikke kan brukes til å kaskadeslette anmeldelser.
- React Native-komponenttestene dekker innlogging, standardrating, anonym innsending og visning av bedriftssvar.
- Playwright tester bedriftssvar og admin-moderering, inkludert avbrutt sletting og blokkert godkjenning uten organisasjonsnummer, på PC og mobilbredde.
- Brukeren bekreftet 20. november 2026 at produksjonsoppgraderingen er kjørt uten feil; dette er ikke kontrollert direkte av agenten. Ny klientkode er ennå ikke publisert av agenten. Fysisk enhet og faktisk e-postlevering er ikke testet i denne endringen.

### Brukerapp på web – 20. november 2026

- Produksjonsbygg av portal og brukerapp, TypeScript, 45 kjernetester og 14 native komponenttester bestått.
- Chromium kontrollert ved mobil- og PC-bredde: katalog, innloggingskrav, språk/tema etter reload, kartmarkør og lukking på kartet. Gjentakbare tester: `npm run test:web`.
- Begge Cloudflare-domener returnerte HTTP 200 og riktig grensesnitt uten JavaScript-feil etter publisering.
- Faktisk installasjon på hjemskjerm i Safari/Android, og e-postflyt på det nye portalunderdomenet, er ikke verifisert. Supabase Redirect URLs krever manuell kontroll.

### Ordfilter – 24. november 2026

- Alle ni migrasjoner kjørt i ren PostgreSQL via PGlite med testmodell av Supabase Auth/Storage.
- 49 kjernetester bestått, inkludert administratorregler for ordliste, avvisning av nye og redigerte anmeldelser, bedriftssvar, direkte SQL, normalisering, ordgrenser og dynamisk deaktivering.
- Eksisterende anmeldelser og moderering av uendret tekst beholdes. TypeScript og begge produksjonsbygg bestått.
- Cloud-databasen er ikke oppgradert av agenten; `upgrade-review-filter.sql` må kjøres av prosjekteier før filteret håndheves i produksjon. Ekte Supabase-integrasjon av den nye triggeren er ikke testet.

### Flere avdelinger – 24. november 2026

- TypeScript og produksjonsbygg for både portal og brukerapp bestått.
- 51 kjernetester bestått. Alle ti migrasjoner er kjørt i en ren PGlite-testdatabase med Auth/Storage-modell. Avdelingstesten dekker innsetting, egne/andre bedrifter, administrator, offentlig synlighet ved godkjenning/suspensjon, ugyldige felt/koordinater, endringslogg og sletting uten endring av hovedadressen.
- Nettlesertester med simulert backend: oppretting, redigering, vedvarende lagring etter reload, adresseoppslag, nullstilling av gammel kartpinne og bekreftet/avbrutt sletting ved mobil- og PC-bredde. Eksisterende profil- og kartflyt passerer også (10 tester). To ekstra tester av lastefeil og nytt forsøk passerer på mobil og PC.
- Oppgradering av sky-Supabase krever at prosjekteier kjører `upgrade-business-locations.sql`. Reell ende-til-ende-lagring i skyen er ikke kontrollert av agenten. Brukerappens visning av ekstra avdelinger inngår ikke i denne portalendringen.

### Avdelinger på brukerkartet – 24. november 2026

- Katalogen henter ekstra avdelinger og filtrerer dem mot godkjente bedrifter. Ingen ny migrasjon kreves.
- TypeScript, webbygg og 16 native komponenttester bestått. Ny dekning for avdelingsmarkører, separate kartkort, byfilter, kartliste, felles bedriftsprofil og veibeskrivelse til avdelingens koordinater.
- Åtte nettleserkontroller bestått ved mobil- og PC-bredde: eksisterende kontoflyt og kartkort, flere avdelinger i samme bedrift, filtrering, valg/lukking og ren tekst i kartetiketter.
- Lesetilgang til sky-Supabase kontrollert: den ekstra offentlige avdelingen finnes med lagrede koordinater. Ingen data er endret i skyen.
- Etter publisering: kontrollert direkte på dinvenn.app at hovedadressen og den ekstra avdelingen vises som to markører. Valg av avdelingen viste riktig adresse, uten JavaScript-feil.

### Tilbudsbeskrivelse og egen kode – 27. november 2026

- 54 kjernetester bestått, inkludert alle elleve migrasjoner i ren PGlite-testdatabase.
- Ny databasetest dekker gave/2-for-1-beskrivelse, trimming, ugyldig kode, frosset visningskode, unike QR-token for ulike brukere, gjenbruk av reservasjon og avvisning av dobbelt innløst kode. En felles rabattkode kan ikke innløses som en personlig token.
- Fire målrettede nettlesertester bestått med simulert backend på mobil/PC: oppretting/redigering av gave og 2-for-1, egen/automatisk kode, brukerens uthenting med riktig beskrivelse og frosset kode samt manuell visning av unik innløsningskode.
- TypeScript og begge produksjonsbygg bestått. Prosjekteier oppga at SQL-oppgraderingen var kjørt uten feil. Ingen ekte innløsning eller prøveordre er opprettet i produksjon av agenten.

### Oppusset Min side – 27. november 2026

- TypeScript og begge produksjonsbygg bestått; 56 kjernetester og 16 native komponenttester bestått.
- Ny databasetest dekker profilendring bare for innlogget bruker, validering, uendrede roller, ingen endring av andres profiler og egen anmeldelseshistorikk uten andre brukeres anmeldelser. Skjulte anmeldelser og suspenderte bedrifter vises bare for egen bruker i denne oversikten.
- Ny nettlesertest passerer på mobil og PC med simulert backend: utlogget rekkefølge, profilredigering og reload, korrekt antall aktive koder, anmeldelsesredigering og bedriftssvar, språk og mørk modus. Skjermbilder gjennomgått visuelt.
- Prosjekteier bekreftet SQL-oppgraderingen kjørt uten feil. Ingen kontosletting eller e-post er sendt av agenten. Kontaktknapper vises bare når offentlig støtteadresse er konfigurert.
- Hele brukerappens nettlesersuite bestått (12 tester). Skyfunksjonen `list_my_reviews` er kontrollert å finnes og avvise anonym tilgang; ingen private brukerdata er hentet av agenten.

### Sletting av egne anmeldelser og svar – 27. november 2026

- 58 kjernetester bestått med alle tretten migrasjoner i ren PGlite. Tilgang testet som forfatter, annen bruker, egen bedrift, annen bedrift, administrator og anonym.
- Bedriften kan nullstille bare sitt svar og tidspunkt. Anmeldelsens tekst, stjerner, status og anonymitet beholdes. Forfatteren kan slette egen anmeldelse med svar; administrator beholder moderering.
- Native slettetest dekker bekreftelse/avbryt og at andre anmeldelser beholdes. Nettlesertester på mobil og PC dekker egen anmeldelse fra Min side, bekreftet/avbrutt svar-sletting, vedvarende resultat og uendret administratormoderering.
- Prosjekteier bekreftet oppgraderingen kjørt uten feil. Ingen ekte anmeldelser eller svar slettet av agenten i produksjon.

### Fem spill før vennepris – 27. november 2026

- 61 kjernetester bestått. Fjorten migrasjoner kjørt i ren PGlite-testdatabase.
- Alle fem serverregler er gjennomspilt før QR-uthenting. Direkte uthenting før fullføring, annen brukers runde, rå tilstandsendring, ugyldige trekk, gammel revisjon og utløpte runder avvises. Runde-ID og fullføring beholdes ved nytt start-kall. Memorys skjulte brett er ikke med i klientresponsen.
- Kapasitetsreservasjon og frigjøring ved utløp er testet sekvensielt. Ekte samtidighet mot sky-PostgreSQL er ikke lasttestet.
- Ti målrettede nettlesertester passerer på mobil/PC for alle fem spill helt til QR etter fullføring. To portaltester passerer for lagring av spillkravet. Skjermbilder av spillene gjennomgått.
- Prosjekteier bekreftet SQL-oppgraderingen kjørt uten feil. Ingen reelle tilbud er satt til spillkrav og ingen ekte rabatter er hentet av agenten.
- Avsluttende regresjon: 17 native komponenttester og hele brukerappens 22 nettlesertester bestått. TypeScript og begge produksjonsbygg bestått. Spillfeltets tilgjengelighet er kontrollert lesende i sky-Supabase.


### 2026-11-27 – obligatorisk tre på rad

- Fjernet de fire andre spillene fra appflyten og valget i tilbudsskjemaet.
- Migrasjon 15 testet som oppgradering etter tidligere migrasjoner: alle tilbud krever spill, andre påbegynte spill konverteres, eksisterende QR beholdes.
- Typesjekk og begge produksjonsbygg bestått.
- 62 kjernetester/databasekontroller, 17 native mobiltester, 14 nettlesertester for forbruker og 2 relevante portaltester bestått. Nettlesertester bruker mockdata; databasekontroller bruker PGlite med mock av Supabase Auth/Storage.
- Brukeren bekreftet at upgrade-required-tic-tac-toe.sql ble kjørt uten feil i Supabase.


### 2026-11-27 – seier og oppusset tre på rad

- Ny migrasjon 16 krever serverbekreftet X-seier for nye QR-koder. Tap og uavgjort kan nullstilles med revisjonskontroll; reservasjonens utløp forlenges ikke. Utstedte QR beholdes.
- Brett med animerte brikker, markert vinnerrad, rundestatus og ny-runde-knapp. Respekterer redusert bevegelse. React Native Web sin animasjon krever globalThis-alias i Vite; nettlesertester kontrollerer fravær av JavaScript-feil.
- Typesjekk, begge produksjonsbygg og 63 kjerne-/databasetester bestått. Nettlesersuite med 14 tester bestått, deretter 4 fokuserte spilltester for seier og tap/nytt forsøk på mobil og PC. 17 native regresjonstester bestått ved omkjøring; første kjøring hadde én feil i eksisterende regresjonssuite.
- Brukeren bekreftet at upgrade-tic-tac-toe-win.sql er kjørt i Supabase. Database- og nettlesertestene bruker lokale testdata/mocker.


### 2026-11-27 – tenkepause og strategi

- Migrasjon 17 kontrollerer vinner-, blokkerings- og sentrumsprioritering. 64 kjerne-/databasetester og typesjekk bestått.
- Fire nettlesertester på mobil og PC bekrefter X først, tenkestatus uten O, videre spill, seier, nytt forsøk og QR. Ingen JavaScript-feil i testflyten.
- Forbrukerens produksjonsbygg bestått. SQL-oppgradering leveres separat i upgrade-tic-tac-toe-strategy.sql.
