// data/videos.json の全動画を YouTube oEmbed で確認し、削除・非公開・埋め込み不可になったものを報告する。
// 使い方: node scripts/verify-videos.mjs [--prune]
//   --prune を付けると、見つからなかったものを data/sources/*.json から取り除く（その後 npm run merge）。
import { readdir, readFile, writeFile } from 'node:fs/promises';

const root = new URL('../data/', import.meta.url);
const videos = JSON.parse(await readFile(new URL('videos.json', root), 'utf8'));
const prune = process.argv.includes('--prune');
const CONCURRENCY = 6;

async function alive(id) {
  const url = `https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(`https://www.youtube.com/watch?v=${id}`)}`;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(15000) });
      if (res.ok) return true;
      // 401/403/404 は埋め込み不可・非公開・削除
      if ([400, 401, 403, 404].includes(res.status)) return false;
    } catch {}
    await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)));
  }
  throw new Error(`${id}: oEmbed に接続できません`);
}

const dead = [];
let next = 0;
await Promise.all(
  Array.from({ length: CONCURRENCY }, async () => {
    while (next < videos.length) {
      const v = videos[next++];
      if (!(await alive(v.id))) dead.push(v);
    }
  }),
);
console.log(`動画: ${videos.length} 本 / 見つからない: ${dead.length} 本`);
for (const v of dead) console.log(`  ${v.id}  ${v.title}`);

// 一度に大量に消えるのは通信側の問題（アクセス制限など）の可能性が高いので、削除せずに止める
const limit = Math.max(10, Math.ceil(videos.length * 0.03));
if (prune && dead.length > limit) {
  console.error(`見つからないものが多すぎます（${dead.length} 本 > ${limit} 本）。安全のため削除しません。`);
  process.exit(1);
}
if (prune && dead.length) {
  const deadIds = new Set(dead.map((v) => v.id));
  for (const file of (await readdir(new URL('sources/', root))).filter((f) => f.endsWith('.json'))) {
    const path = new URL(`sources/${file}`, root);
    const entries = JSON.parse(await readFile(path, 'utf8'));
    const kept = entries.filter((e) => !deadIds.has(e.youtubeId));
    if (kept.length !== entries.length) await writeFile(path, JSON.stringify(kept, null, 1) + '\n');
  }
  console.log('sources から削除しました。npm run merge で videos.json を再生成してください。');
}
process.exitCode = dead.length && !prune ? 1 : 0;
