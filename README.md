# Retreatly – retreats in Europa & Azië

Een platform waar iedereen een retreatlocatie kan aanbieden en waar gasten retreats in Europa en Azië kunnen ontdekken en boeken.

## Functies

- **Ontdekken** – zoeken en filteren op regio (Europa/Azië), land, type (yoga, meditatie, detox, surf & yoga, …), maximale prijs en maand; sorteren op prijs, datum of populariteit.
- **Boeken** – startdatum en aantal personen kiezen, live beschikbaarheid per datum, direct bevestigd, gratis annuleren via je account.
- **Aanbieden** – elke gebruiker kan een retreat plaatsen (titel, land, plaats, beschrijving, prijs, nachten, capaciteit, inbegrepen, foto-URL, startdata), bewerken en verwijderen.
- **Account** – overzicht van je boekingen en, als host, van je aanbod met gasten, berichten en omzet.
- Accounts met veilig gehashte wachtwoorden (scrypt) en HttpOnly-sessiecookies.

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

- Online betalen (bijv. Stripe of Mollie) en bevestigingsmails
- Echte database (PostgreSQL) in plaats van het JSON-bestand
- Foto-uploads, reviews en berichten tussen gast en host
- Meertaligheid (Engels) en moderatie van nieuwe aanbiedingen
