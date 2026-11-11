'use strict';
// Eenvoudige JSON-bestandsopslag. Schrijft atomair (tmp-bestand + rename).
const fs = require('fs');
const path = require('path');
const { seedData, DEFAULTS, SEED_IMAGES } = require('./seed');

class Store {
  constructor(file) {
    this.file = file;
    if (file && fs.existsSync(file)) {
      this.data = JSON.parse(fs.readFileSync(file, 'utf8'));
    } else {
      this.data = seedData();
      this.save();
    }
    this.migrate();
  }

  // Vult velden aan die in oudere databestanden nog ontbreken.
  migrate() {
    const d = this.data;
    d.reviews = d.reviews || [];
    d.sessions = d.sessions || {};
    d.users.forEach((u) => { u.favorites = u.favorites || []; });
    d.retreats.forEach((r) => {
      for (const [k, v] of Object.entries(DEFAULTS)) if (r[k] === undefined) r[k] = Array.isArray(v) ? [...v] : v;
      if (!Array.isArray(r.packages) || !r.packages.length) r.packages = [{ name: 'Standaard', price: r.pricePerPerson }];
      if (!r.image && SEED_IMAGES[r.id]) r.image = SEED_IMAGES[r.id];
    });
    d.bookings.forEach((b) => {
      if (!b.packageName) b.packageName = 'Standaard';
      if (b.deposit === undefined) b.deposit = 0;
    });
  }

  save() {
    if (!this.file) return; // in-memory (tests)
    fs.mkdirSync(path.dirname(this.file), { recursive: true });
    const tmp = this.file + '.tmp';
    fs.writeFileSync(tmp, JSON.stringify(this.data, null, 2));
    fs.renameSync(tmp, this.file);
  }

  get users() { return this.data.users; }
  get retreats() { return this.data.retreats; }
  get bookings() { return this.data.bookings; }
  get sessions() { return this.data.sessions; }
  get reviews() { return this.data.reviews; }
}

module.exports = { Store };
