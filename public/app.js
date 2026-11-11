'use strict';
/* NEWNEI Events – front-end (vanilla JS, hash-router, meertalig: zie i18n.js) */

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
const app = $('#app');
const state = { user: null, meta: null, lang: detectLang() };

// ---------- taal ----------
function detectLang() {
  const fromUrl = new URLSearchParams(location.search).get('lang');
  if (I18N_LANGS.includes(fromUrl)) return fromUrl;
  try { const saved = localStorage.getItem('lang'); if (I18N_LANGS.includes(saved)) return saved; } catch {}
  const nav = (navigator.language || 'nl').slice(0, 2).toLowerCase();
  return I18N_LANGS.includes(nav) ? nav : 'nl';
}
const LOCALE = () => I18N_LOCALES[state.lang];
// t('sleutel', { n: 3 }) – valt terug op Nederlands als een vertaling ontbreekt.
function t(key, vars = {}) {
  const dict = I18N_STRINGS[state.lang] || I18N_STRINGS.nl;
  let s = dict[key] ?? I18N_STRINGS.nl[key] ?? key;
  return s.replace(/\{(\w+)\}/g, (_, k) => (vars[k] !== undefined ? vars[k] : ''));
}
// Meervoud: sleutel_one / sleutel_other.
const tn = (key, n, vars = {}) => t(`${key}_${n === 1 ? 'one' : 'other'}`, { n, ...vars });
// Vaste waarden (types, landen, diëten…) in de gekozen taal; opslag blijft Nederlands.
const tv = (group, value) => (I18N_VALUES[group] && I18N_VALUES[group][value] && I18N_VALUES[group][value][state.lang]) || value;
// Inhoud van een event (titel/beschrijving) in de gekozen taal als de facilitator een vertaling gaf.
const tr = (r, field) => (state.lang !== 'nl' && r.translations && r.translations[state.lang] && r.translations[state.lang][field]) || r[field];

function setLang(lang) {
  if (!I18N_LANGS.includes(lang) || lang === state.lang) return;
  state.lang = lang;
  try { localStorage.setItem('lang', lang); } catch {}
  applyStatic();
  renderDemoBanner();
  renderAuthSlot();
  router();
}

const FLAGS = {
  nl: '<svg viewBox="0 0 30 20" aria-hidden="true"><rect width="30" height="20" fill="#21468B"/><rect width="30" height="13.33" fill="#fff"/><rect width="30" height="6.67" fill="#AE1C28"/></svg>',
  en: '<svg viewBox="0 0 60 40" aria-hidden="true"><clipPath id="fl-uk"><rect width="60" height="40"/></clipPath><g clip-path="url(#fl-uk)"><rect width="60" height="40" fill="#012169"/><path d="M0,0 60,40M60,0 0,40" stroke="#fff" stroke-width="8"/><path d="M0,0 60,40M60,0 0,40" stroke="#C8102E" stroke-width="3"/><path d="M30,0V40M0,20H60" stroke="#fff" stroke-width="12"/><path d="M30,0V40M0,20H60" stroke="#C8102E" stroke-width="7"/></g></svg>',
  fr: '<svg viewBox="0 0 30 20" aria-hidden="true"><rect width="30" height="20" fill="#fff"/><rect width="10" height="20" fill="#002654"/><rect x="20" width="10" height="20" fill="#CE1126"/></svg>',
  es: '<svg viewBox="0 0 30 20" aria-hidden="true"><rect width="30" height="20" fill="#AA151B"/><rect y="5" width="30" height="10" fill="#F1BF00"/></svg>',
};
const LANG_NAMES = { nl: 'Nederlands', en: 'English', fr: 'Français', es: 'Español' };
// Taal van de site → waarde in het taalfilter van events.
const EVENT_LANG = { nl: 'Nederlands', en: 'Engels', fr: 'Frans', es: 'Spaans' };

function renderLangSwitch() {
  $('#lang-switch').innerHTML = I18N_LANGS.map((l) => `<button type="button" class="lang-btn ${l === state.lang ? 'active' : ''}" data-lang="${l}" lang="${l}" aria-pressed="${l === state.lang}" title="${LANG_NAMES[l]}"><span class="flag">${FLAGS[l]}</span><span class="code">${l.toUpperCase()}</span></button>`).join('');
  $$('#lang-switch [data-lang]').forEach((b) => (b.onclick = () => setLang(b.dataset.lang)));
}

// Vaste teksten in index.html (navigatie, footer, meta).
function applyStatic() {
  document.documentElement.lang = state.lang;
  document.title = t('meta.title');
  const md = $('meta[name="description"]');
  if (md) md.content = t('meta.description');
  $$('[data-i18n]').forEach((el) => (el.textContent = t(el.dataset.i18n)));
  $('#menu-btn').setAttribute('aria-label', t('nav.menu'));
  renderLangSwitch();
}

// Demo-melding (alleen als de server in demomodus draait, bijv. op Vercel).
function renderDemoBanner() {
  let el = $('#demo-banner');
  if (!state.meta || !state.meta.demo) { if (el) el.remove(); return; }
  if (!el) { el = document.createElement('div'); el.id = 'demo-banner'; el.className = 'demo-banner'; document.body.prepend(el); }
  el.textContent = t('demo.banner');
}

