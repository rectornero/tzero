/* /admin: my profile, Nero's team (invite, roles, remove) and the Claude inbox (Nero and admins). */
(() => {
  const $ = id => document.getElementById(id);
  const { open, field, input, select, picture, el } = CRAFTS.ui;
  const api = (...a) => ADMIN.api(...a);
  const small = (t, fn) => { const b = el('button', 'btn ghost small', t); b.type = 'button'; b.onclick = fn; return b };

  // ---- My profile: shown on /people/<address> and under my articles ----
  $('open-profile').onclick = async () => {
    if (ADMIN.isLocal()) return ADMIN.status('Profiles need the signed-in editor', true);
    const p = await api('/api/me');
    const links = (p.links || []).slice();
    const saved = await open('My profile', box => {
      const name = input(p.name || '', { maxLength: 60 });
      const slug = input(p.slug || '', { maxLength: 40, spellcheck: false });
      const bio = input(p.bio || '', { rows: 4, maxLength: 600, placeholder: 'A few lines about you and what you make' });
      const pic = picture(p.avatar && p.avatar.startsWith('/api/media/') ? p.avatar : '', null);
      const rows = el('div', 'ad-rows');
      const row = l => { const r = el('div', 'ad-line'); const a = input(l.label, { placeholder: 'Label' }), u = input(l.url, { placeholder: 'https://…' }); a.oninput = () => { l.label = a.value }; u.oninput = () => { l.url = u.value }; r.append(a, u, small('✕', () => { links.splice(links.indexOf(l), 1); r.remove() })); return r };
      links.forEach(l => rows.append(row(l)));
      box.append(field('Name', name), field('Address', slug, 'Your page: /people/' + (p.slug || '…')), field('About you', bio),
        field('Picture', pic, 'Leave empty to use your GitHub picture'), field('Links', rows), small('+ Link', () => { if (links.length < 6) { const l = { label: '', url: '' }; links.push(l); rows.append(row(l)) } }));
      return () => ({ name: name.value, slug: slug.value, bio: bio.value, avatar: pic.get().value, links });
    }, 'Save');
    if (!saved) return;
    try { const r = await api('/api/me', { method: 'PUT', body: JSON.stringify(saved) }); ADMIN.status('Profile saved: /people/' + r.slug) } catch (e) { ADMIN.status('Profile not saved: ' + e.message, true) }
  };

  // ---- People (Nero only) ----
  const ROLE = [['collaborator', 'Collaborator: own articles, no-code blocks'], ['admin', 'Admin: also scene code, pages, Claude inbox, all posts']];
  $('open-team').onclick = async () => {
    if (ADMIN.isLocal()) return ADMIN.status('People need the signed-in editor', true);
    let team = (await api('/api/team')).team;
    await open('People', box => {
      box.append(el('p', 'ad-note', 'Invite someone by their GitHub name. They sign in at /admin with GitHub. Collaborators publish their own articles straight away; you can unpublish anything.'));
      const list = el('div', 'ad-team');
      const draw = () => list.replaceChildren(...team.map(t => {
        const r = el('div', 'ad-person' + (t.active ? '' : ' off'));
        const im = el('img'); im.alt = ''; if (t.avatar) im.src = t.avatar;
        const who = el('div', 'who'); who.append(el('b', '', t.name || t.login), el('span', '', '@' + t.login + (t.lastSeen ? ' · last in ' + new Date(t.lastSeen).toLocaleDateString() : ' · not signed in yet')));
        r.append(im, who);
        if (t.role === 'owner') { r.append(el('span', 'ad-chip', 'Owner')); return r }
        const role = select(ROLE.map(([v]) => [v, v === 'admin' ? 'Admin' : 'Collaborator']), t.role);
        role.onchange = async () => { await api('/api/team/' + t.id, { method: 'POST', body: JSON.stringify({ role: role.value }) }); t.role = role.value; ADMIN.status(t.login + ' is now ' + role.value) };
        const toggle = small(t.active ? 'Remove' : 'Bring back', async () => {
          await api('/api/team/' + t.id, { method: 'POST', body: JSON.stringify({ active: !t.active }) });
          t.active = !t.active; draw(); ADMIN.status(t.active ? t.login + ' is back' : t.login + ' was removed and signed out');
        });
        r.append(role, toggle);
        return r;
      }));
      draw();
      const login = input('', { placeholder: 'GitHub name' }), role = select(ROLE, 'collaborator');
      const add = small('Invite', async () => {
        try {
          const r = await api('/api/team', { method: 'POST', body: JSON.stringify({ login: login.value, role: role.value }) });
          team = (await api('/api/team')).team; draw(); login.value = ''; ADMIN.status(r.login + ' is invited. Send them the link: ' + location.origin + '/admin');
        } catch (e) { ADMIN.status('Not invited: ' + e.message, true) }
      });
      const inv = el('div', 'ad-line'); inv.append(login, role, add);
      box.append(list, el('h3', '', 'Invite'), inv);
      return () => true;
    }, 'Close', false);
  };

  // ---- Claude inbox (Nero and admins): notes, links and pictures for Claude to turn into a draft ----
  $('open-inbox').onclick = async () => {
    if (ADMIN.isLocal()) return ADMIN.status('The inbox needs the signed-in editor', true);
    let items = (await api('/api/admin/inbox')).items;
    const pics = [];
    const sent = await open('Claude inbox', box => {
      box.append(el('p', 'ad-note', 'Drop notes, links and pictures here. Claude reads the inbox, writes a draft from it, and the draft appears in your list signed by Claude, ready for you to edit and publish. Collaborators can\'t see this.'));
      const text = input('', { rows: 6, placeholder: 'What should the article be about? Paste notes, quotes, links…' });
      const pic = picture('', v => { if (v && !pics.includes(v) && v.startsWith('/api/media/')) { pics.push(v); thumbs.append(Object.assign(el('img'), { src: v, alt: '' })) } });
      const thumbs = el('div', 'ad-thumbs');
      box.append(field('New material', text), field('Pictures', pic), thumbs);
      const list = el('div', 'ad-rows');
      const draw = () => list.replaceChildren(...(items.length ? items.map(it => {
        const r = el('div', 'ad-inbox-item' + (it.status === 'done' ? ' done' : ''));
        r.append(el('span', 'meta', new Date(it.at).toLocaleString() + ' · ' + it.by + ' · ' + (it.status === 'done' ? 'done' + (it.draft ? ' → draft "' + it.draft + '"' : '') : 'waiting for Claude')), el('p', '', it.text));
        if (it.note) r.append(el('p', 'meta', 'Claude: ' + it.note));
        if (it.pictures && it.pictures.length) { const t = el('div', 'ad-thumbs'); it.pictures.forEach(u => t.append(Object.assign(el('img'), { src: u, alt: '' }))); r.append(t) }
        r.append(small('Delete', async () => { await api('/api/admin/inbox/' + it.id, { method: 'POST', body: JSON.stringify({ status: 'deleted' }) }); items = items.filter(x => x !== it); draw() }));
        return r;
      }) : [el('p', 'ad-empty', 'Empty. Drop something above.')]));
      draw();
      box.append(el('h3', '', 'In the inbox'), list);
      return () => text.value.trim() || pics.length ? { text: text.value, pictures: pics } : null;
    }, 'Send to Claude', true);
    if (!sent) return;
    try { await api('/api/admin/inbox', { method: 'POST', body: JSON.stringify(sent) }); ADMIN.status('In Claude\'s inbox') } catch (e) { ADMIN.status('Not sent: ' + e.message, true) }
  };
})();
