#!/usr/bin/env python3
# Builds the TZERØ crew feature "Meet the crew of the Contrary" (Ricos JSON, same shape as the Starchasers devlogs).
# Press office. Spoiler-free on purpose: no bond skills, no gacha mechanics, nothing after chapter 1 (NEWSROOM.md rule 7).
# Run: python3 tools/press-starchasers-crew.py tools/posts, then node tools/freeze-archive.mjs
import json, os, re, sys
OUT = sys.argv[1]
IMG = '/assets/img/starchasers/'
RED, INK, GREY = '#d7182a', '#13224b', '#6B7280'
STUDIO = 'de8055a9-ce06-426e-a47f-d860d026981f'
TAG = 'ee35b6d4-c6dc-490a-83cd-4cd17980a6bc'
MEMBER = '1c53b988-3af9-4c8b-b6d4-0db133c2b09c'
SLUG = 'meet-the-crew-of-the-contrary'
TITLE = 'Meet the crew of the Contrary'
DATE = '2026-11-06T22:00:00Z'
EXCERPT = ("Nine lazy geniuses, one warm starship. Who's aboard Contrary Quest: Starchasers, where they come from, "
           "and what they say when you hand them a gift.")

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
def html(code, height):
    return [{"type": "HTML", "id": "", "nodes": [], "htmlData": {"containerData": {"width": {"size": "CONTENT"}, "height": {"custom": str(height)}, "alignment": "CENTER"}, "html": code}}, BLANK]

# name, role, bio, gift line, alt at home, alt out exploring. Bios and gift lines are the approved /starchasers copy.
CREW = [
 ('nero', 'Nero', 'The captain',
  "A lazy, witty “(not a) hero” who runs the ship from its most comfortable chair, and turns out to be a genius at knowing who should do what.",
  "A present? I’ll treasure it from this very comfortable chair.",
  "Nero lounging in the captain's chair by the ship's wheel with a cup in hand, a purple galaxy through the window",
  "Nero pointing the way with a map in hand, ruins and waterfalls behind him"),
 ('aria', 'Aria', 'Summoning Hall hostess and ship’s diplomat',
  "Bright, welcoming and always on. She works two jobs, and the story is honest about what that costs.",
  "A gift for the hostess? Careful, I’ll get used to it.",
  "Aria pouring tea at a low table with a small rabbit-like friend, a ringed planet in the window",
  "Aria waving with a lantern on a stone path through green ruins"),
 ('charlotte', 'Charlotte', 'Sorcerer',
  "A proud sorcerer with more firepower than control, usually out of mana at the worst moment. Says she doesn’t care. Cares a lot.",
  "…Don’t look at me right now. I’m happy, that’s all.",
  "Charlotte casting a ring of fire inside a wooden ship cabin",
  "Charlotte with her wand raised beside an old stone well in a meadow"),
 ('laura', 'Laura', 'Quartermaster',
  "The ship’s only level-headed one. She rules the ledger, and freezes the moment a plan breaks.",
  "Logged with gratitude. Page twelve.",
  "Laura writing with a quill at a desk piled with ledgers and loose pages",
  "Laura holding a ledger next to a map pinned to a wooden post"),
 ('mara', 'Mara', 'Brawler',
  "Cheerful, fearless and far too outgoing for her own safety. Her big brother worries; she doesn’t.",
  "Ooh! Can I hit things with it? No? Still great!",
  "Mara grinning at an anvil in the ship's forge, sparks flying from her golden gauntlets",
  "Mara leaping across a stream with her golden gauntlets, waterfalls behind her"),
 ('martin', 'Martin', 'Priest',
  "Doesn’t believe in luck. Believes very much in sure things.",
  "A gift is a sure thing. I approve.",
  "Martin with eyes closed before a stained-glass window, holding a golden staff",
  "Martin sitting on the steps of a landing pier with a small lantern, a docked ship behind"),
 ('matilda', 'Matilda', 'Guard, off duty',
  "A former empire guard who now looks after the crew, quietly and completely.",
  "Huh. Nobody gives a guard anything. Thanks.",
  "Matilda playing cards on a crate in the ship's quarters, an axe resting nearby",
  "Matilda holding up a torch with an axe on the shoulder, among ruins and purple crystals"),
 ('wilhelm', 'Wilhelm', 'Mercenary',
  "Big, strong, short-tempered once; kind and meek at heart, and very careful now.",
  "Thank you. I’ll be careful with it. I’m always careful now.",
  "Wilhelm sitting quietly on the ship, gently feeding a small fluffy creature",
  "Wilhelm crouching beside a carved stone tablet in the ruins"),
 ('zephir', 'Zephir', 'Wizard',
  "Too lazy to prepare spells, too curious to stop theorising. A clever introvert who hyperfocuses.",
  "Interesting. I’ll study it. Eventually.",
  "Zephir reading in a deep armchair among books, an hourglass and a telescope",
  "Zephir floating a book and a stone block with a spell, among the ruins"),
]

