// Card pictures for archive posts without a Wix cover: the post's first YouTube video thumbnail, else
// its first picture, else a hand-picked one from PICKS. Writes assets/card-pics.json ({slug: url}),
// which wix.js reads when a card has no cover. Run by hand after re-freezing the archive (no build step):
//   node tools/card-pics.mjs
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const WIX = 'https://static.wixstatic.com/media/';
// Posts with neither a video nor a picture get the story-page picture of their era
const PICKS = {
  'a-channel-for-everyone': WIX + '38ba49_5270e432e42144e49cb1b48b507dbe54~mv2.jpg', // save 06, "logging in"
  'quitting-gacha': WIX + '38ba49_3fb1187529294630925d125a7f7faca8~mv2.png', // save 07, "a card on the desk"
};

const out = {};
const dir = path.join(ROOT, 'post-data');
for (const f of fs.readdirSync(dir).filter(f => f.endsWith('.json')).sort()) {
  const post = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));
  if (post.media && post.media.wixMedia && post.media.wixMedia.image) continue;
  const body = JSON.stringify(post.richContent || {});
  const yt = /(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]{11})/.exec(body);
  const img = /"image":\{"src":\{"id":"([^"]+)"/.exec(body);
  const url = yt ? 'https://i.ytimg.com/vi/' + yt[1] + '/hqdefault.jpg' : img ? WIX + img[1] : PICKS[post.slug];
  if (url) out[post.slug] = url;
  else console.warn('no picture:', post.slug);
}
fs.writeFileSync(path.join(ROOT, 'assets', 'card-pics.json'), JSON.stringify(out, null, 0) + '\n');
console.log(Object.keys(out).length, 'card pictures');
