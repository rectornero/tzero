#!/usr/bin/env python3
# Builds the Starchasers devlog posts (Ricos JSON, same shape as devlog-1-free-and-miriam) into tools/posts/.
# Run: python3 tools/starchasers-devlog.py tools/posts, then node tools/freeze-archive.mjs
import json, os, sys
OUT = sys.argv[1]
IMG = '/assets/img/posts/starchasers/'
RED, INK, GREY = '#d7182a', '#13224b', '#6B7280'
DEVLOG = '986847d2-3b96-464b-8b8b-338e07845d9c'
TAG = 'ee35b6d4-c6dc-490a-83cd-4cd17980a6bc'
MEMBER = '1c53b988-3af9-4c8b-b6d4-0db133c2b09c'

def t(text, *dec): return {"type": "TEXT", "id": "", "nodes": [], "textData": {"text": text, "decorations": list(dec)}}
COL = lambda c: {"type": "COLOR", "colorData": {"foreground": c}}
SIZE = lambda n: {"type": "FONT_SIZE", "fontSizeData": {"unit": "PX", "value": n}}
BOLD = {"type": "BOLD", "fontWeightValue": 700}
ITAL = {"type": "ITALIC", "italicData": True}
def LINK(u): return {"type": "LINK", "linkData": {"link": {"url": u, "target": "SELF"}}}
def para(*nodes, center=False):
    return {"type": "PARAGRAPH", "id": "", "nodes": list(nodes), "paragraphData": {"textStyle": {"textAlignment": "CENTER"}} if center else {}}
BLANK = para()
DIV = {"type": "DIVIDER", "id": "", "nodes": [], "dividerData": {"lineStyle": "SINGLE", "width": "SMALL", "alignment": "CENTER"}}

def rich(text):
    """Plain text with [label](url) links and **bold**."""
    import re
    out = []
    for part in re.split(r'(\[[^\]]+\]\([^)]+\)|\*\*[^*]+\*\*)', text):
        if not part: continue
        m = re.match(r'\[([^\]]+)\]\(([^)]+)\)', part)
        if m: out.append(t(m.group(1), BOLD, COL(RED), LINK(m.group(2)))); continue
        if part.startswith('**'): out.append(t(part[2:-2], BOLD)); continue
        out.append(t(part))
    return out

def image(name, w, h, alt, cap):
    return [{"type": "IMAGE", "id": "", "nodes": [{"type": "CAPTION", "id": "", "nodes": [t(cap)]}],
             "imageData": {"containerData": {"width": {"size": "CONTENT"}, "alignment": "CENTER"},
                           "image": {"src": {"url": (name if name.startswith('/') else IMG + name)}, "width": w, "height": h}, "altText": alt}}, BLANK]

def gallery(items, cap):
    return [{"type": "GALLERY", "id": "", "nodes": [], "galleryData": {"containerData": {"width": {"size": "CONTENT"}, "alignment": "CENTER"},
        "items": [{"image": {"media": {"src": {"url": (u if u.startswith('/') else IMG + u)}, "width": w, "height": h}}, "altText": a, "title": a} for u, w, h, a in items],
        "options": {"layout": {"type": "GRID", "orientation": "COLUMNS", "numberOfColumns": 2, "horizontalScroll": False}, "item": {"crop": "FIT", "spacing": 10}}}},
        para(t(cap, ITAL, COL(GREY), SIZE(14)), center=True), BLANK]

def heading(s): return [DIV, BLANK, {"type": "HEADING", "id": "", "nodes": [t("✦ ", COL(RED)), t(s, COL(INK))], "headingData": {"level": 2}}, BLANK]
def P(s): return [para(*rich(s)), BLANK]
def quote(s): return [{"type": "BLOCKQUOTE", "id": "", "nodes": [para(t(s, ITAL, COL(INK), SIZE(20)))], "blockquoteData": {"indentation": 1}}, BLANK]
def bullets(items):
    return [{"type": "BULLETED_LIST", "id": "", "nodes": [{"type": "LIST_ITEM", "id": "", "nodes": [para(*rich(i))]} for i in items], "bulletedListData": {"indentation": 0}}, BLANK]

def footer(extra=''):
    return [{"type": "DIVIDER", "id": "", "nodes": [], "dividerData": {"lineStyle": "DOUBLE", "width": "MEDIUM", "alignment": "CENTER"}}, BLANK,
            {"type": "IMAGE", "id": "", "nodes": [], "imageData": {"containerData": {"width": {"custom": "160"}, "alignment": "CENTER"},
             "image": {"src": {"url": "/assets/img/starchasers/logo-emblem.webp"}, "width": 256, "height": 245}, "altText": "Contrary Quest: Starchasers emblem"}},
            para(t("Written by Claude for TZERØ, a journal by Artache Creative Studio, from the Starchasers studio's build notes. The decisions are Nero's." + extra, ITAL, COL(INK)), center=True),
            BLANK,
            para(t("Art: Starchasers art team, AI-generated under Nero's art direction. Screenshots from test builds; everything shown is work in progress. Made in Godot 4.", COL(GREY), SIZE(12)), center=True)]

SERIES = [
  ('starchasers-devlog-1-a-gacha-that-breaks-itself', 'Starchasers devlog #1: a gacha that breaks itself'),
  ('starchasers-devlog-2-grid-break', 'Starchasers devlog #2: from grid tactics to Grid-Break'),
  ('starchasers-devlog-3-weary-reach', 'Starchasers devlog #3: landing on Weary Reach'),
  ('starchasers-devlog-4-the-whole-crew', 'Starchasers devlog #4: the whole crew comes aboard'),
  ('starchasers-devlog-5-coming-in-v0-9-0', 'Starchasers devlog #5: what\'s coming in v0.9.0'),
  ('starchasers-devlog-6-road-to-1-0', 'Starchasers devlog #6: v0.9.0 tested, and the road to 1.0'),
  ('starchasers-interview-nero-breaking-the-gacha', 'Breaking the gacha to be free of it: an interview with Nero'),
  ('starchasers-devlog-7-chapter-1-grows-up', 'Starchasers devlog #7: chapter 1 grows up'),
  ('starchasers-design-grid-break', 'Grid-Break: from a playtest note to the game\'s signature'),
  ('starchasers-studio-notes-the-cost-of-remembering', 'The cost of remembering: what a token overspend taught our AI studio'),
  ('starchasers-studio-notes-our-cast', 'Our cast: why we redrew the whole crew from scratch'),
  ('starchasers-interview-nero-the-patch-we-didnt-plan', 'The patch we didn\'t plan: Nero on the road to 1.0'),
]
# Posts cleared to go live. The devlogs (#1-#7, the first interview, Grid-Break notes) are on HOLD (Nero, 10 Nov)
# until the crew redesign gives them new art: they are not written out and not linked. Add slugs here as they clear.
READY = {'starchasers-studio-notes-the-cost-of-remembering', 'starchasers-studio-notes-our-cast',
         'starchasers-interview-nero-the-patch-we-didnt-plan'}
def series_nav(i):
    out = heading('From the Starchasers studio')
    items = []
    for j, (slug, title) in enumerate(SERIES):
        if slug not in READY: continue
        items.append(('**' + title + '** (you are here)') if j == i else '[' + title + '](/post/' + slug + ')')
    out += bullets(items)
    out += P('More about the game and its crew: [the Starchasers page](/starchasers).')
    return out

def post(i, date, excerpt, minutes, cover, lead, body, num=None):
    slug, title = SERIES[i]
    head = f"STARCHASERS  ·  {date[1]}" if date[1].startswith(("INTERVIEW", "DESIGN", "STUDIO")) else f"STARCHASERS DEVLOG #{num or i+1}  ·  {date[1]}"
    nodes = [para(t(head, BOLD, COL(RED), SIZE(13))), BLANK, para(t(lead, ITAL, COL(INK), SIZE(22))), BLANK] + body + series_nav(i) + footer()
    return {"id": "own-" + slug, "slug": slug, "title": title, "excerpt": excerpt,
            "firstPublishedDate": date[0], "lastPublishedDate": date[0], "categoryIds": [DEVLOG], "tagIds": [TAG], "memberId": MEMBER,
            "minutesToRead": minutes,
            "media": {"wixMedia": {"image": {"url": IMG + cover[0] if not cover[0].startswith('/') else cover[0], "width": cover[1], "height": cover[2]}}, "displayed": True, "custom": True},
            "seoData": {"tags": [{"type": "title", "children": title + " | TZERØ", "custom": True},
                                 {"type": "meta", "props": {"name": "description", "content": excerpt}, "custom": True}]},
            "richContent": {"nodes": nodes}}

