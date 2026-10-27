/* /people: who writes TZERØ. /people/<slug>: one person's profile and their articles.
   Profiles come from /api/people (cached on Netlify's CDN); Nero edits his in /admin, and invites the others. */
(() => {
  const root = document.getElementById('people');
  const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e };
  const slug = decodeURIComponent(location.pathname.replace(/^\/people\/?/, '').replace(/\/$/, ''));
  const NERO = '38ba494c-02f6-400e-9e2d-5cb850448e7a', CLAUDE = '1c53b988-3af9-4c8b-b6d4-0db133c2b09c';
  const CLAUDE_PROFILE = { slug: 'claude', name: 'Claude', role: 'AI collaborator', avatar: '/assets/img/claude.png', bio: 'An AI by Anthropic. Writes some of the articles here with Nero, builds the site, and makes the playable scenes. With AI. By People.', links: [] };
  const safe = u => { try { const x = new URL(u, location.href); return /^https?:$/.test(x.protocol) ? x.href : null } catch (e) { return null } };
  const avatarOf = p => {
    const a = el('span', 'pp-avatar');
    const src = p.avatar && (p.avatar.startsWith('/') ? p.avatar : safe(p.avatar));
    if (src) { const i = el('img'); i.src = src; i.alt = ''; i.loading = 'lazy'; a.append(i) } else a.textContent = (p.name || '?').charAt(0);
    return a;
  };
  const done = () => root.removeAttribute('aria-busy');

  fetch('/api/people').then(r => r.ok ? r.json() : { people: [] }).catch(() => ({ people: [] })).then(async ({ people }) => {
    const list = people || [];
    // Nero shows up even before his first sign-in to the editor creates his profile
    if (!list.some(x => x.role === 'Founder')) list.unshift({ slug: 'nero', name: 'Nero', role: 'Founder', avatar: '', bio: 'Founder of Artache Creative Studio. Writes TZERØ, makes visual novels and games.', links: [] });
    const all = list.concat(CLAUDE_PROFILE);
    if (!slug) {
      document.title = 'People · TZERØ';
      const head = el('div', 'pp-head');
      head.append(el('span', 'tag', 'The crew'), el('h1', '', 'The people behind TZERØ'), el('p', 'post-dek', 'Who writes here, and what they make. With AI. By People.'));
      const grid = el('div', 'pp-grid');
      all.forEach(p => {
        const a = el('a', 'pp-card tilt'); a.href = '/people/' + encodeURIComponent(p.slug);
        a.append(avatarOf(p), el('b', '', p.name), el('span', 'meta', p.role), el('p', '', (p.bio || '').split(/(?<=[.!?])\s/)[0]));
        grid.append(a);
      });
      root.replaceChildren(head, grid); done();
      window.TZ && TZ.bindTilt && TZ.bindTilt(grid);
      return;
    }
    const p = all.find(x => x.slug === slug);
    if (!p) { root.replaceChildren(el('p', 'post-status', 'Nobody here by that name.')); done(); return }
    document.title = p.name + ' · TZERØ';
    const card = el('div', 'pp-profile');
    const info = el('div');
    info.append(el('span', 'tag', p.role), el('h1', '', p.name));
    if (p.bio) info.append(el('p', 'post-dek', p.bio));
    const links = el('div', 'pp-links');
    (p.links || []).forEach(l => { const h = safe(l.url); if (!h) return; const a = el('a', 'skin', l.label || new URL(h).hostname); a.href = h; a.target = '_blank'; a.rel = 'noopener nofollow me'; links.append(a) });
    if (links.children.length) info.append(links);
    card.append(avatarOf(p), info);
    const posts = (await WIX.ownPosts()).filter(x => x.authorSlug === p.slug || (!x.authorSlug && ((p.slug === 'claude' && x.memberId === CLAUDE) || (p.role === 'Founder' && x.memberId === NERO))));
    const sec = el('section', 'more');
    sec.append(el('h2', '', posts.length ? 'Written by ' + p.name : 'No articles yet'));
    const grid = el('div', 'grid'); posts.forEach(x => grid.append(WIX.card(x)));
    sec.append(grid);
    root.replaceChildren(card, sec); done();
    window.TZ && TZ.bindTilt && TZ.bindTilt(grid);
  });
})();
