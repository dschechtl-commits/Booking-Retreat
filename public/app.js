'use strict';
/* Retreatly – front-end (vanilla JS, hash-router) */

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
const app = $('#app');
const state = { user: null, meta: null };

// ---------- helpers ----------
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const euro = (n) => new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n);
const fmtDate = (d, opts = { day: 'numeric', month: 'long', year: 'numeric' }) => new Date(d + 'T00:00:00').toLocaleDateString('nl-NL', opts);
const addDays = (d, n) => { const x = new Date(d + 'T00:00:00Z'); x.setUTCDate(x.getUTCDate() + n); return x.toISOString().slice(0, 10); };
const initials = (name) => name.split(/\s+/).map((p) => p[0]).slice(0, 2).join('').toUpperCase();
const today = () => new Date().toISOString().slice(0, 10);
const stars = (n) => '★'.repeat(Math.round(n)) + '☆'.repeat(5 - Math.round(n));
const fmtRating = (n) => n.toFixed(2).replace('.', ',');
const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;
const STATUS_LABEL = { aangevraagd: 'aanvraag', bevestigd: 'bevestigd', afgewezen: 'afgewezen', geannuleerd: 'geannuleerd' };

const TYPE_ART = {
  'Yoga': ['🧘', '#7aa58f', '#d9c7a3'],
  'Meditatie': ['🪷', '#6c7fa8', '#c9b8d8'],
  'Detox': ['🍃', '#5f9a6e', '#cfe0a8'],
  'Wellness': ['💆', '#b07c6e', '#efcfb2'],
  'Surf & Yoga': ['🌊', '#3e7f9e', '#a8d8d6'],
  'Ademwerk': ['🌬️', '#5b8aa0', '#d4e4e9'],
  'Stilte': ['🕯️', '#8a7a62', '#e3d6bc'],
  'Natuur & Wandelen': ['⛰️', '#4f7357', '#bfd3a8'],
};

function art(r, cls = '', badges = true) {
  const [emoji, c1, c2] = TYPE_ART[r.type] || ['✨', '#2f5d50', '#e9b872'];
  const img = r.image ? `<img src="${esc(r.image)}" alt="" loading="lazy" referrerpolicy="no-referrer" onerror="this.remove()">` : '';
  const b = badges ? `<span class="badge">${esc(r.type)}</span>` : '';
  return `<div class="art ${cls}" style="background:linear-gradient(135deg,${c1},${c2})"><span aria-hidden="true">${emoji}</span>${img}${b}</div>`;
}

function favButton(id, extra = '') {
  const on = state.user && state.user.favorites.includes(id);
  return `<button type="button" class="fav ${on ? 'on' : ''} ${extra}" data-fav="${esc(id)}" aria-pressed="${on}" aria-label="${on ? 'Verwijder van verlanglijst' : 'Bewaar op verlanglijst'}">${on ? '♥' : '♡'}</button>`;
}

async function toggleFav(id) {
  if (!state.user) return openAuth('login', () => toggleFav(id));
  try {
    const { favorites, saved } = await api('/api/favorites/' + encodeURIComponent(id), { method: 'POST' });
    state.user.favorites = favorites;
    $$(`[data-fav="${CSS.escape(id)}"]`).forEach((b) => {
      b.classList.toggle('on', saved);
      b.textContent = saved ? '♥' : '♡';
      b.setAttribute('aria-pressed', saved);
    });
    toast(saved ? 'Bewaard op je verlanglijst' : 'Verwijderd van je verlanglijst');
  } catch (err) { toast(err.message, true); }
}
document.addEventListener('click', (e) => {
  const b = e.target.closest('[data-fav]');
  if (b) { e.preventDefault(); e.stopPropagation(); toggleFav(b.dataset.fav); }
});

