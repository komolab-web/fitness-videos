// 登録チャンネル（data/channels.json）の RSS から新着の動画を探し、data/sources/auto.json に追記する。
// RSS は各チャンネルの最新 15 本（API キー不要）。タイトルから部位が分かり、埋め込み可能なものだけ採用する。
// 長さは検索結果から（動画ページや player API は bot 判定で取れないことが多いため）、再生数は RSS の media:statistics から取る。
// ショートは検索結果に長さが出ないので 0（不明）のままにする。
// 使い方: node scripts/discover-videos.mjs  → その後 npm run merge
import { readdir, readFile, writeFile } from 'node:fs/promises';
import { partsOf, inferEquip } from './rules.mjs';
import { search } from './search-youtube.mjs';

const root = new URL('../data/', import.meta.url);
const channels = JSON.parse(await readFile(new URL('channels.json', root), 'utf8'));
const autoPath = new URL('sources/auto.json', root);
const auto = JSON.parse(await readFile(autoPath, 'utf8').catch(() => '[]'));
const EXCLUDE = /食事|プロテイン|サプリ|レシピ|what i eat|meal|recipe|vlog|ドッキリ|反応|リアクション|\breacts?\b|supplement|Q&A|質問コーナー|ライブ配信|live stream/i;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// 収録済みの動画 ID
const known = new Set();
for (const file of (await readdir(new URL('sources/', root))).filter((f) => f.endsWith('.json')))
  for (const e of JSON.parse(await readFile(new URL(`sources/${file}`, root), 'utf8'))) known.add(e.youtubeId);

const decode = (s) => s.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'");
async function feed(channelId) {
  const res = await fetch(`https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`, { signal: AbortSignal.timeout(15000) });
  if (!res.ok) throw new Error(`${channelId}: RSS ${res.status}`);
  const xml = await res.text();
  return [...xml.matchAll(/<entry>([\s\S]*?)<\/entry>/g)].map(([, e]) => ({
    id: e.match(/<yt:videoId>([^<]+)/)[1],
    title: decode(e.match(/<title>([^<]*)/)[1]),
    published: e.match(/<published>([^<]+)/)[1],
    views: Number(e.match(/views="(\d+)"/)?.[1] ?? 0),
  }));
}
async function oembed(id) {
  const url = `https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(`https://www.youtube.com/shorts/${id}`)}`;
  const res = await fetch(url, { signal: AbortSignal.timeout(15000) });
  return res.ok ? res.json() : null;
}
async function duration(id, title) {
  const hit = (await search(`"${title}"`)).find((v) => v.id === id);
  return hit?.duration ?? 0;
}

const added = [];
for (const [i, ch] of channels.entries()) {
  console.log(`[${i + 1}/${channels.length}] ${ch.name}`);
  let items;
  try {
    items = await feed(ch.id);
  } catch (e) {
    console.warn(`${ch.name}: ${e.message}`);
    continue;
  }
  for (const it of items) {
    if (known.has(it.id) || EXCLUDE.test(it.title)) continue;
    const parts = partsOf(it.title);
    if (!parts.length) continue;
    const o = await oembed(it.id).catch(() => null);
    if (!o) continue; // 埋め込み不可・非公開
    const short = o.height > o.width;
    const sec = short ? 0 : await duration(it.id, o.title).catch(() => 0);
    if (!short && (!sec || sec > 90 * 60)) continue; // 長さが分からないもの・配信のアーカイブなど
    known.add(it.id);
    added.push({
      youtubeId: it.id,
      title: o.title,
      channel: o.author_name,
      channelId: ch.id,
      lang: ch.lang,
      parts,
      equip: inferEquip(o.title, o.author_name),
      ...(short ? { short: true } : {}),
      duration: sec,
      views: it.views,
      date: it.published.slice(0, 7),
      addedAt: new Date().toISOString().slice(0, 10),
    });
    await sleep(300);
  }
}
if (added.length) await writeFile(autoPath, JSON.stringify([...auto, ...added], null, 1) + '\n');
console.log(`新着: ${added.length} 本（${channels.length} チャンネルを確認）`);
for (const v of added) console.log(`  [${v.parts.join(',')}] ${v.title}  / ${v.channel}`);
