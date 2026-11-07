/* The box every interactive scene runs in (/embed). Pages load it in an iframe with sandbox="allow-scripts" and
   nothing else, so it gets a throwaway origin: no cookies, no storage, no way into the page around it, no popups,
   no forms, no navigating the reader away. Its Content Security Policy (netlify.toml) blocks all network calls;
   only fonts and pictures from this site load. The page sends the scene's HTML once, then this writes it in. */
(() => {
  if (window.parent === window) return;
  addEventListener('message', function take(e) {
    const d = e.data;
    if (e.source !== window.parent || !d || d.tz !== 'scene' || typeof d.html !== 'string') return;
    removeEventListener('message', take);
    document.open();
    document.write('<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">'
      + '<script src="/assets/js/embed-bridge.js"><\/script>' + d.html);
    document.close();
  });
  parent.postMessage({ tz: 'ready' }, '*');
})();
