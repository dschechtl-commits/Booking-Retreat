# NEWNEI® Events – events & retreats door NEWNEI-facilitators

Een platform waarop facilitators die de NEWNEI-opleiding hebben gevolgd hun eigen retreats, experience days, workshops, masterclasses en avondsessies kunnen organiseren, en waar deelnemers die events in Europa en Azië kunnen ontdekken en boeken.

De vormgeving heeft een natuurlijk karakter (bosgroen, mos, salie, linnen en terracotta, de lettertypes Newsreader en Figtree) en sluit aan bij de NEWNEI-familie via de gouden bol. Elk event krijgt automatisch een eigen landschapsillustratie zolang er geen foto is.

## Functies

**Voor gasten**
- **Zoeken en filteren** op regio (Europa/Azië), land, type retreat, maand, duur, maximale prijs, niveau, eten (vegetarisch, veganistisch, glutenvrij, biologisch), taal, gratis annuleren en direct boeken. Sorteren op aanbevolen, beoordeling, prijs, datum of nieuwste.
- **Retreatpagina** met overzicht, dagprogramma, docent, accommodatie met kameropties, eten, annuleringsbeleid en betaling, en reviews.
- **Reserveren met aanbetaling**: kies datum, kamer en aantal personen. Je ziet meteen het totaal, de aanbetaling en het restbedrag bij aankomst. De beschikbaarheid per datum is live.
- **Verlanglijst** (♡) om retreats te bewaren.
- **Reviews**: alleen gasten met een bevestigde boeking kunnen een review schrijven.
- **Annuleren**: de terugbetaling van de aanbetaling volgt het beleid van de retreat (flexibel 14 dagen, gemiddeld 30 dagen, strikt geen terugbetaling).

**Voor facilitators**
- Bij het plaatsen van een event vul je je NEWNEI-opleiding in en verklaar je dat je die hebt afgerond. Het event krijgt dan het label "Georganiseerd door een NEWNEI-facilitator". (Er is nog geen controle door een beheerder; zie volgende stappen.)
- Dagevents (0 nachten) en meerdaagse events, met tickets of kameropties.
- Een retreat plaatsen, bewerken en verwijderen, met kameropties en prijzen, startdata, capaciteit, aanbetalingspercentage, annuleringsbeleid, programma, docent, eten, talen en een foto-URL.
- Kiezen tussen **direct boeken** (automatisch bevestigd) en **boeken op aanvraag** (de host accepteert of wijst af; bij afwijzen krijgt de gast de aanbetaling terug).
- Een dashboard met boekingen, gastgegevens en berichten, omzet, score en openstaande aanvragen.

Betalingen zijn nog niet gekoppeld: de aanbetaling wordt berekend en getoond, maar er wordt nog niets afgerekend.

## Talen

De site is beschikbaar in het **Nederlands, Engels en Frans** (talenkiezer met vlaggen rechtsboven). De taal wordt gekozen op basis van de browser, kan via `?lang=en` worden afgedwongen en wordt onthouden.

- Alle teksten staan in `public/i18n.js`. Een taal toevoegen: code in `I18N_LANGS`/`I18N_LOCALES`, een blok in `I18N_STRINGS` en de waarden in `I18N_VALUES`. Ontbrekende teksten vallen terug op Nederlands.
- Foutmeldingen van de server worden vertaald via `lib/i18n.js` (header `X-Lang` of `Accept-Language`).
- Facilitators kunnen bij hun event optioneel een Engelse en Franse titel en beschrijving invullen.

## Niet vindbaar

De site vraagt zoekmachines en AI-crawlers om niets te indexeren: `robots.txt` (ook GPTBot, ClaudeBot, Google-Extended, CCBot e.d.), een `robots`-metatag en een `X-Robots-Tag`-header op elke response.

## Snel delen via Vercel (demo)

Voor een demo om te laten zien is [Vercel](https://vercel.com) het snelst; `vercel.json` en `api/index.js` staan klaar.

1. Ga naar vercel.com → **Add New… → Project** en importeer de GitHub-repository `Booking-Retreat`.
2. Laat alle instellingen staan zoals ze zijn. Wil je een wachtwoord? Voeg dan bij **Environment Variables** `SITE_PASSWORD` toe.
3. Klik op **Deploy**. Je krijgt een link als `https://booking-retreat.vercel.app` om te delen.

Let op: Vercel heeft geen vaste schijf. Accounts en boekingen staan tijdelijk in het geheugen en worden gewist als Vercel de functie opnieuw opstart (na een tijd zonder bezoek of na een nieuwe deploy). Bezoekers zien daarom bovenaan een demo-melding; zet `DEMO_MODE=false` om die te verbergen. Voor echt gebruik: zie Render hieronder.

## Online zetten (deelbare link, niet vindbaar)

De site draait op elke Node-host. Met [Render](https://render.com) gaat het met de meegeleverde `render.yaml`:

1. Maak een account op render.com en koppel je GitHub.
2. Kies **New → Blueprint** en selecteer de repository `Booking-Retreat`.
3. Vul bij `SITE_PASSWORD` een wachtwoord in en klik op **Apply**.
4. Na een paar minuten krijg je een link als `https://newnei-events.onrender.com`. Deel die link samen met het wachtwoord.

Bezoekers krijgen eerst een wachtwoordvenster (de gebruikersnaam maakt niet uit). Zoekmachines en AI-crawlers komen niet verder dan dat venster, en de site vraagt ze daarnaast via `robots.txt`, een metatag en een `X-Robots-Tag`-header om niets te indexeren.

Het `starter`-plan in `render.yaml` heeft een vaste schijf, zodat accounts en boekingen bewaard blijven. Op het gratis plan werkt de site ook, maar dan worden alle gegevens bij elke herstart teruggezet naar de voorbeelddata.

## Starten

Vereist Node.js 18 of hoger. Er zijn geen dependencies.

```bash
npm start          # http://localhost:3000
npm test           # API-tests
```

Bij de eerste start wordt `data/db.json` aangemaakt met voorbeeldretreats.
Demo-facilitators: `eva@demo.nl`, `lotte@demo.nl` en `sanne@demo.nl`, allemaal met wachtwoord `demo1234`.

Instelbaar via omgevingsvariabelen: `PORT`, `DATA_FILE` en `SITE_PASSWORD` (zet de hele site achter een wachtwoord).

## Structuur

```
server.js         start de server
lib/app.js        REST-API + statische bestanden
lib/store.js      JSON-bestandsopslag
lib/seed.js       landen, types en voorbeelddata
public/           front-end (HTML, CSS, vanilla JS)
test/             tests (node:test)
```

## Volgende stappen voor productie

- Controle van facilitators door een beheerder (koppeling met de lijst van afgestudeerden van de NEWNEI-opleiding)
- Echte foto's en het officiële logo

- Echte betaling van de aanbetaling (bijv. Mollie of Stripe Connect met uitbetaling aan hosts) en bevestigingsmails
- Echte database (PostgreSQL) in plaats van het JSON-bestand
- Foto-uploads en een berichtensysteem tussen gast en host
- Meertaligheid (Engels) en moderatie van nieuwe aanbiedingen
