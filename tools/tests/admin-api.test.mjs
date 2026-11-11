// Server tests for the site desk and the AI desk, with Netlify Blobs faked in memory.
//   node tools/tests/admin-api.test.mjs
import assert from 'node:assert/strict';
process.env.TZ_CLAUDE_KEY = 'test-key-test-key-test-key-123';
const { handle: content } = await import('../../netlify/functions/content.mjs');
const { handle: site } = await import('../../netlify/functions/site.mjs');
const { handle: ai } = await import('../../netlify/functions/ai.mjs');
const { issue } = await import('../../netlify/lib/admin.mjs');

function fakeStore() {
  const m = new Map(); let n = 0;
  return {
    m,
    async get(k, o = {}) { const v = m.get(k); return v ? (o.type === 'json' ? JSON.parse(v.data) : v.data) : null },
    async getWithMetadata(k, o = {}) { const v = m.get(k); return v ? { data: o.type === 'json' ? JSON.parse(v.data) : v.data, etag: v.etag, metadata: v.metadata } : null },
    async getMetadata(k) { const v = m.get(k); return v ? { etag: v.etag, metadata: v.metadata } : null },
    async setJSON(k, val, o = {}) { return this.set(k, JSON.stringify(val), o) },
    async set(k, data, o = {}) {
      const cur = m.get(k);
      if (o.onlyIfNew && cur) return { modified: false };
      if (o.onlyIfMatch && (!cur || cur.etag !== o.onlyIfMatch)) return { modified: false };
      m.set(k, { data, etag: 'e' + ++n, metadata: o.metadata || {} }); return { modified: true, etag: 'e' + n };
    },
    async delete(k) { m.delete(k) },
    async list({ prefix = '' } = {}) { return { blobs: [...m.keys()].filter(k => k.startsWith(prefix)).map(key => ({ key })) } },
  };
}
const d = { store: fakeStore(), media: fakeStore(), auth: fakeStore(), purge: async () => {} };
d.contentDeps = d;
const KEY = { authorization: 'Bearer ' + process.env.TZ_CLAUDE_KEY };
const cookie = (await issue(d.auth, { id: 34218910, login: 'rectornero' })).split(';')[0];
const NERO = { cookie, 'x-tz': '1' };
const call = async (fn, method, path, body, headers = {}) => {
  const h = { ...headers }; let payload;
  if (body !== undefined) { payload = JSON.stringify(body); h['content-type'] = 'application/json' }
  const r = await fn(new Request('https://t.local' + path, { method, headers: h, body: payload }), d);
  const text = await r.text(); let j; try { j = JSON.parse(text) } catch (e) { j = text }
  return { status: r.status, body: j, headers: r.headers };
};
let n = 0; const ok = (what, cond) => { assert.ok(cond, what); n++ };

// --- public settings ---
let r = await call(site, 'GET', '/api/site');
ok('public site', r.status === 200 && r.body.notice === null && r.body.flags['cq-wip'] === true && !('claude' in r.body) && !('links' in r.body));
ok('cached on the CDN', /s-maxage=600/.test(r.headers.get('netlify-cdn-cache-control')) && r.headers.get('netlify-cache-tag') === 'site');
// --- gates ---
ok('settings need sign-in', (await call(site, 'GET', '/api/settings')).status === 401);
ok('writes need the site header', (await call(site, 'PATCH', '/api/settings', { patch: {} }, { cookie })).status === 403);
ok('ai needs the key', (await call(ai, 'GET', '/api/ai/state')).status === 401);
ok('ai refuses a wrong key', (await call(ai, 'GET', '/api/ai/state', undefined, { authorization: 'Bearer nope-nope-nope-nope-nope-nope!' })).status === 401);
// --- Nero changes settings ---
r = await call(site, 'PATCH', '/api/settings', { patch: { notice: { on: true, text: 'Starchasers v0.9 is out', link: '/starchasers', linkText: 'Look' }, links: { demo: 'https://example.com/x' }, newsletter: { provider: 'kit', id: '1234567' } } }, NERO);
ok('Nero saves', r.status === 200 && r.body.settings.notice.on);
r = await call(site, 'GET', '/api/site');
ok('notice is public', r.body.notice.text === 'Starchasers v0.9 is out' && r.body.newsletter.id === '1234567');
r = await call(site, 'GET', '/go/demo');
ok('short link', r.status === 302 && r.headers.get('location') === 'https://example.com/x');
ok('unknown short link goes home', (await call(site, 'GET', '/go/nope')).headers.get('location') === '/');
r = await call(site, 'PATCH', '/api/settings', { patch: { notice: { link: 'javascript:alert(1)' } } }, NERO);
ok('bad link refused', r.status === 400 && r.body.details.includes('notice.link'));
r = await call(site, 'PATCH', '/api/settings', { patch: { hide: { paths: [{ path: '/admin' }] } } }, NERO);
ok('cannot hide the admin', r.status === 400);
// expired notice
await call(site, 'PATCH', '/api/settings', { patch: { notice: { until: '2020-01-01T00:00:00Z' } } }, NERO);
ok('expired notice hidden', (await call(site, 'GET', '/api/site')).body.notice === null);
await call(site, 'PATCH', '/api/settings', { patch: { notice: { until: '' } } }, NERO);

