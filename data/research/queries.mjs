// 調査用の検索クエリ（部位 × 器具・目的 × 言語）
export const PARTS = {
  chest: { ja: ['胸筋', '大胸筋'], en: 'chest' },
  back: { ja: ['背中', '広背筋'], en: 'back' },
  shoulders: { ja: ['肩', '三角筋'], en: 'shoulder' },
  arms: { ja: ['腕', '二の腕'], en: 'arm' },
  abs: { ja: ['腹筋', '体幹'], en: 'abs' },
  legs: { ja: ['脚', '太もも'], en: 'leg' },
  glutes: { ja: ['お尻', '大臀筋'], en: 'glute' },
  fullbody: { ja: ['全身', '全身 脂肪燃焼'], en: 'full body' },
};
export const queries = [];
for (const [part, { ja, en }] of Object.entries(PARTS)) {
  const [a, b] = ja;
  for (const q of [`${a} 筋トレ 自宅`, `${a} 筋トレ ダンベル`, `${a} 筋トレ ジム`, `${b} トレーニング 初心者`, `${a} 宅トレ 女性`, `${a} ストレッチ`, `${b} 筋トレ 解説`])
    queries.push({ part, lang: 'ja', q });
  for (const q of [`${en} workout at home no equipment`, `${en} workout dumbbell`, `${en} workout gym`, `best ${en} exercises science`, `${en} workout for women`])
    queries.push({ part, lang: 'en', q });
}
