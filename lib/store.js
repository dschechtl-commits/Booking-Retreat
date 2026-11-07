'use strict';
// Eenvoudige JSON-bestandsopslag. Schrijft atomair (tmp-bestand + rename).
const fs = require('fs');
const path = require('path');
const { seedData } = require('./seed');

class Store {
  constructor(file) {
    this.file = file;
    if (file && fs.existsSync(file)) {
      this.data = JSON.parse(fs.readFileSync(file, 'utf8'));
    } else {
      this.data = seedData();
      this.save();
    }
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
}

module.exports = { Store };
