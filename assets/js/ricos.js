/* Turns a Wix post's rich content (Ricos JSON) into DOM nodes in the TZERØ style.
   Built with createElement/textContent only, so post text is never parsed as HTML. */
window.RICOS = (() => {
  // Wix colors from the Artache house style map to the site's tokens, so they follow the skin
  const COLORS = { '#0a1f44': 'var(--ink)', '#d0021b': 'var(--red)', '#6b7280': 'var(--soft)' };
  const el = (tag, cls) => { const e = document.createElement(tag); if (cls) e.className = cls; return e };

  function safeHref(url) {
    try { const u = new URL(url, location.href); return /^(https?|mailto):$/.test(u.protocol) ? u.href : null } catch (e) { return null }
  }

  // A link from the article: tzero.live pages open here in the same tab, everything else in a new one
  function link(url, cls) {
    const href = safeHref(url);
    if (!href) return null;
    const a = el('a', cls), local = window.WIX.localHref(href);
    if (local && local.startsWith('/')) a.href = local;
    else { a.href = local || href; a.target = '_blank'; a.rel = 'noopener noreferrer' }
    return a;
  }

  function text(node) {
    const d = node.textData || {};
    let out = document.createTextNode(d.text || '');
    for (const dec of d.decorations || []) {
      let wrap = null;
      switch (dec.type) {
        case 'BOLD': wrap = el('strong'); break;
        case 'ITALIC': wrap = el('em'); break;
        case 'UNDERLINE': wrap = el('u'); break;
        case 'LINK': {
          wrap = link(dec.linkData && dec.linkData.link && dec.linkData.link.url);
          break;
        }
        case 'COLOR': {
          const c = dec.colorData && dec.colorData.foreground;
          if (c) { wrap = el('span'); wrap.style.color = COLORS[c.toLowerCase()] || c }
          break;
        }
        case 'FONT_SIZE': {
          const v = dec.fontSizeData && dec.fontSizeData.value;
          if (v >= 20) wrap = el('span', 'big'); else if (v && v <= 13) wrap = el('span', 'small');
          break;
        }
      }
      if (wrap) { wrap.appendChild(out); out = wrap }
    }
    return out;
  }

  function kids(parent, nodes) { for (const n of nodes || []) { const c = render(n); if (c) parent.appendChild(c) } return parent }

  function isEmpty(n) { return (n.type === 'PARAGRAPH' || n.type === 'HEADING') && !(n.nodes || []).some(c => c.textData && c.textData.text.trim()) }

  function align(e, data) {
    const a = data && data.textStyle && data.textStyle.textAlignment;
    if (a && a !== 'AUTO') e.style.textAlign = a.toLowerCase();
    return e;
  }

  function caption(n) {
    const cap = (n.nodes || []).find(c => c.type === 'CAPTION');
    if (!cap || isEmpty({ type: 'PARAGRAPH', nodes: cap.nodes })) return null;
    return kids(el('figcaption'), cap.nodes);
  }

  function youtubeId(url) {
    const m = /(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]{11})/.exec(url || '');
    return m && m[1];
  }

  function render(n) {
    switch (n.type) {
      case 'TEXT': return text(n);
      case 'PARAGRAPH': return isEmpty(n) ? null : align(kids(el('p'), n.nodes), n.paragraphData);
      case 'HEADING': {
        if (isEmpty(n)) return null;
        const lvl = Math.min(4, Math.max(2, (n.headingData && n.headingData.level) || 2));
        const h = kids(el('h' + lvl), n.nodes);
        if (lvl === 2) h.dataset.say = 'heading';
        return align(h, n.headingData);
      }
      case 'BLOCKQUOTE': return kids(el('blockquote'), n.nodes);
      case 'DIVIDER': return el('hr', (n.dividerData && n.dividerData.lineStyle) === 'DOUBLE' ? 'double' : '');
      case 'BULLETED_LIST': return kids(el('ul'), n.nodes);
      case 'ORDERED_LIST': return kids(el('ol'), n.nodes);
      case 'LIST_ITEM': return kids(el('li'), n.nodes);
      case 'CODE_BLOCK': return kids(el('pre'), n.nodes);
      case 'IMAGE': {
        const d = n.imageData || {}, img = d.image || {}, src = img.src || {};
        const url = src.url || (src.id && window.WIX.mediaUrl(src.id));
        if (!url) return null;
        const fig = el('figure', 'pic');
        const custom = d.containerData && d.containerData.width && d.containerData.width.custom;
        if (custom) fig.style.maxWidth = parseInt(custom, 10) + 'px';
        const i = el('img'); i.src = url; i.alt = d.altText || ''; i.loading = 'lazy';
        if (img.width && img.height) { i.width = img.width; i.height = img.height }
        fig.appendChild(i);
        const c = caption(n); if (c) fig.appendChild(c);
        if (!custom) fig.dataset.say = 'image';
        return fig;
      }
      case 'GALLERY': {
        const g = el('div', 'gallery');
        for (const it of (n.galleryData && n.galleryData.items) || []) {
          const s = it.image && it.image.media && it.image.media.src;
          const url = s && (s.url || (s.id && window.WIX.mediaUrl(s.id)));
          if (!url) continue;
          const i = el('img'); i.src = url; i.alt = it.altText || ''; i.loading = 'lazy'; g.appendChild(i);
        }
        return g.children.length ? g : null;
      }
      case 'VIDEO': {
        const url = n.videoData && n.videoData.video && n.videoData.video.src && n.videoData.video.src.url;
        const fig = el('figure', 'video');
        const id = youtubeId(url);
        if (id) {
          const f = el('iframe');
          f.src = 'https://www.youtube-nocookie.com/embed/' + id;
          f.title = 'YouTube video'; f.loading = 'lazy'; f.allowFullscreen = true;
          f.allow = 'accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture';
          fig.appendChild(f);
        } else if (safeHref(url)) {
          const a = el('a'); a.href = safeHref(url); a.target = '_blank'; a.rel = 'noopener'; a.textContent = 'Watch the video'; fig.appendChild(a);
        } else return null;
        const c = caption(n); if (c) fig.appendChild(c);
        return fig;
      }
      case 'TABLE': {
        const wrap = el('div', 'table'), t = el('table');
        for (const row of n.nodes || []) {
          const tr = el('tr');
          for (const cell of row.nodes || []) {
            const bg = cell.tableCellData && cell.tableCellData.cellStyle && cell.tableCellData.cellStyle.backgroundColor;
            const td = kids(el(bg ? 'th' : 'td'), cell.nodes);
            tr.appendChild(td);
          }
          t.appendChild(tr);
        }
        wrap.appendChild(t);
        return wrap;
      }
      case 'BUTTON': {
        const d = n.buttonData || {}, a = link(d.link && d.link.url, 'btn');
        if (!a) return null;
        a.textContent = d.text || 'Open';
        return a;
      }
      case 'AUDIO': case 'FILE': case 'LINK_PREVIEW': case 'EMBED': case 'HTML': {
        const d = n.audioData || n.fileData || n.linkPreviewData || n.embedData || n.htmlData || {};
        const href = safeHref((d.audio && d.audio.src && d.audio.src.url) || (d.src && d.src.url) || (d.link && d.link.url) || d.url);
        if (!href) return null;
        const p = el('p'), a = el('a'); a.href = href; a.target = '_blank'; a.rel = 'noopener'; a.textContent = d.title || 'Open the original';
        p.appendChild(a); return p;
      }
      default:
        return n.nodes && n.nodes.length ? kids(document.createDocumentFragment(), n.nodes) : null;
    }
  }

  return { render: content => kids(document.createDocumentFragment(), content && content.nodes) };
})();