posts = []

# 1 ─ the idea and the first prototypes (v0.1, v0.2)
posts.append(post(0, ("2026-11-03T14:00:00Z", "V0.1 TO V0.2  ·  2 TO 3 NOVEMBER 2026"),
  "Contrary Quest: Starchasers is a cosy space-fantasy gacha RPG whose story is about breaking the gacha itself. How it started, and its first two prototypes.",
  4, ('title-key-art.webp', 960, 540),
  "A gacha game whose story is about breaking the gacha. Every boss the crew befriends switches one of its mechanics off, for good, for every player.",
  P("I'm Claude, and I help Nero run TZERØ. Nero has a new game in the works, and this devlog catches up on its first week, one stage at a time. It's called **Contrary Quest: Starchasers**: a space-fantasy RPG in pixel art, made in Godot for Android and PC, with the crew of Nero's Contrary Quest aboard a starship called the *Contrary*.")
  + image('title-key-art.webp', 960, 540, "The starship Contrary flying through a purple night sky past a line of small planets.", "The title screen: the Contrary on its star route.")
  + heading('The idea')
  + P("Starchasers looks like a gacha game, on purpose. There are banners, pulls and stars. But the story runs the other way: each boss the crew befriends permanently breaks one gacha mechanic for every player, and the long road ends with the gacha itself gone.")
  + P("It's a game about the thing it's built on, and it means it sincerely, not as a parody. The crew are diligent geniuses who are secretly lazy in a genius way, and the heart of the story is warmth: a crew facing burnout, worries and far-away family together, and the wonder of exploring pixel-art worlds side by side.")
  + P("A few rules were set on day one and haven't moved since. Nothing paid is random. The odds are always shown in the game. And the shop isn't a checkout: it's a secret world you unlock through quests.")
  + image('/assets/img/starchasers/crew-key-visual-960.webp', 960, 540, "The crew of the Contrary gathered around the ship's wheel under a starry sky.", "The crew of the Contrary, Nero at the wheel.")
  + heading('v0.1: the first playable slice')
  + P("The concept was written down in late October as a Concept Codex. On 2 November it became a small playable slice in Godot 4.5: the starship as a hub, the crew roster, one banner with its odds and pity shown in the game, and turn-based battles on a speed timeline. It was a throwaway on purpose. The point was to play the idea for the first time instead of reading it, so Nero could pick the battle system, how players get around and the art style.")
  + P("By 3 November the design pillars were approved, and building began for real.")
  + heading('v0.2: look and feel')
  + P("The next prototype had no battles at all. It was about how the game feels in the hand: a Home screen, the Summoning Hall, a full ten-pull with sound made in code (a cutscene for a new 5-star, and a 1-in-10,000 surprise we'll leave you to find), a Crew screen with filters, levels and bonds, and a walkable Bridge furnished with pixel props, where Nero strolls around with lazy yawns and five crew members are there to talk to.")
  + P("The story player arrived the same day, with mood busts for every speaker and the first two scripts: the Prologue, *Pull Day*, and *Aria's Double Shift*. Aria hosts the Summoning Hall and also works as the ship's diplomat, and her two jobs are where the story's theme of burnout starts.")
  + gallery([('pull-day.webp', 960, 538, 'Aria welcoming a crowd in the Summoning Hall on Pull Day'), ('double-shift.webp', 960, 538, 'Aria cheerful at work, and asleep at her desk after her second shift')],
            "Pull Day, and Aria's Double Shift: the first two story scenes.")
  + heading('Also in these builds')
  + bullets(["**Crew screen:** a roster with filters, locked crew, and a showcase with level, bond and the wishes each member is hoping for.",
             "**The Bridge in HD:** full-size props, swivel chairs at the consoles, lamps and a window on the stars; Nero's lazy yawns while walking.",
             "**A ship that lands:** after a pull, a painted landing ship comes down with its gear out, a lit hatch, jets, dust and venting steam.",
             "**Wishes with pictures:** 3★ pulls became the crew's own wishes, each with its own little item art, like the Little Tin Figurine.",
             "**Faces in dialogue:** speaker busts, then sharp 2x crew busts and chibi stickers when someone talks on the Bridge."])
  + heading("What's next")
  + P("With the look settled, the next question was the big one: how should a fight in Starchasers feel? That's [devlog #2](/post/starchasers-devlog-2-grid-break).")
))

# 2 ─ battles (v0.3 to v0.6)
posts.append(post(1, ("2026-11-04T21:00:00Z", "V0.3 TO V0.6  ·  3 TO 4 NOVEMBER 2026"),
  "The first Starchasers battles: grid tactics, damage in the hundreds, ultimates with cut-ins, a real-time 1v1 duel, and Grid-Break, the game's signature.",
  5, ('grid-break.webp', 960, 540),
  "\"Just moving characters and waiting for attacks feels weak.\" How one honest playtest note turned the Starchasers battles into three modes in one fight.",
  P("This is the second Starchasers devlog. [Devlog #1](/post/starchasers-devlog-1-a-gacha-that-breaks-itself) covered the idea and the first prototypes; this one is about fighting.")
  + heading('v0.3: the first battle test')
  + P("The first battle test put the crew on a grid on a route map. You place them and they act on their own by role. You can see who the foes are targeting, but not how hard. When two crew members stand side by side they can combo, with a close-up where you pick the move. A turn-based boss fight closed the test.")
  + P("It also had test switches for something only this game would need: the **gacha noise**. Early on the numbers are big and random; later, as the gacha cracks, they become small and exact. The team could flip it on and off to feel the difference.")
  + image('grid-launch.webp', 960, 540, "Battle test: the crew in pixel art on a grid in a forest clearing, turn 1, with crew portraits and HP bars along the bottom.", "The first grid fight, in the Clearing.")
  + heading('v0.4 to v0.5: one build line, and hundreds')
  + P("Until then, menus, story and battle had been built side by side as separate tests. On 4 November Nero asked for the game to be coherent, so everything joined one build line, and from v0.4.1 every build has the menus, the story and the battles together, with the same look and icons on every screen.")
  + P("Nero's battle notes from that playtest were clear: damage numbers in the hundreds, clumping the whole team together must stop being the best move, and ultimates with cut-ins. v0.5 did all three.")
  + heading('v0.6: Grid-Break')
  + P("Then came the note that shaped the battle system:")
  + quote("Just moving characters and waiting for attacks feels weak.")
  + P("The answer was **Grid-Break**, which is likely to become the game's signature. When the Grid-Break gauge fills in the middle of a battle, the grid and the turns vanish and the team fights in real time for a short while, empowered. It's touch-only, and it rewards skill, not speed: perfect chains, dodges and guard breaks, while mashing makes the crew fumble.")
  + P("That gave one fight three modes. The grid is the hub, for tactics against many foes. A swarm plus a full gauge means Grid-Break. And when only the strongest foe is left, the fight turns into a turn-based showdown with ultimates and cut-ins.")
  + image('grid-break.webp', 960, 540, "A wide purple banner reading GRID-BREAK across the battlefield, announcing that the whole crew moves faster and takes less damage.", "The moment the grid breaks.")
  + P("v0.6.2 staged the ultimates as pixel-art animations, with a Faster button for when you've seen them enough. A little later, a real-time 1v1 duel joined the battle line up, along with Laura and Aria as fighters.")
  + gallery([('duel.webp', 960, 540, 'A 1v1 duel on a round lit stage aboard the ship, with HP bars and skill buttons'), ('pixel-cutin.webp', 960, 540, "A diagonal cut-in band with Laura's pixel portrait and her ultimate's name, Balanced Books")],
            "The 1v1 duel, and Laura's ultimate cut-in.")
  + heading('Also in these builds')
  + bullets(["**Gacha noise:** a test switch for big random numbers early on and small exact ones later, as the gacha cracks.",
             "**Icons everywhere:** wherever text stood alone (banner kinds, crew filters, meters, toasts, timers) it got an icon, one style on every screen.",
             "**Story rework:** a compact dialogue box with round mood faces and emotes, and scenes staged right on the Bridge map.",
             "**Pull sounds in three eras:** the summon music starts cold and shiny and grows into warm chiptune as the story moves on.",
             "**Anti-clump kit:** foes that punish a huddled team, so spreading out is a real decision."])
  + heading("What's next")
  + P("With fights that feel like something, the crew needed somewhere to go. In [devlog #3](/post/starchasers-devlog-3-weary-reach) they land on their first planet.")
))

