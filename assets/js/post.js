/* Post page: /post/<slug> is served by post.html; the article loads live from Wix.
   Layout: cover on top of a white paper sheet, then meta, title, standfirst, body, and a closing footer. */
(() => {
  const slug = decodeURIComponent(location.pathname.replace(/^\/post\/?/, '').replace(/\/$/, ''));
  const art = document.getElementById('article');
  const status = document.getElementById('status');
  const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text) e.textContent = text; return e };

  function fail(msg) {
    if (!status) return; // a frozen page already shows the article
    status.textContent = msg;
    const a = el('a', '', ' Read it on the journal →');
    a.href = WIX.JOURNAL + (slug ? '/post/' + slug : '/posts');
    status.appendChild(a);
  }

  function crumbs(post) {
    const nav = document.getElementById('crumbs');
    const a = el('a', '', WIX.category(post).label); a.href = WIX.categoryUrl(post);
    nav.append(el('span', '', '/'), a);
  }

  function more(post) {
    WIX.latest(4).then(posts => {
      const others = posts.filter(p => p.slug !== post.slug).slice(0, 3);
      if (!others.length) return;
      const fresh = el('nav', 'side-box side-fresh'); fresh.setAttribute('aria-label', 'Fresh from the journal');
      fresh.append(el('span', 'tag', 'Fresh from the journal'));
      others.forEach(p => {
        const a = el('a'); a.href = '/post/' + p.slug; a.dataset.say = WIX.lineKey(p);
        a.append(el('b', '', p.title), el('span', 'meta', WIX.category(p).label + ' · ' + WIX.date(p.firstPublishedDate)));
        fresh.append(a);
      });
      const rail = document.querySelector('.rail-r'); if (rail) rail.append(fresh);
      const grid = document.getElementById('more-grid');
      grid.replaceChildren(...others.map(p => WIX.card(p)));
      document.getElementById('more').hidden = false;
      window.TZ && TZ.bindTilt(grid);
    }).catch(() => {});
  }

  // Desktop sidebar: what the article covers (its section headings) and where it came from
  function side(post, body) {
    const aside = document.getElementById('side');
    const left = el('div', 'rail rail-l'), right = el('div', 'rail rail-r');
    aside.append(left, right);
    const box = el('div', 'side-box side-meta');
    const who = el('div', 'side-who');
    who.append(el('span', 'side-avatar', WIX.author(post).charAt(0)), el('strong', '', WIX.author(post)));
    box.append(el('span', 'tag', WIX.category(post).label), who, el('span', 'meta', WIX.date(post.firstPublishedDate) + (post.minutesToRead ? ' · ' + post.minutesToRead + ' min read' : '')));
    // How far through the article the reader is
    const prog = el('div', 'side-progress'), bar = el('i'), pct = el('span', 'meta', '0% read');
    prog.append(bar); box.append(prog, pct);
    const sheet = art.querySelector('.post-sheet');
    const track = () => {
      const r = sheet.getBoundingClientRect(), total = r.height - innerHeight * .6;
      const v = Math.max(0, Math.min(1, (innerHeight * .4 - r.top) / Math.max(1, total)));
      bar.style.width = (v * 100).toFixed(1) + '%'; pct.textContent = v >= .99 ? 'Finished. Thanks for reading!' : Math.round(v * 100) + '% read';
    };
    addEventListener('scroll', track, { passive: true }); track();
    const copy = el('button', 'side-btn', 'Copy link'); copy.type = 'button';
    copy.onclick = () => { navigator.clipboard && navigator.clipboard.writeText(location.href).then(() => { copy.textContent = 'Link copied'; setTimeout(() => { copy.textContent = 'Copy link' }, 1800) }) };
    box.append(copy);
    left.append(box);
    const heads = [...body.querySelectorAll('h2')];
    if (heads.length > 1) {
      const toc = el('nav', 'side-box toc'); toc.setAttribute('aria-label', 'In this article');
      toc.append(el('span', 'tag', 'In this article'));
      const ol = el('ol');
      heads.forEach((h, i) => {
        h.id = h.id || 's' + (i + 1);
        const a = el('a', '', h.textContent.replace(/^[^\p{L}\p{N}]+/u, '')); a.href = '#' + h.id;
        const li = el('li'); li.append(a); ol.append(li);
      });
      toc.append(ol); right.append(toc);
      const links = [...ol.querySelectorAll('a')];
      const spy = new IntersectionObserver(es => es.forEach(e => {
        if (e.isIntersecting) links.forEach(l => l.classList.toggle('on', l.hash === '#' + e.target.id));
      }), { rootMargin: '0px 0px -70% 0px' });
      heads.forEach(h => spy.observe(h));
    }
    if (!post.own) {
      const orig = el('a', 'side-link', 'Comments and likes on the original →'); orig.href = WIX.wixUrl(post);
      box.append(orig);
    }
    aside.hidden = false;
  }

  // Ache's note on an old gacha post: he's the critic now, and keeps players safe (written per article, frozen with it)
  const LEVELS = { warning: 'Player safety · warning', caution: 'Player safety · heads up', cheer: 'Player safety · proud of you' };
  function acheNote(post) {
    const a = post.ache;
    const box = el('aside', 'ache-note lv-' + (LEVELS[a.level] ? a.level : 'caution'));
    box.setAttribute('aria-label', "Ache's note on this article");
    box.dataset.say = 'ache-' + post.slug;
    if (window.TZ && TZ.addLines && a.lines) TZ.addLines('ache-' + post.slug, a.lines);
    const face = el('span', 'ache-face'); face.setAttribute('aria-hidden', 'true');
    face.innerHTML = '<svg viewBox="0 0 24 24"><path d="M12 0l2.6 9.4L24 12l-9.4 2.6L12 24l-2.6-9.4L0 12l9.4-2.6z"/><circle cx="12" cy="12" r="2.8"/><circle cx="12.8" cy="11.3" r="1"/></svg>';
    const main = el('div', 'ache-main');
    main.append(el('span', 'ache-kicker', LEVELS[a.level] || LEVELS.caution), el('h3', '', a.title), el('p', '', a.note));
    if (a.watch && a.watch.length) {
      const ul = el('ul', 'ache-watch'); ul.setAttribute('aria-label', 'Watch out for');
      a.watch.forEach(w => ul.append(el('li', '', w)));
      main.append(ul);
    }
    if (a.tip) { const t = el('p', 'ache-tip'); t.append(el('b', '', 'Ache’s tip '), document.createTextNode(a.tip)); main.append(t) }
    main.append(el('span', 'ache-sign', '— Ache, critic and player bodyguard (self-appointed)'));
    box.append(face, main);
    return box;
  }

  if (!slug) { fail('No article here.'); return }

  // Archive and own posts are saved in the site (pre-rendered page + its data file); the rest load live from Wix
  const frozen = document.documentElement.hasAttribute('data-frozen');
  const source = frozen ? WIX.frozen(slug).catch(() => WIX.bySlug(slug)) : WIX.bySlug(slug);
  source.then(post => {
    if (!post) throw new Error('missing');
    const cat = WIX.category(post);
    document.title = post.title + ' · TZERØ';
    if (!document.querySelector('link[rel=canonical]')) {
      const canon = document.createElement('link'); canon.rel = 'canonical'; canon.href = 'https://tzero.live/post/' + post.slug;
      document.head.appendChild(canon);
    }
    const desc = document.querySelector('meta[name=description]');
    if (desc && post.excerpt) desc.content = post.excerpt;

    const parts = [];
    const cov = WIX.cover(post);
    if (cov) {
      const fig = el('figure', 'post-cover'); fig.dataset.say = 'image';
      const img = el('img'); img.src = cov.url; img.alt = cov.alt;
      if (cov.width) { img.width = cov.width; img.height = cov.height }
      fig.appendChild(img); parts.push(fig);
    }

    const sheet = el('div', 'post-sheet');
    const head = el('div', 'post-head');
    const meta = el('div', 'post-meta');
    const tag = el('a', 'tag', cat.label); tag.href = WIX.categoryUrl(post);
    meta.append(tag, el('span', '', WIX.date(post.firstPublishedDate)), el('span', '', 'by ' + WIX.author(post)));
    if (post.minutesToRead) meta.append(el('span', '', post.minutesToRead + ' min read'));
    head.append(meta, el('h1', '', post.title));
    const body = el('div', 'post-body');
    body.appendChild(RICOS.render(post.richContent));
    // Standfirst from the excerpt, unless the article already opens with the same words
    const ex = (post.excerpt || '').trim();
    const opening = ex.split(/\s+/).slice(0, 4).join(' ');
    const echoed = [...body.querySelectorAll('p')].slice(0, 3).some(p => p.textContent.trim().replace(/\s+/g, ' ').startsWith(opening));
    if (ex && !echoed) head.append(el('p', 'post-dek', ex));

    const foot = el('div', 'post-foot');
    foot.append(el('span', '', 'Written by ' + WIX.author(post) + ' · ' + cat.label + ' · ' + WIX.date(post.firstPublishedDate)));
    if (!post.own) {
      const orig = el('a', 'btn', 'Comments and likes on the original →'); orig.href = WIX.wixUrl(post);
      foot.append(orig);
    }

    sheet.append(head);
    if (post.ache) sheet.append(acheNote(post));
    sheet.append(body, foot);
    parts.push(sheet);
    art.replaceChildren(...parts);
    art.removeAttribute('aria-busy');
    crumbs(post);
    side(post, body);
    more(post);
  }).catch(() => fail("This article didn't load from the nightly build."));
})();
