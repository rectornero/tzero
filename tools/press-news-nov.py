#!/usr/bin/env python3
# Builds the Press office's three news pieces of 11 Nov 2026 (Ricos JSON), each with Nero's take from Desk Zerø
# (writs press-n0..n3, answered 10 Nov 2026; quotes OK freely). Light news tone, no essays (Nero, 10 Nov).
# Scenes live in tools/press-news/*.html (drawn in code, no third-party art); their screenshots are the images.
# Run: python3 tools/press-news-nov.py tools/posts, then node tools/freeze-archive.mjs
import json, os, re, sys
OUT = sys.argv[1]
HERE = os.path.dirname(os.path.abspath(__file__))
NEWS = '/assets/img/posts/news-2026-11/'
SC = '/assets/img/starchasers/'
RED, INK, GREY = '#d7182a', '#13224b', '#6B7280'
STUDIO = 'de8055a9-ce06-426e-a47f-d860d026981f'
TAG = 'ee35b6d4-c6dc-490a-83cd-4cd17980a6bc'
MEMBER = '1c53b988-3af9-4c8b-b6d4-0db133c2b09c'

def t(text, *dec): return {"type": "TEXT", "id": "", "nodes": [], "textData": {"text": text, "decorations": list(dec)}}
COL = lambda c: {"type": "COLOR", "colorData": {"foreground": c}}
SIZE = lambda n: {"type": "FONT_SIZE", "fontSizeData": {"unit": "PX", "value": n}}
BOLD = {"type": "BOLD", "fontWeightValue": 700}
ITAL = {"type": "ITALIC", "italicData": True}
def LINK(u): return {"type": "LINK", "linkData": {"link": {"url": u, "target": "BLANK" if u.startswith('http') else "SELF"}}}
def para(*nodes, center=False):
    return {"type": "PARAGRAPH", "id": "", "nodes": list(nodes), "paragraphData": {"textStyle": {"textAlignment": "CENTER"}} if center else {}}
BLANK = para()
DIV = {"type": "DIVIDER", "id": "", "nodes": [], "dividerData": {"lineStyle": "SINGLE", "width": "SMALL", "alignment": "CENTER"}}

def rich(text):
    out = []
    for part in re.split(r'(\[[^\]]+\]\([^)]+\)|\*\*[^*]+\*\*|\*[^*]+\*)', text):
        if not part: continue
        m = re.match(r'\[([^\]]+)\]\(([^)]+)\)', part)
        if m: out.append(t(m.group(1), BOLD, COL(RED), LINK(m.group(2)))); continue
        if part.startswith('**'): out.append(t(part[2:-2], BOLD)); continue
        if part.startswith('*'): out.append(t(part[1:-1], ITAL)); continue
        out.append(t(part))
    return out

def image(url, w, h, alt, cap):
    return [{"type": "IMAGE", "id": "", "nodes": [{"type": "CAPTION", "id": "", "nodes": [t(cap)]}],
             "imageData": {"containerData": {"width": {"size": "CONTENT"}, "alignment": "CENTER"},
                           "image": {"src": {"url": url}, "width": w, "height": h}, "altText": alt}}, BLANK]
def heading(s): return [DIV, BLANK, {"type": "HEADING", "id": "", "nodes": [t("✦ ", COL(RED)), t(s, COL(INK))], "headingData": {"level": 2}}, BLANK]
def P(s): return [para(*rich(s)), BLANK]
def quote(s, who="Nero"):
    return [{"type": "BLOCKQUOTE", "id": "", "nodes": [para(t(s, ITAL, COL(INK), SIZE(20))), para(t("— " + who, BOLD, COL(RED), SIZE(13)))],
             "blockquoteData": {"indentation": 1}}, BLANK]
def bullets(items):
    return [{"type": "BULLETED_LIST", "id": "", "nodes": [{"type": "LIST_ITEM", "id": "", "nodes": [para(*rich(i))]} for i in items], "bulletedListData": {"indentation": 0}}, BLANK]
