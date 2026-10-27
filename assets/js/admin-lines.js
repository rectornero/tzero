/* /admin/lines: Ache's script editor, for Nero only. It starts from /assets/lines.json (every set Ache can say) and
   lays Nero's saved draft on top. Only the sets he touches are saved, through /api/admin/lines (content.mjs);
   Publish puts them live at once, no deploy: scene.js reads /api/lines over lines.json.
   Lines are plain text everywhere (the site only puts them in textContent). */
(() => {
  const $ = id => document.getElementById(id);
  const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e };

  // Where each set shows up. "fixed" sets have one line per moment, in order: edit the words, keep the count.
  const G = { home: 'Around the site', pages: 'Other pages', moves: 'Moves and moods', chat: 'Chat (click to catch him)', fight: 'Fight', news: 'The UNITE news scene', other: 'Other sets' };
  const TOPICS = {
    cover: [G.home, 'Home: the Liminal Outliers polaroid'], save: [G.home, 'Home: the "first save" polaroid'],
    devlog: [G.home, 'Home: Devlog cassette'], studio: [G.home, 'Home: Studio cassette'], archive: [G.home, 'Home: Archive cassette'],
    motto: [G.home, 'Home: the motto "With AI. By People."'], unite: [G.home, 'Home: the Pokémon UNITE card (after the news scene)'],
    artache: [G.home, 'Home: the Artache card'], story: [G.home, 'Home story band and the /story page'], proud: [G.home, 'Bragging about Artache, at random and on studio things'],
    grief: [G.home, 'Mood lines while the news is sad'], miriam: [G.home, 'Not on any page yet'],
    'season-sea': [G.home, 'Summer skin (sea): now and then'], 'season-autumn': [G.home, 'Autumn skin: now and then'],
    'season-winter': [G.home, 'Winter skin: now and then'], 'season-spring': [G.home, 'Spring skin: now and then'],
    'post-studio': [G.pages, 'Post pages: links to Studio articles'], 'post-devlog': [G.pages, 'Post pages: links to Devlog articles'],
    'post-archive': [G.pages, 'Post pages: links to Archive articles'], heading: [G.pages, 'Post pages: section headings'], image: [G.pages, 'Post pages: cover image'],
    loop: [G.pages, '/story: the gacha-loop saves'], banner: [G.pages, '/story: the banner card'], shelf: [G.pages, '/story: the tape shelf'],
    slot: [G.pages, '/story: the slot'], receipt: [G.pages, '/story: the receipt of what the loop cost'],
    'src-who': [G.pages, '/redache source: who he is'], 'src-home': [G.pages, '/redache source: home'], 'src-body': [G.pages, '/redache source: body'],
    'src-power': [G.pages, '/redache source: powers'], 'src-fight': [G.pages, '/redache source: fight'], 'src-visit': [G.pages, '/redache source: visits'],
    'src-lines': [G.pages, '/redache source: lines'], 'src-term': [G.pages, '/redache: the terminal'],
    sass: [G.moves, 'When he dodges your cursor'], trip: [G.moves, 'When he trips on his thread and falls'],
    recharge: [G.moves, 'When your arrow runs low and he sends a spark (computer only)'],
    stake: [G.moves, 'While staked to the page'], sleep: [G.moves, 'Waking up in his bed'], memories: [G.moves, 'Click on the background: floating memories'],
    'chat-caught': [G.chat, 'When you catch him (he adds "What\'s up?")'], 'chat-treat': [G.chat, '"Want a treat?"'], 'chat-secrets': [G.chat, '"Tell me a secret", in order'],
    'therapy-open': [G.chat, 'Therapy with the mouse: openers'], 'therapy-feel': [G.chat, 'Therapy: "How does that make you feel?"'],
    'fight-start': [G.fight, 'Fight: start'], 'fight-hurt': [G.fight, 'Fight: when you hit him'], 'fight-taunt': [G.fight, 'Fight: taunts'],
    'fight-low': [G.fight, 'Fight: low on health'], 'fight-win': [G.fight, 'Fight: you win'], 'fight-lose': [G.fight, 'Fight: you lose'],
    'fight-pat': [G.fight, 'Fight: attack names, one per attack', 1], 'fight-pickups': [G.fight, 'Fight: power-ups, in order: pod, shield, heart, laser, purge', 1],
    'news-scene': [G.news, 'The breakdown, line by line in order (the last two are when he plugs you back in)', 1],
    'unplug-talk': [G.news, 'The talk in the dark: his line, then two of "your reply → his answer". Keep the → in replies.', 1],
    'breakdown-errors': [G.news, 'Error pop-ups'],
  };
  const ORDER = Object.values(G);

  let base = {}, topics = {}, touched = new Set(), published = null, savedAt = null, dirty = false, q = '';

  async function api(path, opts = {}) {
    const r = await fetch(path, { credentials: 'same-origin', ...opts, headers: { 'x-tz': '1', ...(opts.body ? { 'Content-Type': 'application/json' } : {}) } });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) { const e = new Error((j.details || [j.error || r.status]).join(', ')); e.status = r.status; throw e }
    return j;
  }
  const status = (t, bad) => { const s = $('status'); s.textContent = t; s.classList.toggle('bad', Boolean(bad)) };
  function gate(msg) { $('gate').hidden = false; $('app').hidden = true; $('gate-msg').textContent = msg }

  const meta = k => TOPICS[k] || [G.other, ''];
  const fresh = k => (base[k] || []).map(t => ({ t }));
  const isNew = (k, l) => !(base[k] || []).includes(l.t);
  const liveOf = k => published && published.lines && published.lines[k];

  function mark(k) { touched.add(k); dirty = true; $('save').disabled = $('publish').disabled = false; summary() }
  function summary() {
    const n = touched.size;
    $('count').textContent = n ? n + (n === 1 ? ' set changed' : ' sets changed') : 'No changes yet';
    status(dirty ? 'Unsaved changes' : savedAt ? 'Draft saved ' + new Date(savedAt).toLocaleString() : '');
  }

  function render() {
    const nav = $('nav'), main = $('main');
    nav.replaceChildren(); main.replaceChildren();
    const keys = Object.keys(topics).sort((a, b) => ORDER.indexOf(meta(a)[0]) - ORDER.indexOf(meta(b)[0]));
    let group = '', shown = 0;
    for (const k of keys) {
      const t = topics[k], [g, where, fixed] = meta(k);
      const rows = t.lines.map((l, i) => [l, i]).filter(([l]) => !q || l.t.toLowerCase().includes(q) || (l.note || '').toLowerCase().includes(q));
      if (q && !rows.length) continue;
      shown++;
      if (g !== group) { group = g; nav.append(el('h3', '', g)) }
      const a = el('a'); a.href = '#set-' + k; a.append(k, el('span', touched.has(k) ? 'ch' : '', (touched.has(k) ? '• ' : '') + t.lines.filter(l => !l.off).length));
      nav.append(a);

      const sec = el('section', 'al-set'); sec.id = 'set-' + k;
      const head = el('div', 'al-sh'); head.append(el('h2', '', k), el('p', '', where));
      if (touched.has(k)) {
        const reset = el('button', 'ad-link', 'Back to the original'); reset.type = 'button';
        reset.onclick = () => { topics[k] = { lines: fresh(k) }; touched.delete(k); dirty = true; $('save').disabled = $('publish').disabled = false; render(); summary() };
        head.append(reset);
      }
      if (liveOf(k)) head.append(el('span', 'ad-chip', 'Your version is live'));
      sec.append(head);
      const tn = el('textarea', 'al-note'); tn.rows = 1; tn.value = t.note || ''; tn.placeholder = 'Your thoughts on this set, for Claude (tone, what\'s missing, what to cut)…';
      tn.oninput = () => { t.note = tn.value; mark(k) };
      sec.append(tn);
      const ol = el('ol');
      for (const [l, i] of rows) {
        const li = el('li', (l.off ? 'off ' : '') + (isNew(k, l) ? 'ed' : ''));
        const tx = el('div', 't'); tx.contentEditable = 'plaintext-only'; tx.spellcheck = true; tx.textContent = l.t;
        tx.oninput = () => { l.t = tx.textContent.replace(/\s*\n\s*/g, ' '); li.classList.toggle('ed', isNew(k, l)); mark(k) };
        const acts = el('span', 'acts');
        if (!fixed) {
          const mute = el('button', '', l.off ? 'Use again' : 'Mute'); mute.type = 'button';
          mute.onclick = () => { l.off = !l.off; if (!t.lines.some(x => !x.off && x.t.trim())) { l.off = false; return status('Keep at least one line in a set', true) } mark(k); render() };
          acts.append(mute);
        }
        const nb = el('button', '', l.note ? 'Note' : '+ Note'); nb.type = 'button';
        nb.onclick = () => { if (l.note == null) l.note = ''; l.open = 1; render(); const n = document.querySelector('#set-' + CSS.escape(k) + ' li[data-i="' + i + '"] textarea'); if (n) n.focus() };
        acts.append(nb);
        li.dataset.i = i;
        li.append(el('span', 'n', String(i + 1)), tx, acts);
        if (l.note || l.open) {
          const n = el('textarea'); n.rows = 1; n.value = l.note || ''; n.placeholder = 'Note on this line…';
          n.oninput = () => { l.note = n.value; mark(k) };
          li.append(n);
        }
        ol.append(li);
      }
      sec.append(ol);
      if (!fixed && !q) {
        const add = el('button', 'btn ghost small', '+ Add a line'); add.type = 'button';
        add.onclick = () => { t.lines.push({ t: '' }); mark(k); render(); const all = document.querySelectorAll('#set-' + CSS.escape(k) + ' .t'); all[all.length - 1].focus() };
        sec.append(add);
      }
      main.append(sec);
    }
    if (!shown) main.append(el('p', 'al-empty', 'No line matches that search.'));
  }

  // Only the touched sets travel, without empty lines or the editor's own flags
  function book() {
    const out = {};
    for (const k of touched) out[k] = { lines: topics[k].lines.filter(l => l.t.trim()).map(l => ({ t: l.t.trim(), ...(l.off ? { off: true } : {}), ...(l.note ? { note: l.note } : {}) })), ...(topics[k].note ? { note: topics[k].note } : {}) };
    return { topics: out };
  }
  async function save(publish) {
    const bad = [...touched].find(k => meta(k)[2] && topics[k].lines.filter(l => l.t.trim()).length !== (base[k] || []).length);
    if (bad) return status('"' + bad + '" needs one line per moment, like the original. Fill the empty one in.', true);
    $('save').disabled = $('publish').disabled = true; status(publish ? 'Publishing…' : 'Saving…');
    try {
      const r = await api('/api/admin/lines', { method: 'PUT', body: JSON.stringify({ book: book(), publish }) });
      savedAt = r.savedAt; dirty = false;
      if (publish) published = { lines: Object.fromEntries(Object.entries(book().topics).map(([k, t]) => [k, t.lines.filter(l => !l.off).map(l => l.t)])) };
      summary(); status(publish ? 'Live. Ache says the new lines on the next page he visits.' : 'Draft saved. Publish when you\'re happy.');
      render();
    } catch (e) { $('save').disabled = $('publish').disabled = false; status('Not saved: ' + e.message, true) }
  }

  async function load() {
    let mine;
    try {
      [base, mine] = await Promise.all([fetch('/assets/lines.json', { cache: 'no-store' }).then(r => r.json()), api('/api/admin/lines')]);
    } catch (e) {
      if (e.status === 401) return gate('Sign in with GitHub first, then come back here.');
      if (e.status === 403) return gate('Ache\'s lines are Nero\'s. This page is his.');
      return gate('Couldn\'t load the lines: ' + e.message);
    }
    published = mine.published;
    const d = mine.draft && mine.draft.topics || {};
    for (const k of Object.keys(base)) topics[k] = d[k] ? { ...d[k], lines: d[k].lines.map(l => ({ ...l })) } : { lines: fresh(k) };
    for (const k of Object.keys(d)) if (!topics[k]) topics[k] = d[k];
    touched = new Set(Object.keys(d));
    savedAt = mine.draft && mine.draft.savedAt;
    $('gate').hidden = true; $('app').hidden = false;
    $('save').disabled = $('publish').disabled = !touched.size;
    render(); summary();
    if (published && published.at) $('live').textContent = 'Last published ' + new Date(published.at).toLocaleString();
  }

  $('save').onclick = () => save(false);
  $('publish').onclick = () => save(true);
  let qt; $('q').oninput = e => { clearTimeout(qt); qt = setTimeout(() => { q = e.target.value.trim().toLowerCase(); render() }, 200) };
  addEventListener('beforeunload', e => { if (dirty) e.preventDefault() });
  // The bar with Save and Publish sticks right under the site header, whatever its height
  const fit = () => document.documentElement.style.setProperty('--al-top', document.querySelector('.ad-top').offsetHeight + 'px');
  new ResizeObserver(fit).observe(document.querySelector('.ad-top')); fit();
  load();
})();