// ---------- helpers ----------
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const euro = (n) => new Intl.NumberFormat(LOCALE(), { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n);
const fmtDate = (d, opts = { day: 'numeric', month: 'long', year: 'numeric' }) => new Date(d + 'T00:00:00').toLocaleDateString(LOCALE(), opts);
const addDays = (d, n) => { const x = new Date(d + 'T00:00:00Z'); x.setUTCDate(x.getUTCDate() + n); return x.toISOString().slice(0, 10); };
const initials = (name) => name.split(/\s+/).map((p) => p[0]).slice(0, 2).join('').toUpperCase();
const today = () => new Date().toISOString().slice(0, 10);
const stars = (n) => '★'.repeat(Math.round(n)) + '☆'.repeat(5 - Math.round(n));
const fmtRating = (n) => new Intl.NumberFormat(LOCALE(), { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);
const ICON = {
  leaf: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M5 19c0-9 6-14 15-14 0 9-5 15-14 15"/><path d="M5 19c3-4 6-7 10-9"/></svg>',
  shield: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l7 3v5c0 5-3 8-7 10-4-2-7-5-7-10V6z"/><path d="M9 12l2 2 4-4"/></svg>',
  return: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12a8 8 0 1 0 3-6.2"/><path d="M4 4v4h4"/></svg>',
  heart: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z"/></svg>',
};
const status = (s) => t('status.' + s);

// Aardse kleur per soort event (voor bolletjes en accenten).
const TYPE_ART = {
  'Retreat': ['', '#6B8F5E'],
  'Experience Day': ['', '#C9925E'],
  'Workshop': ['', '#4F7F63'],
  'Masterclass': ['', '#5E8A8C'],
  'Avondsessie': ['', '#4A5470'],
  'Meerdaagse training': ['', '#B5714C'],
};
// Landschapspaletten: lucht (2), zon/maan, heuvels van ver naar dichtbij.
const LANDSCAPES = {
  'Retreat': { sky: ['#F4E7CC', '#E7CFA2'], sun: '#FBF3DF', hills: ['#B7C8A8', '#86A777', '#557D5A', '#2C4A3B'] },
  'Experience Day': { sky: ['#F7DFC2', '#EDBB8E'], sun: '#FFF5E2', hills: ['#DDBB91', '#B98F62', '#7F8F5A', '#3F5A40'] },
  'Workshop': { sky: ['#E3ECDD', '#C3D6C2'], sun: '#F6F2E7', hills: ['#A6C2A2', '#73A083', '#3F7057', '#1F3A2E'], trees: true },
  'Masterclass': { sky: ['#E1EAE8', '#BCD2D2'], sun: '#F6F2E7', hills: ['#97B7B6', '#628E90', '#3C6466', '#1E3D3E'], water: true },
  'Avondsessie': { sky: ['#2B3651', '#4E5A78'], sun: '#F2E7C9', hills: ['#414F66', '#323F52', '#232E3C', '#151C26'], night: true },
  'Meerdaagse training': { sky: ['#F4DCC6', '#E4AC86'], sun: '#FCEDD6', hills: ['#CF9670', '#AB714D', '#73603F', '#3F3C2B'] },
  hero: { sky: ['#2C4A3B', '#3E5E4B'], sun: '#E6CF98', hills: ['#4D6E57', '#3A5A46', '#2A4536', '#1B3026'], dusk: true },
  europa: { sky: ['#E5ECE0', '#C9D8C4'], sun: '#F7F2E6', hills: ['#A9BFA0', '#7FA27A', '#4F7A5A', '#2C4A3B'], trees: true },
  azie: { sky: ['#F3E2C6', '#E3BE8E'], sun: '#FBF0DA', hills: ['#BFC79A', '#93A86E', '#5F804F', '#344D30'], terraces: true },
};

// Klein deterministisch random-getal op basis van een tekst, zodat elk event een eigen landschap heeft.
function seeded(str) {
  let h = 2166136261;
  for (const c of String(str)) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return () => ((h = Math.imul(h ^ (h >>> 15), 2246822507) ^ Math.imul(h ^ (h >>> 13), 3266489909)) >>> 0) / 4294967296;
}

function hillPath(rnd, base, amp, W = 400, H = 300) {
  const n = 4 + Math.floor(rnd() * 3);
  const pts = [...Array(n + 1)].map((_, i) => [(i / n) * W, base - rnd() * amp]);
  let d = `M0,${H} L0,${pts[0][1].toFixed(1)}`;
  for (let i = 0; i < n; i++) {
    const [x1, y1] = pts[i], [x2, y2] = pts[i + 1];
    const mx = (x1 + x2) / 2;
    d += ` C${mx.toFixed(1)},${y1.toFixed(1)} ${mx.toFixed(1)},${y2.toFixed(1)} ${x2.toFixed(1)},${y2.toFixed(1)}`;
  }
  return d + ` L${W},${H} Z`;
}

function landscape(seed, pal) {
  const rnd = seeded(seed);
  const id = 'g' + Math.floor(rnd() * 1e9).toString(36);
  const sunX = 70 + rnd() * 260, sunY = 70 + rnd() * 50, sunR = pal.night ? 22 : 30 + rnd() * 18;
  let out = `<svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false">
    <defs><linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${pal.sky[0]}"/><stop offset="1" stop-color="${pal.sky[1]}"/></linearGradient>
    <radialGradient id="${id}s"><stop offset="0" stop-color="${pal.sun}" stop-opacity=".9"/><stop offset="1" stop-color="${pal.sun}" stop-opacity="0"/></radialGradient></defs>
    <rect width="400" height="300" fill="url(#${id})"/>`;
  if (pal.night || pal.dusk) for (let i = 0; i < 26; i++) out += `<circle cx="${(rnd() * 400).toFixed(0)}" cy="${(rnd() * 140).toFixed(0)}" r="${(rnd() * 1.1 + .3).toFixed(2)}" fill="#F6EFD9" opacity="${(rnd() * .6 + .3).toFixed(2)}"/>`;
  out += `<circle cx="${sunX}" cy="${sunY}" r="${sunR * 2.4}" fill="url(#${id}s)" opacity=".55"/><circle cx="${sunX}" cy="${sunY}" r="${sunR}" fill="${pal.sun}"/>`;
  if (pal.night) out += `<circle cx="${sunX + 9}" cy="${sunY - 6}" r="${sunR}" fill="${pal.sky[0]}"/>`;
  const bases = [150, 185, 220, 255];
  pal.hills.forEach((c, i) => {
    if (pal.water && i === 2) out += `<rect y="${bases[2] - 18}" width="400" height="80" fill="${pal.hills[0]}" opacity=".55"/><path d="M40 ${bases[2] - 8} h70 M210 ${bases[2] - 2} h90 M120 ${bases[2] + 6} h50" stroke="#F6F2E7" stroke-width="1.5" stroke-linecap="round" opacity=".6"/>`;
    out += `<path d="${hillPath(rnd, bases[i], [70, 55, 40, 30][i])}" fill="${c}"/>`;
    if (pal.terraces && i === 1) for (let k = 0; k < 4; k++) out += `<path d="${hillPath(seeded(seed + k), bases[1] + 12 + k * 9, 12)}" fill="none" stroke="#F3E8C8" stroke-width="1" opacity=".35"/>`;
    if (pal.trees && i === 2) for (let k = 0; k < 9; k++) {
      const x = 15 + rnd() * 370, y = bases[2] - 8 - rnd() * 20, h = 16 + rnd() * 20;
      out += `<path d="M${x.toFixed(0)} ${(y - h).toFixed(0)} L${(x + h * .32).toFixed(0)} ${y.toFixed(0)} L${(x - h * .32).toFixed(0)} ${y.toFixed(0)} Z" fill="${pal.hills[3]}" opacity=".85"/>`;
    }
  });
  return out + '</svg>';
}

const typeArt = (t) => TYPE_ART[t] || ['', '#6B8F5E'];
const nightsLabel = (n) => (n === 0 ? t('dur.day') : tn('dur.nights', n));
const durationLabel = (d) => (d === 'dag' ? t('dur.day') : t('dur.range', { r: d }));
const dateRange = (start, nights, short = false) => {
  const o = short ? { day: 'numeric', month: 'short' } : { day: 'numeric', month: 'long', year: 'numeric' };
  return nights ? `${fmtDate(start, o)} – ${fmtDate(addDays(start, nights), o)}` : fmtDate(start, { weekday: 'long', ...o });
};
const place = (r) => `${esc(r.city)}, ${esc(tv('countries', r.country))}`;

// Sfeerbeelden naast de hoofdfoto: verblijf en eten voor meerdaagse events, verbinding en rust voor dagevents.
const GALLERY = {
  stay: ['/img/gal-stay.jpg', '/img/gal-food.jpg', '/img/gal-lake.jpg', '/img/gal-pool.jpg', '/img/gal-forest.jpg', '/img/gal-food2.jpg'],
  day: ['/img/people-hands.jpg', '/img/gal-mala.jpg', '/img/gal-stones.jpg', '/img/people-reach.jpg', '/img/gal-food2.jpg', '/img/gal-forest.jpg'],
};
function galleryFor(r) {
  const pool = GALLERY[r.nights ? 'stay' : 'day'];
  const rnd = seeded(r.id);
  const start = Math.floor(rnd() * pool.length);
  return [0, 1].map((i) => pool[(start + i * 2) % pool.length]);
}

function art(r, cls = '', badges = true) {
  const img = r.image ? `<img src="${esc(r.image)}" alt="" loading="lazy" referrerpolicy="no-referrer" onerror="this.remove()">` : '';
  const b = badges ? `<span class="badge"><span class="dot-c" style="background:${typeArt(r.type)[1]}"></span>${esc(tv('types', r.type))}</span>` : '';
  return `<div class="art ${cls}">${landscape(r.id || r.title, LANDSCAPES[r.type] || LANDSCAPES.Retreat)}${img}${b}</div>`;
}

function favButton(id, extra = '') {
  const on = state.user && state.user.favorites.includes(id);
  return `<button type="button" class="fav ${on ? 'on' : ''} ${extra}" data-fav="${esc(id)}" aria-pressed="${on}" aria-label="${on ? t('fav.remove') : t('fav.add')}">${on ? '♥' : '♡'}</button>`;
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
      b.setAttribute('aria-label', saved ? t('fav.remove') : t('fav.add'));
    });
    toast(saved ? t('fav.saved') : t('fav.removed'));
  } catch (err) { toast(err.message, true); }
}
document.addEventListener('click', (e) => {
  const b = e.target.closest('[data-fav]');
  if (b) { e.preventDefault(); e.stopPropagation(); toggleFav(b.dataset.fav); }
});

async function api(path, opts = {}) {
  const method = opts.method || 'GET';
  const headers = { 'X-Lang': state.lang };
  if (method !== 'GET') headers['Content-Type'] = 'application/json';
  const res = await fetch(path, { method, headers, body: opts.body ? JSON.stringify(opts.body) : undefined, credentials: 'same-origin' });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw Object.assign(new Error(data.error || t('err.generic')), { status: res.status });
  return data;
}

let toastTimer;
function toast(msg, isError = false) {
  const el = $('#toast');
  el.textContent = msg;
  el.className = 'toast show' + (isError ? ' error' : '');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => (el.className = 'toast'), 3200);
}