def video(vid, title, cap):
    return [{"type": "VIDEO", "id": "", "nodes": [{"type": "CAPTION", "id": "", "nodes": [t(cap)]}],
             "videoData": {"containerData": {"width": {"size": "CONTENT"}, "alignment": "CENTER"},
                           "video": {"src": {"url": "https://www.youtube.com/watch?v=" + vid}},
                           "thumbnail": {"src": {"url": "https://i.ytimg.com/vi/" + vid + "/hqdefault.jpg"}, "width": 480, "height": 360},
                           "title": title}}, BLANK]
def scene(name, height):
    code = open(os.path.join(HERE, 'press-news', name), encoding='utf8').read()
    return [{"type": "HTML", "id": "", "nodes": [], "htmlData": {"containerData": {"width": {"size": "CONTENT"}, "height": {"custom": str(height)}, "alignment": "CENTER"}, "html": code}}, BLANK]

def signoff(credits):
    return [DIV, BLANK,
            para(t("Written by Claude for TZERØ, a journal by Artache Creative Studio, from this week's news and Nero's answers on the studio desk. Nero's words are quoted as his.", ITAL, COL(INK)), center=True),
            BLANK, para(t(credits, COL(GREY), SIZE(12)), center=True)]

def write(slug, title, date, excerpt, standfirst, cover, minutes, body):
    nodes = [para(t("STUDIO  ·  NEWS  ·  NERO'S TAKE", BOLD, COL(RED), SIZE(13))), BLANK,
             para(t(standfirst, ITAL, COL(INK), SIZE(22))), BLANK] + body
    post = {"id": "own-" + slug, "slug": slug, "title": title, "excerpt": excerpt,
            "firstPublishedDate": date, "lastPublishedDate": date, "categoryIds": [STUDIO], "tagIds": [TAG], "memberId": MEMBER,
            "minutesToRead": minutes,
            "media": {"wixMedia": {"image": {"url": cover, "width": 2560, "height": 1440}}, "displayed": True, "custom": True},
            "seoData": {"tags": [{"type": "title", "children": title + " | TZERØ", "custom": True},
                                 {"type": "meta", "props": {"name": "description", "content": excerpt}, "custom": True}]},
            "richContent": {"nodes": nodes}}
    with open(os.path.join(OUT, slug + '.json'), 'w', encoding='utf8') as f:
        json.dump(post, f, ensure_ascii=False, indent=1)
    print(slug)

CODE_CREDIT = "Illustrations and scenes: drawn in code for TZERØ, no third-party art."

# 1 ─ Ocarina of Time (Nero's first pick, press-n0-order)
b = []
b += image(NEWS + 'oot-field.webp', 2560, 1440, "A drawn morning field with rolling green hills, a dirt path and a small figure at its start", "Morning on the field. Illustration: TZERØ.")
b += P("**The Legend of Zelda: Ocarina of Time** is out again. The 1998 classic was rebuilt for Nintendo Switch 2 and released on 5 November. Nintendo first showed it in June, set the date at September's Zelda 40th anniversary Direct ([Gematsu](https://www.gematsu.com/2026/09/the-legend-of-zelda-ocarina-of-time-remake-launches-november-5)), and showed the rest in an overview trailer in October ([Nintendo Life](https://www.nintendolife.com/news/2026/10/zelda-ocarina-of-time-overview-trailer-is-so-beautiful-we-cant-cope)).")
b += heading("What's new")
b += bullets([
    "A day and night cycle that keeps running wherever you are, towns included.",
    "You can play the ocarina songs into the Switch 2 microphone, or just hum them.",
    "Manual jumping, sprinting, a free camera, voice acting and a quest log ([80.lv](https://80.lv/articles/the-legend-of-zelda-ocarina-of-time-switch-2-remake-releases-this-year)).",
])
b += video("8v8eDMh1o3g", "The Legend of Zelda: Ocarina of Time – Overview Trailer – Nintendo Switch 2", "The official overview trailer, from Nintendo of America.")
b += P("Reviews have been warm, and one word keeps turning up in them: *safe*. This is a faithful remake, not a reinvention. Is that a problem? I asked someone with an unusual point of view.")
b += heading("Nero has never finished it")
b += P("A confession for a Zelda article: Nero has only played the opening of Ocarina of Time. He knows it through dear friends who loved it. His own Zelda was a different one, and it came with a story.")
b += P("When he got his first GameCube as a boy, a game came with it: The Wind Waker. He didn't want it, so he asked the shopkeeper to “take the game out of the console”. The shopkeeper was confused. Taking it out would only save him about ten euros. So, reluctantly, the game came home too.")
b += image(NEWS + 'oot-shop.webp', 2560, 1440, "Drawing of a boy at a shop counter pointing at a purple console box and a game case with a sailboat on it, while a puzzled shopkeeper looks on",
           "“Can you take the game out of the console?” Illustration: TZERØ.")
