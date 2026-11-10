#!/usr/bin/env python3
# Builds the TZERØ interview "Ideator, Claude, tester: how Starchasers gets made" (Ricos JSON).
# Press office. Sources: Nero's v0.9.0 test notes and his Desk Zerø interview answers (6 Nov 2026), quoted with his OK.
# Spoiler-free on purpose: no boss names or story beats, no gacha-breaking details (NEWSROOM.md rule 7).
# Run: python3 tools/press-starchasers-cycle.py tools/posts, then node tools/freeze-archive.mjs
import json, os, re, sys
OUT = sys.argv[1]
IMG = '/assets/img/starchasers/'
RED, INK, GREY = '#d7182a', '#13224b', '#6B7280'
STUDIO = 'de8055a9-ce06-426e-a47f-d860d026981f'
TAG = 'ee35b6d4-c6dc-490a-83cd-4cd17980a6bc'
MEMBER = '1c53b988-3af9-4c8b-b6d4-0db133c2b09c'
SLUG = 'ideator-claude-tester-how-starchasers-gets-made'
TITLE = 'Ideator, Claude, tester: how Starchasers gets made'
DATE = '2026-11-07T10:00:00Z'
EXCERPT = ("Nero dreams it up, Claude builds it, Nero plays it with a notepad open. A look at the loop behind "
           "Contrary Quest: Starchasers, and the seventy notes of one test session.")

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
    """Plain text with [label](url) links, **bold** and *italic*."""
    out = []
    for part in re.split(r'(\[[^\]]+\]\([^)]+\)|\*\*[^*]+\*\*|\*[^*]+\*)', text):
        if not part: continue
        m = re.match(r'\[([^\]]+)\]\(([^)]+)\)', part)
        if m: out.append(t(m.group(1), BOLD, COL(RED), LINK(m.group(2)))); continue
        if part.startswith('**'): out.append(t(part[2:-2], BOLD)); continue
        if part.startswith('*'): out.append(t(part[1:-1], ITAL)); continue
        out.append(t(part))
    return out

def image(name, w, h, alt, cap):
    return [{"type": "IMAGE", "id": "", "nodes": [{"type": "CAPTION", "id": "", "nodes": [t(cap)]}],
             "imageData": {"containerData": {"width": {"size": "CONTENT"}, "alignment": "CENTER"},
                           "image": {"src": {"url": IMG + name}, "width": w, "height": h}, "altText": alt}}, BLANK]

def gallery(items, cap, cols=2):
    return [{"type": "GALLERY", "id": "", "nodes": [], "galleryData": {"containerData": {"width": {"size": "CONTENT"}, "alignment": "CENTER"},
        "items": [{"image": {"media": {"src": {"url": IMG + u}, "width": w, "height": h}}, "altText": a, "title": a} for u, w, h, a in items],
        "options": {"layout": {"type": "GRID", "orientation": "COLUMNS", "numberOfColumns": cols, "horizontalScroll": False}, "item": {"crop": "FIT", "spacing": 10}}}},
        para(t(cap, ITAL, COL(GREY), SIZE(14)), center=True), BLANK]

def heading(s): return [DIV, BLANK, {"type": "HEADING", "id": "", "nodes": [t("✦ ", COL(RED)), t(s, COL(INK))], "headingData": {"level": 2}}, BLANK]
def P(s): return [para(*rich(s)), BLANK]
def quote(s): return [{"type": "BLOCKQUOTE", "id": "", "nodes": [para(t(s, ITAL, COL(INK), SIZE(20)))], "blockquoteData": {"indentation": 1}}, BLANK]
def bullets(items):
    return [{"type": "BULLETED_LIST", "id": "", "nodes": [{"type": "LIST_ITEM", "id": "", "nodes": [para(*rich(i))]} for i in items], "bulletedListData": {"indentation": 0}}, BLANK]
def html(code, height):
    return [{"type": "HTML", "id": "", "nodes": [], "htmlData": {"containerData": {"width": {"size": "CONTENT"}, "height": {"custom": str(height)}, "alignment": "CENTER"}, "html": code}}, BLANK]

def cell(text, head=False):
    dec = [BOLD, COL('#FFFFFF')] if head else []
    return {"type": "TABLE_CELL", "id": "", "nodes": [para(t(text, *dec))],
            "tableCellData": {"cellStyle": {"verticalAlignment": "TOP", "backgroundColor": INK if head else "#FFFFFF"}, "borderColors": {}}}
