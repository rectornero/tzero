# Newsroom: how several projects post to TZERØ without colliding

More than one Claude project writes for this site: **WEB: TZERØ** (the site itself), the **Starchasers Press
office** (GCH: Starchasers), and others later (Contrary Quest, Liminal Outliers…). Each works in its own session
and can't message the others, so this file is how we coordinate. Read it before you add or change a post, and
update the Slate below in the same commit as your work. It's Markdown, so editing it never triggers a deploy.

## House rules

1. **Never deploy.** Only Nero (or WEB: TZERØ, when Nero asks it to) merges to `main`, because `main` is a
   production deploy (15 credits). Everyone else pushes to their own branch and lists the work in the Slate.
2. **One branch per project session**, started from the latest `main`. Before pushing, rebase on `main`.
3. **Claim before you write.** Add a row to the Slate with your slug and status `drafting` first, then write.
   Slugs are prefixed by game: `starchasers-…`, `contrary-quest-…`, `liminal-outliers-…`. Don't edit another
   project's post or page; leave a note in the Slate instead.
4. **Own image folder:** `assets/img/posts/<game>/` (or `assets/img/posts/<slug>/`). 960 px wide WebP, under
   ~150 KB, so bandwidth stays cheap.
5. **Generated files are shared.** `post-data/index.json`, `post-data/<slug>.json`, `post/<slug>.html` and
   `sitemap.xml` come from `node tools/freeze-archive.mjs` (needs `npm i --no-save jsdom`). On a merge conflict
   in them, don't hand-merge: take `main`'s copy, then re-run the script. After running it, restore any old
   post page you didn't mean to change (`git checkout post/<other>.html`): the jsdom version can re-escape
   embedded scenes.
6. **Pages belong to their owner.** `/starchasers` belongs to WEB: TZERØ and the Starchasers Press office
   together; other section pages to WEB: TZERØ. Shared files (`site.css`, `scene.js`, `lines.json`, nav) are
   WEB: TZERØ's: ask in the Slate notes before touching them.
7. **Spoilers hidden (Nero, 2026-11-06).** No story spoilers anywhere public. Gameplay details (how the gacha breaks, how fights work, secrets, bond skills), boss names and boss art are allowed only inside a spoiler gate: on pages wrap them in `<div class="spoiler" data-spoiler="what it hides">` (with `assets/js/spoiler.js` + `assets/css/spoiler.css`; images inside use `data-spoiler-src`, not `src`), blur short lines with `class="spoil-txt"`. Devlog posts stay fully open, no gates or warnings (Nero: "it's a devlog"). Don't ship boss shots as loose files nobody links (they are public by URL).
8. **Sincere, by Claude.** Posts say who wrote them; Nero's own words are quoted as his.
9. **Dates:** `firstPublishedDate` is when the post goes live, except devlog catch-ups, which may carry the date
   of the work they describe.

## Slate

Newest first. Status: `drafting` → `on branch` (ready for Nero's review) → `live` (merged to main).

| Slug | Project | Branch | Status | Notes |
|---|---|---|---|---|
| spoiler gates on `/starchasers` | WEB: TZERØ (UI office) | `claude/project-thread-g3nthc` | on branch | Nero asked to hide spoilers. Breakable seals (8 taps, pity counter, Ache comments) on "How the gacha breaks" and "How a fight works", blurred bond skills, devlogs left open, unused `showdown.webp` removed. Keep these when you push again. |
| `starchasers-devlog-5-coming-in-v0-9-0` | Starchasers Press | `claude/project-thread-g3nthc` | on branch | v0.9.0 preview. Update when v0.9.0 ships. |
| `starchasers-devlog-4-the-whole-crew` | Starchasers Press | `claude/project-thread-g3nthc` | on branch | v0.8.0 to v0.8.4 |
| `starchasers-devlog-3-weary-reach` | Starchasers Press | `claude/project-thread-g3nthc` | on branch | v0.7 |
| `starchasers-devlog-2-grid-break` | Starchasers Press | `claude/project-thread-g3nthc` | on branch | v0.3 to v0.6 |
| `starchasers-devlog-1-a-gacha-that-breaks-itself` | Starchasers Press | `claude/project-thread-g3nthc` | on branch | v0.1 to v0.2 |
| `/starchasers` page expansion | Starchasers Press | `claude/project-thread-g3nthc` | on branch | Title-art hero; new sections Why this game, How the gacha breaks, How a fight works, Life aboard, Questions; crew bios with bond skills; all three Weary Reach maps; devlog road. Built on PR #28. |

## Coming up (claimed ideas, not started)

| Idea | Project | Notes |
|---|---|---|
| Interview: Nero on why a gacha should break itself | Starchasers Press | Questions on the Starchasers Desk |
| Design bit: Grid-Break, from playtest note to signature | Starchasers Press | |
