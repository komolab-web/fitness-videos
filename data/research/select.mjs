// 調査で集めた検索結果（raw*.jsonl）から収録する動画を選び、data/sources/search.json を作る
// 使い方: node data/research/select.mjs
import { readFile, writeFile } from 'node:fs/promises';
import { partsOf, inferEquip } from '../../scripts/rules.mjs';
const oembed = JSON.parse(await readFile(new URL('oembed.json', import.meta.url), 'utf8'));

const TODAY = new Date('2026-09-27');
const MIN_VIEWS = { ja: 30_000, en: 150_000 };
const EXCLUDE = /食事|プロテイン|サプリ|レシピ|what i eat|meal|recipe|vlog|ドッキリ|反応|リアクション|手術|ランキング|\breacts?\b|supplement/i;

const rows = [];
for (const f of ['raw.jsonl', 'raw2.jsonl'])
  rows.push(...(await readFile(new URL(f, import.meta.url), 'utf8')).trim().split('\n').map((l) => JSON.parse(l)));

// 「6 年前」→ おおよその年月（YYYY-MM）
function approxDate(rel) {
  const m = rel.replace(/\s/g, '').match(/(\d+)(年|か月|週間|日|時間)前/);
  const d = new Date(TODAY);
  if (m) {
    const n = Number(m[1]);
    if (m[2] === '年') d.setFullYear(d.getFullYear() - n);
    else if (m[2] === 'か月') d.setMonth(d.getMonth() - n);
    else if (m[2] === '週間') d.setDate(d.getDate() - n * 7);
    else if (m[2] === '日') d.setDate(d.getDate() - n);
  }
  return d.toISOString().slice(0, 7);
}


// フィットネスの解説・メニューではないチャンネル（エンタメ・切り抜き・雑学・モチベーション動画など）
const EXCLUDE_CHANNELS = /はじめしゃちょー|青春がーどまん|ぷろたん日記|雑学|切り抜き|Clips$|Motivation|BroScienceLife|PIVOT|世界の筋肉|Virtual Hand Care|fitness in gym/i;

const byId = new Map();
for (const r of rows) {
  if (byId.has(r.id)) continue;
  // タイトル・チャンネル名は oEmbed の正式なもの（検索結果は自動翻訳されていることがある）
  const o = oembed[r.id];
  if (!o?.ok) continue;
  r.title = o.title;
  r.channel = o.channel;
  const lang = /[ぁ-んァ-ヶ一-龠]/.test(r.title) ? 'ja' : 'en';
  if (EXCLUDE_CHANNELS.test(r.channel)) continue;
  if (r.views < MIN_VIEWS[lang] || EXCLUDE.test(r.title) || !r.duration || r.duration > 90 * 60) continue;
  const parts = partsOf(r.title);
  if (!parts.length) continue;
  byId.set(r.id, {
    youtubeId: r.id,
    title: r.title,
    channel: r.channel,
    channelId: r.channelId,
    lang,
    parts,
    equip: inferEquip(r.title, r.channel),
    short: o.short || undefined,
    duration: r.duration,
    views: r.views,
    date: approxDate(r.published),
  });
}
const list = [...byId.values()].sort((a, b) => b.views - a.views);
await writeFile(new URL('../sources/search.json', import.meta.url), JSON.stringify(list, null, 1) + '\n');
const count = {};
for (const v of list) for (const p of v.parts) count[p] = (count[p] ?? 0) + 1;
const eq = {};
for (const v of list) for (const e of v.equip.length ? v.equip : ['(none)']) eq[e] = (eq[e] ?? 0) + 1;
console.log(list.length, count, eq, 'ja', list.filter((v) => v.lang === 'ja').length);
