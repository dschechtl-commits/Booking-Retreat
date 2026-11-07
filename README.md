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

## Starten

Vereist Node.js 18 of hoger. Er zijn geen dependencies.

```bash
npm start          # http://localhost:3000
npm test           # API-tests
```

Bij de eerste start wordt `data/db.json` aangemaakt met voorbeeldretreats.
Demo-facilitators: `eva@demo.nl`, `lotte@demo.nl` en `sanne@demo.nl`, allemaal met wachtwoord `demo1234`.

Instelbaar via omgevingsvariabelen: `PORT` en `DATA_FILE`.

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
