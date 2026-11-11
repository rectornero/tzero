/* TZ Markdown: the text form of an article that Claude reads and writes through the AI API (/api/ai, /api/mcp).
   Converting to and from the site's Ricos JSON is lossless: anything this text form can't say exactly is kept
   as a ```tz-node fence holding the node's JSON, so a read-edit-write round trip never drops a picture or a scene.

   Blocks
     ## Heading / ### Subheading / #### Small heading
     ::kicker STUDIO NOTES · 11 NOVEMBER        the small red line that opens an article
     ---   /   ===                              divider / double divider
     ::space                                    an empty line of space between blocks
     > quote (more > lines; an empty > starts a new paragraph)
     - item   /   1. item                       lists
     ![description](url "caption"){1280x720}    a picture (caption and size optional)
     ::youtube https://youtu.be/… caption       a video
     ::button [Open Starchasers](/starchasers)   a button
     ```js … ```                                code
     :::ache scope=part show=hidden set=        Ache's lines for the part ABOVE this marker (one line per line;
     line one                                   scope=section: the whole section since the last heading;
     line two                                   show=bubble: also a small visible "Ache says" note; set=<key>:
     :::                                        use a set from his script book instead of lines here)
     ```tz-node {json} ```                       any other node (visual novel, hotspots, scene code, gallery…)
   Inline
     **bold**  *italic*  ++underline++  [link](https://…)  {red:text}  {navy:text}  {#2a6f97:text}  {20px:text}
     A backslash escapes * [ ] { } + \ */

const RED = '#d7182a', NAVY = '#13224b';
const KICKER = [{ type: 'BOLD', fontWeightValue: 700 }, { type: 'COLOR', colorData: { foreground: RED } }, { type: 'FONT_SIZE', fontSizeData: { unit: 'PX', value: 13 } }];
const text = (t, decorations = []) => ({ type: 'TEXT', id: '', nodes: [], textData: { text: t, decorations } });
const para = nodes => ({ type: 'PARAGRAPH', id: '', nodes, paragraphData: {} });

// ---------- Markdown -> Ricos ----------
const SPEC = /^(red|navy|#[0-9a-f]{3,8}|\d{1,2}px|big)$/i;
function specDeco(spec) {
  spec = spec.toLowerCase();
  if (spec === 'red') return { type: 'COLOR', colorData: { foreground: RED } };
  if (spec === 'navy') return { type: 'COLOR', colorData: { foreground: NAVY } };
  if (spec[0] === '#') return { type: 'COLOR', colorData: { foreground: spec } };
  if (spec === 'big') return { type: 'FONT_SIZE', fontSizeData: { unit: 'PX', value: 22 } };
  return { type: 'FONT_SIZE', fontSizeData: { unit: 'PX', value: parseInt(spec, 10) } };
}
// Finds the end of a delimiter, skipping escapes
function close(s, from, delim) {
  for (let i = from; i < s.length; i++) {
    if (s[i] === '\\') { i++; continue }
    if (s.startsWith(delim, i)) return i;
  }
  return -1;
}
function closeBracket(s, from, open, shut) {
  let depth = 0;
  for (let i = from; i < s.length; i++) {
    if (s[i] === '\\') { i++; continue }
    if (s[i] === open) depth++;
    else if (s[i] === shut) { if (depth === 0) return i; depth-- }
  }
  return -1;
}
export function inline(s, decos = [], out = []) {
  let buf = '';
  const flush = () => { if (!buf) return; const last = out[out.length - 1]; if (last && JSON.stringify(last.textData.decorations) === JSON.stringify(decos)) last.textData.text += buf; else out.push(text(buf, decos.map(d => ({ ...d })))); buf = '' };
  const wrap = (inner, deco) => { flush(); inline(inner, decos.concat(deco), out) };
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (c === '\\' && i + 1 < s.length) { buf += s[++i]; continue }
    if (s.startsWith('**', i)) { const j = close(s, i + 2, '**'); if (j > i + 2) { wrap(s.slice(i + 2, j), { type: 'BOLD', fontWeightValue: 700 }); i = j + 1; continue } }
    if (s.startsWith('++', i)) { const j = close(s, i + 2, '++'); if (j > i + 2) { wrap(s.slice(i + 2, j), { type: 'UNDERLINE', underlineData: true }); i = j + 1; continue } }
    if (c === '*') { const j = close(s, i + 1, '*'); if (j > i + 1) { wrap(s.slice(i + 1, j), { type: 'ITALIC', italicData: true }); i = j; continue } }
    if (c === '[') {
      const j = closeBracket(s, i + 1, '[', ']');
      if (j > 0 && s[j + 1] === '(') {
        const k = closeBracket(s, j + 2, '(', ')');
        if (k > 0) { wrap(s.slice(i + 1, j), { type: 'LINK', linkData: { link: { url: s.slice(j + 2, k).trim(), target: 'BLANK' } } }); i = k; continue }
      }
    }
    if (c === '{') {
      const j = closeBracket(s, i + 1, '{', '}'), colon = s.indexOf(':', i);
      if (j > 0 && colon > i && colon < j && SPEC.test(s.slice(i + 1, colon))) { wrap(s.slice(colon + 1, j), specDeco(s.slice(i + 1, colon))); i = j; continue }
    }
    buf += c;
  }
  flush();
  return out;
}

