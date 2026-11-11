'use strict';
// Vertaling van servermeldingen. De Nederlandse tekst is de sleutel; {n} e.d. worden ingevuld.
const LANGS = ['nl', 'en', 'fr'];

const MESSAGES = {
  'Verzoek te groot': { en: 'Request too large', fr: 'Requête trop volumineuse' },
  'Ongeldige JSON': { en: 'Invalid JSON', fr: 'JSON non valide' },
  'Log eerst in': { en: 'Please log in first', fr: 'Veuillez d’abord vous connecter' },
  'Event niet gevonden': { en: 'Event not found', fr: 'Événement introuvable' },
  'Titel moet minstens 5 tekens zijn': { en: 'Title must be at least 5 characters', fr: 'Le titre doit comporter au moins 5 caractères' },
  'Kies een geldig type event': { en: 'Choose a valid event type', fr: 'Choisissez un type d’événement valide' },
  'Kies Europa of Azië': { en: 'Choose Europe or Asia', fr: 'Choisissez l’Europe ou l’Asie' },
  'Kies een land binnen de regio': { en: 'Choose a country within the region', fr: 'Choisissez un pays de la région' },
  'Plaats is verplicht': { en: 'City is required', fr: 'La ville est obligatoire' },
  'Beschrijving moet minstens 30 tekens zijn': { en: 'Description must be at least 30 characters', fr: 'La description doit comporter au moins 30 caractères' },
  'Voeg minstens één ticket- of kameroptie met prijs toe': { en: 'Add at least one ticket or room option with a price', fr: 'Ajoutez au moins une option de billet ou de chambre avec un prix' },
  'Elke optie heeft een naam en een prijs tussen €1 en €50.000 nodig': { en: 'Each option needs a name and a price between €1 and €50,000', fr: 'Chaque option doit avoir un nom et un prix entre 1 € et 50 000 €' },
  'Aantal nachten moet tussen 0 (dagevent) en 90 liggen': { en: 'Number of nights must be between 0 (day event) and 90', fr: 'Le nombre de nuits doit être compris entre 0 (événement d’une journée) et 90' },
  'Bevestig dat je een NEWNEI-opleiding hebt afgerond': { en: 'Confirm that you have completed a NEWNEI training', fr: 'Confirmez que vous avez suivi une formation NEWNEI' },
  'Vul je NEWNEI-opleiding of certificering in': { en: 'Enter your NEWNEI training or certification', fr: 'Indiquez votre formation ou certification NEWNEI' },
  'Capaciteit moet tussen 1 en 200 liggen': { en: 'Capacity must be between 1 and 200', fr: 'La capacité doit être comprise entre 1 et 200' },
  'Aanbetaling moet tussen 0% en 100% liggen': { en: 'Deposit must be between 0% and 100%', fr: 'L’acompte doit être compris entre 0 % et 100 %' },
  'Kies een annuleringsbeleid': { en: 'Choose a cancellation policy', fr: 'Choisissez une politique d’annulation' },
  'Kies een niveau': { en: 'Choose a level', fr: 'Choisissez un niveau' },
  'Kies minstens één taal': { en: 'Choose at least one language', fr: 'Choisissez au moins une langue' },
  'Afbeelding moet een https-URL zijn': { en: 'Image must be an https URL', fr: 'L’image doit être une URL https' },
  'Voeg minstens één toekomstige startdatum toe': { en: 'Add at least one future start date', fr: 'Ajoutez au moins une date de début future' },
  'Vul je naam in': { en: 'Please enter your name', fr: 'Veuillez indiquer votre nom' },
  'Ongeldig e-mailadres': { en: 'Invalid email address', fr: 'Adresse e-mail non valide' },
  'Wachtwoord moet minstens 8 tekens zijn': { en: 'Password must be at least 8 characters', fr: 'Le mot de passe doit comporter au moins 8 caractères' },
  'Dit e-mailadres is al geregistreerd': { en: 'This email address is already registered', fr: 'Cette adresse e-mail est déjà enregistrée' },
  'Onjuist e-mailadres of wachtwoord': { en: 'Incorrect email address or password', fr: 'Adresse e-mail ou mot de passe incorrect' },
  'Dit is niet jouw event': { en: 'This is not your event', fr: 'Cet événement ne vous appartient pas' },
  'Er zijn nog actieve boekingen voor dit event': { en: 'This event still has active bookings', fr: 'Cet événement a encore des réservations actives' },
  'Alleen gasten met een bevestigde boeking kunnen een review schrijven': { en: 'Only guests with a confirmed booking can write a review', fr: 'Seuls les participants ayant une réservation confirmée peuvent laisser un avis' },
  'Je hebt dit event al beoordeeld': { en: 'You have already reviewed this event', fr: 'Vous avez déjà évalué cet événement' },
  'Geef een score van 1 tot 5 sterren': { en: 'Give a rating from 1 to 5 stars', fr: 'Donnez une note de 1 à 5 étoiles' },
  'Schrijf minstens 10 tekens': { en: 'Write at least 10 characters', fr: 'Écrivez au moins 10 caractères' },
  'Je kunt je eigen event niet boeken': { en: 'You cannot book your own event', fr: 'Vous ne pouvez pas réserver votre propre événement' },
  'Kies een geldige startdatum': { en: 'Choose a valid start date', fr: 'Choisissez une date de début valide' },
  'Kies een ticket- of kameroptie': { en: 'Choose a ticket or room option', fr: 'Choisissez une option de billet ou de chambre' },
  'Aantal gasten moet tussen 1 en 20 liggen': { en: 'Number of guests must be between 1 and 20', fr: 'Le nombre de participants doit être compris entre 1 et 20' },
  'Nog maar {n} plek(ken) beschikbaar': { en: 'Only {n} spot(s) left', fr: 'Plus que {n} place(s) disponible(s)' },
  'Deze datum is volgeboekt': { en: 'This date is fully booked', fr: 'Cette date est complète' },
  'Boeking niet gevonden': { en: 'Booking not found', fr: 'Réservation introuvable' },
  'Alleen de facilitator kan aanvragen accepteren': { en: 'Only the facilitator can accept requests', fr: 'Seul le facilitateur peut accepter les demandes' },
  'Alleen de facilitator kan aanvragen afwijzen': { en: 'Only the facilitator can decline requests', fr: 'Seul le facilitateur peut refuser les demandes' },
  'Deze boeking is geen openstaande aanvraag': { en: 'This booking is not a pending request', fr: 'Cette réservation n’est pas une demande en attente' },
  'Geen toegang tot deze boeking': { en: 'No access to this booking', fr: 'Accès refusé à cette réservation' },
  'Deze boeking kan niet meer worden geannuleerd': { en: 'This booking can no longer be cancelled', fr: 'Cette réservation ne peut plus être annulée' },
  'Er ging iets mis op de server': { en: 'Something went wrong on the server', fr: 'Une erreur est survenue sur le serveur' },
  'Onbekend endpoint': { en: 'Unknown endpoint', fr: 'Point d’accès inconnu' },
  'Content-Type moet application/json zijn': { en: 'Content-Type must be application/json', fr: 'Le Content-Type doit être application/json' },
};

// Taal van het verzoek: X-Lang-header (gekozen in de site), anders Accept-Language, anders Nederlands.
function requestLang(req) {
  const explicit = String(req.headers['x-lang'] || '').toLowerCase();
  if (LANGS.includes(explicit)) return explicit;
  for (const part of String(req.headers['accept-language'] || '').split(',')) {
    const code = part.trim().slice(0, 2).toLowerCase();
    if (LANGS.includes(code)) return code;
  }
  return 'nl';
}

function translate(lang, template, vars = {}) {
  const text = (lang !== 'nl' && MESSAGES[template] && MESSAGES[template][lang]) || template;
  return text.replace(/\{(\w+)\}/g, (_, k) => (vars[k] !== undefined ? vars[k] : `{${k}}`));
}

module.exports = { LANGS, MESSAGES, requestLang, translate };
