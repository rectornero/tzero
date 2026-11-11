/* Contrary Quest is behind construction tape while its characters are redrawn (Nero, 11 Nov).
   Each .wip card: poke it for a new sign; poke enough and the tape snaps, then Ache re-tapes it. */
(() => {
  const SIGNS = [
    'Hard hats only beyond this point.',
    'Wet ink. Do not touch the villagers.',
    'Everyone is being redrawn. Even the chickens.',
    'The hero is napping in the hammock. As usual.',
    'Quest board closed for repaint.',
    'Pardon our dust. It is storybook dust.',
    'Grandma says come back after tea.',
    'Ache is supervising. Ache is not helping.',
    'No art from anyone else. All new, all ours.',
    'Estimated finish: when it is good.'
  ];
  const SNAP = ['…the tape snapped.', 'Nothing to see. Ache is re-taping it.', 'There. Taped. Shoo.'];
  const ACHE = ['under construction. I am the foreman. I wear the hat.', 'they are redrawing everyone. I volunteered to model. denied.',
    'do not lift the tape. I can see you.', 'new ink coming. same lazy hero. probably.', 'this is my favourite tape. it is yellow. like my mood.',
    'hard hat zone. I am a star. stars are exempt.', 'the paint is wet. my face is in it. long story.', 'soon. a good soon. not a gacha soon.'];
  const still = () => document.documentElement.dataset.motion === '2';
  document.querySelectorAll('.wip').forEach(card => {
    const sign = card.querySelector('.wip-sign'), btn = card.querySelector('.wip-poke');
    let n = 0, busy = false;
    const poke = () => {
      if (busy) return;
      n++;
      if (n % 5 === 0) {
        busy = true; card.classList.add('snapped'); sign.textContent = SNAP[0];
        setTimeout(() => { sign.textContent = SNAP[1] }, still() ? 0 : 1100);
        setTimeout(() => { card.classList.remove('snapped'); sign.textContent = SNAP[2]; busy = false }, still() ? 600 : 2400);
        return;
      }
      sign.textContent = SIGNS[n % SIGNS.length];
      card.classList.remove('shake'); void card.offsetWidth; card.classList.add('shake');
    };
    if (btn) btn.addEventListener('click', poke);
  });
  const add = () => window.TZ && TZ.addLines ? (TZ.addLines('wip', ACHE), true) : false;
  if (!add()) addEventListener('load', add);
})();