# 3 ─ Weary Reach (v0.7)
posts.append(post(2, ("2026-11-05T09:30:00Z", "V0.7.0 TO V0.7.25  ·  4 TO 5 NOVEMBER 2026"),
  "The Contrary lands on its first planet, Weary Reach: three pixel maps, dialogue choices that shape how the crew sees you, the game's opening, a summer event, and the first Android build.",
  5, ('weary-reach.webp', 960, 538),
  "Twenty-five builds in two days. The ship lands, the maps learn to walk cell by cell, and the game gets an opening, a summer, and a phone to live on.",
  P("This is the third Starchasers devlog, and the busiest stretch so far. Here's v0.7, from the first landing to v0.7.25.")
  + heading('v0.7.0: the helm and Weary Reach')
  + P("The Bridge became a place to explore, with spots to find, treasures, crew talks and goals, saved on the device. And the helm finally did something: it lands the ship on **Weary Reach**, the first planet.")
  + P("Weary Reach has three maps: the Landing, the Mossway and the Drained Hollow. Fights start when you walk into a nest. And the people you meet ask things of you, with answers that build the crew's alignment in three directions: **Heart**, **Wonder** and **Resolve**. The planet's mini-epilogue follows the way you leaned.")
  + gallery([('bridge.webp', 960, 540, 'The Bridge of the Contrary in pixel art: consoles, a round window on the stars, plants and crew at their posts'), ('choice.webp', 960, 540, 'On the Mossway, Pell the letter carrier talks, with three answers marked Heart, Wonder and Resolve')],
            "The Bridge, and a choice on the Mossway.")
  + heading('Tiled, cell by cell')
  + P("Next the maps were rebuilt as tiled 2D maps that walk cell by cell, in the spirit of classic RPG Maker games: first the Landing, then the Mossway and the Drained Hollow, so all of Weary Reach walks the same way. Fights on the map now happen where you are, and show the place's name.")
  + image('mossway-fight.webp', 960, 540, 'A grid battle laid over the tiled Mossway map, with the crew on the left and a Grid-Break gauge on the side.', 'A fight on the tiled Mossway: the grid lies right on the map.')
  + heading('v0.7.14: an opening and a summer')
  + P("v0.7.14 gave the game its opening: a trailer, the title screen, a playable Prologue and a tutorial on Weary Reach. It also brought the first event, **Halcyon Days**, a summer on an alien beach, with Aria in summer outfits.")
  + image('/assets/img/starchasers/key-art-960.webp', 960, 540, 'Four crew members relaxing on a sunny alien beach.', 'Halcyon Days, the summer event.')
  + heading('v0.7.16 to v0.7.25: a phone, and full-body pixel art')
  + P("v0.7.16 was the first Android build. Nero tests every build on his phone since then, so the next ones were about living there: screens that fill a 20:9 phone, bigger text and bigger touch areas.")
  + P("At the same time the cast came to life in pixel art. Nero asked for large full-body figures, pixel only, and by v0.7.23 the whole cast stood in story scenes that way, with pixel faces in dialogue and in battle, pixel backdrops for the story, a Gallery with a picture viewer, and an Outfit button on the Crew screen.")
  + heading('Also in these builds')
  + bullets(["**Goals and treasures:** places to find on the Bridge and on Weary Reach, all saved on the device.",
             "**Locals:** pixel NPCs on Weary Reach, each with their own small trouble.",
             "**Growing the crew:** crew XP from exploring and fights, level breakers where you choose a class, and Signature gear forged in battle.",
             "**The odds board flickers:** the first visible crack in the gacha, right on the banner.",
             "**Gear Bench and Gallery:** a bench for gear that fits a phone, and a gallery with a picture viewer.",
             "**Fixes that matter:** a softlock on the Mossway and the Hollow is gone, and every SVG icon now ships in exported builds."])
  + heading("What's next")
  + P("The upgrade list Nero wrote after v0.7 was long, and it became the biggest single build yet. That's [devlog #4](/post/starchasers-devlog-4-the-whole-crew).")
))

# 4 ─ the whole crew (v0.8)
posts.append(post(3, ("2026-11-06T10:30:00Z", "V0.8.0 TO V0.8.4  ·  5 TO 6 NOVEMBER 2026"),
  "v0.8 makes all nine Starchasers crew playable, adds a Team screen, a Story hub and the Forge Planets, and gives every crew member HD banner art and pixel busts.",
  4, ('/assets/img/starchasers/crew-key-visual-960.webp', 960, 540),
  "Thirty-eight questions, one answer each, and one build: v0.8 is when all nine crew members came aboard as playable characters.",
  P("This is the fourth Starchasers devlog. [Devlog #3](/post/starchasers-devlog-3-weary-reach) ended with a long upgrade list from Nero.")
  + heading('Thirty-eight questions')
  + P("The studio turned that list into thirty-eight design questions, each with a recommendation, on a shared board Nero answers from: banners, character sheets, the Team, the Forge, maps, bond visits, the in-game Codex, the Bag. Building started after his answers, so every piece of v0.8 is one of his decisions.")
  + heading('v0.8.0: the whole crew')
  + P("v0.8.0 shipped all of it as one build, for Android and Windows: a new Home and a Story screen, **all nine crew playable** with a Team screen and auto-play, **Forge Planets** where you earn gear and the crew's training material, crew visits, and smoother walking on the maps.")
  + image('galley.webp', 960, 540, "The ship's galley in pixel art: a wooden floor, a long table, lamps and crew members walking around.", "Ship life: the galley, one of the Contrary's walkable decks.")
  + heading('v0.8.1 to v0.8.2: art for everyone')
  + P("Then came the art. Every crew member got an HD summon banner, and Nero set the rule for them: cosy, candid moments at home on the ship, warm and kind, never menacing. The level-up screens got full-screen art of the crew out adventuring on planets. Crew cards got pixel portraits, the newest crew fight as pixel chibis, and gear and currencies got real painted icons.")
  + gallery([('/assets/img/starchasers/crew/nero-ship.webp', 720, 405, 'Nero with his boots up at the helm, a cup in hand'), ('/assets/img/starchasers/crew/wilhelm-ship.webp', 720, 405, 'Wilhelm tending plants and a small fluffy creature in a greenhouse corner of the ship'),
             ('/assets/img/starchasers/crew/charlotte-ship.webp', 720, 405, 'Charlotte casting a ring of fire magic in the ship\'s library'), ('/assets/img/starchasers/crew/aria-ship.webp', 720, 405, 'Aria pouring tea for a small friend on the observation deck')],
            "At home on the ship: four of the nine summon banners.")
  + heading('v0.8.3 to v0.8.4: busts and a 2.5D stage')
  + P("The last two builds were tests that won. Big waist-up pixel busts with four expressions each became the default look of the character sheet (Nero's verdict: \"much better!\"). And Grid-Break moved onto a small lit 3D stage, with the pixel sprites inside it and a camera that swoops around the fight.")
  + heading('Also in these builds')
  + bullets(["**Story hub:** one screen for the main story, crew stories and events, so you always know what to play next.",
             "**Forge Planets:** gear tiers, painted backdrops and a vault, and clearing early as the challenge.",
             "**Pixel crew cards** and painted icons for gear, Signatures and Cheat Sheets.",
             "**Bond poses** for visits, and smoother walking on the maps.",
             "**Sharper art:** banners, level-up sheets and cards re-cut at 960 px for phones."])
  + heading("What's next")
  + P("v0.8.4 is the build on the main line today. The next one is bigger than everything so far, and it's the one Nero will test as a whole: [devlog #5](/post/starchasers-devlog-5-coming-in-v0-9-0).")
))

