// Builds assets/search.json: one small row per post saved in the site (title, excerpt, section, world, date),
// read by the search palette (assets/js/tools.js) only when a reader opens it. Re-run after freeze-archive.
import fs from 'node:fs'; import path from 'node:path';
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const CATS = { '986847d2-3b96-464b-8b8b-338e07845d9c': 'Devlog', 'de8055a9-ce06-426e-a47f-d860d026981f': 'Studio', '6fecd53b-e26c-46ca-a508-d8b36cda3c3b': 'Archive' };
const dir = path.join(ROOT, 'post-data'), rows = [];
const words = n => { let c = 0; (function walk(x) { if (!x) return; if (x.textData) c += (x.textData.text.match(/\S+/g) || []).length; (x.nodes || []).forEach(walk) })(n); return c };
for (const f of fs.readdirSync(dir)) {
  if (!f.endsWith('.json') || f === 'index.json') continue;
  const p = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));
  const cat = (p.categoryIds || []).map(id => CATS[id]).find(Boolean) || 'Archive';
  const world = p.world || (!p.own && cat === 'Archive' ? 'archive' : '');
  rows.push({ s: p.slug, t: p.title, e: (p.excerpt || '').slice(0, 180), c: cat, w: world, d: (p.firstPublishedDate || '').slice(0, 10), m: p.minutesToRead || Math.max(1, Math.round(words(p.richContent) / 230)) });
}
rows.sort((a, b) => b.d.localeCompare(a.d));
fs.writeFileSync(path.join(ROOT, 'assets/search.json'), JSON.stringify(rows));
console.log('search.json:', rows.length, 'posts');