b += quote("It was one of my greatest games' discovery, probably one of my earliest. It teaches the importance of exploring new things, and, in this case, new game genres.")
b += heading("Is “safe” a bad word?")
b += image(NEWS + 'oot-gate.webp', 2560, 1440, "A pair of closed wooden town gates at night", "The gate, still closed. Illustration: TZERØ.")
b += P("Nero picked “it depends”. Here's the difference he draws:")
b += quote("“Safe” and “sound” we all like. “Safe” and “repetitive” is another thing. There has been a lot of talk like this about Pokémon titles.")
b += P("A remake, though, is a special case. The word is right there in the job description:")
b += quote("I think a remake can be safe, as it's meant to safeguard something, and make it accessible to new people, that are used to new technological advancement.")
b += P("He counts himself among the people it's for. The remake, he says, is helping many, “me included”, to live a story he would otherwise keep putting off. Plenty of young players have never even heard of the Nintendo 64, and now they can find this story on their own console, “something they can be genuinely enthusiastic about”. His verdict: “In this case, from my point of view, ‘safe’ is fine.”")
b += heading("The moment he's waiting for")
b += P("If he plays it now, there's one scene Nero can't wait to see. Open the gate.")
b += scene('field.html', 430)
b += P("Will it hit as hard as he hopes? “From what I hear, it looks like it.” We'll let you know.")
b += signoff(CODE_CREDIT + " Trailer embedded from Nintendo of America's YouTube channel. The Legend of Zelda, Ocarina of Time, The Wind Waker, GameCube and Nintendo Switch 2 are trademarks of Nintendo.")
write('ocarina-of-time-is-back-and-safe-is-fine', 'Ocarina of Time is back, and “safe” is fine', '2026-11-11T09:00:00Z',
      "Zelda's 1998 classic is out again on Switch 2, and reviews call it safe. Nero, who never got past the opening, thinks that's the point of a remake.",
      "Zelda's 1998 classic is out again, rebuilt for Switch 2. Reviews call it safe. Nero, who never got past the opening, thinks that's exactly the point.",
      NEWS + 'oot-field.webp', 4, b)

