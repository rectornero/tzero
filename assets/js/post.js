/* Post page: /post/<slug> is served by post.html; the article loads live from Wix. */
(() => {
  const slug = decodeURIComponent(location.pathname.replace(/^\/post\/?/, '').replace(/\/$/, ''));
  const art = document.getElementById('article');
  const status = document.getElementById('status');

  function fail(msg) {
    status.textContent = msg;
    const a = document.createElement('a');
    a.href = slug ? 'https://www.tzero.live/post/' + slug : 'https://www.tzero.live/posts';
    a.textContent = ' Read it on tzero.live →';
    status.appendChild(a);
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

    const head = document.createElement('header'); head.className = 'post-head';
    const kicker = document.createElement('div'); kicker.className = 'kicker';
    kicker.textContent = cat.label + ' · ' + WIX.date(post.firstPublishedDate) + ' · by ' + WIX.author(post) + (post.minutesToRead ? ' · ' + post.minutesToRead + ' min' : '');
    const h1 = document.createElement('h1'); h1.textContent = post.title;
    head.append(kicker, h1);
    const cov = WIX.cover(post);
    if (cov) {
      const fig = document.createElement('figure'); fig.className = 'post-cover'; fig.dataset.say = 'image';
      const img = document.createElement('img'); img.src = cov.url; img.alt = cov.alt;
      if (cov.width) { img.width = cov.width; img.height = cov.height }
      fig.appendChild(img); head.appendChild(fig);
    }
    const body = document.createElement('div'); body.className = 'post-body';
    body.appendChild(RICOS.render(post.richContent));
    const end = document.createElement('p'); end.className = 'post-end';
    const a = document.createElement('a'); a.href = WIX.wixUrl(post); a.textContent = 'Comments and likes live on the original at tzero.live →';
    end.appendChild(a);
    art.replaceChildren(head, body, end);
    art.removeAttribute('aria-busy');
  }).catch(() => fail("This article didn't load from the nightly build."));
})();
