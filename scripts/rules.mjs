// タイトルから部位・種類（器具）・タグを推定するルール。select（調査）・merge・discover で共通に使う

// 部位
export const PART_RULES = {
  chest: /胸|大胸筋|バストアップ|腕立て|プッシュアップ|ベンチプレス|ディップス|\bchest\b|\bpecs?\b|push[\s-]?ups?|bench press/i,
  back: /背中|背筋|広背筋|僧帽筋|脊柱起立筋|懸垂|チンニング|ラットプル|ローイング|デッドリフト|\bback\b(?! pain)|\blats?\b|pull[\s-]?ups?|chin[\s-]?ups?|\brows?\b|deadlift/i,
  shoulders: /肩|三角筋|ショルダー|サイドレイズ|\bshoulders?\b|\bdelts?\b|lateral raise/i,
  arms: /(?<!二の|凄)腕(?!立|前)|二の腕|二頭|三頭|上腕|力こぶ|前腕|\barms?\b|biceps?|triceps?|forearms?|\bcurls?\b/i,
  abs: /腹筋|腹斜筋|下腹|お腹|おなか|体幹|くびれ|シックスパック|プランク|ウエスト|\babs?\b|\bcore\b|six[\s-]?pack|\bplanks?\b|belly|oblique/i,
  legs: /脚|太もも|もも|ふくらはぎ|下半身|スクワット|ハムストリング|大腿|ランジ|\blegs?\b|thighs?|quads?\b|hamstrings?|calf|calves|squats?\b|lunges?/i,
  glutes: /お尻|尻|臀|ヒップ|\bglutes?\b|\bbutt\b|booty|hip thrusts?/i,
  face: /顔痩せ|顔やせ|小顔|二重あご|二重顎|フェイスライン|表情筋|顔ヨガ|フェイスヨガ|顔筋|ほうれい線|エラ張り|顔の?たるみ|顔の?むくみ|\bface\b(?![\s-]?pulls?)|facial|double chin|jawline|cheeks?\b/i,
  fullbody: /全身|full[\s-]?body|total[\s-]?body/i,
};
// 二の腕は「腕」として拾う（上の否定後読みは「二の腕」を二重に数えないため。「凄腕」「腕前」は部位ではない）

// 種類（器具）。複数当てはまることもある
const EQUIP_RULES = {
  stretch: /ストレッチ|ほぐ|柔軟|ヨガ|整体|肩こり|腰痛|マッサージ|リンパ|stretch|mobility|yoga|flexibility|massage|drainage/i,
  gym: /ジム|マシン|バーベル|ケーブル|スミス|ラットプル|レッグプレス|ベンチプレス|\bgym\b|machines?\b|barbell|cable|lat pull[\s-]?down|leg press|bench press|smith/i,
  dumbbell: /ダンベル|dumbbells?|\bDB\b|kettlebell|ケトルベル/i,
  bodyweight: /自重|自宅|宅トレ|器具なし|器具不要|家で|おうち|部屋|マンション|腕立て|プッシュアップ|懸垂|プランク|no[\s-]?equipment|at[\s-]?home|home workout|bodyweight|calisthenics|push[\s-]?ups?|pull[\s-]?ups?|planks?\b/i,
};
// タイトルに器具が書かれていないときの、チャンネルごとの既定（器具なしの宅トレが中心のチャンネルなど）
export const CHANNEL_EQUIP = {
  bodyweight: [
    'CALISLIFE自重トレ', 'Marina Takewaki', 'のがちゃんねる/nogachannel', 'B-Flow', 'Pamela Reif', 'MadFit', 'growingannanas', 'fitbymik',
    'TIFF x DAN', 'Momomi', 'ひなちゃんねる / Hinata Kato', 'Yuuka Sagawa', 'クライムライフ【Climb Life】', 'シュウジ【自宅にフィットネスを】',
    '脂肪燃焼ちゃん', 'Chloe Ting', 'Juice & Toya', 'Lidia Mera', 'MIZI', 'まめたまの筋トレ日記', '【地球がジム】fitness mate', 'Fit Media Channel',
    'THENX', 'CHRIS HERIA', 'Hybrid Calisthenics', 'トレぴな【脱ムチコ】', '150cmちゃんちー【低身長トレーナー】', '家トレTV', 'Eleni Fit', 'Rowan Row',
  ],
  stretch: ['オガトレ', '前田のまいにちセルフケア !  by GronG', '美筋ヨガチャンネル', 'YUMI TAKAMI /ヨガピラティス専門チャンネル'],
  dumbbell: ['Caroline Girvan', 'Kaleigh Cohen Strength'],
  gym: ['Jeff Nippard', 'Renaissance Periodization', 'ATHLEAN-X™', 'Bodybuilding.com', 'Ryan Humiston', 'NEXT Workout', 'Anabolic Aliens'],
};
const equipByChannel = new Map(Object.entries(CHANNEL_EQUIP).flatMap(([e, chs]) => chs.map((c) => [c, e])));

export function inferEquip(title, channel) {
  title = normalizeTitle(title);
  const hit = Object.entries(EQUIP_RULES).filter(([, re]) => re.test(title)).map(([e]) => e);
  // ストレッチ動画は器具の分類に入れない
  if (hit.includes('stretch')) return ['stretch'];
  // 「ジムでダンベル」のようなものはジムとダンベルの両方。自重は器具の語が無いときだけ
  const tools = hit.filter((e) => e !== 'bodyweight');
  if (tools.length) return tools;
  if (hit.length) return hit;
  const byCh = equipByChannel.get(channel);
  return byCh ? [byCh] : [];
}

// 絞り込み用のタグ
export const TAG_RULES = {
  beginner: /初心者|初級|入門|簡単|かんたん|ゆる|誰でも|beginners?|easy|low[\s-]?impact/i,
  hard: /上級|地獄|鬼|限界|キツ|きつ|追い込|advanced|intense|hardcore|killer/i,
  explain: /解説|フォーム|やり方|方法|コツ|科学|理論|間違|効かせ|ポイント|science|\bform\b|mistakes?|how to|explained|\btips\b|technique|(?-i:NG)/i,
  fatburn: /脂肪燃焼|痩せ|やせ|ダイエット|HIIT|燃焼|有酸素|fat[\s-]?burn|weight[\s-]?loss|calories?|cardio|hiit/i,
  quiet: /マンション|音が出ない|音を立てない|静か|ジャンプなし|ドンドンしない|no[\s-]?jump|quiet|apartment/i,
  women: /女性|女子|レディース|women|girls?\b|female/i,
};

// YouTube のタイトルには濁点が分かれた文字（シ＋゛）や全角英数が混ざるので、判定の前にそろえる
export const normalizeTitle = (title) => title.normalize('NFKC');

// 「No Pushups」「not your thighs」のような否定は部位の判定から外す
const stripNegations = (title) => title.replace(/\b(no|not|without)\s+(your\s+)?[\w-]+/gi, '');

export function partsOf(title) {
  const t = stripNegations(normalizeTitle(title));
  const hit = Object.entries(PART_RULES).filter(([, re]) => re.test(t)).map(([p]) => p);
  // 全身と書いてあるか、3 部位以上にまたがるものは「全身」にまとめる（顔は体とは別に数える）
  const body = hit.filter((p) => p !== 'face');
  if (hit.includes('fullbody') || body.length >= 3) return ['fullbody'];
  return hit;
}
