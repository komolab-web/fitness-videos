# MUSCLE MAP｜部位別トレーニング動画まとめ

YouTube の筋トレ・ストレッチ動画を、**鍛えたい部位別**に探せる静的サイトです。

- 顔・胸・背中・肩・腕・腹筋/体幹・脚・お尻・全身の 9 部位。**人体図（前・後ろ）をタップ**するか、ボタンで選べます（顔は前面の頭）
- 2 段目で種類（自重／ダンベル／ジム／ストレッチ）を選べます
- 「初心者・ハード・解説・脂肪燃焼・静かにできる・女性向け」のタグ、長さ（〜5 分／5〜15 分／15〜30 分／30 分〜）、言語、キーワードで絞り込めます
- 並び順: 人気順（再生数）／新しい順／短い順／長い順
- 「チャンネル別」「ショート」の特集タブ
- 動画はサイト内のモーダルで再生（再生が始まらないときは「YouTube で開く」を案内。最初から YouTube で開くようにも切り替え可）
- URL は `/chest/dumbbell`、`/shorts/abs`、`/channels/glutes?c=MadFit` のように表示状態を持つので、そのまま共有できます
- 見る人の多くが女性なので、黒を使わないポップなデザイン（水玉の背景、部位ごとの色、丸い書体）。部位の色は `assets/css/style.css` の `[data-part]` で決めています。ダークは切り替えボタンを押したときだけ（端末の設定では切り替えない）。スマホ対応

調査の内容（どんな動画があるか、分類の考え方）は [docs/RESEARCH.md](docs/RESEARCH.md) にまとめています。

## 使い方

```sh
npm run dev   # http://localhost:5173 で起動（依存パッケージなし。PORT で変更可）
```

`fetch` で JSON を読むため、`index.html` を直接開くのではなく HTTP サーバー経由で表示してください。

## 公開

main に push すると次の 2 か所に自動で公開されます。どちらも `npm run build`（`scripts/build-site.mjs`）で公開用ファイルだけを `_site/` にまとめています。

- **GitHub Pages**：https://komolab-web.github.io/fitness-videos/（`.github/workflows/pages.yml`）。サイトが `/fitness-videos/` の下に置かれるので、`BASE_PATH=/fitness-videos/` でビルドして `index.html` の `<base>` を書き換えます。`/chest` のような URL は `404.html`（`index.html` と同じ中身）で表示します。
- **Vercel**：https://fitness-videos.vercel.app/（`vercel.json`）。`/chest` のような URL は rewrites で `index.html` に振り向けています。

ページ内のパスは `<base>` からの相対パスで書いてください（`/assets/...` のような絶対パスにしない）。

## データの更新

| コマンド | 内容 |
|---|---|
| `npm run merge` | `data/sources/*.json` を統合・重複除去し、部位・種類・タグをタイトルから推定して `data/videos.json` を生成 |
| `npm run discover` | 登録チャンネル（`data/channels.json`）の RSS から新着を探し `data/sources/auto.json` に追記（その後 `npm run merge`） |
| `npm run verify` | 全動画を YouTube oEmbed で確認し、削除・非公開のものを報告（`-- --prune` で sources から削除） |
| `npm run search -- "腹筋 10分"` | YouTube 検索の結果を JSON Lines で出す（手で動画を探すとき用） |

### 動画を手で追加する

`data/sources/manual.json`（無ければ作る）に追記して `npm run merge` を実行します。

```json
[
  { "youtubeId": "XXXXXXXXXXX", "title": "動画タイトル", "channel": "チャンネル名", "lang": "ja", "duration": 600, "views": 120000, "date": "2026-09" }
]
```

- `parts`（部位）・`equip`（種類）を省くとタイトルから推定します。明示するときは `data/meta.json` の slug（例: `"parts": ["abs"]`, `"equip": ["dumbbell"]`）
- タイトルから推定できないタグは `"tags": ["beginner"]` のように足せます
- ショート動画は `"short": true`

### 分類ルール

[scripts/rules.mjs](scripts/rules.mjs) にまとまっています（部位・種類・タグの正規表現と、タイトルに器具が無いときのチャンネルごとの既定）。ルールを変えたら `npm run merge` で反映されます。

### 最初の収集をやり直す

```sh
node data/research/collect.mjs ./queries.mjs raw.jsonl     # 検索（1 回目のクエリ）
node data/research/collect.mjs ./queries2.mjs raw2.jsonl   # 検索（2 回目のクエリ）
node data/research/collect.mjs ./queries-face.mjs raw-face.jsonl  # 検索（顔痩せ・小顔の追加分）
node data/research/enrich.mjs                              # oEmbed で正式なタイトル・ショート判定
node data/research/select.mjs                              # 基準で選んで data/sources/search.json を作る
npm run merge
```

## 構成

```
index.html              ページ本体
assets/css/style.css    スタイル
assets/js/main.js       データを読み込んで app.js を起動
assets/js/app.js        タブ・絞り込み・プレイヤー・ルーティング
assets/js/bodymap.js    人体図の SVG
data/meta.json          部位・種類・タグの定義（手で編集）
data/channels.json      新着を見に行くチャンネル
data/videos.json        動画一覧（生成物）
data/sources/*.json     動画の元データ（ここを編集する）
data/research/          最初の調査で使ったクエリ・生データ・選定スクリプト
scripts/                データ生成・検証・ビルド・開発サーバー
.github/workflows/      GitHub Pages への公開
docs/RESEARCH.md        調査メモ
```

## 注意

動画の権利は各投稿者に帰属します。再生数・投稿年は収集時点の値です（投稿年は検索結果の「◯年前」からの概算）。
