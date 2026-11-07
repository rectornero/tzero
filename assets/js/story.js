/* Story page: the name dial, save points along the thread, the guide pile, the honest banner and the tape shelf.
   Everything is on the page already; this only adds the play. */
(() => {
  const $ = id => document.getElementById(id);
  const calm = matchMedia('(prefers-reduced-motion: reduce)').matches || document.documentElement.dataset.motion === '2';

  // The name dial: one word per year, the slash in red
  const names = JSON.parse($('dial-data').textContent);
  const word = $('dial-word'), line = $('dial-line');
  const paint = w => { word.replaceChildren(); for (const ch of w) { const s = document.createElement('span'); s.textContent = ch; if (ch === 'Ø') s.className = 'slash'; word.append(s) } };
  paint(names[names.length - 1].word);
  document.querySelectorAll('.dial-y').forEach(b => b.addEventListener('click', () => {
    const n = names[+b.dataset.i];
    document.querySelectorAll('.dial-y').forEach(x => x.setAttribute('aria-pressed', x === b ? 'true' : 'false'));
    line.textContent = n.line;
    if (calm) { paint(n.word); return }
    word.classList.add('swap');
    [...word.children].forEach(s => s.classList.add('out'));
    setTimeout(() => { paint(n.word); [...word.children].forEach((s, i) => { s.classList.add('in'); s.style.transitionDelay = i * 30 + 'ms' }); requestAnimationFrame(() => requestAnimationFrame(() => [...word.children].forEach(s => s.classList.remove('in')))) }, 220);
  }));

  // Save points: the thread fills as you scroll, and each save lights up once the thread reaches it
  const list = document.querySelector('.saves'), fill = list.querySelector('.thread-line');
  const saves = [...list.querySelectorAll('.save')];
  let ticking = false;
  function track() {
    ticking = false;
    const r = list.getBoundingClientRect(), mark = innerHeight * .55;
    const p = Math.max(0, Math.min(1, (mark - r.top) / r.height));
    fill.style.setProperty('--p', p.toFixed(4));
    for (const s of saves) s.classList.toggle('reached', s.getBoundingClientRect().top + 40 < mark);
  }
  addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(track) } }, { passive: true });
  addEventListener('resize', track); track();

  // The pile of 2024 guides drops in when it comes into view
  const pile = document.querySelector('.pile');
  if (window.IntersectionObserver && !calm) {
    pile.querySelectorAll('.pile-bars li').forEach((li, c) => li.querySelectorAll('i').forEach((t, i) => { t.style.animationDelay = (c * 60 + i * 35) + 'ms' }));
    new IntersectionObserver((es, o) => { if (es[0].isIntersecting) { pile.classList.add('on'); o.disconnect() } }, { threshold: .4 }).observe(pile);
  } else pile.classList.add('on');

  // The honest banner: every pull is free and gives a real post from the loop years. No pity, no timer.
  const pool = JSON.parse($('loop-pool').textContent);
  const out = $('pull-out'), count = $('pull-count'), btn = $('pull-btn');
  let pulls = 0, bag = [];
  const t0 = Date.now();
  btn.addEventListener('click', () => {
    if (!bag.length) { bag = pool.slice(); for (let i = bag.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [bag[i], bag[j]] = [bag[j], bag[i]] } }
    const p = bag.pop(); pulls++;
    const box = document.createElement('div'); box.className = 'pull ' + p.k + ' r' + p.r;
    const rar = document.createElement('span'); rar.className = 'rar'; rar.textContent = '★'.repeat(p.r) + ' ' + p.k + ' · ' + p.d;
    const b = document.createElement('b'); b.textContent = p.t;
    box.append(rar, b);
    if (p.g) { const g = document.createElement('span'); g.textContent = p.g; box.append(g) }
    if (p.k === 'guide') { const n = document.createElement('span'); n.textContent = 'Made inside the loop. Kept as a record, not as advice.'; box.append(n) }
    const a = document.createElement('a'); a.href = '/post/' + p.s; a.textContent = 'Read it →'; box.append(a);
    if (pulls % 10 === 0) { const n = document.createElement('span'); n.className = 'note2'; n.textContent = 'Ten pulls. A real banner would ask for money now. This one asks you to read one.'; box.append(n) }
    out.replaceChildren(box); out.dataset.r = p.r;
    const secs = Math.round((Date.now() - t0) / 1000);
    count.textContent = 'Pulls ' + pulls + ' · spent €0 · ' + (secs < 60 ? secs + ' s' : Math.round(secs / 60) + ' min') + ' of your time';
  });

  // The tape shelf: every case shows its back; the first tap flips it to the front, the second plays it (opens the post)
  const shelf = $('tapes');
  shelf.addEventListener('click', ev => {
    const c = ev.target.closest('.case'); if (!c || c.classList.contains('flipped')) return;
    ev.preventDefault();
    shelf.querySelectorAll('.case.flipped').forEach(x => x.classList.remove('flipped'));
    c.classList.add('flipped');
  });
  document.querySelectorAll('.chip').forEach(c => c.addEventListener('click', () => {
    document.querySelectorAll('.chip').forEach(x => x.setAttribute('aria-pressed', x === c ? 'true' : 'false'));
    shelf.querySelectorAll('.tape-item').forEach(t => { t.hidden = c.dataset.k !== 'all' && t.dataset.kind !== c.dataset.k });
  }));
})();
