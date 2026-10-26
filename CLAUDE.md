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

- It is static: articles and Ache's news mood load from Wix in the visitor's browser (Wix requests cost no
  Netlify credits). Keep it that way. Don't add functions, Blobs, a database or a build step without asking.
- One exception, chosen by Nero on 2026-10-26: `netlify/functions/votes.mjs` counts the Idea Lab hearts (/lab) in
  one Netlify Blobs entry. GETs are cached on the CDN for 60 s, posts are rate-limited, no database. Estimated under
  1 credit a month now, about 3 to 4 per 10,000 calls. Don't add polling to it or call it on a schedule.
- Wix is being phased out (Nero, 2026-10-26): build new features on this site, not on Wix.
- Pushes to `main` deploy to production. Work on a branch and merge once per finished batch.
  Commits that only change Markdown skip the deploy (`ignore` in `netlify.toml`).
- Calls to the Artache API (artache.netlify.app) can wake its database. Make them only in sessions that produce
  a result, and send the inbox check and the update close together.
