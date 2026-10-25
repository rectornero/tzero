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
  // Ache's news mood: the newest post with this Wix tag makes Ache grieve on it (no deploy needed)
  const NEWS_TAG_SLUG = 'ache-grief';
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

  function lineKey(post) { return LINE_KEYS[post.slug] || 'post-' + category(post).key }

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
    // Resolves null when the tag exists but no post carries it (news over); rejects when the tag is missing
    async news() {
      const t = await get('/blog/v3/tags/slugs/' + NEWS_TAG_SLUG);
      if (!t.tag || !t.tag.id) throw new Error('no news tag');
      const j = await get('/blog/v3/posts?tagIds=' + t.tag.id + '&paging.limit=1');
      const post = (j.posts || [])[0];
      return post ? { topic: post.slug, key: lineKey(post), mood: 'grief', lines: 'grief' } : null;
    },
    category,
    cover,
    mediaUrl,
    author: post => AUTHORS[post.memberId] || 'TZERØ',
    lineKey,
    wixUrl: post => (post.url ? post.url.base + post.url.path : 'https://www.tzero.live/post/' + post.slug),
    date: iso => new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }),
    categoryUrl: post => 'https://www.tzero.live/posts/categories/' + category(post).key,
    // A post as a white card: used by the Latest shelf and by "Keep reading" under articles
    card(post) {
      const a = document.createElement('a');
      a.className = 'card tilt';
      a.href = '/post/' + post.slug;
      a.dataset.say = this.lineKey(post);
      const tag = document.createElement('span'); tag.className = 'tag'; tag.textContent = category(post).label;
      const h = document.createElement('h4'); h.textContent = post.title;
      const p = document.createElement('p'); p.textContent = (post.excerpt || '').split(/(?<=[.!?])\s/)[0];
      const meta = document.createElement('span'); meta.className = 'meta';
      meta.textContent = this.date(post.firstPublishedDate) + ' · by ' + this.author(post);
      a.append(tag, h, p, meta);
      return a;
    },
  };
})();
