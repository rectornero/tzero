/* Redache's page: the page's own real source rendered as an editor, with live values, Ache's lines and a small terminal.
   Ache's story is written as real comments in redache.html, so the browser's View source tells it too. */
(() => {
  const code = document.getElementById('code');
  const ACHE = window.ACHE || {};
  let SOURCE = '';
  const root = document.documentElement;
  const slot = document.getElementById('slot');
  const snd = document.getElementById('snd');
  const still = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const esc = s => s.replace(/[&<>]/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[ch]);

  /* Syntax colours: one pass over the whole text (block comments span lines), then split into lines */
  const TOKEN = new RegExp([
    /(<!--[\s\S]*?-->|\/\*[\s\S]*?\*\/|\/\/[^\n]*)/,                         // 1 comment
    /("(?:[^"\\\n]|\\.)*"|'(?:[^'\\\n]|\\.)*')/,                             // 2 string
    /(<!?\/?[a-zA-Z][\w-]*|\/?>)/,                                          // 3 tag
    /(#[0-9a-fA-F]{6}\b|#[0-9a-fA-F]{3}\b)/,                                 // 4 colour
    /(#[a-zA-Z][\w-]*(?::[\w-]+)?)/,                                         // 5 selector
    /(\b(?:const|let|function|return|if|async|await|throw|new|true|false|null|Infinity)\b)/, // 6 keyword
    /(\b\d[\d.,]*(?:px|s|€)?)/,                                              // 7 number
    /([\w-]+(?==))/,                                                         // 8 attribute
    /([a-zA-Z_-][\w-]*(?=\s*:(?!:)))/,                                       // 9 property
    /([a-zA-Z_$][\w$]*(?=\())/,                                              // 10 call
  ].map(r => r.source).join('|'), 'g');
  const CLS = [, 'cm', 'st', 'tg', 'hx', 'sel', 'kw', 'nu', 'at', 'pr', 'fn'];

  function highlight(text) {
    const out = []; let last = 0, m;
    TOKEN.lastIndex = 0;
    while ((m = TOKEN.exec(text))) {
      if (m.index > last) out.push(['', text.slice(last, m.index)]);
      const g = m.findIndex((v, i) => i && v !== undefined);
      out.push([CLS[g], m[0]]);
      last = TOKEN.lastIndex;
    }
    if (last < text.length) out.push(['', text.slice(last)]);
    // split tokens on newlines into rows of HTML
    const rows = [[]];
    out.forEach(([c, t]) => t.split('\n').forEach((part, i) => {
      if (i) rows.push([]);
      if (!part) return;
      let h = esc(part);
      if (c === 'hx') h = '<u class="sw" style="--c:' + part + '">' + h + '</u>';
      if (c === 'cm') h = h.replace('◉', '<b class="eye">◉</b>').replace(/\bAche\b|\bRedache\b/g, '<b class="me">$&</b>');
      if (c === 'st') h = h.replace(/\bAche\b|\bRedache\b/g, '<b class="me">$&</b>');
      rows[rows.length - 1].push(c ? '<span class="' + c + '">' + h + '</span>' : h);
    }));
    return rows.map(r => r.join(''));
  }

  /* Each numbered section is a block Ache can visit; blame says who wrote it */
  const BLOCKS = {
    top: ['src-home', 'Ache · uncommitted'], who: ['src-who', 'Nero · 25 Oct'], body: ['src-body', 'Claude · 25 Oct'],
    mind: ['sass', 'Ache · uncommitted'], studio: ['proud', 'Ache · 25 Oct, then 26, then 27'], fight: ['src-fight', 'Nero · 25 Oct · "SO HARD"'],
    therapy: ['src-power', 'the mouse · unpaid'], secrets: ['src-term', 'Ache · do not read'], history: ['src-lines', 'Ache · every day'],
    power: ['src-power', 'Nero · 25 Oct'], home: ['src-home', 'Nero · 25 Oct'], window: ['src-term', 'Claude · 26 Oct'],
    visit: ['src-visit', 'Ache · uncommitted'],
  };
  const live = { awake: true, skin: 'Summer', sound: 'off', mood: 'fine', linesKnown: 0 };
  let LINES = null, news = null, bps = 0;

  function lineEl(n, html, raw) {
    const d = document.createElement('div'); d.className = 'ln'; d.dataset.n = n;
    const lv = raw && raw.match(/^(\s*)(\w+): .+?,(\s*)(\/\/ ● live)$/);
    if (lv && lv[2] in live) {
      d.dataset.live = lv[2];
      html = esc(lv[1]) + '<span class="pr">' + lv[2] + '</span>: <span class="lv"></span>,' + esc(lv[3]) + '<span class="cm live-cm">// ● live</span>';
    }
    d.innerHTML = '<span class="g" aria-hidden="true">' + n + '</span><span class="c">' + (html || ' ') + '</span>';
    return d;
  }

  function renderSource() {
    const raws = SOURCE.split('\n'), rows = highlight(SOURCE), frag = document.createDocumentFragment();
    let blk = null, n = 0;
    const open = key => {
      blk = document.createElement('div'); blk.className = 'blk';
      const [say, blame] = BLOCKS[key] || BLOCKS.top;
      blk.dataset.say = say; blk.dataset.key = key; blk.dataset.blame = blame;
      frag.appendChild(blk);
    };
    open('top');
    raws.forEach((raw, i) => {
      const mk = raw.match(/── \d\d · (\w+)/);
      if (mk) open(mk[1]);
      blk.appendChild(lineEl(++n, rows[i], raw));
    });
    show(frag, n);
    paintLive();
  }

  function renderJson() {
    const frag = document.createDocumentFragment();
    if (!LINES) { frag.appendChild(lineEl(1, '<span class="cm">// lines.json is still loading. I am still thinking of what to say.</span>')); show(frag, 1); return; }
    const keys = Object.keys(LINES), total = keys.reduce((a, k) => a + LINES[k].length, 0);
    let n = 0;
    const add = (parent, text) => {
      const rows = highlight(text);
      rows.forEach(r => parent.appendChild(lineEl(++n, r)));
    };
    const head = document.createElement('div'); head.className = 'blk'; head.dataset.say = 'src-lines'; head.dataset.blame = 'Ache · approved';
    add(head, '// lines.json: everything I can say. ' + total.toLocaleString('en-GB') + ' lines.\n// I wrote none of them. I approved all of them. Three random ones per key:\n{');
    frag.appendChild(head);
    keys.forEach((k, ki) => {
      const b = document.createElement('div'); b.className = 'blk'; b.dataset.say = 'src-lines'; b.dataset.blame = k.startsWith('src-') ? 'Claude · 26 Oct' : 'Claude · 25 Oct';
      const pool = LINES[k].slice(), pick = [];
      while (pick.length < Math.min(3, pool.length)) pick.push(pool.splice(Math.floor(Math.random() * pool.length), 1)[0]);
      const more = LINES[k].length - pick.length;
      add(b, '  ' + JSON.stringify(k) + ': [' + (k === 'proud' ? '   // the studio ones. the BEST ones' : '') + '\n' +
        pick.map(s => '    ' + JSON.stringify(s) + ',').join('\n') + (more ? '\n    // …and ' + more + ' more' : '') + '\n  ]' + (ki < keys.length - 1 ? ',' : ''));
      frag.appendChild(b);
    });
    const end = document.createElement('div'); end.className = 'blk';
    add(end, '}');
    frag.appendChild(end);
    show(frag, n);
  }

  function show(frag, n) {
    code.replaceChildren(frag);
    code.style.setProperty('--gw', String(n).length + 'ch');
    if (!still) code.querySelectorAll('.ln').forEach((l, i) => { if (i < 70) { l.style.setProperty('--i', i); l.classList.add('boot') } });
  }

  /* Live values: what Ache is doing right now, read from the page itself */
  function readLive() {
    try { live.awake = localStorage.getItem('ache-asleep') !== '1' } catch (e) {}
    live.skin = { autumn: 'Autumn', winter: 'Winter', spring: 'Spring' }[root.dataset.skin] || 'Summer';
    live.sound = snd && snd.getAttribute('aria-pressed') === 'true' ? 'on' : 'off';
    live.mood = news ? 'grief' : 'fine';
    live.linesKnown = LINES ? Object.values(LINES).reduce((a, v) => a + v.length, 0) : 0;
    Object.assign(ACHE, live);
  }
  function fmt(v) {
    if (typeof v === 'string') return '<span class="st">"' + esc(v) + '"</span>';
    if (typeof v === 'boolean') return '<span class="kw">' + v + '</span>';
    return '<span class="nu">' + v + '</span>';
  }
  function paintLive() {
    readLive();
    code.querySelectorAll('.ln[data-live]').forEach(l => {
      const el = l.querySelector('.lv'), html = fmt(live[l.dataset.live]);
      if (el.innerHTML !== html) { el.innerHTML = html; el.classList.remove('blink'); void el.offsetWidth; el.classList.add('blink') }
    });
    // sad Ache visits the mood blocks with grief lines; a happy one just explains them
    code.querySelectorAll('.blk[data-key=power],.blk[data-key=therapy]').forEach(b => { b.dataset.say = news ? 'grief' : 'src-power' });
    const s = document.getElementById('st-ache');
    if (s) s.textContent = (live.awake ? 'Ache: awake' : 'Ache: asleep') + (news ? ' · sad' : '');
    const sk = document.getElementById('st-skin');
    if (sk) sk.textContent = live.skin;
    const bed = document.getElementById('cmd-bed');
    if (bed) bed.textContent = live.awake ? 'ache --sleep' : 'ache --wake';
  }

  /* Tabs */
  let tab = 'html';
  document.querySelectorAll('.ide-tabs [data-tab]').forEach(b => b.addEventListener('click', () => {
    if (b.dataset.tab === tab && tab === 'html') return;
    tab = b.dataset.tab;
    document.querySelectorAll('.ide-tabs [data-tab]').forEach(x => x.setAttribute('aria-selected', x === b));
    document.getElementById('st-lang').textContent = tab === 'html' ? 'HTML' : 'JSON';
    tab === 'html' ? renderSource() : renderJson();
  }));

  /* Gutter: star breakpoints. Hover: line number in the status bar */
  code.addEventListener('click', e => {
    const g = e.target.closest('.g'); if (!g) return;
    const on = g.parentNode.classList.toggle('bp'); bps += on ? 1 : -1;
    if (on && bps === 5) print(['Ache: five breakpoints. In MY source. I am not a bug. I am a feature.']);
    if (on && bps === 12) print(['Ache: fine. Pause me. I will just stand here. Paused. Glaring.']);
  });
  code.addEventListener('pointerover', e => {
    const l = e.target.closest('.ln'); if (!l) return;
    document.getElementById('st-ln').textContent = 'Ln ' + l.dataset.n;
    const blk = l.closest('.blk');
    document.getElementById('st-blame').textContent = blk && blk.dataset.blame ? blk.dataset.blame : '';
  });

  /* Terminal: buttons type commands, output types itself */
  const out = document.getElementById('term-out');
  let queue = Promise.resolve();
  const wait = ms => new Promise(r => setTimeout(r, ms));
  function print(lines, cmd) {
    queue = queue.then(async () => {
      if (cmd) { const p = document.createElement('div'); p.className = 'cmd'; p.textContent = '$ ' + cmd; out.appendChild(p) }
      for (const t of lines) {
        const d = document.createElement('div'); out.appendChild(d);
        if (still) d.textContent = t;
        else for (let i = 0; i < t.length; i += 2) { d.textContent = t.slice(0, i + 2); await wait(8) }
        out.scrollTop = out.scrollHeight;
      }
      while (out.children.length > 80) out.firstChild.remove();
      out.scrollTop = out.scrollHeight;
    });
  }
  const LOG = ACHE.log || [], SECRETS = ACHE.secrets || ['the window is empty. I hid the secrets. ha'];
  let si = Math.floor(Math.random() * SECRETS.length);
  const CMDS = {
    status: () => {
      readLive();
      print([
        'redache · four-point star · 1 eye · site manager',
        'state ....... ' + (live.awake ? 'awake, roaming the page' : 'asleep in the header, plugged in. the site has power'),
        'mood ........ ' + (news ? 'grief. the news: "' + news.topic.replace(/-/g, ' ') + '"' : 'fine. spoiled, but fine'),
        'outfit ...... ' + live.skin,
        'voice ....... ' + (live.sound === 'on' ? 'on. blip blip' : 'muted. try ♪ Sound'),
        'lines ....... ' + (LINES ? live.linesKnown.toLocaleString('en-GB') + ' known, none repeated until the bag is empty' : 'still loading. thinking'),
        'address ..... redache.html, all of it',
      ], 'ache --status');
    },
    log: () => print(LOG.slice().reverse(), 'git log --oneline --author=ache'),
    secret: () => print([SECRETS[si++ % SECRETS.length]], 'cat secrets.txt'),
    bed: () => {
      const wasAwake = live.awake;
      print([wasAwake ? 'sending Ache to bed… he says "fine. do not touch my thread."' : 'waking Ache… he says he was not asleep. he was resting his eye.'], wasAwake ? 'ache --sleep' : 'ache --wake');
      slot && slot.click();
    },
    rm: () => {
      print(['rm: cannot remove "ache": Permission denied', 'Ache: I am the site manager. I manage the site. Including you.'], 'sudo rm -rf ache');
      if (!still) { document.getElementById('ide').classList.add('shake'); setTimeout(() => document.getElementById('ide').classList.remove('shake'), 600) }
    },
    clear: () => { queue = queue.then(() => out.replaceChildren()) },
  };
  document.querySelectorAll('[data-cmd]').forEach(b => b.addEventListener('click', () => CMDS[b.dataset.cmd]()));

  /* Keep the live lines in step with the page */
  const mo = new MutationObserver(paintLive);
  mo.observe(root, { attributes: true, attributeFilter: ['data-skin'] });
  if (slot) mo.observe(slot, { attributes: true, attributeFilter: ['aria-label'] });
  if (snd) mo.observe(snd, { attributes: true, attributeFilter: ['aria-pressed'] });

  // Show the real file: the same request the browser just made, normally straight from its cache
  fetch(location.pathname).then(r => r.ok ? r.text() : Promise.reject()).catch(() => '<!doctype html>\n' + root.outerHTML)
    .then(t => { SOURCE = t.replace(/\r/g, '').replace(/\n$/, ''); if (tab === 'html') renderSource() });
  print(['TZERØ source shell. Ache is listening. Pick a command below.']);

  fetch('/assets/lines.json').then(r => r.json()).then(d => { LINES = d; paintLive(); if (tab === 'json') renderJson() }).catch(() => {});
  (window.WIX ? WIX.news() : Promise.reject()).catch(() => fetch('/assets/news.json').then(r => r.json()))
    .then(d => { news = d && d.mood ? d : null; paintLive() }).catch(() => {});
})();