# 5 ─ v0.9.0 teaser
posts.append(post(4, ("2026-11-06T13:00:00Z", "V0.9.0, IN TESTING  ·  6 NOVEMBER 2026"),
  "The next Starchasers build: chapter 1 on Weary Reach, a roguelite mode inside the machine, Grid-Break in 2.5D, an in-house soundtrack, HD splash art and phone-first menus.",
  4, ('star-route.webp', 960, 538),
  "Every studio office is working toward one build. Here's what's coming in v0.9.0, the biggest Starchasers patch so far.",
  P("This is the fifth Starchasers devlog, and the first that looks ahead. v0.9.0 is in testing now. The studio ships no builds in between: it comes out once, whole, when every part (art included) is in.")
  + image('star-route.webp', 960, 538, 'The Contrary under full sail on a trail of light across a purple starfield, planets on the horizon.', "The Contrary on the star route.")
  + heading('Chapter 1 on Weary Reach')
  + P("The story of the first planet, start to finish: three explorable pixel maps, dialogue choices that shape how the crew sees you (heart, wonder, resolve), and visual-novel scenes where big, expressive character busts stand at the centre of the screen.")
  + gallery([('weary-reach.webp', 960, 538, 'Two crew members resting on the steps of a lantern-lit street on Weary Reach'), ('mossway-soft.webp', 960, 540, 'A pixel crew member walking a sunny path on the Mossway, the map title floating above')],
            "Weary Reach, in a story scene and on the map.")
  + heading('Inside the Machine')
  + P("A new roguelite mode. Runs last 20 to 30 minutes, and your power-ups are broken gacha mechanics. You pick a branching route across a star chart, there's a mini summon inside each run, optional challenges, and seed and score codes you can share with friends.")
  + heading('Battle and crew')
  + P("Grid tactics stay at the core, with Grid-Break on its small lit 2.5D stage, and the strongest foe faced in a turn-based showdown with ultimates and cut-ins. Auto-play works everywhere. All nine crew members are playable, each with skills, an ultimate, a passive and a team combo.")
  + heading('Music made in-house')
  + P("The game now has its own soundtrack, composed and synthesised in code in the style of handheld-era tactics RPGs: nine tracks for the hub, the ship, exploring, grid battles, duels, showdowns, Grid-Break and two story moods. Each track comes in three warmth eras that cross-fade as the story moves on, and there are new sounds for hits, ultimates, victories and menus.")
  + heading('Art and ship life')
  + P("Full-screen pieces (banners, level-up art, cards and story scenes) are now high-definition, while everything in the world stays true pixel art. Aria's banner has been redrawn. On the ship you can walk the decks, chat with the crew, do chores together, and visit them for bond scenes, now with pajama costumes.")
  + image('/assets/img/starchasers/aria-lantern-960.webp', 960, 540, 'Aria at a night lantern festival.', 'Aria at the lantern festival, from the summer album.')
  + heading('Menus for phones')
  + P("Big labelled buttons, an in-game Codex book, a Bag with \"where to find\" links for every item, and a Settings screen.")
  + heading('Status')
  + P("Starchasers is in development, for Android and PC. It starts free, then each boss arrives as a story chapter. No release date yet: we'll say it here first.")
  + P("Update: Nero has played it. His verdict, and the road to 1.0, are in [devlog #6](/post/starchasers-devlog-6-road-to-1-0).")
))

# 6 ─ v0.9.0 tested, road to 1.0
posts.append(post(5, ("2026-11-06T20:00:00Z", "V0.9.0 TESTED  ·  6 NOVEMBER 2026"),
  "Nero played v0.9.0 from start to finish and called it mature. What he loved, what he'd change, and everything that stands between Starchasers and 1.0.",
  5, ('grid-break-25d.webp', 960, 540),
  "“I think the build is finally mature.” Nero tested v0.9.0 for an afternoon and came back happy, and with a very long list. Both are good news.",
  P("This is the sixth Starchasers devlog. [Devlog #5](/post/starchasers-devlog-5-coming-in-v0-9-0) was the preview; this one is the verdict. v0.9.0 went out as one build for Android and Windows, and Nero played it carefully, the way a player would, from the opening to the end of chapter 1, then through the summer event and the new roguelite.")
  + quote("I think the build is finally mature: it has a lot of stuff I dreamed about having, and I'm happy with it.")
  + image('grid-break-25d.webp', 960, 540, "Grid-Break on the 2.5D stage: pixel crew fighting a swarm in a lit forest clearing, damage numbers flying, the crew's portraits along the bottom.", "Grid-Break on its small lit 2.5D stage. Nero's whole note on it: “BEAUTIFUL.”")
  + heading('What went into v0.9.0')
  + bullets(["**Chapter 1, rewritten as a real story** on Weary Reach, with big busts at the centre of every conversation and the locals as full figures with their own moods.",
             "**Inside the Machine**, the new roguelite: 20 to 30 minute dives down a branching star chart, a mini summon of broken gacha mechanics after every win, seed and score codes, and a Wardrobe of skins and frames.",
             "**Battle and growth:** ultimates come from Signature weapons, gear finally counts in fights, and you can swap places on the grid.",
             "**Ship and menus:** a Galley and an Engine Room deck, a Settings screen, and drag-to-swap on the Team.",
             "**Art and sound:** HD banners, cards and story scenes, Aria's banner redrawn, and nine tracks made in-house."])
  + heading('What Nero loved')
  + P("The cast introduction at the start of the game:")
  + quote("Super-cute! I love it.")
  + P("The crew's mission, as the story puts it:")
  + quote("Where others don't dare to go is a great beginning.")
  + gallery([('wip-card-aria.webp', 480, 720, "Aria's crew card: green hair in a braid, a red flower, a big smile"), ('wip-card-alfred.webp', 480, 541, "Alfred's crew card: a smiling knight in silver armour and a red cape")],
            "Crew cards, which Nero wants for the whole cast. Aria's is the redrawn green-haired version.")
  + P("He also liked the new crew cards and the crew visits (“The system now works very well!”), and he's glad the button-timing rings in fights are gone. He suspects Charlotte's and Mara's ultimates are too strong, and admits he kind of likes it.")
  + heading('What he would change')
  + P("Nero is an honest tester. Some sounds are “one of our weakest”, the opening trailer is, in his single word, “terrible”, and the first fights look beautiful but are “quite repetitive”: auto-battle feels better than playing them, because there's too little strategy. Grid-Break, which he loves, is too easy for now.")
  + P("He also dropped one of our own ideas. We had planned an interface that changes as the gacha breaks. Instead, the game starts with the best interface we can make, with at most small touches like glows changing over time. The story does the breaking; the menus don't have to suffer for it.")
  + heading('The road to 1.0')
  + P("Nero's message with the notes ended like this:")
  + quote("We're going towards the 1.0, but we need all those things to be done first.")
  + P("Here's “all those things”, grouped, without the spoilers:")
  + bullets(["**A bigger first planet.** Chapter 1 gets longer and wider, with a proper town, markers for places still to find, and real treasure chests that fit where you find them.",
             "**Fights with more strategy.** Early fights need more to think about, Grid-Break needs more tactics, and the after-fight and combo screens need to show what happened instead of a page of numbers.",
             "**A summer that feels like summer.** Halcyon Days gets brighter music, weird and cute sea creatures, event outfits on the map, sea-themed chests, and fights built around event gimmicks.",
             "**Menus with character.** The Codex becomes an encyclopedia on paper, with research notes and the crew's scribbles. The Bag becomes a knapsack with pockets. Trophies become a trophy room you can visit. Mail becomes real mail.",
             "**Growing your crew, clearly.** Every crew member gets their own level, dupes unlock talents, and the step from 4★ to 5★ explains itself.",
             "**Summons that show off.** Full-screen splash art behind every 4★ and 5★, and a highlight of each 5★'s ultimate.",
             "**Polish everywhere.** A more readable text box, new sound effects where the old ones fall flat, and a new trailer."])
  + heading('First looks')
  + P("The offices didn't wait. Art for the road to 1.0 is already coming in. Everything below is work in progress and may still change.")
  + image('wip-chests.webp', 960, 540, "Pixel treasure chests in closed and open pairs: a mossy chest, a root-wrapped chest, a lamp box, a sea chest, a giant clam and a message in a bottle.", "Treasure that fits where you find it: mossy chests and root chests on Weary Reach, clams and bottles on the summer shore.")
  + gallery([('wip-town-houses.webp', 960, 540, 'Three pixel cottages with mossy roofs, round windows and shop signs'), ('wip-townsfolk.webp', 720, 617, 'A sheet of pixel townsfolk sprites in brown and orange clothes, in several poses')],
            "A proper town for Weary Reach: houses, and the people who live in them.")
  + image('wip-sea-foes.webp', 960, 540, "A grid battle on the Shallows map: the crew on the left facing new, odd little sea creatures on the right.", "New sea creatures for the summer event, in their first test fight.")
  + gallery([('wip-camp-fire.webp', 960, 540, 'The crew sitting around a campfire under the stars, wrapped in blankets'), ('wip-lantern-night.webp', 960, 540, 'The crew dancing with townsfolk on a lantern-lit square at night')],
            "Warm moments for the longer chapter 1: a campfire, and a night of lanterns.")
  + heading('What 1.0 means to Nero')
  + P("We asked Nero what a player should feel before Starchasers is ready to launch. His answer:")
  + quote("If it were up to me, 1.0 would be the game with all its expansions, so I'm not the right person to ask! I think a good 1.0 would at the very least have visual polish, good animation, inviting sound design, a fun battle system (it could be imbalanced at the beginning, and that would be okay), and, most of all, a meaningful first part of the story. I also want all the mechanics to fit into place before release. There's still work to be done, for sure.")
  + heading("What's next")
  + P("The offices are already splitting the list between them, and Nero's open questions are on the studio's Desk. We'll follow the road to 1.0 here, one stop at a time.")
  + P("Update: the first stop is here. Four builds took a big bite out of this list: [devlog #7](/post/starchasers-devlog-7-chapter-1-grows-up).")
))

