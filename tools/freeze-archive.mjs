// Freezes the archive: every old post (not Studio or Devlog) becomes a ready-made page at /post/<slug>
// plus its data file at /post-data/<slug>.json, so search engines read real HTML and the archive no
// longer depends on Wix. Run by hand, never on Netlify (no build step):
//   node tools/freeze-archive.mjs [snapshot.json]      (needs jsdom: npm i jsdom)
// Re-run it after changing post.html, post.js, ricos.js, tools/ache-notes.json or tools/cuts.json.
// The snapshot is the Wix posts list with RICH_CONTENT, URL and SEO fieldsets, as one JSON array.
// Without a snapshot only the site's own posts are rendered and the frozen archive stays as it is.
// Own posts: since the move away from Wix, new articles are written here as tools/posts/<slug>.json
// (a post object in the same Ricos format). They render the same way, get "own": true, and are listed
// in /post-data/index.json, which the Latest shelf and the listings merge with the posts still on Wix.
import fs from 'node:fs';
import path from 'node:path';
import { JSDOM } from 'jsdom';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const LIVE = new Set(['986847d2-3b96-464b-8b8b-338e07845d9c', 'de8055a9-ce06-426e-a47f-d860d026981f']); // Devlog, Studio
const KEEP = ['own', 'ache', 'id', 'title', 'excerpt', 'firstPublishedDate', 'lastPublishedDate', 'url', 'slug', 'categoryIds', 'tagIds', 'memberId', 'minutesToRead', 'media', 'richContent'];
const SITE = 'https://tzero.live';

const posts = process.argv[2] ? JSON.parse(fs.readFileSync(process.argv[2], 'utf8')) : [];
const ownDir = path.join(ROOT, 'tools/posts');
const own = fs.existsSync(ownDir) ? fs.readdirSync(ownDir).filter(f => f.endsWith('.json')).sort()
  .map(f => ({ ...JSON.parse(fs.readFileSync(path.join(ownDir, f), 'utf8')), own: true })) : [];
posts.push(...own);
// Ache's notes on the old gacha posts (tools/ache-notes.json, keyed by slug) are frozen with their post
const notesFile = path.join(ROOT, 'tools/ache-notes.json');
const notes = fs.existsSync(notesFile) ? JSON.parse(fs.readFileSync(notesFile, 'utf8')) : {};
for (const p of posts) if (notes[p.slug]) p.ache = notes[p.slug];
// Sentences that broke off in an old move get a visible marker (tools/cuts.json: slug -> text before the break)
const cutsFile = path.join(ROOT, 'tools/cuts.json');
const cuts = fs.existsSync(cutsFile) ? JSON.parse(fs.readFileSync(cutsFile, 'utf8')) : {};
function markCuts(node, frags, found) {
  const kids = node.nodes || [];
  for (let i = 0; i < kids.length; i++) {
    const t = kids[i].textData;
    if (!t) { markCuts(kids[i], frags, found); continue; }
    for (const f of frags) {
      const at = t.text.indexOf(f);
      if (at < 0 || found.has(f)) continue;
      found.add(f);
      const end = at + f.length, rest = t.text.slice(end);
      const mark = { type: 'TEXT', textData: { text: '[text lost in a move]', decorations: [{ type: 'CUT' }] } };
      const tail = rest.trim() ? [{ ...kids[i], textData: { ...t, text: ' ' + rest.replace(/^\s+/, '') } }] : [];
      t.text = t.text.slice(0, end) + ' ';
      kids.splice(i + 1, 0, mark, ...tail);
      i++;
    }
  }
}
for (const p of posts) if (cuts[p.slug]) {
  const found = new Set();
  markCuts(p.richContent || {}, cuts[p.slug], found);
  for (const f of cuts[p.slug]) if (!found.has(f)) throw new Error('cut not found in ' + p.slug + ': ' + f);
}
const template = fs.readFileSync(path.join(ROOT, 'post.html'), 'utf8');
const js = f => fs.readFileSync(path.join(ROOT, 'assets/js', f), 'utf8');
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

fs.mkdirSync(path.join(ROOT, 'post'), { recursive: true });
fs.mkdirSync(path.join(ROOT, 'post-data'), { recursive: true });

async function render(post) {
  const dom = new JSDOM(template, { url: SITE + '/post/' + encodeURIComponent(post.slug), runScripts: 'outside-only' });
  const w = dom.window;
  w.IntersectionObserver = class { observe() {} disconnect() {} };
  w.eval(js('wix.js')); w.eval(js('ricos.js'));
  w.WIX.bySlug = async () => post;
  w.WIX.latest = async () => { throw new Error('offline') };
  w.eval(js('post.js'));
  for (let i = 0; i < 20 && w.document.getElementById('article').hasAttribute('aria-busy'); i++) await new Promise(r => setTimeout(r, 5));
  const art = w.document.getElementById('article');
  if (art.hasAttribute('aria-busy')) throw new Error('did not render: ' + post.slug);
  return { html: art.innerHTML, cat: w.WIX.category(post), author: w.WIX.author(post), cover: w.WIX.cover(post) };
}