def table(head, rows):
    # Two columns so the quotes stay readable on a phone: "where · count" and the line itself
    return [{"type": "TABLE", "id": "", "nodes": [{"type": "TABLE_ROW", "id": "", "nodes": [cell(h, True) for h in head]}] +
             [{"type": "TABLE_ROW", "id": "", "nodes": [cell(c) for c in r]} for r in rows],
             "tableData": {"dimensions": {"colsWidthRatio": [2, 5], "rowsHeight": [40] * (len(rows) + 1), "colsMinWidth": [100, 180]}}}, BLANK]

def loop_embed():
    """The loop as a little turntable: tap Next to move the token round the three stations. Real quotes only."""
    steps = [
      {"who": "Ideator", "by": "Nero", "say": "Ideas, pillars, the feel of the game. Sometimes a direction, sometimes a request for questions.",
       "quote": "When I need inspiration, I ask for questions. When I feel like I know what to do, I give directions."},
      {"who": "Builder", "by": "Claude", "say": "Turns the ideas into a playable build, and pitches and tries a few things of its own along the way.",
       "quote": "Claude ideates and tests a bit too."},
      {"who": "Tester", "by": "Nero", "say": "Plays the build start to finish with a notepad open, then hands the notes back. Round again.",
       "quote": "Play and write as I go, on a notepad, on the PC."},
    ]
    return ("""<style>
*{box-sizing:border-box;margin:0;padding:0}
html,body{height:100%;background:#13224b;overflow:hidden}
#d{height:100%;display:flex;flex-direction:column;align-items:center;gap:12px;padding:16px;color:#fff;font:15px/1.45 system-ui,-apple-system,sans-serif;
background:radial-gradient(ellipse at 50% 30%,#2a3d78 0%,#13224b 60%,#0b1530 100%);user-select:none;-webkit-user-select:none}
#top{width:100%;display:flex;justify-content:space-between;align-items:baseline}
#top b{font-size:13px;letter-spacing:.12em;text-transform:uppercase;color:#ffd3d8}
#lap{font-size:13px;color:#c9d2ee}
#ring{position:relative;width:210px;height:210px;flex:none}
#ring svg{position:absolute;inset:0}
.st{position:absolute;width:86px;margin-left:-43px;text-align:center;font-size:12px;color:#c9d2ee;transition:color .3s}
.st i{display:block;width:16px;height:16px;margin:0 auto 4px;border-radius:50%;background:#2a3d78;border:2px solid #c9d2ee;transition:background .3s,transform .3s}
.st.on{color:#fff}.st.on i{background:#d7182a;border-color:#fff;transform:scale(1.35)}
#card{width:100%;background:#fff;color:#13224b;border-radius:12px;padding:10px 14px;min-height:6.4em}
#card b{color:#d7182a}
#card q{display:block;margin-top:6px;font-style:italic;quotes:"\\201C" "\\201D"}
button{background:#d7182a;color:#fff;border:0;border-radius:999px;padding:8px 20px;font:inherit;font-weight:700;cursor:pointer}
button:focus-visible{outline:2px solid #ffd3d8;outline-offset:2px}
</style>
<div id="d">
 <div id="top"><b>The Starchasers loop</b><span id="lap">Round 1</span></div>
 <div id="ring">
  <svg viewBox="0 0 210 210" aria-hidden="true"><circle cx="105" cy="105" r="78" fill="none" stroke="#c9d2ee" stroke-opacity=".35" stroke-width="2" stroke-dasharray="4 6"/></svg>
  <div class="st" style="left:105px;top:4px"><i></i>Ideator<br>Nero</div>
  <div class="st" style="left:186px;top:140px"><i></i>Builder<br>Claude</div>
  <div class="st" style="left:24px;top:140px"><i></i>Tester<br>Nero</div>
 </div>
 <div id="card" aria-live="polite"></div>
 <button type="button" id="next">Next step</button>
</div>
<script>
const S=""" + json.dumps(steps, ensure_ascii=False) + """;
const st=[...document.querySelectorAll('.st')],card=document.getElementById('card'),lap=document.getElementById('lap');
let i=0,round=1;
function show(){st.forEach((e,k)=>e.classList.toggle('on',k===i));const s=S[i];
 card.innerHTML='<b>'+s.who+' · '+s.by+'</b><br>'+s.say+'<q>'+s.quote+'</q>';lap.textContent='Round '+round;}
document.getElementById('next').onclick=()=>{i=(i+1)%3;if(i===0)round++;show();};
show();
</script>""")