// --- Claude: state, permissions ---
r = await call(ai, 'GET', '/api/ai/state', undefined, KEY);
ok('state', r.status === 200 && r.body.alone.includes('takedowns') && r.body.ask.includes('publish'));
r = await call(ai, 'PATCH', '/api/ai/settings', { patch: { notice: { text: 'Claude was here' } }, note: 'testing' }, KEY);
ok('Claude must ask for the notice', r.status === 202 && r.body.proposed);
ok('notice unchanged', (await call(site, 'GET', '/api/site')).body.notice.text === 'Starchasers v0.9 is out');
r = await call(ai, 'PATCH', '/api/ai/settings', { patch: { claude: { publish: true } } }, KEY);
ok('Claude cannot raise its own permissions', r.status === 202 || r.status === 403);
const selfProp = r.body.proposal;
r = await call(ai, 'POST', '/api/ai/takedown', { type: 'image', value: 'starchasers/crew-', note: 'crew art ban' }, KEY);
ok('Claude may take down', r.status === 200 && r.body.settings.hide.images[0].match === 'starchasers/crew-');
ok('takedown is public', (await call(site, 'GET', '/api/site')).body.hide.images[0] === 'starchasers/crew-');
r = await call(ai, 'POST', '/api/ai/takedown', { type: 'post', value: 'some-old-post', note: 'old characters' }, KEY);
ok('post takedown', r.status === 200);
// --- Claude writes an article in Markdown ---
const md = '::kicker STUDIO NOTES · TEST\n\nHello **world**, this is a [link](https://example.com).\n\n## First part\n\nSome text here.\n\n![A ship](/assets/img/starchasers/title-key-art.webp "The ship"){1280x720}\n\n## Second part\n\nMore text.';
r = await call(ai, 'PUT', '/api/ai/posts/test-article', { title: 'Test article', excerpt: 'An excerpt.', markdown: md, category: 'devlog', world: 'starchasers' }, KEY);
ok('draft saved', r.status === 200 && r.body.ok && !r.body.published && r.body.draft === 'test-article');
r = await call(ai, 'GET', '/api/ai/posts/test-article', undefined, KEY);
ok('reads back as the same Markdown', r.body.draft.markdown.trim() === md && r.body.draft.category === 'devlog' && r.body.draft.world === 'starchasers' && r.body.draft.author === 'Claude');
r = await call(ai, 'GET', '/api/ai/posts/test-article/parts', undefined, KEY);
ok('parts', r.body.parts.length === 7 && r.body.parts[2].kind === 'heading');
// Ache's lines for a part and for a section
r = await call(ai, 'POST', '/api/ai/posts/test-article/ache?parts=1', { after: 4, lines: ['that ship is mine.', 'I named it. nobody asked.'], show: 'bubble' }, KEY);
ok('Ache lines on a part', r.status === 200 && r.body.parts[5].kind === 'block:ache' && r.body.parts[5].ache.show === 'bubble');
r = await call(ai, 'POST', '/api/ai/posts/test-article/ache?parts=1', { heading: 'second part', lines: ['the second part. my favourite. after the first.'] }, KEY);
ok('Ache lines on a section', r.status === 200 && r.body.parts.at(-1).ache.scope === 'section');
r = await call(ai, 'POST', '/api/ai/posts/test-article/ache?parts=1', { after: 1 }, KEY);
ok('Ache lines need lines', r.status === 400);
r = await call(ai, 'GET', '/api/ai/posts/test-article', undefined, KEY);
ok('markers in Markdown', r.body.draft.markdown.includes(':::ache scope=part show=bubble\nthat ship is mine.') && r.body.draft.markdown.includes(':::ache scope=section show=hidden'));
r = await call(ai, 'DELETE', '/api/ai/posts/test-article/ache/5', undefined, KEY);
ok('remove a marker', r.status === 200 && r.body.markers === 1);
// licensing check
r = await call(ai, 'POST', '/api/ai/posts/test-article/check', { markdown: md + '\n\n![crew](/assets/img/starchasers/crew-aria.webp)' }, KEY);
ok('taken-down picture is an error', r.body.errors.some(e => e.includes('taken down')) && r.body.warnings.some(w => w.includes('licensing')));
r = await call(ai, 'PUT', '/api/ai/posts/test-article', { markdown: md + '\n\n![crew](/assets/img/starchasers/crew-aria.webp)' }, KEY);
ok('and refused on save', r.status === 400);
// publish: must ask
r = await call(content, 'PUT', '/api/admin/item/test-article', { post: { title: 'x', richContent: { nodes: [] } }, publish: true }, KEY);
ok('Claude cannot publish directly', r.status === 403);
r = await call(ai, 'POST', '/api/ai/posts/test-article/publish', { note: 'ready' }, KEY);
ok('publish becomes a proposal', r.status === 202);
const pubProp = r.body.proposal;
ok('not live yet', (await call(content, 'GET', '/api/content/test-article')).status === 404);
// Nero answers
r = await call(site, 'GET', '/api/settings/proposals', undefined, NERO);
ok('Nero sees proposals', r.body.proposals.length === 3);
r = await call(site, 'POST', '/api/settings/proposals/' + pubProp, { action: 'approve' }, { ...KEY });
ok('Claude cannot approve', r.status === 403);
r = await call(site, 'POST', '/api/settings/proposals/' + pubProp, { action: 'approve' }, NERO);
ok('Nero approves the publish', r.status === 200);
r = await call(content, 'GET', '/api/content/test-article');
ok('the card carries the world', (await call(content, 'GET', '/api/content')).body.posts[0].world === 'starchasers');
ok('a bad world is refused', (await call(ai, 'PUT', '/api/ai/posts/test-article', { world: 'Not A Key!' }, KEY)).status === 400);
ok('live, signed by Claude', r.status === 200 && r.body.authorName === 'Claude' && r.body.richContent.nodes.some(x => x.type === 'TZ_BLOCK' && x.blockData.kind === 'ache'));
r = await call(site, 'POST', '/api/settings/proposals/' + selfProp, { action: 'decline', note: 'no' }, NERO);
ok('Nero declines', r.status === 200);
ok('twice is refused', (await call(site, 'POST', '/api/settings/proposals/' + selfProp, { action: 'approve' }, NERO)).status === 409);
ok('still must ask', (await call(ai, 'GET', '/api/ai/state?full=1', undefined, KEY)).body.mustAsk.includes('publish'));
// Nero opens publishing and the notice to Claude
r = await call(site, 'PATCH', '/api/settings', { patch: { claude: { publish: true, notice: true } } }, NERO);
ok('Nero opens areas', r.status === 200 && r.body.settings.claude.publish);
r = await call(ai, 'PATCH', '/api/ai/settings', { patch: { notice: { text: 'Now allowed' } } }, KEY);
ok('Claude changes the notice alone', r.status === 200 && (await call(site, 'GET', '/api/site')).body.notice.text === 'Now allowed');
r = await call(ai, 'PUT', '/api/ai/posts/second', { title: 'Second', markdown: 'Hi.' }, KEY);
r = await call(ai, 'POST', '/api/ai/posts/second/publish', {}, KEY);
ok('Claude publishes when allowed', r.status === 200 && r.body.published);
// lines
r = await call(ai, 'POST', '/api/ai/lines', { topics: { 'test-set': { lines: [{ t: 'a new line' }] } }, note: 'for the test' }, KEY);
ok('lines become a proposal', r.status === 202);
r = await call(site, 'POST', '/api/settings/proposals/' + r.body.proposal, { action: 'approve' }, NERO);
ok('Nero approves lines', r.status === 200);
ok('lines are in /api/site', (await call(site, 'GET', '/api/site')).body.lines['test-set'][0] === 'a new line');
ok('and still in /api/lines', (await call(content, 'GET', '/api/lines')).body.lines['test-set'][0] === 'a new line');
// versions + restore
r = await call(site, 'GET', '/api/settings/versions', undefined, NERO);
ok('versions', r.body.versions.length >= 3);
const oldest = r.body.versions.at(-1);
r = await call(site, 'POST', '/api/settings/restore/' + encodeURIComponent(oldest), undefined, NERO);
ok('restore', r.status === 200 && r.body.settings.notice.text === 'Starchasers v0.9 is out' && r.body.settings.claude.publish === false);
// log
r = await call(ai, 'GET', '/api/ai/log?limit=100', undefined, KEY);
ok('activity log', r.body.log.length > 10 && r.body.log.some(l => l.action === 'published' && l.by === 'rectornero') && r.body.log.some(l => l.by === 'claude'));
// media
const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==', 'base64');
r = await call(ai, 'POST', '/api/ai/media', { base64: png.toString('base64'), type: 'image/png' }, KEY);
ok('upload', r.status === 200 && /^\/api\/media\/.+\.png$/.test(r.body.url));
const mid = r.body.url.split('/').pop();
r = await call(content, 'GET', '/api/admin/media', undefined, NERO);
ok('media list', r.body.media.length === 1 && r.body.media[0].by === 'claude');
ok('media delete', (await call(content, 'DELETE', '/api/admin/media/' + mid, undefined, NERO)).status === 200 && (await call(content, 'GET', '/api/media/' + mid)).status === 404);
// --- the cheap paths: one text, edits, batches ---
const full = `---
title: One call article
excerpt: Everything in one text.
category: devlog
world: liminal-outliers
cover: /assets/img/starchasers/title-key-art.webp | The ship | 1600x900
publish: ask
---
::kicker DEVLOG · TEST

## Part one

Words here.

:::ache scope=section
a line for part one
:::

:::cards
Miriam | 5 | /api/media/abcdefghijkl.webp | She notices things.
:::

:::achenote level=cheer title="Proud of this one"
A short note.
> hello from the note
:::`;
r = await call(ai, 'PUT', '/api/ai/posts/one-call', { markdown: full }, KEY);
ok('whole article in one text, asking to publish', r.status === 200 && r.body.draft === 'one-call' && r.body.proposed === true);
ok('Nero approves', (await call(site, 'POST', '/api/settings/proposals/' + r.body.proposal, { action: 'approve' }, NERO)).status === 200);
r = await call(ai, 'GET', '/api/ai/posts/one-call?as=text', undefined, KEY);
ok('reads back as one text', typeof r.body === 'string' && r.body.includes('title: One call article') && r.body.includes('world: liminal-outliers') && r.body.includes(':::cards\nMiriam | 5 |') && r.body.includes(':::achenote level=cheer') && r.body.includes('cover: /assets/img/starchasers/title-key-art.webp | The ship | 1600x900'));
r = await call(content, 'GET', '/api/content/one-call');
ok('note and blocks are stored', r.body.ache.title === 'Proud of this one' && r.body.richContent.nodes.some(x => x.type === 'TZ_BLOCK' && x.blockData.kind === 'cards' && x.blockData.data.cards[0].rarity === 5));
r = await call(ai, 'GET', '/api/ai/posts/one-call?as=outline', undefined, KEY);
ok('outline', r.body.split('\n').length === 3 && r.body.includes('heading Part one'));
r = await call(ai, 'POST', '/api/ai/posts/one-call/edit', { edits: [{ find: 'Words here.', replace: 'Better words here.' }, { after: 'Better words', insert: '### A new bit\n\nInserted text.' }, { append: '---' }], set: { excerpt: 'Changed.' } }, KEY);
ok('edit without resending', r.status === 200 && r.body.parts === 8);
r = await call(ai, 'GET', '/api/ai/posts/one-call?as=text', undefined, KEY);
ok('edit landed', r.body.includes('Better words here.\n\n### A new bit\n\nInserted text.') && r.body.includes('excerpt: Changed.') && r.body.trim().endsWith('---') && r.body.includes(':::achenote'));
r = await call(ai, 'POST', '/api/ai/posts/one-call/edit', { edits: [{ find: 'not there', replace: 'x' }] }, KEY);
ok('a missed edit changes nothing', r.status === 400 && /edit 1/.test(r.body.error));
r = await call(ai, 'POST', '/api/ai/posts/one-call/edit', { edits: [{ remove: 'Inserted text.' }, { remove: 'Miriam | 5' }] }, KEY);
ok('remove blocks', r.status === 200 && r.body.parts === 6);
r = await call(ai, 'POST', '/api/ai/do', { ops: [
  { op: 'write', slug: 'batch-one', markdown: '---\ntitle: Batch one\n---\n## A\n\nText.\n\n## B\n\nMore.' },
  { op: 'ache', slug: 'batch-one', many: [{ heading: 'A', lines: ['for a'] }, { heading: 'B', lines: ['for b'], show: 'bubble' }] },
  { op: 'takedown', type: 'path', value: '/lab', note: 'batch test' },
  { op: 'read', slug: 'batch-one', as: 'outline' },
] }, KEY);
ok('batch', r.status === 200 && r.body.results.length === 4 && r.body.results[1].markers === 2 && r.body.results[3].includes('block:ache for b'));
r = await call(ai, 'POST', '/api/ai/do', { ops: [{ op: 'read', slug: 'nope-nope' }, { op: 'state' }] }, KEY);
ok('batch stops at an error', r.status === 207 && r.body.results[0].failed && r.body.results[1].stopped);
r = await call(ai, 'GET', '/api/ai/state', undefined, KEY);
ok('brief state is small', JSON.stringify(r.body).length < 2500 && r.body.live.hidden.paths.includes('/lab') && r.body.posts.some(x => x.startsWith('one-call [live]')));
for (const t of ['start', 'markdown', 'blocks', 'ache', 'settings', 'templates']) ok('guide ' + t, (await call(ai, 'GET', '/api/ai/guide/' + t, undefined, KEY)).body.length > 200);
// the template in the guide is itself a valid article
r = await call(ai, 'GET', '/api/ai/guide/templates', undefined, KEY);
const tpl = r.body.slice(r.body.indexOf('---\ntitle'), r.body.indexOf('\nDEVLOG:')).replace('publish: ask\n', '');
r = await call(ai, 'PUT', '/api/ai/posts/from-template', { markdown: tpl }, KEY);
ok('the template saves', r.status === 200);
// MCP
const rpc = (method, params, id = 1) => call(ai, 'POST', '/api/mcp', { jsonrpc: '2.0', id, method, params }, KEY);
r = await rpc('initialize', { protocolVersion: '2025-06-18', capabilities: {}, clientInfo: { name: 't', version: '1' } });
ok('mcp initialize', r.body.result.serverInfo.name === 'tzero-admin');
ok('mcp notification', (await call(ai, 'POST', '/api/mcp', { jsonrpc: '2.0', method: 'notifications/initialized' }, KEY)).status === 202);
r = await rpc('tools/list');
ok('mcp: six tools, small list', r.body.result.tools.length === 6 && JSON.stringify(r.body.result.tools).length < 2600 && r.body.result.tools.every(t => t.inputSchema.type === 'object'));
r = await call(ai, 'POST', '/api/mcp?tools=all', { jsonrpc: '2.0', id: 1, method: 'tools/list' }, KEY);
ok('mcp: all tools on request', r.body.result.tools.length > 20);
r = await rpc('tools/call', { name: 'write', arguments: { slug: 'from-mcp', markdown: '---\ntitle: From MCP\n---\nBody.\n\n## A\n\nText.' } });
ok('mcp write', !r.body.result.isError && JSON.parse(r.body.result.content[0].text).ok);
r = await rpc('tools/call', { name: 'do', arguments: { ops: [{ op: 'ache', slug: 'from-mcp', heading: 'A', lines: ['hello from a tool'] }] } });
ok('mcp do', !r.body.result.isError);
r = await rpc('tools/call', { name: 'read', arguments: { slug: 'from-mcp' } });
ok('mcp read is plain text', r.body.result.content[0].text.startsWith('---\n# from-mcp · draft\ntitle: From MCP') && r.body.result.content[0].text.includes('hello from a tool'));
r = await rpc('tools/call', { name: 'edit', arguments: { slug: 'from-mcp', edits: [{ find: 'Body.', replace: 'A better body.' }] } });
ok('mcp edit', !r.body.result.isError);
r = await rpc('tools/call', { name: 'read', arguments: {} });
ok('mcp missing argument', r.body.result.isError);
r = await rpc('tools/call', { name: 'guide', arguments: { topic: 'ache' } });
ok('mcp guide', r.body.result.content[0].text.includes(':::ache'));
r = await rpc('tools/call', { name: 'state', arguments: {} });
ok('mcp state is compact', !r.body.result.content[0].text.includes('\n '));
ok('mcp needs the key', (await call(ai, 'POST', '/api/mcp', { jsonrpc: '2.0', id: 1, method: 'tools/list' })).status === 401);
console.log('all', n, 'checks passed');
