/* Characters Across Worlds.
   Act 1, the lesson: Ache runs a star shop and sells you every gacha trick (welcome gifts, hidden odds, a subscription,
   a battle pass paid with borrowed time, a "best value" chest with a near-miss), then breaks the machine.
   Act 2, the journey: the characters hide across the site (assets/caw-spots.json, placed by save.js with the stickers).
   Each find is a copy. No currency, no timers, no luck after the lesson.
   Save: TZSAVE namespace "caw". save.js writes caw.found; this page writes caw.lesson and caw.met (always on a fresh read). */
(() => {
const $ = s => document.querySelector(s);
const el = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e };
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const pick = a => a[Math.floor(Math.random() * a.length)];
const LAYERS = ['Profile', 'Notes', 'Quote', 'Secret outfit'];
const HOUSE = { 5: 0.6, 4: 5.1 }; // typical paid gacha odds, shown in the lesson
let D, ITEMS = {}, SPOTS = [], C = {};

/* ---------- save ---------- */
const LOCAL = 'tz-caw-preview';
const read = () => { if (window.TZSAVE) return TZSAVE.get('caw') || {}; try { return JSON.parse(localStorage.getItem(LOCAL)) || {} } catch (e) { return {} } };
function write(patch) {
  const c = Object.assign(read(), patch); // fresh read first: save.js owns caw.found
  if (window.TZSAVE) TZSAVE.set('caw', c); else try { localStorage.setItem(LOCAL, JSON.stringify(c)) } catch (e) {}
  C = c;
}
const found = () => (C.found || {});
const copies = id => Math.min(SPOTS.filter(s => s.item === id && found()[s.id]).length, ITEMS[id].kind === 'keep' ? 1 : D.rules.maxCopies);

/* ---------- art ---------- */
const refSrc = it => !it.ref ? '' : /^https?:/.test(it.ref) ? it.ref : '/assets/img/caw/ref/' + it.ref;
const ICONS = {
  spinner: '<circle cx="12" cy="12" r="2.6"/><circle cx="12" cy="5" r="3"/><circle cx="6" cy="16" r="3"/><circle cx="18" cy="16" r="3"/>',
  teacup: '<path d="M4 9h13v3a6 6 0 0 1-6 6H10a6 6 0 0 1-6-6z"/><path d="M17 10h1.5a2.5 2.5 0 0 1 0 5H16"/><path d="M3 20h17"/>',
  intercom: '<rect x="6" y="2" width="12" height="20" rx="2"/><circle cx="12" cy="7" r="2"/><path d="M9 12h6M9 15h6M9 18h6"/>',
  clover: '<circle cx="9" cy="9" r="3.4"/><circle cx="15" cy="9" r="3.4"/><circle cx="9" cy="15" r="3.4"/><circle cx="15" cy="15" r="3.4"/><path d="M12 12l5 10"/>',
  pin: '<path d="M5 19L19 5"/><circle cx="19" cy="5" r="2"/>',
  bow: '<path d="M7 3a12 12 0 0 1 0 18"/><path d="M7 3v18"/><path d="M4 12h15M16 9l3 3-3 3"/>',
  pact: '<rect x="5" y="3" width="14" height="18" rx="2"/><path d="M8 8h8M8 12h8M8 16h5"/>',
  file: '<path d="M3 6h7l2 2h9v11H3z"/><path d="M7 13h10"/>',
  spool: '<rect x="6" y="3" width="12" height="3" rx="1"/><rect x="6" y="18" width="12" height="3" rx="1"/><path d="M8 6v12M16 6v12M8 9l8 2M8 13l8 2"/>'
};
function art(it, kind) {
  const w = el('div', 'art art-' + it.kind);
  w.style.setProperty('--wc', D.worlds[it.world].color);
  if (it.kind === 'keep') { w.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true">' + ICONS[it.icon] + '</svg>'; return w }
  const im = new Image(); im.alt = ''; im.loading = 'lazy'; im.decoding = 'async';
  im.src = '/assets/img/caw/' + (kind || 'banner') + '/' + it.id + '.webp';
  im.onerror = () => { im.remove(); w.classList.add('noart'); w.insertAdjacentHTML('beforeend', '<span>' + esc(it.name.split(' ')[0]) + '</span>') };
  w.append(im); return w;
}
const stars = n => '★'.repeat(n);

/* =================================================================== ACT 1: the shop */
const L0 = () => ({ step: 0, gems: 0, tix: 0, eur: 0, hours: 0, days: 0, pulls: 0, spilt: 0, rates: false, odds: null, broke: false, clock: 3 * 86400, rate: 1, ended: false, frozen: false });
let L, line = 0;
const steps = () => D.lesson.steps;
const money = n => n.toFixed(2) + ' €';

/* the countdown: fake, and faster every time you hesitate. Prima's banner is the only one 'ending'. */
const RATE = { gifts: 1, pull: 40, sub: 400, pass: 900, chest: 700, chase: 700, skin: 900, creep: 900 };
let tick = null, lastAct = Date.now();
const two = n => String(n).padStart(2, '0');
function paintClock() {
  const t = $('#m-date-t'), b = $('#m-banner');
  b.classList.toggle('ended', !!L.ended); b.classList.toggle('rerun', L.step >= 4 && L.step <= 6 && !L.frozen && !L.broke);
  if (L.broke || L.frozen) return;
  if (L.ended) { t.textContent = 'EVENT ENDED · Prima is no longer available'; return }
  const c = Math.max(0, Math.round(L.clock)), d = Math.floor(c / 86400), h = Math.floor(c % 86400 / 3600), m = Math.floor(c % 3600 / 60);
  t.textContent = (L.step >= 4 ? 'FINAL RERUN · ends in ' : 'Prima\'s banner ends in ') + (d ? d + 'd ' : '') + two(h) + ':' + two(m) + ':' + two(c % 60);
  b.classList.toggle('hurry', c < 6 * 3600);
}
function runClock() {
  clearInterval(tick);
  tick = setInterval(() => {
    if (L.broke || L.frozen || L.ended || document.hidden) return;
    const idle = (Date.now() - lastAct) / 1000; // hesitate and the clock speeds up
    L.clock -= L.rate * (idle > 6 ? Math.min(12, 1 + (idle - 6) / 2) : 1);
    if (L.clock < 90 * 60 && L.step < 3) L.clock = 90 * 60; // it only really runs out during the grind
    paintClock();
  }, 1000);
}
// the borrowed hours: some spill over the banner (overwork) and bury the clock, so it ends while you aren't looking
function spill() {
  const r = $('#m-banner'), n = 14; L.spilt += 8;
  for (let i = 0; i < n; i++) {
    const h = el('span', 'spill', '⌛ 1h'); h.setAttribute('aria-hidden', 'true');
    h.style.left = (4 + Math.random() * 40) + '%'; h.style.setProperty('--dx', (Math.random() * 60 - 30) + 'px'); h.style.setProperty('--dy', (r.offsetHeight * (.72 + Math.random() * .2)) + 'px'); h.style.setProperty('--r', (Math.random() * 300 - 150) + 'deg');
    h.style.animationDelay = i * 90 + 'ms'; h.onpointerenter = () => h.classList.add('nope'); r.append(h);
  }
}
// the banner runs out while you're grinding: the clock races to zero and Prima is gone
function endBanner(then) {
  const from = L.clock, t0 = performance.now(), dur = 1;
  clearInterval(tick);
  const f = now => { const k = Math.min(1, (now - t0) / dur); L.clock = from * (1 - k * k); paintClock(); if (k < 1) requestAnimationFrame(f); else { L.ended = true; paintClock(); runClock(); $('#m-banner').querySelectorAll('.spill').forEach(x => x.classList.add('clear')); then() } };
  requestAnimationFrame(f);
}
// the phone: friends write less each page, the 'community' and the guild write more
let fed = {}, feedT = [];
function feed(id) {
  if (fed[id] || !D.lesson.feed[id]) return; fed[id] = 1;
  D.lesson.feed[id].forEach((m, i) => feedT.push(setTimeout(() => {
    const ol = $('#ph-list'), li = el('li', 'ph-' + m.kind);
    li.innerHTML = '<b>' + esc(m.from) + '</b>' + esc(m.text); ol.prepend(li);
    while (ol.children.length > 7) ol.lastChild.remove();
    const k = [...ol.children].reduce((a, x) => (a[x.className] = (a[x.className] || 0) + 1, a), {});
    $('#ph-n').textContent = (k['ph-friend'] || 0) + ' friends · ' + ((k['ph-toxic'] || 0) + (k['ph-guild'] || 0)) + ' others';
  }, 700 + i * 1400)));
}
function say(t) { const b = $('#bubble'); b.textContent = t; b.classList.remove('pop'); void b.offsetWidth; b.classList.add('pop') }
function paintShop() {
  $('#gems').textContent = L.gems.toLocaleString('en'); $('#tix').textContent = L.tix;
  $('#r-eur').textContent = money(L.eur); $('#r-hours').textContent = L.hours + ' h' + (L.spilt ? ' (' + L.spilt + ' h dropped, still owed)' : ''); $('#r-days').textContent = L.days; $('#r-pulls').textContent = L.pulls;
  $('#lesson-step').textContent = L.step < steps().length ? 'page ' + (L.step + 1) + ' of ' + steps().length + ' of Ache\'s manual' : 'the manual, complete';
  const o = L.odds || HOUSE;
  $('#m-rates').innerHTML = '<p class="crumb">Details › Info › Rates</p><table><tr><td>★5</td><td>' + o[5] + '%</td></tr><tr><td>★4</td><td>' + o[4] + '%</td></tr><tr><td>★3</td><td>' + Math.round((100 - o[5] - o[4]) * 10) / 10 + '%</td></tr></table><p class="small">' + (L.odds ? 'Your odds, set in the backroom.' : 'Typical of paid gacha. Pity at 60 pulls on this banner, then a 50/50: the gold may not be the featured character. The counter is not shown.') + '</p>';
  $('#m-rates').hidden = !L.rates;
  $('#o5').value = o[5]; $('#o4').value = o[4]; $('#o5v').textContent = o[5] + '%'; $('#o4v').textContent = o[4] + '%';
  const st = steps()[L.step], man = $('#manual');
  man.innerHTML = steps().slice(0, L.step + (L.done ? 1 : 0)).filter(s => s.lesson).map(s => '<li>' + esc(s.lesson) + '</li>').join('');
  $('#machine').classList.toggle('smashed', !!L.broke);
  $('#seller').classList.toggle('unhooded', !!L.broke);
  $('#backroom-btn').hidden = L.step !== 4 || L.broke;
}
function showStep() {
  const st = steps()[L.step]; line = 0;
  if (!st) return;
  say(st.lines[0]); clips(st, 0);
  const more = st.lines.length > 1;
  $('#next').hidden = !more; $('#act').hidden = more; $('#act').textContent = st.act;
  if (RATE[st.id]) L.rate = RATE[st.id];
  if (st.id === 'chest' && L.ended) { L.ended = false; L.clock = 48 * 3600 } // the 'final rerun'
  feed(st.id);
  if (st.id === 'skin') shopItem();
  if (st.id === 'creep') bannerOf(ITEMS.ache, '<span class="pl-up">TEAM THREAD · ' + D.lesson.roles.ache + '</span>'); // power creep: the next banner beats the one you paid for
  paintShop(); paintClock();
}
// the paid costume, sold as a shop item for fake Gems (free on Miriam's sheet after the smash)
function shopItem() {
  const f = ITEMS.miriam.freeOutfit, r = $('#m-results'); r.innerHTML = '';
  const c = el('div', 'shop-item');
  c.innerHTML = '<span class="si-tag">NEW · LIMITED</span><img src="' + esc(f.img) + '" alt="' + esc(f.alt) + '"><b>' + esc(f.name) + '</b><small>Costume for Miriam ★5 (trial)</small><span class="si-price"><s>2,980</s> ◆ 1,980</span>';
  r.append(c);
}
function nextLine() {
  lastAct = Date.now();
  const st = steps()[L.step]; line++;
  if (line < st.lines.length) { say(st.lines[line]); clips(st, line) }
  const nb = st.banners && st.banners[line]; // power creep: each line of the pitch puts up the next banner
  if (nb === 'weapon') bannerOf(D.lesson.weapon, '<span class="pl-up">WEAPON BANNER · NEXT WEEK</span>');
  else if (nb) bannerOf(ITEMS[nb] || D.lesson.units[nb], '<span class="pl-up">TEAM THREAD · ' + (D.lesson.roles[nb] || '') + ' · NEXT MONTH</span>');
  if (line >= st.lines.length - 1) { $('#next').hidden = true; $('#act').hidden = false; $('#act').textContent = st.act }
}
// official uploads, from the publishers' own channels; nothing loads from YouTube until you press play
function clips(st, i) {
  const box = $('#clips'), list = st.clips && st.clips[i];
  if (box.dataset.step !== st.id) { box.innerHTML = ''; box.dataset.step = st.id; box.dataset.line = '' } // a playing video stays while Ache talks on
  if (!list || box.dataset.line == i) return; box.dataset.line = i;
  for (const c of list) {
    const b = el('button', 'clip'); b.type = 'button';
    b.innerHTML = '<span class="play" aria-hidden="true">▶</span><b>' + esc(c.title) + '</b><small>' + esc(c.by) + ' · YouTube</small>';
    b.onclick = () => {
      const f = el('iframe', 'clip-frame'); f.src = 'https://www.youtube-nocookie.com/embed/' + c.yt + '?autoplay=1&rel=0';
      f.title = c.title; f.allow = 'autoplay; encrypted-media; picture-in-picture; fullscreen'; f.allowFullscreen = true;
      box.querySelectorAll('.clip-frame').forEach(x => x.remove()); box.prepend(f);
    };
    box.append(b);
  }
}
function rollLesson(force, noGold) {
  const o = L.odds || HOUSE, r = Math.random() * 100;
  let tier = r < o[5] ? 5 : r < o[5] + o[4] ? 4 : 3;
  if (force) tier = Math.max(tier, force);
  if (noGold && !L.odds) tier = Math.min(tier, 4);
  const pool = D.items.filter(i => i.stars === tier);
  return pick(pool.length ? pool : D.items);
}
function lessonPull(tease, n, gold) {
  n = n || 10;
  const out = []; for (let i = 0; i < n; i++) out.push(rollLesson(i % 10 === 9 && !out.slice(i - 9).some(x => x.stars >= 4) ? 4 : 0, n > 10));
  if (gold) out[gold[1]] = ITEMS[gold[0]] || D.lesson.units[gold[0]]; // scripted gold: where pity lands, and on whom
  L.pulls += n;
  const r = $('#m-results'); r.innerHTML = '';
  // a big chest shows its ten best results and counts the rest, as the real ones do
  const shown = n > 10 ? out.map((it, i) => [it, i]).sort((a, b) => b[0].stars - a[0].stars || a[1] - b[1]).slice(0, 10).sort((a, b) => a[1] - b[1]).map(x => x[0]) : out;
  shown.forEach((it, i) => {
    const c = el('div', 'res t' + it.stars); c.style.animationDelay = i * 60 + 'ms'; c.append(art(it));
    c.insertAdjacentHTML('beforeend', '<span class="rs">' + stars(it.stars) + '</span><b>' + esc(it.name) + '</b>');
    r.append(c);
  });
  if (n > 10) {
    const cnt = t => out.filter(x => x.stars === t).length, gold = out.filter(x => x.stars === 5);
    r.insertAdjacentHTML('beforeend', '<p class="res-sum">' + n + ' pulls: ' + cnt(3) + ' ★3, ' + cnt(4) + ' ★4, ' + gold.length + ' ★5' + (gold.length ? ' (' + esc(gold.map(x => x.name).join(', ')) + ')' : '') + '. The best ten are shown.</p>');
  }
  if (tease) { // the near-miss: a gold shine on a card that was always going to be purple
    const t = [...r.children].find(c => c.classList.contains('t4')) || r.querySelector('.res');
    if (t) { t.classList.add('tease'); setTimeout(() => t.classList.remove('tease'), 1600) }
  }
  return out;
}
function act() {
  const st = steps()[L.step]; lastAct = Date.now();
  switch (st.id) {
    case 'gifts': L.gems += 3200; L.tix += 10; $('#m-inv').innerHTML = '<span class="trial">Miriam ★5 · TRIAL · 7 days left</span>'; break;
    case 'pull': L.tix -= 10; lessonPull(); L.rates = false; break;
    case 'sub': L.eur += 4.99; L.days += 30; L.gems += 2700; break;
    case 'pass': L.eur += 9.99; L.hours += 60; L.gems += 1300; spill(); break;
    case 'chest': L.eur += 99.99; L.gems += 12960 - 8000; lessonPull(true, 50, [D.lesson.pityLoss, 49]); break;
    case 'chase': L.eur += 199.98; L.gems += 12960 - 12800; lessonPull(false, 80, ['prima', 77]); L.prima = true; $('#m-inv').insertAdjacentHTML('beforeend', '<span class="trial">Prima ★5 · yours (for now)</span>'); break;
    case 'skin': L.gems -= 1980; L.eur += 19.99; $('#m-inv').innerHTML = '<span class="trial">Miriam ★5 · TRIAL · 6 days left · wearing Star Specks</span>' + (L.prima ? '<span class="trial">Prima ★5 · yours (for now)</span>' : ''); { const si = $('.shop-item'); if (si) si.classList.add('owned') } break;
    case 'tilt': smash(); return;
    case 'journey': L.done = true; write({ lesson: { done: 1 } }); startJourney(true); return;
  }
  if (st.after) {
    let k = 0; $('#act').hidden = true; $('#next').hidden = false;
    const more = () => {
      lastAct = Date.now();
      if (k >= st.after.length) { $('#next').onclick = nextLine; advance(); return }
      const t = st.after[k++];
      if (st.id === 'pass' && k === 2) endBanner(() => say(t)); else say(t);
    };
    $('#next').onclick = more; more(); paintShop(); return
  }
  advance();
}
function advance() { L.step++; write({ lesson: { step: L.step } }); showStep() }
function smash() {
  L.broke = true; paintShop();
  const sh = $('#shards'); sh.innerHTML = '';
  const chars = D.items.filter(i => i.kind === 'char');
  chars.forEach((it, i) => { // the characters fly out of the cracked machine
    const t = el('img', 'fly'); t.src = '/assets/img/caw/token/' + it.id + '.png'; t.alt = '';
    const a = (i / chars.length) * Math.PI * 2;
    t.style.setProperty('--dx', Math.round(Math.cos(a) * (240 + Math.random() * 200)) + 'px');
    t.style.setProperty('--dy', Math.round(Math.sin(a) * (200 + Math.random() * 160) - 120) + 'px');
    t.style.animationDelay = i * 40 + 'ms'; sh.append(t);
  });
  for (let i = 0; i < 14; i++) { const p = el('i', 'shard'); p.style.setProperty('--dx', (Math.random() * 360 - 180) + 'px'); p.style.setProperty('--dy', (Math.random() * 260 - 60) + 'px'); p.style.setProperty('--r', (Math.random() * 540 - 270) + 'deg'); sh.append(p) }
  $('#m-date-t').textContent = 'No more banners. No more clocks. Ever.';
  L.gems = 0; L.tix = 0; $('#m-inv').innerHTML = '<span class="trial gone">Miriam (trial): gone with the machine, costume and all. She was never yours. Neither was the Prima you paid 299.97 € for. The real ones are out there, and Star Specks fell out of the wreck: find Miriam and it\'s hers, free.</span>';
  advance();
}
function bindShop() {
  $('#next').onclick = nextLine; $('#act').onclick = act;
  $('#rates').onclick = () => { L.rates = !L.rates; paintShop(); if (L.rates && L.step <= 2) say('Ah. You found the rates. Most people don\'t. Let\'s not dwell on it, friend.') };
  $('#backroom-btn').onclick = () => { $('#backroom').hidden = false; $('#backroom-btn').hidden = true; say('HEY! Staff only! Put that... okay, fine. Look. Those are the odds. I set them. I can set them to anything. I always could.') };
  const setO = (a, b) => { a = Math.max(0, Math.min(100, +a)); b = Math.max(0, Math.min(100 - a, +b)); L.odds = a === HOUSE[5] && b === HOUSE[4] ? null : { 5: Math.round(a * 10) / 10, 4: Math.round(b * 10) / 10 }; paintShop() };
  $('#o5').oninput = () => setO($('#o5').value, $('#o4').value);
  $('#o4').oninput = () => setO($('#o5').value, $('#o4').value);
  $('#br-gems').onclick = () => { L.gems += 10000; paintShop(); $('#br-note').textContent = 'Ten thousand Gems, out of nowhere. They cost the house nothing to make. They cost you 99.99 € a moment ago.' };
  $('#br-gold').onclick = () => { setO(100, 0); lessonPull(); paintShop(); $('#br-note').textContent = 'All gold. Notice how fast it stopped being exciting? The excitement was the product.' };
  $('#br-reset').onclick = () => { setO(HOUSE[5], HOUSE[4]); $('#br-note').textContent = 'Back to the house odds. 0.6%. Feels worse now that you\'ve seen the slider, doesn\'t it?' };
  const sel = $('#br-target'); sel.innerHTML = D.items.filter(i => i.kind === 'char').map(i => '<option value="' + i.id + '">' + stars(i.stars) + ' ' + esc(i.name) + '</option>').join('');
  $('#br-take').onclick = () => { const it = ITEMS[sel.value]; $('#m-results').innerHTML = ''; const c = el('div', 'res t' + it.stars); c.append(art(it)); c.insertAdjacentHTML('beforeend', '<span class="rs">' + stars(it.stars) + '</span><b>' + esc(it.name) + '</b>'); $('#m-results').append(c);
    $('#br-note').textContent = it.id === 'prima' ? 'Prima, handed over. Broken card, zero pulls. And next season the house prints someone who beats him: that\'s power creep, the reason "broken" never lasts. Up to 180 pulls for a guaranteed featured gold, around 360 € at 2 € a pull (an estimate from common public numbers).' : 'Handed over, no pull. In a paid game that\'s called "spending until it drops": up to 180 pulls for a guaranteed featured gold, around 360 € at 2 € a pull (an estimate from common public numbers).' };
}
function bannerOf(it, extra) { const ma = $('#m-art'); ma.innerHTML = ''; ma.append(art(it)); ma.append(plate(it, extra)); $('#m-banner').classList.toggle('creep', !!L && (steps()[L.step] || {}).id === 'creep') }
function startShop(replay) {
  bannerOf(ITEMS.prima, '<span class="pl-up">TCG COLLAB · RATE UP</span><span class="pl-gone">GONE</span>');
  $('#m-results').innerHTML = ''; $('#m-inv').innerHTML = ''; $('#shards').innerHTML = ''; $('#backroom').hidden = true;
  $('#m-banner').querySelectorAll('.spill').forEach(x => x.remove());
  feedT.forEach(clearTimeout); feedT = []; fed = {}; $('#ph-list').innerHTML = ''; $('#ph-n').textContent = '';
  L = L0(); if (!replay && C.lesson && C.lesson.step) L.step = Math.min(C.lesson.step, steps().length - 1);
  L.broke = L.step > steps().findIndex(x => x.id === 'tilt')
  showStep(); runClock();
}

/* =================================================================== ACT 2: the journey */
function startJourney(scroll) {
  $('#journey').hidden = false; renderJourney();
  if (scroll) $('#journey').scrollIntoView({ behavior: 'smooth', block: 'start' });
}
function renderJourney() { renderShelf(); renderBonds(); renderRecent(); renderFire() }

/* the campfire: everyone on the shelf, one seat for you, and spare seats for whoever joins next */
function renderFire() {
  const F = D.campfire, box = $('#campfire'), chars = D.items.filter(i => i.kind === 'char');
  const here = chars.filter(i => copies(i.id) > 0), all = here.length === chars.length;
  $('#fire-count').textContent = here.length + ' of ' + chars.length + ' around the fire';
  box.innerHTML = ''; box.classList.toggle('lit', all);
  const ring = el('div', 'ring'), seats = [...chars.map(i => ({ it: i, on: copies(i.id) > 0 })), { you: 1 }, ...Array.from({ length: F.spare }, () => ({ spare: 1 }))];
  seats.forEach((s, k) => {
    const a = (k / seats.length) * Math.PI * 2 - Math.PI / 2, seat = el('div', 'seat' + (s.you ? ' you' : s.spare ? ' spare' : s.on ? '' : ' away'));
    seat.style.setProperty('--x', (50 + Math.cos(a) * 42).toFixed(1) + '%'); seat.style.setProperty('--y', (50 + Math.sin(a) * 38).toFixed(1) + '%');
    if (s.it) { const t = el('img'); t.src = '/assets/img/caw/token/' + s.it.id + '.png'; t.alt = ''; seat.append(t); seat.append(el('small', '', esc(s.on ? s.it.name : '?'))) }
    else seat.append(el('small', '', esc(s.you ? F.seatYou : F.seatSpare)));
    seat.title = s.it ? (s.on ? s.it.name : 'Not found yet') : s.you ? F.seatYou : F.seatSpare;
    ring.append(seat);
  });
  ring.append(el('div', 'fire', '<i></i><i></i><i></i>'));
  box.append(ring);
  const side = el('div', 'fire-side');
  if (!all) {
    side.innerHTML = '<p>The fire is laid but nobody has lit it. When every character from every world has followed you here, they\'ll sit down together, and there\'s a seat with your name on it.</p><p class="note">Still out there: ' + chars.filter(i => !copies(i.id)).map(i => esc(i.name)).join(', ') + '.</p>';
  } else {
    if (F.img) { const im = el('img', 'fire-pic'); im.alt = 'Every character, gathered around a campfire'; im.onerror = () => im.remove(); im.src = F.img; side.append(im) }
    const ol = el('ol', 'fire-lines'); side.append(ol);
    const b = el('button', 'btn', (C.fire ? 'Sit by the fire again' : 'Sit down') + ' <span>→</span>'); b.type = 'button';
    b.onclick = () => {
      ol.innerHTML = ''; let k = 0;
      const step = () => {
        const [who, t] = F.lines[k++], it = ITEMS[who];
        const li = el('li'); li.innerHTML = '<b>' + esc(it ? it.name : who) + '</b> ' + esc(t); ol.append(li);
        if (k < F.lines.length) { b.innerHTML = 'Next <span>→</span>'; b.onclick = step } else { b.remove(); write({ fire: 1 }); side.append(el('p', 'note', 'You\'re part of the group now. The empty logs stay empty until someone new arrives.')) }
      };
      step();
    };
    side.append(b);
  }
  box.append(side);
}
function renderRecent() {
  const f = Object.entries(found()).sort((a, b) => b[1] - a[1]).slice(0, 6), r = $('#recent');
  const total = D.items.reduce((n, it) => n + copies(it.id), 0), max = D.items.reduce((n, it) => n + (it.kind === 'keep' ? 1 : D.rules.maxCopies), 0);
  $('#journey-count').textContent = total + ' of ' + max + ' finds';
  r.innerHTML = f.length ? '<strong>Latest finds</strong>' + f.map(([sid]) => { const s = SPOTS.find(x => x.id === sid); return s ? '<span>' + esc(ITEMS[s.item].name) + '</span>' : '' }).join('') : '<strong>Nobody yet.</strong> <span>Look for small round faces peeking out of the pages. Every sheet below tells you where to start.</span>';
}
function nextHint(id) { const s = SPOTS.find(x => x.item === id && !found()[x.id]); return s }
function renderShelf() {
  const s = $('#shelf'); s.innerHTML = '';
  for (const [wid, w] of Object.entries(D.worlds)) {
    const g = el('div', 'world'); g.style.setProperty('--wc', w.color);
    g.innerHTML = '<h3>' + esc(w.name) + '</h3><p>' + esc(w.line) + '</p>';
    const row = el('div', 'world-row');
    for (const it of D.items.filter(i => i.world === wid)) {
      const n = copies(it.id), max = it.kind === 'keep' ? 1 : D.rules.maxCopies, h = nextHint(it.id);
      const c = el('button', 'slot-card t' + it.stars + (n ? '' : ' locked') + ' k-' + it.kind); c.type = 'button'; c.setAttribute('data-say', 'caw-card');
      c.append(art(it, n >= 4 ? 'outfit' : 'banner'));
      c.insertAdjacentHTML('beforeend', '<span class="rs">' + stars(it.stars) + '</span><b>' + esc(it.name) + '</b><small>' + (it.kind === 'keep' ? (n ? 'found' : 'keepsake, not found yet') : n + ' of ' + max + (n ? ': ' + LAYERS[n - 1] : ' · not found yet')) + '</small>' + (h ? '<em class="hint">' + esc(h.hint) + '</em>' : '<em class="hint done">All found.</em>'));
      c.onclick = () => openSheet(it);
      row.append(c);
    }
    g.append(row); s.append(g);
  }
}
const pageName = p => ({ '/': 'the front page', '/studio': 'the studio page', '/story': 'the story page', '/redache': 'Ache\'s source', '/lab': 'the Idea Lab', '/scrapbook': 'the scrapbook', '/posts': 'all posts' })[p] || (p.startsWith('/posts/categories/') ? 'the ' + p.split('/').pop() + ' shelf' : p.startsWith('/post/') ? 'an article' : p);
// the banner text: live page text over the calm left half of the art, never painted into the picture
function plate(it, extra) {
  const w = D.worlds[it.world], p = el('div', 'plate');
  p.innerHTML = '<span class="pl-world">' + esc(w.name) + (w.wip ? ' · in development' : '') + '</span><b class="pl-name">' + esc(it.plateName || it.name) + '</b>' + (it.title ? '<span class="pl-title">' + esc(it.plateTitle || it.title) + '</span>' : '') + '<span class="pl-stars t' + it.stars + '">' + stars(it.plateStars || it.stars) + '</span>' + (extra || '');
  return p;
}
function openSheet(it) {
  const n = copies(it.id), w = D.worlds[it.world], d = $('#sheet'), box = $('#sheet-in');
  box.innerHTML = ''; box.style.setProperty('--wc', w.color); addClose(box);
  const head = el('div', 'sheet-art'); head.append(art(it, it.kind === 'char' && n >= 4 ? 'outfit' : 'banner'));
  if (it.kind === 'char' && n >= 4) {
    const t = el('button', 'swap', 'See the banner'); t.type = 'button'; let o = true;
    t.onclick = () => { o = !o; head.firstChild.replaceWith(art(it, o ? 'outfit' : 'banner')); t.textContent = o ? 'See the banner' : 'See the secret outfit' };
    head.append(t);
  }
  if (it.kind === 'char') head.append(plate(it, n ? '<span class="pl-copy">' + n + ' of ' + D.rules.maxCopies + ' · ' + esc(LAYERS[n - 1]) + '</span>' : ''));
  box.append(head);
  let h = '<span class="tag">' + esc(w.name) + ' · ' + stars(it.stars) + (it.kind === 'keep' ? ' keepsake' : '') + '</span><h2>' + esc(it.name) + '</h2>' + (it.title ? '<p class="ttl">' + esc(it.title) + '</p>' : '');
  if (!n) h += '<p class="lockline">Not found yet. They\'re hiding somewhere on the site.</p>';
  else if (it.kind === 'keep') {
    h += '<p>' + esc(it.about) + '</p><p class="note2">' + esc(it.notes[0]) + '</p>';
    if (it.ref) h += '<figure class="fromgame"><img src="' + refSrc(it) + '" alt="' + esc(it.about) + '" loading="lazy"><figcaption>From the game. Work in progress.</figcaption></figure>';
  } else {
    h += '<dl class="facts">' + it.facts.map(([k, v]) => '<dt>' + esc(k) + '</dt><dd>' + esc(v) + '</dd>').join('') + '</dl><p>' + esc(it.about) + '</p>';
    h += n >= 2 ? '<h3>Notes</h3><ul>' + it.notes.map(x => '<li>' + esc(x) + '</li>').join('') + '</ul>' : lock(2, 'Notes');
    h += n >= 3 ? '<blockquote>' + esc(it.quote) + '</blockquote>' : lock(3, 'Quote');
    h += n >= 4 ? '<h3>Secret outfit: ' + esc(it.outfit.name) + '</h3><p>' + esc(it.outfit.line) + '</p>' : lock(4, 'Secret outfit');
    const met = D.meetings.filter(m => (m.a === it.id || m.b === it.id) && (C.met || {})[m.id]);
    if (met.length) h += '<h3>Met across worlds</h3><ul class="metl">' + met.map(m => '<li><button type="button" data-meet="' + m.id + '">' + esc(m.title) + ' · with ' + esc(ITEMS[m.a === it.id ? m.b : m.a].name) + '</button></li>').join('') + '</ul>';
  }
  if (it.freeOutfit && n) h += '<h3>Free outfit: ' + esc(it.freeOutfit.name) + '</h3><figure class="free-outfit"><img src="' + esc(it.freeOutfit.img) + '" alt="' + esc(it.freeOutfit.alt) + '" loading="lazy"><figcaption>' + esc(it.freeOutfit.line) + '</figcaption></figure>';
  const sp = SPOTS.filter(s => s.item === it.id);
  h += '<h3>Where they hide</h3><ol class="spots">' + sp.map(s => found()[s.id] ? '<li class="got">Found on ' + esc(pageName(s.path)) + '</li>' : '<li>' + esc(s.hint) + ' <a href="' + esc(s.path) + '">Go</a></li>').join('') + '</ol>';
  if (it.kind === 'char') h += it.ref ? '<figure class="fromgame"><img src="' + refSrc(it) + '" alt="' + esc(it.refAlt) + '" loading="lazy"><figcaption>From the game. ' + esc(it.refCredit) + (w.wip ? ' Work in progress.' : '') + '</figcaption></figure>' : '<p class="note">' + esc(it.refCredit) + '</p>';
  box.insertAdjacentHTML('beforeend', '<div class="sheet-body">' + h + '</div>');
  box.querySelectorAll('[data-meet]').forEach(b => b.onclick = () => openMeeting(D.meetings.find(m => m.id === b.dataset.meet)));
  if (!d.open) d.showModal();
}
const lock = (copy, what) => '<p class="lockline">Find ' + copy + ' unlocks: ' + what + '.</p>';
function addClose(box) { const x = el('button', 'x', '×'); x.type = 'button'; x.setAttribute('aria-label', 'Close'); x.onclick = () => $('#sheet').close(); box.append(x) }

/* ---------- meetings ---------- */
const meetState = m => (C.met || {})[m.id] ? 'met' : copies(m.a) && copies(m.b) ? 'ready' : 'locked';
function renderBonds() {
  const chars = D.items.filter(i => i.kind === 'char'), pos = {}, svg = $('#web');
  chars.forEach((c, i) => { const a = -Math.PI / 2 + i * 2 * Math.PI / chars.length; pos[c.id] = [200 + 150 * Math.cos(a), 200 + 150 * Math.sin(a)] });
  let s = '';
  for (const m of D.meetings) { const [x1, y1] = pos[m.a], [x2, y2] = pos[m.b]; s += '<line class="e ' + meetState(m) + '" data-m="' + m.id + '" x1="' + x1 + '" y1="' + y1 + '" x2="' + x2 + '" y2="' + y2 + '"/>' }
  for (const c of chars) { const [x, y] = pos[c.id], own = copies(c.id) > 0; s += '<g class="n' + (own ? ' own' : '') + '" style="--wc:' + D.worlds[c.world].color + '"><circle cx="' + x + '" cy="' + y + '" r="16"/><text x="' + x + '" y="' + (y + (y > 200 ? 34 : -24)) + '">' + esc(c.name.split(' ')[0]) + '</text></g>' }
  svg.innerHTML = s;
  svg.querySelectorAll('line').forEach(l => l.onclick = () => { const m = D.meetings.find(x => x.id === l.dataset.m); if (meetState(m) !== 'locked') openMeeting(m) });
  const ol = $('#meet-list'); ol.innerHTML = '';
  for (const m of D.meetings) {
    const st = meetState(m), li = el('li', st);
    const b = el('button', '', '<b>' + esc(m.title) + '</b><span>' + esc(ITEMS[m.a].name) + ' × ' + esc(ITEMS[m.b].name) + '</span><em>' + (st === 'met' ? 'read' : st === 'ready' ? 'ready to meet' : 'find both first') + '</em>');
    b.type = 'button'; b.disabled = st === 'locked'; b.onclick = () => openMeeting(m);
    li.append(b); ol.append(li);
  }
}
function openMeeting(m) {
  const d = $('#sheet'), box = $('#sheet-in'); box.innerHTML = ''; box.style.setProperty('--wc', D.worlds[ITEMS[m.a].world].color); addClose(box);
  const duo = el('div', 'duo'); duo.append(art(ITEMS[m.a]), art(ITEMS[m.b])); box.append(duo);
  const k = ITEMS[m.keep], hasK = copies(m.keep) > 0, lines = m.lines.concat(hasK ? [m.bonus] : []);
  box.insertAdjacentHTML('beforeend', '<div class="sheet-body"><span class="tag">' + esc(D.worlds[ITEMS[m.a].world].name) + ' × ' + esc(D.worlds[ITEMS[m.b].world].name) + '</span><h2>' + esc(m.title) + '</h2><div class="talk">' +
    lines.map(([who, t], i) => '<p class="' + (who === m.a ? 'l' : 'r') + (i >= m.lines.length ? ' bonus' : '') + '"><b>' + esc(ITEMS[who].name.split(' ')[0]) + '</b>' + esc(t) + '</p>').join('') + '</div>' +
    (hasK ? '<p class="note">One more line, thanks to your keepsake: ' + esc(k.name) + '.</p>' : '<p class="lockline">Find the ' + esc(k.name) + ' and they say one more thing.</p>') +
    '<p class="note">Draft lines, written for this page. Not canon.</p></div>');
  if (!(C.met || {})[m.id]) { write({ met: Object.assign({}, read().met, { [m.id]: 1 }) }); renderBonds() }
  if (!d.open) d.showModal();
}

/* ---------- start ---------- */
function lines() {
  if (!window.TZ || !TZ.addLines) return setTimeout(lines, 400);
  TZ.addLines('caw-card', ['every find shows a bit more of them', 'four finds and there\'s a secret outfit', 'no spoilers on these sheets. I guard them', 'they followed you here. that\'s the whole system']);
}
function start() {
  C = read(); for (const s of SPOTS) if (!ITEMS[s.item]) console.warn('caw: unknown item', s.item);
  bindShop(); startShop();
  if (C.lesson && C.lesson.done) { startJourney(false); $('#lesson').classList.add('was-done') }
  const skip = e => { e.preventDefault(); write({ lesson: Object.assign({}, read().lesson, { done: 1 }) }); startJourney(true) };
  $('#skip').onclick = skip; $('#skip2').onclick = skip;
  $('#replay').onclick = () => { startShop(true); $('#lesson').scrollIntoView({ behavior: 'smooth', block: 'start' }) };
  const refresh = () => { C = read(); if (!$('#journey').hidden) renderJourney() };
  if (window.TZSAVE && TZSAVE.on) TZSAVE.on('find', refresh);
  document.addEventListener('tz:save', refresh);
  lines();
}
Promise.all([fetch('/assets/caw.json').then(r => r.json()), fetch('/assets/caw-spots.json').then(r => r.json())]).then(([d, s]) => {
  D = d; SPOTS = s; for (const it of D.items) ITEMS[it.id] = it;
  $('#sheet').addEventListener('click', e => { if (e.target.id === 'sheet') e.target.close() });
  let go = false; const once = () => { if (!go) { go = true; start() } };
  if (window.TZSAVE) once(); else { addEventListener('tz:save-ready', once, { once: true }); setTimeout(once, 2500) }
}).catch(() => { $('#bubble').textContent = 'The shop didn\'t load. Refresh, and if it keeps happening, blame me.' });
})();
