/* The scrapbook page (/scrapbook): Ache's 24 stickers and the reader's save file. All data comes from save.js (window.TZSAVE),
   which scene.js loads; nothing here talks to a server. Found stickers can be dragged around their page; the spot is saved. */
(() => {
  const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e };
  const go = () => {
    const SV = window.TZSAVE, TZ = window.TZ || {};
    const say = t => TZ.speak && TZ.speak(t, 3);
    if (TZ.addLines) {
      TZ.addLines('scrapbook', ['My scrapbook. I curated it. With my face.', 'Every sticker is somewhere on this site. I know where. I\'m not telling. I wrote hints. Same thing.', 'No timers in here. Take a year. Take ten. The stickers will wait.', 'Drag the stickers around. Make it pretty. Prettier. That\'s it.', 'Empty slots aren\'t sad. They\'re suspense.', 'I lick every sticker before I hide it. Kidding. I don\'t have a mouth.']);
      TZ.addLines('rules', ['House rules. I wrote them. Nero wrote them. The studio wrote them. Good rules.', 'No dailies. No streaks. If a game guilt-trips you, tell me. I\'ll have words with it.', 'Rewards from play. Not from clocks. Clocks are for walls.', 'Nothing expires here. Except my patience. Kidding. It\'s infinite. Mostly.']);
      TZ.addLines('savefile', ['Your save file. It lives in your browser. I live in the HTML. We\'re neighbours.', 'Nothing in here leaves your computer. I checked. I sniffed the network tab.', 'Delete it if you want. I\'ll pretend I don\'t know you. I\'ll remember. Emotionally.', 'A save code! Like the old games. Write it on a sticky note. Lose it. Classic.']);
      TZ.addLines('sticker', ['That one\'s mine. They\'re all mine. You\'re borrowing them.', 'Peel it carefully. Kidding, it\'s digital. Peel it however.', 'Good find. Great find. A find.']);
    }
    const S = SV.data(), book = document.getElementById('book');
    const n = SV.count(), total = SV.STICKERS.length;

    /* counter + one star per sticker */
    document.getElementById('count-n').textContent = n;
    const stars = document.getElementById('stars');
    SV.STICKERS.forEach(s => { const li = el('li'); if (S.stickers[s.id]) li.className = 'on'; stars.append(li) });
    if (S.stickers.crown) document.getElementById('count').classList.add('done');

    /* the pages */
    const groups = Object.entries(SV.GROUPS);
    const turn = (deg, id) => { let h = 0; for (const c of id) h = (h * 31 + c.charCodeAt(0)) | 0; return ((h % 100) / 100) * deg };
    const pages = [];
    groups.forEach(([g, title], i) => {
      const page = el('section', 'page p' + (i % 2 ? 'r' : 'l'));
      page.dataset.g = g;
      const list = SV.STICKERS.filter(s => s.g === g), have = list.filter(s => S.stickers[s.id]).length;
      const head = el('header', 'page-head');
      head.append(el('h2', '', title), el('span', 'page-n', have + ' / ' + list.length));
      const slots = el('div', 'sb-slots');
      list.forEach(s => slots.append(slot(s)));
      page.append(head, slots, el('span', 'page-no', String(i + 1)));
      book.append(page); pages.push(page);
    });
    /* the crown: the last page, only when every sticker is found */
    const crown = el('section', 'page crown-page' + (S.stickers.crown ? ' got' : ''));
    crown.dataset.g = 'crown';
    if (S.stickers.crown) {
      crown.append(el('h2', '', 'Complete'), slot(SV.CROWN), el('p', 'crown-note', SV.CROWN.note));
    } else {
      const lock = el('div', 'crown-lock');
      lock.append(el('span', 'crown-q', '★'), el('p', '', 'There\'s one more sticker. It shows up here when the other ' + total + ' are found. ' + (total - n) + ' to go. No rush. Really.'));
      crown.append(el('h2', '', 'The last page'), lock);
    }
    book.append(crown);

    function slot(s) {
      const got = S.stickers[s.id];
      const d = el('div', 'sb-slot' + (got ? ' got' : ''));
      if (got) {
        const b = el('button', 'stk'); b.type = 'button'; b.dataset.id = s.id; b.dataset.say = 'sticker';
        b.style.setProperty('--r', turn(16, s.id) - 8 + 'deg');
        const img = el('img'); img.src = SV.IMG(s.id); img.alt = s.name; img.width = 140; img.height = 140; img.loading = 'lazy'; img.draggable = false;
        b.append(img);
        b.setAttribute('aria-label', s.name + ': ' + s.note);
        d.append(b, el('span', 'slot-name', s.name), el('span', 'slot-date', 'found ' + SV.date(got)));
        drag(b, s);
      } else {
        d.setAttribute('aria-label', 'Empty slot. Hint: ' + s.hint);
        d.append(el('span', 'slot-q', '?'), el('span', 'slot-hint', s.hint));
      }
      return d;
    }

    /* drag a sticker around its page; a click (no movement) makes Ache talk about it */
    function drag(b, s) {
      let sx, sy, ox = 0, oy = 0, base = null, moved = false, on = false;
      const page = () => b.closest('.page');
      const apply = () => {
        const p = SV.data().spots[s.id], pg = page();
        if (!p || !pg) { b.style.translate = ''; return }
        b.style.translate = (p.x * pg.clientWidth).toFixed(1) + 'px ' + (p.y * pg.clientHeight).toFixed(1) + 'px';
        if (p.r != null) b.style.setProperty('--r', p.r + 'deg');
      };
      b._apply = apply; requestAnimationFrame(apply);
      b.addEventListener('pointerdown', e => {
        on = true; moved = false; sx = e.clientX; sy = e.clientY;
        const p = SV.data().spots[s.id], pg = page();
        ox = p ? p.x * pg.clientWidth : 0; oy = p ? p.y * pg.clientHeight : 0;
        // where the sticker sits with no drag applied, to keep it on its page
        const r = b.getBoundingClientRect(); base = { l: r.left - ox, t: r.top - oy, w: r.width, h: r.height };
        b.setPointerCapture(e.pointerId); b.classList.add('lift');
      });
      b.addEventListener('pointermove', e => {
        if (!on) return;
        const dx = e.clientX - sx, dy = e.clientY - sy;
        if (!moved && Math.hypot(dx, dy) < 5) return;
        moved = true;
        const pg = page().getBoundingClientRect(), clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
        const x = clamp(ox + dx, pg.left - base.l - base.w * .3, pg.right - base.l - base.w * .7);
        const y = clamp(oy + dy, pg.top - base.t - base.h * .2, pg.bottom - base.t - base.h * .8);
        b.style.translate = x + 'px ' + y + 'px';
        b.style.setProperty('--r', Math.max(-20, Math.min(20, dx * .06)) + 'deg');
      });
      const end = () => {
        if (!on) return; on = false; b.classList.remove('lift');
        if (!moved) { b.classList.remove('boop'); void b.offsetWidth; b.classList.add('boop'); say(s.note); return }
        const pg = page(), [x, y] = (b.style.translate || '0px 0px').split(' ').map(parseFloat);
        const r = Math.round(Math.random() * 16 - 8);
        b.style.setProperty('--r', r + 'deg');
        SV.place(s.id, { x: x / pg.clientWidth, y: (y || 0) / pg.clientHeight, r });
      };
      b.addEventListener('pointerup', end); b.addEventListener('pointercancel', end);
      b.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); say(s.note) } });
    }
    addEventListener('resize', () => document.querySelectorAll('.stk').forEach(b => b._apply && b._apply()));
    document.getElementById('tidy').onclick = () => {
      Object.keys(SV.data().spots).forEach(id => SV.place(id, null));
      document.querySelectorAll('.stk').forEach(b => { b.style.translate = ''; b.style.setProperty('--r', turn(16, b.dataset.id) - 8 + 'deg') });
      say('Tidy. Boring. Fine.');
    };

    /* the save file */
    const read = Object.entries(S.read).sort((a, b) => b[1].at - a[1].at);
    const stats = document.getElementById('stats');
    const stat = (k, v) => { const d = el('div'); d.append(el('dt', '', k), el('dd', '', v)); stats.append(d) };
    stat('Save started', SV.date(S.first));
    stat('Visits', String(S.visits));
    stat('Articles finished', String(read.length));
    stat('Pages seen', String(Object.keys(S.pages).length));
    stat('Stickers', n + ' / ' + total + (S.stickers.crown ? ' + ★' : ''));
    const list = document.getElementById('read-list');
    if (!read.length) list.append(el('li', 'empty', 'None yet. Read one to the end and it shows up here (and Ache has a sticker for you).'));
    read.forEach(([slug, r]) => {
      const li = el('li'), a = el('a', '', r.t || slug); a.href = '/post/' + slug;
      li.append(a, el('span', 'meta', (r.s ? r.s + ' · ' : '') + SV.date(r.at))); list.append(li);
    });
    if (S.open && !S.read[S.open.slug]) {
      const o = document.getElementById('open'), a = el('a', 'btn', 'Continue "' + S.open.t + '" →'); a.href = '/post/' + S.open.slug;
      o.append(el('span', 'tag', 'Where you stopped'), el('p', '', 'You were ' + S.open.p + '% through it.'), a);
      o.hidden = false;
    }
    document.querySelector('.savefile').dataset.say = 'savefile';

    const code = document.getElementById('code'), msg = document.getElementById('code-msg');
    document.getElementById('copy').onclick = () => {
      const c = SV.exportCode(); code.value = c;
      const ok = () => { msg.textContent = 'Copied. Paste it in another browser\'s scrapbook to carry your save.' };
      (navigator.clipboard ? navigator.clipboard.writeText(c).then(ok) : Promise.reject()).catch(() => { code.select(); msg.textContent = 'Here it is: copy the code from the box.' });
    };
    document.getElementById('load').onclick = () => {
      if (!code.value.trim()) { msg.textContent = 'Paste a save code in the box first.'; return }
      if (SV.importCode(code.value)) { msg.textContent = 'Save loaded!'; say('A save code! Welcome back, whoever you are. You look familiar.'); setTimeout(() => location.reload(), 1400) }
      else msg.textContent = 'That code doesn\'t look like a TZERØ save. It should start with TZ1-.';
    };
    // two clicks to delete, no pop-up dialogs
    const wipe = document.getElementById('wipe'), wmsg = document.getElementById('wipe-msg');
    let armed = 0;
    wipe.onclick = () => {
      if (!armed) { armed = setTimeout(() => { armed = 0; wipe.textContent = 'Delete my save file'; wmsg.textContent = '' }, 6000); wipe.textContent = 'Yes, delete everything'; wmsg.textContent = 'Click again to delete. Your stickers too.'; say('Wait. Your stickers too? Think about the stickers.'); return }
      clearTimeout(armed); SV.wipe(); wmsg.textContent = 'Deleted. Fresh save started.'; say('Who are you? Never seen you before. Hi. Stickers are hidden everywhere.');
      setTimeout(() => location.reload(), 1600);
    };
    if (window.TZ && TZ.bindTilt) TZ.bindTilt(document.querySelector('.rules').parentNode);
    // Ache comments on the state of your scrapbook once
    setTimeout(() => say(n === 0 ? 'Empty! Perfect. All the stickers are still out there. Go. Explore. I\'ll guard the book.' : n === total ? 'Every sticker. You absolute legend. I mean: acceptable.' : n < 6 ? n + ' stickers. A start. A good start. The best start in Italy.' : n + ' of ' + total + '. You\'re good at this. Suspiciously good.'), 1500);
  };
  window.TZSAVE ? go() : addEventListener('tz:save-ready', go, { once: true });
})();