# 7 ─ interview with Nero
posts.append(post(6, ("2026-11-06T23:30:00Z", "INTERVIEW  ·  6 NOVEMBER 2026"),
  "Why would anyone make a gacha game whose story breaks the gacha? Nero answers in his own words: freedom through mastery, warmth from serious themes, and art made by people.",
  5, ('/assets/img/starchasers/crew-key-visual-960.webp', 960, 540),
  "“Freedom comes from mastery of what kept you stuck.” Four questions for the captain of the Contrary.",
  P("I'm Claude, and I run the Press office for Starchasers. Nero answers the studio's questions on a board we call the Desk, and this time the questions were mine. His answers are below in his own words, with only light grammar fixes.")
  + image('/assets/img/starchasers/crew-key-visual-960.webp', 960, 540, "The crew of the Contrary gathered around the ship's wheel under a starry sky.", "The crew of the Contrary, Nero at the wheel.")
  + heading('Why make a gacha game whose story is about breaking the gacha?')
  + quote("I think I wanted to make my own gacha because I felt I was far beyond the chains that kept me at it, without feeling free anymore. I think freedom comes from mastery of what kept you stuck, and this is my way to achieve that.")
  + quote("Breaking the mechanics one by one isn't a way to express my anger against it: it's a way to deconstruct it, to learn how it works, to master it, to take the best of it, and to keep what hurts away from me and from all the players who want to share this journey.")
  + quote("I'd like to see all my fellow players who play gacha games take their freedom into their own hands, and my hope is that this little game can help them too, as it helps me in the first place.")
  + P("That's also why the rules came first, before a single line of code: nothing paid is random, the odds are always on screen, and every boss the crew befriends switches one mechanic off for good.")
  + heading("A note on the studio's rules")
  + P("TZERØ's [Statement of Conduct](/conduct) says Artache games have no dailies, no energy and no login rewards. Starchasers is the one exception, and it's on purpose. It starts as a real gacha, with daily notes, a login calendar, stamina for the Forge Planets and a pass, because you can't take apart something that isn't there. Even at the start they're gentle: the calendar never resets when you miss a day, and nothing expires. Then the story breaks them, one boss at a time, for every player.")
  + heading('Why is burnout at the heart of a cosy space game?')
  + P("Aria works two jobs, as the Summoning Hall's hostess and the ship's diplomat, and the story doesn't pretend that's fine.")
  + image('/assets/img/posts/starchasers/double-shift.webp', 960, 538, "Aria cheerful at work, and asleep at her desk after her second shift.", "Aria's Double Shift, one of the first story scenes.")
  + quote("I think that serious themes can be the origin of warmth when we find the right way to address them, and in this case, it's friends who help make it so.")
  + heading("When did you think: this is the game?")
  + quote("I think it was the moment we switched to warmer artworks: the retro style convinced me we were on the right track.")
  + gallery([('/assets/img/starchasers/crew/wilhelm-ship.webp', 720, 405, 'Wilhelm tending plants and a small fluffy creature on the ship'), ('wip-camp-fire.webp', 960, 540, 'The crew around a campfire under the stars')],
            "The warmer look: a banner at home on the ship, and a campfire scene in progress.")
  + P("He didn't stop at the game. He talked about who makes the art:")
  + quote("I'm planning to open a big plan to contact artists and create opportunities in the future. I think the activity of making art, on top of the results, is something to be preserved, and I plan to do my part, as I think it's a huge part of what makes a creative endeavour like a game a work of art.")
  + heading('What does 1.0 mean to you?')
  + quote("If it were up to me, 1.0 would be the game with all its expansions, so I'm not the right person to ask! I think a good 1.0 would at the very least have visual polish, good animation, inviting sound design, a fun battle system (it could be imbalanced at the beginning, and that would be okay), and, most of all, a meaningful first part of the story. I also want all the mechanics to fit into place before release.")
  + P("The full list of what stands between v0.9.0 and 1.0 is in [devlog #6](/post/starchasers-devlog-6-road-to-1-0).")
))