function retreatCard(r) {
  const next = r.dates && r.dates.find((d) => d.available > 0);
  const tags = [r.instantBooking ? '⚡ ' + t('tag.instant') : '', r.cancellation === 'flexibel' ? '✓ ' + t('tag.freeCancel') : ''].filter(Boolean);
  return `<a class="card" href="#/retreat/${esc(r.id)}">
    <div class="card-art">${art(r)}${favButton(r.id)}</div>
    <div class="card-body">
      <div class="card-meta"><span>📍 ${place(r)}</span>${r.reviews ? `<span class="rating">★ ${fmtRating(r.rating)} <span class="muted">(${r.reviews})</span></span>` : `<span class="rating">${t('card.new')}</span>`}</div>
      <h3>${esc(tr(r, 'title'))}</h3>
      <div class="muted small">${nightsLabel(r.nights)} · ${esc(tv('levels', r.level))} · ${next ? t('card.from', { date: fmtDate(next.date, { day: 'numeric', month: 'short' }) }) : t('card.full')}</div>
      ${tags.length ? `<div class="tags">${tags.map((x) => `<span>${x}</span>`).join('')}</div>` : ''}
      <div class="card-foot"><span class="price"><small>${t('price.from')}</small> ${euro(r.pricePerPerson)} <small>${t('price.pp')}</small></span></div>
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
    slot.innerHTML = `<a href="#/account?tab=verlanglijst" title="${t('acc.wishlist')}">♡</a><a href="#/account">👤 ${esc(state.user.name.split(' ')[0])}</a><button class="btn btn-ghost btn-sm" id="logout-btn">${t('auth.logout')}</button>`;
    $('#logout-btn').onclick = async () => {
      await api('/api/auth/logout', { method: 'POST' });
      state.user = null;
      renderAuthSlot();
      toast(t('auth.loggedOut'));
      location.hash = '#/';
    };
  } else {
    slot.innerHTML = `<button class="btn btn-sm" id="login-btn">${t('auth.login')}</button>`;
    $('#login-btn').onclick = () => openAuth('login');
  }
}

function openAuth(mode = 'login', onSuccess) {
  const modal = $('#modal');
  const isLogin = mode === 'login';
  modal.innerHTML = `<div class="modal-inner">
    <button class="modal-close" aria-label="${t('ui.close')}">×</button>
    <h2>${isLogin ? t('auth.welcomeBack') : t('auth.createAccount')}</h2>
    <p class="muted small">${isLogin ? t('auth.loginIntro') : t('auth.registerIntro')}</p>
    <form id="auth-form">
      <div id="auth-error"></div>
      ${isLogin ? '' : `<div class="field"><label for="a-name">${t('auth.name')}</label><input id="a-name" name="name" required autocomplete="name"></div>`}
      <div class="field"><label for="a-email">${t('auth.email')}</label><input id="a-email" name="email" type="email" required autocomplete="email"></div>
      <div class="field"><label for="a-pw">${t('auth.password')}</label><input id="a-pw" name="password" type="password" required minlength="${isLogin ? 1 : 8}" autocomplete="${isLogin ? 'current-password' : 'new-password'}">${isLogin ? '' : `<div class="hint">${t('auth.pwHint')}</div>`}</div>
      <button class="btn btn-block" type="submit">${isLogin ? t('auth.login') : t('auth.register')}</button>
    </form>
    <p class="center small" style="margin-top:16px">${isLogin ? `${t('auth.noAccount')} <a href="#" id="switch-auth">${t('auth.registerLink')}</a>` : `${t('auth.haveAccount')} <a href="#" id="switch-auth">${t('auth.loginLink')}</a>`}</p>
    ${isLogin ? `<p class="center small muted">${t('auth.demo')}: <code>eva@demo.nl</code> / <code>demo1234</code></p>` : ''}
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
      toast(isLogin ? t('auth.welcomeName', { name: user.name.split(' ')[0] }) : t('auth.created'));
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
    return { v, l: d.toLocaleDateString(LOCALE(), { month: 'long', year: 'numeric' }) };
  });
}

