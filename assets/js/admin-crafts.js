/* /admin: the dialogs that make pictures, videos, buttons, scene code and the crafted blocks (visual novel,
   hotspots, before/after, flip cards). Each one returns a Ricos node, or null when cancelled. */
window.CRAFTS = (() => {
  const $ = id => document.getElementById(id);
  const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e };
  const dlg = $('dlg');
  const txt = text => ({ type: 'TEXT', id: '', nodes: [], textData: { text, decorations: [] } });
  const uid = p => p + Math.random().toString(36).slice(2, 7);

  // One dialog at a time. build(box) fills it and returns get(), which gives the value (or throws a message)
  function open(title, build, okText = 'Insert', wide = false) {
    return new Promise(done => {
      $('dlg-title').textContent = title;
      const box = $('dlg-body'); box.replaceChildren();
      $('dlg-ok').textContent = okText;
      dlg.classList.toggle('wide', wide);
      const get = build(box);
      const err = el('p', 'ad-err'); box.append(err);
      const form = $('dlg-form');
      form.onsubmit = e => {
        if (e.submitter && e.submitter.value === 'cancel') return;
        try { const v = get(); e.preventDefault(); dlg.close('ok'); done(v) } catch (x) { e.preventDefault(); err.textContent = x.message }
      };
      dlg.onclose = () => { if (dlg.returnValue !== 'ok') done(null); dlg.returnValue = '' };
      dlg.showModal();
      const first = box.querySelector('input,textarea,select'); if (first) first.focus();
    });
  }
  function field(label, input, hint) {
    const l = el('label', 'ad-field'); l.append(el('span', '', label), input);
    if (hint) l.append(el('small', '', hint));
    return l;
  }
  function input(value = '', attrs = {}) { const i = el(attrs.rows ? 'textarea' : 'input'); Object.assign(i, attrs); i.value = value; return i }
  function select(options, value) {
    const s = el('select');
    for (const [v, t] of options) { const o = el('option', '', t); o.value = v; s.append(o) }
    s.value = value; return s;
  }

  // ---- Pictures: shrunk in the browser to WebP (max 1600 px wide) before upload, to save bandwidth ----
  async function shrink(file, max = 1600) {
    if (file.type === 'image/gif') return { blob: file, type: 'image/gif' };
    const bmp = await createImageBitmap(file);
    const k = Math.min(1, max / bmp.width), c = el('canvas');
    c.width = Math.round(bmp.width * k); c.height = Math.round(bmp.height * k);
    c.getContext('2d').drawImage(bmp, 0, 0, c.width, c.height);
    const blob = await new Promise(r => c.toBlob(r, 'image/webp', .82));
    return { blob, type: 'image/webp', width: c.width, height: c.height };
  }
  async function upload(file) {
    const s = await shrink(file);
    if (ADMIN.isLocal()) {
      const url = await new Promise(r => { const f = new FileReader(); f.onload = () => r(f.result); f.readAsDataURL(s.blob) });
      return { url, width: s.width, height: s.height };
    }
    const r = await ADMIN.api('/api/admin/media', { method: 'POST', body: s.blob, headers: { 'Content-Type': s.type } });
    return { url: r.url, width: s.width, height: s.height };
  }
  // A picture picker: preview, web address, or upload (also takes a dropped file)
  function picture(value = '', onchange) {
    const wrap = el('div', 'ad-pic');
    const thumb = el('img'); thumb.alt = '';
    const url = input(value, { placeholder: 'Upload, or paste a picture address', type: 'text' });
    const file = el('input'); file.type = 'file'; file.accept = 'image/*'; file.hidden = true;
    const up = el('button', 'btn ghost small', 'Upload'); up.type = 'button';
    const state = { value, width: 0, height: 0 };
    const draw = () => { thumb.hidden = !state.value; if (state.value) thumb.src = state.value };
    const show = () => { draw(); onchange && onchange(state.value) };
    url.addEventListener('input', () => { state.value = url.value.trim(); show() });
    up.onclick = () => file.click();
    const take = async f => {
      up.textContent = 'Uploading…'; up.disabled = true;
      try { const r = await upload(f); Object.assign(state, { value: r.url, width: r.width, height: r.height }); url.value = r.url.startsWith('data:') ? '(picture kept in this browser)' : r.url; show() }
      catch (e) { up.textContent = 'Failed: ' + e.message } finally { up.disabled = false; if (up.textContent === 'Uploading…') up.textContent = 'Upload' }
    };
    file.onchange = () => file.files[0] && take(file.files[0]);
    wrap.addEventListener('dragover', e => e.preventDefault());
    wrap.addEventListener('drop', e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f && /^image\//.test(f.type)) take(f) });
    wrap.append(thumb, url, up, file);
    if (value.startsWith('data:')) url.value = '(picture kept in this browser)';
    draw();
    wrap.get = () => state;
    wrap.take = take;
    return wrap;
  }

  // ---- Simple nodes ----
  function image(node, dropped, opts = {}) {
    const d = (node && node.imageData) || {};
    const cap0 = node && (node.nodes || []).find(n => n.type === 'CAPTION');
    return open(opts.cover ? 'Cover picture' : 'Picture', box => {
      const pic = picture((d.image && d.image.src && d.image.src.url) || '');
      if (d.image) Object.assign(pic.get(), { width: d.image.width, height: d.image.height });
      const alt = input(d.altText || '', { placeholder: 'What the picture shows, for screen readers' });
      const cap = input(cap0 ? cap0.nodes.map(n => n.textData.text).join('') : '', { placeholder: 'Handwritten caption under it' });
      const size = select([['', 'Full width'], ['560', 'Medium'], ['360', 'Small']], (d.containerData && d.containerData.width && d.containerData.width.custom) || '');
      box.append(field('Picture', pic));
      if (!opts.cover) box.append(field('Description', alt), field('Caption', cap), field('Size', size));
      if (dropped) pic.take(dropped);
      return () => {
        const p = pic.get(); if (!p.value) throw new Error('Pick a picture first');
        const n = { type: 'IMAGE', id: '', nodes: [], imageData: { image: { src: { url: p.value }, width: p.width || undefined, height: p.height || undefined }, altText: alt.value.trim() } };
        if (size.value) n.imageData.containerData = { width: { custom: size.value } };
        if (cap.value.trim()) n.nodes.push({ type: 'CAPTION', id: '', nodes: [txt(cap.value.trim())] });
        return n;
      };
    }, node ? 'Save' : 'Insert');
  }
  function gallery(node) {
    const items = ((node && node.galleryData && node.galleryData.items) || []).map(it => ({ url: it.image.media.src.url, alt: it.altText || '' }));
    return open('Gallery', box => {
      const list = el('div', 'ad-rows');
      const row = it => { const r = el('div', 'ad-row'); const p = picture(it.url, v => { it.url = v }); const x = el('button', 'btn ghost small', '✕'); x.type = 'button'; x.onclick = () => { items.splice(items.indexOf(it), 1); r.remove() }; r.append(p, x); return r };
      items.forEach(it => list.append(row(it)));
      const add = el('button', 'btn ghost small', '+ Picture'); add.type = 'button';
      add.onclick = () => { const it = { url: '', alt: '' }; items.push(it); list.append(row(it)) };
      if (!items.length) add.click();
      box.append(list, add);
      return () => {
        const ok = items.filter(i => i.url);
        if (ok.length < 2) throw new Error('A gallery needs at least two pictures');
        return { type: 'GALLERY', id: '', nodes: [], galleryData: { items: ok.map(i => ({ image: { media: { src: { url: i.url } } }, altText: i.alt })) } };
      };
    }, node ? 'Save' : 'Insert');
  }
  function video(node) {
    const cap0 = node && (node.nodes || []).find(n => n.type === 'CAPTION');
    return open('YouTube video', box => {
      const u = input((node && node.videoData.video.src.url) || '', { placeholder: 'https://www.youtube.com/watch?v=…' });
      const cap = input(cap0 ? cap0.nodes.map(n => n.textData.text).join('') : '', { placeholder: 'Who made it, and what it shows' });
      box.append(field('Video address', u, 'Pick creators who document the facts (article protocol).'), field('Caption', cap));
      return () => {
        if (!/(youtube\.com\/(watch\?v=|embed\/|shorts\/)|youtu\.be\/)[\w-]{11}/.test(u.value)) throw new Error('That is not a YouTube video address');
        const n = { type: 'VIDEO', id: '', nodes: [], videoData: { video: { src: { url: u.value.trim() } } } };
        if (cap.value.trim()) n.nodes.push({ type: 'CAPTION', id: '', nodes: [txt(cap.value.trim())] });
        return n;
      };
    }, node ? 'Save' : 'Insert');
  }
  function button(node) {
    const d = (node && node.buttonData) || {};
    return open('Button', box => {
      const t = input(d.text || '', { placeholder: 'Play the demo' });
      const u = input((d.link && d.link.url) || '', { placeholder: 'https://…' });
      box.append(field('Label', t), field('Goes to', u));
      return () => {
        try { if (!/^https?:$/.test(new URL(u.value, location.href).protocol)) throw 0 } catch (e) { throw new Error('The button needs a web address') }
        return { type: 'BUTTON', id: '', nodes: [], buttonData: { text: t.value.trim() || 'Open', link: { url: u.value.trim() } } };
      };
    }, node ? 'Save' : 'Insert');
  }

  // ---- Scene code: the Embed lab ----
  // What the code tries to do, in plain words. The box blocks all of these anyway; this is so Nero knows.
  const SCAN = [
    [/\b(fetch|XMLHttpRequest|WebSocket|EventSource|sendBeacon)\b/, 'Talks to the internet', 'blocked by the box'],
    [/<script[^>]+src\s*=\s*["']?(https?:)?\/\//i, 'Loads code from another site', 'blocked by the box'],
    [/<(img|audio|video|source|link)[^>]+(src|href)\s*=\s*["']?(https?:)?\/\/(?!fonts\.(googleapis|gstatic)\.com|static\.wixstatic\.com|i\.ytimg\.com)/i, 'Loads files from another site', 'blocked, except fonts'],
    [/window\.open|target\s*=\s*["']?_blank/i, 'Tries to open new windows', 'blocked by the box'],
    [/\b(top|parent)\.location|window\.top\b|location\.(href|assign|replace)/, 'Tries to send the reader to another page', 'blocked by the box'],
    [/<form/i, 'Has a form', 'sending is blocked'],
    [/localStorage|sessionStorage|indexedDB|document\.cookie/, 'Wants to remember things in the browser', 'not available in the box; the scene must cope'],
    [/\beval\s*\(|new\s+Function\b/, 'Builds code while running', 'allowed inside the box, but unusual'],
    [/<iframe/i, 'Embeds another page', 'only YouTube is allowed'],
  ];
  function scene(node) {
    const d = (node && node.htmlData) || {};
    const h0 = (d.containerData && d.containerData.height && d.containerData.height.custom) || '480';
    return open('Scene code', box => {
      box.append(el('p', 'ad-note', 'Paste the code Claude gave you. Check that the fingerprint below matches the one in the thread, then test it. It can never reach this site, your login or a reader\'s data.'));
      const code = input(d.html || '', { rows: 10, spellcheck: false, placeholder: '<style>…</style><div>…</div><script>…</script>' });
      code.className = 'ad-code';
      const fp = el('b', 'ad-fp', '—');
      const height = input(h0, { placeholder: '480 or auto' });
      const report = el('ul', 'ad-report');
      const stage = el('div', 'ad-stage');
      const log = el('ul', 'ad-report');
      const run = el('button', 'btn ghost small', '▶ Test it here'); run.type = 'button';
      const scan = () => {
        ADMIN.fingerprint(code.value).then(f => { fp.textContent = code.value.trim() ? f : '—' });
        const hits = SCAN.filter(([re]) => re.test(code.value));
        report.replaceChildren(...(hits.length ? hits.map(([, what, how]) => el('li', 'warn', what + ': ' + how)) : [el('li', 'ok', code.value.trim() ? 'Nothing unusual found' : 'Waiting for code')]));
        if (code.value.length > 300000) report.append(el('li', 'warn', 'Very big (' + Math.round(code.value.length / 1000) + ' KB). Pages will load slower.'));
      };
      code.addEventListener('input', scan); scan();
      run.onclick = () => {
        log.replaceChildren(el('li', 'ok', 'Running in the sealed box. Anything it tries that is blocked shows here.'));
        const h = height.value.trim() === 'auto' ? 'auto' : parseInt(height.value, 10) || 480;
        const fig = RICOS.scene(code.value, h); stage.replaceChildren(fig);
        const f = fig.querySelector('iframe');
        f.loading = 'eager';
        const seen = new Set();
        f.addEventListener('scene-blocked', e => { const k = e.detail.what + e.detail.url; if (seen.has(k)) return; seen.add(k); log.append(el('li', 'warn', 'Blocked: ' + e.detail.what + (e.detail.url ? ' → ' + e.detail.url : ''))) });
        f.addEventListener('scene-error', e => log.append(el('li', 'warn', 'Error in the scene: ' + e.detail.msg)));
      };
      const fpRow = el('p', 'ad-fprow'); fpRow.append('Fingerprint ', fp);
      box.append(field('Code', code), fpRow, report, field('Height', height, 'Pixels, or "auto" to fit the scene'), run, stage, log);
      return () => {
        if (!code.value.trim()) throw new Error('Paste the scene code first');
        const h = height.value.trim();
        if (h !== 'auto' && !(parseInt(h, 10) >= 120 && parseInt(h, 10) <= 3000)) throw new Error('Height: a number from 120 to 3000, or auto');
        return { type: 'HTML', id: '', nodes: [], htmlData: { html: code.value, containerData: { height: { custom: h === 'auto' ? 'auto' : String(parseInt(h, 10)) } } } };
      };
    }, node ? 'Save' : 'Insert', true);
  }

  // ---- Crafted blocks: a form on the left, the real block on the right, updating as Nero types ----
  function crafted(kind, titleText, data, form) {
    return open(titleText, box => {
      const grid = el('div', 'ad-craft'), left = el('div', 'ad-craft-form'), right = el('div', 'ad-craft-view');
      const again = el('button', 'btn ghost small', '↺ Replay'); again.type = 'button';
      const view = el('div', 'post-body');
      right.append(again, view);
      let t = null;
      const preview = () => { clearTimeout(t); t = setTimeout(() => { const b = TZBLOCKS.render({ kind, data }); view.replaceChildren(b || el('p', 'ad-empty', 'Fill in the form to see it')) }, 250) };
      again.onclick = () => { clearTimeout(t); view.replaceChildren(TZBLOCKS.render({ kind, data }) || '') };
      const rebuild = () => { left.replaceChildren(); form(left, data, preview, rebuild); preview() };
      rebuild();
      grid.append(left, right); box.append(grid);
      return () => ({ type: 'TZ_BLOCK', id: '', nodes: [], blockData: { kind, data: JSON.parse(JSON.stringify(data)) } });
    }, 'Done', true);
  }
  const bind = (inp, obj, key, preview) => { inp.addEventListener('input', () => { obj[key] = inp.value; preview() }); return inp };
  const small = (t, fn, title) => { const b = el('button', 'btn ghost small', t); b.type = 'button'; if (title) b.title = title; b.onclick = fn; return b };
  const move = (arr, i, d, rebuild) => { const j = i + d; if (j < 0 || j >= arr.length) return; [arr[i], arr[j]] = [arr[j], arr[i]]; rebuild() };

  function vn(data) {
    data = data || { title: '', bg: '', cast: [{ id: 'c1', name: 'Ache', color: '#d7182a', img: '' }], scenes: [{ id: 's1', name: 'Opening', bg: '', lines: [{ who: 'c1', text: 'Hey. You found the story bit.' }], choices: [] }], start: 's1' };
    return crafted('vn', 'Visual novel', data, (f, d, preview, rebuild) => {
      f.append(field('Title (small red line above it)', bind(input(d.title, { placeholder: 'Optional' }), d, 'title', preview)));
      f.append(field('Background', picture(d.bg, v => { d.bg = v; preview() })));
      f.append(el('h3', '', 'Cast'));
      d.cast.forEach((c, i) => {
        const r = el('div', 'ad-cast');
        const col = input(c.color || '#13224b', { type: 'color' }); bind(col, c, 'color', preview);
        r.append(bind(input(c.name, { placeholder: 'Name' }), c, 'name', preview), col, picture(c.img, v => { c.img = v; preview() }),
          small('✕', () => { d.cast.splice(i, 1); d.scenes.forEach(s => s.lines.forEach(l => { if (l.who === c.id) l.who = '' })); rebuild() }, 'Remove'));
        f.append(r);
      });
      f.append(small('+ Character', () => { d.cast.push({ id: uid('c'), name: '', color: '#13224b', img: '' }); rebuild() }));
      const who = [['', 'Narrator']].concat(d.cast.map(c => [c.id, c.name || '(no name)']));
      const goes = d.scenes.map(s => [s.id, '→ ' + (s.name || s.id)]).concat([['', '→ The end']]);
      d.scenes.forEach((s, si) => {
        const box = el('fieldset', 'ad-scene');
        const head = el('legend'); head.append(bind(input(s.name || '', { placeholder: 'Scene name' }), s, 'name', () => { preview() }));
        if (si === 0) head.append(el('small', '', ' starts here'));
        head.append(small('↑', () => move(d.scenes, si, -1, () => { d.start = d.scenes[0].id; rebuild() })), small('✕', () => { if (d.scenes.length > 1) { d.scenes.splice(si, 1); d.start = d.scenes[0].id; rebuild() } }, 'Remove scene'));
        box.append(head);
        box.append(field('Background for this scene', picture(s.bg || '', v => { s.bg = v; preview() }), 'Leave empty to keep the previous one'));
        s.lines.forEach((l, li) => {
          const r = el('div', 'ad-line');
          const w = select(who, l.who || ''); w.addEventListener('change', () => { l.who = w.value; preview() });
          r.append(w, bind(input(l.text, { rows: 2, placeholder: 'What they say' }), l, 'text', preview), small('↑', () => move(s.lines, li, -1, rebuild)), small('✕', () => { s.lines.splice(li, 1); rebuild() }));
          box.append(r);
        });
        box.append(small('+ Line', () => { s.lines.push({ who: (s.lines[s.lines.length - 1] || {}).who || '', text: '' }); rebuild() }));
        (s.choices = s.choices || []).forEach((c, ci) => {
          const r = el('div', 'ad-line choice');
          const to = select(goes, c.to || ''); to.addEventListener('change', () => { c.to = to.value; preview() });
          r.append(el('span', 'ad-chip', 'Choice'), bind(input(c.text, { placeholder: 'What the reader picks' }), c, 'text', preview), to, small('✕', () => { s.choices.splice(ci, 1); rebuild() }));
          box.append(r);
        });
        if (s.choices.length < 4) box.append(small('+ Choice', () => { s.choices.push({ text: '', to: '' }); rebuild() }));
        if (!s.choices.length) box.append(field('Ending line (when this scene has no choices)', bind(input(s.end || '', { placeholder: 'The end' }), s, 'end', preview)));
        f.append(box);
      });
      f.append(small('+ Scene', () => { d.scenes.push({ id: uid('s'), name: 'Scene ' + (d.scenes.length + 1), bg: '', lines: [{ who: '', text: '' }], choices: [] }); rebuild() }));
      d.start = d.scenes[0] && d.scenes[0].id;
    });
  }

  function hotspots(data) {
    data = data || { img: '', alt: '', caption: '', spots: [] };
    return crafted('hotspots', 'Hotspot picture', data, (f, d, preview, rebuild) => {
      const padBox = el('div');
      // Click the picture to drop a point; drag points to move them
      const drawPad = () => {
        padBox.replaceChildren();
        if (!d.img) return;
        const pad = el('div', 'ad-spotpad'), im = el('img'); im.src = d.img; im.alt = '';
        pad.append(im);
        d.spots.forEach((s, i) => {
          const dot = el('span', 'spot', String(i + 1)); dot.style.left = s.x + '%'; dot.style.top = s.y + '%';
          dot.onpointerdown = e => {
            e.preventDefault(); e.stopPropagation(); dot.setPointerCapture(e.pointerId);
            dot.onpointermove = m => { const r = pad.getBoundingClientRect(); s.x = Math.round(Math.min(100, Math.max(0, (m.clientX - r.left) / r.width * 100)) * 10) / 10; s.y = Math.round(Math.min(100, Math.max(0, (m.clientY - r.top) / r.height * 100)) * 10) / 10; dot.style.left = s.x + '%'; dot.style.top = s.y + '%'; preview() };
            dot.onpointerup = () => { dot.onpointermove = null };
          };
          dot.onclick = e => e.stopPropagation();
          pad.append(dot);
        });
        pad.onclick = e => { const r = pad.getBoundingClientRect(); d.spots.push({ x: Math.round((e.clientX - r.left) / r.width * 1000) / 10, y: Math.round((e.clientY - r.top) / r.height * 1000) / 10, title: '', text: '' }); rebuild() };
        padBox.append(el('p', 'ad-note', 'Click the picture to add a point. Drag points to move them.'), pad);
      };
      f.append(field('Picture', picture(d.img, v => { d.img = v; drawPad(); preview() })), padBox);
      drawPad();
      d.spots.forEach((s, i) => {
        const r = el('div', 'ad-line');
        r.append(el('span', 'ad-chip', String(i + 1)), bind(input(s.title, { placeholder: 'Title' }), s, 'title', preview), bind(input(s.text, { rows: 2, placeholder: 'What opens when tapped' }), s, 'text', preview), small('✕', () => { d.spots.splice(i, 1); rebuild() }));
        f.append(r);
      });
      f.append(field('Description', bind(input(d.alt, { placeholder: 'What the picture shows' }), d, 'alt', preview)), field('Caption', bind(input(d.caption), d, 'caption', preview)));
    });
  }

  function compare(data) {
    data = data || { before: '', after: '', labelBefore: 'Before', labelAfter: 'After', caption: '', start: 50 };
    return crafted('compare', 'Before / after', data, (f, d, preview) => {
      f.append(field('Before (left)', picture(d.before, v => { d.before = v; preview() })), field('After (right)', picture(d.after, v => { d.after = v; preview() })));
      f.append(field('Left label', bind(input(d.labelBefore), d, 'labelBefore', preview)), field('Right label', bind(input(d.labelAfter), d, 'labelAfter', preview)));
      f.append(field('Caption', bind(input(d.caption), d, 'caption', preview)));
      f.append(el('p', 'ad-note', 'Tip: both pictures should be the same size and framing.'));
    });
  }

  function cards(data) {
    data = data || { cards: [{ img: '', title: '', rarity: 5, back: '' }] };
    return crafted('cards', 'Flip cards', data, (f, d, preview, rebuild) => {
      d.cards.forEach((c, i) => {
        const box = el('fieldset', 'ad-scene');
        const lg = el('legend', '', 'Card ' + (i + 1)); lg.append(small('↑', () => move(d.cards, i, -1, rebuild)), small('✕', () => { d.cards.splice(i, 1); rebuild() }));
        const r = select([['3', '★★★ blue'], ['4', '★★★★ purple'], ['5', '★★★★★ gold']], String(c.rarity));
        r.addEventListener('change', () => { c.rarity = +r.value; preview() });
        box.append(lg, field('Front picture', picture(c.img, v => { c.img = v; preview() })), field('Name', bind(input(c.title), c, 'title', preview)), field('Rarity', r), field('Back', bind(input(c.back, { rows: 3 }), c, 'back', preview)));
        f.append(box);
      });
      if (d.cards.length < 12) f.append(small('+ Card', () => { d.cards.push({ img: '', title: '', rarity: 4, back: '' }); rebuild() }));
    });
  }

  function slides(data) {
    data = data || { slides: [{ img: '', label: 'Chapter one', who: '', red: false, quote: false, text: '' }] };
    return crafted('slides', 'Story slides', data, (f, d, preview, rebuild) => {
      f.append(el('p', 'ad-note', 'One slide per tap: a picture, a small label on top, and the text that types itself in the box at the bottom. Leave Speaker empty for NOTES.'));
      d.slides.forEach((s, i) => {
        const box = el('fieldset', 'ad-scene');
        const lg = el('legend', '', 'Slide ' + (i + 1));
        lg.append(small('⧉', () => { d.slides.splice(i + 1, 0, JSON.parse(JSON.stringify(s))); rebuild() }, 'Duplicate (same picture, new text)'), small('↑', () => move(d.slides, i, -1, rebuild)), small('✕', () => { d.slides.splice(i, 1); rebuild() }));
        const flags = el('div', 'ad-line');
        const chk = (label, key) => { const l = el('label', 'ad-check'); const c = input('', { type: 'checkbox' }); c.checked = Boolean(s[key]); c.addEventListener('change', () => { s[key] = c.checked; preview() }); l.append(c, label); return l };
        flags.append(chk('Speaker tag in red', 'red'), chk('Italic (a quote)', 'quote'));
        box.append(lg, field('Picture', picture(s.img, v => { s.img = v; preview() }), 'Leave empty to keep the previous one'),
          field('Label (top left)', bind(input(s.label, { placeholder: 'Miriam v1 · 10 Oct' }), s, 'label', preview)),
          field('Speaker', bind(input(s.who, { placeholder: 'NOTES' }), s, 'who', preview)), flags,
          field('Text', bind(input(s.text, { rows: 3, maxLength: 600 }), s, 'text', preview)));
        f.append(box);
      });
      if (d.slides.length < 40) f.append(small('+ Slide', () => { const last = d.slides[d.slides.length - 1] || {}; d.slides.push({ img: last.img || '', label: last.label || '', who: '', red: false, quote: false, text: '' }); rebuild() }));
    });
  }

  const MAKERS = { image: (n, f, o) => image(null, f, o), gallery: () => gallery(), video: () => video(), button: () => button(), scene: () => scene(), vn: () => vn(), hotspots: () => hotspots(), compare: () => compare(), cards: () => cards(), slides: () => slides() };
  const BLOCKS = { vn, hotspots, compare, cards, slides };
  return {
    ui: { open, field, input, select, picture, el },
    make: (kind, file, opts) => MAKERS[kind] ? MAKERS[kind](null, file, opts) : Promise.resolve(null),
    can: n => ['IMAGE', 'GALLERY', 'VIDEO', 'BUTTON', 'HTML'].includes(n.type) || (n.type === 'TZ_BLOCK' && BLOCKS[n.blockData.kind]),
    edit(n) {
      const copy = JSON.parse(JSON.stringify(n));
      if (n.type === 'IMAGE') return image(copy);
      if (n.type === 'GALLERY') return gallery(copy);
      if (n.type === 'VIDEO') return video(copy);
      if (n.type === 'BUTTON') return button(copy);
      if (n.type === 'HTML') return scene(copy);
      return BLOCKS[n.blockData.kind](copy.blockData.data);
    },
    ask: (t, label, value) => open(t, box => { const i = input(value); box.append(field(label, i)); return () => i.value.trim() }, 'OK'),
    confirm: msg => open('Are you sure?', box => { box.append(el('p', '', msg)); return () => true }, 'Yes'),
    choose: (t, options) => open(t, box => {
      const s = el('div', 'ad-rows'); let pick = null;
      if (!options.length) s.append(el('p', 'ad-empty', 'Nothing saved yet'));
      options.forEach(o => { const b = el('button', 'ad-item', o.label); b.type = 'button'; b.onclick = () => { pick = o.value; s.querySelectorAll('.on').forEach(x => x.classList.remove('on')); b.classList.add('on') }; s.append(b) });
      box.append(s);
      return () => { if (!pick) throw new Error('Pick one first'); return pick };
    }, 'Restore'),
  };
})();