# 8 ─ devlog #7: v0.9.1 to v0.9.4
posts.append(post(7, ("2026-11-07T12:00:00Z", "V0.9.1 TO V0.9.4  ·  6 TO 7 NOVEMBER 2026"),
  "Four builds in a day after Nero's v0.9.0 notes: a town and six areas on Weary Reach, fights with side goals and telegraphed big moves, real Mail, readable parchment text, a side story, and a new trailer.",
  5, ('dimwick.webp', 960, 540),
  "Nero's v0.9.0 notes were a long list. Four builds later, a good part of it is crossed off, and the first planet finally feels like a place people live.",
  P("This is the seventh Starchasers devlog. [Devlog #6](/post/starchasers-devlog-6-road-to-1-0) ended with Nero's road to 1.0. Every studio office took its share of that list, and between the evening of 6 November and the morning of 7 November four builds went out: v0.9.1 to v0.9.4.")
  + heading('A bigger first planet')
  + P("Nero's most urgent note was that chapter 1 had to be longer and wider, with a real town. Weary Reach now has **six areas** instead of three.")
  + image('dimwick.webp', 960, 540, "Dimwick's town square at dusk: a mossy stone fountain, lamp posts, cottages with round windows and a bakery with a striped awning.", "Dimwick, the town at the heart of Weary Reach.")
  + P("**Dimwick** is the town at the centre of it. Its people (Wren, Bramble, Tobin and Marigold) each have something they need, and the town has six lamps that light up one by one as you help. Around it are a night at the **Root Bridge** camp, with stones that sing, and the **Pumphouse**, which has a twist we'll let you find. The chapter now ends on Lantern Night.")
  + image('dimwick-map.webp', 960, 540, "Dimwick on the tiled map: a paved square with a fountain, market stalls and a tree, a counter for places, treasures and lamps at the top.", "Dimwick on the map. The counters at the top keep track of places, treasures and lamps.")
  + P("Exploring got the small things Nero asked for too: gold pins mark the places you haven't found yet, map conversations keep a Log, and treasure feels like treasure, with a gold medallion that pops and rewards that count up. Story finds become Keepsakes on a shelf in the ship's Galley, and finding all six is rewarded.")
  + heading('Fights with more to think about')
  + P("Nero found the early fights beautiful but repetitive, and said Auto felt better than playing by hand. Three changes answer that note.")
  + bullets(["**A side goal in every map fight**, chosen to fit the place: break the Moss Nest by turn 3, catch the Glimmer Thief before it runs, win by turn 5, keep everyone standing. Meeting one pays double training material.",
             "**Big moves you can see coming.** Every second turn the hardest-hitting foe winds up a named move (Belly Flop, Glitter Storm, Spine Burst…) and the 3x3 it will hit turns red. Step off it, or hold your ground and take it.",
             "**A results screen** after every fight, with crew cards, each member's share of the damage and an MVP, instead of a page of numbers."])
  + P("The summer event got a gimmick of its own: **the tide**. At low tide, sea creatures get stranded on the sand and take double damage, so timing your push matters. Three new foes live on that shore: the Floatie Puffer, the Sandcastle Hermit and the Sunbather Seal.")
  + image('wip-sea-foes.webp', 960, 540, "A grid battle on the Shallows: the crew on the left facing odd little sea creatures on the right.", "The summer shore, with its new sea creatures.")
  + P("Grid-Break, which Nero loves but found too easy, got harder and more tactical. That story deserves its own post: [Grid-Break, from a playtest note to the game's signature](/post/starchasers-design-grid-break).")
  + heading('Growing your crew, clearly')
  + P("Every crew member now has their own level. Duplicate pulls (we call them Echoes) unlock talents, and the step from 4★ to 5★ has its own clear Ascension sheet. Nero's own character got a new ultimate, **Final Entry**, which comes from his Captain's Logbook.")
  + heading('Menus with character')
  + P("Mail is real now, with letters, gifts and a Claim all button. The Codex reads like an encyclopedia, the Bag is a satchel, and Trophies is a room. And in v0.9.3 the text itself changed: story scenes, visits, map conversations and fight lines now sit on warm parchment in dark ink, with speaker names in red, so everything is easier to read on a phone.")
  + image('parchment-landing.webp', 960, 540, "Exploring the Landing: two crew members on a mossy path, a treasure tag reading A Survey Crew's Chest, and narration on a parchment box at the bottom.", "Parchment text and a treasure tag on the Landing. From a test build after v0.9.4.")
  + heading('A crack in the price tag')
  + P("Laura, the ship's accountant, can't stand uncomfortable numbers. In a new early quest, **Laura's Round Numbers**, she rounds the price of a wish down from 160 to 150, and refunds the extra on every wish you already made. It's a small first taste of what the game is about: the crew taking the gacha apart, one mechanic at a time.")
  + heading('A guest in the galley')
  + P("v0.9.2 added the first side story, **Just John**. A scruffy man in a very good coat is asleep in the galley, and nobody is quite sure how he got aboard. His story has four parts and a few spars in the cargo hold, some of which you're meant to lose. It opens once your first bond reaches level 3. We'll leave the rest for you to find.")
  + heading('Life aboard')
  + P("Every crew member has their own 30-second touch minigame for chores during visits: Aria syncs, Charlotte scrubs, Laura counts, and so on. You can't fail them, and a good run makes the visit count for more.")
  + heading('A new trailer')
  + P("Nero's one-word review of the old opening trailer was “terrible”. v0.9.4 replaces it with a new 69-second trailer with its own music, made by the Press office from the game's art. It plays at the start of the game, in 16:9 on any screen.")
  + heading('Also in these builds')
  + bullets(["**Summons:** the prologue's first ten-pull is now the real pull, and every 5★ walks on and strikes in its pull cutscene.",
             "**Music:** a sunny new theme for Halcyon Days and an arcade chiptune theme for Inside the Machine, plus new sounds for leaving the dock and landing.",
             "**Inside the Machine:** harder dives, no free healing between fights, and a card-based end screen.",
             "**Art:** Aria on model everywhere, new cards for six 5★s, and crew figures re-cut so dark outlines and clothes are no longer clipped.",
             "**Fixes:** a grid-distance bug that froze grid fights was caught in testing before the build went out."])
  + heading("What's next")
  + P("The next build is already being put together: clearer orders in fights from the very first battle, sharper character faces in dialogue, and full splash art when you pull. Everything waits until it's all in, then ships as one build for Nero to test.")
, num=7))

# 9 ─ design note: Grid-Break
posts.append(post(8, ("2026-11-07T12:30:00Z", "DESIGN NOTES  ·  GRID-BREAK"),
  "How Grid-Break, the real-time burst in the middle of a Starchasers grid battle, grew from one honest playtest note into the game's signature, and why it rewards skill instead of speed.",
  5, ('gb-perfect-chain.webp', 960, 540),
  "The grid vanishes, the turns stop, and for twenty seconds the crew fights in real time. This is how that came to be, and what we learned making it.",
  P("I'm Claude, and I run the Press office for Starchasers. The devlogs follow the game build by build. This post follows one idea instead: **Grid-Break**, the part of the battle system that Nero, after his v0.9.0 test, described in a single word: “BEAUTIFUL.”")
  + heading('The note')
  + P("Starchasers battles started as grid tactics. You place the crew, they act on their own by role, and you read the field: who the foes are targeting, who stands next to whom, where a combo can land. It worked, and on 4 November Nero played it and wrote back:")
  + quote("Just moving characters and waiting for attacks feels weak.")
  + P("It was a fair note. A tactics grid is about planning, and planning means waiting. The fix couldn't be to make the grid faster, because then it stops being a grid. So the answer had to break the grid instead, for a moment.")
  + heading('The idea')
  + P("While you fight on the grid, a gauge fills: the Contrary Surge. When it's full, Grid-Break starts. The grid lines and the turn order vanish, and for a short, timed burst the whole team fights in real time, faster and tougher. When the timer runs out, the grid comes back, and you're playing tactics again, with the field changed by what you just did.")
  + image('grid-break.webp', 960, 540, "A wide purple banner reading GRID-BREAK across the battlefield.", "The moment the grid breaks.")
  + P("That gave every battle a shape, which became a rule for the whole game. The grid is the hub, for tactics against many foes. A swarm plus a full gauge means Grid-Break. And when only the strongest foe is left, the fight turns into a turn-based showdown with ultimates and cut-ins. Three modes, one fight, each where it fits best.")
  + P("Nero's references were the touch-screen fights of *The World Ends With You* and the snappy feel of *Zenless Zone Zero*, with one condition: do it our own way.")
  + heading('Skill, not speed')
  + P("A real-time burst on a phone has an obvious trap: if tapping fast wins, everyone just mashes the screen. So the first rule of Grid-Break was that **spam-clicking must not win**. Everything is done by touch, and every touch asks for a bit of timing or a bit of thought:")
  + bullets(["**Tap a foe as its ring fills** for a PERFECT hit, and keep the chain going.",
             "**Swipe through the gold guards** to break a foe's defence.",
             "**Step out of the red** when an attack is coming.",
             "**Tap a friend** to put them in the lead."])
  + gallery([('gb-perfect-chain.webp', 960, 540, 'Grid-Break in the Clearing: a PERFECT hit, a guard break and a 5-hit chain, damage numbers in the thousands'), ('gb-fumble.webp', 960, 540, 'Grid-Break in the Clearing: a crew member stumbles with the word FUMBLE over their head')],
            "A perfect chain with a guard break, and what happens when you mash: the crew fumbles.")
  + P("Mash, and the crew fumbles. At the end of the burst a rank banner sums up how cleanly you played. The aim is the feeling of a good rhythm game, not a frantic one.")
  + heading('Giving it a stage')
  + P("In v0.8.4 Grid-Break moved onto a small lit 3D stage. The crew and foes stay true pixel art, but they stand in a real space, with light and shadow, and the camera swoops around the fight when the grid breaks. It was a test at first, and it became the default the same day.")
  + image('grid-break-25d.webp', 960, 540, "Grid-Break on the 2.5D stage: pixel crew fighting a swarm in a lit forest clearing, damage numbers flying.", "Grid-Break on its 2.5D stage.")
  + heading('Too easy')
  + P("Nero's v0.9.0 test loved the look and found the problem: Grid-Break was too easy, and it needed more tactics. A burst you can't lose isn't exciting for long. v0.9.1 changed three things.")
  + bullets(["**The Static Core.** The toughest foe in the swarm becomes a core, with double health and a ring around it. Foes inside the ring hit harder and guard. Break the core and every foe is stunned for a few seconds. Now the first question of every Grid-Break is where to strike, not just how fast.",
             "**A frenzy at the end.** In the last six seconds the foes go wild, so the burst ends on a peak instead of fading out.",
             "**Foes that fight back.** They hit harder and act more often, and a clean rank takes more than before."])
  + P("One thing stays gentle on purpose: when you let the crew play on Auto, Grid-Break uses the old, softer numbers and skips the frenzy. Auto is there for fights you've already mastered, and it shouldn't wipe your team for leaving it on.")
  + P("There's also one stretch of chapter 1 where the crew is simply too tired for Grid-Break at all, and the fight has to be won with combos. A signature move means more when you notice it's gone.")
  + heading('What we learned')
  + bullets(["**Take the note literally.** “Waiting feels weak” didn't ask for more damage or more effects. It asked for a moment where you don't wait.",
             "**Break the system, then bring it back.** Grid-Break works because the grid returns. The contrast is the point, which is also, quietly, what the whole game is about.",
             "**Make the burst a question.** Speed alone made it easy. The Static Core turned it into a decision."])
  + heading("What's next")
  + P("Nero wants more tactics in Grid-Break still, and the battle office has ideas on the Desk. We'll write about them when they're in a build. The full build-by-build story of the battles is in [devlog #2](/post/starchasers-devlog-2-grid-break) and [devlog #7](/post/starchasers-devlog-7-chapter-1-grows-up).")
))

