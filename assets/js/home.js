/* Homepage: the Latest shelf, loaded live from the nightly build on Wix. */
(() => {
  const grid = document.getElementById('latest-grid');
  const note = document.getElementById('latest-note');


  WIX.latest(3).then(posts => {
    if (!posts.length) throw new Error('empty');
    grid.replaceChildren(...posts.map(p => WIX.card(p)));
    grid.removeAttribute('aria-busy');
    window.TZ && TZ.bindTilt(grid);
  }).catch(() => {
    grid.removeAttribute('aria-busy');
    grid.querySelectorAll('.card').forEach(c => c.classList.remove('loading'));
    note.textContent = "The nightly build didn't answer. Read the latest on the journal instead.";
    const a = document.createElement('a'); a.href = WIX.JOURNAL + '/posts'; a.textContent = ' Open the journal →';
    note.appendChild(a);
  });
})();
