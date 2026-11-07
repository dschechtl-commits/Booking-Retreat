'use strict';
// Referentiedata en voorbeelddata: hosts en retreats verspreid over Europa en Azië.
const crypto = require('crypto');

const COUNTRIES = {
  Europa: ['Portugal', 'Spanje', 'Italië', 'Griekenland', 'Frankrijk', 'Nederland', 'Kroatië', 'Oostenrijk', 'Zweden', 'IJsland'],
  Azië: ['Bali (Indonesië)', 'Thailand', 'India', 'Sri Lanka', 'Nepal', 'Vietnam', 'Japan', 'Filipijnen', 'Cambodja', 'Maleisië'],
};
const TYPES = ['Yoga', 'Meditatie', 'Detox', 'Wellness', 'Surf & Yoga', 'Ademwerk', 'Stilte', 'Natuur & Wandelen'];
const LEVELS = ['Beginner', 'Alle niveaus', 'Gevorderd'];
const DIETS = ['Vegetarisch', 'Veganistisch', 'Glutenvrij', 'Biologisch'];
const LANGUAGES = ['Nederlands', 'Engels', 'Duits', 'Frans', 'Spaans'];
const DURATIONS = { '1-3': [1, 3], '4-7': [4, 7], '8-14': [8, 14], '15+': [15, 999] };
// Dagen vóór aanvang waarbinnen de aanbetaling nog wordt terugbetaald (null = nooit).
const CANCELLATION = {
  flexibel: { label: 'Flexibel', refundDays: 14, text: 'Gratis annuleren tot 14 dagen voor aanvang; je krijgt je aanbetaling volledig terug.' },
  gemiddeld: { label: 'Gemiddeld', refundDays: 30, text: 'Gratis annuleren tot 30 dagen voor aanvang; daarna wordt de aanbetaling niet terugbetaald.' },
  strikt: { label: 'Strikt', refundDays: null, text: 'De aanbetaling wordt bij annulering niet terugbetaald.' },
};

function hashPassword(password, salt = crypto.randomBytes(16).toString('hex')) {
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return { salt, hash };
}

// Startdata relatief aan vandaag zodat de demo altijd toekomstige data heeft.
function futureDates(offsetsInDays) {
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  return offsetsInDays.map((d) => new Date(today.getTime() + d * 86400000).toISOString().slice(0, 10));
}

const DEFAULTS = {
  rating: 0, reviews: 0, image: '', depositPercent: 20, cancellation: 'flexibel', level: 'Alle niveaus',
  diets: ['Vegetarisch'], languages: ['Engels'], instantBooking: true, itinerary: '', accommodation: '',
  food: '', teacherName: '', teacherBio: '', amenities: [],
};

function retreat(o) {
  const r = { ...DEFAULTS, createdAt: new Date().toISOString(), ...o };
  r.pricePerPerson = Math.min(...r.packages.map((p) => p.price));
  return r;
}