function attrs(s) {
  const o = {};
  for (const m of String(s || '').matchAll(/(\w+)=("([^"]*)"|\S*)/g)) o[m[1]] = m[3] != null ? m[3] : m[2];
  return o;
}

export function toRicos(md) {
  const lines = String(md || '').replace(/\r\n?/g, '\n').split('\n');
  const nodes = [];
  let i = 0, buf = [];
  const flushPara = () => { if (buf.length) { nodes.push(para(inline(buf.join(' ').trim()))); buf = [] } };
  while (i < lines.length) {
    const line = lines[i], t = line.trim();
    if (!t) { flushPara(); i++; continue }
    let m;
    if ((m = /^```\s*([\w-]*)\s*$/.exec(t))) {
      flushPara();
      const body = []; i++;
      while (i < lines.length && lines[i].trim() !== '```') body.push(lines[i++]);
      i++;
      if (m[1] === 'tz-node') {
        let n; try { n = JSON.parse(body.join('\n')) } catch (e) { throw new Error('tz-node near line ' + i + ': ' + e.message) }
        for (const x of Array.isArray(n) ? n : [n]) nodes.push(x);
      } else nodes.push({ type: 'CODE_BLOCK', id: '', nodes: [text(body.join('\n'))], codeBlockData: m[1] ? { language: m[1] } : {} });
      continue;
    }
    if ((m = /^:::ache\b(.*)$/.exec(t))) {
      flushPara();
      const a = attrs(m[1]), said = []; i++;
      while (i < lines.length && lines[i].trim() !== ':::') { const l = lines[i++].trim(); if (l) said.push(l.replace(/^[-*]\s+/, '')) }
      i++;
      nodes.push(acheNode({ lines: said, set: a.set || '', scope: a.scope, show: a.show }));
      continue;
    }
    if ((m = /^(#{2,4})\s+(.*)$/.exec(t))) { flushPara(); nodes.push({ type: 'HEADING', id: '', nodes: inline(m[2]), headingData: { level: m[1].length } }); i++; continue }
    if ((m = /^#\s+(.*)$/.exec(t))) { flushPara(); nodes.push({ type: 'HEADING', id: '', nodes: inline(m[1]), headingData: { level: 2 } }); i++; continue }
    if ((m = /^::kicker\s+(.*)$/.exec(t))) { flushPara(); nodes.push(para(inline(m[1], KICKER))); i++; continue }
    if (t === '::space') { flushPara(); nodes.push(para([])); i++; continue }
    if (/^(---+|\*\*\*+)$/.test(t)) { flushPara(); nodes.push({ type: 'DIVIDER', id: '', nodes: [], dividerData: { lineStyle: 'SINGLE', width: 'SMALL', alignment: 'CENTER' } }); i++; continue }
    if (/^===+$/.test(t)) { flushPara(); nodes.push({ type: 'DIVIDER', id: '', nodes: [], dividerData: { lineStyle: 'DOUBLE', width: 'SMALL', alignment: 'CENTER' } }); i++; continue }
    if ((m = /^::youtube\s+(\S+)\s*(.*)$/.exec(t))) {
      flushPara();
      const n = { type: 'VIDEO', id: '', nodes: [], videoData: { containerData: { width: { size: 'CONTENT' }, alignment: 'CENTER' }, video: { src: { url: m[1] } } } };
      if (m[2]) n.nodes = [{ type: 'CAPTION', id: '', nodes: inline(m[2]) }];
      nodes.push(n); i++; continue;
    }
    if ((m = /^::button\s+\[(.*)\]\((.*)\)\s*$/.exec(t))) {
      flushPara();
      nodes.push({ type: 'BUTTON', id: '', nodes: [], buttonData: { containerData: { alignment: 'CENTER' }, type: 'LINK', text: m[1], link: { url: m[2].trim(), target: 'SELF' } } });
      i++; continue;
    }
    if ((m = /^!\[(.*?)\]\((\S+?)(?:\s+"(.*)")?\)(?:\{(\d+)x(\d+)\})?$/.exec(t))) {
      flushPara();
      const n = { type: 'IMAGE', id: '', nodes: [], imageData: { containerData: { width: { size: 'CONTENT' }, alignment: 'CENTER' }, image: { src: { url: m[2] } }, altText: m[1] } };
      if (m[4]) { n.imageData.image.width = +m[4]; n.imageData.image.height = +m[5] }
      if (m[3]) n.nodes = [{ type: 'CAPTION', id: '', nodes: inline(m[3]) }];
      nodes.push(n); i++; continue;
    }
    if (/^>/.test(t)) {
      flushPara();
      const ps = [[]];
      while (i < lines.length && /^\s*>/.test(lines[i])) {
        const l = lines[i++].replace(/^\s*>\s?/, '');
        if (!l.trim()) ps.push([]); else ps[ps.length - 1].push(l.trim());
      }
      nodes.push({ type: 'BLOCKQUOTE', id: '', nodes: ps.filter(p => p.length).map(p => para(inline(p.join(' ')))), blockquoteData: { indentation: 0 } });
      continue;
    }
    if (/^([-*]|\d+\.)\s+/.test(t)) {
      flushPara();
      const ordered = /^\d+\./.test(t), items = [];
      while (i < lines.length && (ordered ? /^\s*\d+\.\s+/ : /^\s*[-*]\s+/).test(lines[i])) items.push(lines[i++].replace(/^\s*([-*]|\d+\.)\s+/, ''));
      nodes.push({ type: ordered ? 'ORDERED_LIST' : 'BULLETED_LIST', id: '', nodes: items.map(x => ({ type: 'LIST_ITEM', id: '', nodes: [para(inline(x))] })), [ordered ? 'orderedListData' : 'bulletedListData']: { indentation: 0 } });
      continue;
    }
    buf.push(t); i++;
  }
  flushPara();
  return { nodes };
}

export function acheNode({ lines = [], set = '', scope = 'part', show = 'hidden' } = {}) {
  return { type: 'TZ_BLOCK', id: '', nodes: [], blockData: { kind: 'ache', data: {
    lines: (Array.isArray(lines) ? lines : []).map(l => String(l).trim().slice(0, 300)).filter(Boolean).slice(0, 30),
    set: /^[a-z0-9][a-z0-9-]{0,59}$/.test(set || '') ? set : '',
    scope: scope === 'section' ? 'section' : 'part',
    show: show === 'bubble' ? 'bubble' : 'hidden',
  } } };
}

// ---------- Ricos -> Markdown ----------
const esc = s => s.replace(/([\\*[\]{}])/g, '\\$1').replace(/\+\+/g, '+\\+');
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
function decoSpec(d) {
  if (d.type === 'COLOR') {
    const c = (d.colorData && d.colorData.foreground || '').toLowerCase();
    if (!c || d.colorData.background || !/^#[0-9a-f]{3,8}$/.test(c)) return null;
    return c === RED ? 'red' : c === NAVY ? 'navy' : c;
  }
  if (d.type === 'FONT_SIZE') return d.fontSizeData && d.fontSizeData.unit === 'PX' && Number.isInteger(d.fontSizeData.value) && d.fontSizeData.value < 100 ? (d.fontSizeData.value === 22 ? 'big' : d.fontSizeData.value + 'px') : null;
  return null;
}
// One run of text with its marks, or null when a mark has no text form
function run(n) {
  if (n.type !== 'TEXT' || !n.textData || (n.nodes && n.nodes.length)) return null;
  let s = esc(n.textData.text || '');
  if (!s) return '';
  const ds = n.textData.decorations || [];
  // Write marks so that reading them back gives the same order of decorations
  for (let k = ds.length - 1; k >= 0; k--) {
    const d = ds[k];
    if (d.type === 'BOLD' && same(d, { type: 'BOLD', fontWeightValue: 700 })) s = '**' + s + '**';
    else if (d.type === 'ITALIC' && same(d, { type: 'ITALIC', italicData: true })) s = '*' + s + '*';
    else if (d.type === 'UNDERLINE' && same(d, { type: 'UNDERLINE', underlineData: true })) s = '++' + s + '++';
    else if (d.type === 'LINK' && d.linkData && d.linkData.link && Object.keys(d).length === 2 && same(Object.keys(d.linkData), ['link']) && same(Object.keys(d.linkData.link).sort(), ['target', 'url']) && d.linkData.link.target === 'BLANK' && !/[()\s]/.test(d.linkData.link.url)) s = '[' + s + '](' + d.linkData.link.url + ')';
    else { const sp = decoSpec(d); if (!sp || !same(d, specDeco(sp))) return null; s = '{' + sp + ':' + s + '}' }
  }
  // Leading/trailing spaces inside marks don't survive Markdown well; keep the run exact instead
  return s;
}
function runs(nodes) {
  const out = [];
  for (const n of nodes || []) { const r = run(n); if (r == null) return null; out.push(r) }
  const s = out.join('');
  // A mark split across runs must read back the same: check by parsing it again
  return same(strip(inline(s)), strip(nodes || [])) ? s : null;
}
const strip = ns => JSON.parse(JSON.stringify(ns), (k, v) => k === 'id' ? undefined : v);
const fence = n => '```tz-node\n' + JSON.stringify(n) + '\n```';
const isKicker = n => n.type === 'PARAGRAPH' && n.nodes && n.nodes.length && n.nodes.every(t => t.type === 'TEXT' && same(t.textData.decorations, KICKER));

function block(n) {
  const pd = k => !n[k] || same(n[k], {});
  switch (n.type) {
    case 'PARAGRAPH': {
      if (!pd('paragraphData')) return null;
      if (!n.nodes || !n.nodes.length) return n.paragraphData && n.nodes ? '::space' : null;
      if (isKicker(n)) { const s = esc(n.nodes.map(t => t.textData.text).join('')); return /^\s|\s$|\n/.test(s) ? null : '::kicker ' + s }
      const s = runs(n.nodes);
      return s == null || /^\s|\s$|\n/.test(s) || /^(#|>|[-*]\s|\d+\.\s|::|```|---|===|!\[)/.test(s) ? null : s;
    }
    case 'HEADING': {
      const lvl = n.headingData && n.headingData.level;
      if (![2, 3, 4].includes(lvl) || Object.keys(n.headingData).length !== 1) return null;
      const s = runs(n.nodes);
      return s == null || !s.trim() || /^\s|\s$|\n/.test(s) ? null : '#'.repeat(lvl) + ' ' + s;
    }
    case 'DIVIDER': {
      const d = n.dividerData || {};
      if (same(d, { lineStyle: 'SINGLE', width: 'SMALL', alignment: 'CENTER' })) return '---';
      if (same(d, { lineStyle: 'DOUBLE', width: 'SMALL', alignment: 'CENTER' })) return '===';
      return null;
    }
    case 'BLOCKQUOTE': {
      if (!same(n.blockquoteData || { indentation: 0 }, { indentation: 0 }) || !n.blockquoteData) return null;
      const ps = (n.nodes || []).map(p => p.type === 'PARAGRAPH' && (!p.paragraphData || same(p.paragraphData, {})) ? runs(p.nodes) : null);
      if (!ps.length || ps.some(p => p == null || !p || /^\s|\s$|\n/.test(p))) return null;
      return ps.map(p => '> ' + p).join('\n>\n');
    }
    case 'BULLETED_LIST': case 'ORDERED_LIST': {
      const key = n.type === 'ORDERED_LIST' ? 'orderedListData' : 'bulletedListData';
      if (!same(n[key], { indentation: 0 }) || Object.keys(n).some(k => !['type', 'id', 'nodes', key].includes(k))) return null;
      const items = (n.nodes || []).map(li => li.type === 'LIST_ITEM' && li.nodes && li.nodes.length === 1 && li.nodes[0].type === 'PARAGRAPH' && same(li.nodes[0].paragraphData || {}, {}) && li.nodes[0].paragraphData && Object.keys(li).every(k => ['type', 'id', 'nodes'].includes(k)) ? runs(li.nodes[0].nodes) : null);
      if (!items.length || items.some(s => s == null || !s || /^\s|\s$|\n/.test(s))) return null;
      return items.map((s, i) => (n.type === 'ORDERED_LIST' ? (i + 1) + '. ' : '- ') + s).join('\n');
    }
    case 'IMAGE': {
      const d = n.imageData || {}, img = d.image || {}, src = img.src || {};
      if (!src.url || src.id || Object.keys(src).length !== 1 || !same(d.containerData, { width: { size: 'CONTENT' }, alignment: 'CENTER' })) return null;
      if (Object.keys(d).some(k => !['containerData', 'image', 'altText'].includes(k)) || Object.keys(img).some(k => !['src', 'width', 'height'].includes(k))) return null;
      if ((img.width == null) !== (img.height == null) || /[\s()]/.test(src.url) || /[\]\n]/.test(d.altText || '') || d.altText == null) return null;
      let cap = '';
      if (n.nodes && n.nodes.length) {
        if (n.nodes.length !== 1 || n.nodes[0].type !== 'CAPTION') return null;
        cap = runs(n.nodes[0].nodes); if (cap == null || /["\n]|^\s|\s$/.test(cap)) return null;
      }
      return '![' + d.altText + '](' + src.url + (cap ? ' "' + cap + '"' : '') + ')' + (img.width != null ? '{' + img.width + 'x' + img.height + '}' : '');
    }
    case 'TZ_BLOCK': {
      const b = n.blockData || {};
      if (b.kind !== 'ache' || !same(n, acheNode(b.data || {}))) return null;
      const d = b.data;
      return ':::ache scope=' + d.scope + ' show=' + d.show + (d.set ? ' set=' + d.set : '') + '\n' + d.lines.join('\n') + '\n:::';
    }
    case 'CODE_BLOCK': {
      const t = n.nodes && n.nodes.length === 1 && n.nodes[0].type === 'TEXT' && !(n.nodes[0].textData.decorations || []).length ? n.nodes[0].textData.text : null;
      const lang = n.codeBlockData && n.codeBlockData.language;
      if (t == null || /(^|\n)```/.test(t) || (n.codeBlockData && Object.keys(n.codeBlockData).some(k => k !== 'language')) || (lang && !/^[\w-]+$/.test(lang)) || lang === 'tz-node') return null;
      return '```' + (lang || '') + '\n' + t + '\n```';
    }
    default: return null;
  }
}

export function toMarkdown(richContent) {
  const out = [];
  for (const n of (richContent && richContent.nodes) || []) {
    let s = null;
    try { s = block(n) } catch (e) { s = null }
    // Only keep the text form when it reads back to exactly the same node
    if (s != null) { try { const back = toRicos(s).nodes; if (back.length !== 1 || !same(strip(back[0]), strip(n))) s = null } catch (e) { s = null } }
    out.push(s != null ? s : fence(n));
  }
  return out.join('\n\n') + '\n';
}

// The parts of an article as a numbered list, for placing Ache's lines: index, type, a short text, and any Ache
// marker already attached to it
export function parts(richContent) {
  const nodes = (richContent && richContent.nodes) || [];
  const textOf = n => (n.textData ? n.textData.text : '') + (n.nodes || []).map(textOf).join(n.nodes && n.nodes.some(c => c.type !== 'TEXT') ? ' ' : '');
  let section = '';
  return nodes.map((n, i) => {
    if (n.type === 'HEADING') section = textOf(n).trim();
    const kind = n.type === 'TZ_BLOCK' ? 'block:' + (n.blockData && n.blockData.kind) : n.type.toLowerCase();
    const t = n.type === 'IMAGE' ? (n.imageData && n.imageData.altText) || 'picture' : textOf(n).trim();
    return { index: i, kind, section, text: t.length > 140 ? t.slice(0, 137) + '…' : t, ...(kind === 'block:ache' ? { ache: n.blockData.data } : {}) };
  });
}
