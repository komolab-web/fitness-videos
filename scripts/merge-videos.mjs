// data/sources/*.json を統合して data/videos.json を生成する。
// 同じ動画が複数のファイルにあれば 1 件にまとめる（部位・種類・タグは足し合わせ、数値は後のファイルの値で上書き）。
// 部位・種類を書いていないものはタイトルから推定し、タグはタイトルから推定したものに sources の "tags" を足す。
// 使い方: node scripts/merge-videos.mjs
import { readdir, readFile, writeFile } from 'node:fs/promises';
import { TAG_RULES, partsOf, inferEquip, normalizeTitle } from './rules.mjs';

const root = new URL('../data/', import.meta.url);
const meta = JSON.parse(await readFile(new URL('meta.json', root), 'utf8'));
const partSlugs = new Set(meta.parts.map((p) => p.slug));
const equipSlugs = new Set(meta.equips.map((e) => e.slug));
const tagSlugs = new Set(Object.keys(TAG_RULES));
const union = (a = [], b = []) => [...new Set([...a, ...b])];

const byId = new Map();
const files = (await readdir(new URL('sources/', root))).filter((f) => f.endsWith('.json')).sort();
for (const file of files) {
  const entries = JSON.parse(await readFile(new URL(`sources/${file}`, root), 'utf8'));
  for (const e of entries) {
    if (!/^[\w-]{11}$/.test(e.youtubeId)) throw new Error(`${file}: 不正な動画ID ${e.youtubeId}`);
    const parts = e.parts ?? partsOf(e.title);
    const equip = e.equip ?? inferEquip(e.title, e.channel);
    for (const p of parts) if (!partSlugs.has(p)) throw new Error(`${file}: 未知の部位 ${p}（${e.youtubeId}）`);
    for (const q of equip) if (!equipSlugs.has(q)) throw new Error(`${file}: 未知の種類 ${q}（${e.youtubeId}）`);
    for (const t of e.tags ?? []) if (!tagSlugs.has(t)) throw new Error(`${file}: 未知のタグ ${t}（${e.youtubeId}）`);
    if (!parts.length) {
      console.warn(`部位が決まらないのでスキップ: ${e.youtubeId} ${e.title}`);
      continue;
    }
    const prev = byId.get(e.youtubeId);
    byId.set(e.youtubeId, {
      id: e.youtubeId,
      // 濁点が分かれた文字のままだとサイト内の検索に引っかからないので、表示用にもそろえておく
      title: e.title.normalize('NFC'),
      channel: e.channel,
      lang: e.lang,
      parts: union(prev?.parts, parts),
      equip: union(prev?.equip, equip),
      short: Boolean(prev?.short || e.short),
      duration: e.duration ?? prev?.duration ?? 0,
      views: e.views ?? prev?.views ?? 0,
      date: e.date ?? prev?.date ?? '',
      extraTags: union(prev?.extraTags, e.tags),
    });
  }
}

const videos = [...byId.values()]
  .map(({ extraTags, ...v }) => ({
    ...v,
    tags: Object.entries(TAG_RULES)
      .filter(([tag, re]) => re.test(normalizeTitle(v.title)) || extraTags.includes(tag))
      .map(([tag]) => tag),
  }))
  .sort((a, b) => b.views - a.views);

// 1 行 1 本で書き出す（差分が見やすく、ファイルも小さい）
await writeFile(new URL('videos.json', root), `[\n${videos.map((v) => JSON.stringify(v)).join(',\n')}\n]\n`);
const count = Object.fromEntries(meta.parts.map((p) => [p.name, videos.filter((v) => v.parts.includes(p.slug)).length]));
console.log(`videos.json: ${videos.length} 本（${files.length} ファイルから）`, count);
