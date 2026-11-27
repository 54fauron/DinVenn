# Utakt: Ost på rømmen

Tilpasset etter brukerens ønske fra [Akademiet-ki-lab/Utakt](https://github.com/Akademiet-ki-lab/Utakt), `utakt.js`, nivå 1.

Kildegrunnlag: den lokale, rene utsjekkingen `/Users/54fauron/Downloads/Utakt`, commit `c20ffddfb7fff0935bb312288ee2843ab1bb89c8`. GitHub-tilkoblingen returnerte 404 under implementeringen; dette er derfor ikke en bekreftelse av siste versjon på GitHub. Det ble ikke funnet en separat lisensfil i den lokale kopien. Ingen ny lisens for Utakt-materialet er lagt til eller antatt her.

Beholdt fra nivået:

- 116 BPM og 32 takter, omtrent 66,2 sekunder.
- De 19 frasene, hvorav to demonstrasjoner og 17 spillerfangster.
- Ost på helt slag og Sokkeost et halvt slag senere.
- Treffvindu på 130 ms og de syntetiske musikk-/signaloppskriftene for nivå 1.

Tilpasninger i DinVenn:

- React Native-grensesnitt, responsiv scene, trykknapp og mellomrom i nettleser.
- Visuelle signaler, redusert bevegelse, språk og avbruddshåndtering.
- Seiersgrense på minst 14 av 17 fangster og høyst fem feiltrykk.
- Lyd generert fra kode med `python3 scripts/generate-cheese-audio.py`; ingen eksterne opptak eller `Utakt - Siste trikk.wav` brukes.
- Web Audio-klokke i nettleseren, Expo Audio på native. Lyd stoppes ved lukking, avbrudd eller bakgrunnsbytte.
- Databaseintegrasjon med femveis tilfeldig spillvalg, rundestart, minimum rundelengde og serverberegnet resultat.

Serveren vurderer rapporterte tidspunkter mot nivåets noteplan. Den kontrollerer innlogging, eierskap, revisjon, aktive tilbud, utløp, tidlig innsending og gyldige tidsverdier. Klientrapporterte trykktidspunkter er ikke bevis på menneskelig input: en automatisert eller endret klient kan lage en gyldig sekvens etter ventetiden. Spillet er ikke en egen anti-bot- eller identitetskontroll.
