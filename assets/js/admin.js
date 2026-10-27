/* /admin: Nero's WYSIWYG editor. Articles and pages are written on a sheet that looks like the published post and
   saved through /api/admin (netlify/functions/content.mjs) as Ricos JSON, the format ricos.js already draws.
   Safety: the sheet's HTML is never saved. On save, and on every paste, it is read back node by node into plain
   Ricos (text, a few marks, safe links); anything else is dropped. Pictures, videos, scenes and crafted blocks are
   sealed boxes in the sheet (contenteditable=false) that carry their Ricos node as data. */
(() => {
  const $ = id => document.getElementById(id);
  const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e };
  const TAG_TZERO = 'ee35b6d4-c6dc-490a-83cd-4cd17980a6bc';
  const RED = '#d7182a', NAVY = '#13224b';
  const ATOMS = new Set(['IMAGE', 'GALLERY', 'VIDEO', 'HTML', 'TZ_BLOCK', 'TABLE', 'BUTTON', 'CODE_BLOCK']);
  const body = $('body'), title = $('f-title'), dek = $('f-dek');
  const store = { get(k) { try { return JSON.parse(localStorage.getItem(k)) } catch (e) { return null } }, set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)) } catch (e) {} } };

  let local = false;          // no server: drafts live in this browser only
  let me = { role: 'owner', name: 'Nero', slug: 'nero' }; // who is signed in (from /api/auth/me)
  let doc = null;             // { slug, kind, published, savedAt }
  let dirty = false;

  // ---- Server ----
  async function api(path, opts = {}) {
    const r = await fetch(path, { credentials: 'same-origin', ...opts, headers: { 'x-tz': '1', ...(opts.body && typeof opts.body === 'string' ? { 'Content-Type': 'application/json' } : {}), ...(opts.headers || {}) } });
    const j = await r.json().catch(() => ({}));
    if (r.status === 401) { gate('Your session ended. Sign in again.'); throw new Error('signed out') }
    if (!r.ok) throw new Error((j.details || [j.error || r.status]).join(', '));
    return j;
  }
  const status = (t, bad) => { const s = $('status'); s.textContent = t; s.classList.toggle('bad', Boolean(bad)) };

  // ---- Fingerprint: the same 8 characters Claude posts with any code it gives Nero ----
  async function fingerprint(code) {
    const norm = String(code).replace(/\r\n?/g, '\n').trim();
    const h = new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(norm)));
    const hex = [...h.slice(0, 4)].map(b => b.toString(16).padStart(2, '0')).join('').toUpperCase();
    return hex.slice(0, 4) + '-' + hex.slice(4);
  }

  // ---- Sheet -> Ricos (the only way content leaves the editor) ----
  function safeHref(url) {
    try { const u = new URL(url, location.href); return /^(https?|mailto):$/.test(u.protocol) ? u.href : null } catch (e) { return null }
  }
  const HEX = /^#[0-9a-f]{3,8}$/i;
  // Never read, not even their text
  const DROP = /^(SCRIPT|STYLE|NOSCRIPT|TEMPLATE|IFRAME|OBJECT|EMBED|SVG|MATH|CANVAS|VIDEO|AUDIO|IMG|PICTURE|SELECT|TEXTAREA|BUTTON|INPUT|HEAD|TITLE|META|LINK)$/;
  function cssColor(c) {
    if (!c) return null;
    if (HEX.test(c)) return c.toLowerCase();
    const m = /rgba?\((\d+),\s*(\d+),\s*(\d+)/.exec(c);
    return m ? '#' + [m[1], m[2], m[3]].map(x => (+x).toString(16).padStart(2, '0')).join('') : null;
  }
  function inline(node, decos, out) {
    for (const n of node.childNodes) {
      if (n.nodeType === 3) {
        const text = n.textContent.replace(/\s+/g, ' ');
        if (!text) continue;
        const last = out[out.length - 1];
        if (last && JSON.stringify(last.textData.decorations) === JSON.stringify(decos)) last.textData.text += text;
        else out.push({ type: 'TEXT', id: '', nodes: [], textData: { text, decorations: decos.map(d => ({ ...d })) } });
        continue;
      }
      if (n.nodeType !== 1) continue;
      const t = n.tagName, add = [];
      if (DROP.test(t)) continue;
      if (t === 'BR') { inline({ childNodes: [document.createTextNode(' ')] }, decos, out); continue }
      if (t === 'B' || t === 'STRONG' || +n.style.fontWeight >= 600 || n.style.fontWeight === 'bold') add.push({ type: 'BOLD', fontWeightValue: 700 });
      if (t === 'I' || t === 'EM' || n.style.fontStyle === 'italic') add.push({ type: 'ITALIC', italicData: true });
      if (t === 'U' || /underline/.test(n.style.textDecoration || '')) add.push({ type: 'UNDERLINE', underlineData: true });
      if (t === 'A') { const h = safeHref(n.getAttribute('href')); if (h) add.push({ type: 'LINK', linkData: { link: { url: h, target: 'BLANK' } } }) }
      const col = cssColor((t === 'FONT' && n.getAttribute('color')) || n.style.color);
      if (col) add.push({ type: 'COLOR', colorData: { foreground: col } });
      if (n.classList.contains('big')) add.push({ type: 'FONT_SIZE', fontSizeData: { unit: 'PX', value: 22 } });
      if (n.classList.contains('small')) add.push({ type: 'FONT_SIZE', fontSizeData: { unit: 'PX', value: 13 } });
      const next = decos.filter(d => !add.some(a => a.type === d.type)).concat(add);
      inline(n, next, out);
    }
    return out;
  }
  const trimRuns = runs => {
    if (runs[0]) runs[0].textData.text = runs[0].textData.text.replace(/^\s+/, '');
    const l = runs[runs.length - 1]; if (l) l.textData.text = l.textData.text.replace(/\s+$/, '');
    return runs.filter(r => r.textData.text);
  };
  const para = (runs, extra) => ({ type: 'PARAGRAPH', id: '', nodes: trimRuns(runs), paragraphData: extra || {} });
  const KICKER = [{ type: 'BOLD', fontWeightValue: 700 }, { type: 'COLOR', colorData: { foreground: RED } }, { type: 'FONT_SIZE', fontSizeData: { unit: 'PX', value: 13 } }];

  function toRicos(root) {
    const nodes = [];
    let loose = [];
    const flush = () => { if (loose.length) { const p = para(loose); if (p.nodes.length) nodes.push(p); loose = [] } };
    for (const n of root.childNodes) {
      if (n.nodeType === 3) { inline({ childNodes: [n] }, [], loose); continue }
      if (n.nodeType !== 1) continue;
      const t = n.tagName;
      if (/^(B|STRONG|I|EM|U|A|SPAN|FONT|BR)$/.test(t)) { inline({ childNodes: [n] }, [], loose); continue }
      flush();
      if (n.dataset && n.dataset.node) {
        try { const x = JSON.parse(n.dataset.node); if (ATOMS.has(x.type)) nodes.push(x) } catch (e) {}
        continue;
      }
      if (t === 'H2' || t === 'H3' || t === 'H4') { const r = trimRuns(inline(n, [], [])); if (r.length) nodes.push({ type: 'HEADING', id: '', nodes: r, headingData: { level: +t[1] } }); continue }
      if (t === 'P' && n.classList.contains('k-kicker')) { const r = trimRuns(inline(n, KICKER, [])); if (r.length) nodes.push(para(r)); continue }
      if (t === 'BLOCKQUOTE') {
        const inner = [...n.children].some(c => /^(P|DIV)$/.test(c.tagName)) ? toRicos(n).filter(x => x.type === 'PARAGRAPH') : [para(inline(n, [], []))];
        const kids = inner.filter(p => p.nodes.length);
        if (kids.length) nodes.push({ type: 'BLOCKQUOTE', id: '', nodes: kids });
        continue;
      }
      if (t === 'UL' || t === 'OL') {
        const items = [...n.children].filter(li => li.tagName === 'LI').map(li => ({ type: 'LIST_ITEM', id: '', nodes: [para(inline(li, [], []))] })).filter(li => li.nodes[0].nodes.length);
        if (items.length) nodes.push({ type: t === 'UL' ? 'BULLETED_LIST' : 'ORDERED_LIST', id: '', nodes: items });
        continue;
      }
      if (t === 'HR') { nodes.push({ type: 'DIVIDER', id: '', nodes: [], dividerData: { lineStyle: n.classList.contains('double') ? 'DOUBLE' : 'SINGLE' } }); continue }
      if (t === 'PRE') { nodes.push({ type: 'CODE_BLOCK', id: '', nodes: [{ type: 'TEXT', id: '', nodes: [], textData: { text: n.textContent, decorations: [] } }] }); continue }
      if (t === 'P' || t === 'DIV' || t === 'SECTION' || t === 'ARTICLE' || t === 'H1' || t === 'H5' || t === 'H6' || t === 'LI' || t === 'FIGURE' || t === 'FIGCAPTION' || t === 'TD' || t === 'TH') {
        // Pasted wrappers: keep what is inside, as text blocks
        if ([...n.children].some(c => /^(P|DIV|H\d|UL|OL|BLOCKQUOTE|HR|TABLE|SECTION)$/.test(c.tagName))) nodes.push(...toRicos(n));
        else { const p = para(inline(n, [], [])); if (p.nodes.length) nodes.push(p) }
        continue;
      }
      if (t === 'TABLE' || t === 'TBODY' || t === 'THEAD' || t === 'TR') { nodes.push(...toRicos(n)); continue }
      // Anything else (script, style, iframe, img, svg, form, object...) is dropped with its contents
    }
    flush();
    return nodes;
  }

  // ---- Ricos -> sheet ----
  function runsTo(parent, runs, skip = []) {
    for (const r of runs || []) {
      const d = r.textData || {};
      let out = document.createTextNode(d.text || '');
      for (const dec of d.decorations || []) {
        if (skip.includes(dec.type)) continue;
        let w = null;
        if (dec.type === 'BOLD') w = el('b');
        else if (dec.type === 'ITALIC') w = el('i');
        else if (dec.type === 'UNDERLINE') w = el('u');
        else if (dec.type === 'LINK') { const h = safeHref(dec.linkData && dec.linkData.link && dec.linkData.link.url); if (h) { w = el('a'); w.href = h } }
        else if (dec.type === 'COLOR') { const c = dec.colorData && dec.colorData.foreground; if (HEX.test(c || '')) { w = el('span'); w.style.color = c } }
        else if (dec.type === 'FONT_SIZE') { const v = dec.fontSizeData && dec.fontSizeData.value; if (v >= 20) w = el('span', 'big'); else if (v && v <= 13) w = el('span', 'small') }
        if (w) { w.appendChild(out); out = w }
      }
      parent.appendChild(out);
    }
    return parent;
  }
  const isKicker = n => n.type === 'PARAGRAPH' && (n.nodes || []).length && n.nodes.every(r => {
    const ds = (r.textData && r.textData.decorations) || [];
    return ds.some(d => d.type === 'BOLD') && ds.some(d => d.type === 'COLOR' && /^#(d7182a|d0021b)$/i.test(d.colorData.foreground)) && ds.some(d => d.type === 'FONT_SIZE' && d.fontSizeData.value <= 14);
  });
  function fromRicos(nodes) {
    const frag = document.createDocumentFragment();
    for (const n of nodes || []) {
      if (n.type === 'PARAGRAPH') {
        if (isKicker(n)) { frag.append(runsTo(el('p', 'k-kicker'), n.nodes, ['BOLD', 'COLOR', 'FONT_SIZE'])); continue }
        if (!(n.nodes || []).some(r => r.textData && r.textData.text.trim())) continue;
        frag.append(runsTo(el('p'), n.nodes));
      } else if (n.type === 'HEADING') frag.append(runsTo(el('h' + Math.min(4, Math.max(2, (n.headingData && n.headingData.level) || 2))), n.nodes));
      else if (n.type === 'BLOCKQUOTE') { const q = el('blockquote'); (n.nodes || []).forEach(p => q.append(runsTo(el('p'), p.nodes))); frag.append(q) }
      else if (n.type === 'BULLETED_LIST' || n.type === 'ORDERED_LIST') {
        const l = el(n.type === 'BULLETED_LIST' ? 'ul' : 'ol');
        (n.nodes || []).forEach(li => { const x = el('li'); (li.nodes || []).forEach(p => runsTo(x, p.nodes)); l.append(x) });
        frag.append(l);
      } else if (n.type === 'DIVIDER') frag.append(el('hr', (n.dividerData && n.dividerData.lineStyle) === 'DOUBLE' ? 'double' : ''));
      else if (ATOMS.has(n.type)) frag.append(atom(n));
    }
    return frag;
  }

  // ---- Sealed boxes for pictures, videos, scenes, crafted blocks ----
  const LABEL = { IMAGE: 'Picture', GALLERY: 'Gallery', VIDEO: 'YouTube', HTML: 'Scene code', BUTTON: 'Button', TABLE: 'Table', CODE_BLOCK: 'Code', vn: 'Visual novel', hotspots: 'Hotspots', compare: 'Before / after', cards: 'Flip cards', slides: 'Story slides' };
  const kindOf = n => n.type === 'TZ_BLOCK' ? n.blockData && n.blockData.kind : n.type;
  function atom(node) {
    const box = el('figure', 'ad-atom');
    box.contentEditable = 'false';
    box.dataset.node = JSON.stringify(node);
    const bar = el('div', 'ad-atom-bar');
    const label = el('span', 'ad-atom-label', LABEL[kindOf(node)] || node.type);
    bar.append(label);
    const btn = (t, title, fn) => { const b = el('button', '', t); b.type = 'button'; b.title = title; b.onclick = e => { e.preventDefault(); fn() }; bar.append(b); return b };
    const view = el('div', 'ad-atom-view');
    if (node.type === 'HTML') {
      const code = (node.htmlData && node.htmlData.html) || '';
      fingerprint(code).then(f => { label.textContent = 'Scene code · ' + f; box.dataset.fp = f });
      const h = node.htmlData.containerData && node.htmlData.containerData.height && node.htmlData.containerData.height.custom;
      const run = btn('▶ Run', 'Run the scene in its sealed box', () => {
        if (view.firstChild && view.firstChild.classList.contains('scene')) { view.replaceChildren(sceneCard(code, h)); run.textContent = '▶ Run'; return }
        view.replaceChildren(RICOS.scene(code, h === 'auto' ? 'auto' : parseInt(h, 10))); run.textContent = '■ Stop';
      });
      view.append(sceneCard(code, h));
    } else {
      const r = RICOS.render({ nodes: [node] });
      view.append(r.childNodes.length ? r : el('p', 'ad-empty', 'Nothing to show yet: edit it'));
    }
    if (CRAFTS.can(node)) btn('✎ Edit', 'Edit', () => CRAFTS.edit(node).then(n => n && box.replaceWith(atom(n))).then(changed));
    btn('↑', 'Move up', () => { const p = box.previousElementSibling; if (p) { p.before(box); changed() } });
    btn('↓', 'Move down', () => { const n = box.nextElementSibling; if (n) { n.after(box); changed() } });
    btn('✕', 'Remove', () => { box.remove(); changed() });
    box.append(bar, view);
    return box;
  }
  function sceneCard(code, h) {
    const c = el('div', 'ad-scene-card');
    c.append(el('b', '', 'Interactive scene'), el('span', '', Math.round(code.length / 100) / 10 + ' KB · ' + (h === 'auto' ? 'fits its content' : (parseInt(h, 10) || 480) + ' px tall') + ' · press Run to play it here'));
    return c;
  }

  // ---- Toolbar ----
  document.execCommand('defaultParagraphSeparator', false, 'p');
  function currentBlock() {
    const s = getSelection(); if (!s.rangeCount) return null;
    let n = s.anchorNode; if (!n || !body.contains(n)) return null;
    while (n && n.parentNode !== body) n = n.parentNode;
    return n && n.nodeType === 1 ? n : null;
  }
  function setBlock(kind) {
    body.focus();
    if (kind === 'kicker') {
      document.execCommand('formatBlock', false, 'p');
      const b = currentBlock(); if (b) { b.className = 'k-kicker' }
    } else {
      document.execCommand('formatBlock', false, kind);
      const b = currentBlock(); if (b && b.classList) b.classList.remove('k-kicker');
    }
    changed();
  }
  function wrapSelection(make) {
    const s = getSelection(); if (!s.rangeCount || s.isCollapsed || !body.contains(s.anchorNode)) return;
    const r = s.getRangeAt(0), w = make();
    w.appendChild(r.extractContents()); r.insertNode(w);
    s.removeAllRanges(); const nr = document.createRange(); nr.selectNodeContents(w); s.addRange(nr);
  }
  const CMDS = {
    bold: () => document.execCommand('bold'), italic: () => document.execCommand('italic'), underline: () => document.execCommand('underline'),
    link: async () => {
      const s = getSelection(); const range = s.rangeCount ? s.getRangeAt(0).cloneRange() : null;
      const url = await CRAFTS.ask('Link', 'Address (https://…)', 'https://');
      if (!url || !range) return;
      const h = safeHref(url); if (!h) return status('That address is not a web link', true);
      s.removeAllRanges(); s.addRange(range); document.execCommand('createLink', false, h);
    },
    red: () => wrapSelection(() => { const x = el('span'); x.style.color = RED; return x }),
    navy: () => wrapSelection(() => { const x = el('span'); x.style.color = NAVY; return x }),
    big: () => wrapSelection(() => el('span', 'big')),
    clear: () => document.execCommand('removeFormat'),
    ul: () => document.execCommand('insertUnorderedList'), ol: () => document.execCommand('insertOrderedList'),
    hr: () => insertAtom(el('hr')), hr2: () => insertAtom(el('hr', 'double')),
  };
  $('tools').addEventListener('mousedown', e => { if (e.target.closest('button')) e.preventDefault() }); // keep the text selection
  $('tools').addEventListener('click', async e => {
    const b = e.target.closest('button'); if (!b) return;
    if (b.dataset.cmd) { await CMDS[b.dataset.cmd](); changed() }
    if (b.dataset.add) {
      const s = getSelection(), keep = s.rangeCount && body.contains(s.anchorNode) ? s.getRangeAt(0).cloneRange() : null;
      const node = await CRAFTS.make(b.dataset.add);
      if (node) { if (keep) { s.removeAllRanges(); s.addRange(keep) } insertAtom(atom(node)) }
    }
  });
  $('t-block').addEventListener('change', e => { setBlock(e.target.value); e.target.value = 'p' });
  function insertAtom(node) {
    const b = currentBlock();
    if (b) b.after(node); else body.append(node);
    // Keep writing right under it: an empty line after the block, with the cursor in it
    let p = node.nextElementSibling;
    if (!p || p.tagName !== 'P' || p.textContent.trim()) { p = el('p'); p.append(el('br')); node.after(p) }
    const r = document.createRange(); r.setStart(p, 0); r.collapse(true); const s = getSelection(); s.removeAllRanges(); s.addRange(r);
    changed();
  }

  // Paste and drop: only clean text blocks get in (read through toRicos, never inserted as HTML)
  body.addEventListener('paste', e => {
    e.preventDefault();
    const html = e.clipboardData.getData('text/html'), text = e.clipboardData.getData('text/plain');
    let nodes;
    if (html) nodes = toRicos(new DOMParser().parseFromString(html, 'text/html').body);
    else nodes = text.split(/\n{2,}/).map(t => para([{ type: 'TEXT', id: '', nodes: [], textData: { text: t.replace(/\s*\n\s*/g, ' '), decorations: [] } }])).filter(p => p.nodes.length);
    if (!nodes.length) return;
    if (nodes.length === 1 && nodes[0].type === 'PARAGRAPH') {
      const s = getSelection(); if (!s.rangeCount) return;
      const r = s.getRangeAt(0); r.deleteContents();
      const frag = runsTo(document.createDocumentFragment(), nodes[0].nodes);
      const last = frag.lastChild; r.insertNode(frag);
      if (last) { r.setStartAfter(last); r.collapse(true); s.removeAllRanges(); s.addRange(r) }
    } else {
      const frag = fromRicos(nodes), b = currentBlock();
      if (b) b.after(frag); else body.append(frag);
    }
    changed();
  });
  body.addEventListener('drop', e => { if (e.dataTransfer && e.dataTransfer.types.includes('Files')) { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f && /^image\//.test(f.type)) CRAFTS.make('image', f).then(n => n && insertAtom(atom(n))) } else if (!e.dataTransfer.types.includes('text/plain')) e.preventDefault() });
  for (const f of [title, dek]) f.addEventListener('paste', e => { e.preventDefault(); document.execCommand('insertText', false, e.clipboardData.getData('text/plain').replace(/\s+/g, ' ')) });

  // ---- The post object ----
  const slugify = s => s.toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/ø/g, 'o').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 70) || 'untitled';
  let slugTouched = false, coverImg = null;
  $('f-slug').addEventListener('input', () => { slugTouched = true; changed() });
  title.addEventListener('input', () => { if (!slugTouched && !(doc && doc.published)) $('f-slug').value = slugify(title.textContent) });

  function collect() {
    const nodes = toRicos(body);
    const words = (title.textContent + ' ' + body.textContent).split(/\s+/).filter(Boolean).length;
    const cat = $('f-cat').value, kind = (doc && doc.kind) || 'article';
    const post = {
      kind, title: title.textContent.trim(), excerpt: dek.textContent.trim(),
      categoryIds: kind === 'article' ? [cat] : [], tagIds: kind === 'article' ? [TAG_TZERO] : [],
      memberId: $('f-author').value === 'keep' ? undefined : $('f-author').value, minutesToRead: Math.max(1, Math.round(words / 220)),
      richContent: { nodes },
      editor: { v: 1 },
    };
    if (coverImg) post.media = { wixMedia: { image: { url: coverImg.url, width: coverImg.width || 1600, height: coverImg.height || 900 } }, displayed: true, custom: true };
    const seo = $('f-seo').value.trim();
    post.seoData = { tags: [{ type: 'title', children: (seo || post.title) + ' | TZERØ', custom: true }, { type: 'meta', props: { name: 'description', content: post.excerpt }, custom: true }] };
    const when = $('f-when').value;
    post.publishAt = when ? new Date(when).toISOString() : null;
    return post;
  }

  function load(post, meta) {
    doc = { slug: post.slug || '', kind: post.kind || 'article', published: Boolean(meta && meta.published), savedAt: meta && meta.savedAt };
    title.textContent = post.title || '';
    dek.textContent = post.excerpt || '';
    $('f-slug').value = post.slug || '';
    slugTouched = Boolean(post.slug);
    $('slug-pre').textContent = doc.kind === 'page' ? '/p/' : '/post/';
    if (post.categoryIds && post.categoryIds[0]) $('f-cat').value = post.categoryIds[0];
    const CLAUDE = '1c53b988-3af9-4c8b-b6d4-0db133c2b09c';
    $('f-author').value = post.memberId === CLAUDE ? CLAUDE : post.authorSlug && post.authorSlug !== me.slug ? 'keep' : 'self';
    doc.author = post.authorName || '';
    const seoT = ((post.seoData && post.seoData.tags) || []).find(t => t.type === 'title');
    $('f-seo').value = seoT && seoT.children.replace(/ \| TZERØ$/, '') !== post.title ? seoT.children.replace(/ \| TZERØ$/, '') : '';
    $('f-when').value = post.publishAt ? new Date(new Date(post.publishAt).getTime() - new Date().getTimezoneOffset() * 6e4).toISOString().slice(0, 16) : '';
    const img = post.media && post.media.wixMedia && post.media.wixMedia.image;
    setCover(img ? { url: img.url || WIX.mediaUrl(img.id), width: img.width, height: img.height } : null);
    body.replaceChildren(fromRicos(post.richContent && post.richContent.nodes));
    if (!body.firstChild) body.append(el('p'));
    document.body.classList.toggle('is-page', doc.kind === 'page');
    dirty = false;
    refresh();
  }

  function setCover(c) {
    coverImg = c;
    const fig = $('cover');
    fig.querySelectorAll('img').forEach(i => i.remove());
    if (c) { const i = el('img'); i.src = c.url; i.alt = ''; fig.prepend(i) }
    $('cover-btn').textContent = c ? 'Change cover' : '+ Cover picture';
  }
  $('cover-btn').onclick = () => CRAFTS.make('image', null, { cover: true }).then(n => {
    if (!n) return;
    const img = n.imageData.image;
    setCover({ url: img.src.url, width: img.width, height: img.height }); changed();
  });

  // ---- Ache's checks (the article protocol) ----
  function checks() {
    const nodes = toRicos(body), out = [];
    const ok = (pass, good, bad) => out.push({ pass, text: pass ? good : bad });
    if (doc && doc.kind === 'page') {
      ok(title.textContent.trim(), 'Has a title', 'A page without a title? Bold.');
      return out;
    }
    ok(coverImg, 'Cover picture: set', 'No cover. Readers judge books by them, you know.');
    ok(isKicker(nodes[0] || {}), 'Opens with the red kicker line', 'Start with a kicker line (STUDIO NOTES · OPINION · date).');
    const ex = dek.textContent.trim();
    ok(ex && ex.length <= 300, 'Standfirst: ' + ex.length + ' characters', ex ? 'Standfirst over 300 characters. Trim it.' : 'Write a standfirst: one or two sentences.');
    // An image or interactive in every section
    const secs = []; let cur = null;
    for (const n of nodes) { if (n.type === 'HEADING' && (n.headingData || {}).level === 2) { cur = { name: n.nodes.map(r => r.textData.text).join(''), vis: 0 }; secs.push(cur) } else if (cur && ATOMS.has(n.type) && n.type !== 'BUTTON') cur.vis++ }
    const bare = secs.filter(s => !s.vis);
    ok(secs.length && !bare.length, secs.length ? 'Every section has a picture or something to play' : 'Has sections', secs.length ? 'No picture in: ' + bare.map(s => s.name).slice(0, 3).join(', ') : 'Break it into sections with headings.');
    ok(nodes.some(n => n.type === 'HTML' || n.type === 'TZ_BLOCK'), 'Something to play with: yes', 'Nothing to play with yet. We are a game studio journal!');
    ok(!/\b(quiz|correct answer|test yourself|score:)/i.test(JSON.stringify(nodes)), 'No quiz vibes', 'This smells like a quiz. Engage, don\'t test.');
    ok(nodes.some(n => n.type === 'VIDEO'), 'A creator video backs the facts', 'Facts? A creator video that shows them would help.');
    return out;
  }
  function refresh() {
    $('checks').replaceChildren(...checks().map(c => { const li = el('li', c.pass ? 'ok' : 'no', c.text); return li }));
    const cat = $('f-cat');
    $('m-cat').textContent = cat.options[cat.selectedIndex].text;
    const a = $('f-author').value;
    $('m-by').textContent = 'by ' + (a === 'self' ? me.name : a === 'keep' ? (doc && doc.author) || me.name : 'Claude');
    const pub = doc && doc.published;
    $('unpublish').hidden = !pub || local;
    $('publish').textContent = pub ? 'Update live' : 'Publish';
    const live = $('open-live');
    live.hidden = !pub; live.href = (doc && doc.kind === 'page' ? '/p/' : '/post/') + (doc && doc.slug);
    $('f-slug').disabled = Boolean(pub);
  }

  let timer = null;
  function changed() {
    dirty = true;
    clearTimeout(timer);
    timer = setTimeout(() => {
      // Crash safety: the latest unsaved state stays in this browser
      store.set('tz-admin-wip', { slug: $('f-slug').value, post: { ...collect(), slug: $('f-slug').value }, at: Date.now() });
      refresh();
    }, 600);
    status('Unsaved changes');
  }
  for (const x of [body, title, dek]) x.addEventListener('input', changed);
  // Enter at the end of the kicker line starts plain text, not a second kicker
  body.addEventListener('input', e => {
    if (e.inputType !== 'insertParagraph') return;
    const b = currentBlock(), prev = b && b.previousElementSibling;
    if (b && b.classList.contains('k-kicker') && prev && prev.classList.contains('k-kicker')) b.classList.remove('k-kicker');
  });
  for (const id of ['f-cat', 'f-author', 'f-when', 'f-seo']) $(id).addEventListener('input', changed);

  // ---- Save, publish, history ----
  async function save(publish) {
    const post = collect(), slug = $('f-slug').value.trim();
    if (!post.title) return status('Give it a title first', true);
    if (!/^[a-z0-9](?:[a-z0-9-]{0,78}[a-z0-9])?$/.test(slug)) return status('The address may only use a-z, 0-9 and dashes', true);
    if (local) {
      const all = store.get('tz-admin-local') || {};
      all[slug] = { post: { ...post, slug }, savedAt: new Date().toISOString(), published: false };
      store.set('tz-admin-local', all);
      doc = { ...doc, slug };
      dirty = false; status(publish ? 'Saved here. Publishing needs the signed-in editor.' : 'Saved in this browser'); return list();
    }
    status(publish ? 'Publishing…' : 'Saving…');
    try {
      const r = await api('/api/admin/item/' + slug, { method: 'PUT', body: JSON.stringify({ post, publish }) });
      doc = { ...doc, slug, published: r.published, savedAt: r.savedAt };
      dirty = false;
      status(publish ? (post.publishAt && Date.parse(post.publishAt) > Date.now() ? 'Scheduled for ' + new Date(post.publishAt).toLocaleString() : 'Live! Readers see it within seconds.') : 'Draft saved');
      refresh(); list();
    } catch (e) { status('Not saved: ' + e.message, true) }
  }
  $('save').onclick = () => save(false);
  $('publish').onclick = () => save(true);
  $('unpublish').onclick = async () => {
    if (!doc || !doc.slug) return;
    if (!(await CRAFTS.confirm('Take "' + title.textContent + '" off the site? The draft stays here.'))) return;
    await api('/api/admin/unpublish/' + doc.slug, { method: 'POST' }); doc.published = false; status('Taken off the site'); refresh(); list();
  };
  $('history').onclick = async () => {
    if (!doc || !doc.slug || local) return status('History starts after the first save', true);
    const { versions } = await api('/api/admin/versions/' + doc.slug);
    const pick = await CRAFTS.choose('History', versions.map(v => ({ value: v, label: new Date(v).toLocaleString() })));
    if (!pick) return;
    const v = await api('/api/admin/version/' + doc.slug + '/' + encodeURIComponent(pick));
    load(v.post, { published: doc.published, savedAt: v.savedAt }); changed(); status('Restored the version from ' + new Date(pick).toLocaleString() + '. Save to keep it.');
  };
  $('preview').onclick = () => {
    const on = !document.body.classList.contains('previewing');
    document.body.classList.toggle('previewing', on);
    $('preview').setAttribute('aria-pressed', on);
    for (const x of [body]) x.contentEditable = on ? 'false' : 'true';
    for (const x of [title, dek]) x.contentEditable = on ? 'false' : 'plaintext-only';
    $('preview').textContent = on ? 'Back to editing' : 'Preview';
    if (on) { const p = el('div', 'post-body ad-previewbody'); p.id = 'pv'; p.append(RICOS.render({ nodes: toRicos(body) })); body.hidden = true; body.after(p) }
    else { const p = $('pv'); if (p) p.remove(); body.hidden = false }
  };
  addEventListener('keydown', e => { if ((e.ctrlKey || e.metaKey) && e.key === 's') { e.preventDefault(); save(false) } });
  addEventListener('beforeunload', e => { if (dirty) { e.preventDefault(); e.returnValue = '' } });

  async function list() {
    let items = [];
    if (local) items = Object.entries(store.get('tz-admin-local') || {}).map(([slug, x]) => ({ slug, title: x.post.title, kind: x.post.kind, savedAt: x.savedAt }));
    else try { items = (await api('/api/admin/items')).items } catch (e) { return }
    const nav = $('items');
    nav.replaceChildren(...items.map(it => {
      const a = el('button', 'ad-item' + (doc && doc.slug === it.slug ? ' on' : '')); a.type = 'button';
      const st = it.published ? (it.publishAt && Date.parse(it.publishAt) > Date.now() ? 'Scheduled' : 'Live') : 'Draft';
      a.append(el('b', '', it.title || it.slug), el('span', 'ad-chip ' + st.toLowerCase(), (it.kind === 'page' ? 'Page · ' : '') + st));
      a.onclick = () => open(it.slug);
      return a;
    }));
    if (!items.length) nav.append(el('p', 'ad-empty', 'Nothing here yet. Start an article!'));
  }
  async function open(slug) {
    if (dirty && !(await CRAFTS.confirm('Leave this draft? Unsaved changes are kept only in this browser\'s crash copy.'))) return;
    if (local) { const x = (store.get('tz-admin-local') || {})[slug]; if (x) load(x.post, x); return list() }
    const r = await api('/api/admin/item/' + slug);
    const src = r.draft ? r.draft.post : r.published;
    load({ ...src, slug }, { published: Boolean(r.published), savedAt: r.draft && r.draft.savedAt });
    list();
  }
  function fresh(kind) {
    load({ kind, title: '', excerpt: '', richContent: { nodes: kind === 'article' ? [{ type: 'PARAGRAPH', nodes: [{ type: 'TEXT', textData: { text: 'STUDIO NOTES  ·  ' + new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }).toUpperCase(), decorations: KICKER } }] }] : [] } });
    title.focus();
  }
  $('new-article').onclick = () => fresh('article');
  $('new-page').onclick = () => fresh('page');
  $('everywhere').onclick = async () => {
    if (local) return;
    if (!(await CRAFTS.confirm('Sign out on every device, this one included?'))) return;
    await api('/api/auth/everywhere', { method: 'POST' }); location.reload();
  };

  // ---- Start ----
  function gate(msg) {
    $('app').hidden = true; $('gate').hidden = false;
    if (msg) $('gate-msg').textContent = msg;
  }
  function start() {
    $('gate').hidden = true; $('app').hidden = false;
    const wip = store.get('tz-admin-wip');
    fresh('article');
    if (wip && wip.post && (wip.post.title || (wip.post.richContent.nodes || []).length > 1) && Date.now() - wip.at < 7 * 864e5) {
      load(wip.post, {}); status('Brought back your last unsaved draft');
    }
    list();
  }
  function become(who) {
    me = who;
    document.body.classList.add('role-' + me.role);
    $('me-role').textContent = { owner: 'Owner', admin: 'Admin', collaborator: 'Collaborator' }[me.role] || me.role;
  }
  $('local').onclick = () => { local = true; become(me); $('who').textContent = 'Not signed in · drafts stay in this browser'; start() };
  $('signout').onclick = async () => { await api('/api/auth/logout', { method: 'POST' }).catch(() => {}); dirty = false; location.href = '/admin' };
  const why = new URLSearchParams(location.search).get('signin');
  fetch('/api/auth/me', { credentials: 'same-origin' }).then(async r => {
    if (r.ok) { become(await r.json()); $('who').textContent = 'Signed in as ' + me.login; $('signout').hidden = false; start(); return }
    const j = await r.json().catch(() => ({}));
    gate(why === 'denied' ? 'That GitHub account is not on the team. Ask Nero for an invite.' : why ? 'Sign-in did not finish. Try again.' : j.ready === false ? 'GitHub sign-in is not set up yet. You can still try the editor here; drafts stay in this browser.' : '');
  }).catch(() => gate('The editor\'s server is not reachable. You can still try it here; drafts stay in this browser.'));

  window.ADMIN = { atom, fingerprint, api, isLocal: () => local, changed, status, me: () => me, list };
})();
