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
| `redache.html` | Ache's own page at `/redache`: the page source shown as an editor (Ache lives there), live values, a small terminal. The editor shows the file's own real source: Ache's story is written as real comments in redache.html, and `window.ACHE` holds his live data, secrets and history |
| `post.html` | Article page; Netlify serves it for every `/post/<slug>` (see `_redirects`), same slugs as Wix |
| `posts.html` | Listings: `/posts`, `/posts/categories/<slug>` (Devlog, Studio, Archive) and `/posts/tags/<slug>`, same paths as Wix |
| `studio.html`, `redache.html` | The studio's page (`/studio`) and Ache's home (`/redache`) |
| `lab.html`, `assets/js/lab.js`, `assets/css/lab.css` | The Idea Lab (`/lab`): one small idea per Artache game, each with a 30-second toy and a ❤ |
| `netlify/functions/votes.mjs` | The site's only server code: counts Idea Lab hearts in Netlify Blobs (`GET`/`POST /api/votes`) |
| `assets/css/site.css` | Styles copied from the approved "Tide and Thread" mockup |
| `assets/css/pages.css` | Additions: post page and live states |
| `assets/js/scene.js` | Season scenes, page glow, click effects, the red thread and Ache, ported from the mockup |
| `assets/js/posts.js` | Listing page: section or tag lookup, cards, Load more |
| `assets/js/wix.js` | Wix Headless client: visitor token, latest posts, post by slug |
| `assets/js/ricos.js` | Renders a post's Wix rich content safely (no HTML parsing) |
| `assets/js/redache.js`, `assets/css/redache.css` | Highlighter, tabs, terminal and live values for the Redache page |
| `assets/lines.json` | Everything Ache says, per item, plus generic lines for live posts |

## Links

Header and footer links stay on this site: sections and tags open `posts.html`, the studio `/studio`, Ache `/redache`.
Links inside articles that point at tzero.live posts or listings open here in the same tab; other old Wix pages
go to the journal (`WIX.JOURNAL`, journal.tzero.live). "Comments and likes on the original" uses the address Wix
reports for the post, so it follows the domain switch by itself. Any other path is redirected to the journal by
the last rule in `_redirects`.

## Rules from the design spec

Playful, not minimal. No selectable text, normal cursor, cursor effects only on the background,
red as an accent only, white cards, no Discord, English only. Canonical URLs stay on tzero.live.

## Run locally

Any static server works, for example `npx serve .`. Wix requests go straight from the browser
to `www.wixapis.com`.

## Ache's news mood

Ache reacts to the newest Wix post tagged **Ache grief** (tag slug `ache-grief`): the first time Ache reaches
that post it plays the grief scene (tears, dimmed and glitched site, therapy with the mouse); each visitor sees it
once per post (remembered in localStorage), after that Ache just walks past. Add the tag to a post on Wix to start a
mood and remove it when the news is over. No commit or deploy is needed.

`assets/news.json` is only a fallback for when the tag does not exist on Wix. Delete it once the tag is in use.

## Idea Lab

`/lab` shows small ideas for Artache's games. Each card has a pitch, a picture, a toy and a heart. To add an idea,
copy an `<article class="idea">` in `lab.html`, give it a new `data-idea` id, add that id to `IDEAS` in
`netlify/functions/votes.mjs` (unknown ids are refused), and write its toy in `TOYS` in `assets/js/lab.js`. Toys never
use timers or countdowns. Pictures: put the URL in the card's `<img>` (`src`) and lab.js swaps out the drawn stand-in.
Hearts are counted by the function; the browser remembers which ideas it hearted (localStorage `tz-lab-hearts`).

## Netlify credits

See [CLAUDE.md](CLAUDE.md). This site must stay static: every production deploy costs 15 credits from a balance
shared by all of Nero's sites.
