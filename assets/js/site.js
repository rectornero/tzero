/* The site desk, applied: what Nero sets at /admin/site reaches every page here, without a deploy.
   scene.js starts the one request (window.TZSITE = GET /api/site, cached on Netlify's CDN) and loads this file.
   It draws the notice bar, hides what was taken down (pages, posts, pictures), turns switches off, swaps the
   homepage's first polaroid and tags the article of Ache's news moment. The last answer is remembered in this
   browser, so takedowns apply at once on the next visit instead of after the request. */
(() => {
  const KEY = 'tz-site', root = document.documentElement;
  const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e };
  const style = el('style'); style.id = 'tz-site-style'; document.head.appendChild(style);
  const here = () => { let p = location.pathname; try { p = decodeURIComponent(p) } catch (e) {} return p.replace(/\.html$/, '').replace(/\/+$/, '') || '/' };
  const safeHref = u => { try { const x = new URL(u, location.href); return x.protocol === 'https:' || x.origin === location.origin ? x.href : null } catch (e) { return null } };
  // Switches that hide something when off
  const OFF = { 'cq-wip': '.wip', 'share-row': '.share', 'newsletter-band': '#letters' };
  let S = null, rested = false;

  function css(s) {
    const rules = ['.tz-hid{display:none!important}'];
    for (const m of (s.hide && s.hide.images) || []) if (!/["\\<>{}]/.test(m)) rules.push('img[src*="' + m + '"],source[srcset*="' + m + '"],image[href*="' + m + '"]{display:none!important}');
    for (const [k, sel] of Object.entries(OFF)) if (s.flags && s.flags[k] === false) rules.push(sel + '{display:none!important}');
    style.textContent = rules.join('\n');
  }

  // A page that was taken down: everything between the header and the footer rests
  function rest(note) {
    if (rested) return; rested = true;
    const head = document.querySelector('body > header'); if (!head) return;
    for (let n = head.nextElementSibling; n && n.id !== 'publisher' && n.id !== 'letters'; n = n.nextElementSibling) if (!/^(SCRIPT|CANVAS)$/.test(n.tagName)) n.classList.add('tz-hid');
    const box = el('section', 'tz-rest');
    box.append(el('p', 'tz-rest-k', 'Resting'), el('h1', '', 'This page is resting for now.'), el('p', '', note || 'We took it down for a while. It may come back redrawn.'));
    const a = el('a', 'btn', 'Back to the front page'); a.href = '/'; box.append(a);
    head.after(box);
    document.title = 'Resting · TZERØ';
    let m = document.querySelector('meta[name=robots]'); if (!m) { m = el('meta'); m.name = 'robots'; document.head.appendChild(m) } m.content = 'noindex';
  }
  function takedowns(s) {
    const h = s.hide || {}, p = here();
    const hit = (h.paths || []).find(x => x.path === p) || ((h.posts || []).some(slug => p === '/post/' + slug) ? {} : null);
    if (hit) rest(hit.note);
  }
  // Cards and links to hidden posts, wherever they are drawn (listings load after the page)
  function sweep(s) {
    const posts = (s.hide && s.hide.posts) || [], mood = s.mood && s.mood.mode === 'on' ? s.mood : null;
    if (!posts.length && !mood) return;
    for (const a of document.querySelectorAll('a[href*="/post/"]')) {
      let slug; try { slug = decodeURIComponent(new URL(a.href, location.href).pathname.split('/post/')[1] || '').replace(/\/$/, '') } catch (e) { continue }
      if (posts.includes(slug)) { const card = a.closest('.card,li') || a; card.classList.add('tz-hid') }
      else if (mood && slug === mood.slug && a.classList.contains('card') && a.dataset.say !== 'news') a.dataset.say = 'news';
    }
  }

  function notice(s) {
    const old = document.getElementById('tz-notice'), n = s.notice;
    let seen = ''; try { seen = localStorage.getItem('tz-notice-seen') || '' } catch (e) {}
    if (!n || !n.text || seen === n.id) { if (old) old.remove(); return }
    if (old && old.dataset.id === n.id) return;
    if (old) old.remove();
    const bar = el('aside', 'tz-notice tone-' + (n.tone || 'red')); bar.id = 'tz-notice'; bar.dataset.id = n.id; bar.dataset.say = 'notice';
    bar.setAttribute('role', 'region'); bar.setAttribute('aria-label', 'Notice');
    const star = el('span', 'tz-notice-star'); star.setAttribute('aria-hidden', 'true');
    bar.append(star, el('span', 'tz-notice-text', n.text));
    const href = n.link && safeHref(n.link);
    if (href) { const a = el('a', '', n.linkText || 'Open'); a.href = href; bar.append(a) }
    const x = el('button', '', '✕'); x.type = 'button'; x.setAttribute('aria-label', 'Close this notice');
    x.onclick = () => { bar.remove(); try { localStorage.setItem('tz-notice-seen', n.id) } catch (e) {} };
    bar.append(x);
    document.body.prepend(bar);
  }

  // The homepage's first polaroid, when Nero set his own pick
  function pick(s) {
    const p = s.home && s.home.pick, pol = document.querySelector('.polaroid[data-pick="a"]');
    if (!p || !pol || pol.dataset.set) return;
    pol.dataset.set = '1';
    const img = pol.querySelector('.pol-front img'), a = pol.querySelector('.pol-open'), href = p.href && safeHref(p.href), src = p.img && safeHref(p.img);
    if (src) { img.src = src; img.alt = p.alt || p.cap || '' }
    if (p.cap) pol.querySelector('.cap').textContent = p.cap;
    if (p.kick) pol.querySelector('.pol-kick').textContent = p.kick;
    if (p.note) pol.querySelector('.pol-note').textContent = p.note;
    if (href) { a.href = href; a.textContent = (p.linkText || 'Open') + ' →' }
  }

  function apply(s) {
    if (!s || typeof s !== 'object') return;
    S = s;
    css(s); takedowns(s); notice(s); pick(s); sweep(s);
    if (s.mood && s.mood.mode === 'on' && s.mood.lines && s.mood.lines.length && window.TZ && TZ.addLines) TZ.addLines('news', s.mood.lines);
    root.dataset.site = s.at || 'default';
  }

  let cached = null; try { cached = JSON.parse(localStorage.getItem(KEY)) } catch (e) {}
  const start = () => {
    if (cached) apply(cached);
    (window.TZSITE || (window.TZSITE = fetch('/api/site').then(r => r.ok ? r.json() : {}).catch(() => ({})))).then(s => {
      if (!s || !s.flags) return; // the function isn't there (local preview): keep what we had
      try { localStorage.setItem(KEY, JSON.stringify({ ...s, lines: undefined })) } catch (e) {}
      apply(s);
    });
    // Listings arrive later: sweep again when cards are added (cheap: only looks when nodes were added)
    let t = null;
    new MutationObserver(() => { if (!S || t) return; t = setTimeout(() => { t = null; sweep(S); pick(S) }, 120) }).observe(document.body, { childList: true, subtree: true });
  };
  if (cached) css(cached); // pictures taken down never flash
  if (document.body) start(); else addEventListener('DOMContentLoaded', start);
})();
