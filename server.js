'use strict';
const path = require('path');
const { Store } = require('./lib/store');
const { createApp } = require('./lib/app');

const PORT = Number(process.env.PORT) || 3000;
const DATA_FILE = process.env.DATA_FILE || path.join(__dirname, 'data', 'db.json');
// Zet SITE_PASSWORD om de hele site achter een wachtwoord te zetten (aanrader voor een deelbare, niet-openbare link).
const SITE_PASSWORD = process.env.SITE_PASSWORD || '';

const store = new Store(DATA_FILE);
createApp(store, { sitePassword: SITE_PASSWORD }).listen(PORT, () => {
  console.log(`NEWNEI Events draait op http://localhost:${PORT}${SITE_PASSWORD ? ' (met wachtwoord)' : ''}`);
});
