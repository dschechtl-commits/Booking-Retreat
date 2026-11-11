'use strict';
// Referentiedata en voorbeelddata: hosts en retreats verspreid over Europa en Azië.
const crypto = require('crypto');

const COUNTRIES = {
  Europa: ['Portugal', 'Spanje', 'Italië', 'Griekenland', 'Frankrijk', 'Nederland', 'Kroatië', 'Oostenrijk', 'Zweden', 'IJsland'],
  Azië: ['Bali (Indonesië)', 'Thailand', 'India', 'Sri Lanka', 'Nepal', 'Vietnam', 'Japan', 'Filipijnen', 'Cambodja', 'Maleisië'],
};
const TYPES = ['Retreat', 'Experience Day', 'Workshop', 'Masterclass', 'Avondsessie', 'Meerdaagse training'];
const LEVELS = ['Beginner', 'Alle niveaus', 'Gevorderd'];
const DIETS = ['Vegetarisch', 'Veganistisch', 'Glutenvrij', 'Biologisch'];
const LANGUAGES = ['Nederlands', 'Engels', 'Duits', 'Frans', 'Spaans'];
const DURATIONS = { dag: [0, 0], '1-3': [1, 3], '4-7': [4, 7], '8-14': [8, 14], '15+': [15, 999] };
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
  food: '', teacherName: '', teacherBio: '', certification: '', translations: {}, amenities: [],
};

function retreat(o) {
  const r = { ...DEFAULTS, createdAt: new Date().toISOString(), ...o };
  r.pricePerPerson = Math.min(...r.packages.map((p) => p.price));
  return r;
}


