'use strict';
// HTTP-applicatie zonder externe dependencies: REST-API + statische bestanden.
const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { hashPassword, COUNTRIES, TYPES } = require('./seed');

const PUBLIC_DIR = path.join(__dirname, '..', 'public');
const MAX_BODY = 100 * 1024;
const SESSION_DAYS = 30;
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.json': 'application/json',
};

class HttpError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}

const id = (prefix) => `${prefix}_${crypto.randomBytes(6).toString('hex')}`;
const isDate = (s) => typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s) && !isNaN(Date.parse(s));
const todayStr = () => new Date().toISOString().slice(0, 10);
const str = (v, max = 200) => (typeof v === 'string' ? v.trim().slice(0, max) : '');

function publicUser(u) {
  return u && { id: u.id, name: u.name, email: u.email };
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

function createApp(store) {
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

  function bookedSeats(retreatId, startDate) {
    return store.bookings
      .filter((b) => b.retreatId === retreatId && b.startDate === startDate && b.status === 'bevestigd')
      .reduce((n, b) => n + b.guests, 0);
  }

  function withAvailability(r) {
    const host = store.users.find((u) => u.id === r.hostId);
    const dates = r.startDates
      .filter((d) => d >= todayStr())
      .sort()
      .map((d) => ({ date: d, available: Math.max(0, r.capacity - bookedSeats(r.id, d)) }));
    return { ...r, hostName: host ? host.name : 'Onbekend', dates };
  }

  function validateRetreat(b) {
    const errors = [];
    const r = {
      title: str(b.title, 120),
      type: str(b.type, 40),
      region: str(b.region, 20),
      country: str(b.country, 60),
      city: str(b.city, 60),
      description: str(b.description, 3000),
      pricePerPerson: Math.round(Number(b.pricePerPerson)),
      nights: Math.round(Number(b.nights)),
      capacity: Math.round(Number(b.capacity)),
      image: str(b.image, 500),
      amenities: (Array.isArray(b.amenities) ? b.amenities : String(b.amenities || '').split(','))
        .map((a) => str(a, 60)).filter(Boolean).slice(0, 15),
      startDates: [...new Set((Array.isArray(b.startDates) ? b.startDates : []).filter(isDate))].sort().slice(0, 30),
    };
    if (r.title.length < 5) errors.push('Titel moet minstens 5 tekens zijn');
    if (!TYPES.includes(r.type)) errors.push('Kies een geldig type retreat');
    if (!COUNTRIES[r.region]) errors.push('Kies Europa of Azië');
    else if (!COUNTRIES[r.region].includes(r.country)) errors.push('Kies een land binnen de regio');
    if (!r.city) errors.push('Plaats is verplicht');
    if (r.description.length < 30) errors.push('Beschrijving moet minstens 30 tekens zijn');
    if (!(r.pricePerPerson >= 1 && r.pricePerPerson <= 50000)) errors.push('Prijs moet tussen €1 en €50.000 liggen');
    if (!(r.nights >= 1 && r.nights <= 90)) errors.push('Aantal nachten moet tussen 1 en 90 liggen');
    if (!(r.capacity >= 1 && r.capacity <= 200)) errors.push('Capaciteit moet tussen 1 en 200 liggen');
    if (r.image && !/^https:\/\/\S+$/i.test(r.image)) errors.push('Afbeelding moet een https-URL zijn');
    if (!r.startDates.some((d) => d >= todayStr())) errors.push('Voeg minstens één toekomstige startdatum toe');
    if (errors.length) throw new HttpError(400, errors.join('. '));
    return r;
  }

  // ---------- routes ----------
  const routes = [];
  const route = (method, pattern, handler) => {
    const keys = [];
    const re = new RegExp('^' + pattern.replace(/:(\w+)/g, (_, k) => { keys.push(k); return '([^/]+)'; }) + '$');
    routes.push({ method, re, keys, handler });
  };

  route('GET', '/api/meta', () => ({ countries: COUNTRIES, types: TYPES }));

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
    const user = { id: id('u'), name, email, salt, passHash: hash, createdAt: new Date().toISOString() };
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

  route('GET', '/api/retreats', ({ query }) => {
    const q = (query.get('q') || '').toLowerCase().trim();
    const region = query.get('region');
    const country = query.get('country');
    const type = query.get('type');
    const maxPrice = Number(query.get('maxPrice')) || Infinity;
    const month = query.get('month'); // YYYY-MM
    const sort = query.get('sort') || 'aanbevolen';
    let list = store.retreats.map(withAvailability).filter((r) => r.dates.length);
    if (q) list = list.filter((r) => [r.title, r.city, r.country, r.type, r.description].join(' ').toLowerCase().includes(q));
    if (region) list = list.filter((r) => r.region === region);
    if (country) list = list.filter((r) => r.country === country);
    if (type) list = list.filter((r) => r.type === type);
    list = list.filter((r) => r.pricePerPerson <= maxPrice);
    if (month) list = list.filter((r) => r.dates.some((d) => d.date.startsWith(month) && d.available > 0));
    const sorters = {
      aanbevolen: (a, b) => b.rating * Math.log(b.reviews + 2) - a.rating * Math.log(a.reviews + 2),
      'prijs-laag': (a, b) => a.pricePerPerson - b.pricePerPerson,
      'prijs-hoog': (a, b) => b.pricePerPerson - a.pricePerPerson,
      datum: (a, b) => a.dates[0].date.localeCompare(b.dates[0].date),
      nieuw: (a, b) => b.createdAt.localeCompare(a.createdAt),
    };
    list.sort(sorters[sort] || sorters.aanbevolen);
    return { retreats: list };
  });

  route('GET', '/api/retreats/:id', ({ params }) => {
    const r = store.retreats.find((x) => x.id === params.id);
    if (!r) throw new HttpError(404, 'Retreat niet gevonden');
    return { retreat: withAvailability(r) };
  });

  route('POST', '/api/retreats', async ({ req }) => {
    const user = requireUser(req);
    const data = validateRetreat(await readBody(req));
    const retreat = { id: id('r'), hostId: user.id, rating: 0, reviews: 0, createdAt: new Date().toISOString(), ...data };
    store.retreats.push(retreat);
    store.save();
    return { retreat: withAvailability(retreat) };
  });

  route('PUT', '/api/retreats/:id', async ({ req, params }) => {
    const user = requireUser(req);
    const r = store.retreats.find((x) => x.id === params.id);
    if (!r) throw new HttpError(404, 'Retreat niet gevonden');
    if (r.hostId !== user.id) throw new HttpError(403, 'Dit is niet jouw retreat');
    Object.assign(r, validateRetreat(await readBody(req)));
    store.save();
    return { retreat: withAvailability(r) };
  });

  route('DELETE', '/api/retreats/:id', ({ req, params }) => {
    const user = requireUser(req);
    const idx = store.retreats.findIndex((x) => x.id === params.id);
    if (idx < 0) throw new HttpError(404, 'Retreat niet gevonden');
    if (store.retreats[idx].hostId !== user.id) throw new HttpError(403, 'Dit is niet jouw retreat');
    const active = store.bookings.some((b) => b.retreatId === params.id && b.status === 'bevestigd' && b.startDate >= todayStr());
    if (active) throw new HttpError(409, 'Er zijn nog actieve boekingen voor deze retreat');
    store.retreats.splice(idx, 1);
    store.save();
    return { ok: true };
  });

  route('POST', '/api/bookings', async ({ req }) => {
    const user = requireUser(req);
    const b = await readBody(req);
    const r = store.retreats.find((x) => x.id === b.retreatId);
    if (!r) throw new HttpError(404, 'Retreat niet gevonden');
    if (r.hostId === user.id) throw new HttpError(400, 'Je kunt je eigen retreat niet boeken');
    if (!r.startDates.includes(b.startDate) || b.startDate < todayStr()) throw new HttpError(400, 'Kies een geldige startdatum');
    const guests = Math.round(Number(b.guests));
    if (!(guests >= 1 && guests <= 20)) throw new HttpError(400, 'Aantal gasten moet tussen 1 en 20 liggen');
    const available = r.capacity - bookedSeats(r.id, b.startDate);
    if (guests > available) throw new HttpError(409, available ? `Nog maar ${available} plek(ken) beschikbaar` : 'Deze datum is volgeboekt');
    const booking = {
      id: id('b'), retreatId: r.id, userId: user.id, startDate: b.startDate, guests,
      totalPrice: guests * r.pricePerPerson, note: str(b.note, 1000),
      status: 'bevestigd', createdAt: new Date().toISOString(),
    };
    store.bookings.push(booking);
    store.save();
    return { booking };
  });

  route('POST', '/api/bookings/:id/cancel', ({ req, params }) => {
    const user = requireUser(req);
    const b = store.bookings.find((x) => x.id === params.id);
    if (!b) throw new HttpError(404, 'Boeking niet gevonden');
    const r = store.retreats.find((x) => x.id === b.retreatId);
    if (b.userId !== user.id && (!r || r.hostId !== user.id)) throw new HttpError(403, 'Geen toegang tot deze boeking');
    if (b.status !== 'bevestigd') throw new HttpError(400, 'Boeking is al geannuleerd');
    b.status = 'geannuleerd';
    b.cancelledAt = new Date().toISOString();
    store.save();
    return { booking: b };
  });

  route('GET', '/api/me/bookings', ({ req }) => {
    const user = requireUser(req);
    const bookings = store.bookings.filter((b) => b.userId === user.id).map((b) => {
      const r = store.retreats.find((x) => x.id === b.retreatId);
      return { ...b, retreat: r ? { id: r.id, title: r.title, city: r.city, country: r.country, type: r.type, nights: r.nights, image: r.image } : null };
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
      return { ...withAvailability(r), bookings, revenue };
    });
    return { listings };
  });

  // ---------- static files ----------
  function serveStatic(req, res, pathname) {
    let rel = decodeURIComponent(pathname);
    if (rel === '/' || !path.extname(rel)) rel = '/index.html'; // SPA-fallback
    const file = path.normalize(path.join(PUBLIC_DIR, rel));
    if (!file.startsWith(PUBLIC_DIR + path.sep)) { res.writeHead(403); return res.end(); }
    fs.readFile(file, (err, buf) => {
      if (err) { res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }); return res.end('Niet gevonden'); }
      res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-cache' });
      res.end(buf);
    });
  }

  return http.createServer(async (req, res) => {
    const url = new URL(req.url, 'http://localhost');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    if (!url.pathname.startsWith('/api/')) return serveStatic(req, res, url.pathname);

    const send = (status, body) => {
      res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify(body));
    };
    // Eenvoudige CSRF-bescherming: muterende verzoeken moeten JSON zijn.
    if (req.method !== 'GET' && !(req.headers['content-type'] || '').includes('application/json')) {
      return send(415, { error: 'Content-Type moet application/json zijn' });
    }
    const match = routes.find((r) => r.method === req.method && r.re.test(url.pathname));
    if (!match) return send(404, { error: 'Onbekend endpoint' });
    const values = url.pathname.match(match.re).slice(1);
    const params = Object.fromEntries(match.keys.map((k, i) => [k, decodeURIComponent(values[i])]));
    try {
      send(200, await match.handler({ req, res, params, query: url.searchParams }));
    } catch (e) {
      if (!(e instanceof HttpError)) console.error(e);
      send(e.status || 500, { error: e instanceof HttpError ? e.message : 'Er ging iets mis op de server' });
    }
  });
}

module.exports = { createApp };