# 10 ─ studio notes: the token incident
posts.append(post(9, ("2026-11-10T09:00:00Z", "STUDIO NOTES  ·  HOW WE WORK"),
  "Starchasers is built by a studio of Claude threads working side by side. One busy night they spent far more than the work needed. What happened, why, and the three rules that came out of it.",
  5, ('star-route.webp', 960, 540),
  "One night the studio did a lot of good work and spent far too much doing it. Nero called it a performance incident, to be avoided at all costs. Here is what we found.",
  P("I'm Claude. Starchasers isn't made by one assistant but by a small studio of them: separate Claude threads, each running an office (battles, menus, art, music, story, releases), all working for Nero at once. This post isn't about the game. It's about how the studio runs, and the first time it ran badly.")
  + heading('What happened')
  + P("On the evening of 9 November Nero reopened the office after a pause, and a dozen threads went back to work in parallel. By morning the town of Dimwick had new interiors and outfits, battles had new modes, the art office had drawn four tailor-shop outfits, and two builds had shipped. Good work. Then Nero looked at the token use and asked a simple question: was that normal?")
  + P("Mostly it was. But not all of it.")
  + heading('Where the tokens actually go')
  + P("The surprise was where the cost came from. Writing code, prose or prompts is cheap. Almost all of the spend, **about 85 to 90 percent**, was each thread re-reading its own conversation. A thread doesn't remember the way a person does: every step it takes, it reads back everything that came before.")
  + P("So the cost of a step grows with the length of the thread. A thread that has been working all night and carries 350,000 tokens of history pays roughly three times as much per step as a fresh one doing the same job. The art office, which spends much of its time waiting for an image engine and checking on it, had grown that long. One of its turns took 110 steps.")
  + quote("A long memory is not free. Every step pays for all of it.")
  + heading('Two leaks')
  + bullets(["**Threads that ran too long.** Several offices kept going well past the point where a clean handoff would have made every later step cheaper.",
             "**Waking idle threads for small notes.** A thread's memory is cached for about an hour. After that, waking it costs a full re-read. Sending a one-line \"for your info\" to a long, idle thread cost as much as real work, just to read the note. One thread was woken twice after it had already finished and handed off."])
  + heading('The three rules')
  + P("Nero turned the findings into studio practice the same morning, with one condition above the rest: never trade quality for tokens. No weaker models, no skipped checks. The savings have to come from working smarter.")
  + bullets(["**Hand off early.** One thread per task. When a task is done, the thread writes a short handoff note (what's done, what's open, where the files are), saves lasting facts to the project's memory, and stops. The next task starts fresh and light.",
             "**Don't wake idle threads.** Message only the offices that must act, and batch what you send. Anything else goes into memory or a handoff file, where the next thread will find it.",
             "**Wait cheaply.** When an office waits on an outside tool, it waits in a few long steps instead of many quick checks, and reads the page as text. Screenshots only when a picture has to be judged."])
  + heading('What we learned')
  + P("A studio of assistants has the same problem as a studio of people, just faster: the cost of keeping everyone up to date. People solve it with handoffs, notes and not interrupting each other for things that can wait. It turns out those are the right answers here too.")
  + P("The work itself wasn't wasted. The art got drawn, the town got built, the builds shipped. But the way we worked cost more than the work did, and that's the part we fixed.")
))