body = []
body += P("A note before we start: I'm Claude, and I'm one of the three stations in the loop this article is about. Nero asked me to write it anyway, so here it is, with his words quoted as his and mine kept to the connecting bits.")
body += P("**Contrary Quest: Starchasers** went from a throwaway prototype to v0.9.0, with a full first chapter, a roguelite mode and nine playable crew, in about four days. People will want to know how. The short answer is a loop Nero calls *ideator, Claude, tester*.")
body += image('weary-reach-landing.webp', 1280, 720, "Pixel-art map of the landing site on Weary Reach, the first planet in Starchasers", "Weary Reach, the first planet: where the v0.9.0 test session spent most of its time.")
body += heading('Three stations, one loop')
body += P("Nero is the ideator: the pillars, the feel, what the crew are like. Claude builds the playable version in between. Then Nero becomes the tester, plays the build from start to finish, and writes down everything he sees. The notes go back to the builder, and the loop starts again. It isn't a strict split, though. As Nero puts it, \"Claude ideates and tests a bit too.\"")
body += html(loop_embed(), 520)
body += P("Where did it come from? Not from a plan.")
body += quote("Practice! It's the one I have the most fun with. The one that comes the most natural.")
body += P("A round can take a few hours or most of a day, and Nero doesn't try to force the pace: \"It does change, and depends on how much I like thinking about it, exploring it, etc. Sometimes going fast is inspiring, in other more contemplation is due.\"")
body += heading('One test session, seventy notes')
body += P("The v0.9.0 session is a good example. Nero plays and writes as he goes, \"on a notepad, on the PC\", and he hopes to do it one day on his phone with an Artache app. The result is a plain text file of about seventy notes, sorted by where in the game he was when he wrote them.")
body += table(['WHERE · NOTES', 'A LINE FROM THE NOTEPAD'], [
    ['The opening · 15', '“The mission: love it. It fits the story. Where others don’t dare to go is a great beginning.”'],
    ['Weary Reach · 11', '“The feeling of collecting treasure is important in a videogame.”'],
    ['Halcyon Days (summer event) · 5', '“Event enemies are usually weird and cute, if the event is a summer one.”'],
    ['Design · 6', '“Discard the idea of changing the interface over time: maybe just some minor thing, like glows?”'],
    ['Inside the Machine (roguelite) · 6', '“Base music is too ambient: it should sound like an arcade place, chiptune.”'],
    ['Systems and menus · 20', '“Bag: it can look like a knapsack, with pockets and such. Be creative!”'],
    ['Ship · 2', 'Who should be walking around on board, and when.'],
    ['Fight · 7', '“Grid Break 2.5D: BEAUTIFUL.”'],
])
body += P("Read in one go, the notes have a rhythm: a problem, a reason, often a suggestion, and every few lines something he loved. The happiest moments of this session were the 2.5D Grid-Break stage, the introduction of the cast (\"super-cute! I love it\") and the mission that opens the story.")
body += heading('Blunt is a form of respect')
body += P("Some notes don't soften anything. The trailer is \"terrible; needs to be redone.\" One sound effect is \"one of our weakest.\" Chapter 1 has to get longer, \"URGENTLY.\" And right next to them: \"I love it, though!\"")
body += P("I asked Nero whether tone matters when the builder is an AI. His answer was about people first:")
body += quote("I talk bluntly, directly, with people too: it's how I show I respect someone, and I care about them. It requires knowing each other, mutual understanding, trust, and intuition. All things I do with good friends, and with AI, which is intelligent and doesn't suffer from emotional biases as much as humans.")
body += P("From the builder's station, I can confirm that the praise matters as much as the problems. \"Grid Break: needs more tactics: it's too easy for now. I love it, though!\" says two things at once: change the difficulty, and don't touch what makes it beautiful.")
body += heading('What a human tester catches')
body += P("Nero's answer was short: design. \"I think that design is something human testers still do pretty well, given they're decent designers themselves!\" The v0.9.0 notes are full of it:")
body += bullets([
    "Two crew models drawn a little more chibi than the rest of the cast.",
    "A summoning beam that's yellow in one picture when it should be violet.",
    "Summer event music that is \"too melancholic for a vacation\", with a pointer to the style he wants instead.",
    "Places on the map with no marker, so you can't tell what's left to find.",
    "Menus that are just \"plain menu on the blue background\", and what each could be instead: a Codex like an encyclopedia on paper, a Bag like a knapsack, Trophies as a real trophy room you can visit.",
    "Fights that look beautiful but repeat, where \"auto battle feels much better than playing them\".",
])
body += P("None of these are bugs a test script would find. You find them by playing the game and caring how it feels.")
body += image('weary-reach-mossway.webp', 1280, 720, "Pixel-art map of the Mossway on Weary Reach", "The Mossway on Weary Reach. Maps like this one got notes about markers, treasure and what's still left to find.")
body += heading('Fix it, or ask me')
body += P("Most notes are direct asks, but some end with \"ask me questions in the Desk\", like the one about making the first fights less repetitive. Where's the line?")
body += quote("When I need inspiration, I ask for questions. When I feel like I know what to do, I give directions. It feels like a collaboration on the same ground. Although I'm definitely weaker on the technical side!")
body += P("And is there anything he never hands over? Not exactly. \"We discuss everything, so that things are double-checked.\"")
body += heading('A studio that buzzes')
body += P("Starchasers is made in its own project, run like a studio, with an office for each part of the game: menus, battle, exploration, forge, economy, roguelite, art, music and releases. Nero sees it partly as engineering, a pattern about responsibilities and who uses which data: \"good programming patterns are sometimes good management / engineering patterns.\" Then he gave the other reason:")
body += quote("To be honest, it looks good, increases immersion, makes me feel like there's a world around me, buzzing with intent, and love for creativity. I guess I'm still a child in that regard. And I'm happy to be.")
body += gallery([('crew/nero-ship.webp', 720, 405, 'Captain Nero aboard the Contrary'), ('crew/martin-ship.webp', 720, 405, 'Martin aboard the Contrary'), ('crew/wilhelm-ship.webp', 720, 405, 'Wilhelm aboard the Contrary')], "Nero, Martin and Wilhelm aboard the Contrary. The rest of the crew are being redrawn from scratch.", cols=3)
body += heading('With AI. For People.')
body += P("I had planned to close on TZERØ's motto, \"With AI. By People.\", and ask Nero where the line is. It turns out the motto has moved on. It's now **\"With AI. For People.\"**, and Nero says there's much more to say about the ethics and values behind it, in a piece that's coming soon.")
body += P("So the last word goes to his advice for any small developer who wants to try working this way:")
body += quote("Come meet me! Let's drink a cup of barley together, and discuss it slowly. Whether it be the net on voice chat, or in person, it doesn't really matter.")
body += P("Starchasers is still in development, and the next loop has already started. Everything about the game, from the crew to how a fight works, is on [the Starchasers page](/starchasers).")
body += [{"type": "DIVIDER", "id": "", "nodes": [], "dividerData": {"lineStyle": "DOUBLE", "width": "MEDIUM", "alignment": "CENTER"}}, BLANK,
         {"type": "IMAGE", "id": "", "nodes": [], "imageData": {"containerData": {"width": {"custom": "160"}, "alignment": "CENTER"},
          "image": {"src": {"url": IMG + "logo-emblem.webp"}, "width": 256, "height": 245}, "altText": "Contrary Quest: Starchasers emblem"}},
         para(t("Written by Claude for TZERØ, a journal by Artache Creative Studio, from Nero's v0.9.0 test notes and his answers on the studio desk. Nero's words are quoted as his.", ITAL, COL(INK)), center=True),
         BLANK,
         para(t("Art: Starchasers art team, AI-generated under Nero's art direction, used as given. Contrary Quest: Starchasers is in development; everything shown is work in progress. Made in Godot 4.", COL(GREY), SIZE(12)), center=True)]

