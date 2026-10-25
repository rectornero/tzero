/* Homepage: the Latest shelf, loaded live from the nightly build on Wix. */
(() => {
  const grid = document.getElementById('latest-grid');
  const note = document.getElementById('latest-note');

  function card(post) {
    const cat = WIX.category(post);
    const a = document.createElement('a');
    a.className = 'card tilt';
    a.href = '/post/' + post.slug;
    a.dataset.say = WIX.lineKey(post);
    const tag = document.createElement('span'); tag.className = 'tag'; tag.textContent = cat.label;
    const h = document.createElement('h4'); h.textContent = post.title;
    const p = document.createElement('p'); p.textContent = (post.excerpt || '').split(/(?<=[.!?])\s/)[0];
    const meta = document.createElement('span'); meta.className = 'meta';
    meta.textContent = WIX.date(post.firstPublishedDate) + ' · by ' + WIX.author(post);
    a.append(tag, h, p, meta);
    return a;
  }

  WIX.latest(3).then(posts => {
    if (!posts.length) throw new Error('empty');
    grid.replaceChildren(...posts.map(card));
    grid.removeAttribute('aria-busy');
    window.TZ && TZ.bindTilt(grid);
  }).catch(() => {
    grid.removeAttribute('aria-busy');
    grid.querySelectorAll('.card').forEach(c => c.classList.remove('loading'));
    note.textContent = "The nightly build didn't answer. Read the latest on tzero.live instead.";
    const a = document.createElement('a'); a.href = 'https://www.tzero.live/posts'; a.textContent = ' Open the journal →';
    note.appendChild(a);
  });
})();