async function api(path, opts = {}) {
  const method = opts.method || 'GET';
  const res = await fetch(path, {
    method,
    headers: method !== 'GET' ? { 'Content-Type': 'application/json' } : {},
    body: opts.body ? JSON.stringify(opts.body) : undefined,
    credentials: 'same-origin',
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw Object.assign(new Error(data.error || 'Er ging iets mis'), { status: res.status });
  return data;
}

let toastTimer;
function toast(msg, isError = false) {
  const t = $('#toast');
  t.textContent = msg;
  t.className = 'toast show' + (isError ? ' error' : '');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => (t.className = 'toast'), 3200);
}

function retreatCard(r) {
  const next = r.dates && r.dates.find((d) => d.available > 0);
  const tags = [r.instantBooking ? '⚡ Direct boeken' : '', r.cancellation === 'flexibel' ? '✓ Gratis annuleren' : ''].filter(Boolean);
  return `<a class="card" href="#/retreat/${esc(r.id)}">
    <div class="card-art">${art(r)}${favButton(r.id)}</div>
    <div class="card-body">
      <div class="card-meta"><span>📍 ${esc(r.city)}, ${esc(r.country)}</span>${r.reviews ? `<span class="rating">★ ${fmtRating(r.rating)} <span class="muted">(${r.reviews})</span></span>` : '<span class="rating">Nieuw</span>'}</div>
      <h3>${esc(r.title)}</h3>
      <div class="muted small">${r.nights} nachten · ${esc(r.level)}${next ? ` · vanaf ${fmtDate(next.date, { day: 'numeric', month: 'short' })}` : ' · volgeboekt'}</div>
      ${tags.length ? `<div class="tags">${tags.map((t) => `<span>${t}</span>`).join('')}</div>` : ''}
      <div class="card-foot"><span class="price"><small>vanaf</small> ${euro(r.pricePerPerson)} <small>p.p.</small></span></div>
    </div>
  </a>`;
}

function parseHash() {
  const raw = location.hash.slice(1) || '/';
  const [path, qs] = raw.split('?');
  return { path, query: new URLSearchParams(qs || '') };
}

// ---------- auth ----------
function renderAuthSlot() {
  const slot = $('#auth-slot');
  if (state.user) {
    slot.innerHTML = `<a href="#/account?tab=verlanglijst" title="Verlanglijst">♡</a><a href="#/account">👤 ${esc(state.user.name.split(' ')[0])}</a><button class="btn btn-ghost btn-sm" id="logout-btn">Uitloggen</button>`;
    $('#logout-btn').onclick = async () => {
      await api('/api/auth/logout', { method: 'POST' });
      state.user = null;
      renderAuthSlot();
      toast('Je bent uitgelogd');
      location.hash = '#/';
    };
  } else {
    slot.innerHTML = `<button class="btn btn-sm" id="login-btn">Inloggen</button>`;
    $('#login-btn').onclick = () => openAuth('login');
  }
}

function openAuth(mode = 'login', onSuccess) {
  const modal = $('#modal');
  const isLogin = mode === 'login';
  modal.innerHTML = `<div class="modal-inner">
    <button class="modal-close" aria-label="Sluiten">×</button>
    <h2>${isLogin ? 'Welkom terug' : 'Account aanmaken'}</h2>
    <p class="muted small">${isLogin ? 'Log in om te boeken, retreats te bewaren of je locatie aan te bieden.' : 'Met één account kun je retreats boeken én aanbieden.'}</p>
    <form id="auth-form">
      <div id="auth-error"></div>
      ${isLogin ? '' : '<div class="field"><label for="a-name">Naam</label><input id="a-name" name="name" required autocomplete="name"></div>'}
      <div class="field"><label for="a-email">E-mailadres</label><input id="a-email" name="email" type="email" required autocomplete="email"></div>
      <div class="field"><label for="a-pw">Wachtwoord</label><input id="a-pw" name="password" type="password" required minlength="${isLogin ? 1 : 8}" autocomplete="${isLogin ? 'current-password' : 'new-password'}">${isLogin ? '' : '<div class="hint">Minimaal 8 tekens</div>'}</div>
      <button class="btn btn-block" type="submit">${isLogin ? 'Inloggen' : 'Registreren'}</button>
    </form>
    <p class="center small" style="margin-top:16px">${isLogin ? 'Nog geen account? <a href="#" id="switch-auth">Registreer</a>' : 'Al een account? <a href="#" id="switch-auth">Log in</a>'}</p>
    ${isLogin ? '<p class="center small muted">Demo-host: <code>ana@demo.nl</code> / <code>demo1234</code></p>' : ''}
  </div>`;
  if (!modal.open) modal.showModal();
  $('.modal-close', modal).onclick = () => modal.close();
  $('#switch-auth', modal).onclick = (e) => { e.preventDefault(); openAuth(isLogin ? 'register' : 'login', onSuccess); };
  $('#auth-form', modal).onsubmit = async (e) => {
    e.preventDefault();
    const body = Object.fromEntries(new FormData(e.target));
    const btn = $('button[type=submit]', e.target);
    btn.disabled = true;
    try {
      const { user } = await api(`/api/auth/${isLogin ? 'login' : 'register'}`, { method: 'POST', body });
      state.user = user;
      modal.close();
      renderAuthSlot();
      toast(isLogin ? `Welkom terug, ${user.name.split(' ')[0]}!` : 'Je account is aangemaakt');
      if (onSuccess) onSuccess(); else router();
    } catch (err) {
      $('#auth-error', modal).innerHTML = `<div class="error-box">${esc(err.message)}</div>`;
      btn.disabled = false;
    }
  };
}

// ---------- views ----------
function monthOptions(n = 8) {
  return [...Array(n)].map((_, i) => {
    const d = new Date(); d.setDate(1); d.setMonth(d.getMonth() + i);
    const v = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    return { v, l: d.toLocaleDateString('nl-NL', { month: 'long', year: 'numeric' }) };
  });
}

async function viewHome() {
  const { retreats } = await api('/api/retreats?sort=aanbevolen');
  const { types, durations } = state.meta;
  app.innerHTML = `
  <section class="hero">
    <div class="container">
      <h1>Vind jouw retreat in Europa of Azië</h1>
      <p class="lead">Yoga in Bali, stilte in Thailand, surfen in Portugal of wellness in Toscane. Vergelijk retreats van lokale hosts, lees reviews en boek met een kleine aanbetaling.</p>
      <form class="search" id="home-search">
        <div class="sfield"><label for="s-q">Waar of wat?</label><input id="s-q" name="q" placeholder="Bijv. Bali, yoga, Portugal…"></div>
        <div class="sfield"><label for="s-type">Type</label><select id="s-type" name="type"><option value="">Alle types</option>${types.map((t) => `<option>${esc(t)}</option>`).join('')}</select></div>
        <div class="sfield"><label for="s-month">Wanneer</label><select id="s-month" name="month"><option value="">Flexibel</option>${monthOptions().map((m) => `<option value="${m.v}">${m.l}</option>`).join('')}</select></div>
        <div class="sfield"><label for="s-dur">Duur</label><select id="s-dur" name="duration"><option value="">Elke duur</option>${durations.map((d) => `<option value="${d}">${d} nachten</option>`).join('')}</select></div>
        <button class="btn btn-accent" type="submit">Zoeken</button>
      </form>
    </div>
  </section>

  <section class="container trust">
    <div><b>🔒 Veilig boeken</b><span>Reserveer met een aanbetaling, de rest betaal je bij aankomst</span></div>
    <div><b>↩︎ Flexibel annuleren</b><span>Het annuleringsbeleid staat duidelijk bij elke retreat</span></div>
    <div><b>★ Echte reviews</b><span>Alleen gasten met een boeking kunnen een review schrijven</span></div>
    <div><b>🌏 Lokale hosts</b><span>Rechtstreeks boeken bij de mensen achter de retreat</span></div>
  </section>

  <section class="block container">
    <div class="section-head"><div><h2>Kies je bestemming</h2><p class="muted">Twee continenten, eindeloos veel manieren om tot rust te komen.</p></div></div>
    <div class="regions">
      <a class="region-card region-eu" href="#/retreats?region=Europa"><h3>Europa</h3><p>Van Atlantische surfspots tot Scandinavische stilte.</p>
        <div class="chips">${state.meta.countries.Europa.slice(0, 6).map((c) => `<span>${esc(c)}</span>`).join('')}</div></a>
      <a class="region-card region-as" href="#/retreats?region=${encodeURIComponent('Azië')}"><h3>Azië</h3><p>Eeuwenoude tradities, tempels en tropische natuur.</p>
        <div class="chips">${state.meta.countries['Azië'].slice(0, 6).map((c) => `<span>${esc(c)}</span>`).join('')}</div></a>
    </div>
  </section>

  <section class="block container" style="padding-top:0">
    <div class="section-head"><div><h2>Populaire retreats</h2><p class="muted">Hoog gewaardeerd door onze gasten.</p></div><a class="btn btn-ghost" href="#/retreats">Bekijk alles →</a></div>
    <div class="cards">${retreats.slice(0, 8).map(retreatCard).join('')}</div>
  </section>

  <section class="block container" style="padding-top:0">
    <h2>Waar heb jij behoefte aan?</h2>
    <div class="types">${types.map((t) => `<a class="type-pill" href="#/retreats?type=${encodeURIComponent(t)}">${TYPE_ART[t]?.[0] || ''} ${esc(t)}</a>`).join('')}</div>
    <div class="types" style="margin-top:12px">
      <a class="type-pill" href="#/retreats?duration=1-3">🌙 Weekendretreats</a>
      <a class="type-pill" href="#/retreats?level=Beginner">🌱 Voor beginners</a>
      <a class="type-pill" href="#/retreats?diet=Veganistisch">🥗 Veganistisch</a>
      <a class="type-pill" href="#/retreats?flexible=1">↩︎ Gratis annuleren</a>
      <a class="type-pill" href="#/retreats?language=Nederlands">🇳🇱 Nederlandstalig</a>
    </div>
  </section>

  <section class="block container" style="padding-top:0">
    <h2>Zo werkt het</h2>
    <div class="steps">
      <div class="step"><div class="num">1</div><h3>Ontdek & vergelijk</h3><p class="muted">Filter op land, type, duur, niveau, eten en budget. Bewaar favorieten op je verlanglijst.</p></div>
      <div class="step"><div class="num">2</div><h3>Reserveer</h3><p class="muted">Kies je datum en kamer. Je betaalt alleen een aanbetaling; de rest bij aankomst.</p></div>
      <div class="step"><div class="num">3</div><h3>Kom tot rust</h3><p class="muted">Je boekingen staan in je account. Schrijf na afloop een review voor andere gasten.</p></div>
    </div>
  </section>

  <section class="block container" style="padding-top:0">
    <div class="cta-host">
      <div><h2>Heb jij een retreatlocatie?</h2><p>Bied je retreat gratis aan en bereik gasten uit heel Europa en Azië. Stel je eigen kameropties, aanbetaling en annuleringsbeleid in, en kies tussen direct boeken of boeken op aanvraag.</p></div>
      <a class="btn btn-accent" href="#/aanbieden">Bied je locatie aan</a>
    </div>
  </section>`;

  $('#home-search').onsubmit = (e) => {
    e.preventDefault();
    const p = new URLSearchParams();
    for (const [k, v] of new FormData(e.target)) if (v) p.set(k, v);
    location.hash = '#/retreats' + (p.toString() ? '?' + p : '');
  };
}

const FILTER_KEYS = ['q', 'region', 'country', 'type', 'maxPrice', 'month', 'duration', 'level', 'diet', 'language', 'flexible', 'instant', 'sort'];

async function viewList(query) {
  const f = Object.fromEntries(FILTER_KEYS.map((k) => [k, query.get(k) || '']));
  f.sort = f.sort || 'aanbevolen';
  const params = new URLSearchParams(Object.entries(f).filter(([, v]) => v));
  const { retreats } = await api('/api/retreats?' + params);
  const m = state.meta;
  const countries = f.region ? m.countries[f.region] : [...m.countries.Europa, ...m.countries['Azië']];
  const title = f.country ? `Retreats in ${f.country}` : f.region ? `Retreats in ${f.region}` : f.type ? `${f.type} retreats` : 'Alle retreats';
  const opt = (v, cur, label = v) => `<option value="${esc(v)}" ${v === cur ? 'selected' : ''}>${esc(label)}</option>`;

  const update = (changes) => {
    const next = { ...f, ...changes };
    const p = new URLSearchParams(Object.entries(next).filter(([k, v]) => v && !(k === 'sort' && v === 'aanbevolen')));
    location.hash = '#/retreats' + (p.toString() ? '?' + p : '');
  };

  app.innerHTML = `<div class="container list-layout">
    <aside class="filters">
      <h3>Filters</h3>
      <div class="seg" id="region-seg">
        ${['', 'Europa', 'Azië'].map((r) => `<button data-region="${r}" class="${f.region === r ? 'active' : ''}">${r || 'Alles'}</button>`).join('')}
      </div>
      <div class="field"><label for="f-q">Zoeken</label><input id="f-q" value="${esc(f.q)}" placeholder="Plaats, land, docent…"></div>
      <div class="field"><label for="f-country">Land</label><select id="f-country" data-k="country"><option value="">Alle landen</option>${countries.map((c) => opt(c, f.country)).join('')}</select></div>
      <div class="field"><label for="f-type">Type</label><select id="f-type" data-k="type"><option value="">Alle types</option>${m.types.map((t) => opt(t, f.type)).join('')}</select></div>
      <div class="field"><label for="f-month">Wanneer</label><select id="f-month" data-k="month"><option value="">Flexibel</option>${monthOptions(12).map((x) => opt(x.v, f.month, x.l)).join('')}</select></div>
      <div class="field"><label for="f-dur">Duur</label><select id="f-dur" data-k="duration"><option value="">Elke duur</option>${m.durations.map((d) => opt(d, f.duration, `${d} nachten`)).join('')}</select></div>
      <div class="field"><label for="f-price">Max. prijs p.p.: <b id="price-out">${f.maxPrice ? euro(f.maxPrice) : 'geen'}</b></label><input id="f-price" type="range" min="300" max="2500" step="50" value="${f.maxPrice || 2500}"></div>
      <div class="field"><label for="f-level">Niveau</label><select id="f-level" data-k="level"><option value="">Elk niveau</option>${['Beginner', 'Gevorderd'].map((l) => opt(l, f.level)).join('')}</select></div>
      <div class="field"><label for="f-diet">Eten</label><select id="f-diet" data-k="diet"><option value="">Geen voorkeur</option>${m.diets.map((d) => opt(d, f.diet)).join('')}</select></div>
      <div class="field"><label for="f-lang">Taal</label><select id="f-lang" data-k="language"><option value="">Elke taal</option>${m.languages.map((l) => opt(l, f.language)).join('')}</select></div>
      <label class="check"><input type="checkbox" data-k="flexible" ${f.flexible ? 'checked' : ''}> Gratis annuleren</label>
      <label class="check"><input type="checkbox" data-k="instant" ${f.instant ? 'checked' : ''}> Direct boeken</label>
      <button class="btn btn-ghost btn-block btn-sm" id="reset" style="margin-top:14px">Filters wissen</button>
    </aside>
    <div>
      <div class="list-head">
        <div><h1 style="font-size:2rem;margin:0">${esc(title)}</h1><span class="muted">${plural(retreats.length, 'retreat', 'retreats')} gevonden</span></div>
        <select id="f-sort" aria-label="Sorteren">
          ${[['aanbevolen', 'Aanbevolen'], ['beoordeling', 'Beste beoordeling'], ['prijs-laag', 'Prijs: laag → hoog'], ['prijs-hoog', 'Prijs: hoog → laag'], ['datum', 'Eerstvolgende datum'], ['nieuw', 'Nieuwste']]
            .map(([v, l]) => opt(v, f.sort, l)).join('')}
        </select>
      </div>
      ${retreats.length ? `<div class="cards">${retreats.map(retreatCard).join('')}</div>`
        : `<div class="empty"><h3>Geen retreats gevonden</h3><p class="muted">Probeer andere filters of bekijk alle retreats.</p><a class="btn" href="#/retreats">Alle retreats</a></div>`}
    </div>
  </div>`;

  $$('#region-seg button').forEach((b) => (b.onclick = () => update({ region: b.dataset.region, country: '' })));
  let qTimer;
  $('#f-q').oninput = (e) => { clearTimeout(qTimer); qTimer = setTimeout(() => update({ q: e.target.value.trim() }), 450); };
  $$('.filters select[data-k]').forEach((s) => (s.onchange = () => update({ [s.dataset.k]: s.value })));
  $$('.filters input[type=checkbox][data-k]').forEach((c) => (c.onchange = () => update({ [c.dataset.k]: c.checked ? '1' : '' })));
  $('#f-price').oninput = (e) => ($('#price-out').textContent = e.target.value === '2500' ? 'geen' : euro(e.target.value));
  $('#f-price').onchange = (e) => update({ maxPrice: e.target.value === '2500' ? '' : e.target.value });
  $('#f-sort').onchange = (e) => update({ sort: e.target.value });
  $('#reset').onclick = () => (location.hash = '#/retreats');
  if (f.q) { const i = $('#f-q'); i.focus(); i.setSelectionRange(i.value.length, i.value.length); }
}

async function viewDetail(id) {
  const { retreat: r } = await api('/api/retreats/' + encodeURIComponent(id));
  const isOwner = state.user && state.user.id === r.hostId;
  const policy = state.meta.cancellation[r.cancellation];
  let selected = (r.dates.find((d) => d.available > 0) || {}).date;
  let pkgName = r.packages[0].name;
  let guests = 1;
  let note = '';

  const sections = [
    ['overzicht', 'Overzicht', true],
    ['programma', 'Programma', r.itinerary],
    ['docent', 'Docent', r.teacherName],
    ['accommodatie', 'Accommodatie', r.accommodation || r.packages.length],
    ['eten', 'Eten', r.food || r.diets.length],
    ['annulering', 'Annulering', true],
    ['reviews', `Reviews (${r.reviews})`, true],
  ].filter((s) => s[2]);

  app.innerHTML = `<div class="container detail">
    <div class="crumbs"><a href="#/retreats">Retreats</a> › <a href="#/retreats?region=${encodeURIComponent(r.region)}">${esc(r.region)}</a> › <a href="#/retreats?country=${encodeURIComponent(r.country)}">${esc(r.country)}</a></div>
    <div class="title-row">
      <div><h1>${esc(r.title)}</h1>
        <div class="muted">📍 ${esc(r.city)}, ${esc(r.country)} · ${r.reviews ? `★ ${fmtRating(r.rating)} (${plural(r.reviews, 'review', 'reviews')})` : 'Nieuw op Retreatly'}</div></div>
      ${favButton(r.id, 'fav-lg')}
    </div>
    <div style="margin-top:22px">${art(r, 'art-lg')}</div>
    <nav class="sec-nav">${sections.map(([k, l]) => `<button type="button" data-scroll="sec-${k}">${esc(l)}</button>`).join('')}</nav>
    <div class="detail-grid">
      <div>
        <section id="sec-overzicht">
          <div class="facts">
            <span class="fact">🏷️ ${esc(r.type)}</span><span class="fact">🌙 ${r.nights} nachten</span>
            <span class="fact">👥 max. ${r.capacity} gasten</span><span class="fact">📶 ${esc(r.level)}</span>
            <span class="fact">🗣️ ${r.languages.map(esc).join(', ')}</span>
            ${r.instantBooking ? '<span class="fact">⚡ Direct boeken</span>' : '<span class="fact">✉️ Boeken op aanvraag</span>'}
          </div>
          <h2>Over deze retreat</h2>
          <p class="description">${esc(r.description)}</p>
          ${r.amenities.length ? `<h3 style="margin-top:24px">Inbegrepen</h3><ul class="amenities">${r.amenities.map((a) => `<li>${esc(a)}</li>`).join('')}</ul>` : ''}
        </section>
        ${r.itinerary ? `<section id="sec-programma"><h2>Dagprogramma</h2><p class="muted small">Een typische dag tijdens de retreat:</p>
          <ul class="itinerary">${r.itinerary.split('\n').filter(Boolean).map((line) => {
            const mm = line.match(/^(\d{1,2}[:.]\d{2})\s+(.*)$/);
            return mm ? `<li><time>${esc(mm[1])}</time><span>${esc(mm[2])}</span></li>` : `<li><time></time><span>${esc(line)}</span></li>`;
          }).join('')}</ul></section>` : ''}
        ${r.teacherName ? `<section id="sec-docent"><h2>Je docent</h2><div class="host-box" style="margin-top:0"><div class="avatar">${esc(initials(r.teacherName))}</div>
          <div><b>${esc(r.teacherName)}</b>${r.teacherBio ? `<p class="small" style="margin:4px 0 0">${esc(r.teacherBio)}</p>` : ''}</div></div></section>` : ''}
        <section id="sec-accommodatie"><h2>Accommodatie</h2>${r.accommodation ? `<p>${esc(r.accommodation)}</p>` : ''}
          <div class="pkg-table">${r.packages.map((p) => `<div><span>🛏️ ${esc(p.name)}</span><b>${euro(p.price)} p.p.</b></div>`).join('')}</div></section>
        ${r.food || r.diets.length ? `<section id="sec-eten"><h2>Eten</h2>${r.food ? `<p>${esc(r.food)}</p>` : ''}
          ${r.diets.length ? `<div class="tags">${r.diets.map((d) => `<span>🥗 ${esc(d)}</span>`).join('')}</div>` : ''}</section>` : ''}
        <section id="sec-annulering"><h2>Annuleringsbeleid & betaling</h2>
          <p><b>${esc(policy.label)}:</b> ${esc(policy.text)}</p>
          <p class="muted">${r.depositPercent ? `Je reserveert met een aanbetaling van ${r.depositPercent}%. Het restbedrag betaal je bij aankomst aan de host.` : 'Je betaalt het volledige bedrag bij aankomst aan de host.'}
          ${r.instantBooking ? '' : ' Deze host bevestigt boekingen handmatig; je krijgt binnen 48 uur antwoord. Wordt je aanvraag afgewezen, dan krijg je alles terug.'}</p>
        </section>
        <section id="sec-reviews"><h2>Reviews</h2>
          ${r.reviews ? `<div class="review-summary"><span class="big">${fmtRating(r.rating)}</span><span><span class="stars">${stars(r.rating)}</span><br><span class="muted small">${plural(r.reviews, 'review', 'reviews')}</span></span></div>` : '<p class="muted">Nog geen reviews.</p>'}
          ${r.reviewList.map((v) => `<div class="review"><div class="review-head"><div class="avatar avatar-sm">${esc(initials(v.userName))}</div>
            <div><b>${esc(v.userName)}</b><div class="muted small">${fmtDate(v.createdAt.slice(0, 10))}</div></div><span class="stars">${stars(v.rating)}</span></div>
            <p>${esc(v.text)}</p></div>`).join('')}
          ${r.reviews > r.reviewList.length ? `<p class="muted small">${plural(r.reviews - r.reviewList.length, 'eerdere beoordeling', 'eerdere beoordelingen')} van vóór Retreatly zijn meegeteld in de score.</p>` : ''}
          <p class="muted small">Alleen gasten met een bevestigde boeking kunnen een review schrijven, via <a href="#/account">Mijn boekingen</a>.</p>
        </section>
        <div class="host-box"><div class="avatar">${esc(initials(r.hostName))}</div><div><b>Aangeboden door ${esc(r.hostName)}</b><div class="muted small">Host op Retreatly</div></div></div>
      </div>
      <aside class="book-panel" id="book-panel"></aside>
    </div>
  </div>`;

  $$('[data-scroll]').forEach((b) => (b.onclick = () => {
    const el = document.getElementById(b.dataset.scroll);
    window.scrollTo({ top: el.getBoundingClientRect().top + scrollY - 140, behavior: 'smooth' });
  }));

  const panel = $('#book-panel');
  function renderPanel() {
    const sel = r.dates.find((d) => d.date === selected);
    const pkg = r.packages.find((p) => p.name === pkgName);
    const maxGuests = sel ? Math.min(sel.available, 20) : 1;
    if (guests > maxGuests) guests = Math.max(1, maxGuests);
    const total = pkg.price * guests;
    const deposit = Math.round((total * r.depositPercent) / 100);
    panel.innerHTML = `
      <div><span class="muted small">vanaf</span> <span class="price">${euro(r.pricePerPerson)}</span> <span class="muted">p.p. · ${r.nights} nachten</span></div>
      <h4>1. Kies je startdatum</h4>
      <div class="dates">${r.dates.length ? r.dates.map((d) => `<button type="button" class="date-opt ${d.date === selected ? 'selected' : ''}" data-date="${d.date}" ${d.available ? '' : 'disabled'}>
          <span><b>${fmtDate(d.date, { day: 'numeric', month: 'short' })}</b> – ${fmtDate(addDays(d.date, r.nights), { day: 'numeric', month: 'short', year: 'numeric' })}</span>
          <span class="spots ${d.available && d.available <= 3 ? 'low' : ''}">${d.available ? (d.available <= 3 ? `Nog ${d.available} plek${d.available === 1 ? '' : 'ken'}!` : `${d.available} plekken`) : 'Vol'}</span></button>`).join('')
        : '<p class="muted">Geen toekomstige data beschikbaar.</p>'}</div>
      ${isOwner ? `<p class="muted small">Dit is jouw retreat. Beheer hem via <a href="#/account?tab=aanbod">Mijn aanbod</a>.</p>` : sel ? `
        <h4>2. Kies je kamer</h4>
        <div class="dates">${r.packages.map((p) => `<button type="button" class="date-opt ${p.name === pkgName ? 'selected' : ''}" data-pkg="${esc(p.name)}"><span>${esc(p.name)}</span><b>${euro(p.price)}</b></button>`).join('')}</div>
        <div class="field"><label for="b-guests">Aantal personen</label>
          <select id="b-guests">${[...Array(maxGuests)].map((_, i) => `<option ${i + 1 === guests ? 'selected' : ''}>${i + 1}</option>`).join('')}</select></div>
        <div class="field"><label for="b-note">Bericht aan de host <span class="muted">(optioneel)</span></label><textarea id="b-note" style="min-height:70px" placeholder="Dieetwensen, vragen…">${esc(note)}</textarea></div>
        <div class="totals"><div><span>${euro(pkg.price)} × ${plural(guests, 'persoon', 'personen')}</span><span>${euro(total)}</span></div>
          <div class="grand"><span>Totaal</span><span>${euro(total)}</span></div>
          ${r.depositPercent ? `<div class="deposit"><span>Nu te betalen (aanbetaling ${r.depositPercent}%)</span><b>${euro(deposit)}</b></div>
          <div class="muted small"><span>Bij aankomst</span><span>${euro(total - deposit)}</span></div>` : '<div class="muted small"><span>Te betalen bij aankomst</span><span></span></div>'}</div>
        <button class="btn btn-block" style="margin-top:16px" id="book-btn">${!state.user ? 'Inloggen & boeken' : r.instantBooking ? 'Nu reserveren' : 'Boekingsaanvraag versturen'}</button>
        <p class="center muted small" style="margin:10px 0 0">${r.cancellation === 'flexibel' ? '✓ Gratis annuleren tot 14 dagen voor aanvang' : `Annuleringsbeleid: ${esc(policy.label.toLowerCase())}`}</p>` : '<p class="muted">Alle data zijn volgeboekt.</p>'}`;

    $$('[data-date]', panel).forEach((b) => (b.onclick = () => { selected = b.dataset.date; renderPanel(); }));
    $$('[data-pkg]', panel).forEach((b) => (b.onclick = () => { pkgName = b.dataset.pkg; renderPanel(); }));
    const n = $('#b-note', panel);
    if (n) n.oninput = (e) => (note = e.target.value);
    const g = $('#b-guests', panel);
    if (g) g.onchange = (e) => { guests = Number(e.target.value); renderPanel(); };
    const btn = $('#book-btn', panel);
    if (btn) btn.onclick = () => (state.user ? book() : openAuth('login', () => viewDetail(id)));
  }

  async function book() {
    const btn = $('#book-btn', panel);
    btn.disabled = true;
    try {
      const { booking } = await api('/api/bookings', { method: 'POST', body: { retreatId: r.id, startDate: selected, packageName: pkgName, guests, note } });
      const confirmed = booking.status === 'bevestigd';
      app.innerHTML = `<div class="container page"><div class="panel success-hero">
        <div class="icon">${confirmed ? '🎉' : '✉️'}</div><h1>${confirmed ? 'Je reservering is bevestigd!' : 'Je aanvraag is verstuurd'}</h1>
        <p class="muted">${esc(r.title)}<br>${fmtDate(booking.startDate)} – ${fmtDate(addDays(booking.startDate, r.nights))} · ${esc(booking.packageName)} · ${plural(booking.guests, 'persoon', 'personen')}</p>
        <p>Totaal <b>${euro(booking.totalPrice)}</b>${booking.deposit ? ` · aanbetaling <b>${euro(booking.deposit)}</b> · rest bij aankomst ${euro(booking.totalPrice - booking.deposit)}` : ''}</p>
        ${confirmed ? '' : `<p class="muted small">${esc(r.hostName)} bevestigt je aanvraag doorgaans binnen 48 uur. Je ziet de status in je account.</p>`}
        <p class="small muted">Boekingsnummer: <code>${esc(booking.id)}</code></p>
        <div style="display:flex;gap:10px;justify-content:center;flex-wrap:wrap;margin-top:20px"><a class="btn" href="#/account">Mijn boekingen</a><a class="btn btn-ghost" href="#/retreats">Verder ontdekken</a></div>
      </div></div>`;
      window.scrollTo(0, 0);
    } catch (err) {
      toast(err.message, true);
      if (err.status === 401) { state.user = null; renderAuthSlot(); }
      if (err.status === 409) return viewDetail(id);
      btn.disabled = false;
    }
  }
  renderPanel();
}

function viewHostForm(existing) {
  if (!state.user) {
    app.innerHTML = `<div class="container page"><div class="panel center" style="max-width:680px;margin:auto">
      <h1>Bied je retreatlocatie aan</h1>
      <p class="muted">Maak gratis een account aan en plaats je retreat binnen enkele minuten. Gasten uit heel Europa en Azië kunnen direct boeken of een aanvraag sturen.</p>
      <div class="steps" style="text-align:left;margin:24px 0">
        <div class="step"><div class="num">1</div><b>Plaats je retreat</b><p class="muted small">Programma, kamers, prijzen en data.</p></div>
        <div class="step"><div class="num">2</div><b>Ontvang boekingen</b><p class="muted small">Direct of op aanvraag, met aanbetaling.</p></div>
        <div class="step"><div class="num">3</div><b>Beheer alles</b><p class="muted small">Gasten, omzet en reviews op één plek.</p></div>
      </div>
      <div style="display:flex;gap:10px;justify-content:center;flex-wrap:wrap"><button class="btn" id="reg">Account aanmaken</button><button class="btn btn-ghost" id="log">Inloggen</button></div>
    </div></div>`;
    $('#reg').onclick = () => openAuth('register');
    $('#log').onclick = () => openAuth('login');
    return;
  }
  const r = existing || { region: 'Europa', amenities: [], startDates: [], packages: [{ name: 'Gedeelde kamer', price: '' }], depositPercent: 20, cancellation: 'flexibel', level: 'Alle niveaus', diets: [], languages: ['Engels'], instantBooking: true };
  let dates = [...(r.startDates || [])].filter((d) => d >= today());
  const { countries, types, levels, diets, languages, cancellation } = state.meta;
  const checks = (name, all, sel) => all.map((x) => `<label class="check"><input type="checkbox" name="${name}" value="${esc(x)}" ${sel.includes(x) ? 'checked' : ''}> ${esc(x)}</label>`).join('');

  app.innerHTML = `<div class="container page form-wrap">
    <h1>${existing ? 'Retreat bewerken' : 'Bied je retreat aan'}</h1>
    <p class="muted">${existing ? 'Pas de gegevens van je retreat aan.' : 'Vertel gasten wat jouw retreat bijzonder maakt. Je kunt alles later nog aanpassen.'}</p>
    <form id="host-form" novalidate>
      <div id="host-error"></div>
      <fieldset class="panel"><legend>Basisgegevens</legend>
        <div class="field"><label for="h-title">Titel</label><input id="h-title" name="title" required maxlength="120" value="${esc(r.title)}" placeholder="Bijv. Yoga & Meditatie aan zee"></div>
        <div class="grid-3">
          <div class="field"><label for="h-type">Type retreat</label><select id="h-type" name="type">${types.map((t) => `<option ${t === r.type ? 'selected' : ''}>${esc(t)}</option>`).join('')}</select></div>
          <div class="field"><label for="h-level">Niveau</label><select id="h-level" name="level">${levels.map((t) => `<option ${t === r.level ? 'selected' : ''}>${esc(t)}</option>`).join('')}</select></div>
          <div class="field"><label for="h-region">Regio</label><select id="h-region" name="region">${Object.keys(countries).map((k) => `<option ${k === r.region ? 'selected' : ''}>${esc(k)}</option>`).join('')}</select></div>
        </div>
        <div class="grid-2">
          <div class="field"><label for="h-country">Land</label><select id="h-country" name="country"></select></div>
          <div class="field"><label for="h-city">Plaats</label><input id="h-city" name="city" required value="${esc(r.city)}" placeholder="Bijv. Ericeira"></div>
        </div>
        <div class="field"><label for="h-desc">Beschrijving</label><textarea id="h-desc" name="description" required maxlength="3000" placeholder="Waar gaat je retreat over en voor wie is hij?">${esc(r.description)}</textarea></div>
        <div class="field"><label for="h-amen">Wat is inbegrepen?</label><input id="h-amen" name="amenities" value="${esc((r.amenities || []).join(', '))}" placeholder="Ontbijt, Yogamat, Transfer vanaf luchthaven"><div class="hint">Scheid met komma's</div></div>
        <div class="field"><label>Talen</label><div class="check-row">${checks('languages', languages, r.languages)}</div></div>
        <div class="field"><label for="h-img">Foto-URL <span class="muted">(optioneel)</span></label><input id="h-img" name="image" type="url" value="${esc(r.image)}" placeholder="https://…"><div class="hint">Link naar een foto van je locatie (https). Zonder foto tonen we een illustratie.</div></div>
      </fieldset>

      <fieldset class="panel"><legend>Programma & docent</legend>
        <div class="field"><label for="h-itin">Dagprogramma</label><textarea id="h-itin" name="itinerary" placeholder="07:00 Yoga&#10;08:30 Ontbijt&#10;10:00 Workshop">${esc(r.itinerary)}</textarea><div class="hint">Eén activiteit per regel, eventueel beginnend met een tijd</div></div>
        <div class="grid-2">
          <div class="field"><label for="h-tname">Naam docent</label><input id="h-tname" name="teacherName" value="${esc(r.teacherName)}"></div>
          <div class="field"><label for="h-tbio">Over de docent</label><input id="h-tbio" name="teacherBio" value="${esc(r.teacherBio)}" placeholder="Ervaring, opleiding…"></div>
        </div>
      </fieldset>

      <fieldset class="panel"><legend>Accommodatie & eten</legend>
        <div class="field"><label for="h-acc">Accommodatie</label><textarea id="h-acc" name="accommodation" style="min-height:80px" placeholder="Type verblijf, faciliteiten, omgeving">${esc(r.accommodation)}</textarea></div>
        <div class="field"><label>Kameropties & prijzen (per persoon, hele retreat)</label>
          <div id="pkg-rows"></div><button type="button" class="btn btn-ghost btn-sm" id="add-pkg">+ Kameroptie toevoegen</button></div>
        <div class="field"><label for="h-food">Eten</label><textarea id="h-food" name="food" style="min-height:70px" placeholder="Welke maaltijden zijn inbegrepen?">${esc(r.food)}</textarea></div>
        <div class="field"><label>Dieetopties</label><div class="check-row">${checks('diets', diets, r.diets)}</div></div>
      </fieldset>

      <fieldset class="panel"><legend>Data, capaciteit & boeken</legend>
        <div class="grid-2">
          <div class="field"><label for="h-nights">Aantal nachten</label><input id="h-nights" name="nights" type="number" min="1" max="90" required value="${esc(r.nights)}"></div>
          <div class="field"><label for="h-cap">Max. gasten per startdatum</label><input id="h-cap" name="capacity" type="number" min="1" max="200" required value="${esc(r.capacity)}"></div>
        </div>
        <div class="field"><label for="h-date">Startdata</label>
          <div class="inline"><input id="h-date" type="date" min="${today()}"><button type="button" class="btn btn-ghost" id="add-date">Toevoegen</button></div>
          <div class="date-list" id="date-list"></div></div>
        <div class="grid-2">
          <div class="field"><label for="h-dep">Aanbetaling (%)</label><input id="h-dep" name="depositPercent" type="number" min="0" max="100" value="${esc(r.depositPercent)}"><div class="hint">Wat de gast bij boeken betaalt; de rest bij aankomst</div></div>
          <div class="field"><label for="h-canc">Annuleringsbeleid</label><select id="h-canc" name="cancellation">${Object.entries(cancellation).map(([k, v]) => `<option value="${k}" ${k === r.cancellation ? 'selected' : ''}>${esc(v.label)}</option>`).join('')}</select><div class="hint" id="canc-hint"></div></div>
        </div>
        <label class="check"><input type="checkbox" name="instantBooking" ${r.instantBooking ? 'checked' : ''}> <span><b>Direct boeken</b> – boekingen worden automatisch bevestigd. Uitgevinkt: je accepteert of weigert elke aanvraag zelf.</span></label>
      </fieldset>

      <div style="display:flex;gap:10px;justify-content:flex-end;flex-wrap:wrap;margin-top:10px">
        ${existing ? `<a class="btn btn-ghost" href="#/account?tab=aanbod">Annuleren</a>` : ''}
        <button class="btn" type="submit">${existing ? 'Wijzigingen opslaan' : 'Retreat publiceren'}</button>
      </div>
    </form>
  </div>`;

  const regionSel = $('#h-region');
  const countrySel = $('#h-country');
  const fillCountries = () => {
    countrySel.innerHTML = countries[regionSel.value].map((c) => `<option ${c === r.country ? 'selected' : ''}>${esc(c)}</option>`).join('');
  };
  regionSel.onchange = fillCountries;
  fillCountries();
  const cancSel = $('#h-canc');
  const cancHint = () => ($('#canc-hint').textContent = cancellation[cancSel.value].text);
  cancSel.onchange = cancHint;
  cancHint();

  // kameropties
  let pkgs = (r.packages || []).map((p) => ({ ...p }));
  const renderPkgs = () => {
    $('#pkg-rows').innerHTML = pkgs.map((p, i) => `<div class="pkg-row">
      <input placeholder="Bijv. Privékamer" value="${esc(p.name)}" data-i="${i}" data-f="name" aria-label="Naam kameroptie">
      <input type="number" min="1" placeholder="Prijs €" value="${esc(p.price)}" data-i="${i}" data-f="price" aria-label="Prijs per persoon">
      <button type="button" class="btn btn-ghost btn-sm" data-rm="${i}" ${pkgs.length === 1 ? 'disabled' : ''} aria-label="Verwijder">×</button></div>`).join('');
    $$('#pkg-rows input').forEach((inp) => (inp.oninput = () => (pkgs[inp.dataset.i][inp.dataset.f] = inp.value)));
    $$('#pkg-rows [data-rm]').forEach((b) => (b.onclick = () => { pkgs.splice(Number(b.dataset.rm), 1); renderPkgs(); }));
  };
  $('#add-pkg').onclick = () => { if (pkgs.length < 6) { pkgs.push({ name: '', price: '' }); renderPkgs(); } };
  renderPkgs();

  const renderDates = () => {
    $('#date-list').innerHTML = dates.length
      ? dates.map((d) => `<span class="date-chip">${fmtDate(d, { day: 'numeric', month: 'short', year: 'numeric' })}<button type="button" data-d="${d}" aria-label="Verwijder">×</button></span>`).join('')
      : '<span class="muted small">Nog geen data toegevoegd</span>';
    $$('.date-chip button').forEach((b) => (b.onclick = () => { dates = dates.filter((x) => x !== b.dataset.d); renderDates(); }));
  };
  $('#add-date').onclick = () => {
    const v = $('#h-date').value;
    if (!v) return toast('Kies eerst een datum', true);
    if (!dates.includes(v)) dates = [...dates, v].sort();
    $('#h-date').value = '';
    renderDates();
  };
  renderDates();

  $('#host-form').onsubmit = async (e) => {
    e.preventDefault();
    const pending = $('#h-date').value;
    if (pending && !dates.includes(pending)) dates = [...dates, pending].sort();
    const fd = new FormData(e.target);
    const body = Object.fromEntries(fd);
    body.languages = fd.getAll('languages');
    body.diets = fd.getAll('diets');
    body.instantBooking = fd.has('instantBooking');
    body.packages = pkgs;
    body.startDates = dates;
    const btn = $('button[type=submit]', e.target);
    btn.disabled = true;
    try {
      const { retreat } = await api(existing ? `/api/retreats/${existing.id}` : '/api/retreats', { method: existing ? 'PUT' : 'POST', body });
      toast(existing ? 'Retreat bijgewerkt' : 'Je retreat staat online! 🎉');
      location.hash = '#/retreat/' + retreat.id;
    } catch (err) {
      $('#host-error').innerHTML = `<div class="error-box">${esc(err.message)}</div>`;
      window.scrollTo({ top: 0, behavior: 'smooth' });
      btn.disabled = false;
    }
  };
}

async function viewEdit(id) {
  if (!state.user) return viewHostForm();
  const { retreat } = await api('/api/retreats/' + encodeURIComponent(id));
  if (retreat.hostId !== state.user.id) { toast('Dit is niet jouw retreat', true); location.hash = '#/account'; return; }
  viewHostForm(retreat);
}

function bookingMoney(b) {
  const parts = [`<b>${euro(b.totalPrice)}</b>`];
  if (b.deposit) parts.push(`aanbetaling ${euro(b.deposit)}`);
  if (b.refund !== undefined && ['geannuleerd', 'afgewezen'].includes(b.status)) parts.push(b.refund ? `${euro(b.refund)} terugbetaald` : 'aanbetaling niet terugbetaald');
  return parts.join(' · ');
}

async function viewAccount(query) {
  if (!state.user) {
    app.innerHTML = `<div class="container page"><div class="panel center" style="max-width:560px;margin:auto"><h1>Mijn account</h1><p class="muted">Log in om je boekingen, verlanglijst en aanbod te bekijken.</p><button class="btn" id="log">Inloggen</button></div></div>`;
    $('#log').onclick = () => openAuth('login');
    return;
  }
  const tab = ['aanbod', 'verlanglijst'].includes(query.get('tab')) ? query.get('tab') : 'boekingen';
  const favIds = state.user.favorites.join(',');
  const [{ bookings }, { listings }, { retreats: favs }] = await Promise.all([
    api('/api/me/bookings'), api('/api/me/listings'),
    favIds ? api('/api/retreats?ids=' + encodeURIComponent(favIds)) : Promise.resolve({ retreats: [] }),
  ]);
  const pendingTotal = listings.reduce((n, l) => n + l.pending, 0);

  const bookingsHtml = bookings.length ? bookings.map((b) => `
    <div class="row-card">
      ${b.retreat ? art(b.retreat, '', false) : '<div class="art">✨</div>'}
      <div>
        <span class="status ${b.status}">${STATUS_LABEL[b.status]}</span>
        <h3 style="margin:6px 0 2px">${b.retreat ? `<a href="#/retreat/${esc(b.retreat.id)}" style="text-decoration:none">${esc(b.retreat.title)}</a>` : 'Verwijderde retreat'}</h3>
        <div class="muted small">${b.retreat ? `📍 ${esc(b.retreat.city)}, ${esc(b.retreat.country)} · ` : ''}${fmtDate(b.startDate)}${b.retreat ? ` – ${fmtDate(addDays(b.startDate, b.retreat.nights))}` : ''}</div>
        <div class="small">${esc(b.packageName)} · ${plural(b.guests, 'persoon', 'personen')} · ${bookingMoney(b)} · <span class="muted">#${esc(b.id)}</span></div>
        ${b.status === 'aangevraagd' ? '<div class="small muted">Wacht op bevestiging van de host.</div>' : ''}
        ${b.status === 'bevestigd' && !b.reviewed && b.retreat ? `<details class="host-bookings"><summary>Review schrijven</summary>
          <form class="review-form" data-review="${esc(b.retreat.id)}">
            <div class="star-input">${[5, 4, 3, 2, 1].map((n) => `<input type="radio" name="rating" value="${n}" id="st-${esc(b.id)}-${n}"><label for="st-${esc(b.id)}-${n}" title="${n} sterren">★</label>`).join('')}</div>
            <textarea name="text" placeholder="Hoe was je ervaring?" style="min-height:80px"></textarea>
            <button class="btn btn-sm" type="submit">Plaatsen</button></form></details>` : ''}
        ${b.reviewed ? '<div class="small muted">✓ Je hebt een review geschreven</div>' : ''}
      </div>
      <div>${['aangevraagd', 'bevestigd'].includes(b.status) && b.startDate >= today() ? `<button class="btn btn-danger btn-sm" data-cancel="${esc(b.id)}" data-policy="${esc(b.cancellation)}" data-deposit="${b.deposit}" data-start="${b.startDate}" data-req="${b.status === 'aangevraagd'}">Annuleren</button>` : ''}</div>
    </div>`).join('')
    : `<div class="empty"><h3>Nog geen boekingen</h3><p class="muted">Tijd voor een retreat?</p><a class="btn" href="#/retreats">Ontdek retreats</a></div>`;

  const favHtml = favs.length ? `<div class="cards">${favs.map(retreatCard).join('')}</div>`
    : `<div class="empty"><h3>Je verlanglijst is leeg</h3><p class="muted">Tik op het ♡ bij een retreat om hem te bewaren.</p><a class="btn" href="#/retreats">Ontdek retreats</a></div>`;

  const listingsHtml = (listings.length ? listings.map((r) => {
    const active = r.bookings.filter((b) => b.status === 'bevestigd');
    return `<div class="row-card" style="align-items:start">
      ${art(r, '', false)}
      <div>
        <h3 style="margin:0 0 2px"><a href="#/retreat/${esc(r.id)}" style="text-decoration:none">${esc(r.title)}</a> ${r.pending ? `<span class="status aangevraagd">${plural(r.pending, 'nieuwe aanvraag', 'nieuwe aanvragen')}</span>` : ''}</h3>
        <div class="muted small">📍 ${esc(r.city)}, ${esc(r.country)} · vanaf ${euro(r.pricePerPerson)} p.p. · ${r.nights} nachten · ${r.instantBooking ? 'direct boeken' : 'op aanvraag'}</div>
        <div class="stats" style="margin-top:6px"><span><b>${active.length}</b> bevestigd</span><span><b>${active.reduce((n, b) => n + b.guests, 0)}</b> gasten</span><span><b>${euro(r.revenue)}</b> omzet</span><span><b>${r.reviews ? '★ ' + fmtRating(r.rating) : '–'}</b> score</span><span><b>${r.dates.length}</b> komende data</span></div>
        ${r.bookings.length ? `<details class="host-bookings" ${r.pending ? 'open' : ''}><summary>Boekingen bekijken (${r.bookings.length})</summary><div class="table-scroll"><table class="bookings">
          <tr><th>Gast</th><th>Startdatum</th><th>Kamer</th><th>Pers.</th><th>Bedrag</th><th>Status</th><th></th></tr>
          ${r.bookings.map((b) => `<tr><td>${esc(b.guestName)}<br><span class="muted">${esc(b.guestEmail)}</span>${b.note ? `<br><i class="muted">“${esc(b.note)}”</i>` : ''}</td><td>${fmtDate(b.startDate, { day: 'numeric', month: 'short', year: 'numeric' })}</td><td>${esc(b.packageName)}</td><td>${b.guests}</td><td>${euro(b.totalPrice)}</td><td><span class="status ${b.status}">${STATUS_LABEL[b.status]}</span></td>
            <td class="actions">${b.status === 'aangevraagd' ? `<button class="btn btn-sm" data-accept="${esc(b.id)}">Accepteren</button><button class="btn btn-danger btn-sm" data-decline="${esc(b.id)}">Afwijzen</button>`
              : b.status === 'bevestigd' && b.startDate >= today() ? `<button class="btn btn-danger btn-sm" data-cancel="${esc(b.id)}" data-host="1">Annuleer</button>` : ''}</td></tr>`).join('')}
        </table></div></details>` : '<p class="muted small" style="margin:8px 0 0">Nog geen boekingen.</p>'}
      </div>
      <div style="display:flex;flex-direction:column;gap:8px">
        <a class="btn btn-ghost btn-sm" href="#/bewerken/${esc(r.id)}">Bewerken</a>
        <button class="btn btn-danger btn-sm" data-delete="${esc(r.id)}">Verwijderen</button>
      </div>
    </div>`;
  }).join('') : `<div class="empty"><h3>Je biedt nog geen retreats aan</h3><p class="muted">Plaats je locatie gratis en ontvang boekingen.</p></div>`)
    + `<div style="margin-top:18px"><a class="btn" href="#/aanbieden">+ Nieuwe retreat aanbieden</a></div>`;

  app.innerHTML = `<div class="container page">
    <h1>Hoi ${esc(state.user.name.split(' ')[0])} 👋</h1>
    <div class="tabs">
      <a href="#/account" class="${tab === 'boekingen' ? 'active' : ''}">Mijn boekingen (${bookings.length})</a>
      <a href="#/account?tab=verlanglijst" class="${tab === 'verlanglijst' ? 'active' : ''}">Verlanglijst (${favs.length})</a>
      <a href="#/account?tab=aanbod" class="${tab === 'aanbod' ? 'active' : ''}">Mijn aanbod (${listings.length})${pendingTotal ? ` <span class="dot">${pendingTotal}</span>` : ''}</a>
    </div>
    ${tab === 'boekingen' ? bookingsHtml : tab === 'verlanglijst' ? favHtml : listingsHtml}
  </div>`;

  const act = async (fn, msg) => {
    try { await fn(); toast(msg); viewAccount(query); } catch (err) { toast(err.message, true); }
  };
  $$('[data-cancel]').forEach((b) => (b.onclick = () => {
    let warn = 'Weet je zeker dat je deze boeking wilt annuleren?';
    if (!b.dataset.host && b.dataset.req !== 'true' && Number(b.dataset.deposit)) {
      const days = state.meta.cancellation[b.dataset.policy];
      const left = Math.round((Date.parse(b.dataset.start) - Date.parse(today())) / 86400000);
      const refundDays = { flexibel: 14, gemiddeld: 30, strikt: null }[b.dataset.policy];
      warn += refundDays !== null && left >= refundDays ? '\nJe krijgt je aanbetaling volledig terug.' : `\nLet op: volgens het beleid (${days.label.toLowerCase()}) krijg je je aanbetaling niet terug.`;
    }
    if (b.dataset.host) warn = 'Weet je zeker dat je deze boeking wilt annuleren? De gast krijgt de aanbetaling volledig terug.';
    if (confirm(warn)) act(() => api(`/api/bookings/${b.dataset.cancel}/cancel`, { method: 'POST' }), 'Boeking geannuleerd');
  }));
  $$('[data-accept]').forEach((b) => (b.onclick = () => act(() => api(`/api/bookings/${b.dataset.accept}/accept`, { method: 'POST' }), 'Aanvraag geaccepteerd')));
  $$('[data-decline]').forEach((b) => (b.onclick = () => confirm('Deze aanvraag afwijzen?') && act(() => api(`/api/bookings/${b.dataset.decline}/decline`, { method: 'POST' }), 'Aanvraag afgewezen')));
  $$('[data-delete]').forEach((b) => (b.onclick = () => confirm('Weet je zeker dat je deze retreat wilt verwijderen?') && act(() => api(`/api/retreats/${b.dataset.delete}`, { method: 'DELETE' }), 'Retreat verwijderd')));
  $$('[data-review]').forEach((f) => (f.onsubmit = (e) => {
    e.preventDefault();
    const fd = new FormData(f);
    act(() => api(`/api/retreats/${f.dataset.review}/reviews`, { method: 'POST', body: { rating: Number(fd.get('rating')), text: fd.get('text') } }), 'Bedankt voor je review!');
  }));
}

// ---------- router ----------
async function router() {
  const { path, query } = parseHash();
  $('#nav').classList.remove('open');
  window.scrollTo(0, 0);
  app.innerHTML = '<div class="loading">Laden…</div>';
  try {
    let m;
    if (path === '/') await viewHome();
    else if (path === '/retreats') await viewList(query);
    else if ((m = path.match(/^\/retreat\/([\w-]+)$/))) await viewDetail(m[1]);
    else if ((m = path.match(/^\/bewerken\/([\w-]+)$/))) await viewEdit(m[1]);
    else if (path === '/aanbieden') viewHostForm();
    else if (path === '/account') await viewAccount(query);
    else app.innerHTML = `<div class="container page center"><h1>Pagina niet gevonden</h1><a class="btn" href="#/">Naar home</a></div>`;
  } catch (err) {
    app.innerHTML = `<div class="container page center"><h1>Oeps</h1><p class="muted">${esc(err.message)}</p><a class="btn" href="#/">Naar home</a></div>`;
  }
}

async function init() {
  $('#menu-btn').onclick = () => $('#nav').classList.toggle('open');
  const [{ user }, meta] = await Promise.all([api('/api/auth/me'), api('/api/meta')]);
  state.user = user;
  state.meta = meta;
  renderAuthSlot();
  window.addEventListener('hashchange', router);
  router();
}

init();
