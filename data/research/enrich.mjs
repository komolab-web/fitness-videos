// 候補の全動画を YouTube oEmbed で調べ、正式なタイトル・チャンネル名と、埋め込み可否・ショートかどうかを記録する
// （検索結果のタイトルは hl=ja だと自動翻訳されていることがあるため）
import { readFile, writeFile } from 'node:fs/promises';
const cachePath = new URL('oembed.json', import.meta.url);
const cache = JSON.parse(await readFile(cachePath, 'utf8').catch(() => '{}'));
const rows = [];
for (const f of ['raw.jsonl', 'raw2.jsonl'])
  rows.push(...(await readFile(new URL(f, import.meta.url), 'utf8')).trim().split('\n').map((l) => JSON.parse(l)));
const ids = [...new Set(rows.map((r) => r.id))].filter((id) => !cache[id]);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function oembed(path) {
  const url = `https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(`https://www.youtube.com/${path}`)}`;
  for (let t = 0; t < 4; t++) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(15000) });
      if (res.ok) return res.json();
      if ([400, 401, 403, 404].includes(res.status)) return null;
    } catch {}
    await sleep(1500 * (t + 1));
  }
  throw new Error(`${path}: oEmbed に接続できません`);
}
let next = 0, done = 0;
await Promise.all(Array.from({ length: 4 }, async () => {
  while (next < ids.length) {
    const id = ids[next++];
    try {
      const o = await oembed(`shorts/${id}`);
      cache[id] = o ? { ok: true, title: o.title, channel: o.author_name, short: o.height > o.width } : { ok: false };
    } catch (e) { console.error(e.message); }
    if (++done % 200 === 0) { console.log(done, '/', ids.length); await writeFile(cachePath, JSON.stringify(cache)); }
  }
}));
await writeFile(cachePath, JSON.stringify(cache));
const vals = Object.values(cache);
console.log('total', vals.length, 'ok', vals.filter((v) => v.ok).length, 'short', vals.filter((v) => v.short).length);
