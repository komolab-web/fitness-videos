// YouTube の検索結果ページから動画を集める（API キー不要）。調査・収集用。
// 使い方: node scripts/search-youtube.mjs "胸筋 筋トレ 自宅" [...クエリ]  → JSON Lines を標準出力へ
//   出力: { query, id, title, channel, channelId, duration(秒), views, published }
const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130 Safari/537.36';

const toSec = (t = '') => t.split(':').reduce((s, n) => s * 60 + Number(n), 0);
const toViews = (t = '') => Number(t.replace(/[^\d]/g, '')) || 0;
const text = (o) => o?.simpleText ?? o?.runs?.map((r) => r.text).join('') ?? '';

function* walk(node) {
  if (!node || typeof node !== 'object') return;
  if (node.videoRenderer) yield node.videoRenderer;
  for (const v of Object.values(node)) yield* walk(v);
}

export async function search(query) {
  const url = `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}&hl=ja&gl=JP`;
  const html = await (await fetch(url, { headers: { 'User-Agent': UA, 'Accept-Language': 'ja-JP,ja;q=0.9' }, signal: AbortSignal.timeout(20000) })).text();
  const m = html.match(/var ytInitialData = (\{.*?\});<\/script>/s);
  if (!m) throw new Error(`${query}: ytInitialData が見つかりません`);
  const out = [];
  for (const r of walk(JSON.parse(m[1]))) {
    out.push({
      query,
      id: r.videoId,
      title: text(r.title),
      channel: text(r.ownerText),
      channelId: r.ownerText?.runs?.[0]?.navigationEndpoint?.browseEndpoint?.browseId ?? '',
      duration: toSec(text(r.lengthText)),
      views: toViews(text(r.viewCountText)),
      published: text(r.publishedTimeText),
    });
  }
  return out;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  for (const q of process.argv.slice(2)) {
    for (const v of await search(q)) console.log(JSON.stringify(v));
    await new Promise((r) => setTimeout(r, 800));
  }
}
