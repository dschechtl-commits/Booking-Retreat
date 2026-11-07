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
  assert.equal(bad.status, 400);

  const created = await host('/api/retreats', { method: 'POST', body: {
    title: 'Yoga in Hoi An', type: 'Yoga', region: 'Azië', country: 'Vietnam', city: 'Hoi An',
    description: 'Een prachtige retreat tussen de rijstvelden met dagelijks yoga.', pricePerPerson: 500,
    nights: 5, capacity: 3, amenities: 'Ontbijt, Yogamat', startDates: [date],
  } });
  assert.equal(created.status, 200, JSON.stringify(created.data));
  const r = created.data.retreat;
  assert.deepEqual(r.amenities, ['Ontbijt', 'Yogamat']);

  assert.equal((await host('/api/bookings', { method: 'POST', body: { retreatId: r.id, startDate: date, guests: 1 } })).status, 400);
  const b1 = await guest('/api/bookings', { method: 'POST', body: { retreatId: r.id, startDate: date, guests: 2 } });
  assert.equal(b1.status, 200);
  assert.equal(b1.data.booking.totalPrice, 1000);
  assert.equal((await guest('/api/bookings', { method: 'POST', body: { retreatId: r.id, startDate: date, guests: 2 } })).status, 409);

  const detail = await guest('/api/retreats/' + r.id);
  assert.equal(detail.data.retreat.dates[0].available, 1);

  const listings = await host('/api/me/listings');
  assert.equal(listings.data.listings[0].bookings.length, 1);
  assert.equal(listings.data.listings[0].revenue, 1000);

  assert.equal((await host('/api/retreats/' + r.id, { method: 'DELETE' })).status, 409);
  assert.equal((await guest('/api/retreats/' + r.id, { method: 'DELETE' })).status, 403);

  assert.equal((await guest(`/api/bookings/${b1.data.booking.id}/cancel`, { method: 'POST' })).status, 200);
  const after = await guest('/api/retreats/' + r.id);
  assert.equal(after.data.retreat.dates[0].available, 3);
  assert.equal((await host('/api/retreats/' + r.id, { method: 'DELETE' })).status, 200);
});

test('login en CSRF-check', async () => {
  const c = client();
  assert.equal((await c('/api/auth/login', { method: 'POST', body: { email: 'ana@demo.nl', password: 'fout' } })).status, 401);
  assert.equal((await c('/api/auth/login', { method: 'POST', body: { email: 'ana@demo.nl', password: 'demo1234' } })).status, 200);
  const res = await fetch(base + '/api/auth/logout', { method: 'POST', headers: { 'Content-Type': 'text/plain' } });
  assert.equal(res.status, 415);
});

test('statische bestanden en path traversal', async () => {
  const home = await fetch(base + '/');
  assert.equal(home.status, 200);
  assert.match(await home.text(), /Retreatly/);
  const trav = await fetch(base + '/..%2fpackage.json');
  assert.notEqual(trav.status, 200);
});
