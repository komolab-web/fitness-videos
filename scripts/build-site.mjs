// 公開用ファイルを _site/ にまとめる。使い方: node scripts/build-site.mjs（BASE_PATH で置き場所を指定、既定は /）
import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';

const base = `/${(process.env.BASE_PATH ?? '/').replace(/^\/+|\/+$/g, '')}/`.replace('//', '/');
const out = new URL('../_site/', import.meta.url);
const src = (p) => new URL(`../${p}`, import.meta.url);

await rm(out, { recursive: true, force: true });
await mkdir(new URL('data/', out), { recursive: true });
await cp(src('assets'), new URL('assets', out), { recursive: true });
for (const f of ['meta.json', 'videos.json']) await cp(src(`data/${f}`), new URL(`data/${f}`, out));

const html = (await readFile(src('index.html'), 'utf8')).replace('<base href="/">', `<base href="${base}">`);
await writeFile(new URL('index.html', out), html);
// GitHub Pages は存在しない URL に 404.html を返すので、/chest/dumbbell のようなページも index.html と同じ中身にしておく
await writeFile(new URL('404.html', out), html);
await writeFile(new URL('.nojekyll', out), '');

// サイトマップと robots.txt。正規 URL は Vercel 側（index.html の canonical と同じ）
const SITE_URL = 'https://fitness-videos.vercel.app/';
const meta = JSON.parse(await readFile(src('data/meta.json'), 'utf8'));
const paths = ['', ...meta.parts.map((p) => p.slug), 'channels', 'desk', 'shorts'];
const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${paths.map((p) => `  <url><loc>${SITE_URL}${p}</loc>${meta.updatedAt ? `<lastmod>${meta.updatedAt}</lastmod>` : ''}</url>`).join('\n')}
</urlset>
`;
await writeFile(new URL('sitemap.xml', out), sitemap);
await writeFile(new URL('robots.txt', out), `User-agent: *\nAllow: /\n\nSitemap: ${SITE_URL}sitemap.xml\n`);
console.log(`_site/ を作成しました（base: ${base}）`);
