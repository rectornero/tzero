# TZERØ main site: rules for every session

## Netlify credits (shared team "overgame-director", Personal plan)

All of Nero's sites (laventina, artache, novaula, ai-ice, tzero) share one credit balance: 1,000 credits a month
plus packs Nero buys. At zero every site is paused. On 2026-10-25 one every-minute job that woke a database
burned almost a whole month.

- No scheduled job or polling loop touches the database on every run. Gate it on a cheap check (for example a
  Blobs note of when there is next work), or use delayed or event-driven scheduling instead of polling.
- Client polling is never faster than 60 seconds.
- No Netlify AI Gateway unless Nero approves it.
- Test on branches (Deploy Previews and branch deploys are free). Batch changes into as few production deploys
  as possible, and ask Nero before deploying while credits are low.
- Before adding any schedule, polling or production deploy, estimate its monthly credits and say the number.
  Prices: production deploy 15; compute and database compute 10 per GB-hour; bandwidth 20 per GB;
  web requests 2 per 10,000; AI Gateway 180 per USD.

## This site

- It is mostly static. Don't add functions, Blobs, a database or a build step without asking.
- One exception, chosen by Nero on 2026-10-26: `netlify/functions/votes.mjs` counts the Idea Lab hearts (/lab) in
  one Netlify Blobs entry. GETs are cached on the CDN for 60 s, posts are rate-limited, no database. Estimated under
  1 credit a month now, about 3 to 4 per 10,000 calls. Don't add polling to it or call it on a schedule.
- The editor (Nero's picks, 2026-10-27): `/admin` is a WYSIWYG editor for articles and pages, published without a
  deploy. Content lives in Netlify Blobs (`netlify/functions/content.mjs`, read through `/api/content`, cached on the
  CDN and purged on publish; estimated 3 to 5 credits a month at 10,000 views). Sign-in is GitHub
  (`netlify/functions/auth.mjs`, needs `TZ_GITHUB_CLIENT_ID` and `TZ_GITHUB_CLIENT_SECRET`); Nero invites
  collaborators and admins (`netlify/functions/people.mjs`, profiles at /people). Collaborators publish directly but
  never get scene code or pages. Claude saves drafts with `TZ_CLAUDE_KEY` through `tools/editor-api.mjs`, and publishes only if Nero switched that on (AI desk, below).
- Ache's lines: every set is in `assets/lines.json` (sets used by fights, chat, stake, sleep, therapy and the news
  scene also keep a default copy in `scene.js`). Nero edits them at `/admin/lines` (owner only); Publish stores the
  sets he changed in Blobs and `scene.js` lays them over lines.json, no deploy. They travel inside `/api/site` (below),
  the one CDN-cached request per page view, about 2 credits per 10,000 views. Read his notes there before changing
  lines in the repo.
- The site desk (Nero, 2026-11-11): `/admin/site` changes the live site without a deploy: notice bar, Ache's news
  moment, the homepage's first polaroid, newsletter form, switches, takedowns (pages, posts, pictures), short links
  (`/go/<name>`), uploaded pictures, the activity log and versions. Settings are one Blobs entry
  (`netlify/lib/site.mjs`, `netlify/functions/site.mjs`); every page reads them through `/api/site`, which replaced the
  `/api/lines` request (no extra call per view), and `assets/js/site.js` applies them. Prefer a switch or setting
  there over a deploy. Takedowns hide in the browser at once; a repo file is only gone after the next deploy.
- The AI desk (Nero, 2026-11-11): Claude's own door to the admin, `/api/ai/...` and the MCP endpoint `/api/mcp`
  (`netlify/functions/ai.mjs`, guide in `docs/ai-admin.md`, CLI `tools/editor-api.mjs`), with `TZ_CLAUDE_KEY`.
  Articles travel as TZ Markdown, one text per article. Spend few calls: `guide` for how-tos, one `write` per
  article, `edit` for small changes, `do` for batches. Claude saves drafts; what Nero has not switched on in `/admin/site` → Claude
  (publishing, settings areas, Ache's script book) becomes a proposal he approves there. Takedowns are on for Claude
  from the start. Never call it on a schedule or in a loop. Estimated well under 1 credit a month.
- Ache's lines for parts of an article: the "✦ Ache's lines" button in `/admin`, or `:::ache` in TZ Markdown / the
  `ache` command. Stored as a `TZ_BLOCK` of kind `ache` under the part it belongs to (drawn by `blocks.js`).
- An article's game world is its top-level `world` key (a key of `assets/worlds.json`, owned by the redesign);
  the editor's "World" picker and the AI desk's `world` field set it.
- Tests: `node tools/tests/admin-api.test.mjs` (server rules) and `node tools/tests/dev-server.mjs` (the site and its
  functions locally, Blobs faked). Run the first before pushing changes to `netlify/`.
- Scene code (interactive HTML in articles) only ever runs in the scene box: `/embed` in an iframe with
  `sandbox="allow-scripts"` and nothing else (never add `allow-same-origin`), under the no-network policy in
  `netlify.toml`. When handing Nero scene code, also give its fingerprint (`node tools/editor-api.mjs fingerprint f.html`).
  No-code blocks (visual novel, hotspots, before/after, flip cards, story slides) are data drawn by `assets/js/blocks.js`.
- We are migrating away from Wix (Nero, 2026-10-26): build new features on this site, not on Wix. New articles are
  written here: add `tools/posts/<slug>.json` and run `node tools/freeze-archive.mjs` (no snapshot argument) to render
  `post/<slug>.html`, `post-data/<slug>.json` and `post-data/index.json`. Each go-live is a production deploy,
  so review articles on Deploy Previews and send them live in batches. Older posts on Wix still load from Wix
  in the visitor's browser (no Netlify credits) until the migration is finished.
- Pushes to `main` deploy to production. Work on a branch and merge once per finished batch.
  Commits that only change Markdown skip the deploy (`ignore` in `netlify.toml`).
- Calls to the Artache API (artache.netlify.app) can wake its database. Make them only in sessions that produce
  a result, and send the inbox check and the update close together.
