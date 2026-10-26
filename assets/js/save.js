/* The reader save file and Ache's sticker scrapbook. scene.js loads this on every page.
   Everything lives in this browser only (localStorage "tz-save"): no accounts, nothing sent anywhere.
   House rules, from the studio's Statement of Conduct: stickers are found by exploring. No timers, no dailies,
   no streaks, no random drops, no duplicates, nothing expires. Other features keep their own block in the same save
   through TZSAVE.get(ns) / TZSAVE.set(ns, obj), and can follow TZSAVE.on('read'|'sticker'|'visit', fn). */
(() => {
  const KEY = 'tz-save', OWN = ['v', 'first', 'last', 'visits', 'pages', 'read', 'open', 'stickers', 'spots', 'tapes'];
  const IMG = id => '/assets/img/stickers/' + id + '.webp';

  /* The 24 stickers. hint = what the empty slot says (Ache's handwriting), find = what Ache says when you find it,
     note = what Ache says about it in the scrapbook. 'crown' is the 25th, given when the other 24 are found. */
  const STICKERS = [
    // Found on the pages
    { id: 'o-cousin', g: 'pages', name: 'The Ø', hint: 'The Ø on the front page is my cousin. Say hi.', find: 'You poked my cousin! He\'s shy. He liked it.', note: 'My cousin, the Ø. Red, round, slashed. Family resemblance: zero. Get it.' },
    { id: 'polaroid', g: 'pages', name: 'Under the polaroid', hint: 'Something is stuck under a photo on the front page. Photos can move.', find: 'You moved my photos. Rude. You found my sticker. Less rude.', note: 'I hid this under the cover photo. Interior design is a passion.' },
    { id: 'vhs', g: 'pages', name: 'The last tape', hint: 'The story page has a shelf of tapes. Check the end of it.', find: 'The last tape on the shelf! Be kind, rewind.', note: 'Every tape on that shelf is a save point. This one is just a tape. I like tapes.' },
    { id: 'receipt', g: 'pages', name: 'The receipt', hint: 'The gacha years left a receipt. Read it to the bottom.', find: 'The bottom of the receipt. Nobody reads to the bottom. You do. Good.', note: 'The receipt of the gacha years. I keep half. The half that says "never again".' },
    { id: 'free-pull', g: 'pages', name: 'The honest pull', hint: 'There\'s an honest banner on the story page. It\'s free. Try it.', find: 'Pulled! The rate for this sticker is 100%. That\'s the only rate I allow.', note: 'From the honest banner. No currency, no pity, no timer. Just a book in an egg.' },
    { id: 'heartache', g: 'pages', name: 'Heart + ache', hint: 'Art plus heartache. On the studio page. Touch where it hurts.', find: 'Ow. I mean: you found it. Art plus heartache. That\'s my studio.', note: 'Art + heartache = Artache. The heart got a plaster. I applied it. Badly.' },
    { id: 'secrets', g: 'pages', name: 'secrets.txt', hint: 'Where I live there\'s a terminal. Ask it for a secret.', find: 'You read my secrets file. Fine. Keep this. And the secret.', note: 'cat secrets.txt. My secrets, in a file anyone can read. Security by trust.' },
    { id: 'sudo', g: 'pages', name: 'Permission denied', hint: 'Where I live, try to delete me. Go on. Try.', find: 'You tried to rm -rf me?! Take the sticker and THINK about what you did.', note: 'Proof that you can\'t delete the site manager. Laminate it.' },
    // Ache's mischief
    { id: 'caught', g: 'ache', name: 'Caught', hint: 'Catch me. If you can. Click my star.', find: 'Fine, you caught me. Here. A sticker. Now let go of my point.', note: 'The day you caught me. I let you. Write that down.' },
    { id: 'bedtime', g: 'ache', name: 'Bedtime', hint: 'My bed is the star in the header. Tuck me in.', find: 'A bed AND a sticker? Spoiled. Me. As I should be. zz', note: 'Me, asleep, plugged in. The site works best when I nap.' },
    { id: 'staked', g: 'ache', name: 'The stake', hint: 'Catch me and ask me to stay somewhere. I\'ll hate it.', find: 'A stake. For me. You get a sticker, I get splinters. Fair.', note: 'Where you staked me. I guarded it. Nothing happened. Great job, me.' },
    { id: 'treat', g: 'ache', name: 'Premium yarn', hint: 'Catch me and offer me something nice. I like nice things.', find: 'A treat! Imported yarn! You may have a sticker. One.', note: 'Premium red yarn on a silk pillow. The only acceptable treat.' },
    { id: 'whisper', g: 'ache', name: 'A whisper', hint: 'Catch me and ask for a secret.', find: 'Shh. Secrets come with stickers now. Don\'t spread it. Spread it a little.', note: 'I whispered a secret into this shell. You can hear it if you never stop scrolling.' },
    { id: 'win', g: 'ache', name: 'Mouse wins', hint: 'Catch me and pick a fight. Then win it.', find: 'You beat me. Take the trophy and go. I need to be alone. With the trophy. Give it back.', note: 'The trophy of a mouse that beat Redache. I let you. No, I didn\'t. Ugh.' },
    { id: 'nier', g: 'ache', name: 'The grimoire', hint: 'Beat me on the hardest setting. The one with the book.', find: 'On NieR?! Who ARE you? Take the grimoire. I\'ll be crying in the tomes.', note: 'You beat me on NieR. The pages have recorded it. I asked them not to.' },
    { id: 'ko', g: 'ache', name: 'Mouse K.O.', hint: 'Lose a fight against me. Proudly.', find: 'Mouse K.O.! Here\'s a bandage sticker. I\'m not a monster. I\'m a star.', note: 'For the brave mice who lost to me. Bandages are free here. Everything is.' },
    // Reading
    { id: 'first-read', g: 'read', name: 'First read', hint: 'Read an article to the end. Any one.', find: 'You read a whole article! To the END! I\'m not crying, it\'s lens fluid.', note: 'Your first article read to the end. I marked the page.' },
    { id: 'bookworm', g: 'read', name: 'Bookworm', hint: 'Read five articles to the end. No rush. They don\'t expire.', find: 'Five articles! You\'re basically staff now. Unpaid. Like me.', note: 'Five articles finished. Glasses included, because you earned them.' },
    { id: 'loop', g: 'read', name: 'Out of the loop', hint: 'Read one of the old gacha-years articles in the Archive, to the end.', find: 'You read one from inside the loop. Now you know what it looks like. Stay out here with me.', note: 'A broken chain. The old guides were written inside the loop. You read one from outside it.' },
    { id: 'devlog', g: 'read', name: 'Devlog reader', hint: 'Read a Devlog to the end. That\'s where games get made.', find: 'A devlog! You watched the sausage get made. The sausage is a game. Good sausage.', note: 'You read how a game gets made. Now you know too much. Welcome.' },
    { id: 'tapes', g: 'read', name: 'All three tapes', hint: 'Open the Devlog, Studio and Archive tapes. All three.', find: 'Side A, side B and the archive. You played every tape!', note: 'Three tapes: Devlog, Studio, Archive. You listened to all of them. Good ears.' },
    // Odd corners
    { id: 'last-save', g: 'odd', name: 'The last save', hint: 'Follow the story to its last save point.', find: 'The last save point! Well, the newest one. The story keeps going. So do we.', note: 'The newest save in our story. It glows. I polish it.' },
    { id: 'seasons', g: 'odd', name: 'Four seasons', hint: 'I change clothes with the seasons. Make me change them. The Skin button.', find: 'You changed my outfit! I look good in everything. Sticker for the stylist.', note: 'Summer, autumn, winter, spring. My wardrobe. I look great in all four.' },
    { id: 'konami', g: 'odd', name: 'The old code', hint: 'An old arcade code still works here. Up, up…', find: 'The old code! Up up down down… you\'re a gamer of culture. Have this.', note: 'The arcade code. Thirty lives? No. One sticker. We respect your time.' },
  ];
  const CROWN = { id: 'crown', g: 'crown', name: 'Redache, crowned', find: 'ALL OF THEM?! You found every sticker. Fine. FINE. Here\'s me. Gold edition. You earned it, honestly.', note: 'Me, crowned. Only for readers who found every sticker. That\'s you. I\'m proud of you. Don\'t tell anyone.' };
  const BY = Object.fromEntries([...STICKERS, CROWN].map(s => [s.id, s]));
  const GROUPS = { pages: 'Found on the pages', ache: 'Ache\'s mischief', read: 'Reading', odd: 'Odd corners' };

  /* ---------- the save file ---------- */
  const fresh = () => ({ v: 1, first: Date.now(), last: 0, visits: 0, pages: {}, read: {}, open: null, stickers: {}, spots: {}, tapes: {} });
  function load() {
    try { const s = JSON.parse(localStorage.getItem(KEY)); if (s && s.v === 1) return Object.assign(fresh(), s) } catch (e) {}
    return fresh();
  }
  let S = load(), canSave = true;
  function write() { if (!canSave) return; try { localStorage.setItem(KEY, JSON.stringify(S)) } catch (e) { canSave = false } }
  // another tab saved: pick it up so two tabs don't undo each other's stickers
  addEventListener('storage', e => { if (e.key === KEY) S = load() });

  const subs = {};
  function emit(type, detail) {
    (subs[type] || []).forEach(fn => { try { fn(detail) } catch (e) {} });
    document.dispatchEvent(new CustomEvent('tz:save', { detail: Object.assign({ type }, detail) }));
  }

  const path = location.pathname.replace(/\.html$/, '').replace(/\/$/, '') || '/';
  const firstEver = !S.visits;
  // a "visit" is a browser session; the greeting compares with when this browser was last here
  let newVisit = false, gap = 0;
  try { if (!sessionStorage.getItem('tz-visit')) { sessionStorage.setItem('tz-visit', '1'); newVisit = true } } catch (e) { newVisit = !S.last || Date.now() - S.last > 30 * 60e3 }
  if (newVisit) { gap = S.last ? Date.now() - S.last : 0; S.visits++ }
  const firstHere = !S.pages[path];
  S.pages[path] = (S.pages[path] || 0) + 1;
  S.last = Date.now();
  write();

  /* ---------- small helpers ---------- */
  const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e };
  const date = t => new Date(t).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  const count = () => STICKERS.filter(s => S.stickers[s.id]).length;
  const tz = () => window.TZ || {};
  const say = (t, prio, ms) => tz().speak && tz().speak(t, prio == null ? 3 : prio, ms);
  const still = () => document.documentElement.dataset.motion === '2' || matchMedia('(prefers-reduced-motion: reduce)').matches;

  const css = el('link'); css.rel = 'stylesheet'; css.href = '/assets/css/save.css'; document.head.appendChild(css);

  /* ---------- finding a sticker ---------- */
  const queue = [];
  function award(id, from) {
    const s = BY[id]; if (!s || S.stickers[id]) return false;
    S = load(); if (S.stickers[id]) return false; // another tab got it first
    S.stickers[id] = Date.now(); write();
    queue.push({ s, from }); if (queue.length === 1) reveal();
    emit('sticker', { id, name: s.name, count: count(), total: STICKERS.length });
    if (id !== 'crown' && count() === STICKERS.length) setTimeout(() => award('crown'), 600);
    paintFooter();
    return true;
  }
  // the sticker pops up big, peels into view, then flies down into the scrapbook button
  function reveal() {
    const { s, from } = queue[0];
    const pop = el('div', 'stk-pop' + (s.id === 'crown' ? ' gold' : ''));
    pop.setAttribute('role', 'status');
    const img = el('img'); img.src = IMG(s.id); img.alt = ''; img.width = 160; img.height = 160;
    const n = count();
    const txt = el('div', 'stk-pop-txt');
    txt.append(el('span', 'stk-pop-kick', s.id === 'crown' ? 'Scrapbook complete' : 'New sticker · ' + n + ' of ' + STICKERS.length), el('b', '', s.name));
    const open = el('a', 'stk-pop-open', 'Open the scrapbook →'); open.href = '/scrapbook';
    txt.append(open);
    const x = el('button', 'stk-pop-x', '×'); x.type = 'button'; x.setAttribute('aria-label', 'Close');
    pop.append(img, txt, x);
    if (from && from.getBoundingClientRect && !still()) {
      const r = from.getBoundingClientRect();
      pop.style.setProperty('--fx', (r.left + r.width / 2 - innerWidth / 2) + 'px');
      pop.style.setProperty('--fy', (r.top + r.height / 2 - innerHeight / 2) + 'px');
      pop.classList.add('from');
    }
    document.body.appendChild(pop);
    tz().sfx && tz().sfx(s.id === 'crown' ? 'win' : 'catch');
    setTimeout(() => say(s.find, 3), 350);
    let gone = false;
    const done = () => {
      if (gone) return; gone = true; pop.classList.add('away');
      setTimeout(() => { pop.remove(); queue.shift(); if (queue.length) reveal() }, 450);
    };
    x.onclick = done;
    setTimeout(done, s.id === 'crown' ? 9000 : 6200);
  }

  /* a sticker peeking out of the page: click it to peel it off */
  function spot(id, host, style, label) {
    if (!host || S.stickers[id]) return null;
    const b = el('button', 'stk-spot'); b.type = 'button'; b.setAttribute('aria-label', label || 'A sticker is peeking out');
    const img = el('img'); img.src = IMG(id); img.alt = ''; img.loading = 'lazy'; b.append(img);
    Object.assign(b.style, style || {});
    b.addEventListener('click', e => {
      e.preventDefault(); e.stopPropagation();
      b.classList.add('peel'); award(id, b); setTimeout(() => b.remove(), 600);
    });
    host.classList.add('stk-host'); host.appendChild(b);
    return b;
  }

  /* ---------- the footer link: how many found ---------- */
  let foot = null;
  function paintFooter() {
    const f = document.querySelector('footer .wrap > div:last-child');
    if (!f) return;
    if (!foot) { foot = el('a', 'stk-foot'); foot.href = '/scrapbook'; f.prepend(foot, el('br')) }
    const n = count();
    foot.textContent = n ? 'Ache\'s scrapbook · ' + n + '/' + STICKERS.length + (S.stickers.crown ? ' ★' : '') : 'Ache\'s scrapbook';
  }
  paintFooter();

  /* ---------- reading: what you finished, where you stopped ---------- */
  const slugOf = href => { try { const u = new URL(href, location.origin); if (u.origin !== location.origin) return null; const m = u.pathname.match(/^\/post\/([^/]+?)(?:\.html)?\/?$/); return m ? decodeURIComponent(m[1]) : null } catch (e) { return null } };

  // cards and links to posts you've finished get a small "read" stamp
  function markRead(root) {
    (root || document).querySelectorAll('a.card[href*="/post/"], .save-posts a[href*="/post/"], .side-fresh a[href*="/post/"]').forEach(a => {
      const s = slugOf(a.getAttribute('href'));
      if (s && S.read[s] && !a.classList.contains('is-read')) { a.classList.add('is-read'); a.dataset.readOn = 'read ✓' }
    });
  }
  let mt = 0;
  new MutationObserver(() => { clearTimeout(mt); mt = setTimeout(markRead, 200) }).observe(document.body, { childList: true, subtree: true });
  markRead();

  function trackPost() {
    const slug = slugOf(location.pathname); if (!slug) return;
    const art = document.getElementById('article');
    let done = !!S.read[slug], tick = 0;
    const ready = () => {
      const sheet = art && art.querySelector('.post-sheet');
      const h1 = sheet && sheet.querySelector('h1');
      if (!sheet || !h1) return false;
      const crumbs = [...document.querySelectorAll('#crumbs a')];
      const section = (crumbs[crumbs.length - 1] || {}).textContent || '';
      const title = h1.textContent.trim();
      if (done) {
        const st = el('p', 'stk-readbefore', 'In your save file: you finished this one on ' + date(S.read[slug].at) + '.');
        h1.after(st);
      }
      const check = () => {
        const r = sheet.getBoundingClientRect(), total = r.height - innerHeight * .6;
        const v = Math.max(0, Math.min(1, (innerHeight * .4 - r.top) / Math.max(1, total)));
        if (done) return;
        if (v >= .97 || r.bottom < innerHeight * .9) {
          done = true; S = load();
          S.read[slug] = { t: title, s: section, at: Date.now() };
          if (S.open && S.open.slug === slug) S.open = null;
          write(); emit('read', { slug, title, section });
          const n = Object.keys(S.read).length;
          award('first-read', sheet);
          if (n >= 5) award('bookworm', sheet);
          if (/archive/i.test(section) || document.querySelector('.ache-note')) award('loop', sheet);
          if (/devlog/i.test(section)) award('devlog', sheet);
        } else if (v > .08 && performance.now() - tick > 1500) {
          // remember the unfinished article so Ache can offer it next time
          tick = performance.now(); S = load(); S.open = { slug, t: title, p: Math.round(v * 100), at: Date.now() }; write();
        }
      };
      addEventListener('scroll', check, { passive: true }); check();
      return true;
    };
    if (!ready()) { const mo = new MutationObserver(() => { if (ready()) mo.disconnect() }); mo.observe(art || document.body, { childList: true, subtree: true }) }
  }

  /* ---------- hidden stickers, page by page ---------- */
  function pages() {
    if (path === '/' || path === '/index') {
      const o = document.querySelector('.hero h1 .o');
      if (o && !S.stickers['o-cousin']) {
        o.classList.add('stk-poke');
        o.addEventListener('click', e => { e.stopPropagation(); o.classList.remove('boop'); void o.offsetWidth; o.classList.add('boop'); award('o-cousin', o) });
      }
      // under the cover polaroid: a sticker on the board, beneath the photo, until someone drags the photo away
      const board = document.querySelector('.board'), pol = board && board.querySelector('.polaroid');
      if (pol) {
        // first in the board, so the photo (positioned later in the page) covers it
        const b = spot('polaroid', board, { right: 'calc(30% + 40px)', top: '18%' }, 'A sticker stuck to the board');
        if (b) { b.classList.add('under'); board.prepend(b) }
      }
    }
    if (path === '/story') {
      const tapes = document.querySelectorAll('.tape-item');
      spot('vhs', tapes[tapes.length - 1], { right: '-6px', bottom: '-6px' }, 'A sticker on the last tape');
      spot('receipt', document.querySelector('.receipt .rc-paper'), { right: '14px', bottom: '-14px' }, 'A sticker at the bottom of the receipt');
      const pull = document.getElementById('pull-btn');
      if (pull) pull.addEventListener('click', () => setTimeout(() => award('free-pull', pull), 1400));
      const saves = document.querySelectorAll('.saves > .save');
      const last = saves[saves.length - 1];
      if (last && !S.stickers['last-save']) new IntersectionObserver((es, io) => { if (es[0].isIntersecting) { io.disconnect(); setTimeout(() => award('last-save', last), 900) } }, { threshold: .5 }).observe(last);
    }
    if (path === '/studio') {
      const heart = document.querySelector('.eq-heart');
      if (heart && !S.stickers.heartache) {
        heart.classList.add('stk-poke');
        heart.addEventListener('click', e => { e.preventDefault(); e.stopPropagation(); heart.classList.add('boop'); award('heartache', heart) });
      }
    }
    if (path === '/redache') {
      document.addEventListener('click', e => {
        const b = e.target.closest('[data-cmd]'); if (!b) return;
        if (b.dataset.cmd === 'secret') setTimeout(() => award('secrets', b), 900);
        if (b.dataset.cmd === 'rm') setTimeout(() => award('sudo', b), 1100);
      });
    }
    const tape = path.match(/^\/posts\/categories\/(devlog|studio|archive)$/);
    if (tape) {
      S.tapes[tape[1]] = 1; write();
      if (S.tapes.devlog && S.tapes.studio && S.tapes.archive) setTimeout(() => award('tapes', document.querySelector('h1')), 1500);
    }
    if (path.startsWith('/post/')) trackPost();
  }

  /* ---------- Ache: catching, treats, stakes, beds, fights, outfits ---------- */
  function ache() {
    const chat = document.querySelector('.chat');
    if (chat) {
      // the catch menu gets one more option: the scrapbook
      new MutationObserver(() => {
        if (chat.hidden) return;
        const btns = [...chat.querySelectorAll('.opts button')], bye = btns.find(b => b.textContent === 'Bye!');
        if (!bye || !btns.some(b => b.textContent === 'Fight me!')) return;
        award('caught', chat);
        if (btns.some(b => b.classList.contains('stk-opt'))) return;
        const b = el('button', 'stk-opt', 'My scrapbook'); b.type = 'button';
        b.onclick = e => {
          e.stopPropagation();
          const n = count(), p = chat.querySelector('p'), row = chat.querySelector('.opts');
          p.textContent = n === 0 ? 'Your scrapbook is empty. Stickers are hidden all over the site. No timers. Explore. I\'ll be watching. Supportively.'
            : n === STICKERS.length ? 'You found all ' + n + '. Every single one. I keep looking at your scrapbook when you\'re not here. It\'s a good scrapbook.'
            : 'You have ' + n + ' of ' + STICKERS.length + '. ' + ['Not bad. For a mouse.', 'The rest are out there. They don\'t expire. Take your time.', 'I hid the others myself. Some of them are very well hidden. Some are under a photo. Oops.'][n % 3];
          const go = el('button', '', 'Open it'); go.type = 'button'; go.onclick = ev => { ev.stopPropagation(); location.href = '/scrapbook' };
          const back = el('button', '', 'Back'); back.type = 'button'; back.onclick = ev => { ev.stopPropagation(); tz().menu ? tz().menu('What else?') : chat.hidden = true };
          row.replaceChildren(go, back);
        };
        bye.before(b);
      }).observe(chat, { childList: true, attributes: true, attributeFilter: ['hidden'] });
      chat.addEventListener('click', e => {
        const b = e.target.closest('button'); if (!b) return;
        const t = b.textContent;
        if (t === 'Want a treat?') setTimeout(() => award('treat', chat), 1800);
        if (t === 'Tell me a secret') setTimeout(() => award('whisper', chat), 2200);
        if (t === 'Stake Ache here') setTimeout(() => award('staked'), 1900);
      }, true);
    }
    const slot = document.getElementById('slot');
    if (slot) new MutationObserver(() => { if (slot.classList.contains('full')) setTimeout(() => award('bedtime', slot), 1200) }).observe(slot, { attributes: true, attributeFilter: ['class'] });
    const fend = document.querySelector('.fend');
    if (fend) new MutationObserver(() => {
      if (fend.hidden) return;
      const h = (fend.querySelector('h3') || {}).textContent || '', p = (fend.querySelector('p') || {}).textContent || '';
      if (/defeated/i.test(h)) { award('win', fend); if (/nier/i.test(p)) award('nier', fend) }
      else if (/k\.o/i.test(h)) award('ko', fend);
    }).observe(fend, { attributes: true, attributeFilter: ['hidden'] });
    const skin = document.getElementById('skin');
    if (skin) skin.addEventListener('click', () => setTimeout(() => award('seasons', skin), 900));
    // up up down down left right left right B A
    const code = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a'];
    let k = 0;
    addEventListener('keydown', e => {
      const key = e.key.length === 1 ? e.key.toLowerCase() : e.key;
      k = key === code[k] ? k + 1 : (key === code[0] ? 1 : 0);
      if (k === code.length) { k = 0; if (!award('konami')) say('Thirty lives? No. You already have the sticker. Respect your time.', 3) }
    });
  }

  /* ---------- the greeting for returning readers ---------- */
  function greet() {
    if (!newVisit || firstEver || path === '/scrapbook') return;
    const days = Math.floor(gap / 864e5), n = count(), read = Object.keys(S.read).length;
    const open = S.open && !S.read[S.open.slug] ? S.open : null;
    let line;
    if (open && slugOf(location.pathname) !== open.slug) line = 'Welcome back. You left "' + open.t + '" at ' + open.p + '%. I kept your page. Don\'t tell anyone I\'m nice.';
    else if (days >= 30) line = 'Oh! You\'re back! The journal waited. Nothing here expires. Studio rule. I made it. I didn\'t make it.';
    else if (days >= 7) line = 'Welcome back! It\'s been ' + days + ' days. Not that I count. I count. No rush, though. There\'s no clock here.';
    else if (days >= 1) line = ['Save file loaded. Hi again!', 'Oh. You\'re back. I wasn\'t waiting. I was coiling. Near the door.', 'Welcome back. I dusted the polaroids. With my face.'][S.visits % 3];
    else line = ['Back already? I like you. Don\'t make it weird.', 'Twice in one day. You must really like my site. Nero\'s site. Our site.'][S.visits % 2];
    setTimeout(() => say(line, 3), 2600);

    const t = el('div', 'stk-toast'); t.setAttribute('role', 'status');
    const head = el('span', 'stk-toast-kick', '▶ Save file loaded');
    const stats = el('span', 'stk-toast-stats', 'Visit ' + S.visits + ' · ' + read + ' read · ' + n + '/' + STICKERS.length + ' stickers');
    t.append(head, stats);
    if (open && slugOf(location.pathname) !== open.slug) { const a = el('a', 'stk-toast-go', 'Continue: ' + open.t + ' →'); a.href = '/post/' + open.slug; t.append(a) }
    const sb = el('a', 'stk-toast-book', 'Scrapbook'); sb.href = '/scrapbook'; t.append(sb);
    const x = el('button', 'stk-toast-x', '×'); x.type = 'button'; x.setAttribute('aria-label', 'Close'); t.append(x);
    const close = () => { t.classList.add('away'); setTimeout(() => t.remove(), 400) };
    x.onclick = close;
    setTimeout(() => { document.body.appendChild(t); setTimeout(close, 10000) }, 1200);
  }
  function welcome() {
    // the very first visit: no toast, just Ache noticing you, once
    if (!firstEver || path === '/scrapbook') return;
    setTimeout(() => say('A new reader! I started a save file for you. In your browser. Only yours. Stickers are hidden everywhere. Go look.', 3), 4000);
  }

  window.TZSAVE = {
    STICKERS, CROWN, GROUPS, IMG,
    data: () => (S = load(), S),
    count, award, date,
    get: ns => { if (OWN.includes(ns)) return null; S = load(); return JSON.parse(JSON.stringify(S[ns] || {})) },
    set: (ns, obj) => { if (OWN.includes(ns)) return false; S = load(); S[ns] = obj; write(); return true },
    // where a sticker was dragged to in the scrapbook ({x, y, r} in % of its page), or null to put it back
    place: (id, pos) => { S = load(); if (pos) S.spots[id] = pos; else delete S.spots[id]; write() },
    on: (type, fn) => { (subs[type] = subs[type] || []).push(fn) },
    // save codes: the whole save as text, to carry it to another browser
    exportCode: () => 'TZ1-' + btoa(unescape(encodeURIComponent(JSON.stringify(load())))),
    importCode: code => {
      try {
        const d = JSON.parse(decodeURIComponent(escape(atob(String(code).trim().replace(/^TZ1-/, '')))));
        if (!d || d.v !== 1 || typeof d.stickers !== 'object') return false;
        S = Object.assign(fresh(), d); write(); return true;
      } catch (e) { return false }
    },
    wipe: () => { try { localStorage.removeItem(KEY) } catch (e) {} S = fresh(); S.visits = 1; S.last = Date.now(); S.pages[path] = 1; write() },
  };

  const start = () => { pages(); ache(); greet(); welcome(); emit('visit', { path, first: firstHere }); dispatchEvent(new Event('tz:save-ready')) };
  document.readyState === 'loading' ? addEventListener('DOMContentLoaded', start) : start();
})();
