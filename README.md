# TZERØ main site

The front end of [TZERØ](https://www.tzero.live), a journal by Artache Creative Studio.

Articles are written on Wix (the "nightly build"). This site shows them in its own design:
the visitor's browser reads published posts from the Wix blog through Wix Headless
(an anonymous, read-only visitor token). There is no build step and no serverless code,
so Netlify only deploys when the design changes.

## Layout

| Path | What it is |
|---|---|
| `index.html` | Homepage: hero scene, Latest (live from Wix), the tapes, footer |
| `post.html` | Article page; Netlify serves it for every `/post/<slug>` (see `_redirects`), same slugs as Wix |
| `assets/css/site.css` | Styles copied from the approved "Tide and Thread" mockup |
| `assets/css/pages.css` | Additions: post page and live states |
| `assets/js/scene.js` | Season scenes, page glow, click effects, the red thread and Ache, ported from the mockup |
| `assets/js/wix.js` | Wix Headless client: visitor token, latest posts, post by slug |
| `assets/js/ricos.js` | Renders a post's Wix rich content safely (no HTML parsing) |
| `assets/lines.json` | Everything Ache says, per item, plus generic lines for live posts |

## Rules from the design spec

Playful, not minimal. No selectable text, normal cursor, cursor effects only on the background,
red as an accent only, white cards, no Discord, English only. Canonical URLs stay on tzero.live.

## Run locally

Any static server works, for example `npx serve .`. Wix requests go straight from the browser
to `www.wixapis.com`.
