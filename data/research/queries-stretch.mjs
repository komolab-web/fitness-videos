// ストレッチ（特にデスクワークの人向け）の追加収集で使った検索クエリ（2026-09-27）
const ja = [
  'デスクワーク ストレッチ', '座ったまま ストレッチ', '椅子 ストレッチ', '仕事中 ストレッチ', 'テレワーク ストレッチ',
  '肩こり ストレッチ', '首こり ストレッチ', 'ストレートネック 改善', 'スマホ首 ストレッチ', '巻き肩 改善 ストレッチ',
  '猫背 改善 ストレッチ', '腰痛 ストレッチ', '反り腰 改善', '股関節 ストレッチ', '腸腰筋 ストレッチ',
  '背中 ストレッチ', '肩甲骨 ストレッチ', '寝る前 ストレッチ', '朝 ストレッチ', '全身 ストレッチ 10分', '眼精疲労 ストレッチ 首',
];
const en = [
  'desk stretches', 'office stretches at work', 'chair stretches', 'neck pain stretches', 'tech neck exercises',
  'posture correction exercises', 'lower back pain stretches', 'hip flexor stretches', 'bedtime stretch', 'morning stretch routine',
];
export const queries = [...ja.map((q) => ({ part: 'stretch', lang: 'ja', q })), ...en.map((q) => ({ part: 'stretch', lang: 'en', q }))];
