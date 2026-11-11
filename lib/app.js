'use strict';
// HTTP-applicatie zonder externe dependencies: REST-API + statische bestanden.
const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { hashPassword, COUNTRIES, TYPES, LEVELS, DIETS, LANGUAGES, DURATIONS, CANCELLATION } = require('./seed');
const { LANGS, requestLang, translate } = require('./i18n');

const PUBLIC_DIR = path.join(__dirname, '..', 'public');
const MAX_BODY = 100 * 1024;
const SESSION_DAYS = 30;
const ACTIVE = ['aangevraagd', 'bevestigd']; // statussen die een plek bezetten
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.json': 'application/json',
  '.txt': 'text/plain; charset=utf-8',
};

// message is een Nederlandse sjabloontekst (of een lijst daarvan); vars vult {n} e.d. in.
class HttpError extends Error {
  constructor(status, message, vars) {
    super(Array.isArray(message) ? message.join('. ') : message);
    this.status = status;
    this.parts = Array.isArray(message) ? message : [message];
    this.vars = vars;
  }
  translated(lang) { return this.parts.map((m) => translate(lang, m, this.vars)).join('. '); }
}

const newId = (prefix) => `${prefix}_${crypto.randomBytes(6).toString('hex')}`;
const isDate = (s) => typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s) && !isNaN(Date.parse(s));
const todayStr = () => new Date().toISOString().slice(0, 10);
const daysUntil = (d) => Math.round((Date.parse(d + 'T00:00:00Z') - Date.parse(todayStr() + 'T00:00:00Z')) / 86400000);
const str = (v, max = 200) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
const pickList = (v, allowed) => [...new Set((Array.isArray(v) ? v : []).filter((x) => allowed.includes(x)))];

// Optionele vertalingen van titel en beschrijving: { en: { title, description }, fr: {...} }.
function cleanTranslations(t) {
  const out = {};
  if (!t || typeof t !== 'object') return out;
  for (const lang of LANGS.filter((l) => l !== 'nl')) {
    const title = str(t[lang] && t[lang].title, 120);
    const description = str(t[lang] && t[lang].description, 3000);
    if (title || description) out[lang] = { title, description };
  }
  return out;
}

function publicUser(u) {
  return u && { id: u.id, name: u.name, email: u.email, favorites: u.favorites || [] };
}

function parseCookies(req) {
  const out = {};
  (req.headers.cookie || '').split(';').forEach((p) => {
    const i = p.indexOf('=');
    if (i > 0) out[p.slice(0, i).trim()] = decodeURIComponent(p.slice(i + 1).trim());
  });
  return out;
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on('data', (c) => {
      size += c.length;
      if (size > MAX_BODY) { reject(new HttpError(413, 'Verzoek te groot')); req.destroy(); return; }
      chunks.push(c);
    });
    req.on('end', () => {
      if (!chunks.length) return resolve({});
      try { resolve(JSON.parse(Buffer.concat(chunks).toString('utf8'))); }
      catch { reject(new HttpError(400, 'Ongeldige JSON')); }
    });
    req.on('error', reject);
  });
}

