'use strict';
const { test, before, after } = require('node:test');
const assert = require('node:assert');
const { Store } = require('../lib/store');
const { createApp } = require('../lib/app');

let server, base;
before(async () => {
  server = createApp(new Store(null)); // in-memory
  await new Promise((r) => server.listen(0, r));
  base = `http://localhost:${server.address().port}`;
});
after(() => server.close());

function client() {
  let cookie = '';
  return async (path, { method = 'GET', body } = {}) => {
    const res = await fetch(base + path, {
      method,
      headers: { ...(method !== 'GET' ? { 'Content-Type': 'application/json' } : {}), ...(cookie ? { Cookie: cookie } : {}) },
      body: body ? JSON.stringify(body) : undefined,
    });
    const set = res.headers.get('set-cookie');
    if (set) cookie = set.split(';')[0];
    return { status: res.status, data: await res.json() };
  };
}

test('lijst en filters', async () => {
  const c = client();
  const all = await c('/api/retreats');
  assert.equal(all.status, 200);
  assert.ok(all.data.retreats.length >= 10);
  const asia = await c('/api/retreats?region=' + encodeURIComponent('Azië'));
  assert.ok(asia.data.retreats.every((r) => r.region === 'Azië'));
  const cheap = await c('/api/retreats?maxPrice=700&sort=prijs-laag');
  assert.ok(cheap.data.retreats.every((r) => r.pricePerPerson <= 700));
});

test('host plaatst retreat, gast boekt, capaciteit wordt bewaakt', async () => {
  const host = client();
  const guest = client();
  assert.equal((await host('/api/retreats', { method: 'POST', body: {} })).status, 401);
  assert.equal((await host('/api/auth/register', { method: 'POST', body: { name: 'Host', email: 'h@x.nl', password: 'geheim123' } })).status, 200);
  await guest('/api/auth/register', { method: 'POST', body: { name: 'Gast', email: 'g@x.nl', password: 'geheim123' } });

  const date = new Date(Date.now() + 20 * 86400000).toISOString().slice(0, 10);
  const bad = await host('/api/retreats', { method: 'POST', body: { title: 'x' } });
  assert.match(bad.data.error, /NEWNEI-opleiding/);
  assert.equal(bad.status, 400);

  const created = await host('/api/retreats', { method: 'POST', body: {
    title: 'Retreat in Hoi An', type: 'Retreat', region: 'Azië', country: 'Vietnam', city: 'Hoi An',
    description: 'Een prachtige retreat tussen de rijstvelden met dagelijks yoga.',
    packages: [{ name: 'Gedeeld', price: 500 }, { name: 'Privé', price: 800 }], depositPercent: 20,
    cancellation: 'flexibel', level: 'Beginner', languages: ['Engels'], diets: ['Veganistisch'], instantBooking: true, certification: 'NEWNEI-opleiding 2025', certified: true,
    nights: 5, capacity: 3, amenities: 'Ontbijt, Yogamat', startDates: [date],
  } });
  assert.equal(created.status, 200, JSON.stringify(created.data));
  const r = created.data.retreat;
  assert.deepEqual(r.amenities, ['Ontbijt', 'Yogamat']);
  assert.equal(r.pricePerPerson, 500);

  assert.equal((await host('/api/bookings', { method: 'POST', body: { retreatId: r.id, startDate: date, guests: 1 } })).status, 400);
  const b1 = await guest('/api/bookings', { method: 'POST', body: { retreatId: r.id, startDate: date, guests: 2, packageName: 'Gedeeld' } });
  assert.equal(b1.status, 200);
  assert.equal(b1.data.booking.totalPrice, 1000);
  assert.equal(b1.data.booking.deposit, 200);
  assert.equal(b1.data.booking.status, 'bevestigd');
  assert.equal((await guest('/api/bookings', { method: 'POST', body: { retreatId: r.id, startDate: date, guests: 2, packageName: 'Gedeeld' } })).status, 409);
  assert.equal((await guest('/api/bookings', { method: 'POST', body: { retreatId: r.id, startDate: date, guests: 1, packageName: 'Bestaat niet' } })).status, 400);

  const detail = await guest('/api/retreats/' + r.id);
  assert.equal(detail.data.retreat.dates[0].available, 1);

  const listings = await host('/api/me/listings');
  assert.equal(listings.data.listings[0].bookings.length, 1);
  assert.equal(listings.data.listings[0].revenue, 1000);

  assert.equal((await host('/api/retreats/' + r.id, { method: 'DELETE' })).status, 409);
  assert.equal((await guest('/api/retreats/' + r.id, { method: 'DELETE' })).status, 403);

  // review + favoriet
  assert.equal((await host(`/api/retreats/${r.id}/reviews`, { method: 'POST', body: { rating: 5, text: 'Zelf beoordelen?' } })).status, 403);
  assert.equal((await guest(`/api/retreats/${r.id}/reviews`, { method: 'POST', body: { rating: 4, text: 'Heerlijke week gehad!' } })).status, 200);
  assert.equal((await guest(`/api/retreats/${r.id}/reviews`, { method: 'POST', body: { rating: 4, text: 'Nog een keer...' } })).status, 409);
  const withReview = await guest('/api/retreats/' + r.id);
  assert.equal(withReview.data.retreat.reviews, 1);
  assert.equal(withReview.data.retreat.rating, 4);
  assert.equal(withReview.data.retreat.reviewList[0].userName, 'Gast');
  const fav = await guest('/api/favorites/' + r.id, { method: 'POST' });
  assert.deepEqual(fav.data.favorites, [r.id]);

  const cancel = await guest(`/api/bookings/${b1.data.booking.id}/cancel`, { method: 'POST' });
  assert.equal(cancel.status, 200);
  assert.equal(cancel.data.booking.refund, 200); // flexibel en >14 dagen vooraf
  const after = await guest('/api/retreats/' + r.id);
  assert.equal(after.data.retreat.dates[0].available, 3);
  assert.equal((await host('/api/retreats/' + r.id, { method: 'DELETE' })).status, 200);
});

