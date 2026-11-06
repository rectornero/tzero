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
]
def series_nav(i):
    out = heading('The Starchasers devlog')
    items = []
    for j, (slug, title) in enumerate(SERIES):
        items.append(('**' + title + '** (you are here)') if j == i else '[' + title + '](/post/' + slug + ')')
    out += bullets(items)
    out += P('More about the game and its crew: [the Starchasers page](/starchasers).')
    return out

def post(i, date, excerpt, minutes, cover, lead, body):
    slug, title = SERIES[i]
    head = f"STARCHASERS DEVLOG #{i+1}  ·  {date[1]}"
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
  + heading("What's next")
  + P("The offices are already splitting the list between them, and Nero's open questions are on the studio's Desk. We'll follow the road to 1.0 here, one stop at a time.")
))

os.makedirs(OUT, exist_ok=True)
for p in posts:
    with open(os.path.join(OUT, p['slug'] + '.json'), 'w', encoding='utf8') as f:
        json.dump(p, f, ensure_ascii=False, indent=1)
print('wrote', len(posts))
