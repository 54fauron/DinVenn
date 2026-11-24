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
