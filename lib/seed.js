'use strict';
// Voorbeelddata: een paar hosts en retreats verspreid over Europa en Azië.
const crypto = require('crypto');

const COUNTRIES = {
  Europa: ['Portugal', 'Spanje', 'Italië', 'Griekenland', 'Frankrijk', 'Nederland', 'Kroatië', 'Oostenrijk', 'Zweden', 'IJsland'],
  Azië: ['Bali (Indonesië)', 'Thailand', 'India', 'Sri Lanka', 'Nepal', 'Vietnam', 'Japan', 'Filipijnen', 'Cambodja', 'Maleisië'],
};

const TYPES = ['Yoga', 'Meditatie', 'Detox', 'Wellness', 'Surf & Yoga', 'Ademwerk', 'Stilte', 'Natuur & Wandelen'];

function hashPassword(password, salt = crypto.randomBytes(16).toString('hex')) {
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return { salt, hash };
}

// Startdata relatief aan vandaag zodat de demo altijd toekomstige data heeft.
function futureDates(offsetsInDays) {
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  return offsetsInDays.map((d) => {
    const dt = new Date(today.getTime() + d * 86400000);
    return dt.toISOString().slice(0, 10);
  });
}

function seedData() {
  const demoPw = hashPassword('demo1234');
  const hosts = [
    { id: 'u_host1', name: 'Ana Ribeiro', email: 'ana@demo.nl' },
    { id: 'u_host2', name: 'Made Wirawan', email: 'made@demo.nl' },
    { id: 'u_host3', name: 'Sofia Lind', email: 'sofia@demo.nl' },
  ].map((h) => ({ ...h, salt: demoPw.salt, passHash: demoPw.hash, createdAt: new Date().toISOString() }));

  const r = (o) => ({ rating: 4.8, reviews: 0, image: '', createdAt: new Date().toISOString(), ...o });

  const retreats = [
    r({
      id: 'r_ericeira', hostId: 'u_host1', title: 'Surf & Yoga aan de Atlantische kust',
      type: 'Surf & Yoga', region: 'Europa', country: 'Portugal', city: 'Ericeira',
      description: 'Een week lang surfen op de golven van Ericeira, gecombineerd met dagelijkse vinyasa-yoga bij zonsopkomst. Je verblijft in een gerenoveerde quinta met uitzicht op zee en geniet van verse, plantaardige maaltijden.',
      pricePerPerson: 890, nights: 7, capacity: 12, rating: 4.9, reviews: 128,
      amenities: ['Ontbijt & diner', 'Surfplank & wetsuit', 'Zwembad', 'Transfer vanaf Lissabon'],
      startDates: futureDates([14, 42, 70, 98]),
    }),
    r({
      id: 'r_ubud', hostId: 'u_host2', title: 'Jungle Yoga & Healing in Ubud',
      type: 'Yoga', region: 'Azië', country: 'Bali (Indonesië)', city: 'Ubud',
      description: 'Verdiep je yogapraktijk tussen de rijstvelden van Ubud. Twee lessen per dag, een traditionele Balinese reinigingsceremonie, sound healing en tijd om helemaal tot rust te komen.',
      pricePerPerson: 1150, nights: 10, capacity: 16, rating: 4.95, reviews: 214,
      amenities: ['Alle maaltijden', 'Privé-villa', 'Massage inbegrepen', 'Tempelbezoek'],
      startDates: futureDates([21, 49, 77]),
    }),
    r({
      id: 'r_chiangmai', hostId: 'u_host2', title: 'Stilte & Vipassana in de bergen',
      type: 'Stilte', region: 'Azië', country: 'Thailand', city: 'Chiang Mai',
      description: 'Vijf dagen in stilte in een bergklooster nabij Chiang Mai. Begeleide vipassana-meditatie, loopmeditatie en eenvoudige Thaise vegetarische maaltijden.',
      pricePerPerson: 540, nights: 5, capacity: 20, rating: 4.7, reviews: 86,
      amenities: ['Vegetarische maaltijden', 'Begeleiding door monnik', 'Eenpersoonskamer'],
      startDates: futureDates([10, 31, 59, 87]),
    }),
    r({
      id: 'r_ibiza', hostId: 'u_host1', title: 'Detox & Ademwerk op Ibiza',
      type: 'Detox', region: 'Europa', country: 'Spanje', city: 'Ibiza',
      description: 'Herstel lichaam en geest met sapkuren, breathwork-sessies en yin-yoga in een witte finca op het rustige noorden van Ibiza.',
      pricePerPerson: 1290, nights: 6, capacity: 10, rating: 4.8, reviews: 64,
      amenities: ['Sapkuur', 'Infraroodsauna', 'Zwembad', 'Privé-coaching'],
      startDates: futureDates([18, 46, 102]),
    }),
    r({
      id: 'r_rishikesh', hostId: 'u_host2', title: 'Traditionele Hatha Yoga in Rishikesh',
      type: 'Yoga', region: 'Azië', country: 'India', city: 'Rishikesh',
      description: 'Aan de oevers van de Ganges, in de yogahoofdstad van de wereld. Hatha-yoga, pranayama, ayurvedische maaltijden en de avondlijke Ganga Aarti-ceremonie.',
      pricePerPerson: 690, nights: 12, capacity: 18, rating: 4.85, reviews: 152,
      amenities: ['Ayurvedische maaltijden', 'Yogacertificaat', 'Excursies'],
      startDates: futureDates([28, 63, 112]),
    }),
    r({
      id: 'r_lapland', hostId: 'u_host3', title: 'Noorderlicht & Meditatie in Lapland',
      type: 'Meditatie', region: 'Europa', country: 'Zweden', city: 'Abisko',
      description: 'Mediteer onder het noorderlicht. Een kleinschalige retreat met houtgestookte sauna, sneeuwschoenwandelingen en avondmeditaties bij het kampvuur.',
      pricePerPerson: 1490, nights: 5, capacity: 8, rating: 4.9, reviews: 41,
      amenities: ['Alle maaltijden', 'Sauna', 'Thermokleding', 'Noorderlichttour'],
      startDates: futureDates([35, 56, 84]),
    }),
    r({
      id: 'r_toscane', hostId: 'u_host3', title: 'Wellness & Slow Living in Toscane',
      type: 'Wellness', region: 'Europa', country: 'Italië', city: 'Val d’Orcia',
      description: 'Een agriturismo tussen de glooiende heuvels. Ochtendyoga, kookworkshops met lokale producten, wijnproeverij en tijd voor jezelf bij het zwembad.',
      pricePerPerson: 1090, nights: 7, capacity: 14, rating: 4.75, reviews: 97,
      amenities: ['Kookworkshop', 'Spa', 'Zwembad', 'Fietsen'],
      startDates: futureDates([24, 52, 80]),
    }),
    r({
      id: 'r_kyoto', hostId: 'u_host3', title: 'Zen & Natuur in de bergen van Kyoto',
      type: 'Natuur & Wandelen', region: 'Azië', country: 'Japan', city: 'Kyoto',
      description: 'Verblijf in een ryokan met onsen, wandel door eeuwenoude cederbossen, beoefen zazen in een zentempel en ontdek de Japanse theeceremonie.',
      pricePerPerson: 1690, nights: 6, capacity: 10, rating: 4.92, reviews: 58,
      amenities: ['Ryokan met onsen', 'Kaiseki-diner', 'Theeceremonie', 'Gids'],
      startDates: futureDates([40, 75, 110]),
    }),
    r({
      id: 'r_kreta', hostId: 'u_host1', title: 'Ademwerk & Zee op Kreta',
      type: 'Ademwerk', region: 'Europa', country: 'Griekenland', city: 'Chania',
      description: 'Ademwerk, koudetraining in de Libische Zee en mediterrane maaltijden in een stenen dorpje in het zuiden van Kreta.',
      pricePerPerson: 790, nights: 6, capacity: 12, rating: 4.7, reviews: 39,
      amenities: ['Ontbijt & lunch', 'Ijsbad-sessies', 'Zeezicht'],
      startDates: futureDates([16, 44, 72]),
    }),
    r({
      id: 'r_srilanka', hostId: 'u_host2', title: 'Ayurveda Detox aan de zuidkust',
      type: 'Detox', region: 'Azië', country: 'Sri Lanka', city: 'Tangalle',
      description: 'Een persoonlijke ayurvedische kuur met dagelijkse behandelingen, yoga aan het strand en begeleiding door een ayurvedisch arts.',
      pricePerPerson: 1240, nights: 10, capacity: 12, rating: 4.88, reviews: 73,
      amenities: ['Dagelijkse behandelingen', 'Consult arts', 'Alle maaltijden', 'Strand'],
      startDates: futureDates([30, 65, 95]),
    }),
  ];

  return { users: hosts, retreats, bookings: [], sessions: {} };
}

module.exports = { seedData, hashPassword, COUNTRIES, TYPES };