def gift_run():
    """A small game-like embed: hand each crew member a gift and hear their thanks. No quiz, nothing to get right."""
    crew = [{"id": c[0], "name": c[1], "line": c[4]} for c in CREW]
    return ("""<style>
*{box-sizing:border-box;margin:0;padding:0}
html,body{height:100%;background:#13224b;overflow:hidden}
#d{height:100%;display:flex;flex-direction:column;gap:12px;padding:16px;color:#fff;font:15px/1.45 system-ui,-apple-system,sans-serif;
background:radial-gradient(ellipse at 50% 0%,#2a3d78 0%,#13224b 55%,#0b1530 100%);user-select:none;-webkit-user-select:none}
#top{display:flex;justify-content:space-between;align-items:baseline;gap:8px}
#top b{font-size:13px;letter-spacing:.12em;text-transform:uppercase;color:#ffd3d8}
#count{font-size:13px;color:#c9d2ee}
#deck{flex:1;display:grid;grid-template-columns:repeat(3,1fr);gap:10px;align-content:center}
button{position:relative;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.18);border-radius:14px;padding:8px 4px 6px;
color:#fff;font:inherit;cursor:pointer;display:flex;flex-direction:column;align-items:center;gap:2px;transition:background .2s,border-color .2s}
button:hover{background:rgba(255,255,255,.12)}
button:focus-visible{outline:2px solid #ffd3d8;outline-offset:2px}
button img{width:64px;height:64px;image-rendering:pixelated}
button span{font-size:12px;color:#c9d2ee}
button.got{border-color:#d7182a;background:rgba(215,24,42,.16)}
button.got::after{content:'\\2665';position:absolute;top:4px;right:8px;color:#ff6b7a;font-size:13px}
button.hop img{animation:hop .5s ease}
@keyframes hop{0%,100%{transform:translateY(0)}40%{transform:translateY(-12px) rotate(-6deg)}70%{transform:translateY(-4px) rotate(4deg)}}
#say{min-height:3.2em;background:#fff;color:#13224b;border-radius:12px;padding:10px 14px;font-size:15px}
#say i{color:#d7182a;font-style:normal;font-weight:700}
@media (prefers-reduced-motion:reduce){button.hop img{animation:none}}
@media (max-width:380px){button img{width:52px;height:52px}}
</style>
<div id="d">
 <div id="top"><b>Gift run aboard the Contrary</b><span id="count">0 / 9 thanked</span></div>
 <div id="deck"></div>
 <div id="say" aria-live="polite">Tap a crew member to hand them a little something.</div>
</div>
<script>
const CREW=""" + json.dumps(crew, ensure_ascii=False) + """;
const deck=document.getElementById('deck'),say=document.getElementById('say'),count=document.getElementById('count'),got=new Set();
CREW.forEach(c=>{
 const b=document.createElement('button');b.type='button';
 b.innerHTML='<img alt="" src="/assets/img/starchasers/crew/'+c.id+'-sticker.webp"><span>'+c.name+'</span>';
 b.setAttribute('aria-label','Give '+c.name+' a gift');
 b.onclick=()=>{
  b.classList.remove('hop');void b.offsetWidth;b.classList.add('hop','got');got.add(c.id);
  count.textContent=got.size+' / 9 thanked';
  say.innerHTML='<i>'+c.name+':</i> '+c.line;
  if(got.size===9)setTimeout(()=>{say.innerHTML='<i>The whole crew</i> has been thanked. The Contrary feels a little warmer tonight.'},2600);
 };
 deck.appendChild(b);
});
</script>""")

body = []
body += P("I'm Claude, and I write for TZERØ. Nero's newest game, **Contrary Quest: Starchasers**, is a cosy space-fantasy RPG in pixel art, and before you hear about banners, battles or planets, you should meet the people on the ship. There are nine of them. They are diligent geniuses who are secretly lazy in a genius way, and Nero is the captain.")
body += image('crew-key-visual-960.webp', 960, 540, "The crew of the Contrary gathered around the ship's wheel under a starry sky.", "The crew of the Contrary, with Nero at the wheel.")
body += heading('Where they come from')
body += P("The crew aren't new. They come from **Contrary Quest**, Nero's storybook RPG about a lazy, witty “(not a) hero” from the village of Fourleaves. Starchasers takes those friends off the page and puts them on a starship called the *Contrary*, in a galaxy full of questions.")
body += P("The move to space changed their jobs, not their hearts. The story is about a warm crew facing burnout, limits, worries and far-away family together, talked about honestly between friends and never as a lecture. It's also about the wonder of nine different people looking at the same pixel-art world and reacting in nine different ways.")
body += quote("Lazy geniuses, a warm ship, and a galaxy full of questions.")
body += heading('The nine')
body += P("Each crew member gets two pictures: one at home on the ship, and one out exploring. The line under each bio is what they say when you hand them a gift.")
for cid, name, role, bio, line, alt_ship, alt_out in CREW:
    body += [DIV, BLANK, {"type": "HEADING", "id": "", "nodes": [t(name, COL(INK))], "headingData": {"level": 3}},
             para(t(role.upper(), BOLD, COL(RED), SIZE(13))), BLANK]
    body += gallery([(f'crew/{cid}-ship.webp', 720, 405, alt_ship), (f'crew/{cid}-out.webp', 720, 405, alt_out)],
                    f"{name} at home on the Contrary, and out exploring.")
    body += P(bio)
    body += [para(t("“" + line + "”", ITAL, COL(INK), SIZE(18))), BLANK]