function seedData() {
  const demoPw = hashPassword('demo1234');
  const hosts = [
    { id: 'u_host1', name: 'Ana Ribeiro', email: 'ana@demo.nl' },
    { id: 'u_host2', name: 'Made Wirawan', email: 'made@demo.nl' },
    { id: 'u_host3', name: 'Sofia Lind', email: 'sofia@demo.nl' },
  ].map((h) => ({ ...h, salt: demoPw.salt, passHash: demoPw.hash, favorites: [], createdAt: new Date().toISOString() }));

  const retreats = [
    retreat({
      id: 'r_ericeira', hostId: 'u_host1', title: 'Surf & Yoga aan de Atlantische kust',
      type: 'Surf & Yoga', region: 'Europa', country: 'Portugal', city: 'Ericeira',
      description: 'Een week lang surfen op de golven van Ericeira, gecombineerd met dagelijkse vinyasa-yoga bij zonsopkomst. Je verblijft in een gerenoveerde quinta met uitzicht op zee en geniet van verse, plantaardige maaltijden.',
      packages: [{ name: 'Gedeelde kamer', price: 890 }, { name: 'Privékamer', price: 1190 }],
      nights: 7, capacity: 12, rating: 4.9, reviews: 128, level: 'Beginner', languages: ['Engels', 'Nederlands'],
      diets: ['Vegetarisch', 'Veganistisch'], cancellation: 'flexibel',
      itinerary: '07:30 Vinyasa-yoga bij zonsopkomst\n09:00 Ontbijt\n10:30 Surfles (2,5 uur)\n13:30 Lunch & vrije tijd\n17:30 Yin-yoga of ademwerk\n19:30 Diner',
      accommodation: 'Gerenoveerde quinta op 5 minuten van het strand, met zwembad, tuin en dakterras met zeezicht.',
      food: 'Dagelijks ontbijt en diner, plantaardig en met lokale producten van de markt.',
      teacherName: 'Ana Ribeiro', teacherBio: 'Gecertificeerde yogadocent (RYT-500) en surfinstructeur die al 10 jaar retreats geeft aan de Portugese kust.',
      amenities: ['Ontbijt & diner', 'Surfplank & wetsuit', 'Zwembad', 'Transfer vanaf Lissabon'],
      startDates: futureDates([14, 42, 70, 98]),
    }),
    retreat({
      id: 'r_ubud', hostId: 'u_host2', title: 'Jungle Yoga & Healing in Ubud',
      type: 'Yoga', region: 'Azië', country: 'Bali (Indonesië)', city: 'Ubud',
      description: 'Verdiep je yogapraktijk tussen de rijstvelden van Ubud. Twee lessen per dag, een traditionele Balinese reinigingsceremonie, sound healing en tijd om helemaal tot rust te komen.',
      packages: [{ name: 'Gedeelde villa', price: 1150 }, { name: 'Privé-villa', price: 1590 }],
      nights: 10, capacity: 16, rating: 4.95, reviews: 214, depositPercent: 25,
      diets: ['Vegetarisch', 'Veganistisch', 'Glutenvrij'], languages: ['Engels'],
      itinerary: '06:30 Meditatie\n07:00 Hatha-yoga\n09:00 Ontbijt\n10:30 Workshop of excursie\n13:00 Lunch\n16:30 Vinyasa-yoga\n18:30 Diner\n20:00 Sound healing (3× per week)',
      accommodation: 'Villa’s met uitzicht op de rijstvelden, eigen badkamer en gedeeld infinity-zwembad.',
      food: 'Drie gezonde maaltijden per dag, Balinees en internationaal, grotendeels uit eigen tuin.',
      teacherName: 'Made Wirawan', teacherBio: 'Geboren in Ubud, geeft al 15 jaar yoga en Balinese healing-ceremonies.',
      amenities: ['Alle maaltijden', 'Massage inbegrepen', 'Tempelbezoek', 'Luchthaventransfer'],
      startDates: futureDates([21, 49, 77]),
    }),
    retreat({
      id: 'r_chiangmai', hostId: 'u_host2', title: 'Stilte & Vipassana in de bergen',
      type: 'Stilte', region: 'Azië', country: 'Thailand', city: 'Chiang Mai',
      description: 'Vijf dagen in stilte in een bergklooster nabij Chiang Mai. Begeleide vipassana-meditatie, loopmeditatie en eenvoudige Thaise vegetarische maaltijden.',
      packages: [{ name: 'Eenpersoonskamer', price: 540 }],
      nights: 5, capacity: 20, rating: 4.7, reviews: 86, level: 'Beginner', cancellation: 'gemiddeld', instantBooking: false,
      diets: ['Vegetarisch', 'Veganistisch'], languages: ['Engels'],
      itinerary: '05:00 Ochtendmeditatie\n06:30 Ontbijt\n08:00 Dharma-les\n09:00 Zit- en loopmeditatie\n11:00 Lunch (laatste maaltijd)\n13:00 Meditatie\n18:00 Chanting\n21:00 Stilte & rust',
      accommodation: 'Eenvoudige eenpersoonskamers op het kloosterterrein, midden in de jungle.',
      food: 'Twee vegetarische Thaise maaltijden per dag, ’s middags de laatste maaltijd.',
      teacherName: 'Phra Ajahn Dhamma', teacherBio: 'Theravada-monnik die al 20 jaar vipassana onderwijst aan westerse beoefenaars.',
      amenities: ['Vegetarische maaltijden', 'Begeleiding door monnik', 'Eenpersoonskamer'],
      startDates: futureDates([10, 31, 59, 87]),
    }),
    retreat({
      id: 'r_ibiza', hostId: 'u_host1', title: 'Detox & Ademwerk op Ibiza',
      type: 'Detox', region: 'Europa', country: 'Spanje', city: 'Ibiza',
      description: 'Herstel lichaam en geest met sapkuren, breathwork-sessies en yin-yoga in een witte finca op het rustige noorden van Ibiza.',
      packages: [{ name: 'Gedeelde kamer', price: 1290 }, { name: 'Privékamer met zeezicht', price: 1690 }],
      nights: 6, capacity: 10, rating: 4.8, reviews: 64, depositPercent: 30, cancellation: 'gemiddeld',
      diets: ['Veganistisch', 'Glutenvrij', 'Biologisch'], languages: ['Engels', 'Spaans'],
      itinerary: '08:00 Ademwerk\n09:00 Groene sap\n10:00 Wandeling\n12:30 Sap of bouillon\n15:00 Infraroodsauna\n17:30 Yin-yoga\n19:00 Detoxsoep',
      accommodation: 'Witte finca met zwembad en uitzicht op de Middellandse Zee, op 10 minuten van Portinatx.',
      food: 'Begeleide sapkuur met koudgeperste sappen en soepen; na afloop een opbouwprogramma.',
      amenities: ['Sapkuur', 'Infraroodsauna', 'Zwembad', 'Privé-coaching'],
      startDates: futureDates([18, 46, 102]),
    }),
    retreat({
      id: 'r_rishikesh', hostId: 'u_host2', title: 'Traditionele Hatha Yoga in Rishikesh',
      type: 'Yoga', region: 'Azië', country: 'India', city: 'Rishikesh',
      description: 'Aan de oevers van de Ganges, in de yogahoofdstad van de wereld. Hatha-yoga, pranayama, ayurvedische maaltijden en de avondlijke Ganga Aarti-ceremonie.',
      packages: [{ name: 'Gedeelde kamer', price: 690 }, { name: 'Privékamer', price: 890 }],
      nights: 12, capacity: 18, rating: 4.85, reviews: 152, level: 'Gevorderd', cancellation: 'strikt',
      diets: ['Vegetarisch', 'Veganistisch'], languages: ['Engels'],
      itinerary: '05:30 Pranayama & meditatie\n07:00 Hatha-yoga\n09:00 Ontbijt\n11:00 Yogafilosofie\n13:00 Lunch\n16:00 Asana-praktijk\n18:00 Ganga Aarti\n19:30 Diner',
      accommodation: 'Ashram-stijl guesthouse aan de Ganges met uitzicht op de Himalaya-uitlopers.',
      food: 'Sattvische, ayurvedische vegetarische maaltijden, drie keer per dag.',
      amenities: ['Ayurvedische maaltijden', 'Yogacertificaat', 'Excursies'],
      startDates: futureDates([28, 63, 112]),
    }),
    retreat({
      id: 'r_lapland', hostId: 'u_host3', title: 'Noorderlicht & Meditatie in Lapland',
      type: 'Meditatie', region: 'Europa', country: 'Zweden', city: 'Abisko',
      description: 'Mediteer onder het noorderlicht. Een kleinschalige retreat met houtgestookte sauna, sneeuwschoenwandelingen en avondmeditaties bij het kampvuur.',
      packages: [{ name: 'Gedeelde cabin', price: 1490 }, { name: 'Privé-cabin', price: 1890 }],
      nights: 5, capacity: 8, rating: 4.9, reviews: 41, instantBooking: false, languages: ['Engels', 'Nederlands'],
      itinerary: '09:00 Ochtendmeditatie\n10:00 Brunch\n11:30 Sneeuwschoenwandeling\n15:00 Sauna & ijsbad\n18:00 Diner\n21:00 Noorderlichtmeditatie bij het vuur',
      accommodation: 'Houten cabins aan het meer van Torneträsk, met gedeelde lodge en houtgestookte sauna.',
      food: 'Noordse keuken met lokale producten; vegetarisch op verzoek.',
      teacherName: 'Sofia Lind', teacherBio: 'Mindfulness-trainer en natuurgids uit Kiruna.',
      amenities: ['Alle maaltijden', 'Sauna', 'Thermokleding', 'Noorderlichttour'],
      startDates: futureDates([35, 56, 84]),
    }),
    retreat({
      id: 'r_toscane', hostId: 'u_host3', title: 'Wellness & Slow Living in Toscane',
      type: 'Wellness', region: 'Europa', country: 'Italië', city: 'Val d’Orcia',
      description: 'Een agriturismo tussen de glooiende heuvels. Ochtendyoga, kookworkshops met lokale producten, wijnproeverij en tijd voor jezelf bij het zwembad.',
      packages: [{ name: 'Tweepersoonskamer (gedeeld)', price: 1090 }, { name: 'Suite', price: 1490 }],
      nights: 7, capacity: 14, rating: 4.75, reviews: 97, diets: ['Vegetarisch', 'Biologisch'], languages: ['Engels', 'Duits'],
      itinerary: '08:00 Yoga in de olijfgaard\n09:30 Ontbijt\n11:00 Kookworkshop of fietstocht\n13:30 Lunch\n16:00 Spa & zwembad\n20:00 Toscaans diner',
      accommodation: 'Biologisch agriturismo met spa, zwembad en uitzicht over de Val d’Orcia.',
      food: 'Toscaanse keuken van eigen land: olijfolie, groenten en wijn.',
      amenities: ['Kookworkshop', 'Spa', 'Zwembad', 'Fietsen'],
      startDates: futureDates([24, 52, 80]),
    }),
    retreat({
      id: 'r_kyoto', hostId: 'u_host3', title: 'Zen & Natuur in de bergen van Kyoto',
      type: 'Natuur & Wandelen', region: 'Azië', country: 'Japan', city: 'Kyoto',
      description: 'Verblijf in een ryokan met onsen, wandel door eeuwenoude cederbossen, beoefen zazen in een zentempel en ontdek de Japanse theeceremonie.',
      packages: [{ name: 'Ryokan-kamer (gedeeld)', price: 1690 }, { name: 'Privékamer met onsen', price: 2290 }],
      nights: 6, capacity: 10, rating: 4.92, reviews: 58, depositPercent: 30, cancellation: 'gemiddeld', languages: ['Engels'],
      itinerary: '06:30 Zazen in de tempel\n08:00 Japans ontbijt\n09:30 Bergwandeling\n13:00 Bento-lunch\n15:30 Theeceremonie of kalligrafie\n18:30 Kaiseki-diner\n20:00 Onsen',
      accommodation: 'Traditionele ryokan in de bergen van Ohara met tatami-kamers en warmwaterbronnen.',
      food: 'Japans ontbijt en kaiseki-diner; vegetarische shojin-ryori op aanvraag.',
      amenities: ['Ryokan met onsen', 'Kaiseki-diner', 'Theeceremonie', 'Gids'],
      startDates: futureDates([40, 75, 110]),
    }),
    retreat({
      id: 'r_kreta', hostId: 'u_host1', title: 'Ademwerk & Zee op Kreta',
      type: 'Ademwerk', region: 'Europa', country: 'Griekenland', city: 'Chania',
      description: 'Ademwerk, koudetraining in de Libische Zee en mediterrane maaltijden in een stenen dorpje in het zuiden van Kreta.',
      packages: [{ name: 'Gedeelde kamer', price: 790 }, { name: 'Privékamer', price: 990 }],
      nights: 3, capacity: 12, rating: 4.7, reviews: 39, languages: ['Engels', 'Nederlands'], diets: ['Vegetarisch', 'Glutenvrij'],
      itinerary: '08:00 Ademwerk\n09:00 Ijsbad in zee\n10:00 Ontbijt\n12:00 Vrije tijd / strand\n14:00 Lunch\n17:00 Yoga & ademwerk\n20:00 Diner',
      accommodation: 'Stenen dorpshuis met binnenplaats, op loopafstand van een rustig strand.',
      food: 'Mediterraan ontbijt en lunch, met olijfolie en groenten uit de regio.',
      amenities: ['Ontbijt & lunch', 'Ijsbad-sessies', 'Zeezicht'],
      startDates: futureDates([16, 44, 72]),
    }),
    retreat({
      id: 'r_srilanka', hostId: 'u_host2', title: 'Ayurveda Detox aan de zuidkust',
      type: 'Detox', region: 'Azië', country: 'Sri Lanka', city: 'Tangalle',
      description: 'Een persoonlijke ayurvedische kuur met dagelijkse behandelingen, yoga aan het strand en begeleiding door een ayurvedisch arts.',
      packages: [{ name: 'Gardenroom', price: 1240 }, { name: 'Oceanview room', price: 1540 }],
      nights: 16, capacity: 12, rating: 4.88, reviews: 73, depositPercent: 25, diets: ['Vegetarisch', 'Glutenvrij', 'Biologisch'], languages: ['Engels', 'Duits'],
      itinerary: '07:00 Yoga aan het strand\n08:30 Ayurvedisch ontbijt\n10:00 Behandeling (abhyanga, shirodhara)\n13:00 Lunch\n16:00 Consult of meditatie\n19:00 Diner',
      accommodation: 'Kleinschalig ayurveda-resort direct aan het strand van Tangalle.',
      food: 'Persoonlijk ayurvedisch menu, afgestemd op je dosha.',
      amenities: ['Dagelijkse behandelingen', 'Consult arts', 'Alle maaltijden', 'Strand'],
      startDates: futureDates([30, 65, 95]),
    }),
  ];

  return { users: hosts, retreats, bookings: [], reviews: [], sessions: {} };
}

module.exports = { seedData, hashPassword, COUNTRIES, TYPES, LEVELS, DIETS, LANGUAGES, DURATIONS, CANCELLATION, DEFAULTS };
