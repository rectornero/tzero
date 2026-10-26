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

- It is static. Don't add functions, Blobs, a database or a build step without asking.
- One exception, chosen by Nero on 2026-10-26: `netlify/functions/votes.mjs` counts the Idea Lab hearts (/lab) in
  one Netlify Blobs entry. GETs are cached on the CDN for 60 s, posts are rate-limited, no database. Estimated under
  1 credit a month now, about 3 to 4 per 10,000 calls. Don't add polling to it or call it on a schedule.
- We are migrating away from Wix (Nero, 2026-10-26): build new features on this site, not on Wix. New articles are
  written here: add `tools/posts/<slug>.json` and run `node tools/freeze-archive.mjs` (no snapshot argument) to render
  `post/<slug>.html`, `post-data/<slug>.json` and `post-data/index.json`. Each go-live is a production deploy,
  so review articles on Deploy Previews and send them live in batches. Older posts on Wix still load from Wix
  in the visitor's browser (no Netlify credits) until the migration is finished.
- Pushes to `main` deploy to production. Work on a branch and merge once per finished batch.
  Commits that only change Markdown skip the deploy (`ignore` in `netlify.toml`).
- Calls to the Artache API (artache.netlify.app) can wake its database. Make them only in sessions that produce
  a result, and send the inbox check and the update close together.
