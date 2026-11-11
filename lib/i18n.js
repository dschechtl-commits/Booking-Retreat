'use strict';
// Vertaling van servermeldingen. De Nederlandse tekst is de sleutel; {n} e.d. worden ingevuld.
const LANGS = ['nl', 'en', 'fr', 'es'];

const MESSAGES = {
  'Verzoek te groot': { en: 'Request too large', fr: 'Requête trop volumineuse' , es: 'Solicitud demasiado grande' },
  'Ongeldige JSON': { en: 'Invalid JSON', fr: 'JSON non valide' , es: 'JSON no válido' },
  'Log eerst in': { en: 'Please log in first', fr: 'Veuillez d’abord vous connecter' , es: 'Inicia sesión primero' },
  'Event niet gevonden': { en: 'Event not found', fr: 'Événement introuvable' , es: 'Evento no encontrado' },
  'Titel moet minstens 5 tekens zijn': { en: 'Title must be at least 5 characters', fr: 'Le titre doit comporter au moins 5 caractères' , es: 'El título debe tener al menos 5 caracteres' },
  'Kies een geldig type event': { en: 'Choose a valid event type', fr: 'Choisissez un type d’événement valide' , es: 'Elige un tipo de evento válido' },
  'Kies Europa of Azië': { en: 'Choose Europe or Asia', fr: 'Choisissez l’Europe ou l’Asie' , es: 'Elige Europa o Asia' },
  'Kies een land binnen de regio': { en: 'Choose a country within the region', fr: 'Choisissez un pays de la région' , es: 'Elige un país de la región' },
  'Plaats is verplicht': { en: 'City is required', fr: 'La ville est obligatoire' , es: 'La ciudad es obligatoria' },
  'Beschrijving moet minstens 30 tekens zijn': { en: 'Description must be at least 30 characters', fr: 'La description doit comporter au moins 30 caractères' , es: 'La descripción debe tener al menos 30 caracteres' },
  'Voeg minstens één ticket- of kameroptie met prijs toe': { en: 'Add at least one ticket or room option with a price', fr: 'Ajoutez au moins une option de billet ou de chambre avec un prix' , es: 'Añade al menos una opción de entrada o habitación con precio' },
  'Elke optie heeft een naam en een prijs tussen €1 en €50.000 nodig': { en: 'Each option needs a name and a price between €1 and €50,000', fr: 'Chaque option doit avoir un nom et un prix entre 1 € et 50 000 €' , es: 'Cada opción necesita un nombre y un precio entre 1 € y 50.000 €' },
  'Aantal nachten moet tussen 0 (dagevent) en 90 liggen': { en: 'Number of nights must be between 0 (day event) and 90', fr: 'Le nombre de nuits doit être compris entre 0 (événement d’une journée) et 90' , es: 'El número de noches debe estar entre 0 (evento de un día) y 90' },
  'Bevestig dat je een NEWNEI-opleiding hebt afgerond': { en: 'Confirm that you have completed a NEWNEI training', fr: 'Confirmez que vous avez suivi une formation NEWNEI' , es: 'Confirma que has completado una formación NEWNEI' },
  'Vul je NEWNEI-opleiding of certificering in': { en: 'Enter your NEWNEI training or certification', fr: 'Indiquez votre formation ou certification NEWNEI' , es: 'Indica tu formación o certificación NEWNEI' },
  'Capaciteit moet tussen 1 en 200 liggen': { en: 'Capacity must be between 1 and 200', fr: 'La capacité doit être comprise entre 1 et 200' , es: 'La capacidad debe estar entre 1 y 200' },
  'Aanbetaling moet tussen 0% en 100% liggen': { en: 'Deposit must be between 0% and 100%', fr: 'L’acompte doit être compris entre 0 % et 100 %' , es: 'El depósito debe estar entre el 0 % y el 100 %' },
  'Kies een annuleringsbeleid': { en: 'Choose a cancellation policy', fr: 'Choisissez une politique d’annulation' , es: 'Elige una política de cancelación' },
  'Kies een niveau': { en: 'Choose a level', fr: 'Choisissez un niveau' , es: 'Elige un nivel' },
  'Kies minstens één taal': { en: 'Choose at least one language', fr: 'Choisissez au moins une langue' , es: 'Elige al menos un idioma' },
  'Afbeelding moet een https-URL zijn': { en: 'Image must be an https URL', fr: 'L’image doit être une URL https' , es: 'La imagen debe ser una URL https' },
  'Voeg minstens één toekomstige startdatum toe': { en: 'Add at least one future start date', fr: 'Ajoutez au moins une date de début future' , es: 'Añade al menos una fecha de inicio futura' },
  'Vul je naam in': { en: 'Please enter your name', fr: 'Veuillez indiquer votre nom' , es: 'Indica tu nombre' },
  'Ongeldig e-mailadres': { en: 'Invalid email address', fr: 'Adresse e-mail non valide' , es: 'Correo electrónico no válido' },
  'Wachtwoord moet minstens 8 tekens zijn': { en: 'Password must be at least 8 characters', fr: 'Le mot de passe doit comporter au moins 8 caractères' , es: 'La contraseña debe tener al menos 8 caracteres' },
  'Dit e-mailadres is al geregistreerd': { en: 'This email address is already registered', fr: 'Cette adresse e-mail est déjà enregistrée' , es: 'Este correo electrónico ya está registrado' },
  'Onjuist e-mailadres of wachtwoord': { en: 'Incorrect email address or password', fr: 'Adresse e-mail ou mot de passe incorrect' , es: 'Correo electrónico o contraseña incorrectos' },
  'Dit is niet jouw event': { en: 'This is not your event', fr: 'Cet événement ne vous appartient pas' , es: 'Este evento no es tuyo' },
  'Er zijn nog actieve boekingen voor dit event': { en: 'This event still has active bookings', fr: 'Cet événement a encore des réservations actives' , es: 'Este evento todavía tiene reservas activas' },
  'Alleen gasten met een bevestigde boeking kunnen een review schrijven': { en: 'Only guests with a confirmed booking can write a review', fr: 'Seuls les participants ayant une réservation confirmée peuvent laisser un avis' , es: 'Solo los participantes con una reserva confirmada pueden dejar una reseña' },
  'Je hebt dit event al beoordeeld': { en: 'You have already reviewed this event', fr: 'Vous avez déjà évalué cet événement' , es: 'Ya has valorado este evento' },
  'Geef een score van 1 tot 5 sterren': { en: 'Give a rating from 1 to 5 stars', fr: 'Donnez une note de 1 à 5 étoiles' , es: 'Da una puntuación de 1 a 5 estrellas' },
  'Schrijf minstens 10 tekens': { en: 'Write at least 10 characters', fr: 'Écrivez au moins 10 caractères' , es: 'Escribe al menos 10 caracteres' },
  'Je kunt je eigen event niet boeken': { en: 'You cannot book your own event', fr: 'Vous ne pouvez pas réserver votre propre événement' , es: 'No puedes reservar tu propio evento' },
  'Kies een geldige startdatum': { en: 'Choose a valid start date', fr: 'Choisissez une date de début valide' , es: 'Elige una fecha de inicio válida' },
  'Kies een ticket- of kameroptie': { en: 'Choose a ticket or room option', fr: 'Choisissez une option de billet ou de chambre' , es: 'Elige una opción de entrada o habitación' },
  'Aantal gasten moet tussen 1 en 20 liggen': { en: 'Number of guests must be between 1 and 20', fr: 'Le nombre de participants doit être compris entre 1 et 20' , es: 'El número de participantes debe estar entre 1 y 20' },
  'Nog maar {n} plek(ken) beschikbaar': { en: 'Only {n} spot(s) left', fr: 'Plus que {n} place(s) disponible(s)' , es: 'Solo quedan {n} plaza(s)' },
  'Deze datum is volgeboekt': { en: 'This date is fully booked', fr: 'Cette date est complète' , es: 'Esta fecha está completa' },
  'Boeking niet gevonden': { en: 'Booking not found', fr: 'Réservation introuvable' , es: 'Reserva no encontrada' },
  'Alleen de facilitator kan aanvragen accepteren': { en: 'Only the facilitator can accept requests', fr: 'Seul le facilitateur peut accepter les demandes' , es: 'Solo el facilitador puede aceptar solicitudes' },
  'Alleen de facilitator kan aanvragen afwijzen': { en: 'Only the facilitator can decline requests', fr: 'Seul le facilitateur peut refuser les demandes' , es: 'Solo el facilitador puede rechazar solicitudes' },
  'Deze boeking is geen openstaande aanvraag': { en: 'This booking is not a pending request', fr: 'Cette réservation n’est pas une demande en attente' , es: 'Esta reserva no es una solicitud pendiente' },
  'Geen toegang tot deze boeking': { en: 'No access to this booking', fr: 'Accès refusé à cette réservation' , es: 'Sin acceso a esta reserva' },
  'Deze boeking kan niet meer worden geannuleerd': { en: 'This booking can no longer be cancelled', fr: 'Cette réservation ne peut plus être annulée' , es: 'Esta reserva ya no se puede cancelar' },
  'Er ging iets mis op de server': { en: 'Something went wrong on the server', fr: 'Une erreur est survenue sur le serveur' , es: 'Algo ha salido mal en el servidor' },
  'Onbekend endpoint': { en: 'Unknown endpoint', fr: 'Point d’accès inconnu' , es: 'Punto de acceso desconocido' },
  'Content-Type moet application/json zijn': { en: 'Content-Type must be application/json', fr: 'Le Content-Type doit être application/json' , es: 'El Content-Type debe ser application/json' },
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
