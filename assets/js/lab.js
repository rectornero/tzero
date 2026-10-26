/* Idea Lab (/lab): one small toy per idea, and the hearts.
   Toys start behind a Play button, so nothing moves until the reader asks. None of them has a timer:
   the studio's games don't run on countdowns, so their toys don't either.
   Hearts go to the one function on this site (netlify/functions/votes.mjs). The browser remembers which ideas
   this reader hearted; the counts come from the function, cached for a minute. */
(() => {
  const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e };
  const pick = a => a[Math.floor(Math.random() * a.length)];
  const shuffle = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]] } return a };

  // ---------- Toys ----------
  const TOYS = {};

  function mount(box) {
    const toy = TOYS[box.dataset.toy];
    if (!toy) return;
    const start = el('button', 'start');
    start.type = 'button';
    start.append(el('i', null, '▶'), el('b', null, toy.title), el('span', null, toy.sub));
    start.onclick = () => run();
    box.replaceChildren(start);
    // Taps inside a toy are moves, not page clicks: no splash or memory text from the page effects
    box.addEventListener('click', e => e.stopPropagation());
    function run() {
      if (box._stop) box._stop();
      box._stop = null;
      box.replaceChildren();
      const again = () => { const b = el('button', 'again', '↺ Play again'); b.type = 'button'; b.onclick = run; box.append(b) };
      box._stop = toy.run(box, again) || null;
    }
  }

  // Liminal Outliers: a dark hall, a torch under your finger, and the lodge's warm light leaning toward what matters
  TOYS.light = {
    title: 'The hall at night', sub: 'Find three things',
    run(box, again) {
      box.classList.add('t-light');
      const cv = el('canvas'); const hud = el('div', 'hud'); const msg = el('div', 'msg', 'Move or tap. The warm light knows where to look.');
      const left = el('span'); const right = el('b', null, '0 / 3'); left.textContent = 'Ground floor';
      hud.append(left, right); box.append(cv, hud, msg);
      const ctx = cv.getContext('2d');
      let W = 0, H = 240, dpr = 1;
      const size = () => { dpr = Math.min(2, devicePixelRatio || 1); W = box.clientWidth; H = Math.max(240, box.clientHeight); cv.width = W * dpr; cv.height = H * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0) };
      size();
      const spots = shuffle([
        { x: .74, y: .74, label: 'a key on the third step' },
        { x: .36, y: .34, label: 'a letter stuck halfway into box 9' },
        { x: .52, y: .9, label: 'sand on the tiles, still damp' },
        { x: .9, y: .5, label: 'a lift button, warm to the touch' },
      ]).slice(0, 3);
      const lodge = { x: .14, y: .88 };
      let px = W * .5, py = H * .5, found = 0, alive = true, t = 0, raf;
      const near = s => Math.hypot(s.x * W - px, s.y * H - py) < 30;
      function room(a) {
        ctx.strokeStyle = 'rgba(150,175,220,' + a + ')'; ctx.fillStyle = 'rgba(150,175,220,' + a * .35 + ')'; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.moveTo(0, H * .92); ctx.lineTo(W, H * .92); ctx.stroke();
        ctx.strokeRect(W * .06, H * .42, W * .16, H * .5);                       // lodge door
        for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) ctx.strokeRect(W * (.28 + c * .055), H * (.22 + r * .09), W * .045, H * .07); // letterboxes
        for (let i = 0; i < 5; i++) ctx.fillRect(W * (.62 + i * .045), H * (.92 - (i + 1) * .09), W * .25, H * .09); // stairs
        ctx.strokeRect(W * .86, H * .3, W * .1, H * .62);                        // lift
      }
      function frame() {
        if (!alive) return;
        raf = requestAnimationFrame(frame);
        if (document.hidden) return;
        t += 1 / 60;
        ctx.globalCompositeOperation = 'source-over';
        ctx.fillStyle = '#0a1120'; ctx.fillRect(0, 0, W, H);
        room(.2);
        // the gap under the lodge door
        ctx.fillStyle = 'rgba(255,190,100,.85)'; ctx.fillRect(W * .06, H * .9, W * .16, 3);
        ctx.globalCompositeOperation = 'lighter';
        const target = spots.find(s => !s.got);
        if (target) {
          const tx = target.x * W, ty = target.y * H, pulse = .55 + .25 * Math.sin(t * 2.2);
          const g = ctx.createLinearGradient(lodge.x * W, lodge.y * H, tx, ty);
          g.addColorStop(0, 'rgba(255,180,90,.28)'); g.addColorStop(1, 'rgba(255,180,90,' + .12 * pulse + ')');
          ctx.strokeStyle = g; ctx.lineWidth = 26; ctx.lineCap = 'round';
          ctx.beginPath(); ctx.moveTo(lodge.x * W, lodge.y * H); ctx.quadraticCurveTo((lodge.x * W + tx) / 2, H * .98, tx, ty); ctx.stroke();
          const r = ctx.createRadialGradient(tx, ty, 0, tx, ty, 34);
          r.addColorStop(0, 'rgba(255,200,120,' + .35 * pulse + ')'); r.addColorStop(1, 'rgba(255,200,120,0)');
          ctx.fillStyle = r; ctx.beginPath(); ctx.arc(tx, ty, 34, 0, 7); ctx.fill();
        }
        const torch = ctx.createRadialGradient(px, py, 0, px, py, 52);
        torch.addColorStop(0, 'rgba(200,215,255,.22)'); torch.addColorStop(1, 'rgba(200,215,255,0)');
        ctx.fillStyle = torch; ctx.beginPath(); ctx.arc(px, py, 52, 0, 7); ctx.fill();
        ctx.save(); ctx.beginPath(); ctx.arc(px, py, 52, 0, 7); ctx.clip(); room(.45); ctx.restore();
        ctx.globalCompositeOperation = 'source-over';
        ctx.font = '12px "Geist Mono", monospace'; ctx.textBaseline = 'middle';
        for (const s of spots) if (s.got) {
          ctx.fillStyle = '#ffcf73'; ctx.beginPath(); ctx.arc(s.x * W, s.y * H, 4, 0, 7); ctx.fill();
        }
      }
      const at = e => { const b = cv.getBoundingClientRect(); px = e.clientX - b.left; py = e.clientY - b.top };
      cv.addEventListener('pointermove', at);
      cv.addEventListener('pointerdown', e => {
        at(e);
        const s = spots.find(s => !s.got && near(s));
        if (!s) { msg.textContent = pick(['Just a wall. A very honest wall.', 'Nothing. The light isn\'t pointing here.', 'Cold tiles. Try where it\'s warm.']); return }
        s.got = true; found++; right.textContent = found + ' / 3';
        msg.textContent = 'Found ' + s.label + '.';
        if (found === 3) { msg.textContent = 'Found ' + s.label + '. Three for three: the light was right every time.'; again() }
      });
      addEventListener('resize', size);
      frame();
      return () => { alive = false; cancelAnimationFrame(raf); removeEventListener('resize', size) };
    },
  };

  // ContraryQuest: three villagers, three ways not to be a hero
  TOYS.no = {
    title: 'A morning in Fourleaves', sub: 'Three people need a hero',
    run(box, again) {
      box.classList.add('t-no');
      const asks = [
        { who: 'The miller', ask: '"Rats in my cellar! A hero would go down there with a sword."', ch: [
          ['Lend him Grandma\'s cat.', 'The cat goes down. The cat comes back up, fat and proud. Quest done, technically.', 1],
          ['Point next door: "A hero lives there."', 'Your neighbour has a sword now, and opinions about you.', 0],
          ['Lie in the grass and be a log.', 'The miller steps over you. Twice.', 0]] },
        { who: 'A knight, out of breath', ask: '"The road north needs a brave soul!"', ch: [
          ['Ask how far north, exactly.', 'Very far, it turns out. You wish him luck with a sincere face.', 0],
          ['Say you\'re allergic to north.', 'He writes it down. He believes you. You feel a little bad.', 0],
          ['Offer him half your sandwich.', 'He sits, eats, and forgets the road for an hour. The road survives.', 1]] },
        { who: 'A girl with a broken string', ask: '"My kite is stuck in the old oak."', ch: [
          ['Climb it, complaining all the way.', 'You complain beautifully. The kite comes down. So do you, less beautifully.', 1],
          ['Teach her to climb.', 'She\'s better at it than you. She doesn\'t say so. She doesn\'t need to.', 1],
          ['Wait for the wind.', 'The wind takes its time. So do you. It works, eventually.', 0]] },
      ];
      const hud = el('div', 'hud'); const step = el('span'); hud.append(el('span', null, 'Fourleaves'), step);
      const who = el('div', 'who'); const ask = el('div', 'ask'); const out = el('div', 'out'); const ch = el('div', 'ch');
      box.append(hud, who, ask, out, ch);
      let i = 0, deeds = 0;
      function show() {
        const q = asks[i];
        step.textContent = (i + 1) + ' / 3'; who.textContent = q.who; ask.textContent = q.ask; out.textContent = '';
        ch.replaceChildren(...q.ch.map(([label, result, deed]) => {
          const b = el('button', null, label); b.type = 'button';
          b.onclick = () => {
            deeds += deed; out.textContent = result;
            const next = el('button', null, i < 2 ? 'Next villager →' : 'Go home →'); next.type = 'button';
            next.onclick = () => { i++; i < 3 ? show() : end() };
            ch.replaceChildren(next);
          };
          return b;
        }));
      }
      function end() {
        step.textContent = 'Home'; who.textContent = 'Grandma Agata';
        const dodged = 3 - deeds;
        ask.textContent = '"' + dodged + ' dodged, ' + deeds + ' done by accident. ' + (deeds ? 'Not a hero, love. But not bad.' : 'Not a hero, love. Not even by accident.') + ' Lunch is ready."';
        out.textContent = ''; ch.replaceChildren(); again();
      }
      show();
    },
  };

  // AI-ICE: raise the rival dream's Essence; every card makes it give away a hint about its meaning
  TOYS.handshake = {
    title: 'Two dreams meet', sub: 'Discover what the other one means',
    run(box, again) {
      box.classList.add('t-ice');
      const D = {
        Music: { i: '♪', hints: ['It taps a rhythm on the dark.', 'You hear a song nobody finished.', 'Somewhere, a note is held for too long.'], end: 'a song someone hummed to a child, long ago' },
        Fate: { i: '✦', hints: ['A thread tightens somewhere far away.', 'It remembers a coin that landed on its edge.', 'Two strangers almost meet, and don\'t.'], end: 'a train someone missed, and the life that came from it' },
        Nature: { i: '❦', hints: ['It smells like rain on warm stone.', 'Something green unfolds in the dark.', 'A tide goes out and takes its time.'], end: 'a garden someone kept for forty years' },
      };
      const names = Object.keys(D), meaning = pick(names), GOAL = 10;
      const hud = el('div', 'hud'); const turnEl = el('span'); hud.append(el('span', null, 'Set SOFA · a toy match'), turnEl);
      const meter = (label) => { const m = el('div', 'meter'); const bar = el('div', 'bar'); const fill = el('i'); bar.append(fill); m.append(el('span', null, label), bar); return [m, fill] };
      const d1 = el('div', 'dream'); const [m1, theirs] = meter('Their Essence'); d1.append(el('div', 'orb'), m1);
      const d2 = el('div', 'dream'); const [m2, yours] = meter('Yours'); d2.append(el('div', 'orb'), m2);
      const hint = el('div', 'hint', 'Their dream hides a meaning: Music, Fate or Nature. Play a card.');
      const hand = el('div', 'hand');
      box.append(hud, d1, hint, hand, d2);
      let essence = 0, turns = 0;
      const hintBag = shuffle(D[meaning].hints);
      function deal() {
        turnEl.textContent = 'Turn ' + (turns + 1);
        hand.replaceChildren(...names.map(n => {
          const v = 1 + Math.floor(Math.random() * 3);
          const b = el('button'); b.type = 'button';
          b.append(el('i', null, D[n].i), el('b', null, '+' + v), el('span', null, n));
          b.onclick = () => play(n, v);
          return b;
        }));
      }
      function play(n, v) {
        turns++;
        const match = n === meaning;
        essence = Math.min(GOAL, essence + v + (match ? 2 : 0));
        theirs.style.width = essence / GOAL * 100 + '%';
        hint.textContent = (match ? 'It leans closer. ' : '') + (hintBag.length ? hintBag.pop() : pick(D[meaning].hints));
        if (essence >= GOAL) return discover();
        deal();
      }
      function discover() {
        hand.replaceChildren();
        hint.textContent = 'Discovered. Their meaning is ' + meaning + ': ' + D[meaning].end + '. Now they fill yours, out of kindness.';
        setTimeout(() => { yours.style.width = '100%' }, 500);
        setTimeout(() => { hint.textContent += ' You shake hands. ' + turns + ' turns, nobody lost.'; again() }, 1500);
      }
      deal();
    },
  };

  // Overgame: three nights against three regulars. Zones are public, deals are not
  TOYS.night = {
    title: 'Soul Street, after dark', sub: 'Three nights, three deals',
    run(box, again) {
      box.classList.add('t-ovg');
      const STYLES = { honest: .85, sly: .35, moody: .55 }; // chance to keep a deal
      const styles = shuffle(Object.keys(STYLES));
      const P = [{ n: 'You', s: 2, me: true }, ...['Lantern', 'Velvet', 'Crow'].map((n, i) => ({ n, s: 2, style: styles[i] }))];
      const hud = el('div', 'hud'); const nightEl = el('span'); hud.append(el('span', null, 'Toy rules'), nightEl);
      const zones = el('div', 'zones'); const say = el('div', 'line'); const ch = el('div', 'ch');
      box.append(hud, zones, say, ch);
      const zone = s => s >= 4 ? 'green' : s >= 2 ? 'amber' : 'red';
      const keeps = p => Math.random() < STYLES[p.style];
      let night = 1;
      function draw(pickable) {
        zones.replaceChildren(...P.map(p => {
          const d = el(pickable && !p.me ? 'button' : 'div', 'pl z-' + zone(p.s) + (p.me ? ' me' : '') + (pickable && !p.me ? ' pick' : ''));
          if (d.tagName === 'BUTTON') { d.type = 'button'; d.onclick = () => deal(p) }
          d.append(el('b', null, p.n), el('span', null, zone(p.s) === 'red' ? 'Red Zone' : zone(p.s) === 'amber' ? 'Amber' : 'Green'));
          return d;
        }));
      }
      function settle(a, b, ka, kb) {
        if (ka && kb) { a.s += 1; b.s += 1 } else if (!ka && kb) { a.s += 2; b.s -= 1 } else if (ka && !kb) { a.s -= 1; b.s += 2 } else { a.s -= 1; b.s -= 1 }
      }
      function startNight() {
        nightEl.textContent = 'Night ' + night + ' / 3';
        say.textContent = 'Everyone sees your Zone. No one sees your deals. Tap someone to sign a Contract with.';
        ch.replaceChildren(); draw(true);
      }
      function deal(p) {
        draw(false);
        say.textContent = 'You sign with ' + p.n + '. In private, do you keep your word?';
        const mk = (label, cls, k) => { const b = el('button', cls, label); b.type = 'button'; b.onclick = () => resolve(p, k); return b };
        ch.replaceChildren(mk('Keep it', 'keep', true), mk('Break it', 'break', false));
      }
      function resolve(p, mine) {
        const theirs = keeps(p);
        settle(P[0], p, mine, theirs);
        const others = P.filter(o => !o.me && o !== p);
        settle(others[0], others[1], keeps(others[0]), keeps(others[1]));
        say.textContent = 'You ' + (mine ? 'kept' : 'broke') + ' it. ' + p.n + ' ' + (theirs ? 'kept it too.' : 'broke it.') + ' ' + others[0].n + ' and ' + others[1].n + ' met somewhere. Their Zones moved. Nobody saw why.';
        draw(false);
        const b = el('button', null, night < 3 ? 'Next night →' : 'Morning →'); b.type = 'button';
        b.onclick = () => { night++; night <= 3 ? startNight() : end() };
        ch.replaceChildren(b);
      }
      function end() {
        nightEl.textContent = 'Morning'; draw(false); ch.replaceChildren();
        const red = P.filter(p => !p.me && zone(p.s) === 'red').map(p => p.n);
        say.textContent = (zone(P[0].s) === 'red' ? 'Morning finds you in the Red Zone. ' : 'You stayed out of the red' + (red.length ? '. ' + red.join(' and ') + ' didn\'t. ' : '. '))
          + 'Now you know: ' + P.slice(1).map(p => p.n + ' was ' + p.style).join(', ') + '.';
        again();
      }
      startNight();
    },
  };

  // DeadenD: a made-up case. Dead ends rewind one step, and you keep what you learned
  TOYS.rewind = {
    title: 'A made-up case', sub: 'Get out of the building',
    run(box, again) {
      box.classList.add('t-rewind');
      const known = new Set();
      const S = {
        lobby: { t: 'The lobby. The front door is locked from the outside. Footsteps somewhere upstairs.', ch: [
          ['Take the stairs up', 'stairs'], ['Try the back door', 'yard'], ['Type a code on the keypad', 'pad']] },
        stairs: { dead: 'Someone was waiting on the landing. As the tape cuts, you see a note in their hand: 0412.', learn: 'code' },
        yard: { t: 'The courtyard. A gate with a heavy padlock. A bicycle. A bin that smells of the sea.', ch: [
          ['Climb the gate', 'gate'], ['Go back inside', 'lobby']] },
        gate: { dead: 'The gate holds. Your ankle doesn\'t. Nobody comes. Some doors are only doors.', learn: 'gate' },
        pad: { need: 'code', dead: 'Three wrong codes. An alarm. Footsteps, coming down fast.', learn: 'pad' },
        out: { t: 'You type 0412. The door clicks. Sea air. You\'re out.', win: true },
      };
      const tape = el('div', 'reel'); const txt = el('div', 'txt'); const ch = el('div', 'ch'); const hud = el('div', 'hud');
      const deathsEl = el('b', null, '0 dead ends'); hud.append(el('span', null, 'Case 00 · toy'), deathsEl);
      box.append(hud, tape, txt, ch);
      let path = ['lobby'], deaths = 0;
      function go(id) {
        if (id === 'pad' && known.has('code')) id = 'out';
        const s = S[id];
        if (s.dead) return die(s);
        path.push(id); show();
      }
      function show() {
        const s = S[path[path.length - 1]];
        tape.replaceChildren(...Array.from({ length: 4 }, (_, i) => el('i', i < path.length ? 'on' : '')));
        txt.textContent = s.t;
        if (s.win) { ch.replaceChildren(); txt.textContent += ' ' + (deaths ? deaths + ' dead end' + (deaths > 1 ? 's' : '') + ' taught you the way.' : 'First try. Suspicious.'); return again() }
        ch.replaceChildren(...s.ch.map(([label, to]) => {
          const b = el('button', known.has(to === 'stairs' ? 'code' : to) ? 'known' : '', to === 'pad' && known.has('code') ? 'Type 0412 on the keypad' : label);
          b.type = 'button'; b.onclick = () => go(to); return b;
        }));
      }
      function die(s) {
        deaths++; deathsEl.textContent = deaths + ' dead end' + (deaths > 1 ? 's' : '');
        if (s.learn) known.add(s.learn);
        const d = el('div', 'dead'); const back = el('button', null, '◀◀ Rewind one step'); back.type = 'button';
        d.append(el('h4', null, 'DEAD END'), el('p', null, s.dead), back);
        back.onclick = () => { d.remove(); show() };
        box.append(d);
      }
      show();
    },
  };

  // ---------- Hearts ----------
  const API = '/api/votes';
  const MINE = 'tz-lab-hearts', RECENT = 'tz-lab-counts';
  const ideas = [...document.querySelectorAll('[data-idea]')];
  const read = (store, k) => { try { return JSON.parse(store.getItem(k)) } catch (e) { return null } };
  const write = (store, k, v) => { try { store.setItem(k, JSON.stringify(v)) } catch (e) {} };
  const mine = read(localStorage, MINE) || {};
  let counts = null;

  function render() {
    for (const a of ideas) {
      const id = a.dataset.idea, b = a.querySelector('.heart');
      b.setAttribute('aria-pressed', mine[id] ? 'true' : 'false');
      b.querySelector('.n').textContent = counts ? counts[id] || 0 : '·';
    }
    const leader = document.getElementById('leader');
    ideas.forEach(a => a.classList.remove('lead'));
    if (!counts) { leader.textContent = 'Hearts open soon.'; return }
    const top = Math.max(0, ...ideas.map(a => counts[a.dataset.idea] || 0));
    if (!top) { leader.textContent = 'No hearts yet. Yours could be the first.'; return }
    const lead = ideas.filter(a => (counts[a.dataset.idea] || 0) === top);
    lead.forEach(a => a.classList.add('lead'));
    leader.replaceChildren(el('span', 'lh', '❤ ' + top));
    lead.forEach((a, i) => {
      if (i) leader.append(i === lead.length - 1 ? ' and ' : ', ');
      const l = el('a', null, a.querySelector('h3').textContent); l.href = '#' + a.id; leader.append(l);
    });
    if (lead.length > 1) leader.append(' (a tie)');
  }

  async function load() {
    // A heart given in the last minute beats the CDN's cached count
    const r = read(sessionStorage, RECENT);
    if (r && Date.now() - r.at < 90e3) { counts = r.counts; return render() }
    try {
      const res = await fetch(API);
      if (!res.ok) throw new Error(res.status);
      counts = (await res.json()).counts;
    } catch (e) { counts = null }
    render();
  }

  for (const a of ideas) {
    const b = a.querySelector('.heart'), id = a.dataset.idea;
    b.addEventListener('click', async () => {
      if (b.disabled || !counts) return;
      const delta = mine[id] ? -1 : 1;
      b.disabled = true;
      if (delta > 0) mine[id] = 1; else delete mine[id];
      counts[id] = Math.max(0, (counts[id] || 0) + delta);
      render();
      try {
        const res = await fetch(API, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ idea: id, delta }) });
        if (!res.ok) throw new Error(res.status);
        counts = (await res.json()).counts;
        write(localStorage, MINE, mine);
        write(sessionStorage, RECENT, { at: Date.now(), counts });
      } catch (e) {
        if (delta > 0) delete mine[id]; else mine[id] = 1;
        counts[id] = Math.max(0, (counts[id] || 0) - delta);
        b.title = 'The heart didn\'t reach us. Try again in a minute.';
      }
      b.disabled = false;
      render();
    });
  }

  // Ache's lines for this page, without touching lines.json
  if (window.TZ && TZ.addLines) {
    TZ.addLines('lab', ['ideas! fresh ones. still warm', 'tap the heart. I counted, it doesn\'t hurt', 'no timers in here. I checked every single one', 'one heart per idea. I\'m watching. lovingly', 'the best idea wins. unless it\'s mine. then it wins twice']);
    TZ.addLines('lab-idea', ['play it first, judge it after', 'thirty seconds. that\'s the whole deal', 'no energy bar. you\'re welcome', 'I\'d heart this one. I\'m biased. I\'m a thread', 'careful, this one\'s fun', 'if it ever asks for money, call me. it won\'t', 'this idea respects your time. I made sure']);
  }

  // Pictures: an <img src> in lab.html replaces the drawn stand-in once it loads
  document.querySelectorAll('.idea-pic img[src]').forEach(img => {
    const ok = () => { img.hidden = false; img.parentNode.classList.add('has-img') };
    if (img.complete && img.naturalWidth) ok(); else img.addEventListener('load', ok, { once: true });
  });

  document.querySelectorAll('.toy[data-toy]').forEach(mount);
  load();
})();
