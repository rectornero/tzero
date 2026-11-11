/* Worlds: the journal travels from game to game. Each article can belong to one of Artache's game worlds
   ("world": "<key>" in its post data; the list is assets/worlds.json). Entering a world swaps the page's
   colours and type (assets/css/worlds.css), the living scene behind it (scene.js draws the scene for
   <html data-world>), and plays a short arrival when the reader crosses from one world to another.
   The header chip opens the Atlas: every destination, with a passport stamp for each one visited.
   Pages that know their world up front say so with <html data-world="...">; articles and listings call
   TZW.enter() once their post is known. Everything is colour, type and scenery: no character art. */
window.TZW = (() => {
  const root = document.documentElement;
  const ARCHIVE_CAT = '6fecd53b-e26c-46ca-a508-d8b36cda3c3b';
  const OWN = /^(\/post\/|\/p\/|\/posts\/worlds\/)/.test(location.pathname); // the page script decides the world there
  let REG = {}, current = root.dataset.world || '', previewing = null;
  // The screen's form: phones and portrait screens get each world's tall composition, wide screens the wide one
  function form() {
    const f = innerWidth < 640 ? 'phone' : innerWidth < 1024 ? 'tablet' : 'desk';
    root.dataset.form = f; root.dataset.shape = innerHeight > innerWidth * 1.1 ? 'tall' : 'wide';
  }
  form(); addEventListener('resize', form);
  const ready = fetch('/assets/worlds.json').then(r => r.ok ? r.json() : {}).catch(() => ({})).then(j => {
    for (const k in j) if (k[0] !== '_') REG[k] = j[k];
    return REG;
  });

  const store = {
    get(k) { try { return localStorage.getItem(k) } catch (e) { return null } },
    set(k, v) { try { localStorage.setItem(k, v) } catch (e) {} },
    sget(k) { try { return sessionStorage.getItem(k) } catch (e) { return null } },
    sset(k, v) { try { sessionStorage.setItem(k, v) } catch (e) {} },
  };
  const calm = () => matchMedia('(prefers-reduced-motion: reduce)').matches || root.dataset.motion === '2';
  const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e };

  // Which world a post belongs to: its own field, else the old archive (frozen early issues), else the hub
  function of(post) {
    if (!post) return '';
    const w = String(post.world || '').toLowerCase();
    if (w && (REG[w] || !Object.keys(REG).length) && /^[a-z0-9-]{1,40}$/.test(w)) return w === 'tzero' ? '' : w;
    if (!post.own && (post.categoryIds || []).includes(ARCHIVE_CAT)) return 'archive';
    return '';
  }
  const info = k => REG[k || 'tzero'] || REG.tzero || { name: 'TZERØ', code: 'TZ0', genre: '', tagline: '' };

  // Fonts load only for the worlds a reader actually visits
  const fontsDone = new Set();
  function fonts(k) {
    const f = info(k).fonts;
    if (!f || fontsDone.has(f)) return;
    fontsDone.add(f);
    const l = el('link'); l.rel = 'stylesheet'; l.href = 'https://fonts.googleapis.com/css2?' + f + '&display=swap';
    document.head.appendChild(l);
  }

  function paint(k) {
    if (k) root.dataset.world = k; else delete root.dataset.world;
    root.toggleAttribute('data-dark', !!(k && info(k).dark));
    fonts(k);
    chip();
    document.dispatchEvent(new CustomEvent('tz-world', { detail: k }));
  }

  // Passport: which worlds this reader has visited (kept in the reader's browser, inside the save file when there is one)
  function stamps() {
    if (window.TZSAVE && TZSAVE.get) { const s = TZSAVE.get('worlds'); return (s && s.stamps) || {} }
    try { return JSON.parse(store.get('tz-passport')) || {} } catch (e) { return {} }
  }
  function stamp(k) {
    const key = k || 'tzero', s = stamps();
    if (s[key]) return false;
    s[key] = new Date().toISOString().slice(0, 10);
    if (window.TZSAVE && TZSAVE.set) TZSAVE.set('worlds', { stamps: s }); else store.set('tz-passport', JSON.stringify(s));
    return true;
  }

  // The arrival: a boarding pass drops in, gets stamped, and the gate opens on the new world
  function arrive(from, to, fresh) {
    const box = el('div', 'arrival'); box.setAttribute('aria-hidden', 'true');
    box.dataset.to = to || 'tzero';
    const A = info(to), F = info(from);
    const pass = el('div', 'pass');
    const top = el('div', 'pass-top');
    top.append(el('span', '', 'TZERØ · travel log'), el('span', '', new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })));
    const route = el('div', 'pass-route');
    const a = el('div', 'pass-end'); a.append(el('small', '', 'from'), el('b', '', F.code), el('span', '', F.name));
    const b = el('div', 'pass-end'); b.append(el('small', '', 'to'), el('b', '', A.code), el('span', '', A.name));
    route.append(a, el('i', 'pass-plane', '✦'), b);
    const foot = el('div', 'pass-foot', to ? A.genre : 'welcome back to the journal');
    const st = el('div', 'pass-stamp'); st.append(el('span', '', fresh ? 'first visit' : 'arrived'), el('b', '', A.code));
    pass.append(top, route, foot, st);
    box.append(el('div', 'gate gate-l'), el('div', 'gate gate-r'), pass);
    document.body.appendChild(box);
    const done = () => box.remove();
    box.addEventListener('click', done);
    setTimeout(() => box.classList.add('open'), 820);
    setTimeout(done, 1700);
    return new Promise(r => setTimeout(r, 380));
  }

  // Enter a world for real (articles, listings, game pages). Crossing between worlds plays the arrival once.
  function enter(k, opts) {
    k = k && k !== 'tzero' ? k : '';
    const last = store.sget('tz-world-last');
    const fresh = stamp(k);
    store.sset('tz-world-last', k || 'tzero');
    current = k;
    const crossing = last !== null && last !== (k || 'tzero') && !(opts && opts.quiet);
    if (crossing && !calm()) return arrive(last === 'tzero' ? '' : last, k, fresh).then(() => paint(k));
    paint(k);
    return Promise.resolve();
  }

  // Try a world on (the departures board): no stamp, no arrival, undone by unpreview()
  function preview(k) { previewing = k; paint(k === 'tzero' ? '' : k) }
  function unpreview() { if (previewing === null) return; previewing = null; paint(current) }

  // Header chip: where the reader is now; opens the Atlas
  let atlas = null;
  function chip() {
    const c = document.getElementById('world-chip'); if (!c) return;
    const k = root.dataset.world || '';
    c.querySelector('.wc-name').textContent = k ? info(k).name : 'Travel';
    c.title = k ? 'You are in ' + info(k).name + '. Open the atlas' : 'Open the atlas: every game world in the journal';
  }

  function counts() {
    return (window.WIX && WIX.ownPosts ? WIX.ownPosts() : Promise.resolve([])).then(ps => {
      const n = {}; ps.forEach(p => { const k = of(p) || 'tzero'; n[k] = (n[k] || 0) + 1 }); return n;
    }).catch(() => ({}));
  }

  function openAtlas() {
    const c = document.getElementById('world-chip');
    if (atlas) { closeAtlas(); return }
    atlas = el('div', 'atlas'); atlas.setAttribute('role', 'dialog'); atlas.setAttribute('aria-label', 'Atlas of game worlds');
    const s = stamps(), keys = Object.keys(REG).filter(k => !REG[k].hidden);
    const seen = keys.filter(k => s[k]).length;
    const head = el('div', 'atlas-head');
    head.append(el('b', '', 'Atlas'), el('span', '', 'Passport: ' + seen + ' of ' + keys.length + ' worlds stamped'));
    const list = el('ol', 'atlas-list');
    const here = root.dataset.world || 'tzero';
    keys.forEach(k => {
      const W = REG[k], li = el('li'), a = el('a', 'atlas-row');
      a.href = W.home || '/posts/worlds/' + k; a.dataset.w = k;
      if (k === here) a.setAttribute('aria-current', 'true');
      const code = el('span', 'atlas-code', W.code);
      const txt = el('span', 'atlas-txt'); txt.append(el('b', '', W.name), el('small', '', W.genre));
      const st = el('span', 'atlas-stamp' + (s[k] ? ' on' : ''), s[k] ? '✦' : '');
      st.title = s[k] ? 'Stamped ' + s[k] : 'Not visited yet';
      a.append(code, txt, st); li.append(a); list.append(li);
    });
    atlas.append(head, list, el('p', 'atlas-note', 'Every article lives in a game world. Read one and the page travels there.'));
    document.body.appendChild(atlas);
    const r = c.getBoundingClientRect();
    atlas.style.top = (r.bottom + 10) + 'px';
    atlas.style.right = Math.max(8, innerWidth - r.right) + 'px';
    c.setAttribute('aria-expanded', 'true');
    setTimeout(() => addEventListener('pointerdown', outside), 0);
    addEventListener('keydown', esc);
  }
  function outside(e) { if (atlas && !atlas.contains(e.target) && !e.target.closest('#world-chip')) closeAtlas() }
  function esc(e) { if (e.key === 'Escape') closeAtlas() }
  function closeAtlas() {
    if (!atlas) return; atlas.remove(); atlas = null;
    removeEventListener('pointerdown', outside); removeEventListener('keydown', esc);
    const c = document.getElementById('world-chip'); if (c) c.setAttribute('aria-expanded', 'false');
  }

  // The header's settings popover (skin, sound, motion) closes when the reader taps elsewhere
  addEventListener('pointerdown', e => document.querySelectorAll('details.tweaks[open]').forEach(d => { if (!d.contains(e.target)) d.open = false }));

  // A card in a world wears its colours and a small destination label
  function decorate(card, post) {
    const k = of(post); if (!k) return;
    card.dataset.world = k;
    if (card.querySelector('.card-world')) return;
    const tag = el('span', 'card-world'); tag.append(el('i', '', info(k).code), document.createTextNode(info(k).name));
    const t = card.querySelector('.tag'); t ? t.after(tag) : card.prepend(tag);
  }

  // Strip on top of an article: which world the reader is in, and the way to the rest of it
  function strip(k) {
    const W = info(k), s = el('a', 'world-strip'); s.href = W.home || '/posts/worlds/' + k;
    s.dataset.world = k;
    s.append(el('span', 'ws-code', W.code), el('span', 'ws-name', W.name), el('span', 'ws-genre', W.genre), el('span', 'ws-go', 'More from this world →'));
    return s;
  }

  // Departures board (homepage): every world as a destination; hovering one tries its look on the page
  const FLAP = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-';
  function flap(node, text, delay) {
    if (calm()) { node.textContent = text; return }
    let i = 0; const n = 8 + Math.floor(Math.random() * 6);
    setTimeout(function tick() {
      node.textContent = text.split('').map((ch, j) => ch === ' ' || i >= n - Math.max(0, (text.length - j) / 3) ? ch : FLAP[Math.floor(Math.random() * FLAP.length)]).join('');
      if (++i <= n + text.length / 3) setTimeout(tick, 45); else node.textContent = text;
    }, delay);
  }
  function departures(box) {
    Promise.all([ready, counts()]).then(([, n]) => {
      const rows = Object.keys(REG);
      const list = el('ol', 'dep-list');
      const head = el('li', 'dep-row dep-head'); head.setAttribute('aria-hidden', 'true');
      ['Code', 'Destination', 'Kind of game', 'Status'].forEach(t => head.append(el('span', '', t)));
      list.append(head);
      rows.forEach((k, i) => {
        const W = REG[k], li = el('li');
        const row = el(W.hidden ? 'div' : 'a', 'dep-row' + (W.hidden ? ' dep-wip' : ''));
        if (!W.hidden) row.href = W.home || '/posts/worlds/' + k;
        row.dataset.w = k;
        const code = el('span', 'dep-code'), name = el('span', 'dep-name'), genre = el('span', 'dep-genre', W.genre);
        const c = n[k] || 0;
        const status = el('span', 'dep-status', W.hidden ? 'Delayed' : k === 'archive' ? 'Open · 2017 to 2026' : c ? 'Boarding · ' + c + (c > 1 ? ' articles' : ' article') : 'Gate open');
        row.append(code, name, genre, status);
        if (!W.hidden) {
          const on = () => preview(k), off = () => unpreview();
          row.addEventListener('pointerenter', on); row.addEventListener('focus', on);
          row.addEventListener('pointerleave', off); row.addEventListener('blur', off);
        }
        li.append(row); list.append(li);
        flap(code, W.code, 120 + i * 90); flap(name, W.name.toUpperCase(), 160 + i * 90);
      });
      box.replaceChildren(list);
    });
  }

  ready.then(() => {
    chip();
    const c = document.getElementById('world-chip');
    if (c) c.addEventListener('click', openAtlas);
    // pages that know their world (or are the hub) enter it now; articles and world listings decide themselves
    if (!OWN) enter(root.dataset.world || '');
    else if (root.dataset.world) paint(root.dataset.world);
    const dep = document.getElementById('departures-board'); if (dep) departures(dep);
  });

  return { ready, of, info, enter, preview, unpreview, decorate, strip, departures, stamps, get list() { return REG } };
})();
