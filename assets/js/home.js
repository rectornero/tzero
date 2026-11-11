/* The front page: the opening (a countdown to T-zero, the masthead whose Ø is a portal to every game world),
   the boarding tickets (the three newest articles), the departures ticker, and the bento below it.
   Data: WIX.latest() for the newest articles (own posts + the nightly build on Wix), /assets/search.json for
   how many articles each world holds (static, also used by the search palette), TZW for the worlds.
   Everything animated here is CSS transform/opacity; nothing runs a loop of its own except the portal's
   3.6 s world cycle, which stops when the tab is hidden, the opening is off screen, or motion is calm. */
(() => {
  const $ = id => document.getElementById(id);
  const root = document.documentElement, body = document.body;
  const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e };
  const calm = () => matchMedia('(prefers-reduced-motion: reduce)').matches || root.dataset.motion === '2';
  const W = window.TZW, open = $('open');

  /* ---------- the opening: T-3, T-2, T-1, zero (once per visit, skippable) ---------- */
  let seen = false; try { seen = sessionStorage.getItem('tz-intro') === '1'; sessionStorage.setItem('tz-intro', '1') } catch (e) {}
  if (!seen && !calm() && !location.hash) {
    const cd = $('countdown'), b = cd && cd.querySelector('b');
    let i = 3, timer;
    const land = () => {
      clearTimeout(timer); removeEventListener('keydown', land); open.removeEventListener('pointerdown', land);
      body.classList.remove('intro'); body.classList.add('landing');
      setTimeout(() => body.classList.remove('landing'), 1700);
    };
    const tick = () => {
      if (!b) return land();
      if (i === 0) return land();
      b.textContent = 'T-' + i; b.style.animation = 'none'; void b.offsetWidth; b.style.animation = '';
      i--; timer = setTimeout(tick, 380);
    };
    body.classList.add('intro'); tick();
    addEventListener('keydown', land); open.addEventListener('pointerdown', land);
  }

  /* ---------- the masthead leans toward the cursor (one rAF per move, off when calm) ---------- */
  const mark = document.querySelector('.mark');
  if (mark && matchMedia('(pointer:fine)').matches) {
    let raf = 0, px = 0, py = 0;
    open.addEventListener('pointermove', e => {
      if (calm()) return;
      px = e.clientX / innerWidth - .5; py = e.clientY / innerHeight - .5;
      if (!raf) raf = requestAnimationFrame(() => { raf = 0; mark.style.setProperty('--px', px.toFixed(3)); mark.style.setProperty('--py', py.toFixed(3)) });
    });
    open.addEventListener('pointerleave', () => { mark.style.setProperty('--px', 0); mark.style.setProperty('--py', 0) });
  }

  /* ---------- buttons ---------- */
  const os = $('open-search');
  if (os) os.addEventListener('click', () => window.TZTOOLS ? TZTOOLS.palette() : ($('search-btn') || {}).click && $('search-btn').click());
  const ct = $('cta-travel');
  if (ct) ct.addEventListener('click', e => { e.stopPropagation(); const c = $('world-chip'); c && c.click() });

  /* ---------- worlds: counts, the portal, the tiles, the ticker ---------- */
  // what each world looks like through the Ø
  const WINDOW = {
    starchasers: 'radial-gradient(circle at 64% 30%,#fff3c4 0 5%,#ffd27a 7%,#4b3797 30%,#0b0820 76%)',
    'liminal-outliers': 'linear-gradient(#eaf5d6,#8cc63f 55%,#2f4a16)',
    deadend: 'radial-gradient(circle at 50% 86%,#ffcf8a,#ffb347 16%,#5a1d2a 52%,#0a080d)',
    overgame: 'linear-gradient(#ff8a5b,#ff3b4e 30%,#2a0a1a 66%,#050308)',
    'ai-ice': 'linear-gradient(140deg,#e6f6ff,#bfe6ff 30%,#ffcf9a 56%,#081029)',
    archive: 'radial-gradient(circle at 40% 30%,#fbefd6,#d39a5f 45%,#5a2e10)',
  };
  const NOTE = { tzero: 'The hub: devlogs, studio notes, essays' };
  const counts = fetch('/assets/search.json').then(r => r.ok ? r.json() : []).catch(() => []).then(rows => {
    const n = { tzero: 0 };
    (rows || []).forEach(r => { const k = r.w || 'tzero'; n[k] = (n[k] || 0) + 1 });
    n.tzero = (rows || []).filter(r => r.w !== 'archive').length;
    const os = document.querySelector('.os-ph b'); if (os && rows.length) os.textContent = rows.length;
    return { n, rows: rows || [] };
  });
  const hover = (a, k) => {
    if (!W) return;
    const on = () => W.preview(k), off = () => W.unpreview();
    a.addEventListener('pointerenter', on); a.addEventListener('focus', on);
    a.addEventListener('pointerleave', off); a.addEventListener('blur', off);
  };
  const plural = (n, one, many) => n + ' ' + (n === 1 ? one : many);

  Promise.all([W ? W.ready : Promise.resolve(), counts]).then(([, { n }]) => {
    const REG = (W && W.list) || {};
    const keys = ['tzero'].concat(Object.keys(REG).filter(k => k[0] !== '_' && k !== 'tzero' && !REG[k].hidden));
    const info = k => (W ? W.info(k) : { name: k, code: '', genre: '' });
    const home = k => info(k).home || '/posts/worlds/' + k;
    const status = k => n[k] ? plural(n[k], k === 'archive' ? 'letter' : 'article', k === 'archive' ? 'letters' : 'articles') : 'Docking soon';

    // the tiles: one window per world, its weather drawn by CSS (home.css .portal-tile[data-w])
    const box = $('portals');
    if (box) box.replaceChildren(...keys.map(k => {
      const I = info(k), a = el('a', 'portal-tile'); a.href = home(k); a.dataset.w = k;
      a.append(el('span', 'pc', I.code), el('span', 'pn', status(k)), el('b', '', I.name), el('small', '', NOTE[k] || I.genre || I.tagline || ''));
      a.dataset.say = 'world'; hover(a, k);
      return a;
    }));

    // the ticker: departures for every world, then round again (the copy makes the loop seamless)
    const tk = $('ticker');
    if (tk) {
      const runs = keys.map(k => {
        const a = el('a'); a.href = home(k); a.dataset.w = k; a.tabIndex = -1;
        a.append(el('i', '', info(k).code), document.createTextNode(info(k).name + ' '), el('em', '', n[k] ? 'boarding · ' + status(k) : 'docking soon'));
        hover(a, k); return a;
      });
      tk.replaceChildren(...runs, ...runs.map(a => { const c = a.cloneNode(true); hover(c, a.dataset.w); return c }));
    }

    // the Ø: a window that cycles through the worlds; click to go through
    const portal = $('portal'), win = portal && portal.querySelector('.pt-window'), name = $('portal-name');
    if (!portal) return;
    const worlds = keys.filter(k => k !== 'tzero');
    let at = -1, timer = 0, held = false, visible = true;
    const show = k => {
      portal.dataset.w = k || '';
      if (WINDOW[k]) win.style.setProperty('--pw', WINDOW[k]); else win.style.removeProperty('--pw');
      if (name) name.textContent = k ? info(k).name + (info(k).genre ? ', ' + info(k).genre.toLowerCase() : '') : 'every game Artache makes';
      portal.setAttribute('aria-label', 'Ø: open a portal to ' + (k ? info(k).name : 'every game world'));
    };
    const step = () => {
      clearTimeout(timer);
      if (held || !visible || document.hidden || calm()) return;
      at = (at + 1) % worlds.length; show(worlds[at]);
      portal.classList.remove('pulse'); void portal.offsetWidth; portal.classList.add('pulse');
      timer = setTimeout(step, 3600);
    };
    timer = setTimeout(step, seen ? 1400 : 3000);
    portal.addEventListener('pointerenter', () => { held = true; clearTimeout(timer); const k = portal.dataset.w; if (k && W) W.preview(k) });
    portal.addEventListener('pointerleave', () => { held = false; W && W.unpreview(); timer = setTimeout(step, 1800) });
    portal.addEventListener('click', () => {
      const k = portal.dataset.w;
      if (!k) { const c = $('world-chip'); return c && c.click() }
      portal.classList.add('through'); setTimeout(() => { location.href = home(k) }, calm() ? 0 : 260);
    });
    document.addEventListener('visibilitychange', () => { if (!document.hidden) step() });
    if (window.IntersectionObserver) new IntersectionObserver(e => { visible = e[0].isIntersecting; if (visible) { clearTimeout(timer); timer = setTimeout(step, 900) } }).observe(open);
  });

  /* ---------- the newest articles: three tickets up top, rows in the bento ---------- */
  const tickets = $('tickets'), rows = $('latest-rows');
  const worldOf = p => (W ? W.of(p) : '') || 'tzero';
  const code = k => (W ? W.info(k).code : '');
  const mins = p => p.minutesToRead || p.m || 0;
  const thumb = p => { const c = window.WIX && p.title && WIX.cover(p); return c && c.url ? c.url : '' };
  const fit = (url, w, h) => url.startsWith('https://static.wixstatic.com/media/') ? url.split('/v1/')[0] + '/v1/fill/w_' + w + ',h_' + h + ',al_c,q_80/pic.jpg' : url;
  const pics = fetch('/assets/card-pics.json').then(r => r.ok ? r.json() : {}).catch(() => ({}));
  const pic = (url, cls, w, h) => {
    if (!url) { const s = el('span', cls === 'tk' ? 'tk-ph' : 'rp'); s.setAttribute('aria-hidden', 'true'); return s }
    const img = el('img'); img.src = fit(url, w, h); img.alt = ''; img.loading = 'lazy'; img.decoding = 'async'; img.width = w / 2; img.height = h / 2;
    img.onerror = () => img.replaceWith(pic('', cls));
    img.onload = () => img.naturalWidth <= 120 && img.onerror();
    return img;
  };
  const meta = p => {
    const k = worldOf(p), bits = [p.c || (window.WIX ? WIX.category(p).label : '')];
    if (mins(p)) bits.push(mins(p) + ' min');
    return { k, text: bits.filter(Boolean).join(' · ') };
  };
  const say = (a, p) => { try { if (a.dataset.say === 'news') return; if (window.WIX && p.categoryIds) a.dataset.say = WIX.lineKey(p) } catch (e) {} };
  function ticket(p, url) {
    const li = el('li', 'ticket'), a = el('a'), { k, text } = meta(p), sm = el('small');
    a.href = '/post/' + p.slug; a.dataset.w = k; say(a, p);
    sm.append(el('i', '', code(k)), document.createTextNode(text));
    const t = el('span', 'tk-txt'); t.append(sm, el('b', '', p.title));
    a.append(pic(url, 'tk', 240, 168), t);
    if (k !== 'tzero') hover(a, k);
    li.append(a); return li;
  }
  function row(p, url) {
    const li = el('li', 'row'), a = el('a'), { k, text } = meta(p), sm = el('small');
    a.href = '/post/' + p.slug; a.dataset.w = k; say(a, p);
    sm.append(el('i', '', code(k)), document.createTextNode(text + (p.firstPublishedDate && window.WIX ? ' · ' + WIX.date(p.firstPublishedDate) : '')));
    const t = el('span', 'rt'); t.append(el('b', '', p.title), sm);
    a.append(pic(url, 'row', 176, 124), t);
    if (k !== 'tzero') hover(a, k);
    li.append(a); return li;
  }
  const fill = (posts, picMap) => {
    const url = p => thumb(p) || (picMap && picMap[p.slug]) || '';
    if (tickets) tickets.replaceChildren(...posts.slice(0, 3).map(p => ticket(p, url(p))));
    if (rows) { rows.replaceChildren(...posts.slice(3, 9).map(p => row(p, url(p)))); rows.removeAttribute('aria-busy') }
    pinPick();
  };
  // "Nero's pick": set on the site desk (/admin/site, window.TZSITE from scene.js); it boards first
  function pinPick() {
    if (!window.TZSITE || !tickets) return;
    Promise.resolve(window.TZSITE).then(s => {
      const k = s && s.home && s.home.pick; if (!k || !k.href || tickets.querySelector('.pick')) return;
      const li = el('li', 'ticket pick'), a = el('a'), sm = el('small'), t = el('span', 'tk-txt');
      a.href = k.href; a.dataset.w = 'tzero';
      sm.append(el('i', '', '★'), document.createTextNode(k.kick || "Nero's pick"));
      t.append(sm, el('b', '', k.cap || k.linkText || 'Read it'));
      const img = pic(k.img || '', 'tk', 240, 168); if (img.tagName === 'IMG') img.alt = k.alt || '';
      a.append(img, t); if (k.note) a.title = k.note;
      li.append(a); tickets.prepend(li);
      const all = tickets.querySelectorAll('.ticket'); if (all.length > 3) all[all.length - 1].remove();
    }).catch(() => {});
  }
  const fallback = () => counts.then(({ rows: idx }) => {
    // the nightly build didn't answer: the newest articles from the site's own index, no pictures
    const list = idx.filter(r => r.w !== 'archive').sort((a, b) => (b.d || '').localeCompare(a.d || '')).slice(0, 9)
      .map(r => ({ slug: r.s, title: r.t, m: r.m, c: r.c, world: r.w || undefined }));
    if (!list.length) {
      if (tickets) { const li = el('li', 'ticket'), a = el('a'); a.href = '/posts'; a.append(el('span', 'tk-txt', 'The newest articles are on the journal →')); li.append(a); tickets.replaceChildren(li) }
      if (rows) rows.removeAttribute('aria-busy');
      return;
    }
    fill(list, null);
  });
  if (window.WIX) Promise.all([WIX.latest(9), pics]).then(([posts, picMap]) => { if (!posts.length) throw new Error('empty'); fill(posts, picMap) }).catch(fallback);
  else fallback();

  /* ---------- continue reading, and the sticker count ---------- */
  try {
    const r = JSON.parse(localStorage.getItem('tz-resume') || 'null'), c = $('continue');
    if (r && r.slug && c) {
      c.href = '/post/' + r.slug + '#resume'; c.removeAttribute('data-say'); c.classList.add('resume');
      c.querySelector('.tk').textContent = 'Continue reading';
      c.querySelector('b').textContent = r.title || 'Where you left off';
      c.querySelector('b + span').textContent = Math.round((r.p || 0) * 100) + '% read. Your place is saved in this browser, nowhere else.';
      c.querySelector('.go').textContent = 'Pick up where you stopped →';
      c.style.setProperty('--done', Math.round((r.p || 0) * 100) + '%');
    }
  } catch (e) {}
  const stickers = () => {
    const s = $('stickers-n'); if (!s || !window.TZSAVE) return;
    const n = TZSAVE.count(), all = TZSAVE.STICKERS.length;
    s.textContent = n ? n + ' of ' + all + ' stickers found' : all + ' stickers hidden';
  };
  if (window.TZSAVE) stickers(); else addEventListener('tz:save-ready', stickers, { once: true });
})();