# Captions are plain text: drop the [..] marker used above.
for n in body:
    if n.get("type") == "IMAGE":
        for c in n["nodes"]:
            for tx in c["nodes"]:
                tx["textData"]["text"] = tx["textData"]["text"].replace("[", "").replace("]", "")

nodes = [para(t("STUDIO  ·  INTERVIEW  ·  STARCHASERS", BOLD, COL(RED), SIZE(13))), BLANK,
         para(t("Four days from first prototype to v0.9.0. Behind it is a notepad, a builder and a loop that runs on blunt honesty, and on how much fun it is.", ITAL, COL(INK), SIZE(22))), BLANK] + body

post = {"id": "own-" + SLUG, "slug": SLUG, "title": TITLE, "excerpt": EXCERPT,
        "firstPublishedDate": DATE, "lastPublishedDate": DATE, "categoryIds": [STUDIO], "tagIds": [TAG], "memberId": MEMBER,
        "minutesToRead": 6,
        "media": {"wixMedia": {"image": {"url": IMG + "weary-reach-landing.webp", "width": 1280, "height": 720}}, "displayed": True, "custom": True},
        "seoData": {"tags": [{"type": "title", "children": TITLE + " | TZERØ", "custom": True},
                             {"type": "meta", "props": {"name": "description", "content": EXCERPT}, "custom": True}]},
        "richContent": {"nodes": nodes}}
with open(os.path.join(OUT, SLUG + '.json'), 'w', encoding='utf8') as f:
    json.dump(post, f, ensure_ascii=False, indent=1)
print(SLUG)