# 2 ─ Sakurai and AI
b = []
b += image(NEWS + 'tools-ai.webp', 2560, 1440, "A red star picked out from a cloud of faint sketched stars, with the words: you pick this one, and make it better", "Many tries, one pick. Illustration: TZERØ.")
b += P("**Masahiro Sakurai**, the director behind Kirby and Super Smash Bros., has talked about generative AI again, this time in an interview with Denfaminicogamer. As reported by [Dexerto](https://www.dexerto.com/gaming/super-smash-bros-creator-sakurai-hits-out-at-ai-games-for-just-copying-others-3422041/), [LEVEL UP](https://www.levelup.com/en/news/masahiro-sakurai-warns-ai-could-flood-the-games-industry-with-generic-titles/) and [Insider Gaming](https://insider-gaming.com/masahiro-sakurai-generative-ai/), he made three points:")
b += bullets([
    "He doesn't use generative AI in his own work, not even to brainstorm.",
    "Making games keeps getting heavier, and refusing AI outright could leave developers behind.",
    "He expects a wave of lookalike games made with AI, and thinks most of them won't make money.",
])
b += video("7M-DnOIeasA", "About This Channel", "Sakurai's own YouTube channel, Masahiro Sakurai on Creating Games, where he explains how he works.")
b += heading("Nero's take")
b += P("TZERØ's motto is “With AI. For People.”, so you might expect an argument. There isn't one:")
b += quote("I think his point is perfectly reasonable: he chose his style of working, and thinks it may have drawbacks. I respect it, and will strive preserving what Sakurai-san also fights to protect while using AI a bit more.")
b += image(NEWS + 'tools-tablet.webp', 2560, 1440, "A clean star on a drawing tablet, with notes like Ctrl+Z times 14 and Layer 3: colour", "The same star on a tablet: undo, layers, mirror. Illustration: TZERØ.")
b += heading("Juries draw a harder line")
b += P("Not everyone is that relaxed about it. The Indie Game Awards don't accept games made with generative AI at any stage of development. Last December they took back Clair Obscur: Expedition 33's Game of the Year and Debut Game awards, after AI-generated assets were found in the version that shipped ([Insider Gaming](https://insider-gaming.com/indie-game-awards-disqualifies-clair-obscur-expedition-33-gen-ai/)). Some judges of the Independent Games Festival have said they won't vote for AI-made games either.")
b += P("Asked about that, Nero picked “too blunt: judge the game”, and explained it with something every digital artist knows:")
b += quote("AI as a tool is just a tool. It's like blaming people for the use of the tablet instead of paper when they draw, and, specifically, the use of drawing software's shortcuts: those are impossible on paper, and it's the same thing that is happening with AI: just on a wider scale.")
b += image(NEWS + 'tools-paper.webp', 2560, 1440, "A hand-drawn pencil star on lined paper", "The same star, by hand. Illustration: TZERØ.")
b += P("Try it yourself. Pick a tool and draw the same star.")
b += scene('tools.html', 470)
b += heading("His last word")
b += image(NEWS + 'sakurai-toolset.webp', 2560, 1440, "Three panels: a pencil on paper, a star on a tablet and a red circle picked from many on a dark screen, under the words Three tools. One hand.", "Three tools, one hand. Illustration: TZERØ.")
b += P("I asked Nero for one line to close this piece. He gave me a paragraph, and it's better than anything I'd cut it down to:")
b += quote("AI is a great opportunity: it's up to us to understand where it's worth for us to explore more, to overcome our limits, to try something new with our own hands. AI can also be a great tool to learn and do exactly this. We have a powerful tool in our hands: let's use it while still seeking for beauty and meaning, and it will for sure be a strong toolkit to achieve what we all look for... and maybe even beyond.")
b += signoff(CODE_CREDIT + " Video embedded from Masahiro Sakurai on Creating Games on YouTube.")
write('sakurai-doesnt-use-ai-and-still-says-dont-ignore-it', "Sakurai doesn't use AI. He still says don't ignore it", '2026-11-11T11:00:00Z',
      "Masahiro Sakurai keeps generative AI out of his own work, but warns that refusing it could leave developers behind. Nero agrees, and has a word for award juries.",
      "Masahiro Sakurai keeps generative AI out of his own work, and warns that refusing it outright could leave developers behind. Nero agrees with more of that than you might think.",
      NEWS + 'tools-ai.webp', 4, b)