async function viewHome() {
  const { retreats } = await api('/api/retreats?sort=aanbevolen');
  const { types, durations } = state.meta;
  app.innerHTML = `
  <section class="hero">
    <div class="hero-photo" aria-hidden="true"><img src="/img/hero.jpg" alt="" fetchpriority="high"></div>
    <div class="container">
      <span class="eyebrow">${t('home.eyebrow')}</span>
      <h1>${t('home.h1a')}<br><em>${t('home.h1b')}</em></h1>
      <p class="lead">${t('home.lead')} <strong>${t('home.tagline')}</strong></p>
      <p class="sub">${t('home.sub')}</p>
      <form class="search" id="home-search">
        <div class="sfield"><label for="s-q">${t('search.what')}</label><input id="s-q" name="q" placeholder="${t('search.whatPh')}"></div>
        <div class="sfield"><label for="s-type">${t('search.type')}</label><select id="s-type" name="type"><option value="">${t('search.all')}</option>${types.map((x) => `<option value="${esc(x)}">${esc(tv('types', x))}</option>`).join('')}</select></div>
        <div class="sfield"><label for="s-month">${t('search.when')}</label><select id="s-month" name="month"><option value="">${t('search.flexible')}</option>${monthOptions().map((m) => `<option value="${m.v}">${m.l}</option>`).join('')}</select></div>
        <div class="sfield"><label for="s-dur">${t('search.duration')}</label><select id="s-dur" name="duration"><option value="">${t('search.anyDuration')}</option>${durations.map((d) => `<option value="${d}">${durationLabel(d)}</option>`).join('')}</select></div>
        <button class="btn" type="submit">${t('search.go')}</button>
      </form>
      <div class="hero-chips"><span>${t('home.chip1')}</span><span>${t('home.chip2')}</span><span>${t('home.chip3')}</span></div>
    </div>
  </section>

  <section class="container trust">
    <div><span class="ico">${ICON.leaf}</span><b>${t('trust.1t')}</b><span>${t('trust.1')}</span></div>
    <div><span class="ico">${ICON.shield}</span><b>${t('trust.2t')}</b><span>${t('trust.2')}</span></div>
    <div><span class="ico">${ICON.return}</span><b>${t('trust.3t')}</b><span>${t('trust.3')}</span></div>
    <div><span class="ico">${ICON.heart}</span><b>${t('trust.4t')}</b><span>${t('trust.4')}</span></div>
  </section>

  <section class="block container">
    <div class="section-head"><div><span class="eyebrow">${t('home.destEyebrow')}</span><h2>${t('home.destA')}<br><em>${t('home.destB')}</em></h2></div></div>
    <div class="regions">
      <a class="region-card region-eu" href="#/retreats?region=Europa"><div class="region-land"><img src="/img/region-europe.jpg" alt="" loading="lazy"></div><h3>${tv('regions', 'Europa')}</h3><p>${t('home.europe')}</p>
        <div class="chips">${state.meta.countries.Europa.slice(0, 6).map((c) => `<span>${esc(tv('countries', c))}</span>`).join('')}</div></a>
      <a class="region-card region-as" href="#/retreats?region=${encodeURIComponent('Azië')}"><div class="region-land"><img src="/img/region-asia.jpg" alt="" loading="lazy"></div><h3>${tv('regions', 'Azië')}</h3><p>${t('home.asia')}</p>
        <div class="chips">${state.meta.countries['Azië'].slice(0, 6).map((c) => `<span>${esc(tv('countries', c))}</span>`).join('')}</div></a>
    </div>
  </section>

  <section class="block container" style="padding-top:0">
    <div class="section-head"><div><span class="eyebrow">${t('home.soon')}</span><h2>${t('home.popular')}</h2></div><a class="btn btn-ghost" href="#/retreats">${t('home.viewAll')} →</a></div>
    <div class="cards">${retreats.slice(0, 8).map(retreatCard).join('')}</div>
  </section>

  <section class="block container community">
    <div class="community-text">
      <span class="eyebrow">${t('community.eyebrow')}</span>
      <h2>${t('community.a')}<br><em>${t('community.b')}</em></h2>
      <p class="muted">${t('community.text')}</p>
      <ul class="community-points">
        <li>${ICON.heart}<span>${t('community.p1')}</span></li>
        <li>${ICON.leaf}<span>${t('community.p2')}</span></li>
        <li>${ICON.shield}<span>${t('community.p3')}</span></li>
      </ul>
      <a class="btn" href="#/retreats">${t('home.viewAll')} →</a>
    </div>
    <div class="mosaic" aria-hidden="true">
      <figure class="m1"><img src="/img/people-group.jpg" alt="" loading="lazy"></figure>
      <figure class="m2"><img src="/img/people-meditate-grass.jpg" alt="" loading="lazy"></figure>
      <figure class="m3"><img src="/img/people-hands.jpg" alt="" loading="lazy"></figure>
      <figure class="m4"><img src="/img/people-pier.jpg" alt="" loading="lazy"></figure>
      <figure class="m5"><img src="/img/people-balcony.jpg" alt="" loading="lazy"></figure>
    </div>
  </section>

  <section class="block container" style="padding-top:0">
    <span class="eyebrow">${t('home.formEyebrow')}</span>
    <h2>${t('home.formA')}<br><em>${t('home.formB')}</em></h2>
    <div class="types">${types.map((x) => `<a class="type-pill" href="#/retreats?type=${encodeURIComponent(x)}"><span class="dot-c" style="background:${typeArt(x)[1]}"></span>${esc(tv('types', x))}</a>`).join('')}</div>
    <div class="types" style="margin-top:12px">
      <a class="type-pill" href="#/retreats?duration=dag">${t('quick.day')}</a>
      <a class="type-pill" href="#/retreats?level=Beginner">${t('quick.beginners')}</a>
      <a class="type-pill" href="#/retreats?level=Gevorderd">${t('quick.pros')}</a>
      <a class="type-pill" href="#/retreats?flexible=1">${t('tag.freeCancel')}</a>
      <a class="type-pill" href="#/retreats?language=${EVENT_LANG[state.lang]}">${t('quick.ownLang')}</a>
    </div>
  </section>

  <section class="block dark how">
    <div class="how-bg" aria-hidden="true"><img src="/img/how-bg.jpg" alt="" loading="lazy"></div>
    <div class="container">
      <span class="eyebrow">${t('how.eyebrow')}</span>
      <h2>${t('how.a')}<br><em>${t('how.b')}</em></h2>
      <div class="steps" style="margin-top:30px">
        <div class="step"><div class="num">1</div><h3>${t('how.1t')}</h3><p class="muted">${t('how.1')}</p></div>
        <div class="step"><div class="num">2</div><h3>${t('how.2t')}</h3><p class="muted">${t('how.2')}</p></div>
        <div class="step"><div class="num">3</div><h3>${t('how.3t')}</h3><p class="muted">${t('how.3')}</p></div>
      </div>
    </div>
  </section>

  <section class="block container">
    <div class="cta-host">
      <div class="cta-photo" aria-hidden="true"><img src="/img/cta-facilitator.jpg" alt="" loading="lazy"></div>
      <div class="cta-body"><span class="eyebrow">${t('nav.facilitators')}</span><h2>${t('cta.title')}</h2><p>${t('cta.text')}</p>
      <a class="btn" href="#/aanbieden">${t('cta.button')}</a></div>
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
  const title = f.country ? t('list.in', { place: tv('countries', f.country) }) : f.region ? t('list.in', { place: tv('regions', f.region) }) : f.type ? tv('types', f.type) : t('list.all');
  const opt = (v, cur, label = v) => `<option value="${esc(v)}" ${v === cur ? 'selected' : ''}>${esc(label)}</option>`;

  const update = (changes) => {
    const next = { ...f, ...changes };
    const p = new URLSearchParams(Object.entries(next).filter(([k, v]) => v && !(k === 'sort' && v === 'aanbevolen')));
    location.hash = '#/retreats' + (p.toString() ? '?' + p : '');
  };

  app.innerHTML = `<div class="container list-layout">
    <aside class="filters">
      <h3>${t('list.filters')}</h3>
      <div class="seg" id="region-seg">
        ${['', 'Europa', 'Azië'].map((r) => `<button data-region="${r}" class="${f.region === r ? 'active' : ''}">${r ? tv('regions', r) : t('search.all')}</button>`).join('')}
      </div>
      <div class="field"><label for="f-q">${t('list.search')}</label><input id="f-q" value="${esc(f.q)}" placeholder="${t('list.searchPh')}"></div>
      <div class="field"><label for="f-country">${t('list.country')}</label><select id="f-country" data-k="country"><option value="">${t('list.allCountries')}</option>${countries.map((c) => opt(c, f.country, tv('countries', c))).join('')}</select></div>
      <div class="field"><label for="f-type">${t('search.type')}</label><select id="f-type" data-k="type"><option value="">${t('list.allTypes')}</option>${m.types.map((x) => opt(x, f.type, tv('types', x))).join('')}</select></div>
      <div class="field"><label for="f-month">${t('search.when')}</label><select id="f-month" data-k="month"><option value="">${t('search.flexible')}</option>${monthOptions(12).map((x) => opt(x.v, f.month, x.l)).join('')}</select></div>
      <div class="field"><label for="f-dur">${t('search.duration')}</label><select id="f-dur" data-k="duration"><option value="">${t('search.anyDuration')}</option>${m.durations.map((d) => opt(d, f.duration, durationLabel(d))).join('')}</select></div>
      <div class="field"><label for="f-price">${t('list.maxPrice')}: <b id="price-out">${f.maxPrice ? euro(f.maxPrice) : t('list.none')}</b></label><input id="f-price" type="range" min="300" max="2500" step="50" value="${f.maxPrice || 2500}"></div>
      <div class="field"><label for="f-level">${t('list.level')}</label><select id="f-level" data-k="level"><option value="">${t('list.anyLevel')}</option>${['Beginner', 'Gevorderd'].map((l) => opt(l, f.level, tv('levels', l))).join('')}</select></div>
      <div class="field"><label for="f-diet">${t('list.food')}</label><select id="f-diet" data-k="diet"><option value="">${t('list.noPref')}</option>${m.diets.map((d) => opt(d, f.diet, tv('diets', d))).join('')}</select></div>
      <div class="field"><label for="f-lang">${t('list.language')}</label><select id="f-lang" data-k="language"><option value="">${t('list.anyLanguage')}</option>${m.languages.map((l) => opt(l, f.language, tv('languages', l))).join('')}</select></div>
      <label class="check"><input type="checkbox" data-k="flexible" ${f.flexible ? 'checked' : ''}> ${t('tag.freeCancel')}</label>
      <label class="check"><input type="checkbox" data-k="instant" ${f.instant ? 'checked' : ''}> ${t('tag.instant')}</label>
      <button class="btn btn-ghost btn-block btn-sm" id="reset" style="margin-top:14px">${t('list.reset')}</button>
    </aside>
    <div>
      <div class="list-head">
        <div><h1 style="font-size:2rem;margin:0">${esc(title)}</h1><span class="muted">${tn('list.found', retreats.length)}</span></div>
        <select id="f-sort" aria-label="${t('list.sort')}">
          ${['aanbevolen', 'beoordeling', 'prijs-laag', 'prijs-hoog', 'datum', 'nieuw'].map((v) => opt(v, f.sort, t('sort.' + v))).join('')}
        </select>
      </div>
      ${retreats.length ? `<div class="cards">${retreats.map(retreatCard).join('')}</div>`
        : `<div class="empty"><h3>${t('list.emptyT')}</h3><p class="muted">${t('list.empty')}</p><a class="btn" href="#/retreats">${t('list.all')}</a></div>`}
    </div>
  </div>`;

  $$('#region-seg button').forEach((b) => (b.onclick = () => update({ region: b.dataset.region, country: '' })));
  let qTimer;
  $('#f-q').oninput = (e) => { clearTimeout(qTimer); qTimer = setTimeout(() => update({ q: e.target.value.trim() }), 450); };
  $$('.filters select[data-k]').forEach((s) => (s.onchange = () => update({ [s.dataset.k]: s.value })));
  $$('.filters input[type=checkbox][data-k]').forEach((c) => (c.onchange = () => update({ [c.dataset.k]: c.checked ? '1' : '' })));
  $('#f-price').oninput = (e) => ($('#price-out').textContent = e.target.value === '2500' ? t('list.none') : euro(e.target.value));
  $('#f-price').onchange = (e) => update({ maxPrice: e.target.value === '2500' ? '' : e.target.value });
  $('#f-sort').onchange = (e) => update({ sort: e.target.value });
  $('#reset').onclick = () => (location.hash = '#/retreats');
  if (f.q) { const i = $('#f-q'); i.focus(); i.setSelectionRange(i.value.length, i.value.length); }
}

async function viewDetail(id) {
  const { retreat: r } = await api('/api/retreats/' + encodeURIComponent(id));
  const isOwner = state.user && state.user.id === r.hostId;
  const policyLabel = t('canc.' + r.cancellation);
  let selected = (r.dates.find((d) => d.available > 0) || {}).date;
  let pkgName = r.packages[0].name;
  let guests = 1;
  let note = '';
  const locTitle = r.nights ? t('det.stay') : t('det.venue');

  const sections = [
    ['overzicht', t('det.overview'), true],
    ['programma', t('det.program'), r.itinerary],
    ['facilitator', t('det.facilitator'), r.teacherName],
    ['locatie', locTitle, r.accommodation || r.packages.length],
    ['eten', t('det.food'), r.food || r.diets.length],
    ['annulering', t('det.cancellation'), true],
    ['reviews', `${t('det.reviews')} (${r.reviews})`, true],
  ].filter((s) => s[2]);

  const depositText = r.depositPercent ? (r.depositPercent === 100 ? t('det.payFull') : t('det.payDeposit', { p: r.depositPercent })) : t('det.payOnArrival');

  app.innerHTML = `<div class="container detail">
    <div class="crumbs"><a href="#/retreats">${t('nav.events')}</a> › <a href="#/retreats?region=${encodeURIComponent(r.region)}">${esc(tv('regions', r.region))}</a> › <a href="#/retreats?country=${encodeURIComponent(r.country)}">${esc(tv('countries', r.country))}</a></div>
    <div class="title-row">
      <div><h1>${esc(tr(r, 'title'))}</h1>
        <div class="muted">📍 ${place(r)} · ${r.reviews ? `★ ${fmtRating(r.rating)} (${tn('det.reviewCount', r.reviews)})` : t('card.new')}</div></div>
      ${favButton(r.id, 'fav-lg')}
    </div>
    <div class="gallery">
      <div class="gallery-main">${art(r, 'art-lg')}</div>
      ${galleryFor(r).map((src) => `<figure><img src="${src}" alt="" loading="lazy"></figure>`).join('')}
    </div>
    <nav class="sec-nav">${sections.map(([k, l]) => `<button type="button" data-scroll="sec-${k}">${esc(l)}</button>`).join('')}</nav>
    <div class="detail-grid">
      <div>
        <section id="sec-overzicht">
          <div class="facts">
            <span class="fact"><span class="dot-c" style="background:${typeArt(r.type)[1]}"></span>${esc(tv('types', r.type))}</span><span class="fact">${nightsLabel(r.nights)}</span>
            <span class="fact">${t('det.maxPeople', { n: r.capacity })}</span><span class="fact">${esc(tv('levels', r.level))}</span>
            <span class="fact">${r.languages.map((l) => esc(tv('languages', l))).join(', ')}</span>
            <span class="fact">${r.instantBooking ? '⚡ ' + t('tag.instant') : '✉ ' + t('tag.request')}</span>
          </div>
          ${state.lang !== 'nl' ? `<p class="lang-note">${t('det.langNote', { langs: r.languages.map((l) => tv('languages', l)).join(', ') })}</p>` : ''}
          ${r.certification ? `<p><span class="cert"><span class="sphere"></span>${t('det.byFacilitator')}</span></p>` : ''}
          <h2>${t('det.about')}</h2>
          <p class="description">${esc(tr(r, 'description'))}</p>
          ${r.amenities.length ? `<h3 style="margin-top:24px">${t('det.included')}</h3><ul class="amenities">${r.amenities.map((a) => `<li>${esc(a)}</li>`).join('')}</ul>` : ''}
        </section>
        ${r.itinerary ? `<section id="sec-programma"><h2>${t('det.programTitle')}</h2><p class="muted small">${r.nights ? t('det.typicalDay') : t('det.theProgram')}</p>
          <ul class="itinerary">${r.itinerary.split('\n').filter(Boolean).map((line) => {
            const mm = line.match(/^(\d{1,2}[:.]\d{2})\s+(.*)$/);
            return mm ? `<li><time>${esc(mm[1])}</time><span>${esc(mm[2])}</span></li>` : `<li><time></time><span>${esc(line)}</span></li>`;
          }).join('')}</ul></section>` : ''}
        ${r.teacherName ? `<section id="sec-facilitator"><h2>${t('det.yourFacilitator')}</h2><div class="host-box" style="margin-top:0"><div class="avatar">${esc(initials(r.teacherName))}</div>
          <div><b>${esc(r.teacherName)}</b>${r.certification ? `<div class="small cert-line">${esc(r.certification)}</div>` : ''}${r.teacherBio ? `<p class="small" style="margin:4px 0 0">${esc(r.teacherBio)}</p>` : ''}</div></div></section>` : ''}
        <section id="sec-locatie"><h2>${locTitle}</h2>${r.accommodation ? `<p>${esc(r.accommodation)}</p>` : ''}
          <div class="pkg-table">${r.packages.map((p) => `<div><span>${esc(p.name)}</span><b>${euro(p.price)} ${t('price.pp')}</b></div>`).join('')}</div></section>
        ${r.food || r.diets.length ? `<section id="sec-eten"><h2>${t('det.food')}</h2>${r.food ? `<p>${esc(r.food)}</p>` : ''}
          ${r.diets.length ? `<div class="tags">${r.diets.map((d) => `<span>${esc(tv('diets', d))}</span>`).join('')}</div>` : ''}</section>` : ''}
        <section id="sec-annulering"><h2>${t('det.cancelTitle')}</h2>
          <p><b>${esc(policyLabel)}:</b> ${esc(t('cancText.' + r.cancellation))}</p>
          <p class="muted">${depositText}${r.instantBooking ? '' : ' ' + t('det.requestInfo')}</p>
        </section>
        <section id="sec-reviews"><h2>${t('det.reviews')}</h2>
          ${r.reviews ? `<div class="review-summary"><span class="big">${fmtRating(r.rating)}</span><span><span class="stars">${stars(r.rating)}</span><br><span class="muted small">${tn('det.reviewCount', r.reviews)}</span></span></div>` : `<p class="muted">${t('det.noReviews')}</p>`}
          ${r.reviewList.map((v) => `<div class="review"><div class="review-head"><div class="avatar avatar-sm">${esc(initials(v.userName))}</div>
            <div><b>${esc(v.userName)}</b><div class="muted small">${fmtDate(v.createdAt.slice(0, 10))}</div></div><span class="stars">${stars(v.rating)}</span></div>
            <p>${esc(v.text)}</p></div>`).join('')}
          ${r.reviews > r.reviewList.length ? `<p class="muted small">${tn('det.earlier', r.reviews - r.reviewList.length)}</p>` : ''}
          <p class="muted small">${t('det.reviewWho')} <a href="#/account">${t('acc.bookings')}</a>.</p>
        </section>
        <div class="host-box"><div class="avatar">${esc(initials(r.hostName))}</div><div><b>${t('det.organisedBy', { name: esc(r.hostName) })}</b><div class="muted small">${t('det.facRole')}</div></div></div>
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
    const spots = (n) => (n ? (n <= 3 ? tn('book.lastSpots', n) : tn('book.spots', n)) : t('book.fullShort'));
    panel.innerHTML = `
      <div><span class="muted small">${t('price.from')}</span> <span class="price">${euro(r.pricePerPerson)}</span> <span class="muted">${t('price.pp')} · ${nightsLabel(r.nights)}</span></div>
      <h4>1. ${t('book.chooseDate')}</h4>
      <div class="dates">${r.dates.length ? r.dates.map((d) => `<button type="button" class="date-opt ${d.date === selected ? 'selected' : ''}" data-date="${d.date}" ${d.available ? '' : 'disabled'}>
          <span><b>${dateRange(d.date, r.nights, true)}</b></span>
          <span class="spots ${d.available && d.available <= 3 ? 'low' : ''}">${spots(d.available)}</span></button>`).join('')
        : `<p class="muted">${t('book.noDates')}</p>`}</div>
      ${isOwner ? `<p class="muted small">${t('book.isOwner')} <a href="#/account?tab=aanbod">${t('acc.myEvents')}</a>.</p>` : sel ? `
        <h4>2. ${r.nights ? t('book.chooseRoom') : t('book.chooseTicket')}</h4>
        <div class="dates">${r.packages.map((p) => `<button type="button" class="date-opt ${p.name === pkgName ? 'selected' : ''}" data-pkg="${esc(p.name)}"><span>${esc(p.name)}</span><b>${euro(p.price)}</b></button>`).join('')}</div>
        <div class="field"><label for="b-guests">${t('book.people')}</label>
          <select id="b-guests">${[...Array(maxGuests)].map((_, i) => `<option ${i + 1 === guests ? 'selected' : ''}>${i + 1}</option>`).join('')}</select></div>
        <div class="field"><label for="b-note">${t('book.message')} <span class="muted">(${t('ui.optional')})</span></label><textarea id="b-note" style="min-height:70px" placeholder="${t('book.messagePh')}">${esc(note)}</textarea></div>
        <div class="totals"><div><span>${euro(pkg.price)} × ${tn('book.persons', guests)}</span><span>${euro(total)}</span></div>
          <div class="grand"><span>${t('book.total')}</span><span>${euro(total)}</span></div>
          ${r.depositPercent && r.depositPercent < 100 ? `<div class="deposit"><span>${t('book.payNow', { p: r.depositPercent })}</span><b>${euro(deposit)}</b></div>
          <div class="muted small"><span>${t('book.onArrival')}</span><span>${euro(total - deposit)}</span></div>` : `<div class="muted small"><span>${r.depositPercent ? t('book.fullNow') : t('book.allOnArrival')}</span><span></span></div>`}</div>
        <button class="btn btn-block" style="margin-top:16px" id="book-btn">${!state.user ? t('book.loginBook') : r.instantBooking ? t('book.reserve') : t('book.sendRequest')}</button>
        <p class="center muted small" style="margin:10px 0 0">${r.cancellation === 'flexibel' ? '✓ ' + t('book.freeCancelNote') : t('book.policy', { p: policyLabel.toLowerCase() })}</p>` : `<p class="muted">${t('book.allFull')}</p>`}`;

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
        <span class="sphere"></span><h1>${confirmed ? t('done.confirmed') : t('done.requested')}</h1>
        <p class="muted">${esc(tr(r, 'title'))}<br>${dateRange(booking.startDate, r.nights)} · ${esc(booking.packageName)} · ${tn('book.persons', booking.guests)}</p>
        <p>${t('book.total')} <b>${euro(booking.totalPrice)}</b>${booking.deposit && booking.deposit < booking.totalPrice ? ` · ${t('done.deposit')} <b>${euro(booking.deposit)}</b> · ${t('done.rest')} ${euro(booking.totalPrice - booking.deposit)}` : ''}</p>
        ${confirmed ? '' : `<p class="muted small">${t('done.requestInfo', { name: esc(r.hostName) })}</p>`}
        <p class="small muted">${t('done.number')}: <code>${esc(booking.id)}</code></p>
        <div style="display:flex;gap:10px;justify-content:center;flex-wrap:wrap;margin-top:20px"><a class="btn" href="#/account">${t('acc.bookings')}</a><a class="btn btn-ghost" href="#/retreats">${t('done.more')}</a></div>
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
      <div class="landing-photo" aria-hidden="true"><img src="/img/cta-facilitator.jpg" alt=""></div>
      <span class="eyebrow">${t('nav.facilitators')}</span><h1>${t('host.landingTitle')}</h1>
      <p class="muted">${t('host.landingText')}</p>
      <div class="steps" style="text-align:left;margin:24px 0">
        <div class="step"><div class="num">1</div><b>${t('host.s1t')}</b><p class="muted small">${t('host.s1')}</p></div>
        <div class="step"><div class="num">2</div><b>${t('host.s2t')}</b><p class="muted small">${t('host.s2')}</p></div>
        <div class="step"><div class="num">3</div><b>${t('host.s3t')}</b><p class="muted small">${t('host.s3')}</p></div>
      </div>
      <div style="display:flex;gap:10px;justify-content:center;flex-wrap:wrap"><button class="btn" id="reg">${t('auth.createAccount')}</button><button class="btn btn-ghost" id="log">${t('auth.login')}</button></div>
    </div></div>`;
    $('#reg').onclick = () => openAuth('register');
    $('#log').onclick = () => openAuth('login');
    return;
  }
  const r = existing || { region: 'Europa', amenities: [], startDates: [], packages: [{ name: t('host.defaultPkg'), price: '' }], depositPercent: 20, cancellation: 'flexibel', level: 'Alle niveaus', diets: [], languages: [EVENT_LANG[state.lang]], instantBooking: true, translations: {} };
  const trs = r.translations || {};
  let dates = [...(r.startDates || [])].filter((d) => d >= today());
  const { countries, types, levels, diets, languages, cancellation } = state.meta;
  const checks = (name, all, sel, group) => all.map((x) => `<label class="check"><input type="checkbox" name="${name}" value="${esc(x)}" ${sel.includes(x) ? 'checked' : ''}> ${esc(tv(group, x))}</label>`).join('');
  const sel = (name, id, all, cur, group) => `<select id="${id}" name="${name}">${all.map((x) => `<option value="${esc(x)}" ${x === cur ? 'selected' : ''}>${esc(tv(group, x))}</option>`).join('')}</select>`;

  app.innerHTML = `<div class="container page form-wrap">
    <span class="eyebrow">${t('nav.facilitators')}</span><h1>${existing ? t('host.editTitle') : t('cta.button')}</h1>
    <p class="muted">${existing ? t('host.editIntro') : t('host.newIntro')}</p>
    <form id="host-form" novalidate>
      <div id="host-error"></div>
      <fieldset class="panel"><legend>${t('host.basics')}</legend>
        <div class="field"><label for="h-title">${t('host.title')}</label><input id="h-title" name="title" required maxlength="120" value="${esc(r.title)}" placeholder="${t('host.titlePh')}"></div>
        <div class="grid-3">
          <div class="field"><label for="h-type">${t('search.type')}</label>${sel('type', 'h-type', types, r.type, 'types')}</div>
          <div class="field"><label for="h-level">${t('list.level')}</label>${sel('level', 'h-level', levels, r.level, 'levels')}</div>
          <div class="field"><label for="h-region">${t('host.region')}</label>${sel('region', 'h-region', Object.keys(countries), r.region, 'regions')}</div>
        </div>
        <div class="grid-2">
          <div class="field"><label for="h-country">${t('list.country')}</label><select id="h-country" name="country"></select></div>
          <div class="field"><label for="h-city">${t('host.city')}</label><input id="h-city" name="city" required value="${esc(r.city)}" placeholder="${t('host.cityPh')}"></div>
        </div>
        <div class="field"><label for="h-desc">${t('host.description')}</label><textarea id="h-desc" name="description" required maxlength="3000" placeholder="${t('host.descriptionPh')}">${esc(r.description)}</textarea></div>
        <div class="field"><label for="h-amen">${t('host.included')}</label><input id="h-amen" name="amenities" value="${esc((r.amenities || []).join(', '))}" placeholder="${t('host.includedPh')}"><div class="hint">${t('host.commaHint')}</div></div>
        <div class="field"><label>${t('host.languages')}</label><div class="check-row">${checks('languages', languages, r.languages, 'languages')}</div></div>
        <div class="field"><label for="h-img">${t('host.photo')} <span class="muted">(${t('ui.optional')})</span></label><input id="h-img" name="image" type="url" value="${esc(r.image)}" placeholder="https://…"><div class="hint">${t('host.photoHint')}</div></div>
      </fieldset>

      <fieldset class="panel"><legend>${t('host.translations')}</legend>
        <p class="hint" style="margin-top:0">${t('host.translationsHint')}</p>
        ${I18N_LANGS.filter((l) => l !== 'nl').map((l) => `<div class="tr-block"><div class="tr-head"><span class="flag">${FLAGS[l]}</span> ${LANG_NAMES[l]}</div>
          <div class="field"><label for="h-t-${l}">${t('host.title')}</label><input id="h-t-${l}" data-tr="${l}" data-f="title" maxlength="120" value="${esc(trs[l] && trs[l].title)}"></div>
          <div class="field"><label for="h-d-${l}">${t('host.description')}</label><textarea id="h-d-${l}" data-tr="${l}" data-f="description" maxlength="3000" style="min-height:90px">${esc(trs[l] && trs[l].description)}</textarea></div></div>`).join('')}
      </fieldset>

      <fieldset class="panel"><legend>${t('host.programLegend')}</legend>
        <div class="field"><label for="h-itin">${t('det.programTitle')}</label><textarea id="h-itin" name="itinerary" placeholder="07:00 …&#10;08:30 …&#10;10:00 …">${esc(r.itinerary)}</textarea><div class="hint">${t('host.itinHint')}</div></div>
        <div class="grid-2">
          <div class="field"><label for="h-tname">${t('host.facName')}</label><input id="h-tname" name="teacherName" value="${esc(r.teacherName || state.user.name)}"></div>
          <div class="field"><label for="h-tbio">${t('host.aboutYou')}</label><input id="h-tbio" name="teacherBio" value="${esc(r.teacherBio)}" placeholder="${t('host.aboutYouPh')}"></div>
        </div>
      </fieldset>

      <fieldset class="panel"><legend>${t('host.venueLegend')}</legend>
        <div class="field"><label for="h-acc">${t('host.venue')}</label><textarea id="h-acc" name="accommodation" style="min-height:80px" placeholder="${t('host.venuePh')}">${esc(r.accommodation)}</textarea></div>
        <div class="field"><label>${t('host.options')}</label>
          <div id="pkg-rows"></div><button type="button" class="btn btn-ghost btn-sm" id="add-pkg">+ ${t('host.addOption')}</button></div>
        <div class="field"><label for="h-food">${t('det.food')}</label><textarea id="h-food" name="food" style="min-height:70px" placeholder="${t('host.foodPh')}">${esc(r.food)}</textarea></div>
        <div class="field"><label>${t('host.diets')}</label><div class="check-row">${checks('diets', diets, r.diets, 'diets')}</div></div>
      </fieldset>

      <fieldset class="panel"><legend>${t('host.datesLegend')}</legend>
        <div class="grid-2">
          <div class="field"><label for="h-nights">${t('host.nights')} <span class="muted">(${t('host.nightsHint')})</span></label><input id="h-nights" name="nights" type="number" min="0" max="90" required value="${esc(r.nights)}"></div>
          <div class="field"><label for="h-cap">${t('host.capacity')}</label><input id="h-cap" name="capacity" type="number" min="1" max="200" required value="${esc(r.capacity)}"></div>
        </div>
        <div class="field"><label for="h-date">${t('host.startDates')}</label>
          <div class="inline"><input id="h-date" type="date" min="${today()}"><button type="button" class="btn btn-ghost" id="add-date">${t('host.add')}</button></div>
          <div class="date-list" id="date-list"></div></div>
        <div class="grid-2">
          <div class="field"><label for="h-dep">${t('host.deposit')}</label><input id="h-dep" name="depositPercent" type="number" min="0" max="100" value="${esc(r.depositPercent)}"><div class="hint">${t('host.depositHint')}</div></div>
          <div class="field"><label for="h-canc">${t('host.cancelPolicy')}</label><select id="h-canc" name="cancellation">${Object.keys(cancellation).map((k) => `<option value="${k}" ${k === r.cancellation ? 'selected' : ''}>${esc(t('canc.' + k))}</option>`).join('')}</select><div class="hint" id="canc-hint"></div></div>
        </div>
        <label class="check"><input type="checkbox" name="instantBooking" ${r.instantBooking ? 'checked' : ''}> <span><b>${t('tag.instant')}</b> – ${t('host.instantHint')}</span></label>
      </fieldset>

      <fieldset class="panel cert-box"><legend>${t('host.certLegend')}</legend>
        <p class="small" style="margin-top:0;color:var(--cream-dim)">${t('host.certIntro')}</p>
        <div class="field"><label for="h-cert">${t('host.certQ')}</label><input id="h-cert" name="certification" required maxlength="120" value="${esc(r.certification)}" placeholder="${t('host.certPh')}"></div>
        <label class="check"><input type="checkbox" name="certified" ${existing ? 'checked' : ''}> <span>${t('host.certDeclare')}</span></label>
      </fieldset>

      <div style="display:flex;gap:10px;justify-content:flex-end;flex-wrap:wrap;margin-top:10px">
        ${existing ? `<a class="btn btn-ghost" href="#/account?tab=aanbod">${t('ui.cancel')}</a>` : ''}
        <button class="btn" type="submit">${existing ? t('host.save') : t('host.publish')}</button>
      </div>
    </form>
  </div>`;

  const regionSel = $('#h-region');
  const countrySel = $('#h-country');
  const fillCountries = () => {
    countrySel.innerHTML = countries[regionSel.value].map((c) => `<option value="${esc(c)}" ${c === r.country ? 'selected' : ''}>${esc(tv('countries', c))}</option>`).join('');
  };
  regionSel.onchange = fillCountries;
  fillCountries();
  const cancSel = $('#h-canc');
  const cancHint = () => ($('#canc-hint').textContent = t('cancText.' + cancSel.value));
  cancSel.onchange = cancHint;
  cancHint();

  // ticket- en kameropties
  let pkgs = (r.packages || []).map((p) => ({ ...p }));
  const renderPkgs = () => {
    $('#pkg-rows').innerHTML = pkgs.map((p, i) => `<div class="pkg-row">
      <input placeholder="${t('host.optionPh')}" value="${esc(p.name)}" data-i="${i}" data-f="name" aria-label="${t('host.optionName')}">
      <input type="number" min="1" placeholder="${t('host.pricePh')}" value="${esc(p.price)}" data-i="${i}" data-f="price" aria-label="${t('host.optionPrice')}">
      <button type="button" class="btn btn-ghost btn-sm" data-rm="${i}" ${pkgs.length === 1 ? 'disabled' : ''} aria-label="${t('ui.remove')}">×</button></div>`).join('');
    $$('#pkg-rows input').forEach((inp) => (inp.oninput = () => (pkgs[inp.dataset.i][inp.dataset.f] = inp.value)));
    $$('#pkg-rows [data-rm]').forEach((b) => (b.onclick = () => { pkgs.splice(Number(b.dataset.rm), 1); renderPkgs(); }));
  };
  $('#add-pkg').onclick = () => { if (pkgs.length < 6) { pkgs.push({ name: '', price: '' }); renderPkgs(); } };
  renderPkgs();

  const renderDates = () => {
    $('#date-list').innerHTML = dates.length
      ? dates.map((d) => `<span class="date-chip">${fmtDate(d, { day: 'numeric', month: 'short', year: 'numeric' })}<button type="button" data-d="${d}" aria-label="${t('ui.remove')}">×</button></span>`).join('')
      : `<span class="muted small">${t('host.noDates')}</span>`;
    $$('.date-chip button').forEach((b) => (b.onclick = () => { dates = dates.filter((x) => x !== b.dataset.d); renderDates(); }));
  };
  $('#add-date').onclick = () => {
    const v = $('#h-date').value;
    if (!v) return toast(t('host.pickDate'), true);
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
    body.certified = fd.has('certified');
    body.packages = pkgs;
    body.startDates = dates;
    body.translations = {};
    $$('[data-tr]').forEach((el) => { (body.translations[el.dataset.tr] ||= {})[el.dataset.f] = el.value; });
    const btn = $('button[type=submit]', e.target);
    btn.disabled = true;
    try {
      const { retreat } = await api(existing ? `/api/retreats/${existing.id}` : '/api/retreats', { method: existing ? 'PUT' : 'POST', body });
      toast(existing ? t('host.updated') : t('host.online'));
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
  if (retreat.hostId !== state.user.id) { toast(t('host.notYours'), true); location.hash = '#/account'; return; }
  viewHostForm(retreat);
}

function bookingMoney(b) {
  const parts = [`<b>${euro(b.totalPrice)}</b>`];
  if (b.deposit) parts.push(`${t('done.deposit')} ${euro(b.deposit)}`);
  if (b.refund !== undefined && ['geannuleerd', 'afgewezen'].includes(b.status)) parts.push(b.refund ? t('acc.refunded', { amount: euro(b.refund) }) : t('acc.notRefunded'));
  return parts.join(' · ');
}

async function viewAccount(query) {
  if (!state.user) {
    app.innerHTML = `<div class="container page"><div class="panel center" style="max-width:560px;margin:auto"><h1>${t('acc.title')}</h1><p class="muted">${t('acc.loginFirst')}</p><button class="btn" id="log">${t('auth.login')}</button></div></div>`;
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
      ${b.retreat ? art(b.retreat, '', false) : '<div class="art"></div>'}
      <div>
        <span class="status ${b.status}">${status(b.status)}</span>
        <h3 style="margin:6px 0 2px">${b.retreat ? `<a href="#/retreat/${esc(b.retreat.id)}" style="text-decoration:none">${esc(tr(b.retreat, 'title'))}</a>` : t('acc.deleted')}</h3>
        <div class="muted small">${b.retreat ? `📍 ${place(b.retreat)} · ${dateRange(b.startDate, b.retreat.nights)}` : fmtDate(b.startDate)}</div>
        <div class="small">${esc(b.packageName)} · ${tn('book.persons', b.guests)} · ${bookingMoney(b)} · <span class="muted">#${esc(b.id)}</span></div>
        ${b.status === 'aangevraagd' ? `<div class="small muted">${t('acc.waiting')}</div>` : ''}
        ${b.status === 'bevestigd' && !b.reviewed && b.retreat ? `<details class="host-bookings"><summary>${t('acc.writeReview')}</summary>
          <form class="review-form" data-review="${esc(b.retreat.id)}">
            <div class="star-input">${[5, 4, 3, 2, 1].map((n) => `<input type="radio" name="rating" value="${n}" id="st-${esc(b.id)}-${n}"><label for="st-${esc(b.id)}-${n}" title="${tn('acc.stars', n)}">★</label>`).join('')}</div>
            <textarea name="text" placeholder="${t('acc.reviewPh')}" style="min-height:80px"></textarea>
            <button class="btn btn-sm" type="submit">${t('acc.post')}</button></form></details>` : ''}
        ${b.reviewed ? `<div class="small muted">✓ ${t('acc.reviewed')}</div>` : ''}
      </div>
      <div>${['aangevraagd', 'bevestigd'].includes(b.status) && b.startDate >= today() ? `<button class="btn btn-danger btn-sm" data-cancel="${esc(b.id)}" data-policy="${esc(b.cancellation)}" data-deposit="${b.deposit}" data-start="${b.startDate}" data-req="${b.status === 'aangevraagd'}">${t('acc.cancel')}</button>` : ''}</div>
    </div>`).join('')
    : `<div class="empty"><h3>${t('acc.noBookingsT')}</h3><p class="muted">${t('acc.noBookings')}</p><a class="btn" href="#/retreats">${t('acc.discover')}</a></div>`;

  const favHtml = favs.length ? `<div class="cards">${favs.map(retreatCard).join('')}</div>`
    : `<div class="empty"><h3>${t('acc.emptyWishT')}</h3><p class="muted">${t('acc.emptyWish')}</p><a class="btn" href="#/retreats">${t('acc.discover')}</a></div>`;

  const listingsHtml = (listings.length ? listings.map((r) => {
    const active = r.bookings.filter((b) => b.status === 'bevestigd');
    return `<div class="row-card" style="align-items:start">
      ${art(r, '', false)}
      <div>
        <h3 style="margin:0 0 2px"><a href="#/retreat/${esc(r.id)}" style="text-decoration:none">${esc(tr(r, 'title'))}</a> ${r.pending ? `<span class="status aangevraagd">${tn('acc.newRequests', r.pending)}</span>` : ''}</h3>
        <div class="muted small">📍 ${place(r)} · ${t('price.from')} ${euro(r.pricePerPerson)} ${t('price.pp')} · ${nightsLabel(r.nights)} · ${r.instantBooking ? t('tag.instant').toLowerCase() : t('tag.request').toLowerCase()}</div>
        <div class="stats" style="margin-top:6px"><span><b>${active.length}</b> ${t('acc.confirmed')}</span><span><b>${active.reduce((n, b) => n + b.guests, 0)}</b> ${t('acc.participants')}</span><span><b>${euro(r.revenue)}</b> ${t('acc.revenue')}</span><span><b>${r.reviews ? '★ ' + fmtRating(r.rating) : '–'}</b> ${t('acc.score')}</span><span><b>${r.dates.length}</b> ${t('acc.upcoming')}</span></div>
        ${r.bookings.length ? `<details class="host-bookings" ${r.pending ? 'open' : ''}><summary>${t('acc.viewBookings')} (${r.bookings.length})</summary><div class="table-scroll"><table class="bookings">
          <tr><th>${t('acc.thGuest')}</th><th>${t('acc.thDate')}</th><th>${t('acc.thOption')}</th><th>${t('acc.thPeople')}</th><th>${t('acc.thAmount')}</th><th>${t('acc.thStatus')}</th><th></th></tr>
          ${r.bookings.map((b) => `<tr><td>${esc(b.guestName)}<br><span class="muted">${esc(b.guestEmail)}</span>${b.note ? `<br><i class="muted">“${esc(b.note)}”</i>` : ''}</td><td>${fmtDate(b.startDate, { day: 'numeric', month: 'short', year: 'numeric' })}</td><td>${esc(b.packageName)}</td><td>${b.guests}</td><td>${euro(b.totalPrice)}</td><td><span class="status ${b.status}">${status(b.status)}</span></td>
            <td class="actions">${b.status === 'aangevraagd' ? `<button class="btn btn-sm" data-accept="${esc(b.id)}">${t('acc.accept')}</button><button class="btn btn-danger btn-sm" data-decline="${esc(b.id)}">${t('acc.decline')}</button>`
              : b.status === 'bevestigd' && b.startDate >= today() ? `<button class="btn btn-danger btn-sm" data-cancel="${esc(b.id)}" data-host="1">${t('acc.cancel')}</button>` : ''}</td></tr>`).join('')}
        </table></div></details>` : `<p class="muted small" style="margin:8px 0 0">${t('acc.noBookingsYet')}</p>`}
      </div>
      <div style="display:flex;flex-direction:column;gap:8px">
        <a class="btn btn-ghost btn-sm" href="#/bewerken/${esc(r.id)}">${t('acc.edit')}</a>
        <button class="btn btn-danger btn-sm" data-delete="${esc(r.id)}">${t('acc.delete')}</button>
      </div>
    </div>`;
  }).join('') : `<div class="empty"><h3>${t('acc.noEventsT')}</h3><p class="muted">${t('acc.noEvents')}</p></div>`)
    + `<div style="margin-top:18px"><a class="btn" href="#/aanbieden">+ ${t('acc.newEvent')}</a></div>`;

  app.innerHTML = `<div class="container page">
    <h1>${t('acc.hello', { name: esc(state.user.name.split(' ')[0]) })} 👋</h1>
    <div class="tabs">
      <a href="#/account" class="${tab === 'boekingen' ? 'active' : ''}">${t('acc.bookings')} (${bookings.length})</a>
      <a href="#/account?tab=verlanglijst" class="${tab === 'verlanglijst' ? 'active' : ''}">${t('acc.wishlist')} (${favs.length})</a>
      <a href="#/account?tab=aanbod" class="${tab === 'aanbod' ? 'active' : ''}">${t('acc.myEvents')} (${listings.length})${pendingTotal ? ` <span class="dot">${pendingTotal}</span>` : ''}</a>
    </div>
    ${tab === 'boekingen' ? bookingsHtml : tab === 'verlanglijst' ? favHtml : listingsHtml}
  </div>`;

  const act = async (fn, msg) => {
    try { await fn(); toast(msg); viewAccount(query); } catch (err) { toast(err.message, true); }
  };
  $$('[data-cancel]').forEach((b) => (b.onclick = () => {
    let warn = t('acc.confirmCancel');
    if (!b.dataset.host && b.dataset.req !== 'true' && Number(b.dataset.deposit)) {
      const left = Math.round((Date.parse(b.dataset.start) - Date.parse(today())) / 86400000);
      const refundDays = { flexibel: 14, gemiddeld: 30, strikt: null }[b.dataset.policy];
      warn += '\n' + (refundDays !== null && left >= refundDays ? t('acc.fullRefund') : t('acc.noRefund', { p: t('canc.' + b.dataset.policy).toLowerCase() }));
    }
    if (b.dataset.host) warn = t('acc.confirmCancelHost');
    if (confirm(warn)) act(() => api(`/api/bookings/${b.dataset.cancel}/cancel`, { method: 'POST' }), t('acc.cancelled'));
  }));
  $$('[data-accept]').forEach((b) => (b.onclick = () => act(() => api(`/api/bookings/${b.dataset.accept}/accept`, { method: 'POST' }), t('acc.accepted'))));
  $$('[data-decline]').forEach((b) => (b.onclick = () => confirm(t('acc.confirmDecline')) && act(() => api(`/api/bookings/${b.dataset.decline}/decline`, { method: 'POST' }), t('acc.declined'))));
  $$('[data-delete]').forEach((b) => (b.onclick = () => confirm(t('acc.confirmDelete')) && act(() => api(`/api/retreats/${b.dataset.delete}`, { method: 'DELETE' }), t('acc.deletedToast'))));
  $$('[data-review]').forEach((f) => (f.onsubmit = (e) => {
    e.preventDefault();
    const fd = new FormData(f);
    act(() => api(`/api/retreats/${f.dataset.review}/reviews`, { method: 'POST', body: { rating: Number(fd.get('rating')), text: fd.get('text') } }), t('acc.thanksReview'));
  }));
}

