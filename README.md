# Retreatly – retreats in Europa & Azië

Een platform waar iedereen een retreatlocatie kan aanbieden en waar gasten retreats in Europa en Azië kunnen ontdekken en boeken.

## Functies

**Voor gasten**
- **Zoeken en filteren** op regio (Europa/Azië), land, type retreat, maand, duur, maximale prijs, niveau, eten (vegetarisch, veganistisch, glutenvrij, biologisch), taal, gratis annuleren en direct boeken. Sorteren op aanbevolen, beoordeling, prijs, datum of nieuwste.
- **Retreatpagina** met overzicht, dagprogramma, docent, accommodatie met kameropties, eten, annuleringsbeleid en betaling, en reviews.
- **Reserveren met aanbetaling**: kies datum, kamer en aantal personen. Je ziet meteen het totaal, de aanbetaling en het restbedrag bij aankomst. De beschikbaarheid per datum is live.
- **Verlanglijst** (♡) om retreats te bewaren.
- **Reviews**: alleen gasten met een bevestigde boeking kunnen een review schrijven.
- **Annuleren**: de terugbetaling van de aanbetaling volgt het beleid van de retreat (flexibel 14 dagen, gemiddeld 30 dagen, strikt geen terugbetaling).

**Voor hosts (iedereen kan aanbieden)**
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
Demo-host: `ana@demo.nl` / `demo1234` (ook `made@demo.nl`, `sofia@demo.nl`).

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

- Echte betaling van de aanbetaling (bijv. Mollie of Stripe Connect met uitbetaling aan hosts) en bevestigingsmails
- Echte database (PostgreSQL) in plaats van het JSON-bestand
- Foto-uploads en een berichtensysteem tussen gast en host
- Meertaligheid (Engels) en moderatie van nieuwe aanbiedingen