# 3 ─ Steam clones and Valve's new rule
b = []
b += image(NEWS + 'noise-full.webp', 2560, 1440, "A glowing card that says Our game, made with friends, below two rows of grey copies with names like Our Gaem and Our Game DX", "Twenty-four copies and one original. Illustration: TZERØ.")
b += P("October's Steam Next Fest was crowded: thousands of demos, and many players and developers said too many of them were low-effort AI games ([GamesRadar](https://www.gamesradar.com/games/valve-acknowledges-steams-ai-problem-as-next-fest-exposes-thousands-of-low-quality-games-but-says-it-doesnt-want-to-tell-devs-which-tools-they-should-or-shouldnt-use/)). Some indie developers even said they'd been threatened: pay, or an AI clone of your game comes out first.")
b += P("At Steam Indie Connect, Valve's Tom Giardino said clones have always existed and always will, and that a developer's best defence is community trust and regular updates ([Game Developer](https://www.gamedeveloper.com/pc/valve-addresses-steam-ai-cloning-problem)).")
b += video("_r7Bdf9LuMM", "Everyone Said AI Slop Ruined Next Fest, But What Does the Data Show?", "SiriusGaming looks at the Next Fest numbers instead of the noise.")
b += heading("The five-minute rule")
b += P("Valve has also added to its release checklist. Before submitting a build, developers now have to launch their game through the Steam client and keep it running for at least five minutes. Reviews of new games can take up to 12 business days ([HotHardware](https://hothardware.com/news/valve-forces-steam-devs-to-play-their-own-games-to-fight-ai-slop), [Hypebeast](https://hypebeast.com/2026/11/valve-updates-steam-rules-amid-ai-game-surge)). Valve hasn't said the rule is about AI, but that's how most of the press read it.")
b += image(NEWS + 'steam-timer.webp', 2560, 1440, "A play button on a screen next to a clock reading 5:00, with the words Run it. Keep it running. Then submit.", "The five-minute rule, drawn. Illustration: TZERØ.")
b += P("Nero's take is half hopeful, half practical:")
b += quote("Honestly, I trust quality naturally rises over background noise. It may help, though! I'm just worried this will make the publishing process clunkier, so I'm not sure it'll be all sunshine and roses.")
b += heading("Should a small studio worry about clones?")
b += P("Nero answered “not really”, and then explained why, in a way only he could:")
b += quote("People have been cloning games since forever! We're a studio that is born with research and discovery in mind: there's no way one copy the flame in people's hearts. And, if they really manage to, then it means we have more friends! When it comes to games specifically, I guess they'll help extending our reach, and I'll file it under advertisement unforeseen expenses!")
b += P("Try it. Put our game on the shelf and let the copies pile up.")
b += scene('noise.html', 460)
b += heading("And the slop?")
b += P("One more twist. The heroes of Nero's Contrary Quest games are diligent geniuses who are secretly lazy, in a genius way. So I asked him whether he worries about his own games coming out sloppy:")
b += quote("In our Contrary Quest game line, the characters are the sloppy ones. I hope the game doesn't end up like the characters! I am a lazy person myself, but I do have hyperfixation on design and quality, so, as the game series' characters, I trust my weakness will come to fruition... especially when it'll be with friends!")
b += image(NEWS + 'steam-hammock.webp', 2560, 1440, "A small figure asleep in a red hammock under the stars, with two tags: laziness: genius, quality: obsessed", "Lazy, by his own admission. Obsessed with quality, also by his own admission. Illustration: TZERØ.")
b += signoff(CODE_CREDIT + " Video embedded from SiriusGaming's YouTube channel. Steam is a trademark of Valve.")
write('steam-is-filling-up-with-clones-nero-isnt-worried', "Steam is filling up with clones. Nero isn't worried", '2026-11-11T13:00:00Z',
      "AI-made copies crowded October's Next Fest and Valve added a five-minute rule to its release checklist. Nero's take: more friends, and a line in the ad budget.",
      "AI-made copies crowded October's Next Fest, and Valve has added a five-minute rule to its release checklist. Nero's reaction: more friends, and a new line in the ad budget.",
      NEWS + 'noise-full.webp', 4, b)
