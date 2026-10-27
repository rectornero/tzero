/* Inside the scene box, before the scene's own code: the few things a scene may tell the page around it.
   The page checks every message and only acts on these: its height, what the box blocked, its errors. */
(() => {
  const send = m => parent.postMessage(Object.assign({ tz: m.type }, m), '*');
  addEventListener('securitypolicyviolation', e => send({ type: 'blocked', what: e.effectiveDirective, url: String(e.blockedURI || '').slice(0, 200) }));
  addEventListener('error', e => send({ type: 'error', msg: String(e.message || 'error').slice(0, 200) }));
  let last = 0;
  const size = () => {
    const h = Math.ceil(document.documentElement.scrollHeight);
    if (Math.abs(h - last) > 2) { last = h; send({ type: 'size', h }) }
  };
  addEventListener('load', () => { size(); new ResizeObserver(size).observe(document.documentElement) });
  // For scenes: TZ.fit() asks the page to resize the box to the scene's height right now
  window.TZ = Object.freeze({ fit: size });
})();
