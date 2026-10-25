/* Post page: /post/<slug> is served by post.html; the article loads live from Wix.
   Layout: cover on top of a white paper sheet, then meta, title, standfirst, body, and a closing footer. */
(() => {
  const slug = decodeURIComponent(location.pathname.replace(/^\/post\/?/, '').replace(/\/$/, ''));
  const art = document.getElementById('article');
  const status = document.getElementById('status');
  const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text) e.textContent = text; return e };

  function fail(msg) {
    status.textContent = msg;
    const a = el('a', '', ' Read it on tzero.live →');
    a.href = slug ? 'https://www.tzero.live/post/' + slug : 'https://www.tzero.live/posts';
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
      const grid = document.getElementById('more-grid');
      grid.replaceChildren(...others.map(p => WIX.card(p)));
      document.getElementById('more').hidden = false;
      window.TZ && TZ.bindTilt(grid);
    }).catch(() => {});
  }

  // Desktop sidebar: what the article covers (its section headings) and where it came from
  function side(post, body) {
    const aside = document.getElementById('side');
    const box = el('div', 'side-box');
    box.append(el('span', 'tag', WIX.category(post).label), el('strong', '', WIX.author(post)), el('span', 'meta', WIX.date(post.firstPublishedDate) + (post.minutesToRead ? ' · ' + post.minutesToRead + ' min read' : '')));
    aside.append(box);
    const heads = [...body.querySelectorAll('h2')];
    if (heads.length > 1) {
      const toc = el('nav', 'side-box toc'); toc.setAttribute('aria-label', 'In this article');
      toc.append(el('span', 'tag', 'In this article'));
      const ol = el('ol');
      heads.forEach((h, i) => {
        h.id = h.id || 's' + (i + 1);
        const a = el('a', '', h.textContent); a.href = '#' + h.id;
        const li = el('li'); li.append(a); ol.append(li);
      });
      toc.append(ol); aside.append(toc);
      const links = [...ol.querySelectorAll('a')];
      const spy = new IntersectionObserver(es => es.forEach(e => {
        if (e.isIntersecting) links.forEach(l => l.classList.toggle('on', l.hash === '#' + e.target.id));
      }), { rootMargin: '0px 0px -70% 0px' });
      heads.forEach(h => spy.observe(h));
    }
    const orig = el('a', 'side-link', 'Comments and likes on the original →'); orig.href = WIX.wixUrl(post);
    aside.append(orig);
    aside.hidden = false;
  }

  if (!slug) { fail('No article here.'); return }

  WIX.bySlug(slug).then(post => {
    if (!post) throw new Error('missing');
    const cat = WIX.category(post);
    document.title = post.title + ' · TZERØ';
    const canon = document.createElement('link'); canon.rel = 'canonical'; canon.href = WIX.wixUrl(post);
    document.head.appendChild(canon);
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
    if (ex && !body.textContent.replace(/\s+/g, ' ').includes(ex.slice(0, 40))) head.append(el('p', 'post-dek', ex));

    const foot = el('div', 'post-foot');
    foot.append(el('span', '', 'Written by ' + WIX.author(post) + ' · ' + cat.label + ' · ' + WIX.date(post.firstPublishedDate)));
    const orig = el('a', 'btn', 'Comments and likes on the original →'); orig.href = WIX.wixUrl(post);
    foot.append(orig);

    sheet.append(head, body, foot);
    parts.push(sheet);
    art.replaceChildren(...parts);
    art.removeAttribute('aria-busy');
    crumbs(post);
    side(post, body);
    more(post);
  }).catch(() => fail("This article didn't load from the nightly build."));
})();
