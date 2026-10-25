/* Reads the TZERØ blog on Wix (the "nightly build") from the visitor's browser.
   Wix Headless, anonymous visitor token: read-only, no secret, no server. */
window.WIX = (() => {
  const CLIENT_ID = 'f30f6412-8c39-4ba3-8544-cb9a9b81ec70';
  const API = 'https://www.wixapis.com';
  const TAG_TZERO = 'ee35b6d4-c6dc-490a-83cd-4cd17980a6bc';
  const CATEGORIES = {
    '986847d2-3b96-464b-8b8b-338e07845d9c': { label: 'Devlog', key: 'devlog' },
    'de8055a9-ce06-426e-a47f-d860d026981f': { label: 'Studio', key: 'studio' },
    '6fecd53b-e26c-46ca-a508-d8b36cda3c3b': { label: 'Archive', key: 'archive' },
  };
  const AUTHORS = {
    '38ba494c-02f6-400e-9e2d-5cb850448e7a': 'Nero',
    '1c53b988-3af9-4c8b-b6d4-0db133c2b09c': 'Claude',
  };
  // Posts that have their own critter lines in lines.json
  const LINE_KEYS = {
    'pokemon-unite-doesnt-have-to-die': 'unite',
    'artache-a-studio-opens-its-doors': 'artache',
  };
  const STORE = 'tz-wix-token';

  function load() { try { return JSON.parse(sessionStorage.getItem(STORE)) } catch (e) { return null } }
  function save(t) { try { sessionStorage.setItem(STORE, JSON.stringify(t)) } catch (e) {} }

  async function mint(body) {
    const r = await fetch(API + '/oauth2/token', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    if (!r.ok) throw new Error('token ' + r.status);
    const j = await r.json();
    const t = { access: j.access_token, refresh: j.refresh_token, until: Date.now() + (j.expires_in - 60) * 1000 };
    save(t);
    return t;
  }

  let pending = null;
  async function token(fresh) {
    const t = load();
    if (!fresh && t && t.until > Date.now()) return t.access;
    if (!pending) {
      pending = (t && t.refresh
        ? mint({ clientId: CLIENT_ID, grantType: 'refresh_token', refreshToken: t.refresh }).catch(() => mint({ clientId: CLIENT_ID, grantType: 'anonymous' }))
        : mint({ clientId: CLIENT_ID, grantType: 'anonymous' })
      ).finally(() => { pending = null });
    }
    return (await pending).access;
  }

  async function get(path) {
    let r = await fetch(API + path, { headers: { Authorization: await token() } });
    if (r.status === 401 || r.status === 403) r = await fetch(API + path, { headers: { Authorization: await token(true) } });
    if (!r.ok) throw new Error(path + ' ' + r.status);
    return r.json();
  }

  function category(post) {
    for (const id of post.categoryIds || []) if (CATEGORIES[id]) return CATEGORIES[id];
    return CATEGORIES['6fecd53b-e26c-46ca-a508-d8b36cda3c3b'];
  }

  function cover(post) {
    const img = post.media && post.media.wixMedia && post.media.wixMedia.image;
    return img ? { url: img.url || mediaUrl(img.id), width: img.width, height: img.height, alt: post.title } : null;
  }

  function mediaUrl(id) { return /^https?:/.test(id) ? id : 'https://static.wixstatic.com/media/' + id }

  return {
    async latest(n = 3) {
      const j = await get('/blog/v3/posts?tagIds=' + TAG_TZERO + '&paging.limit=' + n + '&fieldsets=URL');
      return j.posts || [];
    },
    async bySlug(slug) {
      const j = await get('/blog/v3/posts/slugs/' + encodeURIComponent(slug) + '?fieldsets=RICH_CONTENT&fieldsets=URL&fieldsets=SEO');
      return j.post;
    },
    category,
    cover,
    mediaUrl,
    author: post => AUTHORS[post.memberId] || 'TZERØ',
    lineKey: post => LINE_KEYS[post.slug] || 'post-' + category(post).key,
    wixUrl: post => (post.url ? post.url.base + post.url.path : 'https://www.tzero.live/post/' + post.slug),
    date: iso => new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }),
  };
})();
