# Verifisering – 6. november 2026

Gjennomført i dette arbeidsområdet:

| Kontroll | Resultat |
| --- | --- |
| TypeScript for mobil, portal og delt API | Bestått |
| Enhets-/PostgreSQL-tester med PGlite og mock av Supabase auth/storage | 33 bestått |
| Chromium, desktop og mobilstørrelse, simulerte Supabase HTTP-svar | 10 bestått |
| Ekte lokal Supabase native runtime (CLI 3, PostgreSQL 17) | Startet; alle migrasjoner kjørt |
| Ekte Auth/PostgREST/Storage-integrasjon | Bestått, inkludert samtidige reservasjoner og innløsninger |
| Produksjonsbygg av webportal | Bestått |
| Expo-eksport av iOS/Android JavaScript-bundles | Bestått |
| Generering av delte databasetyper | Fra den ekte lokale Supabase-databasen |

Live-testen opprettet og slettet isolerte testkontoer, to bedrifter, tilbud og et PNG-bilde. Bare én av to samtidige reservasjoner fikk siste tilgjengelige plass. Bare én av to samtidige innløsninger av samme token lyktes.

Skyprosjektet som brukeren oppga ble kontaktet med den offentlige publishable-nøkkelen. Prosjektet svarte, men tabellene `categories`, `businesses` og `deals` manglet. Ingen sky-migrasjoner eller endringer i skyprosjektets Auth-konfigurasjon er kjørt. Appenes lokale, Git-ignorerte miljøfiler peker på skyprosjektet.

Gjenstående manuell verifisering: faktisk e-postbekreftelse/passordtilbakestilling med prosjektets e-posttjeneste, kameraskanning i sikker nettleser-origin, og Expo Go på fysiske iPhone-/Android-enheter. Nettlesertesten av mobilvisning er ikke en native enhetstest.

npm audit rapporterte fem moderate varsler i transitive Expo CLI/fingerprint-avhengigheter (`glob`/`minimatch`). Ingen automatisk inkompatibel nedgradering er anvendt.
