# The AI desk: TZERØ's admin for Claude

Codex · Systems · the admin, made for an AI to use. Built 2026-11-11 at Nero's request.

Nero uses the pages (`/admin`, `/admin/lines`, `/admin/site`). Claude uses the same admin through two doors that
share one set of rules:

| Door | Address | For |
| --- | --- | --- |
| REST | `https://<site>/api/ai/...` | scripts and `tools/editor-api.mjs` |
| MCP | `https://<site>/api/mcp` | sessions that can load tools (20 tools, JSON-RPC over HTTP, stateless) |

Both need Claude's key on every call: `Authorization: Bearer <TZ_CLAUDE_KEY>` (a Netlify environment variable,
24 characters or more). Without the key set in Netlify the door stays closed. `GET /api/ai` returns this guide as
JSON, `GET /api/ai/markdown` the article format.

## What Claude may do

- Always: read everything, save drafts (signed "Claude"), check drafts, add Ache's lines to drafts, upload
  pictures, mark inbox items done.
- Alone, when Nero switched the area on in `/admin/site` → Claude: takedowns (on from the start), the notice bar,
  Ache's news moment, the homepage pick, switches, short links, the newsletter form, publishing articles,
  publishing Ache's script book.
- Everything else becomes a **proposal**: the call answers `202 { proposed: true }` and Nero approves or declines
  it in `/admin/site` → Claude. Claude can never approve, restore versions, delete pictures or change its own
  permissions.
- Every change is written to the activity log with who did it.

## Spend few calls and few tokens

The door is built so a whole job takes one or two calls:

| Job | Cheapest way |
| --- | --- |
| See what is going on | `state` (short by default; `full` for everything) |
| Learn the formats | `guide <topic>`: `start`, `markdown`, `blocks`, `ache`, `settings`, `templates` (read only what you need) |
| New article | one `write` with the whole article as one text and `publish: ask` in its header |
| Small change | one `edit`: `{find, replace}`, `{after, insert}`, `{append}`, `{prepend}`, `{remove}`; the article is not resent |
| Look before editing | `read` as `outline` (headings and blocks only) |
| Several things at once | one `do` with `ops: [...]` (up to 40; stops at the first error) |

The MCP door lists six tools (`state`, `guide`, `read`, `write`, `edit`, `do`) because every tool description is
paid for at the start of every session; all other actions are ops inside `do`. `/api/mcp?tools=all` lists every op
as its own tool.

One text for a whole article:

```
---
title: The title
excerpt: One or two sentences.
category: devlog
world: starchasers
cover: /api/media/abc.webp | what it shows | 1600x900
publish: ask
---
::kicker DEVLOG · STARCHASERS · #7

## What changed

Text…

:::ache scope=section
a line Ache says in this section
:::
```

Every no-code block has a text form too (`guide blocks`): `:::cards`, `:::compare`, `:::slides`, `:::hotspots`,
`:::vn` (mini visual novel), `:::gallery`, and `:::achenote` for Ache's critic note on top of the article.

## Start of a session

```
TZ_CLAUDE_KEY=… node tools/editor-api.mjs state
```

or the MCP tool `site_state`. It returns the settings, what Claude may do alone, drafts, open inbox items, open
proposals and the last changes. Do not call the API on a schedule or in a loop (Netlify credits).

## Articles: TZ Markdown

Articles are read and written as text. Anything the text form cannot say exactly (visual novels, scene code,
galleries) comes back as a `tz-node` fence with the node's JSON: leave those fences as they are and they survive
the round trip unchanged.

```
::kicker STUDIO NOTES · 11 NOVEMBER
## Heading          ### Subheading
---   (divider)     ===   (double divider)      ::space   (empty line of space)
> quote
- item              1. item
![what the picture shows](/api/media/abc.webp "caption"){1280x720}
::youtube https://youtu.be/ID caption
::button [Open Starchasers](/starchasers)
**bold** *italic* ++underline++ [link](https://…) {red:text} {navy:text} {20px:text}
```

Fields next to the text: `title`, `excerpt`, `category` (`studio` or `devlog`), `world` (the game world the article
travels to: a key of `/assets/worlds.json`, empty for the TZERØ look), `kind` (`article` or `page`), `publishAt`,
`seoTitle`, `cover { url, width, height, alt }`.

```
node tools/editor-api.mjs write my-slug draft.md "The title" excerpt="One line." category=devlog world=starchasers
node tools/editor-api.mjs check my-slug        # errors, licensing warnings, Ache's checks
node tools/editor-api.mjs read my-slug > draft.md
node tools/editor-api.mjs publish my-slug "ready for you"   # publishes, or asks Nero
```

## Ache's lines for the parts of an article

Ache walks to a part of the article and says a line written for it. A marker sits right under the part:

```
:::ache scope=part show=hidden
that ship is mine. I named it.
nobody asked. I named it anyway.
:::
```

- `scope=part`: the block right above. `scope=section`: everything back to the last heading.
- `show=hidden`: only Ache says them. `show=bubble`: readers also see a small "Ache says" note they can tap.
- `set=<key>`: use a set from his script book (`node tools/editor-api.mjs lines`) instead of lines written here.

Without rewriting the Markdown:

```
node tools/editor-api.mjs parts my-slug
node tools/editor-api.mjs ache my-slug 4 "a line for part 4" "another one"
node tools/editor-api.mjs ache my-slug "What's new" "a line for that whole section"
```

MCP: `list_parts`, `add_ache_lines`, `remove_ache_lines`. Nero does the same in `/admin` with the toolbar button
"✦ Ache's lines". Ache's voice: lowercase, short, funny, warm, a bit smug; never mean; never spoilers.

## Site settings

`GET /api/ai/settings`, `PATCH /api/ai/settings { patch, note }`. Objects merge, arrays replace, `null` removes.

| Area | What it is |
| --- | --- |
| `notice` | `{ on, text, link, linkText, tone: red|navy|sun, until }` the bar on top of every page |
| `mood` | `{ mode: wix|on|off, slug, topic, lines }` Ache's news moment |
| `home.pick` | `{ on, img, alt, cap, kick, note, href, linkText }` Nero's pick on the homepage (first boarding ticket) |
| `newsletter` | `{ provider: kit|buttondown|mailerlite, id }` |
| `flags` | `{ "<switch>": true|false }` (`cq-wip`, `share-row`, `newsletter-band`, or your own) |
| `hide` | `{ paths: [{ path, note }], posts: [{ slug, note }], images: [{ match, note }] }` takedowns |
| `links` | `{ "<name>": "https://…" }` short links at `/go/<name>` |

Takedown shortcut: `node tools/editor-api.mjs takedown image starchasers/crew- "crew art ban"` (also `path`,
`post`; `undo-takedown` brings it back). It hides in the reader's browser within seconds; a file in the repo is
gone for good only after the next deploy.

## Connect the MCP door (Claude Code)

```json
{ "mcpServers": { "tzero-admin": { "type": "http", "url": "https://artache-tzero.netlify.app/api/mcp",
  "headers": { "Authorization": "Bearer ${TZ_CLAUDE_KEY}" } } } }
```

## Licensing rules built in

`check` and every save look at the pictures: one on the takedown list is refused; names that look like old
characters or Starchasers crew art get a warning. Allowed Starchasers art: the emblem, the title key art (ship
only) and the Weary Reach maps.

## Testing without a deploy

```
node tools/tests/admin-api.test.mjs      # 86 server checks, Blobs faked in memory
node tools/tests/dev-server.mjs          # the whole site + functions on http://localhost:8787, signed in as Nero
```
