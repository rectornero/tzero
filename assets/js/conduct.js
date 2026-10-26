/* Statement of Conduct (/conduct): six toys, each flipping between "if we were evil" and how we do it.
   The event toy is the "Unchain time" gag: when the date passes it says "Event has ended.", then "...if we were evil!", and opens again.
   Everything runs in the page: no storage, no network. */
(() => {
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const rnd = a => a[Math.floor(Math.random() * a.length)];
  const hms = s => [s / 3600, s / 60 % 60, s % 60].map(v => String(Math.floor(v)).padStart(2, '0')).join(':');

  if (window.TZ && TZ.addLines) {
    TZ.addLines('conduct', ['unchain it. go on. time is a suggestion here', 'no energy bar. I run on spite', 'the odds are printed. I checked. twice', 'no padlocks in this house', 'a reward is a reward. no fireworks needed', 'released stays released. like me. you\'re stuck with me', 'draft! the wording may change. I won\'t', 'Nero\'s still writing this one. don\'t tell him I peeked', 'streaks? the only thing I keep is grudges']);
    TZ.addLines('conduct-evil', ['ew. a countdown. flip it', 'this is the evil version. flip the switch, quick', 'see terms?? which terms', 'gems. GEMS. no', 'I feel pressured just looking at this', 'flip it to "how we do it". please. for me']);
  }

  // Every toy with a switch: data-mode is "evil" or "ours"; Ache's hover lines follow the mode
  const modeHooks = {};
  for (const toy of $$('.toy[data-mode]')) {
    const btns = $$('.mode button', toy);
    const set = m => {
      toy.dataset.mode = m;
      toy.dataset.say = m === 'evil' ? 'conduct-evil' : 'conduct';
      btns.forEach(b => b.setAttribute('aria-pressed', String(b.dataset.m === m)));
      modeHooks[toy.dataset.toy] && modeHooks[toy.dataset.toy](m);
    };
    btns.forEach(b => b.addEventListener('click', () => set(b.dataset.m)));
    toy._set = set;
  }

  /* 01 chores: the timers tick while evil; flipping drops them off the card */
  {
    const toy = $('[data-toy=chores]');
    const ticks = $$('i[data-tick]', toy).map(el => ({ el, s: +el.dataset.tick }));
    $$('.chip', toy).forEach((c, i) => c.style.setProperty('--r', (i % 2 ? -1 : 1) * (6 + i * 4) + 'deg'));
    setInterval(() => {
      if (toy.dataset.mode !== 'evil' || document.hidden) return;
      for (const t of ticks) { t.s = t.s > 0 ? t.s - 1 : +t.el.dataset.tick; t.el.textContent = t.s >= 3600 ? hms(t.s) : hms(t.s).slice(3) }
    }, 1000);
  }

  /* 02 the event: a short date for the demo, "Unchain time", and the gag when the date passes */
  {
    const ev = $('[data-toy=event]'), clock = $('.ev-clock', ev), again = $('.again', ev);
    const START = 15;
    let left = START, timer = 0, gag = [];
    const show = () => { clock.textContent = hms(left); clock.classList.toggle('hurry', left <= 5) };
    const burst = () => { ev.classList.remove('burst'); void ev.offsetWidth; ev.classList.add('burst') };
    const open = () => {
      ev.dataset.state = 'open';
      clock.classList.remove('hurry');
      clock.textContent = 'never';
      again.hidden = false;
      burst();
    };
    const end = () => {
      clearInterval(timer); timer = 0;
      ev.dataset.state = 'ended';
      gag.push(setTimeout(() => { ev.dataset.state = 'evil' }, 1600));
      gag.push(setTimeout(() => open(), 3800));
    };
    const tick = () => { if (document.hidden) return; left--; show(); if (left <= 0) end() };
    const run = () => { gag.forEach(clearTimeout); gag = []; left = START; ev.dataset.state = 'live'; again.hidden = true; show(); clearInterval(timer); timer = 0 };
    // The clock only starts when the card is on screen, so nobody misses the ending
    const start = () => { if (!timer && ev.dataset.state === 'live') timer = setInterval(tick, 1000) };
    if (window.IntersectionObserver) new IntersectionObserver(es => es[0].isIntersecting && start(), { threshold: .6 }).observe(ev);
    else start();
    $('.unchain', ev).addEventListener('click', () => { clearInterval(timer); timer = 0; open() });
    $('.skip', ev).addEventListener('click', () => { if (ev.dataset.state === 'live') { left = 0; show(); end() } });
    again.addEventListener('click', () => { run(); start() });
    run();
  }

  /* 03 the pack: evil hides the odds and bills you; ours prints them and keeps a tally you can check */
  {
    const toy = $('[data-toy=pack]'), pulls = $('.pulls', toy), tally = $('.tally', toy), pack = $('.pack', toy);
    const ODDS = [['c', 70, '◆'], ['r', 25, '❖'], ['s', 5, '✦']];
    let n = { c: 0, r: 0, s: 0 }, spent = 0;
    const draw = evil => {
      const x = Math.random() * 100;
      // The evil pack's real odds are worse than anything it would ever print
      if (evil) return x < 98.5 ? ODDS[0] : x < 99.9 ? ODDS[1] : ODDS[2];
      let acc = 0;
      for (const o of ODDS) { acc += o[1]; if (x < acc) return o }
      return ODDS[0];
    };
    const writeTally = () => {
      const tot = n.c + n.r + n.s;
      if (toy.dataset.mode === 'evil') { tally.innerHTML = tot ? `Spent: <b class="bill">€${spent.toFixed(2)}</b> · shiny cards: <b>${n.s}</b>` : ''; return }
      tally.innerHTML = tot ? `${tot} cards so far: common <b>${Math.round(n.c / tot * 100)}%</b> · rare <b>${Math.round(n.r / tot * 100)}%</b> · shiny <b>${Math.round(n.s / tot * 100)}%</b>. Keep opening: it settles on the printed odds.` : '';
    };
    modeHooks.pack = () => { n = { c: 0, r: 0, s: 0 }; spent = 0; pulls.textContent = ''; writeTally() };
    $('.open-pack', toy).addEventListener('click', () => {
      const evil = toy.dataset.mode === 'evil';
      pack.classList.remove('shake'); void pack.offsetWidth; pack.classList.add('shake');
      pulls.textContent = '';
      for (let i = 0; i < 3; i++) {
        const [k, , g] = draw(evil);
        n[k]++;
        const c = document.createElement('span');
        c.className = 'pull ' + k; c.textContent = g;
        c.title = { c: 'common', r: 'rare', s: 'shiny' }[k];
        pulls.append(c);
      }
      if (evil) spent += 4.99;
      writeTally();
    });
  }

  /* 04 the deck: evil locks most cards behind gems; ours lets you build with all twelve */
  {
    const toy = $('[data-toy=deck]'), grid = $('.deck-grid', toy), count = $('.deck-n', toy);
    const CARDS = [['☾', 'Moon'], ['≈', 'Tide'], ['✦', 'Star'], ['⚑', 'Flag'], ['♜', 'Tower'], ['☂', 'Shelter'], ['✎', 'Quill'], ['⚿', 'Key'], ['☀', 'Sun'], ['❀', 'Bloom'], ['⚓', 'Anchor'], ['♫', 'Song']];
    const OPEN_EVIL = new Set([0, 2, 5, 9]);
    const MAX = 6;
    const deck = new Set();
    const cells = CARDS.map(([g, name], i) => {
      const b = document.createElement('button');
      b.type = 'button'; b.className = 'dcard';
      b.innerHTML = `<span aria-hidden="true">${g}</span><small>${name}</small>`;
      b.addEventListener('click', () => {
        if (b.classList.contains('locked')) { b.classList.remove('nope'); void b.offsetWidth; b.classList.add('nope'); return }
        if (deck.has(i)) deck.delete(i); else if (deck.size < MAX) deck.add(i);
        paint();
      });
      grid.append(b);
      return b;
    });
    const paint = () => {
      const evil = toy.dataset.mode === 'evil';
      cells.forEach((b, i) => {
        const locked = evil && !OPEN_EVIL.has(i);
        b.classList.toggle('locked', locked);
        b.classList.toggle('in', deck.has(i));
        b.setAttribute('aria-label', CARDS[i][1] + (locked ? ', locked' : deck.has(i) ? ', in your deck' : ''));
        b.setAttribute('aria-pressed', String(deck.has(i)));
      });
      count.textContent = deck.size + ' / ' + MAX;
    };
    modeHooks.deck = m => { if (m === 'evil') for (const i of [...deck]) if (!OPEN_EVIL.has(i)) deck.delete(i); paint() };
    paint();
  }

  /* 05 the reward: same five coins both ways; only the show changes */
  {
    const toy = $('[data-toy=reward]'), stage = $('.chest-stage', toy), reveal = $('.reveal', toy), btn = $('.open-chest', toy);
    const LOOT = [['5 copper coins', 'enough for a cup of tea in town'], ['1 lantern oil', 'lights a room for one night'], ['a rope', 'it is a rope'], ['3 copper coins', 'a small win is still a win'], ['a map scrap', 'one corner of the bay']];
    const HYPE = ['✨ LEGENDARY ✨', '!!! JACKPOT !!!', '💎 ULTRA RARE 💎', '🔥 SO CLOSE!! 🔥'];
    let busy = false, spin = 0, raf = 0;
    const reset = () => { cancelAnimationFrame(raf); stage.classList.remove('opened', 'hype'); stage.style.removeProperty('--spin'); reveal.textContent = ''; btn.textContent = 'Open your reward'; busy = false };
    modeHooks.reward = reset;
    btn.addEventListener('click', () => {
      if (busy) return;
      if (stage.classList.contains('opened')) { reset(); return }
      busy = true;
      const [what, note] = rnd(LOOT);
      stage.classList.add('opened');
      if (toy.dataset.mode === 'evil') {
        stage.classList.add('hype');
        reveal.textContent = rnd(HYPE);
        const t0 = performance.now();
        const loop = now => { spin = (now - t0) / 4; stage.style.setProperty('--spin', spin + 'deg'); raf = requestAnimationFrame(loop) };
        if (document.documentElement.dataset.motion !== '2' && !matchMedia('(prefers-reduced-motion: reduce)').matches) raf = requestAnimationFrame(loop);
        setTimeout(() => {
          cancelAnimationFrame(raf);
          stage.classList.remove('hype');
          reveal.innerHTML = `+ ${what}<span class="trick">All that noise was for this. That's the trick.</span>`;
          btn.textContent = 'Close it'; busy = false;
        }, 1700);
      } else {
        reveal.innerHTML = `+ ${what}<small>${note}</small>`;
        btn.textContent = 'Close it'; busy = false;
      }
    });
  }

  /* 06 the shelf: drag the years; evil vaults what came before, ours keeps it and adds more */
  {
    const toy = $('[data-toy=shelf]'), shelf = $('.c-shelf', toy), range = $('input', toy), yr = $('.yr', toy);
    const ITEMS = [[0, 'Prologue'], [0, 'Card set 1'], [1, 'Winter event'], [2, 'Chapter 2'], [3, 'Card set 2'], [5, 'Chapter 3'], [7, 'Director\'s cut'], [9, 'Card set 3']];
    const GONE = ['vaulted', 'delisted', 'servers off', 'gone forever'];
    const paint = () => {
      const y = +range.value, evil = toy.dataset.mode === 'evil';
      yr.textContent = y;
      shelf.textContent = '';
      for (const [at, name] of ITEMS) {
        if (at > y) continue;
        const li = document.createElement('li');
        // Evil: anything older than two years is vaulted, and after eight years the servers go too
        const gone = evil && (y - at >= 2 || y >= 8);
        li.className = gone ? 'gone' : at === y && y > 0 ? 'new' : '';
        li.innerHTML = `<b>${name}</b><span>${gone ? GONE[(at + name.length) % GONE.length] : at === y && y > 0 ? 'new' : 'available'}</span>`;
        shelf.append(li);
      }
    };
    range.addEventListener('input', paint);
    modeHooks.shelf = paint;
    paint();
  }
})();
