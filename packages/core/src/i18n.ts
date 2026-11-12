// Interface text only: business names and user-authored content are never translated.
export type Language = "nb" | "en";
const english: Record<string, string> = {
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
