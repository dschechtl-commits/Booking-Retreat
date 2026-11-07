'use strict';
const path = require('path');
const { Store } = require('./lib/store');
const { createApp } = require('./lib/app');

const PORT = Number(process.env.PORT) || 3000;
const DATA_FILE = process.env.DATA_FILE || path.join(__dirname, 'data', 'db.json');

const store = new Store(DATA_FILE);
createApp(store).listen(PORT, () => {
  console.log(`Retreatly draait op http://localhost:${PORT}`);
});
