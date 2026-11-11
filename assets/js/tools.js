/* Reader tools: everything runs in the reader's browser (no server, no AI calls, no credits).
   - Search palette: "/" or Ctrl/Cmd+K, or the header's search button. Finds articles (assets/search.json plus the
     newest live ones), pages, game worlds and actions, all from the keyboard.
   - Article dock: time left, read aloud (the browser's own voice), focus mode, text size, bookmark, back to top.
   - Continue reading and bookmarks live in the reader's browser only (localStorage), like the save file.
   Shortcuts: / search · f focus · l listen · + and - text size · b bookmark · ? help. */
(() => {
  const root = document.documentElement;
  const isPost = /^\/(post|p)\//.test(location.pathname);
  const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e };
  const ls = {
    get(k, d) { try { const v = JSON.parse(localStorage.getItem(k)); return v == null ? d : v } catch (e) { return d } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)) } catch (e) {} },
  };
  const WNAME = k => (window.TZW && TZW.info(k).name) || k;

  /* ---------- reading preferences: text size and focus, remembered ---------- */
  const SIZES = [.9, 1, 1.12, 1.25, 1.4];
  let size = ls.get('tz-size', 1);
  const applySize = () => root.style.setProperty('--read-scale', SIZES[size] || 1);
  applySize();
  const setFocus = on => { root.toggleAttribute('data-focus', on); ls.set('tz-focus', on); sync() };
  if (ls.get('tz-focus', false) && isPost) root.setAttribute('data-focus', '');

  /* ---------- bookmarks and continue reading ---------- */
  const marks = () => ls.get('tz-marks', []);
  const here = () => ({ slug: location.pathname.replace(/^\/(post|p)\//, ''), title: document.title.replace(/ · TZERØ$/, ''), world: root.dataset.world || '' });
  function toggleMark() {
    const h = here(), m = marks(), i = m.findIndex(x => x.slug === h.slug);
    if (i >= 0) m.splice(i, 1); else m.unshift({ ...h, at: Date.now() });
    ls.set('tz-marks', m.slice(0, 50)); sync();
    toast(i >= 0 ? 'Bookmark removed' : 'Bookmarked. Find it with / any time.');
  }
  const progress = () => { const s = document.querySelector('.post-sheet'); if (!s) return 0; const r = s.getBoundingClientRect(); return Math.max(0, Math.min(1, (innerHeight * .4 - r.top) / Math.max(1, r.height - innerHeight * .6))) };
  let saveT = 0;
  if (isPost) addEventListener('scroll', () => {
    clearTimeout(saveT);
    saveT = setTimeout(() => { const p = progress(); if (p > .05 && p < .97) ls.set('tz-resume', { ...here(), p, y: scrollY, at: Date.now() }); else if (p >= .97) { const r = ls.get('tz-resume'); if (r && r.slug === here().slug) localStorage.removeItem('tz-resume') } }, 400);
  }, { passive: true });

  /* ---------- toast ---------- */
  let toastEl;
  function toast(t) {
    if (!toastEl) { toastEl = el('div', 'tz-toast'); toastEl.setAttribute('role', 'status'); document.body.appendChild(toastEl) }
    toastEl.textContent = t; toastEl.classList.add('on'); clearTimeout(toastEl._t); toastEl._t = setTimeout(() => toastEl.classList.remove('on'), 2200);
  }

  /* ---------- read aloud: the browser's own speech, paragraph by paragraph, the current one highlighted ---------- */
  const synth = window.speechSynthesis;
  let reading = null;
  function listen() {
    if (!synth) { toast('This browser has no voice to read with.'); return }
    if (reading) { synth.cancel(); stopListen(); return }
    const body = document.querySelector('.post-body'); if (!body) return;
    const paras = [...body.querySelectorAll('h2,h3,p,li,blockquote')].filter(n => n.textContent.trim().length > 1 && !n.closest('li p'));
    const startAt = Math.max(0, paras.findIndex(n => n.getBoundingClientRect().bottom > innerHeight * .25));
    reading = { paras, i: startAt };
    const voice = (synth.getVoices() || []).find(v => /^en(-GB)?/i.test(v.lang) && /natural|neural|google|daniel|serena/i.test(v.name)) || (synth.getVoices() || []).find(v => /^en/i.test(v.lang));
    const next = () => {
      if (!reading) return;
      document.querySelectorAll('.tz-speaking').forEach(n => n.classList.remove('tz-speaking'));
      const n = reading.paras[reading.i++]; if (!n) { stopListen(); return }
      n.classList.add('tz-speaking'); n.scrollIntoView({ block: 'center', behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
      const u = new SpeechSynthesisUtterance(n.textContent.trim()); if (voice) u.voice = voice; u.lang = (voice && voice.lang) || 'en-GB'; u.rate = 1.02;
      u.onend = next; u.onerror = () => stopListen();
      synth.speak(u);
    };
    next(); sync();
  }
  function stopListen() { reading = null; document.querySelectorAll('.tz-speaking').forEach(n => n.classList.remove('tz-speaking')); sync() }
  addEventListener('pagehide', () => synth && synth.cancel());

  /* ---------- the article dock ---------- */
  let dock;
  const ICON = {
    listen: '<path d="M4 9v6h4l5 4V5L8 9z"/><path d="M16 8.5a5 5 0 0 1 0 7M18.5 6a8.5 8.5 0 0 1 0 12"/>',
    stop: '<rect x="6" y="6" width="12" height="12" rx="2"/>',
    focus: '<path d="M4 9V5h4M20 9V5h-4M4 15v4h4M20 15v4h-4"/><circle cx="12" cy="12" r="2.5"/>',
    mark: '<path d="M7 4h10v16l-5-4-5 4z"/>',
    up: '<path d="M12 19V5M6 11l6-6 6 6"/>',
    search: '<circle cx="11" cy="11" r="6"/><path d="M20 20l-4.5-4.5"/>',
  };
  const svg = k => '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">' + ICON[k] + '</svg>';
  function btn(k, label, fn, key) { const b = el('button', 'dk-btn'); b.type = 'button'; b.dataset.k = k; b.innerHTML = svg(k); b.title = label + (key ? '  (' + key + ')' : ''); b.setAttribute('aria-label', label); b.onclick = fn; return b }
  function buildDock() {
    dock = el('div', 'dock'); dock.setAttribute('role', 'toolbar'); dock.setAttribute('aria-label', 'Reading tools');
    const left = el('span', 'dk-left'); left.setAttribute('aria-live', 'off');
    const ring = el('span', 'dk-ring'); ring.innerHTML = '<svg viewBox="0 0 36 36" aria-hidden="true"><circle cx="18" cy="18" r="15" class="bg"/><circle cx="18" cy="18" r="15" class="fg"/></svg>';
    const time = el('span', 'dk-time', '');
    left.append(ring, time);
    const sm = el('button', 'dk-btn dk-a', 'A−'); sm.type = 'button'; sm.title = 'Smaller text  (-)'; sm.onclick = () => resize(-1);
    const lg = el('button', 'dk-btn dk-a dk-a2', 'A+'); lg.type = 'button'; lg.title = 'Larger text  (+)'; lg.onclick = () => resize(1);
    dock.append(left, el('i', 'dk-sep'), btn('listen', 'Read aloud', listen, 'L'), btn('focus', 'Focus mode', () => setFocus(!root.hasAttribute('data-focus')), 'F'), sm, lg, btn('mark', 'Bookmark', toggleMark, 'B'), el('i', 'dk-sep'), btn('search', 'Search everything', () => palette(), '/'), btn('up', 'Back to top', () => scrollTo({ top: 0, behavior: 'smooth' })));
    document.body.appendChild(dock);
    document.body.appendChild(el('div', 'read-bar'));
    const tick = () => {
      const p = progress(), body = document.querySelector('.post-body');
      const words = body ? (body._w || (body._w = (body.textContent.match(/\S+/g) || []).length)) : 0;
      const mins = Math.ceil(words * (1 - p) / 230);
      time.textContent = p >= .97 ? 'Finished' : mins <= 1 ? 'Under a minute left' : mins + ' min left';
      ring.querySelector('.fg').style.strokeDashoffset = (94.25 * (1 - p)).toFixed(1);
      dock.classList.toggle('hide', scrollY < 160 && !reading);
      root.style.setProperty('--read-p', p.toFixed(3));
    };
    addEventListener('scroll', tick, { passive: true }); setInterval(tick, 3000); tick();
    sync();
  }
  function resize(d) { size = Math.max(0, Math.min(SIZES.length - 1, size + d)); ls.set('tz-size', size); applySize(); toast('Text size ' + Math.round(SIZES[size] * 100) + '%') }
  function sync() {
    if (!dock) return;
    const l = dock.querySelector('[data-k=listen]'); if (l) { l.innerHTML = svg(reading ? 'stop' : 'listen'); l.setAttribute('aria-pressed', !!reading); l.title = reading ? 'Stop reading (L)' : 'Read aloud (L)' }
    const f = dock.querySelector('[data-k=focus]'); if (f) f.setAttribute('aria-pressed', root.hasAttribute('data-focus'));
    const m = dock.querySelector('[data-k=mark]'); if (m) m.setAttribute('aria-pressed', marks().some(x => x.slug === here().slug));
  }
  // Next stop: at the end of an article, the next one in the same world (older first, like the next station down the line)
  function nextStop() {
    const foot = document.querySelector('.post-sheet .post-foot'); if (!foot || document.querySelector('.next-stop')) return;
    const slug = here().slug, w = root.dataset.world || '';
    load().then(rows => {
      const same = rows.filter(r => (r.w || '') === w);
      const i = same.findIndex(r => r.s === slug);
      const pick = (i >= 0 && same[i + 1]) || same.find(r => r.s !== slug) || rows.find(r => r.s !== slug);
      if (!pick) return;
      const a = el('a', 'next-stop'); a.href = '/post/' + pick.s; if (w) a.dataset.world = w;
      a.append(el('span', 'ns-kick', w ? 'Next stop in ' + WNAME(w) : 'Next stop'), el('b', '', pick.t), el('span', 'ns-sub', (pick.e || '').split(/(?<=[.!?])\s/)[0]), el('span', 'ns-go', 'Keep travelling →'));
      foot.before(a);
    });
  }
  if (isPost) {
    const wait = setInterval(() => { if (document.querySelector('.post-sheet .post-body')) { clearInterval(wait); buildDock(); nextStop() } }, 300);
    setTimeout(() => clearInterval(wait), 20000);
  }

  /* ---------- the search palette ---------- */
  let index = null, pal = null;
  const PAGES = [
    ['The story so far', '/story', 'Eleven save points, 2017 to now'], ['Characters', '/characters', 'The cast across Artache worlds'],
    ['Idea Lab', '/lab', 'One small toy per Artache game'], ['Scrapbook', '/scrapbook', "Ache's stickers and your save file"],
    ['Statement of Conduct', '/conduct', 'How Artache makes games'], ['Artache Creative Studio', '/studio', 'The studio behind TZERØ'],
    ['Starchasers', '/starchasers', 'The space-fantasy RPG'], ['Where Ache lives', '/redache', "Ache's own page"], ['All posts', '/posts', 'Everything, newest first'],
  ];
  function load() {
    if (index) return index;
    const saved = fetch('/assets/search.json').then(r => r.ok ? r.json() : []).catch(() => []);
    const live = window.WIX && WIX.ownPosts ? WIX.ownPosts().catch(() => []) : Promise.resolve([]);
    return index = Promise.all([saved, live]).then(([rows, own]) => {
      const seen = new Set(rows.map(r => r.s));
      own.forEach(p => { if (!seen.has(p.slug)) rows.unshift({ s: p.slug, t: p.title, e: p.excerpt || '', c: WIX.category(p).label, w: window.TZW ? TZW.of(p) : '', d: (p.firstPublishedDate || '').slice(0, 10) }) });
      return rows;
    });
  }
  const norm = s => (s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  function score(q, text) {
    const t = norm(text); if (!q) return 1;
    let total = 0;
    for (const w of q.split(/\s+/).filter(Boolean)) {
      const i = t.indexOf(w);
      if (i < 0) { // letters in order (typo-tolerant-ish)
        let j = 0, k = 0; while (j < t.length && k < w.length) { if (t[j] === w[k]) k++; j++ }
        if (k < w.length || w.length < 3) return 0; total += 1;
      } else total += (i === 0 || /\W/.test(t[i - 1]) ? 6 : 3) + (w.length > 3 ? 1 : 0);
    }
    return total;
  }
  function actions() {
    const a = [];
    const r = ls.get('tz-resume'); if (r) a.push({ kind: 'Continue', title: r.title, sub: Math.round(r.p * 100) + '% read' + (r.world ? ' · ' + WNAME(r.world) : ''), go: () => { location.href = '/post/' + r.slug + '#resume' } });
    marks().slice(0, 6).forEach(m => a.push({ kind: 'Bookmark', title: m.title, sub: m.world ? WNAME(m.world) : 'TZERØ', go: () => { location.href = '/post/' + m.slug } }));
    return a;
  }
  function commands() {
    const c = [
      { kind: 'Tool', title: 'Surprise me: a random article', sub: 'from anywhere in the journal', go: () => load().then(rows => { const p = rows[Math.floor(Math.random() * rows.length)]; location.href = '/post/' + p.s }) },
      { kind: 'Tool', title: 'Open the atlas', sub: 'every game world, with your passport', go: () => { close(); const ch = document.getElementById('world-chip'); ch && ch.click() } },
      { kind: 'Tool', title: 'Change the motion', sub: 'auto, light or still background', go: () => { close(); const m = document.getElementById('motion'); m && m.click() } },
      { kind: 'Tool', title: 'Sound on or off', sub: 'the soundtrack made live in your browser', go: () => { close(); const m = document.getElementById('snd'); m && m.click() } },
    ];
    if (isPost) c.unshift(
      { kind: 'Tool', title: reading ? 'Stop reading aloud' : 'Read this article aloud', sub: 'the browser’s own voice · L', go: () => { close(); listen() } },
      { kind: 'Tool', title: root.hasAttribute('data-focus') ? 'Leave focus mode' : 'Focus mode', sub: 'just the words, scenery dimmed · F', go: () => { close(); setFocus(!root.hasAttribute('data-focus')) } },
      { kind: 'Tool', title: 'Bookmark this article', sub: 'kept in your browser · B', go: () => { close(); toggleMark() } },
      { kind: 'Tool', title: 'Copy a link to this article', sub: 'tzero.live address', go: () => { close(); navigator.clipboard && navigator.clipboard.writeText('https://tzero.live' + location.pathname).then(() => toast('Link copied')) } });
    return c;
  }
  function palette() {
    if (pal) { close(); return }
    pal = el('div', 'pal-wrap');
    const box = el('div', 'pal'); box.setAttribute('role', 'dialog'); box.setAttribute('aria-label', 'Search TZERØ');
    const top = el('div', 'pal-top');
    const input = el('input', 'pal-in'); input.type = 'search'; input.placeholder = 'Search articles, worlds, pages and tools…'; input.setAttribute('aria-label', 'Search'); input.autocomplete = 'off';
    const hint = el('kbd', 'pal-esc', 'esc');
    top.innerHTML = svg('search'); top.append(input, hint);
    const chips = el('div', 'pal-chips');
    const list = el('ol', 'pal-list'); list.setAttribute('role', 'listbox');
    const foot = el('div', 'pal-foot', '↑↓ to move · enter to open · in a world? its articles come first');
    box.append(top, chips, list, foot); pal.append(box); document.body.append(pal);
    pal.addEventListener('pointerdown', e => { if (e.target === pal) close() });
    let filter = '', sel = 0, items = [];
    const worlds = () => window.TZW ? Object.entries(TZW.list).filter(([, W]) => !W.hidden) : [];
    worlds().forEach(([k, W]) => {
      const b = el('button', 'pal-chip'); b.type = 'button'; b.dataset.w = k; b.textContent = W.name;
      b.onclick = () => { filter = filter === k ? '' : k; chips.querySelectorAll('.pal-chip').forEach(c => c.setAttribute('aria-pressed', c.dataset.w === filter)); render(); input.focus() };
      chips.append(b);
    });
    function render() {
      const q = norm(input.value.trim());
      load().then(rows => {
        const cur = root.dataset.world || '';
        const arts = rows.filter(r => !filter || (r.w || 'tzero') === filter).map(r => ({ r, sc: score(q, r.t + ' ' + r.e + ' ' + r.c + ' ' + (r.w ? WNAME(r.w) : '')) * 2 + score(q, r.t) * 3 + (r.w && r.w === cur ? 2 : 0) }))
          .filter(x => x.sc > 0).sort((a, b) => b.sc - a.sc || b.r.d.localeCompare(a.r.d)).slice(0, q ? 12 : 6)
          .map(({ r }) => ({ kind: r.w ? WNAME(r.w) : r.c, w: r.w || 'tzero', title: r.t, sub: r.c + ' · ' + (r.d ? new Date(r.d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '') + (r.m ? ' · ' + r.m + ' min' : ''), href: '/post/' + r.s }));
        const wl = filter ? [] : worlds().filter(([k, W]) => score(q, W.name + ' ' + W.genre + ' ' + W.code)).slice(0, q ? 4 : 0).map(([k, W]) => ({ kind: 'World', w: k, title: 'Travel to ' + W.name, sub: W.genre, href: W.home || '/posts/worlds/' + k }));
        const pg = filter || !q ? [] : PAGES.filter(p => score(q, p[0] + ' ' + p[2])).slice(0, 4).map(p => ({ kind: 'Page', title: p[0], sub: p[2], href: p[1] }));
        const tools = filter ? [] : commands().filter(c => !q || score(q, c.title + ' ' + c.sub)).slice(0, q ? 4 : 3);
        const resume = q || filter ? [] : actions();
        items = [...resume, ...arts, ...wl, ...pg, ...tools];
        list.replaceChildren(...items.map((it, i) => {
          const li = el('li'), a = el('a', 'pal-item'); a.setAttribute('role', 'option'); if (it.href) a.href = it.href; a.dataset.i = i;
          if (it.w) a.dataset.w = it.w;
          a.append(el('span', 'pal-kind', it.kind));
          const t = el('span', 'pal-txt'); t.append(el('b', '', it.title), el('small', '', it.sub || '')); a.append(t);
          a.onclick = e => { if (it.go) { e.preventDefault(); it.go() } };
          a.onpointermove = () => { sel = i; mark() };
          li.append(a); return li;
        }));
        if (!items.length) list.append(el('li', 'pal-none', 'Nothing yet. Try fewer words, or a game’s name.'));
        sel = 0; mark();
      });
    }
    function mark() { list.querySelectorAll('.pal-item').forEach((a, i) => a.setAttribute('aria-selected', i === sel)); const a = list.querySelector('[aria-selected=true]'); a && a.scrollIntoView({ block: 'nearest' }) }
    input.addEventListener('input', render);
    input.addEventListener('keydown', e => {
      if (e.key === 'ArrowDown') { sel = Math.min(items.length - 1, sel + 1); mark(); e.preventDefault() }
      else if (e.key === 'ArrowUp') { sel = Math.max(0, sel - 1); mark(); e.preventDefault() }
      else if (e.key === 'Enter') { const a = list.querySelector('[aria-selected=true]'); if (a) { e.preventDefault(); a.click() } }
      else if (e.key === 'Escape') close();
    });
    render(); setTimeout(() => input.focus(), 10);
  }
  function close() { if (pal) { pal.remove(); pal = null } }

  /* ---------- keys ---------- */
  function help() {
    toast('/ search · F focus · L listen · + − text size · B bookmark · Esc close');
  }
  addEventListener('keydown', e => {
    const typing = /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName) || e.target.isContentEditable;
    if ((e.key === 'k' && (e.metaKey || e.ctrlKey)) || (!typing && e.key === '/')) { e.preventDefault(); palette(); return }
    if (typing || e.metaKey || e.ctrlKey || e.altKey) return;
    if (e.key === 'Escape' && pal) close();
    else if (e.key === '?') help();
    else if (isPost && (e.key === 'f' || e.key === 'F')) setFocus(!root.hasAttribute('data-focus'));
    else if (isPost && (e.key === 'l' || e.key === 'L')) listen();
    else if (isPost && (e.key === 'b' || e.key === 'B')) toggleMark();
    else if (isPost && (e.key === '+' || e.key === '=')) resize(1);
    else if (isPost && (e.key === '-' || e.key === '_')) resize(-1);
  });
  const sb = document.getElementById('search-btn'); if (sb) sb.addEventListener('click', () => palette());

  // Continue reading: a link from the palette lands where the reader left off
  if (isPost && location.hash === '#resume') {
    const r = ls.get('tz-resume');
    const go = setInterval(() => { if (document.querySelector('.post-sheet .post-body')) { clearInterval(go); if (r && r.slug === here().slug) { const s = document.querySelector('.post-sheet').getBoundingClientRect(); scrollTo({ top: scrollY + s.top + (s.height - innerHeight * .6) * r.p - innerHeight * .4 }); toast('Welcome back. Picking up at ' + Math.round(r.p * 100) + '%.') } history.replaceState(null, '', location.pathname) } }, 300);
    setTimeout(() => clearInterval(go), 15000);
  }

  window.TZTOOLS = { palette, toast, listen };
})();
