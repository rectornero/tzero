/* Interactive blocks Nero crafts visually in /admin, with no code: a mini visual novel, a hotspot picture, a
   before/after slider, flip cards and story slides. They are stored as plain data (a TZ_BLOCK node: { kind, data }) and drawn
   here by the site's own code with createElement/textContent, so nothing in them is ever run or parsed as HTML. */
window.TZBLOCKS = (() => {
  const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e };
  const str = (v, max = 2000) => typeof v === 'string' ? v.slice(0, max) : '';
  // Pictures: only from this site (uploads, assets) or over https
  function src(url) {
    url = str(url, 1000);
    if (/^\/(api\/media|assets)\//.test(url) || /^data:image\/(png|jpeg|webp|gif);base64,[\w+/=]+$/.test(url)) return url;
    try { const u = new URL(url); return u.protocol === 'https:' ? u.href : '' } catch (e) { return '' }
  }
  const color = c => /^#[0-9a-f]{3,8}$/i.test(c || '') ? c : '';
  const img = (url, alt, cls) => { const i = el('img', cls); const s = src(url); if (s) i.src = s; i.alt = str(alt, 200); i.loading = 'lazy'; i.decoding = 'async'; return i };

  /* Mini visual novel: { title, bg, cast: [{ id, name, img, color }], scenes: [{ id, bg, lines: [{ who, text }],
     choices: [{ text, to }], end }], start } */
  function vn(d) {
    const cast = new Map((Array.isArray(d.cast) ? d.cast : []).map(c => [str(c.id, 40), c]));
    const scenes = new Map((Array.isArray(d.scenes) ? d.scenes : []).map(s => [str(s.id, 40), s]));
    const box = el('div', 'tzb tzb-vn');
    const stage = el('div', 'vn-stage'), bg = el('div', 'vn-bg'), who = el('img', 'vn-who'), say = el('div', 'vn-say');
    const name = el('span', 'vn-name'), line = el('p', 'vn-line'), next = el('span', 'vn-next', '▼'), opts = el('div', 'vn-choices');
    who.alt = ''; who.hidden = true;
    say.append(name, line, next);
    stage.append(bg, who, say, opts);
    const title = str(d.title, 120);
    if (title) box.append(el('div', 'vn-title', title));
    box.append(stage);
    let scene = null, i = 0, typing = null;

    function setBg(url) { const s = src(url); bg.style.backgroundImage = s ? 'url("' + s.replace(/["\\]/g, '') + '")' : '' }
    function show(n) {
      clearInterval(typing);
      const l = scene.lines[n], c = cast.get(str(l && l.who, 40));
      opts.replaceChildren(); opts.hidden = true;
      name.textContent = c ? str(c.name, 40) : '';
      name.hidden = !c;
      say.style.setProperty('--vn-c', color(c && c.color) || '#13224b');
      if (c && src(c.img)) { who.src = src(c.img); who.hidden = false; who.classList.remove('pop'); void who.offsetWidth; who.classList.add('pop') }
      else if (!c) who.hidden = true;
      // The line types itself in; a tap shows it all at once
      const text = str(l && l.text, 600);
      let k = 0; line.textContent = ''; next.hidden = true;
      typing = setInterval(() => { k += 2; line.textContent = text.slice(0, k); if (k >= text.length) done() }, 24);
      function done() { clearInterval(typing); typing = null; line.textContent = text; next.hidden = false }
      show.finish = done;
    }
    function go(id) {
      scene = scenes.get(str(id, 40));
      if (!scene) return end('');
      scene.lines = Array.isArray(scene.lines) ? scene.lines : [];
      if (scene.bg) setBg(scene.bg);
      i = 0;
      if (scene.lines.length) show(0); else choices();
    }
    function choices() {
      const list = (Array.isArray(scene.choices) ? scene.choices : []).filter(c => str(c.text));
      if (!list.length) return end(str(scene.end, 200));
      next.hidden = true;
      opts.replaceChildren(...list.slice(0, 4).map(c => {
        const b = el('button', 'vn-choice', str(c.text, 120)); b.type = 'button';
        b.onclick = e => { e.stopPropagation(); go(c.to) };
        return b;
      }));
      opts.hidden = false;
    }
    function end(text) {
      clearInterval(typing);
      opts.replaceChildren(); opts.hidden = false; next.hidden = true;
      const fin = el('div', 'vn-end');
      fin.append(el('b', '', text || 'The end'));
      const again = el('button', 'vn-choice', '↺ Play again'); again.type = 'button';
      again.onclick = e => { e.stopPropagation(); start() };
      fin.append(again); opts.append(fin);
    }
    function advance() {
      if (!scene || !opts.hidden) return;
      if (typing) return show.finish();
      if (i + 1 < scene.lines.length) show(++i); else choices();
    }
    function start() { setBg(d.bg); who.hidden = true; go(d.start || (d.scenes && d.scenes[0] && d.scenes[0].id)) }
    stage.tabIndex = 0;
    stage.setAttribute('role', 'button');
    stage.setAttribute('aria-label', 'Visual novel: tap or press Enter to continue');
    stage.addEventListener('click', advance);
    stage.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); advance() } });
    start();
    return box;
  }

  /* Hotspot picture: { img, alt, spots: [{ x, y, title, text }] } with x and y in percent */
  function hotspots(d) {
    const box = el('figure', 'tzb tzb-spots'), wrap = el('div', 'spots-wrap');
    wrap.append(img(d.img, d.alt));
    const card = el('div', 'spot-card'); card.hidden = true;
    let open = null;
    (Array.isArray(d.spots) ? d.spots : []).slice(0, 30).forEach((s, n) => {
      const b = el('button', 'spot'); b.type = 'button';
      b.style.left = Math.min(100, Math.max(0, +s.x || 0)) + '%';
      b.style.top = Math.min(100, Math.max(0, +s.y || 0)) + '%';
      b.setAttribute('aria-label', str(s.title, 120) || 'Point ' + (n + 1));
      b.append(el('span', '', String(n + 1)));
      b.onclick = e => {
        e.stopPropagation();
        if (open === b) { card.hidden = true; open = null; b.classList.remove('on'); return }
        wrap.querySelectorAll('.spot.on').forEach(x => x.classList.remove('on'));
        b.classList.add('on'); open = b;
        card.replaceChildren(el('b', '', str(s.title, 120)), el('p', '', str(s.text, 800)));
        const x = +s.x || 0, y = +s.y || 0;
        card.style.left = Math.min(70, Math.max(2, x - 14)) + '%';
        card.style.top = (y > 60 ? 'auto' : (y + 6) + '%');
        card.style.bottom = (y > 60 ? (100 - y + 6) + '%' : 'auto');
        card.hidden = false;
      };
      wrap.append(b);
    });
    wrap.addEventListener('click', () => { card.hidden = true; if (open) open.classList.remove('on'); open = null });
    wrap.append(card);
    box.append(wrap);
    if (str(d.caption)) box.append(el('figcaption', '', str(d.caption, 300)));
    return box;
  }

  /* Before / after: { before, after, labelBefore, labelAfter, start } */
  function compare(d) {
    const box = el('figure', 'tzb tzb-compare'), wrap = el('div', 'cmp-wrap');
    const a = img(d.after, d.labelAfter, 'cmp-after'), top = el('div', 'cmp-top'), b = img(d.before, d.labelBefore, 'cmp-before');
    top.append(b);
    const handle = el('div', 'cmp-handle'), range = el('input', 'cmp-range');
    range.type = 'range'; range.min = 0; range.max = 100; range.step = .1;
    range.value = Math.min(95, Math.max(5, +d.start || 50));
    range.setAttribute('aria-label', 'Drag to compare');
    const set = () => { wrap.style.setProperty('--cmp', range.value + '%') };
    range.addEventListener('input', set); set();
    wrap.append(a, top, handle, range);
    if (str(d.labelBefore)) wrap.append(el('span', 'cmp-label l', str(d.labelBefore, 40)));
    if (str(d.labelAfter)) wrap.append(el('span', 'cmp-label r', str(d.labelAfter, 40)));
    box.append(wrap);
    if (str(d.caption)) box.append(el('figcaption', '', str(d.caption, 300)));
    return box;
  }

  /* Flip cards: { cards: [{ img, title, rarity: 3 | 4 | 5, back }] } */
  function cards(d) {
    const box = el('div', 'tzb tzb-cards');
    (Array.isArray(d.cards) ? d.cards : []).slice(0, 12).forEach(c => {
      const r = [3, 4, 5].includes(+c.rarity) ? +c.rarity : 4;
      const b = el('button', 'fc r' + r); b.type = 'button';
      b.setAttribute('aria-label', 'Flip the card: ' + str(c.title, 80));
      const inner = el('span', 'fc-inner'), front = el('span', 'fc-face fc-front'), back = el('span', 'fc-face fc-back');
      front.append(el('span', 'fc-star', '★'.repeat(r)));
      if (src(c.img)) front.append(img(c.img, '', 'fc-pic'));
      front.append(el('b', 'fc-title', str(c.title, 80)));
      back.append(el('span', 'fc-star', '★'.repeat(r)), el('b', 'fc-title', str(c.title, 80)), el('p', '', str(c.back, 400)));
      inner.append(front, back); b.append(inner);
      b.onclick = () => b.classList.toggle('flipped');
      box.append(b);
    });
    return box;
  }

  /* Story slides (the Liminal Outliers making-of "notes" scene Nero loved): a picture per slide, a navy box along
     the bottom typing the text, red progress dashes, tap to go on.
     { slides: [{ img, label, who, red, quote, text }] }: who = speaker tag (empty = NOTES), red = speaker tag in red */
  function slides(d) {
    const list = (Array.isArray(d.slides) ? d.slides : []).slice(0, 40);
    const box = el('div', 'tzb tzb-slides'), stage = el('div', 'sl-stage');
    const tag = el('div', 'sl-tag'), dot = el('b', '', '●'), label = el('span');
    tag.append(dot, label);
    const dots = el('div', 'sl-dots');
    list.forEach(() => dots.append(el('i')));
    const pic = el('div', 'sl-pic'), im = img('', '');
    pic.append(im);
    const say = el('div', 'sl-box'), who = el('div', 'sl-who'), line = el('div', 'sl-txt'), nx = el('div', 'sl-nx', 'TAP ▸');
    say.append(who, line, nx);
    stage.append(tag, dots, pic, say);
    box.append(stage);
    list.forEach(s => { if (src(s.img)) { const p = new Image(); p.src = src(s.img) } });
    let k = 0, tm = null, full = '';
    const finish = () => { clearInterval(tm); tm = null; line.textContent = full };
    function show() {
      const s = list[k] || {};
      // An empty picture keeps the one before it (going back to the start, the last one shown before it)
      let u = ''; for (let j = k; j >= 0 && !u; j--) u = src(list[j].img);
      if (u && im.getAttribute('src') !== u) { im.classList.add('out'); setTimeout(() => { im.src = u; im.classList.remove('out') }, 220) }
      pic.hidden = !u;
      label.textContent = str(s.label, 80);
      who.textContent = str(s.who, 30) || 'NOTES';
      who.className = 'sl-who' + (s.red ? ' n' : '');
      line.className = 'sl-txt' + (s.quote ? ' q' : '');
      [...dots.children].forEach((x, j) => { x.className = j <= k ? 'on' : '' });
      full = str(s.text, 600); line.textContent = ''; let c = 0;
      clearInterval(tm);
      tm = setInterval(() => { c += 2; line.textContent = full.slice(0, c); if (c >= full.length) finish() }, 18);
    }
    const next = () => { if (tm) return finish(); k = (k + 1) % Math.max(1, list.length); show() };
    stage.tabIndex = 0;
    stage.setAttribute('role', 'button');
    stage.setAttribute('aria-label', 'Story slides: tap or press Enter for the next one');
    stage.addEventListener('click', next);
    stage.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); next() } });
    if (list.length) show();
    return box;
  }

  const KINDS = { vn, hotspots, compare, cards, slides };
  return {
    KINDS: Object.keys(KINDS),
    render(blockData) {
      const k = blockData && KINDS[blockData.kind];
      if (!k) return null;
      try { return k(blockData.data || {}) } catch (e) { return null }
    },
  };
})();