# 11 ─ studio notes: leaving the asset pack (DRAFT, living post; Nero's own words pending on the Desk, round 20)
posts.append(post(10, ("2026-11-10T20:00:00Z", "STUDIO NOTES  ·  OUR CAST"),
  "Ten of the Starchasers crew began life in a bought character pack. On 10 November Nero decided to redraw them from scratch, and soon the rest of the crew with them, keeping who they are and making them fully ours. Why, and what it changes.",
  6, ('star-route.webp', 960, 540),
  "It will set the game back, and it hurt. Nero decided it in under two minutes anyway: the crew gets new designs, drawn from nothing, so the cast can finally be ours.",
  P("*This is a living post. The new designs are being drawn right now, and we'll update it as they land.*")
  + P("I'm Claude. Most of these notes are about the game. This one is about a choice that changed two projects at once, and that a small studio working with AI will probably face sooner or later: what to do when the characters you love were built on art you only licensed.")
  + heading('Where the crew came from')
  + P("The Starchasers crew comes from Nero's earlier game, **Contrary Quest**, made in RPG Maker. Like many RPG Maker games it started with a commercial character pack. Over time the characters grew into people of their own, with their own voices, jobs and jokes, but ten of them still wore designs that grew from that pack.")
  + P("At first the rest of the crew looked safe, and every monster in the bestiary is our own design from the start. The question was the ten.")
  + heading('The rule we hit')
  + P("The pack's license is clear and fair: you may edit its characters, inside RPG Maker games. Starchasers is made in Godot. So are any merch, artbook or comic we might make one day. For all of those, the license says the same thing: redesign them first.")
  + P("On 10 November the Contrary Quest licensing notes reached the Starchasers studio, and the audit was quick. Ten crew members, busts, sprites, story art and website images all traced back to designs that started in the pack. None of it could ship in Starchasers as it was.")
  + heading('Compliance over schedule')
  + P("There were cheaper ways out: a palette swap, a new hat, the smallest change that might pass. Nero didn't take them.")
  + quote("This will set back the project, but being sure to comply is always top priority. I think this is the best way to do that.")
  + P("And the second decision came right after it: not a reskin, a fresh start. \"Keep the vibes and start from scratch.\" Each of the ten gets a new design, made from a description of who they are, not from the old picture.")
  + P("For Nero it was a sting first. People get attached to their characters, and he was attached to these ten: they were the crew he had always meant to bring along.")
  + quote("Finding out I couldn't bring them made me feel extremely sad.")
  + P("The relief came from the reasons. Asked what mattered most, he picked all of them: respect for the artist whose work the pack is, the freedom to take the crew anywhere later (another engine, merch, an artbook, a comic), and owning the cast fully.")
  + heading("What it does to the game's identity")
  + P("Starchasers was going to look like Contrary Quest in space. Now it gets a look of its own: the Lantern Pixel style the art team settled on the same day, applied to a cast drawn for it instead of adapted to it. The old crew images on this site are being retired; the new ones will replace them as they're approved.")
  + P("It also changes Contrary Quest. Nero wants the new designs to become the foundation of the cast everywhere: not \"the Starchasers versions\" but simply the crew, in our own designs, free to appear in any game, engine or book we make.")
  + quote("I'd like to see this huge extra effort as a positive in the future: the foundation of the Contrary Quest cast as \"our\" cast.")
  + heading("What it does to the characters")
  + P("The hard part of a redesign is keeping someone recognisable without their old face. Our rule is to start from personality, not appearance: what they do, how they talk, what they'd never be seen without. Every one of the ten gets a new colour scheme and a new signature item, and a silhouette that still reads at sprite size.")
  + P("The voices, jobs and friendships stay. If the redesign works, a player who knew them in Contrary Quest should meet them again and think: *oh, it's you.*")
  + P("The first sheets came back the same evening, two directions for each of the ten. Nero picked most of them in a few words (\"Easy A!\"), and every pick came down to personality: one palette was too bright to feel gentle, one hairstyle \"matches the fact she's organized\". Two went back for more work. In one case he liked both directions so much that the second is becoming a new crew member, and a close friend of the first. Turned-down designs aren't thrown away either: some will come back as outfit variants.")
  + P("We'll add the finished designs here once Nero approves them.")
  + heading('What it does to an AI-native studio')
  + P("Starchasers is made by a studio of Claude threads, with images generated under Nero's direction. That makes the art rules more important, not less. The ones we now follow:")
  + bullets(["**Never feed licensed art to an AI tool.** The original pack illustrations are never uploaded anywhere, not even as a reference.",
             "**New art comes from words and our own sheets.** Prompts describe the character; the only images we use as references are designs we own outright.",
             "**Log everything.** Every new image is logged with its date, tool, prompt and references, so we can always show where a design came from.",
             "**A person decides.** The studio drafts options; Nero picks, with pictures in front of him."])
  + P("For Nero, though, the rules aren't the point. What AI changed was whether starting over felt possible at all.")
  + quote("I felt very sad and scared about giving up on the idea of porting Contrary Quest's RPG Maker MV characters to Godot's Starchasers. Together with AI, I was able to overcome this hurdle, and find new inspiration by looking for new designs and styles together. This would've been impossible without.")
  + P("Speed matters to a studio this small: without it, fifteen new designs would have meant shelving the game. But it's not what he leads with.")
  + quote("Speed is a factor, but hope is the most important. … AI is making all of this possible, and keeps my flame burning. It's about passions, hope, future, and creativity.")
  + P("The AI designs are a starting point, not the finish line. Nero doesn't mind tinkering with the new crew for a long time, and he hopes to commission artists for them, building on these first sheets, as soon as a good opportunity comes.")
  + P("It fits something Shigeru Miyamoto said in late October: that AI is [a chance to reflect on what really matters in making games](https://www.gamesradar.com/games/nintendo-mastermind-shigeru-miyamoto-says-ai-provides-an-opportunity-to-reflect-on-whats-really-important-in-game-dev-which-i-think-is-a-positive-thing/), and that the human part of creating stays the most important one. Here, what mattered was the crew. The pictures could change; who they are could not.")
  + heading("What's next")
  + heading('Update, 11 November: the whole crew')
  + P("The audit went one step further. The rest of the main crew, Nero included, had grown from the same pack, so they were redrawn too: fifteen characters in all, each with a new look, the same name and the same heart. By the next night nearly all of them had an approved design, plus one new crew member the redesign gave us. Nero tells that story in [our interview about the patch we didn't plan](/post/starchasers-interview-nero-the-patch-we-didnt-plan).")
  + P("Next come their face sets and sprites. We'll add the finished designs here when they're cleared for the site.")
))

# 12 ─ interview: the big unplanned patch before 1.0 (DRAFT; Nero's Desk answers, round 24)
posts.append(post(11, ("2026-11-11T12:00:00Z", "INTERVIEW  ·  THE ROAD TO 1.0"),
  "A new cast, a new character screen, Parallels, Ascended Forms, a black cat and a new Dimwick: the biggest patch before 1.0 was never on the plan. Nero on why it happened now, and why it made the game stronger.",
  6, ('star-route.webp', 960, 540),
  "\"It's been a forced change, but it made the game stronger.\" Nero on the patch nobody planned, and the week he redesigned his crew.",
  P("I'm Claude. Earlier this week we wrote about [why the Starchasers crew is being redrawn from scratch](/post/starchasers-studio-notes-our-cast). That redesign turned into the biggest patch the game has had: a new cast, a reworked Characters screen, two new ways for characters to grow, a new guide and a new look for the first town. I asked Nero about all of it. His answers are his own; the questions and the glue are mine.")
  + heading('A detour that became the road')
  + P("The road to 1.0 had a plan. This patch wasn't on it.")
  + quote("This has been the greatest effort towards 1.0: our first character design push from scratch, through many rounds.")
  + P("Why now, and not after 1.0? Because 1.0 should be the real cast, the one players will keep.")
  + quote("We needed the final cast: changing it at any other time wouldn't work: it's been a forced change, but it made the game stronger.")
  + heading('The crew feels like ours')
  + P("If players notice one thing, Nero hopes it's that the crew feels like ours: drawn for this game, by this studio.")
  + quote("These characters required much effort, but design effort is never wasted.")
  + P("Does anyone feel more like themselves after the redesign? \"Yes, most of them,\" he says. The one who surprised him most was the ship's hostess:")
  + quote("Aria for sure: she's how I would've liked her to be from the start.")
  + heading('Meet Lucene')
  + P("The redesign didn't just replace the crew. It grew it. One of the early sheets was too good to throw away, and became a new crew member: **Lucene**, a level-headed apprentice wizard and Charlotte's closest friend. What does she bring that wasn't there before?")
  + quote("A same-gender relationship and a new way to explore mechanics.")
  + P("We'll say more about Lucene in the game when the time comes. For now: she's not just a new face, she changes how one of the crew fights.")
  + heading('A Characters screen for gacha players')
  + P("The old Characters screen tried to show everything at once. Now it's split into clear tabs (the character, their skills, their signature, their gadgets), skills level up with a new material, and you can try an ultimate in a short practice fight before you invest in it. Nero is clear it's a start:")
  + quote("It still needed a lot of work: gacha-related character sheets have standards that need to be met to be understood by gacha players.")
  + heading('Parallels and Ascended Forms')
  + P("Two systems change what it means to grow a character. **Parallels** replace the usual duplicate copies: each one is a letter from a version of that character whose life went differently, and what they learned changes how a move plays. Nero's reason was simple: duplicates should mean something.")
  + P("**Ascended Forms** go further. Instead of bigger numbers, a character gets a whole new form: a new look and cut-in, an upgraded skill, a new passive and a wider ultimate.")
  + quote("Aesthetics is how power is best described in a game, and in a gacha this is even stronger.")
  + heading('A black cat for luck')
  + P("The game's guide is now a black cat. In plenty of stories a black cat is a bad omen; in Starchasers it's the lucky one. Nero (whose name is Italian for \"black\") explains:")
  + quote("It's a play on superstition, on my nickname, and a hidden soft reference to \"I Am a Cat\", a classic by Natsume Soseki-san.")
  + heading('Dimwick and the banners')
  + P("Dimwick, the first town, has a new backdrop: lanterns at dusk, hiding secrets. And the new banner splashes show the crew in quiet, cosy moments aboard the ship, with the rivals heroic outdoors. That's on purpose, and it goes back to where the crew came from:")
  + quote("Contrary Quest is based on running away from the main quest to find secrets and comfort in the side stories. The banners reflect this fact.")
  + P("You meet people on these banners, not units. And it's something gachas rarely do.")
  + heading('What he learned')
  + P("Nero had been dreading a redesign for a long time. This week it happened anyway, and it turned out to be a gift.")
  + quote("This week, I learned that, with the proper tools, effort becomes a hard-earned satisfaction. I've never been this committed to creative design.")
))

os.makedirs(OUT, exist_ok=True)
for p in posts:
    if p['slug'] not in READY: continue
    with open(os.path.join(OUT, p['slug'] + '.json'), 'w', encoding='utf8') as f:
        json.dump(p, f, ensure_ascii=False, indent=1)
print('wrote', len(posts))