// ---------- router ----------
async function router() {
  const { path, query } = parseHash();
  $('#nav').classList.remove('open');
  window.scrollTo(0, 0);
  app.innerHTML = `<div class="loading">${t('ui.loading')}</div>`;
  try {
    let m;
    if (path === '/') await viewHome();
    else if (path === '/retreats') await viewList(query);
    else if ((m = path.match(/^\/retreat\/([\w-]+)$/))) await viewDetail(m[1]);
    else if ((m = path.match(/^\/bewerken\/([\w-]+)$/))) await viewEdit(m[1]);
    else if (path === '/aanbieden') viewHostForm();
    else if (path === '/account') await viewAccount(query);
    else app.innerHTML = `<div class="container page center"><h1>${t('err.notFound')}</h1><a class="btn" href="#/">${t('err.home')}</a></div>`;
  } catch (err) {
    app.innerHTML = `<div class="container page center"><h1>${t('err.oops')}</h1><p class="muted">${esc(err.message)}</p><a class="btn" href="#/">${t('err.home')}</a></div>`;
  }
}

async function init() {
  $('#menu-btn').onclick = () => $('#nav').classList.toggle('open');
  applyStatic();
  const [{ user }, meta] = await Promise.all([api('/api/auth/me'), api('/api/meta')]);
  state.user = user;
  state.meta = meta;
  renderDemoBanner();
  renderAuthSlot();
  window.addEventListener('hashchange', router);
  router();
}

init();