function seedData() {
  const demoPw = hashPassword('demo1234');
  const hosts = [
    { id: 'u_host1', name: 'Eva Jansen', email: 'eva@demo.nl' },
    { id: 'u_host2', name: 'Lotte Bakker', email: 'lotte@demo.nl' },
    { id: 'u_host3', name: 'Sanne Visser', email: 'sanne@demo.nl' },
  ].map((h) => ({ ...h, salt: demoPw.salt, passHash: demoPw.hash, favorites: [], createdAt: new Date().toISOString() }));

  const cert = 'NEWNEI-opleiding afgerond';
  const retreats = [
    retreat({
      id: 'r_algarve', image: '/img/ev-algarve.jpg', translations: {"en": {"title": "Coming home to your heart – NEWNEI Retreat by the sea", "description": "A week in which you don’t learn about NEWNEI, you experience it. Daily NEWNEI sessions in a small group, muscle testing, breathwork and long beaches. We work on the patterns you have carried for years, and you go home with exercises you can keep doing yourself."}, "fr": {"title": "Revenir à son cœur – Retraite NEWNEI au bord de la mer", "description": "Une semaine pour ne pas apprendre NEWNEI, mais le vivre. Des séances NEWNEI quotidiennes en petit groupe, des tests musculaires, du travail sur la respiration et de longues plages. Nous travaillons sur les schémas que vous portez depuis des années, et vous repartez avec des exercices à poursuivre chez vous."}, "es": {"title": "Volver al corazón – Retiro NEWNEI junto al mar", "description": "Una semana en la que no aprendes NEWNEI, lo vives. Sesiones diarias de NEWNEI en grupo reducido, test muscular, trabajo de respiración y playas interminables. Trabajamos los patrones que llevas años cargando y te vas a casa con ejercicios para seguir practicando por tu cuenta."}},
      hostId: 'u_host1', title: 'Thuiskomen in je hart – NEWNEI Retreat aan zee',
      type: 'Retreat', region: 'Europa', country: 'Portugal', city: 'Algarve',
      description: 'Een week waarin je niet over NEWNEI leert, maar het ervaart. Dagelijkse NEWNEI-sessies in kleine groep, spiertesten, ademwerk en lange stranden. We werken aan de patronen die je al jaren meedraagt, en je gaat naar huis met oefeningen die je zelf kunt blijven doen.',
      packages: [{ name: 'Gedeelde kamer', price: 1290 }, { name: 'Privékamer', price: 1590 }],
      nights: 7, capacity: 14, rating: 4.9, reviews: 46, level: 'Alle niveaus', languages: ['Nederlands'],
      diets: ['Vegetarisch', 'Veganistisch'], cancellation: 'flexibel', certification: cert,
      itinerary: '07:30 Ochtendmeditatie aan zee\n09:00 Ontbijt\n10:00 NEWNEI-sessie: patronen & spiertesten\n13:00 Lunch & vrije tijd\n16:30 Ademwerk en integratie\n19:00 Diner\n20:30 Kring',
      accommodation: 'Kleinschalige quinta met zoutwaterzwembad, op 10 minuten van de kust.',
      food: 'Ontbijt, lunch en diner, plantaardig en met producten uit de streek.',
      teacherName: 'Eva Jansen', teacherBio: 'NEWNEI-facilitator en voormalig verpleegkundige. Begeleidt al jaren groepen in zelfheling en emotioneel herstel.',
      amenities: ['Alle maaltijden', 'Dagelijkse groepssessies', '1 persoonlijke sessie', 'Transfer vanaf Faro'],
      startDates: futureDates([20, 55, 90]),
    }),
    retreat({
      id: 'r_utrecht', image: '/img/ev-utrecht.jpg', translations: {"en": {"title": "NEWNEI Experience Day: Abundance", "description": "A full day about your relationship with money, receiving and allowing. Where is the brake? With NEWNEI you uncover beliefs you can’t see yourself, and let them go on the spot. No experience needed."}, "fr": {"title": "Journée NEWNEI Experience : l’abondance", "description": "Une journée entière consacrée à votre relation avec l’argent, le fait de recevoir et de s’autoriser. Où se trouve le frein ? Avec NEWNEI, vous repérez des croyances invisibles et vous les libérez sur place. Aucune expérience requise."}, "es": {"title": "NEWNEI Experience Day: Abundancia", "description": "Un día completo sobre tu relación con el dinero, con recibir y con permitirte. ¿Dónde está el freno? Con NEWNEI descubres creencias que no ves por ti mismo y las sueltas en el momento. No necesitas experiencia."}},
      hostId: 'u_host2', title: 'NEWNEI Experience Day: Overvloed',
      type: 'Experience Day', region: 'Europa', country: 'Nederland', city: 'Utrecht',
      description: 'Een volledige dag over je relatie met geld, ontvangen en gunnen. Waar zit de rem? Met NEWNEI spoor je overtuigingen op die je zelf niet ziet, en laat je ze ter plekke los. Geen ervaring nodig.',
      packages: [{ name: 'Dagticket', price: 129 }, { name: 'Duoticket (p.p.)', price: 109 }],
      nights: 0, capacity: 60, rating: 4.8, reviews: 112, depositPercent: 100, languages: ['Nederlands'],
      diets: ['Vegetarisch'], cancellation: 'gemiddeld', certification: cert,
      itinerary: '09:30 Inloop met koffie\n10:00 Opening & eerste oefening\n11:00 Overtuigingen rond geld\n12:30 Lunch\n13:30 NEWNEI-groepssessie\n15:30 Ontvangen & gunnen\n17:00 Afsluiting',
      accommodation: 'Lichte zaal in het centrum van Utrecht, op loopafstand van het station.',
      food: 'Koffie, thee en een vegetarische lunch zijn inbegrepen.',
      teacherName: 'Lotte Bakker', teacherBio: 'NEWNEI-facilitator en coach voor ondernemers.',
      amenities: ['Lunch', 'Werkboek', 'Audio-oefening voor thuis'],
      startDates: futureDates([12, 40, 75]),
    }),
    retreat({
      id: 'r_ubud', image: '/img/ev-ubud.jpg', translations: {"en": {"title": "Deep layers – NEWNEI Retreat in Ubud", "description": "Ten days among the rice fields to work on what lies deeper: ancestral patterns, the inner child and what you once decided to protect yourself. Alternated with temple visits, a Balinese ceremony and plenty of rest."}, "fr": {"title": "Couches profondes – Retraite NEWNEI à Ubud", "description": "Dix jours au milieu des rizières pour travailler sur ce qui est plus profond : schémas ancestraux, enfant intérieur et ce que vous avez un jour décidé pour vous protéger. En alternance avec des visites de temples, une cérémonie balinaise et beaucoup de repos."}, "es": {"title": "Capas profundas – Retiro NEWNEI en Ubud", "description": "Diez días entre arrozales para trabajar lo que está más hondo: patrones ancestrales, el niño interior y lo que un día decidiste para protegerte. Con visitas a templos, una ceremonia balinesa y mucho descanso."}},
      hostId: 'u_host2', title: 'Diepe lagen – NEWNEI Retreat in Ubud',
      type: 'Retreat', region: 'Azië', country: 'Bali (Indonesië)', city: 'Ubud',
      description: 'Tien dagen tussen de rijstvelden om te werken aan wat dieper zit: voorouderlijke patronen, het innerlijke kind en wat je ooit hebt besloten om jezelf te beschermen. Afgewisseld met tempelbezoek, Balinese ceremonie en veel rust.',
      packages: [{ name: 'Gedeelde villa', price: 1690 }, { name: 'Privé-villa', price: 2190 }],
      nights: 10, capacity: 16, rating: 4.95, reviews: 38, depositPercent: 25, level: 'Alle niveaus',
      diets: ['Vegetarisch', 'Veganistisch', 'Glutenvrij'], languages: ['Nederlands', 'Engels'], certification: cert,
      itinerary: '06:30 Meditatie\n08:00 Ontbijt\n09:30 NEWNEI-sessie in de groep\n12:30 Lunch\n14:00 Rust, massage of excursie\n17:00 Ademwerk & integratie\n19:00 Diner',
      accommodation: 'Villa’s met uitzicht op de rijstvelden, eigen badkamer en gedeeld zwembad.',
      food: 'Drie gezonde maaltijden per dag, Balinees en internationaal.',
      teacherName: 'Lotte Bakker', teacherBio: 'NEWNEI-facilitator. Organiseert sinds 2022 retreats in Azië.',
      amenities: ['Alle maaltijden', 'Balinese ceremonie', 'Massage', 'Luchthaventransfer'],
      startDates: futureDates([30, 70, 110]),
    }),
    retreat({
      id: 'r_rotterdam', image: '/img/ev-rotterdam.jpg', translations: {"en": {"title": "Evening session: Quiet your mind", "description": "An evening for everyone whose thoughts keep racing. You experience how your body shows, through muscle testing, where the restlessness comes from, and you learn a short NEWNEI exercise you can do every evening."}, "fr": {"title": "Soirée : apaiser son mental", "description": "Une soirée pour tous ceux qui ruminent sans cesse. Vous découvrez comment votre corps montre, grâce aux tests musculaires, d’où vient l’agitation, et vous apprenez un court exercice NEWNEI à pratiquer chaque soir."}, "es": {"title": "Sesión de tarde: Calma tu mente", "description": "Una tarde para quienes no paran de darle vueltas a todo. Descubres cómo tu cuerpo muestra, mediante el test muscular, de dónde viene la inquietud, y aprendes un breve ejercicio NEWNEI para hacer cada noche."}},
      hostId: 'u_host3', title: 'Avondsessie: Je hoofd tot rust',
      type: 'Avondsessie', region: 'Europa', country: 'Nederland', city: 'Rotterdam',
      description: 'Een avond voor iedereen die blijft malen. Je ervaart hoe je lichaam via spiertesten laat zien waar de onrust vandaan komt, en je leert een korte NEWNEI-oefening die je elke avond kunt doen.',
      packages: [{ name: 'Ticket', price: 39 }],
      nights: 0, capacity: 40, rating: 4.7, reviews: 64, depositPercent: 100, level: 'Beginner', languages: ['Nederlands'],
      diets: [], cancellation: 'flexibel', certification: cert,
      itinerary: '19:30 Inloop\n20:00 Wat is NEWNEI?\n20:30 Groepsoefening\n21:30 Vragen & afsluiting',
      accommodation: 'Gezellige zaal aan de Maas, goed bereikbaar met het OV.',
      food: 'Thee en iets lekkers.',
      teacherName: 'Sanne Visser', teacherBio: 'NEWNEI-facilitator en mindfulnesstrainer.',
      amenities: ['Thee & koffie', 'Audio-oefening'],
      startDates: futureDates([8, 22, 36, 50]),
    }),
    retreat({
      id: 'r_chiangmai', image: '/img/ev-chiangmai.jpg', translations: {"en": {"title": "Silence & NEWNEI in the mountains", "description": "Six days in a quiet mountain resort with mornings in silence and afternoons of NEWNEI sessions. For anyone who wants to get away from daily life and is looking for space to truly feel."}, "fr": {"title": "Silence et NEWNEI dans les montagnes", "description": "Six jours dans un paisible resort de montagne : matinées en silence et après-midi de séances NEWNEI. Pour celles et ceux qui veulent s’éloigner du quotidien et cherchent l’espace pour vraiment ressentir."}, "es": {"title": "Silencio y NEWNEI en las montañas", "description": "Seis días en un tranquilo resort de montaña, con mañanas en silencio y tardes de sesiones NEWNEI. Para quien quiere alejarse de la rutina y busca espacio para sentir de verdad."}},
      hostId: 'u_host3', title: 'Stilte & NEWNEI in de bergen',
      type: 'Retreat', region: 'Azië', country: 'Thailand', city: 'Chiang Mai',
      description: 'Zes dagen in een rustig bergresort met ochtenden in stilte en middagen met NEWNEI-sessies. Voor wie even helemaal weg wil uit het dagelijks leven en ruimte zoekt om echt te voelen.',
      packages: [{ name: 'Eenpersoonskamer', price: 990 }],
      nights: 6, capacity: 12, rating: 4.85, reviews: 21, level: 'Alle niveaus', cancellation: 'gemiddeld', instantBooking: false,
      diets: ['Vegetarisch', 'Veganistisch'], languages: ['Nederlands'], certification: cert,
      itinerary: '06:00 Stille meditatie\n07:30 Ontbijt in stilte\n09:00 Wandelmeditatie\n12:00 Lunch\n14:00 NEWNEI-sessie\n17:00 Yin & ademwerk\n19:00 Diner',
      accommodation: 'Bergresort met eenpersoonskamers, omringd door jungle.',
      food: 'Thaise vegetarische maaltijden, drie keer per dag.',
      teacherName: 'Sanne Visser', teacherBio: 'NEWNEI-facilitator, gespecialiseerd in stilte-retreats.',
      amenities: ['Alle maaltijden', 'Eenpersoonskamer', 'Persoonlijk gesprek'],
      startDates: futureDates([25, 60, 95]),
    }),
    retreat({
      id: 'r_toscane', image: '/img/ev-toscane.jpg', translations: {"en": {"title": "Multi-day training: Working with NEWNEI in your practice", "description": "For coaches, therapists and healthcare professionals who want to deepen and apply NEWNEI techniques. Five days of practising in pairs, supervision and peer review, at an agriturismo in Tuscany."}, "fr": {"title": "Formation de plusieurs jours : NEWNEI dans votre pratique", "description": "Pour les coachs, thérapeutes et professionnels de santé qui souhaitent approfondir et appliquer les techniques NEWNEI. Cinq jours de pratique en binôme, de supervision et d’intervision, dans un agritourisme en Toscane."}, "es": {"title": "Formación de varios días: NEWNEI en tu consulta", "description": "Para coaches, terapeutas y profesionales de la salud que quieren profundizar en las técnicas NEWNEI y aplicarlas. Cinco días de práctica en parejas, supervisión e intervisión en un agroturismo de la Toscana."}},
      hostId: 'u_host1', title: 'Meerdaagse training: Werken met NEWNEI in je praktijk',
      type: 'Meerdaagse training', region: 'Europa', country: 'Italië', city: 'Val d’Orcia',
      description: 'Voor coaches, therapeuten en zorgprofessionals die NEWNEI-technieken willen verdiepen en toepassen. Vijf dagen oefenen in tweetallen, supervisie en intervisie, in een agriturismo in Toscane.',
      packages: [{ name: 'Tweepersoonskamer (gedeeld)', price: 1490 }, { name: 'Eenpersoonskamer', price: 1790 }],
      nights: 5, capacity: 16, rating: 4.9, reviews: 17, level: 'Gevorderd', depositPercent: 30, cancellation: 'strikt',
      diets: ['Vegetarisch', 'Biologisch'], languages: ['Nederlands'], certification: cert,
      itinerary: '08:00 Ontbijt\n09:00 Theorie & demonstratie\n11:00 Oefenen in tweetallen\n13:00 Lunch\n15:00 Supervisie\n17:00 Vrije tijd\n19:30 Toscaans diner',
      accommodation: 'Biologisch agriturismo met zwembad en uitzicht over de heuvels.',
      food: 'Ontbijt, lunch en diner met producten van eigen land.',
      teacherName: 'Eva Jansen', teacherBio: 'NEWNEI-facilitator en opleider van zorgprofessionals.',
      amenities: ['Alle maaltijden', 'Lesmateriaal', 'Certificaat van deelname'],
      startDates: futureDates([45, 120]),
    }),
    retreat({
      id: 'r_kreta', image: '/img/ev-kreta.jpg', translations: {"en": {"title": "Workshop weekend: Gently letting go of trauma", "description": "A weekend in which we work with old pain in a safe, gentle way. A small group, lots of personal attention and the Cretan sea in between to unwind."}, "fr": {"title": "Week-end atelier : libérer le trauma en douceur", "description": "Un week-end pour travailler sur d’anciennes blessures de manière sûre et douce. Petit groupe, beaucoup d’attention personnelle et la mer crétoise pour se ressourcer entre les séances."}, "es": {"title": "Fin de semana de taller: Soltar el trauma con suavidad", "description": "Un fin de semana para trabajar viejas heridas de forma segura y suave. Grupo reducido, mucha atención personal y el mar de Creta para recargar energías entre sesiones."}},
      hostId: 'u_host2', title: 'Workshopweekend: Trauma zacht loslaten',
      type: 'Workshop', region: 'Europa', country: 'Griekenland', city: 'Chania',
      description: 'Een weekend waarin we op een veilige, zachte manier werken met oude pijn. Kleine groep, veel persoonlijke aandacht en tussendoor de Kretenzische zee om tot rust te komen.',
      packages: [{ name: 'Gedeelde kamer', price: 590 }, { name: 'Privékamer', price: 740 }],
      nights: 3, capacity: 10, rating: 4.8, reviews: 29, languages: ['Nederlands', 'Engels'], diets: ['Vegetarisch', 'Glutenvrij'], certification: cert,
      itinerary: '08:30 Ontbijt\n10:00 NEWNEI-workshop\n13:00 Lunch\n14:00 Strand & rust\n17:00 Integratiesessie\n20:00 Diner',
      accommodation: 'Stenen dorpshuis met binnenplaats, op loopafstand van zee.',
      food: 'Mediterraan ontbijt, lunch en diner.',
      teacherName: 'Lotte Bakker', teacherBio: 'NEWNEI-facilitator.',
      amenities: ['Alle maaltijden', 'Kleine groep (max. 10)', 'Zeezicht'],
      startDates: futureDates([18, 48, 78]),
    }),
    retreat({
      id: 'r_srilanka', image: '/img/ev-srilanka.jpg', translations: {"en": {"title": "Head & heart – NEWNEI Retreat on the south coast", "description": "Two weeks to reconnect your head and your heart. NEWNEI sessions, Ayurvedic treatments, yoga on the beach and time to land."}, "fr": {"title": "Tête et cœur – Retraite NEWNEI sur la côte sud", "description": "Deux semaines pour reconnecter votre tête et votre cœur. Séances NEWNEI, soins ayurvédiques, yoga sur la plage et du temps pour atterrir."}, "es": {"title": "Cabeza y corazón – Retiro NEWNEI en la costa sur", "description": "Dos semanas para volver a conectar tu cabeza y tu corazón. Sesiones NEWNEI, tratamientos ayurvédicos, yoga en la playa y tiempo para aterrizar."}},
      hostId: 'u_host3', title: 'Hoofd & hart – NEWNEI Retreat aan de zuidkust',
      type: 'Retreat', region: 'Azië', country: 'Sri Lanka', city: 'Tangalle',
      description: 'Twee weken om je hoofd en hart weer met elkaar te verbinden. NEWNEI-sessies, ayurvedische behandelingen, yoga aan het strand en tijd om te landen.',
      packages: [{ name: 'Gardenroom', price: 1890 }, { name: 'Oceanview room', price: 2290 }],
      nights: 14, capacity: 12, rating: 4.9, reviews: 14, depositPercent: 25, diets: ['Vegetarisch', 'Glutenvrij', 'Biologisch'], languages: ['Nederlands'], certification: cert,
      itinerary: '07:00 Yoga aan het strand\n08:30 Ontbijt\n10:00 NEWNEI-sessie\n13:00 Lunch\n15:00 Ayurvedische behandeling\n18:00 Meditatie\n19:00 Diner',
      accommodation: 'Kleinschalig resort direct aan het strand.',
      food: 'Ayurvedisch menu, afgestemd op jou.',
      teacherName: 'Sanne Visser', teacherBio: 'NEWNEI-facilitator.',
      amenities: ['Alle maaltijden', '3 behandelingen', 'Strand'],
      startDates: futureDates([50, 100]),
    }),
    retreat({
      id: 'r_amsterdam', image: '/img/ev-amsterdam.jpg', translations: {"en": {"title": "Masterclass: Your body has a say", "description": "An afternoon masterclass on muscle testing: how your body gives feedback beyond stories and beyond thinking. With live demonstrations and exercises in pairs."}, "fr": {"title": "Masterclass : votre corps a son mot à dire", "description": "Une masterclass d’un après-midi sur les tests musculaires : comment votre corps donne un retour au-delà des récits et de la pensée. Avec des démonstrations en direct et des exercices en binôme."}, "es": {"title": "Masterclass: Tu cuerpo también habla", "description": "Una masterclass de tarde sobre el test muscular: cómo tu cuerpo da información más allá de las historias y del pensamiento. Con demostraciones en directo y ejercicios en parejas."}},
      hostId: 'u_host1', title: 'Masterclass: Je lichaam praat mee',
      type: 'Masterclass', region: 'Europa', country: 'Nederland', city: 'Amsterdam',
      description: 'Een middag-masterclass over spiertesten: hoe je lichaam feedback geeft voorbij verhalen en voorbij denken. Met live demonstraties en oefeningen in tweetallen.',
      packages: [{ name: 'Ticket', price: 69 }],
      nights: 0, capacity: 80, rating: 4.75, reviews: 88, depositPercent: 100, level: 'Beginner', languages: ['Nederlands'], diets: [], certification: cert,
      itinerary: '13:30 Inloop\n14:00 Inleiding spiertesten\n15:00 Live demonstraties\n16:00 Oefenen in tweetallen\n17:00 Vragen & afsluiting',
      accommodation: 'Theaterzaal in Amsterdam-Oost.',
      food: 'Koffie en thee.',
      teacherName: 'Eva Jansen', teacherBio: 'NEWNEI-facilitator.',
      amenities: ['Koffie & thee', 'Handout'],
      startDates: futureDates([15, 43, 71]),
    }),
    retreat({
      id: 'r_kyoto', image: '/img/ev-kyoto.jpg', translations: {"en": {"title": "Zen & NEWNEI in Japan", "description": "Stay in a ryokan with an onsen, walk through cedar forests and combine zazen with NEWNEI sessions. A journey outward and inward."}, "fr": {"title": "Zen et NEWNEI au Japon", "description": "Séjournez dans un ryokan avec onsen, marchez dans les forêts de cèdres et associez zazen et séances NEWNEI. Un voyage vers l’extérieur et vers l’intérieur."}, "es": {"title": "Zen y NEWNEI en Japón", "description": "Alójate en un ryokan con onsen, camina por bosques de cedros y combina zazen con sesiones NEWNEI. Un viaje hacia fuera y hacia dentro."}},
      hostId: 'u_host2', title: 'Zen & NEWNEI in Japan',
      type: 'Retreat', region: 'Azië', country: 'Japan', city: 'Kyoto',
      description: 'Verblijf in een ryokan met onsen, wandel door cederbossen en combineer zazen met NEWNEI-sessies. Een reis naar buiten én naar binnen.',
      packages: [{ name: 'Ryokan-kamer (gedeeld)', price: 2190 }, { name: 'Privékamer met onsen', price: 2790 }],
      nights: 8, capacity: 10, rating: 4.92, reviews: 11, depositPercent: 30, cancellation: 'gemiddeld', languages: ['Nederlands', 'Engels'], certification: cert,
      itinerary: '06:30 Zazen in de tempel\n08:00 Japans ontbijt\n09:30 NEWNEI-sessie\n12:30 Lunch\n14:00 Wandeling of theeceremonie\n18:30 Kaiseki-diner\n20:00 Onsen',
      accommodation: 'Traditionele ryokan in de bergen van Ohara.',
      food: 'Japans ontbijt en diner; vegetarisch op aanvraag.',
      teacherName: 'Lotte Bakker', teacherBio: 'NEWNEI-facilitator.',
      amenities: ['Ryokan met onsen', 'Diner', 'Theeceremonie', 'Gids'],
      startDates: futureDates([65, 130]),
    }),
  ];

  return { users: hosts, retreats, bookings: [], reviews: [], sessions: {} };
}

// Foto per voorbeeld-event (ook gebruikt om oudere databestanden aan te vullen).
const SEED_IMAGES = {"r_algarve": "/img/ev-algarve.jpg", "r_utrecht": "/img/ev-utrecht.jpg", "r_ubud": "/img/ev-ubud.jpg", "r_rotterdam": "/img/ev-rotterdam.jpg", "r_chiangmai": "/img/ev-chiangmai.jpg", "r_toscane": "/img/ev-toscane.jpg", "r_kreta": "/img/ev-kreta.jpg", "r_srilanka": "/img/ev-srilanka.jpg", "r_amsterdam": "/img/ev-amsterdam.jpg", "r_kyoto": "/img/ev-kyoto.jpg"};

module.exports = { SEED_IMAGES, seedData, hashPassword, COUNTRIES, TYPES, LEVELS, DIETS, LANGUAGES, DURATIONS, CANCELLATION, DEFAULTS };
