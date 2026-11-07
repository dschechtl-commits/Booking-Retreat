'use strict';
/* Retreatly – front-end (vanilla JS, hash-router) */

const $ = (sel, root = document) => root.querySelector(sel);
const app = $('#app');
const state = { user: null, meta: null };

// ---------- helpers ----------
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const euro = (n) => new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n);
const fmtDate = (d, opts = { day: 'numeric', month: 'long', year: 'numeric' }) => new Date(d + 'T00:00:00').toLocaleDateString('nl-NL', opts);
const addDays = (d, n) => { const x = new Date(d + 'T00:00:00Z'); x.setUTCDate(x.getUTCDate() + n); return x.toISOString().slice(0, 10); };
const initials = (name) => name.split(/\s+/).map((p) => p[0]).slice(0, 2).join('').toUpperCase();

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
  const b = badges ? `<span class="badge">${esc(r.type)}</span>${r.region ? `<span class="badge region">${esc(r.region)}</span>` : ''}` : '';
  return `<div class="art ${cls}" style="background:linear-gradient(135deg,${c1},${c2})"><span aria-hidden="true">${emoji}</span>${img}${b}</div>`;
}

async function api(path, opts = {}) {
  const res = await fetch(path, {
    method: opts.method || 'GET',
    headers: opts.body ? { 'Content-Type': 'application/json' } : (opts.method && opts.method !== 'GET' ? { 'Content-Type': 'application/json' } : {}),
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
  return `<a class="card" href="#/retreat/${esc(r.id)}">
    ${art(r)}
    <div class="card-body">
      <div class="card-meta"><span>📍 ${esc(r.city)}, ${esc(r.country)}</span>${r.reviews ? `<span class="rating">★ ${r.rating.toFixed(2).replace('.', ',')}</span>` : '<span class="rating">Nieuw</span>'}</div>
      <h3>${esc(r.title)}</h3>
      <div class="muted small">${r.nights} nachten${next ? ` · vanaf ${fmtDate(next.date, { day: 'numeric', month: 'short' })}` : ' · volgeboekt'}</div>
      <div class="card-foot"><span class="price">${euro(r.pricePerPerson)} <small>p.p.</small></span></div>
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
    slot.innerHTML = `<a href="#/account">👤 ${esc(state.user.name.split(' ')[0])}</a><button class="btn btn-ghost btn-sm" id="logout-btn">Uitloggen</button>`;
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
    <p class="muted small">${isLogin ? 'Log in om te boeken of je locatie aan te bieden.' : 'Met één account kun je retreats boeken én aanbieden.'}</p>
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
async function viewHome() {
  const { retreats } = await api('/api/retreats?sort=aanbevolen');
  const types = state.meta.types;
  const months = [...Array(6)].map((_, i) => {
    const d = new Date(); d.setDate(1); d.setMonth(d.getMonth() + i);
    return { v: d.toISOString().slice(0, 7), l: d.toLocaleDateString('nl-NL', { month: 'long', year: 'numeric' }) };
  });
  app.innerHTML = `
  <section class="hero">
    <div class="container">
      <h1>Vind jouw retreat in Europa of Azië</h1>
      <p class="lead">Yoga in Bali, stilte in Thailand, surfen in Portugal of wellness in Toscane. Ontdek unieke retreats van lokale hosts en boek direct.</p>
      <form class="search" id="home-search">
        <div class="sfield"><label for="s-q">Waar of wat?</label><input id="s-q" name="q" placeholder="Bijv. Bali, yoga, Portugal…"></div>
        <div class="sfield"><label for="s-type">Type</label><select id="s-type" name="type"><option value="">Alle types</option>${types.map((t) => `<option>${esc(t)}</option>`).join('')}</select></div>
        <div class="sfield"><label for="s-month">Wanneer</label><select id="s-month" name="month"><option value="">Flexibel</option>${months.map((m) => `<option value="${m.v}">${m.l}</option>`).join('')}</select></div>
        <button class="btn btn-accent" type="submit">Zoeken</button>
      </form>
    </div>
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
    <div class="cards">${retreats.slice(0, 6).map(retreatCard).join('')}</div>
  </section>

  <section class="block container" style="padding-top:0">
    <h2>Waar heb jij behoefte aan?</h2>
    <div class="types">${types.map((t) => `<a class="type-pill" href="#/retreats?type=${encodeURIComponent(t)}">${TYPE_ART[t]?.[0] || ''} ${esc(t)}</a>`).join('')}</div>
  </section>

  <section class="block container" style="padding-top:0">
    <h2>Zo werkt het</h2>
    <div class="steps">
      <div class="step"><div class="num">1</div><h3>Ontdek</h3><p class="muted">Filter op land, type retreat, budget en periode.</p></div>
      <div class="step"><div class="num">2</div><h3>Boek</h3><p class="muted">Kies een startdatum, het aantal personen en boek direct — beschikbaarheid is live.</p></div>
      <div class="step"><div class="num">3</div><h3>Kom tot rust</h3><p class="muted">Je ontvangt je bevestiging en vindt al je boekingen terug in je account.</p></div>
    </div>
  </section>

  <section class="block container" style="padding-top:0">
    <div class="cta-host">
      <div><h2>Heb jij een retreatlocatie?</h2><p>Bied je retreat gratis aan en bereik gasten uit heel Europa en Azië. Beheer je data, capaciteit en boekingen op één plek.</p></div>
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

async function viewList(query) {
  const f = {
    q: query.get('q') || '', region: query.get('region') || '', country: query.get('country') || '',
    type: query.get('type') || '', maxPrice: query.get('maxPrice') || '', month: query.get('month') || '',
    sort: query.get('sort') || 'aanbevolen',
  };
  const params = new URLSearchParams(Object.entries(f).filter(([, v]) => v));
  const { retreats } = await api('/api/retreats?' + params);
  const countries = f.region ? state.meta.countries[f.region] : [...state.meta.countries.Europa, ...state.meta.countries['Azië']];
  const title = f.region ? `Retreats in ${f.region}` : f.type ? `${f.type} retreats` : 'Alle retreats';

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
      <div class="field"><label for="f-q">Zoeken</label><input id="f-q" value="${esc(f.q)}" placeholder="Plaats, land, thema…"></div>
      <div class="field"><label for="f-country">Land</label><select id="f-country"><option value="">Alle landen</option>${countries.map((c) => `<option ${c === f.country ? 'selected' : ''}>${esc(c)}</option>`).join('')}</select></div>
      <div class="field"><label for="f-type">Type</label><select id="f-type"><option value="">Alle types</option>${state.meta.types.map((t) => `<option ${t === f.type ? 'selected' : ''}>${esc(t)}</option>`).join('')}</select></div>
      <div class="field"><label for="f-price">Max. prijs p.p.: <b id="price-out">${f.maxPrice ? euro(f.maxPrice) : 'geen'}</b></label><input id="f-price" type="range" min="300" max="2000" step="50" value="${f.maxPrice || 2000}"></div>
      <div class="field"><label for="f-month">Maand</label><input id="f-month" type="month" value="${esc(f.month)}"></div>
      <button class="btn btn-ghost btn-block btn-sm" id="reset">Filters wissen</button>
    </aside>
    <div>
      <div class="list-head">
        <div><h1 style="font-size:2rem;margin:0">${esc(title)}</h1><span class="muted">${retreats.length} ${retreats.length === 1 ? 'retreat' : 'retreats'} gevonden</span></div>
        <select id="f-sort" aria-label="Sorteren">
          ${[['aanbevolen', 'Aanbevolen'], ['prijs-laag', 'Prijs: laag → hoog'], ['prijs-hoog', 'Prijs: hoog → laag'], ['datum', 'Eerstvolgende datum'], ['nieuw', 'Nieuwste']]
            .map(([v, l]) => `<option value="${v}" ${f.sort === v ? 'selected' : ''}>${l}</option>`).join('')}
        </select>
      </div>
      ${retreats.length ? `<div class="cards">${retreats.map(retreatCard).join('')}</div>`
        : `<div class="empty"><h3>Geen retreats gevonden</h3><p class="muted">Probeer andere filters of bekijk alle retreats.</p><a class="btn" href="#/retreats">Alle retreats</a></div>`}
    </div>
  </div>`;

  app.querySelectorAll('#region-seg button').forEach((b) => (b.onclick = () => update({ region: b.dataset.region, country: '' })));
  let qTimer;
  $('#f-q').oninput = (e) => { clearTimeout(qTimer); qTimer = setTimeout(() => update({ q: e.target.value.trim() }), 450); };
  $('#f-country').onchange = (e) => update({ country: e.target.value });
  $('#f-type').onchange = (e) => update({ type: e.target.value });
  $('#f-price').oninput = (e) => ($('#price-out').textContent = e.target.value === '2000' ? 'geen' : euro(e.target.value));
  $('#f-price').onchange = (e) => update({ maxPrice: e.target.value === '2000' ? '' : e.target.value });
  $('#f-month').onchange = (e) => update({ month: e.target.value });
  $('#f-sort').onchange = (e) => update({ sort: e.target.value });
  $('#reset').onclick = () => (location.hash = '#/retreats');
  if (f.q) { const i = $('#f-q'); i.focus(); i.setSelectionRange(i.value.length, i.value.length); }
}

async function viewDetail(id) {
  const { retreat: r } = await api('/api/retreats/' + encodeURIComponent(id));
  const isOwner = state.user && state.user.id === r.hostId;
  let selected = (r.dates.find((d) => d.available > 0) || {}).date;
  let guests = 1;

  app.innerHTML = `<div class="container detail">
    <div class="crumbs"><a href="#/retreats">Retreats</a> › <a href="#/retreats?region=${encodeURIComponent(r.region)}">${esc(r.region)}</a> › <a href="#/retreats?country=${encodeURIComponent(r.country)}">${esc(r.country)}</a></div>
    <h1>${esc(r.title)}</h1>
    <div class="muted">📍 ${esc(r.city)}, ${esc(r.country)} · ${r.reviews ? `★ ${r.rating.toFixed(2).replace('.', ',')} (${r.reviews} reviews)` : 'Nieuw op Retreatly'}</div>
    <div style="margin-top:22px">${art(r, 'art-lg')}</div>
    <div class="detail-grid">
      <div>
        <div class="facts">
          <span class="fact">🏷️ ${esc(r.type)}</span><span class="fact">🌙 ${r.nights} nachten</span>
          <span class="fact">👥 max. ${r.capacity} gasten</span><span class="fact">🌍 ${esc(r.region)}</span>
        </div>
        <h2>Over deze retreat</h2>
        <p class="description">${esc(r.description)}</p>
        ${r.amenities.length ? `<h2 style="margin-top:30px">Inbegrepen</h2><ul class="amenities">${r.amenities.map((a) => `<li>${esc(a)}</li>`).join('')}</ul>` : ''}
        <div class="host-box"><div class="avatar">${esc(initials(r.hostName))}</div><div><b>Aangeboden door ${esc(r.hostName)}</b><div class="muted small">Host op Retreatly</div></div></div>
      </div>
      <aside class="book-panel" id="book-panel"></aside>
    </div>
  </div>`;

  const panel = $('#book-panel');
  function renderPanel() {
    const sel = r.dates.find((d) => d.date === selected);
    const maxGuests = sel ? Math.min(sel.available, 20) : 1;
    if (guests > maxGuests) guests = Math.max(1, maxGuests);
    panel.innerHTML = `
      <div><span class="price">${euro(r.pricePerPerson)}</span> <span class="muted">per persoon · ${r.nights} nachten</span></div>
      <h3 style="margin-top:18px;font-family:var(--sans);font-size:1rem">Kies je startdatum</h3>
      <div class="dates">${r.dates.length ? r.dates.map((d) => `<button type="button" class="date-opt ${d.date === selected ? 'selected' : ''}" data-date="${d.date}" ${d.available ? '' : 'disabled'}>
          <span><b>${fmtDate(d.date, { day: 'numeric', month: 'short' })}</b> – ${fmtDate(addDays(d.date, r.nights), { day: 'numeric', month: 'short', year: 'numeric' })}</span>
          <span class="spots ${d.available && d.available <= 3 ? 'low' : ''}">${d.available ? `${d.available} plek${d.available === 1 ? '' : 'ken'}` : 'Vol'}</span></button>`).join('')
        : '<p class="muted">Geen toekomstige data beschikbaar.</p>'}</div>
      ${isOwner ? `<p class="muted small">Dit is jouw retreat. Beheer hem via <a href="#/account?tab=aanbod">Mijn aanbod</a>.</p>` : sel ? `
        <div class="field"><label for="b-guests">Aantal personen</label>
          <select id="b-guests">${[...Array(maxGuests)].map((_, i) => `<option ${i + 1 === guests ? 'selected' : ''}>${i + 1}</option>`).join('')}</select></div>
        <div class="field"><label for="b-note">Bericht aan de host <span class="muted">(optioneel)</span></label><textarea id="b-note" style="min-height:70px" placeholder="Dieetwensen, vragen…"></textarea></div>
        <div class="totals"><div><span>${euro(r.pricePerPerson)} × ${guests}</span><span>${euro(r.pricePerPerson * guests)}</span></div>
          <div class="grand"><span>Totaal</span><span>${euro(r.pricePerPerson * guests)}</span></div></div>
        <button class="btn btn-block" style="margin-top:16px" id="book-btn">${state.user ? 'Nu boeken' : 'Inloggen & boeken'}</button>
        <p class="center muted small" style="margin:10px 0 0">Gratis annuleren via je account</p>` : '<p class="muted">Alle data zijn volgeboekt.</p>'}`;

    panel.querySelectorAll('.date-opt').forEach((b) => (b.onclick = () => { selected = b.dataset.date; renderPanel(); }));
    const g = $('#b-guests', panel);
    if (g) g.onchange = (e) => { guests = Number(e.target.value); const note = $('#b-note', panel).value; renderPanel(); $('#b-note', panel).value = note; };
    const btn = $('#book-btn', panel);
    if (btn) btn.onclick = () => (state.user ? book() : openAuth('login', () => { renderAuthSlot(); viewDetail(id); }));
  }

  async function book() {
    const btn = $('#book-btn', panel);
    btn.disabled = true;
    try {
      const { booking } = await api('/api/bookings', { method: 'POST', body: { retreatId: r.id, startDate: selected, guests, note: $('#b-note', panel).value } });
      app.innerHTML = `<div class="container page"><div class="panel success-hero">
        <div class="icon">🎉</div><h1>Je boeking is bevestigd!</h1>
        <p class="muted">${esc(r.title)}<br>${fmtDate(booking.startDate)} – ${fmtDate(addDays(booking.startDate, r.nights))} · ${booking.guests} ${booking.guests === 1 ? 'persoon' : 'personen'} · ${euro(booking.totalPrice)}</p>
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
    app.innerHTML = `<div class="container page"><div class="panel center" style="max-width:640px;margin:auto">
      <h1>Bied je retreatlocatie aan</h1>
      <p class="muted">Maak gratis een account aan en plaats je retreat binnen enkele minuten. Gasten uit heel Europa en Azië kunnen direct boeken.</p>
      <div style="display:flex;gap:10px;justify-content:center;flex-wrap:wrap"><button class="btn" id="reg">Account aanmaken</button><button class="btn btn-ghost" id="log">Inloggen</button></div>
    </div></div>`;
    $('#reg').onclick = () => openAuth('register');
    $('#log').onclick = () => openAuth('login');
    return;
  }
  const r = existing || { region: 'Europa', amenities: [], startDates: [] };
  let dates = [...(r.startDates || [])].filter((d) => d >= new Date().toISOString().slice(0, 10));
  const { countries, types } = state.meta;

  app.innerHTML = `<div class="container page form-wrap">
    <h1>${existing ? 'Retreat bewerken' : 'Bied je retreat aan'}</h1>
    <p class="muted">${existing ? 'Pas de gegevens van je retreat aan.' : 'Vertel gasten wat jouw locatie bijzonder maakt. Je kunt alles later nog aanpassen.'}</p>
    <form class="panel" id="host-form" novalidate>
      <div id="host-error"></div>
      <div class="field"><label for="h-title">Titel</label><input id="h-title" name="title" required maxlength="120" value="${esc(r.title)}" placeholder="Bijv. Yoga & Meditatie aan zee"></div>
      <div class="grid-2">
        <div class="field"><label for="h-type">Type retreat</label><select id="h-type" name="type">${types.map((t) => `<option ${t === r.type ? 'selected' : ''}>${esc(t)}</option>`).join('')}</select></div>
        <div class="field"><label for="h-region">Regio</label><select id="h-region" name="region">${Object.keys(countries).map((k) => `<option ${k === r.region ? 'selected' : ''}>${esc(k)}</option>`).join('')}</select></div>
      </div>
      <div class="grid-2">
        <div class="field"><label for="h-country">Land</label><select id="h-country" name="country"></select></div>
        <div class="field"><label for="h-city">Plaats</label><input id="h-city" name="city" required value="${esc(r.city)}" placeholder="Bijv. Ericeira"></div>
      </div>
      <div class="field"><label for="h-desc">Beschrijving</label><textarea id="h-desc" name="description" required maxlength="3000" placeholder="Programma, accommodatie, eten, omgeving…">${esc(r.description)}</textarea></div>
      <div class="grid-3">
        <div class="field"><label for="h-price">Prijs p.p. (€)</label><input id="h-price" name="pricePerPerson" type="number" min="1" required value="${esc(r.pricePerPerson)}"></div>
        <div class="field"><label for="h-nights">Aantal nachten</label><input id="h-nights" name="nights" type="number" min="1" max="90" required value="${esc(r.nights)}"></div>
        <div class="field"><label for="h-cap">Max. gasten</label><input id="h-cap" name="capacity" type="number" min="1" max="200" required value="${esc(r.capacity)}"></div>
      </div>
      <div class="field"><label for="h-amen">Wat is inbegrepen?</label><input id="h-amen" name="amenities" value="${esc((r.amenities || []).join(', '))}" placeholder="Ontbijt, Yogamat, Transfer vanaf luchthaven"><div class="hint">Scheid met komma's</div></div>
      <div class="field"><label for="h-img">Foto-URL <span class="muted">(optioneel)</span></label><input id="h-img" name="image" type="url" value="${esc(r.image)}" placeholder="https://…"><div class="hint">Link naar een foto van je locatie (https). Zonder foto tonen we een illustratie.</div></div>
      <div class="field"><label for="h-date">Startdata</label>
        <div class="inline"><input id="h-date" type="date" min="${new Date().toISOString().slice(0, 10)}"><button type="button" class="btn btn-ghost" id="add-date">Toevoegen</button></div>
        <div class="date-list" id="date-list"></div></div>
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

  const renderDates = () => {
    $('#date-list').innerHTML = dates.length
      ? dates.map((d) => `<span class="date-chip">${fmtDate(d, { day: 'numeric', month: 'short', year: 'numeric' })}<button type="button" data-d="${d}" aria-label="Verwijder">×</button></span>`).join('')
      : '<span class="muted small">Nog geen data toegevoegd</span>';
    app.querySelectorAll('.date-chip button').forEach((b) => (b.onclick = () => { dates = dates.filter((x) => x !== b.dataset.d); renderDates(); }));
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
    const body = Object.fromEntries(new FormData(e.target));
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

async function viewAccount(query) {
  if (!state.user) {
    app.innerHTML = `<div class="container page"><div class="panel center" style="max-width:560px;margin:auto"><h1>Mijn account</h1><p class="muted">Log in om je boekingen en aanbod te bekijken.</p><button class="btn" id="log">Inloggen</button></div></div>`;
    $('#log').onclick = () => openAuth('login');
    return;
  }
  const tab = query.get('tab') === 'aanbod' ? 'aanbod' : 'boekingen';
  const [{ bookings }, { listings }] = await Promise.all([api('/api/me/bookings'), api('/api/me/listings')]);
  const today = new Date().toISOString().slice(0, 10);

  const bookingsHtml = bookings.length ? bookings.map((b) => `
    <div class="row-card">
      ${b.retreat ? art({ ...b.retreat }, '', false) : '<div class="art">✨</div>'}
      <div>
        <span class="status ${b.status}">${b.status}</span>
        <h3 style="margin:6px 0 2px">${b.retreat ? `<a href="#/retreat/${esc(b.retreat.id)}" style="text-decoration:none">${esc(b.retreat.title)}</a>` : 'Verwijderde retreat'}</h3>
        <div class="muted small">${b.retreat ? `📍 ${esc(b.retreat.city)}, ${esc(b.retreat.country)} · ` : ''}${fmtDate(b.startDate)}${b.retreat ? ` – ${fmtDate(addDays(b.startDate, b.retreat.nights))}` : ''}</div>
        <div class="small">${b.guests} ${b.guests === 1 ? 'persoon' : 'personen'} · <b>${euro(b.totalPrice)}</b> · <span class="muted">#${esc(b.id)}</span></div>
      </div>
      <div>${b.status === 'bevestigd' && b.startDate >= today ? `<button class="btn btn-danger btn-sm" data-cancel="${esc(b.id)}">Annuleren</button>` : ''}</div>
    </div>`).join('')
    : `<div class="empty"><h3>Nog geen boekingen</h3><p class="muted">Tijd voor een retreat?</p><a class="btn" href="#/retreats">Ontdek retreats</a></div>`;

  const listingsHtml = (listings.length ? listings.map((r) => {
    const active = r.bookings.filter((b) => b.status === 'bevestigd');
    return `<div class="row-card" style="align-items:start">
      ${art(r, '', false)}
      <div>
        <h3 style="margin:0 0 2px"><a href="#/retreat/${esc(r.id)}" style="text-decoration:none">${esc(r.title)}</a></h3>
        <div class="muted small">📍 ${esc(r.city)}, ${esc(r.country)} · ${euro(r.pricePerPerson)} p.p. · ${r.nights} nachten</div>
        <div class="stats" style="margin-top:6px"><span><b>${active.length}</b> boekingen</span><span><b>${active.reduce((n, b) => n + b.guests, 0)}</b> gasten</span><span><b>${euro(r.revenue)}</b> omzet</span><span><b>${r.dates.length}</b> komende data</span></div>
        ${r.bookings.length ? `<details class="host-bookings"><summary>Boekingen bekijken</summary><div class="table-scroll"><table class="bookings">
          <tr><th>Gast</th><th>Startdatum</th><th>Pers.</th><th>Bedrag</th><th>Status</th><th></th></tr>
          ${r.bookings.map((b) => `<tr><td>${esc(b.guestName)}<br><span class="muted">${esc(b.guestEmail)}</span>${b.note ? `<br><i class="muted">“${esc(b.note)}”</i>` : ''}</td><td>${fmtDate(b.startDate, { day: 'numeric', month: 'short', year: 'numeric' })}</td><td>${b.guests}</td><td>${euro(b.totalPrice)}</td><td><span class="status ${b.status}">${b.status}</span></td>
            <td>${b.status === 'bevestigd' && b.startDate >= today ? `<button class="btn btn-danger btn-sm" data-cancel="${esc(b.id)}">Annuleer</button>` : ''}</td></tr>`).join('')}
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
      <a href="#/account?tab=aanbod" class="${tab === 'aanbod' ? 'active' : ''}">Mijn aanbod (${listings.length})</a>
    </div>
    ${tab === 'boekingen' ? bookingsHtml : listingsHtml}
  </div>`;

  app.querySelectorAll('[data-cancel]').forEach((b) => (b.onclick = async () => {
    if (!confirm('Weet je zeker dat je deze boeking wilt annuleren?')) return;
    try { await api(`/api/bookings/${b.dataset.cancel}/cancel`, { method: 'POST' }); toast('Boeking geannuleerd'); viewAccount(query); }
    catch (err) { toast(err.message, true); }
  }));
  app.querySelectorAll('[data-delete]').forEach((b) => (b.onclick = async () => {
    if (!confirm('Weet je zeker dat je deze retreat wilt verwijderen?')) return;
    try { await api(`/api/retreats/${b.dataset.delete}`, { method: 'DELETE' }); toast('Retreat verwijderd'); viewAccount(query); }
    catch (err) { toast(err.message, true); }
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
