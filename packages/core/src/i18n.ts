// Interface text only: business names and user-authored content are never translated.
export type Language = "nb" | "en";
const english: Record<string, string> = {
  Spillhjørnet: "Game corner",
  "Spill tre på rad så ofte du vil. Ingen tilbud eller rabatt brukes.":
    "Play tic-tac-toe as often as you like. No offers or discounts are used.",
  "Spill for moro skyld": "Play for fun",
  "Ny runde": "New round",
  "Lukk spillet": "Close game",
  "Vinn tre på rad for å låse opp venneprisen. Du kan prøve igjen uten kostnad.":
    "Win tic-tac-toe to unlock your offer. You can try again for free.",
  "Kunden må vinne tre på rad før QR-koden hentes. Ved tap eller uavgjort kan kunden prøve igjen.":
    "Customers must win tic-tac-toe before claiming the QR code. After a loss or draw they can try again.",
  "Du vant!": "You won!",
  "Din Venn vant denne runden": "Din Venn won this round",
  "Uavgjort – prøv igjen": "A draw – try again",
  "Din Venn tenker …": "Din Venn is thinking …",
  "Din tur – velg en rute": "Your turn – choose a square",
  "Ingen rabatt brukt. Start en ny runde og prøv igjen.":
    "No offer used. Start a new round and try again.",
  "Venneprisen er låst opp!": "Your offer is unlocked!",
  "Rute {0}: {1}": "Square {0}: {1}",
  mot: "vs",
  Du: "You",

  "Fullfør én runde tre på rad. Du trenger ikke vinne eller være rask.":
    "Complete one round of tic-tac-toe. You do not need to win or be fast.",
  "Kunden fullfører én runde tre på rad før QR-koden hentes. Seier, tap og uavgjort gir samme rabatt.":
    "The customer completes one round of tic-tac-toe before claiming the QR code. Winning, losing and drawing give the same discount.",
  "Finn lokale par": "Find local pairs",
  "Tre på rad": "Tic-tac-toe",
  "Stein, saks, papir": "Rock, paper, scissors",
  "Flipp burgerne": "Flip the burgers",
  "Skjær kebaben": "Slice the kebab",
  "SPILL OG HENT VENNEPRISEN": "PLAY AND CLAIM YOUR OFFER",
  "Velger spill …": "Choosing a game \u2026",
  "Fullfør runden. Du trenger ikke vinne eller være rask. Rabatten er den samme uansett spill.":
    "Complete the round. You do not need to win or be fast. The discount is the same for every game.",
  "Last spillrunden på nytt": "Reload game round",
  "Finn tre par. Trykk på kortene for å snu dem.":
    "Find three pairs. Tap the cards to turn them over.",
  "Snu kort {0}": "Turn card {0}",
  "Du er X. Spill én runde mot O. Seier, tap og uavgjort gir samme rabatt.":
    "You are X. Play one round against O. Winning, losing and drawing give the same discount.",
  "Rute {0}": "Square {0}",
  "Spill tre runder. Velg stein, papir eller saks.":
    "Play three rounds. Choose rock, paper or scissors.",
  "Runder: {0} / 3": "Rounds: {0} / 3",
  "Du: {0} · Datamaskinen: {1}": "You: {0} \u00b7 Computer: {1}",
  "Vend og server tre burgere. Trykk to ganger på hver burger, én handling om gangen.":
    "Flip and serve three burgers. Tap each burger twice, one action at a time.",
  "Vend burger {0}": "Flip burger {0}",
  "Server burger {0}": "Serve burger {0}",
  "Burger {0} er servert": "Burger {0} is served",
  "Skjær fem skiver og server porsjonen. Sveip over kebaben, eller bruk knappen.":
    "Cut five slices and serve the portion. Swipe across the kebab or use the button.",
  "Skiver: {0} / 5": "Slices: {0} / 5",
  "Skjær én skive": "Cut one slice",
  "Server kebaben": "Serve the kebab",
  "Plassen holdes av i opptil én time mens du spiller, så lenge tilbudet fortsatt er aktivt.":
    "Your place is held for up to one hour while you play, as long as the offer remains active.",
  "Runden er fullført!": "Round complete!",
  "Venneprisen er klar til å hentes. Trykk nedenfor for å få QR-koden.":
    "Your offer is ready to claim. Tap below to get your QR code.",
  "Hent venneprisen min": "Claim my offer",
  "Tilbake til tilbudet": "Back to the offer",
  "Spill og hent venneprisen": "Play and claim the offer",
  "Krev et spill før venneprisen hentes":
    "Require a game before claiming the offer",
  "DinVenn velger et tilfeldig spill. Fullført runde gir tilgang uansett resultat. Ingen betaling eller krav om å vinne.":
    "DinVenn chooses a random game. Completing a round unlocks the offer regardless of the result. No payment or win required.",
  "Du har allerede hentet eller brukt dette tilbudet":
    "You have already claimed or used this offer",
  "Spillrunden finnes ikke.": "The game round was not found.",
  "Spillrunden er utløpt. Start på nytt.":
    "This game round has expired. Start again.",
  "Spillet er oppdatert. Last runden på nytt.":
    "The game has changed. Reload the round.",
  "Ugyldig spilltrekk.": "Invalid move.",
  "Fullfør spillet før du henter venneprisen.":
    "Complete the game before claiming the offer.",

  "Slett min anmeldelse": "Delete my review",
  "Vil du slette anmeldelsen din?": "Delete your review?",
  "Dette kan ikke angres. Eventuelt svar fra bedriften fjernes også.":
    "This cannot be undone. Any reply from the business will also be removed.",
  "Ja, slett anmeldelsen": "Yes, delete the review",
  "Avbryt sletting": "Cancel deletion",
  "Du kan slette din egen anmeldelse. Administrator kan også moderere anmeldelser.":
    "You can delete your own review. Administrators can also moderate reviews.",
  "Du kan redigere eller slette bedriftens svar. Bare forfatteren og administrator kan slette selve anmeldelsen.":
    "You can edit or delete your business's reply. Only the author and administrators can delete the review itself.",
  "Vil du slette bedriftens svar? Kundens anmeldelse beholdes.":
    "Delete the business reply? The customer's review will be kept.",
  "Slett bedriftens svar": "Delete business reply",
  "Svaret er slettet.": "The reply has been deleted.",
  "Du kan bare slette egne anmeldelser. Administrator kan moderere alle.":
    "You can only delete your own reviews. Administrators can moderate all reviews.",
  "Du kan bare slette svar fra din egen bedrift.":
    "You can only delete replies from your own business.",

  "Lys modus": "Light mode",
  "Mørk modus": "Dark mode",
  "Min side": "My account",
  "Små fordeler. Dine favorittsteder.": "Little perks. Your favourite places.",
  "Lokal venn": "Local friend",
  "Velg din hjemby": "Choose your home town",
  "Rediger profil": "Edit profile",
  "Hjemby (valgfritt)": "Home town (optional)",
  "Lagre profilen min": "Save my profile",
  "Profilen din er oppdatert.": "Your profile has been updated.",
  "Navnet må ha mellom 1 og 80 tegn.":
    "Your name must have between 1 and 80 characters.",
  "Hjembyen kan ha maks 120 tegn.":
    "Your home town must be at most 120 characters.",
  "Profilen finnes ikke. Prøv å logge inn på nytt.":
    "Your profile was not found. Try signing in again.",
  "Dine fordeler": "Your perks",
  "Åpne favoritter": "Open favourites",
  "Åpne aktive koder": "Open active codes",
  "Aktive koder": "Active codes",
  "Mine anmeldelser": "My reviews",
  "Dine opplevelser og svar fra bedriftene":
    "Your experiences and replies from businesses",
  "Laster anmeldelsene dine …": "Loading your reviews \u2026",
  "Din første anmeldelse venter": "Your first review awaits",
  "Har du besøkt et lokalt sted? Åpne bedriftsprofilen og del opplevelsen din.":
    "Visited somewhere local? Open the business profile and share your experience.",
  "Med navn": "Named review",
  "Skjult av administrator": "Hidden by administrator",
  "Rediger anmeldelse hos {0}": "Edit review of {0}",
  "Bedriften er ikke tilgjengelig for redigering nå.":
    "This business is not available for editing right now.",
  "Hjelp og personvern": "Help and privacy",
  "Navnet ditt vises på anmeldelser du publiserer med navn. Du kan velge anonym visning per anmeldelse. Hjemby er valgfritt.":
    "Your name appears on reviews you publish with your name. You can choose anonymous display for each review. Home town is optional.",
  "Kontosletting behandles av administrator. Det er forskjellig fra å logge ut.":
    "Account deletion is handled by an administrator. It is different from signing out.",
  "Kontakt oss / rapporter et problem": "Contact us / report a problem",
  "Be om sletting av konto": "Request account deletion",
  "VELKOMMEN TIL DINVENN": "WELCOME TO DINVENN",
  "Lagre favorittene dine og hent fordeler hos de lokale.":
    "Save your favourites and claim perks at local businesses.",

  "Vis innløsningskode": "Show redemption token",
  "Skjul innløsningskode": "Hide redemption token",
  "Beskriv hva gaven eller tilbudet gjelder.": "Describe the gift or offer.",
  "Tilbudsbeskrivelsen kan ha maks 500 tegn.":
    "The offer details must be at most 500 characters.",
  "Rabattkoden må ha mellom 1 og 64 tegn uten linjeskift.":
    "The discount code must have 1 to 64 characters without line breaks.",
  "Hva får kunden i gave?": "What gift does the customer receive?",
  "Hva gjelder tilbudet?": "What does the offer include?",
  "For eksempel: Gratis flaske mineralvann ved kjøp av en lunsjrett.":
    "For example: A free bottle of sparkling water when buying a lunch dish.",
  "For eksempel: Kjøp to mineralvann og betal for én.":
    "For example: Buy two sparkling waters and pay for one.",
  "Valg av rabattkode": "Discount code option",
  "Automatisk kode": "Automatic code",
  "Egen rabattkode": "Custom discount code",
  "Koden er felles for kundene. Skann kundens unike QR-kode for å registrere innløsning og håndheve grensene.":
    "Customers share this code. Scan each customer's unique QR code to record redemption and enforce limits.",
  "Rabattkode: {0}": "Discount code: {0}",
  "Dette er bedriftens rabattkode. Vis også QR-koden slik at bedriften kan registrere engangsinnløsningen.":
    "This is the business's discount code. Show the QR code as well so the business can record your single-use redemption.",
  "Skann kundens unike QR-kode eller lim inn innløsningskoden. En felles rabattkode kan ikke brukes til å identifisere kundens innløsning.":
    "Scan the customer's unique QR code or paste their redemption token. A shared discount code cannot identify a customer's redemption.",

  "Avdelingen finnes ikke lenger, eller du mangler tilgang.":
    "The location no longer exists, or you do not have access.",
  "Avdelinger og flere adresser": "Locations and additional addresses",
  "Hovedadressen redigeres i profilen over. Legg til andre lokaler her. Avdelingene deler bedriftsprofil og tilbud.":
    "Edit the main address in the profile above. Add other locations here. Locations share the business profile and offers.",
  "Laster avdelinger …": "Loading locations \u2026",
  "Ingen ekstra avdelinger ennå.": "No additional locations yet.",
  "Rediger avdeling {0}": "Edit location {0}",
  "Slett avdeling {0}": "Delete location {0}",
  "Vil du slette avdelingen {0}? Hovedadressen og tilbudene beholdes.":
    "Delete location {0}? The main address and offers will be kept.",
  "Avdelingen er slettet.": "The location has been deleted.",
  "Legg til avdeling": "Add location",
  Avdelingsskjema: "Location form",
  "Postnummer må ha fire sifre.": "The postal code must have four digits.",
  "Avdelingen er lagret.": "The location has been saved.",
  "Rediger avdeling": "Edit location",
  "Ny avdeling": "New location",
  Avdelingsnavn: "Location name",
  Avdelingsadresse: "Location address",
  "Avdelingens postnummer": "Location postal code",
  "Avdelingens by": "Location city",
  "Lagre avdeling": "Save location",
  "Registrer bedriften først. Deretter kan du legge til flere avdelinger i bedriftsprofilen.":
    "Register your business first. You can then add more locations to the business profile.",
  "Kartpinnen er klar. Lagre for å beholde plasseringen.":
    "The map pin is ready. Save to keep the location.",
  "Adresseoppslag: Kartverket. Kontroller kartpinnen før du lagrer.":
    "Address lookup: Kartverket. Check the map pin before saving.",

  "Diskriminerende og nedsettende ord er ikke tillatt i anmeldelser eller svar.":
    "Discriminatory and derogatory words are not allowed in reviews or replies.",
  "Teksten inneholder ord eller uttrykk som ikke er tillatt. Skriv om teksten og prøv igjen.":
    "The text contains words or phrases that are not allowed. Rephrase it and try again.",
  "For bedrifter": "For businesses",
  "LOKALT ER FINT": "LOCAL IS LOVELY",
  "Velg nytt passord": "Choose a new password",
  "Flere kunder. Flere venner.": "More customers. More friends.",
  "Velkommen til bedriftsportalen. Gi folk en god grunn til å besøke nettopp dere.":
    "Welcome to the business portal. Give people a good reason to visit you.",
  "Passordet er endret. Du kan også logge inn i mobilappen.":
    "Your password has been changed. You can also sign in to the mobile app.",
  "Sjekk e-posten din for å bekrefte kontoen. Deretter kan du logge inn.":
    "Check your email to confirm your account. You can then sign in.",
  "Hvis kontoen finnes, får du en lenke på e-post.":
    "If the account exists, you will receive a link by email.",
  "Navnet ditt": "Your name",
  "E-post": "Email",
  "Passord (minst 8 tegn)": "Password (at least 8 characters)",
  "Lagre passord": "Save password",
  "Logg inn": "Sign in",
  "Opprett konto": "Create account",
  "Send tilbakestillingslenke": "Send reset link",
  "Til innlogging": "Back to sign in",
  "Ny her? Opprett konto": "New here? Create an account",
  "Glemt passord?": "Forgot password?",
  Bedriftsprofil: "Business profile",
  "La oss bli kjent med bedriften": "Let's get to know your business",
  "Nye bedrifter blir synlige når DinVenn har godkjent profilen.":
    "New businesses become visible once DinVenn has approved their profile.",
  "Skriv bedriftens navn.": "Enter your business name.",
  Bedriftsnavn: "Business name",
  By: "City",
  Adresse: "Address",
  Postnummer: "Postal code",
  Telefon: "Phone",
  Nettside: "Website",
  Kategori: "Category",
  "Velg kategori": "Choose category",
  "Om bedriften": "About the business",
  "Bedriftens forsidebilde": "Business cover image",
  "Forsidebilde (JPG, PNG eller WebP, maks 5 MB)":
    "Cover image (JPG, PNG or WebP, max 5 MB)",
  "Laster kart …": "Loading map …",
  "Lagre profil": "Save profile",
  "Send til godkjenning": "Submit for approval",
  "Rediger vennepris": "Edit offer",
  "En ny grunn til å komme innom": "A new reason to stop by",
  Tittel: "Title",
  Beskrivelse: "Description",
  "Type rabatt": "Discount type",
  Prosent: "Percentage",
  Kroner: "Norwegian kroner",
  "Gratis gave": "Free gift",
  "Annet / 2 for 1": "Other / 2 for 1",
  Rabatt: "Discount",
  "Starter (lokal tid)": "Starts (local time)",
  "Slutter (valgfritt)": "Ends (optional)",
  "Totalt antall innløsninger (tomt = ubegrenset)":
    "Total redemptions (blank = unlimited)",
  "Maks per bruker": "Maximum per user",
  Vilkår: "Terms",
  Tilbudsbilde: "Offer image",
  "Tilbudsbilde (maks 5 MB)": "Offer image (max 5 MB)",
  Status: "Status",
  Utkast: "Draft",
  Publisert: "Published",
  Pauset: "Paused",
  Utløpt: "Expired",
  "Tilbudet blir ikke synlig for brukere før bedriften er godkjent.":
    "The offer will become visible once the business is approved.",
  "Lagre vennepris": "Save offer",
  Avbryt: "Cancel",
  FORHÅNDSVISNING: "PREVIEW",
  "En gave til deg": "A gift for you",
  Vennepris: "Local offer",
  "Din neste vennepris": "Your next offer",
  "Et godt tilbud fra et lokalt sted.": "A great offer from a local business.",
  "Vilkårene dine vises her.": "Your terms will appear here.",
  "FOR LOKALE BEDRIFTER": "FOR LOCAL BUSINESSES",
  "Logg ut": "Sign out",
  Lukk: "Close",
  "Lukk bekreftelse": "Dismiss confirmation",
  "Jobber …": "Working …",
  "DINVENN PILOT": "DinVenn PILOT",
  "En liten portal.": "A small portal.",
  "En stor forskjell lokalt.": "A big difference locally.",
  "Appen er klar for tilkobling til Supabase. Kopier":
    "The app is ready to connect to Supabase. Copy",
  til: "to",
  "og fyll inn prosjektets URL og offentlige nøkkel.":
    "and enter the project's URL and public key.",
  "Se README for databaseoppsett og testkontoer.":
    "See README for database setup and test accounts.",
  "Laster innlogging …": "Loading sign in …",
  "Passordet er oppdatert.": "Your password has been updated.",
  "HEI,": "HELLO,",
  "Din bedrift": "Your business",
  "Ingen bedrifter ennå": "No businesses yet",
  Oversikt: "Overview",
  Vennepriser: "Local offers",
  Arrangementer: "Events",
  Nyheter: "News",
  "Løs inn kode": "Redeem code",
  Abonnement: "Subscription",
  "Registrer bedrift": "Register business",
  Godkjenning: "Approval",
  "Oppdater data": "Refresh data",
  "DITT LOKALE HJØRNE": "YOUR LOCAL CORNER",
  "Venter på godkjenning": "Awaiting approval",
  Godkjent: "Approved",
  Suspendert: "Suspended",
  "Bedriften er sendt til godkjenning.":
    "The business has been submitted for approval.",
  Bedriftsgodkjenning: "Business approval",
  "Ingen bedrifter ennå.": "No businesses yet.",
  "Bedriftsstatus oppdatert.": "Business status updated.",
  Godkjenn: "Approve",
  Suspender: "Suspend",
  "Arrangementet er lagret.": "Event saved.",
  "Nyheten er lagret.": "News saved.",
  "Profilen er lagret.": "Profile saved.",
  "Venneprisen er lagret.": "Offer saved.",
  "Venneprisene dine": "Your offers",
  "+ Ny vennepris": "+ New offer",
  "Lag din første vennepris og gi folk en grunn til å komme innom.":
    "Create your first offer and give people a reason to stop by.",
  innløst: "redeemed",
  Rediger: "Edit",
  Pause: "Pause",
  Publiser: "Publish",
  "VELKOMMEN INNOM": "WELCOME IN",
  "Gjør en kode til et besøk": "Turn a code into a visit",
  "Skann kundens QR-kode eller lim inn koden. Kontroller koden og trykk «Bekreft innløsning».":
    "Scan the customer's QR code or paste the code. Check it and press “Confirm redemption”.",
  "Stopp kamera": "Stop camera",
  "Åpne QR-skanner": "Open QR scanner",
  "Kunne ikke åpne kamera. Bruk HTTPS eller localhost, gi kameratilgang, eller lim inn kode. ":
    "Could not open the camera. Use HTTPS or localhost, allow camera access, or paste the code. ",
  "Kundens kode": "Customer's code",
  "Bekreft innløsning": "Confirm redemption",
  "DinVenn ♥ Heia de lokale.": "DinVenn ♥ Support your locals.",
  "Ingen sluttdato": "No end date",
  Gratis: "Free",
  "Skriv en tittel.": "Enter a title.",
  "Beskriv arrangementet.": "Describe the event.",
  "Skriv nyhetsteksten.": "Enter the news text.",
  "Velg gyldig starttid. Slutt må være etter start.":
    "Choose a valid start time. The end must be after the start.",
  Nytt: "New",
  Ny: "New",
  "← Tilbake": "← Back",
  "F.eks. møt den nye lunsjmenyen": "For example, meet our new lunch menu",
  Nyhetstekst: "News text",
  "Hva skjer, og hvem passer det for?": "What's happening, and who is it for?",
  "Fortell om nye retter, nye åpningstider eller andre oppdateringer.":
    "Share new dishes, opening hours or other updates.",
  Pris: "Price",
  "Billettlenke (valgfritt)": "Ticket link (optional)",
  "Bilde (JPG, PNG eller WebP, maks 5 MB)":
    "Image (JPG, PNG or WebP, max 5 MB)",
  "Valgt bilde:": "Selected image:",
  "Innholdet blir synlig først når bedriften er godkjent.":
    "Content becomes visible once the business is approved.",
  "Lagre og publiser": "Save and publish",
  "Lagre ": "Save ",
  Innholdsbilde: "Content image",
  "Ditt neste arrangement": "Your next event",
  "En nyhet fra dere": "Your latest news",
  "Teksten du skriver vises her.": "Your text will appear here.",
  "Velg tidspunkt": "Choose a time",
  "Innholdet lagres i bedriftens felles database. Dette er en forhåndsvisning av teksten og bildet.":
    "Content is saved in your business database. This is a preview of the text and image.",
  "Gi folk noe å glede seg til.": "Give people something to look forward to.",
  "Små oppdateringer som holder kundene nær.":
    "Small updates that keep customers close.",
  "Nytt arrangement": "New event",
  "Ny nyhet": "New news post",
  "Søk i arrangementer": "Search events",
  "Søk i nyheter": "Search news",
  "Søk etter tittel eller tekst …": "Search by title or text …",
  "Vis status": "Show status",
  Alle: "All",
  "Ingen treff": "No results",
  "Inviter til noe hyggelig": "Invite people to something special",
  "Hva er nytt hos dere?": "What's new with you?",
  "Prøv et annet søk eller statusfilter.":
    "Try another search or status filter.",
  "En workshop, en konsert eller en kveld litt utenom det vanlige.":
    "A workshop, a concert or an evening out of the ordinary.",
  "Del en ny rett, oppdaterte priser eller en liten historie fra bedriften.":
    "Share a new dish, updated prices or a story from your business.",
  Prøveperiode: "Trial",
  Aktivt: "Active",
  Avsluttet: "Cancelled",
  Forfalt: "Past due",
  "Ikke aktivt": "Inactive",
  "Ikke opprettet": "Not created",
  "VOKS SAMMEN MED OSS": "GROW WITH US",
  "Små bedrifter.": "Small businesses.",
  "Store muligheter.": "Big opportunities.",
  "DinVenn skal gjøre det enkelt å bli oppdaget, få besøk og bygge et lokalt fellesskap.":
    "DinVenn makes it easy to get discovered, welcome visitors and build a local community.",
  "REGISTRERT ABONNEMENT": "REGISTERED SUBSCRIPTION",
  Pluss: "Plus",
  Basis: "Basic",
  "Ingen abonnement registrert": "No subscription registered",
  Pilot: "Pilot",
  "Prisene og pakkene under er forslag. Betaling er ikke åpnet, og du blir ikke belastet. Funksjonsgrenser er ikke aktivert i piloten.":
    "The prices and packages below are suggestions. Payments are not available and you will not be charged. Feature limits are not enabled in the pilot.",
  "Et godt sted å begynne": "A great place to start",
  "Bedriftsprofil med bilder": "Business profile with images",
  "Arrangementer og nyheter": "Events and news",
  "QR-innløsning": "QR redemption",
  "Mer plass til å vokse": "More room to grow",
  "Alt i Basis": "Everything in Basic",
  "kr / måned": "NOK / month",
  "Prisforslag · avgiftsbehandling fastsettes før salg":
    "Suggested price · tax treatment to be determined before sale",
  "Kommer senere": "Coming later",
  "Ingen betaling i piloten": "No payments in the pilot",
  "Du kan teste publisering og innløsning nå. Endelige priser, vilkår og en betalingsløsning settes opp før betalte abonnementer åpnes.":
    "You can test publishing and redemption now. Final prices, terms and a payment solution will be set up before paid subscriptions launch.",
  "Aktive vennepriser": "Active offers",
  "Tilbud som gjelder akkurat nå": "Offers available right now",
  "Hentede koder": "Claimed codes",
  "Alle hentinger hos dere": "All codes claimed at your business",
  "Innløst i butikk": "Redeemed in store",
  "Bekreftede besøk, totalt": "Total confirmed visits",
  "Kommende arrangementer": "Upcoming events",
  "Publisert og klar til å deles": "Published and ready to share",
  "HEIA DE LOKALE": "SUPPORT YOUR LOCALS",
  "Gode tilbud. Nye bekjentskaper.": "Great offers. New connections.",
  "Her er det som skjer hos dere. Gjør neste besøk til starten på noe fint.":
    "Here's what's happening at your business. Make the next visit the start of something good.",
  "Et lite overblikk over tilbudene deres.": "A quick overview of your offers.",
  "Se alle →": "See all →",
  "Den første venneprisen venter": "Your first offer awaits",
  "Inviter noen innom med et godt tilbud.":
    "Invite someone in with a great offer.",
  "Lag en vennepris": "Create an offer",
  Tilbud: "Offer",
  Slutter: "Ends",
  Innløst: "Redeemed",
  Handling: "Action",
  Innløsninger: "Redemptions",
  "Siste 7 dager · norsk tid": "Last 7 days · Norwegian time",
  "Her vokser grafen når kundene bruker venneprisene deres.":
    "This chart grows as customers redeem your offers.",
  "NOE Å GLEDE SEG TIL": "SOMETHING TO LOOK FORWARD TO",
  "Skap et møtepunkt. Inviter til en workshop, et marked eller en hyggelig kveld.":
    "Bring people together. Invite them to a workshop, a market or a lovely evening.",
  "Lag et arrangement": "Create an event",
  "DET SISTE FRA DERE": "YOUR LATEST UPDATES",
  "Nyheter og oppdateringer": "News and updates",
  "En ny rett på menyen? Nye priser? Del det med kundene deres.":
    "A new dish on the menu? New prices? Share them with your customers.",
  "Skriv en nyhet": "Write a news post",
  "Siste innløsninger": "Recent redemptions",
  "Små koder som blir til lokale besøk.":
    "Small codes that turn into local visits.",
  totalt: "total",
  "Besøkene deres dukker opp her når en kode løses inn.":
    "Visits appear here when a code is redeemed.",
  "Bedriftens kartpinne": "Business map pin",
  "Adresseoppslaget feilet": "Address lookup failed",
  "FINN RIKTIG INNGANG": "FIND THE RIGHT ENTRANCE",
  "Plassering på kart": "Map location",
  "Skriv gateadresse og by eller postnummer. Sjekk at pinnen står riktig, og dra den eller trykk i kartet for å flytte den.":
    "Enter a street address and city or postal code. Check the pin, then drag it or tap the map to move it.",
  "Kart for bedriftsadressen": "Business address map",
  "Søker etter adressen …": "Looking up the address …",
  "Kartpinnen er klar. Lagre profilen for å beholde plasseringen.":
    "The map pin is ready. Save the profile to keep this location.",
  "Fant ingen entydig adresse. Kontroller adressen, eller plasser pinnen selv i kartet.":
    "No unique address found. Check the address or place the pin yourself.",
  "Adresseoppslaget svarte ikke. Prøv igjen, eller plasser pinnen selv.":
    "The address lookup did not respond. Try again or place the pin yourself.",
  "Fyll inn gateadresse og by eller postnummer for å finne stedet.":
    "Enter a street address and city or postal code to find the location.",
  Kartkoordinater: "Map coordinates",
  "Ingen kartpinne er valgt ennå.": "No map pin selected yet.",
  "Søk opp adressen på nytt": "Look up the address again",
  "Plasser pinnen midt i kartet": "Place the pin in the centre of the map",
  "Kartbakgrunnen kunne ikke lastes helt. Sjekk nettet før du kontrollerer plasseringen.":
    "The map background could not fully load. Check your connection before confirming the location.",
  "Adresseoppslag: Kartverket. Lagret pinne brukes også i mobilappen.":
    "Address lookup: Kartverket. The saved pin is also used in the mobile app.",
  Utforsk: "Explore",
  Meg: "Me",
  "Logg inn for å lagre favoritter og hente vennepriser.":
    "Sign in to save favourites and claim offers.",
  Kart: "Map",
  "Lukk melding": "Dismiss message",
  Jobber: "Working",
  "Gode steder.": "Great places.",
  "Fine vennepriser.": "Lovely local offers.",
  "Appen trenger Supabase-tilkobling. Kopier apps/mobile/.env.example til .env og fyll inn URL og offentlig nøkkel. Se README.":
    "The app needs a Supabase connection. Copy apps/mobile/.env.example to .env and enter the URL and public key. See README.",
  "Bli en lokal venn": "Become a local friend",
  "Favorittene og kodene dine følger kontoen din.":
    "Your favourites and codes stay with your account.",
  Favoritter: "Favourites",
  "Mine koder": "My codes",
  "Dine koder": "Your codes",
  "Skriv e-postadressen din.": "Enter your email address.",
  "Skriv navn og et passord på minst 8 tegn.":
    "Enter your name and a password of at least 8 characters.",
  "Sett EXPO_PUBLIC_PORTAL_URL for e-postbekreftelse.":
    "Set EXPO_PUBLIC_PORTAL_URL for email confirmation.",
  "Sjekk e-posten og bekreft kontoen. Deretter kan du logge inn her.":
    "Check your email and confirm your account. You can then sign in here.",
  "Sett EXPO_PUBLIC_PORTAL_URL for passordtilbakestilling.":
    "Set EXPO_PUBLIC_PORTAL_URL for password reset.",
  "Hvis kontoen finnes, får du en e-post. Velg nytt passord i nettleseren, og logg deretter inn her.":
    "If the account exists, you will receive an email. Choose a new password in your browser, then sign in here.",
  "Opprett en konto": "Create an account",
  "KLAR TIL NESTE BESØK": "READY FOR YOUR NEXT VISIT",
  "Dine vennepriser": "Your offers",
  "Vis en kode i kassen. Hver innløsning gjør en forskjell lokalt.":
    "Show a code at checkout. Every redemption makes a difference locally.",
  "Logg inn for å se kodene dine": "Sign in to see your codes",
  "Du har ikke hentet noen koder ennå. Finn en vennepris under Utforsk.":
    "You haven't claimed any codes yet. Find an offer under Explore.",
  "Hentet vennepris": "Claimed offer",
  "Gyldig til": "Valid until",
  "Logg inn for å se favorittene dine": "Sign in to see your favourites",
  Oppdater: "Refresh",
  "DIN VENNEPRIS": "YOUR LOCAL OFFER",
  "En fordel hos en lokal venn": "A little perk from a local friend",
  "Klar til bruk": "Ready to use",
  "Vis QR-koden til bedriften. Den kan bare brukes én gang.":
    "Show the QR code to the business. It can only be used once.",
  "minutter igjen": "minutes left",
  "Oppdater status": "Refresh status",
  "Takk for at du velger lokalt! Koden er brukt.":
    "Thanks for choosing local! The code has been used.",
  "Denne koden kan ikke brukes lenger.": "This code can no longer be used.",
  "Ingen ekstra vilkår oppgitt.": "No additional terms provided.",
  Maks: "Maximum",
  "per bruker.": "per user.",
  "Ingen fast sluttdato.": "No fixed end date.",
  "Hent vennepris": "Claim offer",
  "♥ Fjern fra favoritter": "♥ Remove from favourites",
  "♡ Lagre favoritt": "♡ Save favourite",
  "· Les mer →": "· Read more →",
  "Velg din by": "Choose your city",
  "Åpne kart": "Open map",
  "Stedene og tilbudene\ndu vil tilbake til.":
    "The places and offers\nyou'll come back to.",
  "Små steder.\nGode opplevelser.": "Small places.\nGreat experiences.",
  "Alle hjertene dine, samlet på ett sted.":
    "All your favourites in one place.",
  "Oppdag vennepriser og det som skjer hos de lokale.":
    "Discover local offers and what's happening nearby.",
  "Søk etter tilbud, bedrift eller arrangement":
    "Search offers, businesses or events",
  "Tøm søk": "Clear search",
  Tøm: "Clear",
  "Alle byer": "All cities",
  "EN LITEN FORDEL. ET LOKALT BESØK.": "A LITTLE PERK. A LOCAL VISIT.",
  "Godt for deg.\nFint for byen.": "Good for you.\nGreat for your town.",
  "Velg lokalt neste gang du skal ut.": "Choose local next time you go out.",
  "Lagrede vennepriser": "Saved offers",
  "Vennepriser nå": "Offers right now",
  "Ingen lagrede tilbud her ennå": "No saved offers here yet",
  "Ingen vennepriser akkurat nå": "No offers right now",
  "Prøv en annen by eller kategori": "Try another city or category",
  "Lagrede arrangementer": "Saved events",
  "Hva skjer?": "What's on?",
  "Lagre et arrangement for å finne det igjen her.":
    "Save an event to find it here later.",
  "Ingen publiserte arrangementer passer filtrene akkurat nå.":
    "No published events match your filters right now.",
  "Nytt fra de lokale": "Local news",
  "Oppdateringer fra bedriftene dukker opp her.":
    "Business updates will appear here.",
  "Lagrede bedrifter": "Saved businesses",
  "Bli kjent med de lokale": "Meet your locals",
  "Se kart": "See map",
  "Du har ingen lagrede bedrifter som passer filtrene.":
    "No saved businesses match your filters.",
  "Ingen bedrifter passer søket.": "No businesses match your search.",
  "Sted er ikke oppgitt": "No location provided",
  "♡ Lagre arrangement": "♡ Save event",
  "Billetter / mer informasjon ↗": "Tickets / more information ↗",
  Om: "About",
  "Lagret som favoritt": "Saved to favourites",
  "Lagre dette stedet": "Save this place",
  "Vennepriser hos oss": "Our offers",
  "Se venneprisen →": "See offer →",
  Kommende: "Upcoming",
  "Nyheter fra oss": "Our news",
  Praktisk: "Useful information",
  "Adresse er ikke oppgitt": "No address provided",
  "Telefon:": "Phone:",
  "E-post:": "Email:",
  "Vis på kartet": "Show on map",
  "Åpne veibeskrivelse": "Get directions",
  "Besøk nettsiden ↗": "Visit website ↗",
  "Adresseoppslaget svarte ikke.": "The address lookup did not respond.",
  "FINN ET LOKALT STED": "FIND A LOCAL PLACE",
  "Rett rundt hjørnet": "Just around the corner",
  "Vis kart": "Show map",
  "Vis liste": "Show list",
  "Søk på kartet": "Search the map",
  "Bedrift eller gate …": "Business or street …",
  "lokale steder": "local places",
  "Se bedrift og vennepriser →": "See business and offers →",
  "Ingen bedrifter passer filtrene.": "No businesses match your filters.",
  "Kart over lokale bedrifter": "Map of local businesses",
  "Vis alle bedriftsmarkører": "Show all business markers",
  "Finner bedriftenes adresser …": "Finding business addresses …",
  "Ingen sikre kartplasseringer ennå": "No confirmed map locations yet",
  "Åpne listen for å se bedriftene, eller prøv adresseoppslaget igjen.":
    "Open the list to see businesses, or try the address lookup again.",
  "Prøv en annen by, kategori eller et annet søk.":
    "Try another city, category or search.",
  "Se bedriftene som liste →": "See businesses as a list →",
  vennepriser: "offers",
  "Se bedrift": "See business",
  "ikke plasseres sikkert.": "could not be located reliably.",
  "Prøv igjen": "Try again",
  "Se alle steder i listen →": "See all places in the list →",
  "Adresseoppslag: Kartverket · Kartet viser bedrifter, ikke din posisjon.":
    "Address lookup: Kartverket · The map shows businesses, not your location.",
  "Ingen fast sluttdato": "No fixed end date",
  "Supabase er ikke konfigurert. Følg oppstartsguiden i README.":
    "Supabase is not configured. Follow the setup guide in README.",
  "Fant ingen data.": "No data found.",
  "Noe gikk galt. Prøv igjen.": "Something went wrong. Try again.",
  "Feil e-post eller passord.": "Incorrect email or password.",
  "Bekreft e-postadressen din før du logger inn.":
    "Confirm your email address before signing in.",
  "Kunne ikke kontakte tjenesten. Sjekk nettet og prøv igjen.":
    "Could not contact the service. Check your connection and try again.",
  "Tjenesten er ikke ferdig satt opp ennå. Prøv igjen senere.":
    "The service is not ready yet. Try again later.",
  "Velg gyldig starttid.": "Choose a valid start time.",
  "Slutt må være etter start.": "The end must be after the start.",
  "Innløsningsgrenser må være positive heltall.":
    "Redemption limits must be positive whole numbers.",
  "Oppgi en positiv rabatt.": "Enter a positive discount.",
  "Prosent kan ikke være over 100.": "Percentage cannot exceed 100.",
  "Bruk JPG, PNG eller WebP under 5 MB.": "Use JPG, PNG or WebP under 5 MB.",
  "Mat & Drikke": "Food & Drink",
  Shopping: "Shopping",
  Aktiviteter: "Activities",
  Kultur: "Culture",
  Skjønnhet: "Beauty",
  Trening: "Fitness",
  Innstillinger: "Settings",
  Språk: "Language",
  "Du må være logget inn": "You must be signed in",
  "Tilbudet er ikke tilgjengelig": "This offer is not available",
  "Du har allerede brukt dette tilbudet": "You have already used this offer",
  "Tilbudet er utsolgt": "This offer is sold out",
  "Ugyldig kode": "Invalid code",
  "Bedriften er ikke godkjent": "The business is not approved",
  "Ikke tilgang": "Access denied",
  "Koden er allerede brukt": "This code has already been used",
  "Koden er utløpt": "This code has expired",
  "Tilbudet er ikke aktivt": "This offer is not active",
  "Tilbudet gjelder ikke akkurat nå": "This offer is not valid right now",
};
Object.assign(english, {
  "Forslag: 2 aktive vennepriser": "Suggested: 2 active offers",
  "Forslag: ubegrenset antall vennepriser": "Suggested: unlimited offers",
  "Forslag: fremhevet plassering": "Suggested: featured placement",
  "Forslag: utvidet statistikk": "Suggested: advanced statistics",
  "FOR DEG SOM VIL MER": "FOR THOSE WHO WANT MORE",
  "DIN LOKALE START": "YOUR LOCAL START",
  "adresse kunne": "address",
  "adresser kunne": "addresses",
  ", eller lagre et hjerte under Utforsk.":
    ", or save a favourite under Explore.",
  Passord: "Password",
  Navn: "Name",
  VENN: "FRIEND",
  "Hei, {0}!": "Hi, {0}!",
  "HEI, {0}!": "HELLO, {0}!",
  "Veibeskrivelse til {0}": "Directions to {0}",
  "Fjern {0} fra favoritter": "Remove {0} from favourites",
  "Lagre {0}": "Save {0}",
  "Til {0}.": "Until {0}.",
  "Om {0} →": "About {0} →",
  "Rediger {0}": "Edit {0}",
  "Innløsninger siste 7 dager: {0}": "Redemptions in the last 7 days: {0}",
  "Publiseringsdato: {0}": "Published: {0}",
  " · Periode til {0}": " · Period ends {0}",
  "Innløsning bekreftet: {0}.": "Redemption confirmed: {0}.",
  "{0} min igjen": "{0} min left",
  "{0} t {1} min igjen": "{0} h {1} min left",
  "{0} dager igjen": "{0} days left",
});
Object.assign(english, {
  "Billettlenken må starte med https:// eller http://.":
    "The ticket link must start with https:// or http://.",
  "SAMLE FOLK": "BRING PEOPLE TOGETHER",
  "HOLD KONTAKTEN": "STAY IN TOUCH",
  "Sted / adresse": "Location / address",
  "Gratis / 150 kr": "Free / NOK 150",
  "LOKALT NYTT": "LOCAL NEWS",
  "DINE LOKALE FAVORITTER": "YOUR LOCAL FAVOURITES",
  "DETTE SKJER": "WHAT’S ON",
  "NYTT FRA DE LOKALE": "LOCAL UPDATES",
  "ET LOKALT STED": "A LOCAL PLACE",
});
Object.assign(english, {
  Utseende: "Appearance",
  "Bytt til mørk modus": "Switch to dark mode",
  "Bytt til lys modus": "Switch to light mode",
});
Object.assign(english, {
  Slett: "Delete",
  "Slett {0}": "Delete {0}",
  "Vil du slette «{0}»? Dette kan ikke angres.":
    "Delete ‘{0}’? This cannot be undone.",
  "Vil du slette venneprisen «{0}»? Tilhørende koder og innløsningshistorikk slettes også. Dette kan ikke angres.":
    "Delete the offer ‘{0}’? Associated codes and redemption history will also be deleted. This cannot be undone.",
  "Arrangementet er slettet.": "Event deleted.",
  "Nyheten er slettet.": "News post deleted.",
  "Venneprisen er slettet.": "Offer deleted.",
});
Object.assign(english, {
  Anmeldelser: "Reviews",
  anmeldelser: "reviews",
  Anmeldelse: "Review",
  Anonym: "Anonymous",
  Bruker: "User",
  "Din anmeldelse": "Your review",
  "Skriv en anmeldelse": "Write a review",
  "Rediger anmeldelsen din": "Edit your review",
  "Svar fra bedriften": "Business reply",
  "{0} stjerner": "{0} stars",
  "Fortell om opplevelsen din …": "Tell us about your experience …",
  "Vis anmeldelsen anonymt": "Post anonymously",
  "Bare administrator kan slette anmeldelser.":
    "Only an administrator can delete reviews.",
  "Lagre anmeldelse": "Save review",
  "Logg inn for å skrive anmeldelse": "Sign in to write a review",
  "Anmeldelsen er lagret.": "Review saved.",
  "Ingen anmeldelser ennå.": "No reviews yet.",
  "Moderering av anmeldelser": "Review moderation",
  "Bare bedriften kan svare. Bare administrator kan slette anmeldelser.":
    "Only the business can reply. Only an administrator can delete reviews.",
  "Laster anmeldelser …": "Loading reviews …",
  "Laster …": "Loading …",
  "Bedriftens svar": "Business reply",
  "Svar på anmeldelse fra {0}": "Reply to review by {0}",
  "Lagre svar": "Save reply",
  "Svaret er lagret.": "Reply saved.",
  "Vil du slette anmeldelsen? Dette kan ikke angres.":
    "Delete this review? This cannot be undone.",
  "Slett anmeldelse": "Delete review",
  "Anmeldelsen er slettet.": "Review deleted.",
  Organisasjonsnummer: "Organisation number",
  "Mangler organisasjonsnummer": "Organisation number missing",
  "Kun synlig for bedriften og administrator. Endring krever ny godkjenning.":
    "Visible only to the business and administrator. Changes require approval again.",
  "Organisasjonsnummer må ha ni sifre.":
    "The organisation number must contain nine digits.",
  "Organisasjonsnummer må fylles inn før godkjenning.":
    "An organisation number is required before approval.",
  "Velg mellom én og fem stjerner.": "Choose between one and five stars.",
  "Anmeldelsen kan ha maks 1000 tegn.":
    "Reviews can contain up to 1000 characters.",
  "Svaret må ha mellom 1 og 1000 tegn.":
    "Replies must contain between 1 and 1000 characters.",
  "Kun administrator kan slette anmeldelser.":
    "Only an administrator can delete reviews.",
  "Anmeldelsen finnes ikke lenger.": "This review no longer exists.",
});
Object.assign(english, {
  "* Påkrevde felt": "* Required fields",
  "Fyll ut alle påkrevde felt.": "Please fill in all required fields.",
});
let language: Language = "nb";
const listeners = new Set<() => void>();
export function getLanguage() {
  return language;
}
export function setLanguage(next: Language) {
  if (next === language) return;
  language = next;
  listeners.forEach((listener) => listener());
}
export function subscribeLanguage(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
export function locale() {
  return language === "en" ? "en-GB" : "nb-NO";
}
export function t(text: string, ...values: (string | number)[]): string {
  const translated = language === "en" ? (english[text] ?? text) : text;
  return translated.replace(/\{(\d+)\}/g, (match, index) =>
    String(values[Number(index)] ?? match),
  );
}
