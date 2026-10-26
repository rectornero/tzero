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
  // Where the Wix site lives once tzero.live points at this site (comments, likes, old pages)
  const JOURNAL = 'https://journal.tzero.live';
  const OWN_HOSTS = /^(www\.|journal\.)?tzero\.live$/;

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

  const LIST_FIELDS = '&fieldsets=URL';

  const WIX_MEDIA = 'https://static.wixstatic.com/media/';
  let picsP;
  function cardPics() {
    return picsP || (picsP = fetch('/assets/card-pics.json').then(r => r.ok ? r.json() : {}).catch(() => ({})));
  }

  return {
    JOURNAL,
    CATEGORIES,
    async latest(n = 3) {
      const j = await get('/blog/v3/posts?tagIds=' + TAG_TZERO + '&paging.limit=' + n + '&fieldsets=URL');
      return j.posts || [];
    },
    // A frozen archive post: the same post object, saved in the site at /post-data/<slug>.json
    async frozen(slug) {
      const r = await fetch('/post-data/' + encodeURIComponent(slug) + '.json');
      if (!r.ok) throw new Error('frozen ' + r.status);
      return r.json();
    },
    async bySlug(slug) {
      const j = await get('/blog/v3/posts/slugs/' + encodeURIComponent(slug) + '?fieldsets=RICH_CONTENT&fieldsets=URL&fieldsets=SEO');
      return j.post;
    },
    // One page of a listing: all posts, a category or a tag. Resolves { posts, total }
    async list({ category, tag, offset = 0, limit = 24 } = {}) {
      let q = '/blog/v3/posts?paging.limit=' + limit + '&paging.offset=' + offset + LIST_FIELDS;
      if (category) q += '&categoryIds=' + category;
      if (tag) q += '&tagIds=' + tag;
      const j = await get(q);
      return { posts: j.posts || [], total: (j.metaData && j.metaData.total) || 0 };
    },
    async categoryBySlug(slug) {
      for (const id in CATEGORIES) if (CATEGORIES[id].key === slug) return { id, label: CATEGORIES[id].label };
      const j = await get('/blog/v3/categories/slugs/' + encodeURIComponent(slug));
      return j.category ? { id: j.category.id, label: j.category.label } : null;
    },
    async tagBySlug(slug) {
      const j = await get('/blog/v3/tags/slugs/' + encodeURIComponent(slug));
      return j.tag ? { id: j.tag.id, label: j.tag.label } : null;
    },
    // Links to tzero.live pages this site renders itself become local paths (same tab); other
    // tzero.live pages go to the journal on Wix. Anything else is not ours: null.
    localHref(url) {
      let u; try { u = new URL(url, location.href) } catch (e) { return null }
      if (!OWN_HOSTS.test(u.hostname) && u.host !== location.host) return null;
      if (/^\/(post\/[^/]+|posts(\/(categories|tags)\/[^/]+)?)\/?$/.test(u.pathname)) return u.pathname.replace(/\/$/, '') + u.hash;
      if (/^\/(studio|artache)\/?$/.test(u.pathname)) return '/studio';
      if (u.pathname === '/' || u.pathname === '') return '/' + u.hash;
      return u.host === location.host ? null : JOURNAL + u.pathname + u.search + u.hash;
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
    // The post on Wix. Wix reports its own primary address, so this follows the domain switch by itself
    wixUrl: post => (post.url && post.url.base && new URL(post.url.base).host !== location.host ? post.url.base + post.url.path : JOURNAL + '/post/' + post.slug),
    date: iso => new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }),
    categoryUrl: post => '/posts/categories/' + category(post).key,
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
      // A picture on top: the cover, else the post's video thumbnail or first picture (assets/card-pics.json)
      const pic = url => {
        const img = document.createElement('img');
        img.className = 'card-pic';
        // Wix crops to 16:9 so the card only downloads what it shows
        img.src = url.startsWith(WIX_MEDIA) ? url.split('/v1/')[0] + '/v1/fill/w_640,h_360,al_c,q_80/' + encodeURIComponent(post.slug) + '.jpg' : url;
        img.alt = ''; img.loading = 'lazy'; img.decoding = 'async';
        img.onerror = () => { img.remove(); a.classList.remove('has-pic') };
        // YouTube answers a removed video with a 120px grey stand-in instead of an error
        img.onload = () => img.naturalWidth <= 120 && img.onerror();
        a.prepend(img);
        a.classList.add('has-pic');
      };
      const c = cover(post);
      if (c) pic(c.url);
      else cardPics().then(m => m[post.slug] && pic(m[post.slug]));
      return a;
    },
  };
})();
