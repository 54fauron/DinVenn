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