test('boeken op aanvraag: host accepteert of wijst af', async () => {
  const guest = client();
  await guest('/api/auth/register', { method: 'POST', body: { name: 'Aanvrager', email: 'a@x.nl', password: 'geheim123' } });
  const madeRetreat = (await guest('/api/retreats/r_chiangmai')).data.retreat; // instantBooking: false
  const date = madeRetreat.dates[0].date;
  const req1 = await guest('/api/bookings', { method: 'POST', body: { retreatId: 'r_chiangmai', startDate: date, guests: 1 } });
  assert.equal(req1.data.booking.status, 'aangevraagd');
  const req2 = await guest('/api/bookings', { method: 'POST', body: { retreatId: 'r_chiangmai', startDate: date, guests: 2 } });
  assert.equal((await guest('/api/retreats/r_chiangmai')).data.retreat.dates[0].available, madeRetreat.capacity - 3);

  const host = client();
  await host('/api/auth/login', { method: 'POST', body: { email: 'sanne@demo.nl', password: 'demo1234' } });
  assert.equal((await guest(`/api/bookings/${req1.data.booking.id}/accept`, { method: 'POST' })).status, 403);
  assert.equal((await host(`/api/bookings/${req1.data.booking.id}/accept`, { method: 'POST' })).data.booking.status, 'bevestigd');
  const declined = await host(`/api/bookings/${req2.data.booking.id}/decline`, { method: 'POST' });
  assert.equal(declined.data.booking.status, 'afgewezen');
  const listing = (await host('/api/me/listings')).data.listings.find((l) => l.id === 'r_chiangmai');
  assert.equal(listing.pending, 0);
  assert.equal(listing.revenue, 990);
});

test('extra filters', async () => {
  const c = client();
  const day = await c('/api/retreats?duration=dag');
  assert.ok(day.data.retreats.length && day.data.retreats.every((r) => r.nights === 0));
  const short = await c('/api/retreats?duration=1-3');
  assert.ok(short.data.retreats.length && short.data.retreats.every((r) => r.nights <= 3));
  const flex = await c('/api/retreats?flexible=1&instant=1');
  assert.ok(flex.data.retreats.every((r) => r.cancellation === 'flexibel' && r.instantBooking));
  const vegan = await c('/api/retreats?diet=Veganistisch&language=Nederlands');
  assert.ok(vegan.data.retreats.every((r) => r.diets.includes('Veganistisch') && r.languages.includes('Nederlands')));
});

test('login en CSRF-check', async () => {
  const c = client();
  assert.equal((await c('/api/auth/login', { method: 'POST', body: { email: 'eva@demo.nl', password: 'fout' } })).status, 401);
  assert.equal((await c('/api/auth/login', { method: 'POST', body: { email: 'eva@demo.nl', password: 'demo1234' } })).status, 200);
  const res = await fetch(base + '/api/auth/logout', { method: 'POST', headers: { 'Content-Type': 'text/plain' } });
  assert.equal(res.status, 415);
});

test('statische bestanden en path traversal', async () => {
  const home = await fetch(base + '/');
  assert.equal(home.status, 200);
  assert.match(await home.text(), /NEWNEI/);
  const trav = await fetch(base + '/..%2fpackage.json');
  assert.notEqual(trav.status, 200);
});