function seo(post) {
  const tags = (post.seoData && post.seoData.tags) || [];
  const title = tags.find(t => t.type === 'title' && t.children);
  const desc = tags.find(t => t.type === 'meta' && t.props && t.props.name === 'description');
  return { title: title ? title.children : post.title, desc: desc ? desc.props.content : (post.excerpt || '') };
}

const frozen = [];
for (const post of posts) {
  if (!post.own && (post.categoryIds || []).some(id => LIVE.has(id))) continue;
  const { html, cat, author, cover } = await render(post);
  const meta = seo(post), url = SITE + '/post/' + post.slug;
  const ld = { '@context': 'https://schema.org', '@type': 'BlogPosting', headline: post.title, datePublished: post.firstPublishedDate, dateModified: post.lastPublishedDate, author: { '@type': 'Person', name: author }, publisher: { '@type': 'Organization', name: 'Artache Creative Studio' }, mainEntityOfPage: url, articleSection: cat.label };
  if (cover) ld.image = cover.url;
  let page = template
    .replace('<html lang="en">', '<html lang="en" data-frozen>')
    .replace(/<title>[^<]*<\/title>/, '<title>' + esc(post.title) + ' · TZERØ</title>')
    .replace(/<meta name="description" content="[^"]*">/, '<meta name="description" content="' + esc(meta.desc) + '">\n<link rel="canonical" href="' + esc(url) + '">\n<meta property="og:type" content="article">\n<meta property="og:title" content="' + esc(meta.title) + '">\n<meta property="og:description" content="' + esc(meta.desc) + '">\n<meta property="og:url" content="' + esc(url) + '">' + (cover ? '\n<meta property="og:image" content="' + esc(cover.url) + '">' : '') + '\n<script type="application/ld+json">' + JSON.stringify(ld).replace(/</g, '\\u003c') + '</script>')
    .replace(/<article id="article" class="post" aria-busy="true">[\s\S]*?<\/article>/, '<article id="article" class="post">' + html + '</article>');
  if (!page.includes('data-frozen') || !page.includes('rel="canonical"')) throw new Error('template changed: ' + post.slug);
  fs.writeFileSync(path.join(ROOT, 'post', post.slug + '.html'), page);
  const data = {}; for (const k of KEEP) if (k in post) data[k] = post[k];
  fs.writeFileSync(path.join(ROOT, 'post-data', post.slug + '.json'), JSON.stringify(data));
  frozen.push({ slug: post.slug, lastmod: (post.lastPublishedDate || post.firstPublishedDate || '').slice(0, 10) });
}

const rendered = frozen.length;

// The own posts' cards, newest first: read by the Latest shelf and the listings
const CARD = ['own', 'id', 'title', 'excerpt', 'firstPublishedDate', 'slug', 'categoryIds', 'tagIds', 'memberId', 'media'];
const index = own.map(p => { const c = {}; for (const k of CARD) if (k in p) c[k] = p[k]; return c })
  .sort((a, b) => (b.firstPublishedDate || '').localeCompare(a.firstPublishedDate || ''));
fs.writeFileSync(path.join(ROOT, 'post-data/index.json'), JSON.stringify(index));

// Sitemap: the site's own pages plus every post saved here (posts still on Wix are listed by the journal)
for (const f of fs.readdirSync(path.join(ROOT, 'post-data'))) {
  if (!f.endsWith('.json') || f === 'index.json' || frozen.some(x => x.slug + '.json' === f)) continue;
  const p = JSON.parse(fs.readFileSync(path.join(ROOT, 'post-data', f), 'utf8'));
  frozen.push({ slug: p.slug, lastmod: (p.lastPublishedDate || p.firstPublishedDate || '').slice(0, 10) });
}
const pages = ['/', '/posts', '/studio', '/lab', '/redache', '/story'];
const xml = '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
  + pages.map(p => '  <url><loc>' + SITE + p + '</loc></url>').join('\n') + '\n'
  + frozen.map(f => '  <url><loc>' + esc(SITE + '/post/' + encodeURI(f.slug)) + '</loc><lastmod>' + f.lastmod + '</lastmod></url>').join('\n')
  + '\n</urlset>\n';
fs.writeFileSync(path.join(ROOT, 'sitemap.xml'), xml);
console.log('rendered', rendered, 'posts (' + own.length + ' own); sitemap lists', frozen.length);
