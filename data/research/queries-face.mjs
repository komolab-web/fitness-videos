// 顔（顔痩せ・小顔）の追加収集で使った検索クエリ（2026-09-27）
const ja = [
  '顔痩せ', '顔痩せ トレーニング', '顔痩せ 1週間', '顔痩せ 男', '小顔 トレーニング', '小顔 マッサージ', '小顔 ストレッチ',
  '二重あご 解消', '二重顎 トレーニング', 'フェイスライン 引き締め', '表情筋 トレーニング', '顔ヨガ', 'フェイスヨガ',
  '顔 むくみ 解消 マッサージ', 'ほうれい線 表情筋', 'エラ張り 解消', '首 ストレッチ 小顔', '顔のたるみ 解消 トレーニング',
];
const en = [
  'face yoga', 'face fat loss exercise', 'double chin exercise', 'jawline exercise', 'facial exercises slim face',
  'lymphatic drainage face massage', 'face lifting exercises', 'lose face fat', 'face workout',
];
export const queries = [...ja.map((q) => ({ part: 'face', lang: 'ja', q })), ...en.map((q) => ({ part: 'face', lang: 'en', q }))];
