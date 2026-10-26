/* Redache's page: the page source rendered as an editor, with live values, Ache's lines and a small terminal.
   The source text lives in <pre id="src"> so the page still reads without JavaScript. */
(() => {
  const pre = document.getElementById('src');
  const code = document.getElementById('code');
  const SOURCE = pre.textContent.replace(/^\n/, '');
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
    top: ['src-home', 'Ache · uncommitted'], who: ['src-who', 'Nero · 25 Oct'], home: ['src-home', 'Ache · uncommitted'],
    body: ['src-body', 'Claude · 25 Oct'], mind: ['sass', 'Ache · uncommitted'], studio: ['proud', 'Ache · 25 Oct, then 26, then 27'],
    power: ['src-power', 'Nero · 25 Oct'], mood: ['src-power', 'Nero · 25 Oct'], therapy: ['src-power', 'the mouse · unpaid'],
    fight: ['src-fight', 'Nero · 25 Oct · "SO HARD"'], voice: ['src-body', 'Claude · 25 Oct'], visit: ['src-visit', 'Ache · uncommitted'],
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
    live.skin = root.dataset.skin === 'autumn' ? 'Autumn' : 'Summer';
    live.sound = snd && snd.getAttribute('aria-pressed') === 'true' ? 'on' : 'off';
    live.mood = news ? 'grief' : 'fine';
    live.linesKnown = LINES ? Object.values(LINES).reduce((a, v) => a + v.length, 0) : 0;
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
    code.querySelectorAll('.blk[data-key=mood],.blk[data-key=therapy]').forEach(b => { b.dataset.say = news ? 'grief' : 'src-power' });
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
  const LOG = [
    'a1f3c9e  25 Oct  born as the loose end of the red thread on the homepage',
    'b72e014  25 Oct  named Ache. full name Redache. I pretend I picked it',
    'c09d5aa  25 Oct  learned 100+ lines per thing, in a shuffled bag',
    'd4410be  25 Oct  got a stake. hate it',
    'e5be2f1  25 Oct  got a bed: the star in the header',
    'f1c8a07  25 Oct  added Redache vs Mouse. four difficulties. NieR is the real one',
    '0a77d3c  25 Oct  became TOO proud of Artache. corrected. a good studio',
    '19ee5b2  25 Oct  new head: four-point star, one eye. very handsome',
    '2b3f6d8  25 Oct  thread now powers your cursor. you are welcome',
    '3c2a9e1  25 Oct  learned to cry about the news. once per story',
    '4d81f0a  25 Oct  got a keyboard voice. blip',
    '5e90c4b  26 Oct  moved into the source code. this page. my page',
  ];
  const SECRETS = [
    'the source is warmer than the front. the CPU, probably',
    'I read every line before you do. I give some of them a little spin',
    'line 1 of every page is mine. legally. I checked. nobody else checked',
    'when the page loads I tidy the tags. you never notice. that is the point',
    'the Ø in the logo is my cousin. we do not talk about the slash',
    'Nero plays with my thread like a cat. I pretend not to notice',
    'I was drawn with AI help, then fixed by people. like everything here',
    'I have a key to every page on the site. it is a semicolon',
  ];
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

  renderSource();
  pre.hidden = true;
  print(['TZERØ source shell. Ache is listening. Pick a command below.']);

  fetch('/assets/lines.json').then(r => r.json()).then(d => { LINES = d; paintLive(); if (tab === 'json') renderJson() }).catch(() => {});
  (window.WIX ? WIX.news() : Promise.reject()).catch(() => fetch('/assets/news.json').then(r => r.json()))
    .then(d => { news = d && d.mood ? d : null; paintLive() }).catch(() => {});
})();