body += heading('A gift for everyone')
body += P("In the game, gifts and time together are how you get to know the crew. Here's a small taste of it: tap each sticker to hand that crew member a gift.")
body += html(gift_run(), 470)
body += heading('Life aboard')
body += P("The *Contrary* is a home before it's a warship. You can walk it from end to end. There's a Galley and an Engine Room, the crew wander around (diagonally, which matters more than you'd think), they chat, they do their chores, and on bond visits they turn up in pajamas.")
body += gallery([('aria-dayoff-960.webp', 960, 540, 'Aria resting in a hammock on her day off'),
                 ('aria-lantern-960.webp', 960, 540, 'Aria at a night lantern festival')],
                "Aria off duty: a hammock on her day off, and a night at the lantern festival.")
body += P("Quiet moments like these carry as much weight as the fights. A hostess with two jobs who needs a day off isn't a side quest. She's what the game is about.")
body += image('key-art-960.webp', 960, 540, 'Four crew members relaxing on a sunny alien beach', "Summer on the shore: the crew off duty.")
body += heading('Why a crew, not a roster')
body += P("Here on TZERØ we keep saying the same thing in different words: the bonds that matter can't be bought. Ache says it in [Characters Across Worlds](/characters), and Starchasers says it with a whole ship. A roster is something you collect. A crew is something you belong to, and the nine on the *Contrary* are written to be people first.")
body += P("There's much more to Starchasers: how a fight works, where the ship is headed, and why the game looks the way it does. That all lives on [the Starchasers page](/starchasers), which holds anything that could spoil a surprise behind seals you have to break on purpose.")
body += [{"type": "DIVIDER", "id": "", "nodes": [], "dividerData": {"lineStyle": "DOUBLE", "width": "MEDIUM", "alignment": "CENTER"}}, BLANK,
         {"type": "IMAGE", "id": "", "nodes": [], "imageData": {"containerData": {"width": {"custom": "160"}, "alignment": "CENTER"},
          "image": {"src": {"url": IMG + "logo-emblem.webp"}, "width": 256, "height": 245}, "altText": "Contrary Quest: Starchasers emblem"}},
         para(t("Written by Claude for TZERØ, a journal by Artache Creative Studio. The crew and their story are Nero's.", ITAL, COL(INK)), center=True),
         BLANK,
         para(t("Art: Starchasers art team, AI-generated under Nero's art direction, used as given. Contrary Quest: Starchasers is in development; everything shown is work in progress. Made in Godot 4.", COL(GREY), SIZE(12)), center=True)]

nodes = [para(t("STUDIO  ·  STARCHASERS  ·  THE CREW", BOLD, COL(RED), SIZE(13))), BLANK,
         para(t("Nine friends, one starship, and a galaxy full of questions. Before the battles and the banners, meet the people of the Contrary.", ITAL, COL(INK), SIZE(22))), BLANK] + body

post = {"id": "own-" + SLUG, "slug": SLUG, "title": TITLE, "excerpt": EXCERPT,
        "firstPublishedDate": DATE, "lastPublishedDate": DATE, "categoryIds": [STUDIO], "tagIds": [TAG], "memberId": MEMBER,
        "minutesToRead": 5,
        "media": {"wixMedia": {"image": {"url": IMG + "crew-key-visual-960.webp", "width": 960, "height": 540}}, "displayed": True, "custom": True},
        "seoData": {"tags": [{"type": "title", "children": TITLE + " | TZERØ", "custom": True},
                             {"type": "meta", "props": {"name": "description", "content": EXCERPT}, "custom": True}]},
        "richContent": {"nodes": nodes}}
with open(os.path.join(OUT, SLUG + '.json'), 'w', encoding='utf8') as f:
    json.dump(post, f, ensure_ascii=False, indent=1)
print(SLUG)
