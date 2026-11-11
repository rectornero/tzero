/* /admin/site: the site desk. Nero (and admins) change the live site here without a deploy: the notice bar, Ache's
   news moment, the homepage's first polaroid, the newsletter form, switches, takedowns, short links, uploaded
   pictures; and everything about Claude's access: what it may do alone, its proposals, the activity log.
   Talks to /api/settings (netlify/functions/site.mjs) and /api/admin/media (content.mjs). Everything is drawn with
   createElement/textContent; nothing typed here is ever parsed as HTML. */
(() => {
  const $ = id => document.getElementById(id);
  const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e };
  let S = null, FLAGS = {}, AREAS = {}, me = { role: 'owner' }, demo = false, claudeKey = false;

  const status = (t, bad) => { const s = $('status'); s.textContent = t; s.classList.toggle('bad', Boolean(bad)) };
  async function api(path, opts = {}) {
    if (demo) { if (opts.method && opts.method !== 'GET') throw new Error('Sign in to save'); return {} }
    const r = await fetch(path, { credentials: 'same-origin', ...opts, headers: { 'x-tz': '1', ...(typeof opts.body === 'string' ? { 'Content-Type': 'application/json' } : {}), ...(opts.headers || {}) } });
    const j = await r.json().catch(() => ({}));
    if (r.status === 401) { gate('Your session ended. Sign in again.'); throw new Error('signed out') }
    if (!r.ok) throw new Error((j.details || [j.error || r.status]).join(', '));
    return j;
  }
  async function save(patch, note, done) {
    status('Saving…');
    try {
      const r = await api('/api/settings', { method: 'PATCH', body: JSON.stringify({ patch, note }) });
      S = r.settings; status('Live. Readers see it within seconds.'); draw(); if (done) done();
    } catch (e) { status('Not saved: ' + e.message, true) }
  }

  // ---- small form helpers ----
  const field = (label, input, hint) => { const l = el('label', 'ad-field'); l.append(el('span', '', label), input); if (hint) l.append(el('small', '', hint)); return l };
  const input = (value = '', attrs = {}) => { const i = el(attrs.rows ? 'textarea' : 'input'); Object.assign(i, attrs); i.value = value == null ? '' : value; return i };
  const select = (options, value) => { const s = el('select'); for (const [v, t] of options) { const o = el('option', '', t); o.value = v; s.append(o) } s.value = value; return s };
  const check = (label, on, hint) => { const l = el('label', 'sd-check'), c = el('input'); c.type = 'checkbox'; c.checked = Boolean(on); const t = el('span'); t.append(el('b', '', label)); if (hint) t.append(el('small', '', hint)); l.append(c, t); l.box = c; return l };
  const button = (text, fn, cls = 'btn') => { const b = el('button', cls, text); b.type = 'button'; b.onclick = fn; return b };
  const when = iso => iso ? new Date(iso).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '';
  const local = iso => iso ? new Date(new Date(iso).getTime() - new Date().getTimezoneOffset() * 6e4).toISOString().slice(0, 16) : '';

  const SECTIONS = [];
  function section(id, title, blurb, build, opts = {}) { SECTIONS.push({ id, title, blurb, build, ...opts }) }

  // 01 ---- Notice bar ----
  section('notice', 'Notice bar', 'A coloured bar at the very top of every page. Readers can close it; a new text shows again.', box => {
    const n = S.notice;
    const on = check('Show the bar', n.on), text = input(n.text, { maxLength: 280, placeholder: 'Starchasers v0.9 is out today' });
    const link = input(n.link, { placeholder: '/starchasers or https://…' }), linkText = input(n.linkText, { maxLength: 60, placeholder: 'Take a look' });
    const tone = select([['red', 'Red'], ['navy', 'Navy'], ['sun', 'Yellow']], n.tone), until = input(local(n.until), { type: 'datetime-local' });
    const view = el('div', 'sd-preview');
    const paint = () => {
      const bar = el('div', 'tz-notice tone-' + tone.value); bar.append(el('span', 'tz-notice-star'), el('span', '', text.value || 'Your text shows here'));
      if (link.value) bar.append(el('u', '', linkText.value || 'Open'));
      view.replaceChildren(bar);
    };
    for (const x of [text, link, linkText, tone]) x.addEventListener('input', paint); paint();
    box.append(on, field('Text', text), el('div', 'sd-row'), view);
    box.querySelector('.sd-row').append(field('Link (optional)', link), field('Link text', linkText), field('Colour', tone), field('Take it down by itself at', until, 'Empty = stays until you switch it off'));
    return () => ({ notice: { on: on.box.checked, text: text.value, link: link.value, linkText: linkText.value, tone: tone.value, until: until.value ? new Date(until.value).toISOString() : '' } });
  });

  // 02 ---- Ache's news moment ----
  section('mood', "Ache's news moment", 'When big news hits, Ache grieves over one article: he walks to its card and plays his scene. This used to need the "Ache grief" tag on Wix.', box => {
    const m = S.mood;
    const mode = select([['wix', 'Follow the old Wix tag (as before)'], ['on', 'On: the article below'], ['off', 'Off: no news moment']], m.mode);
    const slug = input(m.slug, { placeholder: 'pokemon-unite-is-ending', spellcheck: false }), topic = input(m.topic, { maxLength: 120, placeholder: 'Pokémon UNITE is closing' });
    const lines = input(m.lines.join('\n'), { rows: 4, placeholder: 'One line per row. Empty = his usual news lines.' });
    box.append(field('Mode', mode), field('Article address (the part after /post/)', slug), field('What the news is, in a few words', topic), field('What he says near that article', lines));
    return () => ({ mood: { mode: mode.value, slug: slug.value.trim().replace(/^.*\/post\//, ''), topic: topic.value, lines: lines.value.split('\n').map(l => l.trim()).filter(Boolean) } });
  });

  // 03 ---- Homepage pick ----
  section('home', "Homepage: the first polaroid", "The polaroid on the left of the front page (now: Starchasers). Set your own pick here. The second one follows the newest article by itself.", box => {
    const p = S.home.pick;
    const on = check('Use my pick', p.on, 'Off = the one built into the page');
    const img = input(p.img, { placeholder: '/assets/img/… or https://…' }), alt = input(p.alt, { maxLength: 200 }), cap = input(p.cap, { maxLength: 80, placeholder: 'Starchasers, setting sail' });
    const kick = input(p.kick, { maxLength: 60, placeholder: "Ache's pick" }), note = input(p.note, { rows: 2, maxLength: 300, placeholder: "What Ache wrote on the back" });
    const href = input(p.href, { placeholder: '/starchasers' }), linkText = input(p.linkText, { maxLength: 60, placeholder: 'Open Starchasers' });
    const up = el('input'); up.type = 'file'; up.accept = 'image/webp,image/png,image/jpeg,image/gif';
    up.onchange = async () => {
      const f = up.files[0]; if (!f) return;
      if (f.size > 2e6) return status('That picture is over 2 MB', true);
      status('Uploading…');
      try { const r = await api('/api/admin/media', { method: 'POST', body: f, headers: { 'Content-Type': f.type } }); img.value = r.url; status('Uploaded. Save to use it.') } catch (e) { status('Not uploaded: ' + e.message, true) }
    };
    const row = el('div', 'sd-row'), row2 = el('div', 'sd-row');
    row.append(field('Picture address', img), field('…or upload one (under 2 MB)', up));
    row2.append(field('Caption under the photo', cap), field('Small line on the back', kick), field('Link', href), field('Link text', linkText));
    box.append(on, row, field('What the picture shows (for screen readers)', alt), row2, field("Ache's note on the back", note),
      el('p', 'sd-warn', 'Licensing: no Starchasers crew art and no old characters. The ship, the emblem and the Weary Reach maps are fine.'));
    return () => ({ home: { pick: { on: on.box.checked, img: img.value.trim(), alt: alt.value, cap: cap.value, kick: kick.value, note: note.value, href: href.value.trim(), linkText: linkText.value } } });
  });

  // 04 ---- Newsletter ----
  section('newsletter', 'Newsletter form', 'The "Letters from the shore" band above the footer says "Opening soon" until a form is set here.', box => {
    const n = S.newsletter;
    const provider = select([['', 'Not open yet'], ['kit', 'Kit'], ['buttondown', 'Buttondown'], ['mailerlite', 'MailerLite']], n.provider);
    const id = input(n.id, { placeholder: 'Kit: the form id (numbers)', spellcheck: false });
    const row = el('div', 'sd-row'); row.append(field('Service', provider), field('Form id', id, 'Kit: form id. Buttondown: your username. MailerLite: account/form, like 123/456.'));
    box.append(row);
    return () => ({ newsletter: { provider: provider.value, id: id.value.trim() } });
  });

  // 05 ---- Switches ----
  section('flags', 'Switches', 'Turn parts of the site on or off. New features can ship switched off and be turned on here later.', box => {
    const flags = { ...S.flags }; for (const k of Object.keys(FLAGS)) if (!(k in flags)) flags[k] = true;
    const rows = el('div', 'sd-list'), boxes = {};
    for (const [k, v] of Object.entries(flags)) { const c = check(FLAGS[k] || k, v, FLAGS[k] ? k : 'your own switch'); boxes[k] = c.box; rows.append(c) }
    const name = input('', { placeholder: 'new-switch-name', pattern: '[a-z0-9-]+', spellcheck: false });
    const add = button('+ Add a switch', () => {
      const k = name.value.trim(); if (!/^[a-z0-9][a-z0-9-]{0,59}$/.test(k) || boxes[k]) return status('A switch name uses a-z, 0-9 and dashes', true);
      const c = check(k, false, 'your own switch'); boxes[k] = c.box; rows.append(c); name.value = '';
    }, 'btn ghost small');
    const row = el('div', 'sd-add'); row.append(name, add);
    box.append(rows, row);
    return () => ({ flags: Object.fromEntries(Object.entries(boxes).map(([k, b]) => [k, b.checked])) });
  });

  // 06 ---- Takedowns ----
  section('hide', 'Takedowns', 'Hide a page, a post or a picture right now, for example when a licence problem shows up. Each one is a row you can remove to bring it back.', box => {
    const hide = JSON.parse(JSON.stringify(S.hide));
    const lists = el('div');
    const KINDS = [
      ['paths', 'path', 'Pages', '/characters', 'The page shows a "resting" card instead of its content.'],
      ['posts', 'slug', 'Posts', 'the-part-after-/post/', 'The article shows the "resting" card and its cards leave every listing.'],
      ['images', 'match', 'Pictures', 'starchasers/crew- or a full address', 'Every picture whose address contains this text disappears, on every page.'],
    ];
    const paint = () => {
      lists.replaceChildren();
      for (const [key, f, title, ph, what] of KINDS) {
        const wrap = el('div', 'sd-take'); wrap.append(el('h3', '', title), el('p', 'ad-note', what));
        const ul = el('ul', 'sd-rows');
        hide[key].forEach((x, i) => {
          const li = el('li'); const t = el('div'); t.append(el('code', '', x[f]), el('small', '', (x.note ? x.note + ' · ' : '') + when(x.at)));
          li.append(t, button('Bring back', () => { hide[key].splice(i, 1); paint() }, 'btn ghost small')); ul.append(li);
        });
        if (!hide[key].length) ul.append(el('li', 'ad-empty', 'Nothing hidden'));
        const v = input('', { placeholder: ph, spellcheck: false }), note = input('', { placeholder: 'Why (for the log)', maxLength: 300 });
        const add = el('div', 'sd-add'); add.append(v, note, button('Hide', () => {
          let val = v.value.trim(); if (!val) return;
          if (key === 'posts') val = val.replace(/^.*\/post\//, '').replace(/\/$/, '');
          if (key === 'paths') { try { val = new URL(val, location.origin).pathname } catch (e) {} }
          hide[key].push({ [f]: val, note: note.value.trim(), at: new Date().toISOString() }); paint();
        }, 'btn ghost small'));
        wrap.append(ul, add); lists.append(wrap);
      }
    };
    paint();
    box.append(lists, el('p', 'sd-warn', 'Good to know: this hides things in the reader\'s browser within seconds. A file that lives in the site\'s code is still reachable by its direct address until the next deploy removes it; uploaded pictures can be deleted for good under Pictures.'));
    return () => ({ hide });
  }, { saveLabel: 'Save takedowns' });

  // 07 ---- Short links ----
  section('links', 'Short links', 'tzero.live/go/name sends people wherever you point it. Change the target any time; printed links keep working.', box => {
    const links = { ...S.links }, ul = el('ul', 'sd-rows');
    const paint = () => {
      ul.replaceChildren();
      for (const [k, to] of Object.entries(links)) {
        const li = el('li'), t = el('div'); t.append(el('code', '', '/go/' + k), el('small', '', '→ ' + to));
        li.append(t, button('Copy', () => navigator.clipboard && navigator.clipboard.writeText(location.origin + '/go/' + k).then(() => status('Copied')), 'btn ghost small'), button('Remove', () => { delete links[k]; paint() }, 'btn ghost small'));
        ul.append(li);
      }
      if (!Object.keys(links).length) ul.append(el('li', 'ad-empty', 'No short links yet'));
    };
    paint();
    const name = input('', { placeholder: 'name (a-z, 0-9, dashes)', spellcheck: false }), to = input('', { placeholder: 'https://… or /a-page-here' });
    const add = el('div', 'sd-add'); add.append(name, to, button('Add', () => {
      const k = name.value.trim(); if (!/^[a-z0-9][a-z0-9-]{0,59}$/.test(k) || !to.value.trim()) return status('A name (a-z, 0-9, dashes) and a target', true);
      links[k] = to.value.trim(); name.value = to.value = ''; paint();
    }, 'btn ghost small'));
    box.append(ul, add);
    // Removed links must be sent as null so the merge drops them
    return () => ({ links: { ...Object.fromEntries(Object.keys(S.links).map(k => [k, null])), ...links } });
  });

  // 08 ---- Pictures ----
  section('media', 'Pictures', 'Every picture uploaded through the editor. Delete removes it from the site for good.', box => {
    const grid = el('div', 'sd-media'); grid.append(el('p', 'ad-empty', 'Loading…'));
    api('/api/admin/media').then(r => {
      const list = r.media || [];
      grid.replaceChildren();
      if (!list.length) grid.append(el('p', 'ad-empty', demo ? 'Sign in to see the pictures' : 'No uploads yet'));
      for (const m of list) {
        const fig = el('figure'), img = el('img'); img.src = m.url; img.alt = ''; img.loading = 'lazy';
        const cap = el('figcaption'); cap.append(el('small', '', (m.by || '?') + ' · ' + when(m.at)));
        cap.append(button('Copy address', () => navigator.clipboard && navigator.clipboard.writeText(m.url).then(() => status('Copied')), 'btn ghost small'), button('Delete', async () => {
          if (!confirm('Delete this picture for good? Articles that use it will show a gap.')) return;
          try { await api('/api/admin/media/' + m.id, { method: 'DELETE' }); fig.remove(); status('Deleted') } catch (e) { status(e.message, true) }
        }, 'btn ghost small'));
        fig.append(img, cap); grid.append(fig);
      }
    }).catch(e => grid.replaceChildren(el('p', 'ad-empty', e.message)));
    box.append(grid);
  }, { noSave: true });

  // 09 ---- Claude ----
  section('claude', 'Claude', 'Claude has its own door to this admin (a documented API and tools). Here you decide what it may do alone; everything else it asks for shows up below for your yes or no.', box => {
    box.append(el('p', claudeKey ? 'sd-ok' : 'sd-warn', claudeKey ? 'Claude\'s key is set: its door is open.' : 'Claude\'s key (TZ_CLAUDE_KEY) is not set in Netlify yet, so its door is closed. Everything else here works.'));
    const boxes = {}, rows = el('div', 'sd-list');
    for (const [k, label] of Object.entries(AREAS)) { const c = check(label, S.claude[k], S.claude[k] ? 'Claude does this alone (it is logged)' : 'Claude asks first'); boxes[k] = c.box; c.box.disabled = me.role !== 'owner'; rows.append(c) }
    box.append(el('h3', '', 'What Claude may do alone'), rows);
    if (me.role !== 'owner') box.append(el('p', 'ad-note', 'Only Nero changes these.'));
    const props = el('div', 'sd-props'); props.append(el('p', 'ad-empty', 'Loading…'));
    box.append(el('h3', '', 'Waiting for your answer'), props);
    api('/api/settings/proposals').then(r => {
      const list = r.proposals || [];
      props.replaceChildren();
      if (!list.length) props.append(el('p', 'ad-empty', 'Nothing is waiting'));
      for (const p of list) {
        const card = el('article', 'sd-prop');
        const what = p.kind === 'publish' ? 'Publish "' + (p.payload.title || p.payload.slug) + '"' : p.kind === 'lines' ? 'New lines for Ache: ' + Object.keys(p.payload.topics).join(', ') : 'Change settings: ' + Object.keys(p.payload.patch || {}).join(', ');
        card.append(el('b', '', what), el('small', '', when(p.at)));
        if (p.note) card.append(el('p', '', p.note));
        const detail = el('details'); detail.append(el('summary', '', 'See exactly what changes'), el('pre', '', JSON.stringify(p.payload, null, 2))); card.append(detail);
        if (p.kind === 'publish') { const a = el('a', 'ad-link', 'Open the draft in the editor'); a.href = '/admin'; card.append(a) }
        const acts = el('div', 'sd-add');
        const answer = async action => {
          status(action === 'approve' ? 'Approving…' : 'Declining…');
          try { await api('/api/settings/proposals/' + p.id, { method: 'POST', body: JSON.stringify({ action }) }); card.remove(); status(action === 'approve' ? 'Approved: it is live.' : 'Declined.'); if (action === 'approve' && p.kind === 'settings') load() } catch (e) { status(e.message, true) }
        };
        acts.append(button('Approve', () => answer('approve')), button('Decline', () => answer('decline'), 'btn ghost'));
        card.append(acts); props.append(card);
      }
      const n = $('nav').querySelector('[data-id=claude] span'); if (n) { n.textContent = list.length || ''; n.classList.toggle('ch', list.length > 0) }
    }).catch(() => props.replaceChildren(el('p', 'ad-empty', 'Could not load')));
    return () => ({ claude: Object.fromEntries(Object.entries(boxes).map(([k, b]) => [k, b.checked])) });
  }, { saveLabel: 'Save what Claude may do', ownerSave: true });

  // 10 ---- Activity ----
  section('log', 'Activity log', 'Everything changed in the editor and on this desk, newest first: who, what, when.', box => {
    const ul = el('ul', 'sd-rows sd-log'); ul.append(el('li', 'ad-empty', 'Loading…'));
    api('/api/settings/log?limit=80').then(r => {
      ul.replaceChildren();
      for (const l of r.log || []) { const li = el('li'), t = el('div'); t.append(el('b', '', l.by + ' ' + l.action), el('small', '', l.what)); li.append(t, el('time', '', when(l.at))); if (l.role === 'claude') li.classList.add('by-claude'); ul.append(li) }
      if (!(r.log || []).length) ul.append(el('li', 'ad-empty', 'Nothing yet'));
    }).catch(() => {});
    box.append(ul);
  }, { noSave: true });

  // 11 ---- History ----
  section('history', 'History', 'Every save of this desk. Bring an old one back if something went wrong.', box => {
    const ul = el('ul', 'sd-rows'); ul.append(el('li', 'ad-empty', 'Loading…'));
    api('/api/settings/versions').then(r => {
      ul.replaceChildren();
      (r.versions || []).slice(0, 30).forEach((v, i) => {
        const li = el('li'), t = el('div'); t.append(el('b', '', when(v)), el('small', '', i === 0 ? 'the live one' : ''));
        li.append(t); if (i) li.append(button('Bring back', async () => {
          if (!confirm('Put the settings from ' + when(v) + ' back live?')) return;
          try { const x = await api('/api/settings/restore/' + encodeURIComponent(v), { method: 'POST' }); S = x.settings; status('Restored and live'); draw() } catch (e) { status(e.message, true) }
        }, 'btn ghost small'));
        ul.append(li);
      });
      if (!(r.versions || []).length) ul.append(el('li', 'ad-empty', 'No saves yet'));
    }).catch(() => {});
    box.append(ul);
  }, { noSave: true });

  function draw() {
    const main = $('main'), nav = $('nav'), y = scrollY;
    main.replaceChildren(); nav.replaceChildren(el('h3', '', 'Codex · Site desk'));
    SECTIONS.forEach((s, i) => {
      const num = String(i + 1).padStart(2, '0');
      const a = el('a', '', s.title); a.href = '#' + s.id; a.dataset.id = s.id; a.append(el('span', '', '')); nav.append(a);
      const card = el('section', 'al-set sd-card'); card.id = s.id;
      const head = el('div', 'al-sh'); head.append(el('h2', '', num + ' · ' + s.title), el('p', '', s.blurb)); card.append(head);
      const body = el('div', 'sd-body'); card.append(body);
      const get = s.build(body);
      if (!s.noSave && get && !(s.ownerSave && me.role !== 'owner')) {
        const foot = el('div', 'sd-foot');
        foot.append(button(s.saveLabel || 'Save and put live', () => { try { save(get(), s.title) } catch (e) { status(e.message, true) } }));
        card.append(foot);
      }
      main.append(card);
    });
    scrollTo(0, y);
  }

  async function load() {
    const r = await api('/api/settings');
    S = r.settings; FLAGS = r.flags || {}; AREAS = r.areas || {}; claudeKey = Boolean(r.claudeKey);
    draw();
  }
  function gate(msg) { $('app').hidden = true; $('gate').hidden = false; if (msg) $('gate-msg').textContent = msg }
  const DEMO = {
    notice: { on: false, text: '', link: '', linkText: '', tone: 'red', until: '' }, mood: { mode: 'wix', slug: '', topic: '', lines: [] }, newsletter: { provider: '', id: '' },
    home: { pick: { on: false, img: '', alt: '', cap: '', kick: '', note: '', href: '', linkText: '' } }, hide: { paths: [], posts: [], images: [] }, flags: { 'cq-wip': true }, links: {},
    claude: { takedowns: true },
  };
  $('demo').onclick = () => {
    demo = true; S = DEMO; FLAGS = { 'cq-wip': 'Contrary Quest "under construction" tape cards' };
    AREAS = { takedowns: 'Hide pages, posts and pictures (licensing takedowns)', notice: 'The notice bar', publish: 'Publish articles' };
    $('gate').hidden = true; $('app').hidden = false; draw(); status('Looking around: nothing is saved');
  };
  fetch('/api/auth/me', { credentials: 'same-origin' }).then(async r => {
    if (!r.ok) { const j = await r.json().catch(() => ({})); return gate(j.ready === false ? 'GitHub sign-in is not set up yet.' : 'For Nero and the admins. Sign in with GitHub to open the desk.') }
    me = await r.json();
    if (me.role !== 'owner' && me.role !== 'admin') return gate('The site desk is for Nero and the admins.');
    document.body.classList.add('role-' + me.role);
    $('gate').hidden = true; $('app').hidden = false;
    await load();
    if (location.hash) { const t = document.getElementById(location.hash.slice(1)); if (t) t.scrollIntoView() }
  }).catch(() => gate('The desk\'s server is not reachable from here.'));
})();
