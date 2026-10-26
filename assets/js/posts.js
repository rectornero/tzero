/* Post listings: /posts, /posts/categories/<slug> and /posts/tags/<slug> are served by posts.html
   (same paths as the Wix blog, so old links keep working). Posts load live from Wix. */
(() => {
  const m = /^\/posts(?:\/(categories|tags)\/([^/]+))?\/?$/.exec(location.pathname) || [];
  const kind = m[1], slug = m[2] && decodeURIComponent(m[2]);
  const grid = document.getElementById('shelf-grid');
  const status = document.getElementById('status');
  const btn = document.getElementById('more-btn');
  const $ = id => document.getElementById(id);
  const BLURBS = {
    devlog: 'How the games get made: scenes, drafts, decisions.',
    studio: 'News and choices from Artache Creative Studio.',
    archive: "TZERØ's early issues, 2017 to 2026: guides, reviews and essays.",
  };
  const EMPTY = {
    devlog: 'No devlogs yet. The first one is being written: the tape is still rewinding.',
  };
  const PAGE = 24;
  let filter = {}, offset = 0, total = 0;

  function fail(msg, journalPath) {
    grid.removeAttribute('aria-busy');
    status.hidden = false;
    status.textContent = msg;
    const a = document.createElement('a'); a.textContent = ' Open it on the journal →'; a.href = WIX.JOURNAL + journalPath;
    status.appendChild(a);
  }

  function page() {
    btn.disabled = true;
    return WIX.list({ ...filter, offset, limit: PAGE }).then(({ posts, total: t }) => {
      total = t; offset += posts.length;
      grid.append(...posts.map(p => WIX.card(p)));
      grid.removeAttribute('aria-busy');
      window.TZ && TZ.bindTilt(grid);
      status.hidden = offset > 0;
      if (!offset) status.textContent = EMPTY[slug] || 'Nothing here yet.';
      btn.hidden = !posts.length || offset >= total;
      btn.disabled = false;
      btn.textContent = 'Load more (' + (total - offset) + ' left)';
    });
  }

  function show(label, kicker, sub, active) {
    $('shelf-title').textContent = label;
    $('shelf-kicker').textContent = kicker;
    $('shelf-sub').textContent = sub;
    document.title = label + ' · TZERØ';
    document.querySelectorAll('.shelf-tabs a').forEach(a => a.toggleAttribute('aria-current', a.getAttribute('href') === active));
    const canon = document.createElement('link'); canon.rel = 'canonical'; canon.href = 'https://tzero.live' + location.pathname.replace(/\/$/, '');
    document.head.appendChild(canon);
    if (kind) {
      const nav = $('crumbs'), s = document.createElement('span'), b = document.createElement('span');
      s.textContent = '/'; b.textContent = label; nav.append(s, b);
    }
  }

  btn.onclick = () => page().catch(() => { btn.disabled = false; btn.textContent = 'Try again' });

  const find = kind === 'categories' ? WIX.categoryBySlug(slug) : kind === 'tags' ? WIX.tagBySlug(slug) : Promise.resolve(null);
  find.then(found => {
    if (kind && !found) throw new Error('missing');
    if (kind === 'categories') { filter = { category: found.id }; show(found.label, 'Section', BLURBS[slug] || 'Posts in ' + found.label + '.', '/posts/categories/' + slug) }
    else if (kind === 'tags') { filter = { tag: found.id }; show('#' + found.label, 'Tag', 'Posts tagged ' + found.label + '.', '') }
    else show('All posts', 'The journal', 'Everything in TZERØ, newest first.', '/posts');
    return page();
  }).catch(() => fail(kind ? "This shelf didn't load from the nightly build." : "The nightly build didn't answer.", location.pathname));
})();
