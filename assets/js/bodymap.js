// 人体図（前面・背面）の SVG。部位ごとの図形に data-part を付け、クリックで部位を選べるようにする
const W = 120; // 1 体ぶんの幅（viewBox）
// 左半身の図形を右半身に写す
const mirror = (x, w) => W - x - w;

const rect = (part, x, y, w, h, r, label) =>
  `<rect class="${part ? 'muscle' : 'body'}" ${part ? `data-part="${part}"` : ''} x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}">${label ? `<title>${label}</title>` : ''}</rect>`;
const pair = (part, x, y, w, h, r, label) => rect(part, x, y, w, h, r, label) + rect(part, mirror(x, w), y, w, h, r, label);
const ellipse = (part, cx, cy, rx, ry, label) =>
  `<ellipse class="${part ? 'muscle' : 'body'}" ${part ? `data-part="${part}"` : ''} cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}">${label ? `<title>${label}</title>` : ''}</ellipse>`;
const ellipsePair = (part, cx, cy, rx, ry, label) => ellipse(part, cx, cy, rx, ry, label) + ellipse(part, W - cx, cy, rx, ry, label);
const path = (part, d, label) =>
  `<path class="${part ? 'muscle' : 'body'}" ${part ? `data-part="${part}"` : ''} d="${d}">${label ? `<title>${label}</title>` : ''}</path>`;

// 頭・首・手・足など、部位に当たらないところ
const base = () =>
  [
    ellipse('', 60, 19, 12, 14),
    rect('', 54, 31, 12, 10, 3),
    ellipsePair('', 23, 136, 5, 6),
    rect('', 44, 108, 32, 18, 6),
    pair('', 42, 222, 14, 8, 4),
  ].join('');

const front = () =>
  [
    base(),
    ellipsePair('shoulders', 35, 50, 11, 9, '肩（三角筋）'),
    pair('chest', 41, 43, 18, 22, 6, '胸（大胸筋）'),
    rect('abs', 45, 68, 30, 38, 7, '腹筋・体幹'),
    // 腹筋の割れ目（飾り）
    `<path class="abs-lines" d="M60 70v34M47 80h26M47 92h26"/>`,
    pair('arms', 21, 58, 12, 34, 6, '腕（上腕二頭筋）'),
    pair('arms', 16, 95, 12, 34, 6, '腕（前腕）'),
    pair('legs', 41, 124, 18, 54, 8, '脚（大腿四頭筋）'),
    pair('legs', 43, 182, 14, 38, 7, '脚（すね・ふくらはぎ）'),
  ].join('');

const back = () =>
  [
    base(),
    path('back', 'M50 33h20l12 12H38Z', '背中（僧帽筋）'),
    ellipsePair('shoulders', 35, 50, 11, 9, '肩（三角筋後部）'),
    path('back', 'M40 47h40l-3 34-8 24H51l-8-24Z', '背中（広背筋・脊柱起立筋）'),
    `<path class="abs-lines" d="M60 49v54"/>`,
    pair('arms', 21, 58, 12, 34, 6, '腕（上腕三頭筋・二の腕）'),
    pair('arms', 16, 95, 12, 34, 6, '腕（前腕）'),
    ellipsePair('glutes', 51, 120, 10, 12, 'お尻（大臀筋）'),
    pair('legs', 41, 134, 18, 44, 8, '脚（ハムストリング）'),
    pair('legs', 43, 182, 14, 38, 7, '脚（ふくらはぎ）'),
  ].join('');

export function bodyMapSvg() {
  const figure = (label, inner) =>
    `<figure class="bodymap-figure">
      <svg viewBox="0 0 ${W} 232" role="img" aria-label="人体図（${label}）">${inner}</svg>
      <figcaption>${label}</figcaption>
    </figure>`;
  return figure('前', front()) + figure('後ろ', back());
}
