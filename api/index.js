'use strict';
// Vercel-functie: draait dezelfde app als server.js, maar zonder vaste schijf.
// Gegevens staan in /tmp en worden gewist zodra Vercel de functie opnieuw opstart (demomodus).
const { Store } = require('../lib/store');
const { createApp } = require('../lib/app');

const store = new Store(process.env.DATA_FILE || '/tmp/newnei-db.json');
const server = createApp(store, {
  sitePassword: process.env.SITE_PASSWORD || '',
  demo: process.env.DEMO_MODE !== 'false',
});

module.exports = (req, res) => server.emit('request', req, res);
