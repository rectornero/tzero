/* Homepage: the Latest shelf, loaded live from the nightly build on Wix. */
(() => {
  const grid = document.getElementById('latest-grid');
  const note = document.getElementById('latest-note');


  // The second polaroid on the hero is Ache's pick of the newest piece (the first save stays if nothing loads)
  const NOTES = {
    Devlog: ['fresh from the workbench. Nero wrote it, I supervised. loudly.', 'new devlog. I am mentioned. probably.'],
    Studio: ['new from the studio. I approved it. eventually.', 'hot off the desk. read it before it cools.'],
    Archive: ['an old letter, dusted off. with my face.']
  };
  function pick(post) {
    const pol = document.querySelector('.polaroid[data-pick="b"]'), cov = post && WIX.cover(post);
    if (!pol || !cov) return;
    const img = pol.querySelector('.pol-front img'), label = WIX.category(post).label, lines = NOTES[label] || NOTES.Studio;
    img.src = cov.url; img.alt = cov.alt || post.title;
    pol.querySelector('.cap').textContent = post.title;
    pol.querySelector('.pol-kick').textContent = "Ache's pick · " + label;
    pol.querySelector('.pol-note').textContent = lines[Math.floor(Math.random() * lines.length)];
    const a = pol.querySelector('.pol-open'); a.href = '/post/' + post.slug; a.textContent = 'Read it →';
  }

  WIX.latest(3).then(posts => {
    if (!posts.length) throw new Error('empty');
    grid.replaceChildren(...posts.map(p => WIX.card(p)));
    grid.removeAttribute('aria-busy');
    window.TZ && TZ.bindTilt(grid);
    pick(posts[0]);
  }).catch(() => {
    grid.removeAttribute('aria-busy');
    grid.querySelectorAll('.card').forEach(c => c.classList.remove('loading'));
    note.textContent = "The nightly build didn't answer. Read the latest on the journal instead.";
    const a = document.createElement('a'); a.href = WIX.JOURNAL + '/posts'; a.textContent = ' Open the journal →';
    note.appendChild(a);
  });
})();
