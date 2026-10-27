# Makes the round character tokens for the hunt (assets/img/caw/token/<id>.png) from the GPT banners.
# FACE = where the face sits in each banner (x, y, radius as fractions of the banner width). No banner yet: a plain badge.
import json, os
from PIL import Image, ImageDraw, ImageFont
R = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FACE = {'miriam': (.733, .14, .1), 'agata': (.667, .155, .1), 'free': (.743, .068, .07), 'kristoph': (.736, .075, .075), 'nero': (.772, .245, .075), 'prima': (.664, .204, .08), 'aqua': (.75, .169, .075), 'vesper': (.65, .13, .085), 'bianca': (.745, .11, .07), 'norman': (.636, .09, .07), 'elise': (.729, .16, .07), 'ache': (.693, .3, .11)}
D = json.load(open(R + '/assets/caw.json'))
out = R + '/assets/img/caw/token/'; os.makedirs(out, exist_ok=True)
S = 184
def ring(im, col):
    m = Image.new('L', (S, S), 0); ImageDraw.Draw(m).ellipse((6, 6, S - 6, S - 6), fill=255)
    t = Image.new('RGBA', (S, S), (0, 0, 0, 0)); d = ImageDraw.Draw(t)
    d.ellipse((0, 0, S - 1, S - 1), fill=col); t.paste(im, (0, 0), m); d.ellipse((6, 6, S - 6, S - 6), outline=(255, 255, 255, 255), width=5)
    return t
for it in D['items']:
    col = D['worlds'][it['world']]['color']
    b = R + '/assets/img/caw/banner/' + it['id'] + '.webp'
    if it['id'] in FACE and os.path.exists(b):
        im = Image.open(b).convert('RGB'); w, h = im.size; x, y, r = FACE[it['id']]
        cx, cy, rr = x * w, y * h + r * w * .35, r * w
        face = im.crop((int(cx - rr), int(cy - rr), int(cx + rr), int(cy + rr))).resize((S, S), Image.LANCZOS)
    else:
        face = Image.new('RGB', (S, S), '#13224b'); d = ImageDraw.Draw(face)
        try: f = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', 84)
        except Exception: f = ImageFont.load_default()
        ch = it['name'][0]; tw = d.textlength(ch, font=f); d.text(((S - tw) / 2, 38), ch, fill='#faf8f3', font=f)
    ring(face, col).save(out + it['id'] + '.png', optimize=True)
print('ok')