function createApp(store, { sitePassword = '', demo = false } = {}) {
  const digest = (s) => crypto.createHash('sha256').update(String(s)).digest();
  function passwordOk(req) {
    const m = /^Basic\s+(.+)$/i.exec(req.headers.authorization || '');
    if (!m) return false;
    const decoded = Buffer.from(m[1], 'base64').toString('utf8');
    const pw = decoded.slice(decoded.indexOf(':') + 1);
    return crypto.timingSafeEqual(digest(pw), digest(sitePassword));
  }

  // ---------- helpers ----------
  function currentUser(req) {
    const token = parseCookies(req).sid;
    const s = token && store.sessions[token];
    if (!s) return null;
    if (Date.parse(s.expires) < Date.now()) { delete store.sessions[token]; return null; }
    return store.users.find((u) => u.id === s.userId) || null;
  }

  function requireUser(req) {
    const u = currentUser(req);
    if (!u) throw new HttpError(401, 'Log eerst in');
    return u;
  }

  function startSession(res, user) {
    const token = crypto.randomBytes(32).toString('hex');
    const expires = new Date(Date.now() + SESSION_DAYS * 86400000);
    store.sessions[token] = { userId: user.id, expires: expires.toISOString() };
    store.save();
    res.setHeader('Set-Cookie', `sid=${token}; HttpOnly; SameSite=Lax; Path=/; Expires=${expires.toUTCString()}`);
  }

  const findRetreat = (id) => {
    const r = store.retreats.find((x) => x.id === id);
    if (!r) throw new HttpError(404, 'Event niet gevonden');
    return r;
  };

  function bookedSeats(retreatId, startDate) {
    return store.bookings
      .filter((b) => b.retreatId === retreatId && b.startDate === startDate && ACTIVE.includes(b.status))
      .reduce((n, b) => n + b.guests, 0);
  }

  // Combineert de startwaarde (bijv. geïmporteerde reviews) met reviews op het platform.
  function ratingOf(r) {
    const own = store.reviews.filter((v) => v.retreatId === r.id);
    const count = (r.reviews || 0) + own.length;
    const sum = (r.rating || 0) * (r.reviews || 0) + own.reduce((n, v) => n + v.rating, 0);
    return { rating: count ? Math.round((sum / count) * 100) / 100 : 0, reviews: count };
  }

  function present(r, { detail = false } = {}) {
    const host = store.users.find((u) => u.id === r.hostId);
    const dates = r.startDates
      .filter((d) => d >= todayStr())
      .sort()
      .map((d) => ({ date: d, available: Math.max(0, r.capacity - bookedSeats(r.id, d)) }));
    const out = { ...r, ...ratingOf(r), hostName: host ? host.name : 'Onbekend', dates, cancellationText: CANCELLATION[r.cancellation].text };
    if (detail) {
      out.reviewList = store.reviews
        .filter((v) => v.retreatId === r.id)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
        .map((v) => ({ ...v, userName: (store.users.find((u) => u.id === v.userId) || {}).name || 'Gast' }));
    }
    return out;
  }

  function validateRetreat(b) {
    const errors = [];
    const packages = (Array.isArray(b.packages) ? b.packages : [])
      .map((p) => ({ name: str(p && p.name, 60), price: Math.round(Number(p && p.price)) }))
      .filter((p) => p.name || p.price)
      .slice(0, 6);
    const r = {
      title: str(b.title, 120),
      type: str(b.type, 40),
      region: str(b.region, 20),
      country: str(b.country, 60),
      city: str(b.city, 60),
      description: str(b.description, 3000),
      itinerary: str(b.itinerary, 3000),
      accommodation: str(b.accommodation, 2000),
      food: str(b.food, 2000),
      teacherName: str(b.teacherName, 80),
      teacherBio: str(b.teacherBio, 1500),
      certification: str(b.certification, 120),
      packages,
      nights: Math.round(Number(b.nights)),
      capacity: Math.round(Number(b.capacity)),
      depositPercent: Math.round(Number(b.depositPercent ?? 20)),
      cancellation: str(b.cancellation, 20),
      level: str(b.level, 20),
      diets: pickList(b.diets, DIETS),
      languages: pickList(b.languages, LANGUAGES),
      instantBooking: b.instantBooking === true || b.instantBooking === 'true',
      image: str(b.image, 500),
      amenities: (Array.isArray(b.amenities) ? b.amenities : String(b.amenities || '').split(','))
        .map((a) => str(a, 60)).filter(Boolean).slice(0, 15),
      translations: cleanTranslations(b.translations),
      startDates: [...new Set((Array.isArray(b.startDates) ? b.startDates : []).filter(isDate))].sort().slice(0, 30),
    };
    if (r.title.length < 5) errors.push('Titel moet minstens 5 tekens zijn');
    if (!TYPES.includes(r.type)) errors.push('Kies een geldig type event');
    if (!COUNTRIES[r.region]) errors.push('Kies Europa of Azië');
    else if (!COUNTRIES[r.region].includes(r.country)) errors.push('Kies een land binnen de regio');
    if (!r.city) errors.push('Plaats is verplicht');
    if (r.description.length < 30) errors.push('Beschrijving moet minstens 30 tekens zijn');
    if (!packages.length) errors.push('Voeg minstens één ticket- of kameroptie met prijs toe');
    if (packages.some((p) => !p.name || !(p.price >= 1 && p.price <= 50000))) errors.push('Elke optie heeft een naam en een prijs tussen €1 en €50.000 nodig');
    if (!(r.nights >= 0 && r.nights <= 90)) errors.push('Aantal nachten moet tussen 0 (dagevent) en 90 liggen');
    if (b.certified !== true) errors.push('Bevestig dat je een NEWNEI-opleiding hebt afgerond');
    if (r.certification.length < 3) errors.push('Vul je NEWNEI-opleiding of certificering in');
    if (!(r.capacity >= 1 && r.capacity <= 200)) errors.push('Capaciteit moet tussen 1 en 200 liggen');
    if (!(r.depositPercent >= 0 && r.depositPercent <= 100)) errors.push('Aanbetaling moet tussen 0% en 100% liggen');
    if (!CANCELLATION[r.cancellation]) errors.push('Kies een annuleringsbeleid');
    if (!LEVELS.includes(r.level)) errors.push('Kies een niveau');
    if (!r.languages.length) errors.push('Kies minstens één taal');
    if (r.image && !/^(https:\/\/\S+|\/img\/[\w.-]+\.(jpe?g|png|webp))$/i.test(r.image)) errors.push('Afbeelding moet een https-URL zijn');
    if (!r.startDates.some((d) => d >= todayStr())) errors.push('Voeg minstens één toekomstige startdatum toe');
    if (errors.length) throw new HttpError(400, errors);
    r.pricePerPerson = Math.min(...packages.map((p) => p.price));
    return r;
  }

  // ---------- routes ----------
  const routes = [];
  const route = (method, pattern, handler) => {
    const keys = [];
    const re = new RegExp('^' + pattern.replace(/:(\w+)/g, (_, k) => { keys.push(k); return '([^/]+)'; }) + '$');
    routes.push({ method, re, keys, handler });
  };

  route('GET', '/api/meta', () => ({
    demo, countries: COUNTRIES, types: TYPES, levels: LEVELS, diets: DIETS, languages: LANGUAGES,
    durations: Object.keys(DURATIONS),
    cancellation: Object.fromEntries(Object.entries(CANCELLATION).map(([k, v]) => [k, { label: v.label, text: v.text }])),
  }));

  // --- auth ---
  route('GET', '/api/auth/me', ({ req }) => ({ user: publicUser(currentUser(req)) }));

  route('POST', '/api/auth/register', async ({ req, res }) => {
    const b = await readBody(req);
    const name = str(b.name, 80);
    const email = str(b.email, 120).toLowerCase();
    const password = typeof b.password === 'string' ? b.password : '';
    if (name.length < 2) throw new HttpError(400, 'Vul je naam in');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new HttpError(400, 'Ongeldig e-mailadres');
    if (password.length < 8) throw new HttpError(400, 'Wachtwoord moet minstens 8 tekens zijn');
    if (store.users.some((u) => u.email === email)) throw new HttpError(409, 'Dit e-mailadres is al geregistreerd');
    const { salt, hash } = hashPassword(password);
    const user = { id: newId('u'), name, email, salt, passHash: hash, favorites: [], createdAt: new Date().toISOString() };
    store.users.push(user);
    startSession(res, user);
    return { user: publicUser(user) };
  });

  route('POST', '/api/auth/login', async ({ req, res }) => {
    const b = await readBody(req);
    const email = str(b.email, 120).toLowerCase();
    const user = store.users.find((u) => u.email === email);
    const ok = user && typeof b.password === 'string' && crypto.timingSafeEqual(
      Buffer.from(hashPassword(b.password, user.salt).hash, 'hex'), Buffer.from(user.passHash, 'hex'));
    if (!ok) throw new HttpError(401, 'Onjuist e-mailadres of wachtwoord');
    startSession(res, user);
    return { user: publicUser(user) };
  });

  route('POST', '/api/auth/logout', ({ req, res }) => {
    const token = parseCookies(req).sid;
    if (token && store.sessions[token]) { delete store.sessions[token]; store.save(); }
    res.setHeader('Set-Cookie', 'sid=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0');
    return { ok: true };
  });

  // --- retreats ---
  route('GET', '/api/retreats', ({ query }) => {
    const q = (query.get('q') || '').toLowerCase().trim();
    const get = (k) => query.get(k) || '';
    const maxPrice = Number(get('maxPrice')) || Infinity;
    const month = get('month'); // YYYY-MM
    const duration = DURATIONS[get('duration')];
    let list = store.retreats.map((r) => present(r)).filter((r) => r.dates.length);
    if (q) list = list.filter((r) => [r.title, r.city, r.country, r.type, r.description, r.teacherName, ...Object.values(r.translations || {}).flatMap((t) => [t.title, t.description])].join(' ').toLowerCase().includes(q));
    if (get('region')) list = list.filter((r) => r.region === get('region'));
    if (get('country')) list = list.filter((r) => r.country === get('country'));
    if (get('type')) list = list.filter((r) => r.type === get('type'));
    if (get('level')) list = list.filter((r) => r.level === get('level') || r.level === 'Alle niveaus');
    if (get('diet')) list = list.filter((r) => r.diets.includes(get('diet')));
    if (get('language')) list = list.filter((r) => r.languages.includes(get('language')));
    if (get('flexible') === '1') list = list.filter((r) => r.cancellation === 'flexibel');
    if (get('instant') === '1') list = list.filter((r) => r.instantBooking);
    if (duration) list = list.filter((r) => r.nights >= duration[0] && r.nights <= duration[1]);
    list = list.filter((r) => r.pricePerPerson <= maxPrice);
    if (month) list = list.filter((r) => r.dates.some((d) => d.date.startsWith(month) && d.available > 0));
    if (get('ids')) { const ids = get('ids').split(','); list = list.filter((r) => ids.includes(r.id)); }
    const sorters = {
      aanbevolen: (a, b) => b.rating * Math.log(b.reviews + 2) - a.rating * Math.log(a.reviews + 2),
      'prijs-laag': (a, b) => a.pricePerPerson - b.pricePerPerson,
      'prijs-hoog': (a, b) => b.pricePerPerson - a.pricePerPerson,
      datum: (a, b) => a.dates[0].date.localeCompare(b.dates[0].date),
      beoordeling: (a, b) => b.rating - a.rating,
      nieuw: (a, b) => b.createdAt.localeCompare(a.createdAt),
    };
    list.sort(sorters[get('sort')] || sorters.aanbevolen);
    return { retreats: list };
  });

  route('GET', '/api/retreats/:id', ({ params }) => ({ retreat: present(findRetreat(params.id), { detail: true }) }));

  route('POST', '/api/retreats', async ({ req }) => {
    const user = requireUser(req);
    const data = validateRetreat(await readBody(req));
    const retreat = { id: newId('r'), hostId: user.id, rating: 0, reviews: 0, createdAt: new Date().toISOString(), ...data };
    store.retreats.push(retreat);
    store.save();
    return { retreat: present(retreat) };
  });

  route('PUT', '/api/retreats/:id', async ({ req, params }) => {
    const user = requireUser(req);
    const r = findRetreat(params.id);
    if (r.hostId !== user.id) throw new HttpError(403, 'Dit is niet jouw event');
    Object.assign(r, validateRetreat(await readBody(req)));
    store.save();
    return { retreat: present(r) };
  });

  route('DELETE', '/api/retreats/:id', ({ req, params }) => {
    const user = requireUser(req);
    const r = findRetreat(params.id);
    if (r.hostId !== user.id) throw new HttpError(403, 'Dit is niet jouw event');
    const active = store.bookings.some((b) => b.retreatId === r.id && ACTIVE.includes(b.status) && b.startDate >= todayStr());
    if (active) throw new HttpError(409, 'Er zijn nog actieve boekingen voor dit event');
    store.retreats.splice(store.retreats.indexOf(r), 1);
    store.save();
    return { ok: true };
  });

  // --- reviews ---
  route('POST', '/api/retreats/:id/reviews', async ({ req, params }) => {
    const user = requireUser(req);
    const r = findRetreat(params.id);
    const b = await readBody(req);
    const hasBooking = store.bookings.some((x) => x.retreatId === r.id && x.userId === user.id && x.status === 'bevestigd');
    if (!hasBooking) throw new HttpError(403, 'Alleen gasten met een bevestigde boeking kunnen een review schrijven');
    if (store.reviews.some((v) => v.retreatId === r.id && v.userId === user.id)) throw new HttpError(409, 'Je hebt dit event al beoordeeld');
    const rating = Math.round(Number(b.rating));
    const text = str(b.text, 2000);
    if (!(rating >= 1 && rating <= 5)) throw new HttpError(400, 'Geef een score van 1 tot 5 sterren');
    if (text.length < 10) throw new HttpError(400, 'Schrijf minstens 10 tekens');
    const review = { id: newId('v'), retreatId: r.id, userId: user.id, rating, text, createdAt: new Date().toISOString() };
    store.reviews.push(review);
    store.save();
    return { review };
  });

  // --- favorieten ---
  route('POST', '/api/favorites/:id', ({ req, params }) => {
    const user = requireUser(req);
    findRetreat(params.id);
    const i = user.favorites.indexOf(params.id);
    if (i >= 0) user.favorites.splice(i, 1); else user.favorites.push(params.id);
    store.save();
    return { favorites: user.favorites, saved: i < 0 };
  });

  // --- boekingen ---
  route('POST', '/api/bookings', async ({ req }) => {
    const user = requireUser(req);
    const b = await readBody(req);
    const r = findRetreat(b.retreatId);
    if (r.hostId === user.id) throw new HttpError(400, 'Je kunt je eigen event niet boeken');
    if (!r.startDates.includes(b.startDate) || b.startDate < todayStr()) throw new HttpError(400, 'Kies een geldige startdatum');
    const pkg = r.packages.find((p) => p.name === b.packageName) || (r.packages.length === 1 ? r.packages[0] : null);
    if (!pkg) throw new HttpError(400, 'Kies een ticket- of kameroptie');
    const guests = Math.round(Number(b.guests));
    if (!(guests >= 1 && guests <= 20)) throw new HttpError(400, 'Aantal gasten moet tussen 1 en 20 liggen');
    const available = r.capacity - bookedSeats(r.id, b.startDate);
    if (guests > available) throw new HttpError(409, available ? 'Nog maar {n} plek(ken) beschikbaar' : 'Deze datum is volgeboekt', { n: available });
    const totalPrice = guests * pkg.price;
    const booking = {
      id: newId('b'), retreatId: r.id, userId: user.id, startDate: b.startDate, guests,
      packageName: pkg.name, pricePerPerson: pkg.price, totalPrice,
      deposit: Math.round((totalPrice * r.depositPercent) / 100),
      cancellation: r.cancellation, note: str(b.note, 1000),
      status: r.instantBooking ? 'bevestigd' : 'aangevraagd', createdAt: new Date().toISOString(),
    };
    store.bookings.push(booking);
    store.save();
    return { booking };
  });

  function hostBooking(req, id) {
    const user = requireUser(req);
    const b = store.bookings.find((x) => x.id === id);
    if (!b) throw new HttpError(404, 'Boeking niet gevonden');
    const r = store.retreats.find((x) => x.id === b.retreatId);
    return { user, b, r, isHost: !!r && r.hostId === user.id };
  }

  route('POST', '/api/bookings/:id/accept', ({ req, params }) => {
    const { b, isHost } = hostBooking(req, params.id);
    if (!isHost) throw new HttpError(403, 'Alleen de facilitator kan aanvragen accepteren');
    if (b.status !== 'aangevraagd') throw new HttpError(400, 'Deze boeking is geen openstaande aanvraag');
    b.status = 'bevestigd';
    b.decidedAt = new Date().toISOString();
    store.save();
    return { booking: b };
  });

  route('POST', '/api/bookings/:id/decline', ({ req, params }) => {
    const { b, isHost } = hostBooking(req, params.id);
    if (!isHost) throw new HttpError(403, 'Alleen de facilitator kan aanvragen afwijzen');
    if (b.status !== 'aangevraagd') throw new HttpError(400, 'Deze boeking is geen openstaande aanvraag');
    b.status = 'afgewezen';
    b.refund = b.deposit;
    b.decidedAt = new Date().toISOString();
    store.save();
    return { booking: b };
  });

  route('POST', '/api/bookings/:id/cancel', ({ req, params }) => {
    const { user, b, isHost } = hostBooking(req, params.id);
    if (b.userId !== user.id && !isHost) throw new HttpError(403, 'Geen toegang tot deze boeking');
    if (!ACTIVE.includes(b.status)) throw new HttpError(400, 'Deze boeking kan niet meer worden geannuleerd');
    const policy = CANCELLATION[b.cancellation] || CANCELLATION.flexibel;
    // Annuleert de host of was het nog een aanvraag, dan krijgt de gast altijd alles terug.
    const fullRefund = isHost || b.status === 'aangevraagd' || (policy.refundDays !== null && daysUntil(b.startDate) >= policy.refundDays);
    b.status = 'geannuleerd';
    b.refund = fullRefund ? b.deposit : 0;
    b.cancelledBy = isHost && b.userId !== user.id ? 'host' : 'gast';
    b.cancelledAt = new Date().toISOString();
    store.save();
    return { booking: b };
  });

  // --- account ---
  route('GET', '/api/me/bookings', ({ req }) => {
    const user = requireUser(req);
    const bookings = store.bookings.filter((b) => b.userId === user.id).map((b) => {
      const r = store.retreats.find((x) => x.id === b.retreatId);
      const reviewed = store.reviews.some((v) => v.retreatId === b.retreatId && v.userId === user.id);
      return {
        ...b, reviewed,
        retreat: r ? { id: r.id, title: r.title, translations: r.translations, city: r.city, country: r.country, type: r.type, nights: r.nights, image: r.image } : null,
      };
    }).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    return { bookings };
  });

  route('GET', '/api/me/listings', ({ req }) => {
    const user = requireUser(req);
    const listings = store.retreats.filter((r) => r.hostId === user.id).map((r) => {
      const bookings = store.bookings.filter((b) => b.retreatId === r.id).map((b) => {
        const guest = store.users.find((u) => u.id === b.userId);
        return { ...b, guestName: guest ? guest.name : '?', guestEmail: guest ? guest.email : '' };
      }).sort((a, b) => a.startDate.localeCompare(b.startDate));
      const revenue = bookings.filter((b) => b.status === 'bevestigd').reduce((n, b) => n + b.totalPrice, 0);
      const pending = bookings.filter((b) => b.status === 'aangevraagd').length;
      return { ...present(r), bookings, revenue, pending };
    });
    return { listings };
  });

  // ---------- static files ----------
  function serveStatic(req, res, pathname) {
    let rel;
    try { rel = decodeURIComponent(pathname); } catch { res.writeHead(400); return res.end(); }
    if (rel === '/' || !path.extname(rel)) rel = '/index.html'; // SPA-fallback
    const file = path.normalize(path.join(PUBLIC_DIR, rel));
    if (!file.startsWith(PUBLIC_DIR + path.sep)) { res.writeHead(403); return res.end(); }
    fs.readFile(file, (err, buf) => {
      if (err) { res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }); return res.end('Niet gevonden'); }
      res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream', 'Cache-Control': rel.startsWith('/img/') ? 'public, max-age=3600' : 'no-cache' });
      res.end(buf);
    });
  }

  return http.createServer(async (req, res) => {
    const url = new URL(req.url, 'http://localhost');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    // Niet indexeren door zoekmachines of AI-crawlers (aanvulling op robots.txt en de meta-tag).
    res.setHeader('X-Robots-Tag', 'noindex, nofollow, noarchive, nosnippet, noimageindex, noai, noimageai');
    // Optioneel wachtwoord voor de hele site (HTTP Basic Auth, gebruikersnaam maakt niet uit).
    if (sitePassword && url.pathname !== '/robots.txt' && !passwordOk(req)) {
      res.writeHead(401, { 'WWW-Authenticate': 'Basic realm="NEWNEI Events", charset="UTF-8"', 'Content-Type': 'text/plain; charset=utf-8' });
      return res.end('Wachtwoord vereist / Password required / Mot de passe requis');
    }
    if (!url.pathname.startsWith('/api/')) return serveStatic(req, res, url.pathname);

    const send = (status, body) => {
      res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify(body));
    };
    // Eenvoudige CSRF-bescherming: muterende verzoeken moeten JSON zijn.
    if (req.method !== 'GET' && !(req.headers['content-type'] || '').includes('application/json')) {
      return send(415, { error: translate(requestLang(req), 'Content-Type moet application/json zijn') });
    }
    const match = routes.find((r) => r.method === req.method && r.re.test(url.pathname));
    if (!match) return send(404, { error: translate(requestLang(req), 'Onbekend endpoint') });
    const values = url.pathname.match(match.re).slice(1);
    try {
      const params = Object.fromEntries(match.keys.map((k, i) => [k, decodeURIComponent(values[i])]));
      send(200, await match.handler({ req, res, params, query: url.searchParams }));
    } catch (e) {
      if (!(e instanceof HttpError) && !(e instanceof URIError)) console.error(e);
      const lang = requestLang(req);
      send(e.status || (e instanceof URIError ? 400 : 500), { error: e instanceof HttpError ? e.translated(lang) : translate(lang, 'Er ging iets mis op de server') });
    }
  });
}

module.exports = { createApp };
