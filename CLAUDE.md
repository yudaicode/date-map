# デートマップ（date-map）

SNS（Instagram / TikTok）で見つけた**東京23区のデートスポット**を、地図とフィルタで探せるWebアプリ。
最終目標は「旅行版の食べログ」。本リポジトリはその第一歩として東京23区のデートスポットに限定する。

- 開発者: 1名（オーナー＝管理者）。**プログラミング未経験**のため、専門用語は短く補足して説明する
- 解決したい課題: SNSのデートスポット情報は有用だが、場所の把握と条件での絞り込みが難しい
- 第一段階の目標: **Z世代がInstagram/TikTokで探しているデートスポットを、もっと探しやすくする**
  （詳細は下の「コンテンツ戦略」）

---

## 技術スタック（決定事項）

| 領域 | 採用 | 決定理由 |
|---|---|---|
| フレームワーク | Next.js 16.4.2（App Router / TypeScript） | 画面とサーバー処理を1つで書ける |
| スタイル | Tailwind CSS v4 | `next.config.ts` の turbopack ルール経由で読み込む（`postcss.config` は無い） |
| 地図ライブラリ | MapLibre GL JS v6 | オープンソース・無料。配信元を後から差し替えられる |
| 地図タイル | OpenFreeMap（`tiles.openfreemap.org`） | **APIキー・クレカ登録 不要／無料**。乗り換え先候補は MapTiler（月10万タイル無料） |
| ジオコーディング | **国土地理院 住所検索API** | 無料・キー不要・日本の住所に強い。CORS非対応のため `/api/geocode` で中継する |
| DB / 認証 | Supabase（`@supabase/supabase-js` のみ。`@supabase/ssr` は使わない） | iOS版（Expo）からも同じDBを使い回せる |
| 公開 | Vercel（Hobby / 無料） | Next.js と相性が良く無料枠で足りる |

### 実装上の重要な注意点
- **MapLibre v6 には default export が無い。** `import maplibregl from 'maplibre-gl'` は動かない。
  正: `import { MapLibreMap, Marker, Popup, NavigationControl } from 'maplibre-gl'`
  （`Map` は JavaScript 標準の `Map` と名前が衝突するため、別名の `MapLibreMap` を使う）
- **MapLibre v6 のワーカーは Next.js 上では自動で読み込めない。**
  v6 は `import.meta.url` からワーカーの場所を逆算するが、Next.js がバンドルすると
  この値が http(s) URL でなくなり、空文字が返って
  `Worker failed to load. Check that the worker URL is correct.` となる。
  対処: `scripts/copy-maplibre-worker.mjs` で `maplibre-gl-worker.mjs` を
  `public/maplibre/maplibre-gl-worker.js` にコピーし、`setWorkerUrl()` で明示指定する。
  コピーは postinstall / predev / prebuild で自動実行。**この仕組みを外すと地図が壊れる。**
  （`.mjs` ではなく `.js` でコピーするのは、JavaScript の MIME タイプで確実に配信するため）
- 地図のラベルは `applyJapaneseLabels()` で日本語優先に上書きしている。
  OpenFreeMap 標準スタイルは英語混じりのため。国道番号など `name` 以外を使う
  レイヤーは除外している（除外しないと番号が消える）。
- `public/**` は eslint の対象外にしている。自動コピーした巨大ファイルが
  大量の警告を出すため。
- 地図は**ブラウザ側専用**。`next/dynamic` の `ssr: false` で読み込む。
  この指定は `'use client'` ファイル内にしか書けないので `MapViewClient.tsx` に分離している。
- `Spot` 型のプロパティ名は **snake_case**。Supabase の列名と完全一致させ、詰め替え処理を不要にする狙い。
- 座標の順番は MapLibre の仕様で **`[経度, 緯度]`**（lng, lat）。緯度が先ではない。
- `next.config.ts` で `cacheComponents: true` / `partialPrefetching: true` が有効。
- **データ取得はすべてブラウザ側で行う（`@supabase/ssr` とcookie認証は使わない）。**
  理由: ①Phase 3 のフィルタはどのみちブラウザ側で動く ②管理画面での変更が再読込で即反映される
  ③iOS版（Expo）と同じ作りになる ④cacheComponents × cookie認証の複雑さを丸ごと回避できる。
  公開側は anonキー＋RLS で公開データのみ、管理側は localStorage のセッションで書き込む。
- **管理画面のページは「薄いサーバー側 page.tsx ＋ client部品」に分ける。**
  `AdminGuard` がログイン確認中は `children` を描かないため、Next.js 16 の instant-navigation
  検査が `segment was dropped` エラーを出す。`export const instant = false` で申告するが、
  **この設定は Client Component には書けない**（書くとエラー）。そのため page.tsx をサーバー側に保ち、
  中身を `components/admin/` の client 部品へ逃がしている。**この分離を崩すと dev にエラーが復活する。**
  なお `(protected)/layout.tsx` 側への `instant` 指定は不要（検証で確認済み）。
- **DBから読んだ行をそのまま保存に使い回さない。** `select('*')` は `created_at` / `updated_at` / `id`
  も返すため、丸ごと送り返すと更新日時が正しく記録されない。`SpotForm` の `toInput()` で
  入力項目だけを明示的に選び出している。
- **Windowsのシェル（curl等）経由で日本語を送ると文字化けする。** 住所検索APIの検証で
  「結果0件」になるのはこれが原因。検証は必ず Node（`fetch`）から行う。
- **SQLなど「手で開いてコピーする」ファイルは必ず CRLF で保つ**（.gitattributes で強制）。
  LF のままだと一部のエディタで全部が1行に見え、コピーして貼ると先頭の -- が
  SQL全体をコメント化する。Supabase は "Success. No rows returned" と表示するため
  **成功したように見えて実際には何も作られない**という事故が起きる（Phase 2 で実際に発生）。
  対策として各SQLの末尾に確認用 select を置き、結果の表が出ることを成功条件にしている。
  さらに npm run sql:schema / sql:seed でエディタを経由せずクリップボードへコピーできる。
- Next.js がこの版の仕様を `node_modules/next/dist/docs/` に同梱している。
  迷ったら記憶に頼らず**必ずそこを読む**。

---

## やらないこと（スコープ外）

- Instagram / TikTok からの自動収集・スクレイピング（**規約違反のため禁止**）
- 一般ユーザーの会員登録・レビュー投稿
- iOSアプリ（Phase 5 で別途）

---

## フォルダ構成

```
src/
├── app/                              URL = フォルダ名 でページが決まる
│   ├── layout.tsx                        全ページ共通の外枠
│   ├── page.tsx                          「/」= 地図画面（Suspense で SpotsScreen を包むだけ）
│   ├── spots/[id]/page.tsx               スポット詳細（Suspense で SpotDetailScreen を包むだけ）
│   ├── globals.css
│   ├── api/geocode/route.ts              国土地理院APIへの中継（住所→位置）
│   ├── api/place-search/route.ts         OpenStreetMap Nominatim への中継（施設名→住所・位置の候補）
│   ├── api/sns-info/route.ts             投稿URLの整形・TikTok短縮URLの解決・埋め込みURL
│   └── admin/                            管理画面
│       ├── layout.tsx                        共通ヘッダー
│       ├── login/page.tsx                    ログイン（門番の外）
│       └── (protected)/                      カッコ付き = URLに出ない。門番の内側
│           ├── layout.tsx                        AdminGuard を適用
│           ├── page.tsx                          /admin（一覧）
│           └── spots/new, spots/[id]              登録・編集
├── components/
│   ├── map/
│   │   ├── mapParts.ts                           地図の共通部品（作成・日本語化・ピン）
│   │   ├── MapView(+Client).tsx                  トップの地図 / ssr:false ラッパー
│   │   └── SpotLocationMap(+Client).tsx          詳細画面の小さな地図
│   ├── spot/
│   │   ├── SpotsScreen.tsx                       トップ画面の中身（取得・絞り込み・表示）
│   │   ├── FilterPanel.tsx                       絞り込みパネル
│   │   ├── SpotDetailScreen.tsx                  詳細画面の中身
│   │   ├── mapQueryMemory.ts                     「地図に戻る」用に絞り込み条件を一時保存
│   │   └── SnsEmbed.tsx                          Instagram / TikTok 公式埋め込み（iframe）
│   ├── admin/                                管理画面の部品（すべて client）
│   │   ├── AdminGuard.tsx                        ログイン確認（UIのみ。防御はRLS）
│   │   ├── AdminSpotList.tsx                     一覧
│   │   ├── EditSpotScreen.tsx                    編集画面
│   │   ├── SpotForm.tsx                          登録・編集フォーム
│   │   ├── BulkImportScreen.tsx                  まとめて登録（/admin/spots/bulk）
│   │   └── LocationPicker(+Client).tsx           ピンをドラッグして位置調整
│   └── ui/StatusMessage.tsx                  読み込み中・エラー表示の共通部品
├── constants/                        選択肢の定義（フィルタUIの元ネタ）
│   └── wards.ts / genres.ts / budgets.ts / timeOfDay.ts / scenes.ts
├── types/spot.ts                     スポット1件のデータの形（iOS版と共有する中心）
└── lib/
    ├── map/config.ts                     地図の設定（配信元URL・中心座標・表示範囲）
    ├── supabase/client.ts, auth.ts       DB接続 / ログイン
    ├── queries/spots.ts                  取得・登録・更新・削除（iOS版と共有する中心）
    ├── filters/spotFilter.ts             絞り込みのルールとURLとの変換（iOS版と共有する中心）
    ├── geocode.ts                        住所・施設名の検索（/api/geocode, /api/place-search を呼ぶ）
    ├── sns.ts                            投稿URLの判定・整形・埋め込みURL（iOS版と共有する中心）
    └── validation/spotInput.ts           一括登録データの検査（日本語の値も受け付ける）

supabase/
├── migrations/0001_create_spots.sql   表・CHECK制約・索引・トリガー・RLS
├── migrations/0002_add_scenes.sql    シーン（タグ）列の追加（npm run sql:scenes）
└── seed.sql                          動作確認用の10件

scripts/
├── copy-maplibre-worker.mjs          地図ワーカーの自動コピー（外すと地図が壊れる）
└── check-supabase.mjs                npm run check:supabase の中身
```

将来の iOS 化に向け、`src/types/` と `src/lib/` に「データの形」と「DB問い合わせ」を集約し、
画面（`app/` `components/`）と分離した状態を保つ。

---

## 秘密情報の扱い

- 実際のキーは `.env.local` に書く（`.gitignore` の `.env*` で除外済み）
- `.env.example` は中身が空の見本。`!.env.example` で例外的にGit管理下に置いている
- **キーをコード中に直接書かない。** 貼り付ける前に必ずファイル名を確認する

---

## 進捗

| Phase | 内容 | 状態 |
|---|---|---|
| 1 | 開発環境の準備＋地図にダミースポット10件を表示 | **完了** |
| 2 | Supabase接続・テーブル作成・管理画面（住所→緯度経度の自動取得） | **完了** |
| 3 | フィルタ（区／ジャンル／予算／時間帯）とスポット詳細画面 | **完了** |
| 4 | スマホ表示の調整と Vercel への公開 | **完了** |
| 5 | iOSアプリ化（Expo / React Native） | 後日 |

### Phase 1 でやったこと
- `create-next-app` で土台作成（TypeScript / Tailwind / App Router / src ディレクトリ）
- `maplibre-gl` v6.14.0 を導入
- 区・ジャンル・予算帯・時間帯の選択肢を `src/constants/` に定義
- `Spot` 型を定義し、仮データ10件を `src/data/dummySpots.ts` に用意
- 地図を表示し、ジャンル別に色分けしたピンを設置。クリックで吹き出し表示
- 23区の外へスクロールしすぎないよう `maxBounds` を設定
- OpenStreetMap の出典表示（ライセンス条件）を地図右下に表示
- 地図のラベルを日本語優先に上書き（`applyJapaneseLabels`）
- ジャンル凡例を地図の左上に配置（右上=ズーム、右下=出典、左下=開発ツールを避けるため）
- **不具合修正**: ブラウザに `Worker failed to load` が出て地図が描画されない問題を解消
  （原因と対処は上記「実装上の重要な注意点」を参照）
- 検証: `npx tsc --noEmit` / `npm run lint` / `npm run build` に加え、
  **ヘッドレスChromeによる実ブラウザ検証**を実施。
  結果: JSエラー0 / 通信失敗0 / ピン10個 / 吹き出し表示OK /
  OpenFreeMap へのタイル要求14件すべて200（＝ワーカー稼働の確証）

### Phase 1 の既知の留保事項
- `npm audit` が `braces` 由来の high 5件を報告する。これは `eslint-config-next` の
  **開発時のみ使う依存**で、公開するアプリには含まれない。`npm audit fix --force` は
  eslint-config-next を v14 へ**ダウングレードしてしまう**ため実行しない。
- OpenFreeMap は寄付運営のため、本格運用時は MapTiler 等への移行を検討する
  （`src/lib/map/config.ts` の `MAP_STYLE_URL` 1行の差し替えで済む）。

### Phase 2 でやったこと
- `supabase/migrations/0001_create_spots.sql`: spots表 + CHECK制約 + 索引 + updated_atトリガー + RLS
  - CHECK制約で区・ジャンル・予算帯・時間帯・座標範囲をDB側でも縛っている（アプリのバグ対策）
- RLS方針: 一般は `is_published = true` の行を**読むだけ**／ログイン済みは全件の読み書き
- `src/lib/supabase/client.ts`: anonキーで接続。未設定時は**日本語で対処法を示す例外**を投げる
- `src/lib/queries/spots.ts`: 取得・登録・更新・削除を集約（iOS版でも使い回す）
- 認証: **メール＋パスワード**。管理者アカウントは Supabase 管理画面で手動作成し、一般登録は無効化
  - マジックリンクを選ばなかった理由: Supabase標準SMTPは送信数制限が厳しく、検証が滞るため
- 管理画面: 一覧 / 新規登録 / 編集・削除 / ログイン・ログアウト
- 住所→緯度経度: `/api/geocode`（国土地理院）＋ 地図上でピンをドラッグして微調整
- トップページを Supabase 読み込みに変更し、`src/data/dummySpots.ts` を削除（内容は `seed.sql` へ）
- `npm run check:supabase`: 設定ミスの切り分け用チェック
  （URL形式／キー／表の存在／**ログインなしの書き込みが拒否されるか**まで確認する）
- 検証: tsc / lint / build に加え、ヘッドレスChromeで4ページを確認し**エラー0件**。
  `/api/geocode` は 正常系 / 住所なし(404) / 23区外(422) / 空文字(400) の4パターンを確認
- オーナーのSupabase設定完了（2026-10-17）: check:supabase 全項目OK / 管理画面ログイン確認済み
  - キーは新形式の `sb_publishable_...`。`.env.local` では変数名を `NEXT_PUBLIC_SUPABASE_ANON_KEY` のまま使う
  - Supabase の画面では Project URL は「Connect」ボタン、または Project Settings → Data API にある
  - dev では初回のページ組み立てに時間がかかり、ログイン後「ログイン中…」で数十秒止まって見えることがある

### Phase 2 の既知の留保事項
- 管理者アカウントは1つだけ作る前提。RLSは「ログイン済みなら書き込み可」であり、
  個人を特定していない。**Supabase側で一般ユーザーの新規登録を必ず無効にしておくこと。**
  将来、複数人で運用するなら `admins` 表を作ってRLSを `auth.uid()` で絞る必要がある。
- `select('*')` を使っているため、将来列を追加したら `Spot` 型と `toInput()` の更新が必要。

### Phase 3 でやったこと
- 絞り込み: ジャンル / 区 / 予算 / 時間帯。ルールは `src/lib/filters/spotFilter.ts` に集約
  - 同じ項目内は「どれか」（OR）、項目どうしは「すべて」（AND）、未選択の項目は絞り込まない
  - 時間帯は「昼」「夜」の2択。`both`（昼・夜どちらも）のスポットはどちらを選んでも出る
  - 区のボタンは、スポットが1件以上ある区だけを並べる
- **絞り込み条件は URL に入れる**（例: `/?genre=cafe&ward=shibuya`）。条件の保管場所は URL だけ。
  更新は `window.history.replaceState`（Next.js が検知して `useSearchParams` が更新される）。
  知らない値は読み飛ばす。共有したURLでも同じ結果になる
- `useSearchParams` / `useParams` は cacheComponents 下では **Suspense で囲むのが必須**
  （囲まないと build が失敗する）。そのため `app/page.tsx` と `app/spots/[id]/page.tsx` で包んでいる
- 絞り込み中は、残ったピンが全部見える位置へ地図を自動で動かす（`fitToSpots`）
- ジャンルの凡例は、色付きのジャンルボタンが兼ねるので廃止
- 画面幅768px以上: パネルを左に常時表示 / それ未満: 「絞り込み」ボタンで地図の上に開閉
- 詳細画面 `/spots/[id]`: ジャンル・区・メモ・予算・時間帯・住所・小さな地図・
  Googleマップ / Instagram / TikTok へのリンク。下書きは管理者にだけ「下書き（非公開）」付きで見える
- 吹き出しに「詳しく見る →」。「地図に戻る」は sessionStorage に覚えた条件付きの地図へ戻る
- 地図の作成処理を `mapParts.ts` に共通化（管理画面の位置調整の地図も日本語ラベルになった）
- `fetchSpot` は UUID の形でない id を「見つからない」扱いにする（DBの英語エラーを出さないため）
- 検証: tsc / lint / build に加え、ヘッドレスChromeで確認。**エラー0件 / 通信失敗0件 / タイル取得OK**。
  夜景=3件、夜=7件、夜景+昼=0件（「条件に合うスポットがありません」表示）、港区+夜景=1件、
  詳細へ移動→戻ると条件とピン数が復元、`/spots/abc` は「見つかりません」、スマホ幅でパネル開閉OK

### Phase 3 の既知の留保事項
- 詳細画面から戻ると、地図の位置（ズーム）は初期状態に戻る（絞り込み条件は戻る）
- 詳細画面のタイトルはブラウザ側で書き換えているため、SNSでURLを共有したときの
  プレビューには反映されない（必要なら Phase 4 でサーバー側取得を検討）
- 管理画面の位置調整の地図は共通化の影響を受けるが、ログインが必要なため自動検証はしていない

### Phase 4 でやったこと
- スマホ表示の調整（375px幅で全ページを撮影して確認）
  - 絞り込みボタンをスマホ幅で高さ約42pxに（指で押しやすく）
  - 入力欄をスマホ幅で16px（`text-base sm:text-sm`）。**16px未満だとiPhoneが入力時に画面を拡大する**
  - ページ途中の小さな地図（詳細・位置調整）は `cooperativeGestures`（2本指でだけ動く）。
    1本指はページのスクロールを優先。案内文は `locale` で日本語化
  - 地図の回転・傾きを無効化（方位磁針ボタンも非表示）、吹き出しの×ボタンを32pxに
  - スマホ幅ではヘッダーの説明文を省き、件数だけ表示
  - 地図右下の出典表示はスマホ幅で最初だけ開き、地図を動かすと畳まれる。
    これは MapLibre 標準の動き（OSM の出典表示ルールへの配慮）なので、あえて変えていない
- 公開
  - GitHub: https://github.com/yudaicode/date-map （Private）
  - 本番URL: https://date-map-murex.vercel.app/
  - **main ブランチに push すると Vercel が自動で本番を更新する**
  - Vercel の環境変数に `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` を登録済み。
    Vercel は「KEY に NEXT_PUBLIC_ が付いている」と警告するが、publishable キーは公開前提なので
    **接頭辞は消さない**（消すとブラウザから読めず接続エラーになる）。種類は Config でよい
  - 環境変数を変えたら、Deployments → … → Redeploy しないと反映されない
- 検証（本番URLに対してヘッドレスChrome）: ピン11個 / タイル取得OK / ワーカー配信200 /
  絞り込み・詳細・戻る / 未ログインで /admin → ログイン画面 / geocode 正常・23区外422。
  エラーは意図的な誤ログインの400のみ

### Phase 4 の既知の留保事項
- **Supabase の無料プランは、1週間アクセスが無いとプロジェクトが一時停止される。**
  停止中はサイトに「スポットを読み込めませんでした」と出る。Supabase の管理画面から再開できる
- 詳細画面のURLをSNSで共有したときのプレビューにスポット名は出ない（Phase 3 の留保のまま）
- 独自ドメイン（例: date-map.jp）は未設定。必要になったら Vercel の Domains から追加する

### 投稿を効率よく登録する仕組み（Phase 4 の後に追加）
- 方針: **SNSからの自動収集はしない。** リンクを貼り、表示は各サービス公式の埋め込みだけを使う。
  他人の写真・動画を保存・転載しない。メモは自分の言葉で書く
- ① iPhone の「共有」→ ショートカット「デートマップに登録」→
  `/admin/spots/new?url=<URLエンコードした共有内容>` を Safari で開く。
  フォームが共有内容からURLを抜き出し（前後の文章付きでもOK）、Instagram / TikTok の欄へ自動で振り分ける
  - 未ログインなら AdminGuard が `/admin/login?next=...` へ送り、ログイン後に元のURLへ戻す。
    `next` は `/admin` で始まるものだけ許可（外部サイトへの転送に悪用されないため）
  - Instagram の `?igsh=`（共有した人の手がかり）や TikTok の追跡用パラメータは保存前に除去
- ② 「施設名で位置を検索」: Nominatim（1秒1回まで・User-Agent必須・入力のたびに呼ばない）。
  有名施設は見つかるが**小さな店は見つからないことが多く、別の場所が出ることもある**
  （例: teamLab Planets が千代田区で出た）。候補は住所を見て選ばせ、地図で確認させる。
  見つからないときは Googleマップ検索へのリンクを出し、住所をコピーして既存の住所検索に回す
  - 住所は「東京都＋区＋町丁目（＋番地）」まで。番地が無いことが多い
  - 住所から位置を取得したときも、住所に含まれる区名で区の選択を自動で合わせる
- ③ 詳細画面に元の投稿を埋め込み表示: Instagram は `/p/<code>/embed/`、TikTok は `/player/v1/<id>`
  - **TikTok の oEmbed は（2026年10月時点で）投稿者名・説明文を返さない。** 動画番号（embed_product_id）だけ。
    フォームの「投稿者」「説明」表示は返ってきたときだけ出る作り
  - TikTok 短縮URL（vt.tiktok.com）は転送先をたどり、**動画ページに着いたときだけ**置き換える
    （無効な短縮URLはトップページに転送されるため。置き換えると元URLが失われる）
  - Instagram の埋め込み内部で Instagram 自身が console.error を出すことがある（こちらの不具合ではない）
- 検証: 未ログイン→next付きログイン画面 / 共有テキストからTikTok欄へ自動入力・埋め込み表示 /
  「東京タワー」→港区・座標 / 見つからない店→0件表示とGoogleマップリンク / 住所→区の自動選択 /
  詳細画面に Instagram・TikTok の iframe（モックしたスポットで確認）

---

## コンテンツ戦略（第一段階・2026-10 決定）

### 勝ち筋
SNSより**速くて迷わない**こと。場所が地図で一発、条件（シーン・予算・時間帯）で絞れる、
保存した投稿が埋もれない、雰囲気は元投稿の埋め込みで見られる。

### 登録のルール
1. **狭く濃く**: まず重点3エリアに集中する（1エリア15〜20件が目安）
   - 渋谷・原宿・表参道 / 中目黒・代官山・恵比寿 / 下北沢・清澄白河
   - 注意: 下北沢は世田谷区、清澄白河は江東区。エリアは区の組み合わせで表現している
2. **絞り込みで0件を作らない**: 各エリアでジャンル（6種）と昼・夜がそろっているか確認する
3. **1件ごとにSNS投稿を1つ以上**: 埋め込みが確実な TikTok を優先
4. **メモは自分の言葉で**「行く前に知りたいこと」（予約要否・混む時間・服装・2軒目候補）。投稿文のコピー禁止
- 登録基準: 23区内 / 営業中 / デート向き / 公開投稿がある / 住所が特定できる

### 集め方（方式A: Claudeが調べて一括登録データを作る）
1. オーナーが毎日5〜10分、TikTok・Instagramで良い投稿を保存しておく
2. 週1回、スポット名と投稿URLをまとめて Claude に渡す
3. **Claude**: Web検索で公式サイト等から住所を確認し、位置は国土地理院API（Node の fetch。
   シェル経由は文字化けする）で求め、区・ジャンル・予算・時間帯・シーン・メモ下書きを付けた
   **JSON** を作る（形式は `src/lib/validation/spotInput.ts` 冒頭のコメント）。
   Instagram/TikTok のページ自体は読みに行かない（規約）。分からない項目は推測せずオーナーに聞く
4. オーナーが `/admin/spots/bulk` に貼り付け → 内容確認 → 登録

### 達成の判断基準
- 量: 重点エリアで50件 → 100件
- 網羅: 重点エリアで主な絞り込みが0件にならない
- **使われるか（最重要）**: Z世代の友人5〜10人が「1分以内に行きたい場所を見つけられるか」
- 広がるか: アクセス数（Vercel Analytics 無料枠）

### 将来の改善候補
スマホ向けの一覧（スクロール）表示 / エリア別ページ（Google検索の入口）/
掲載した投稿者への連絡とシェア依頼 / SNS共有時のプレビュー

### シーン（タグ）と一括登録（2026-10 追加）
- シーン: 初デート / 記念日 / 雨の日OK / 映え / 予約なしでOK（`src/constants/scenes.ts`）
  - DBは `scenes text[]`＋CHECK制約（0002）。**選択肢を増やすときは CHECK制約も更新する**
  - 絞り込みは**シーンだけAND**（選んだ全部に当てはまる）。他の項目は項目内OR
  - URL は `?scene=rainy_day,first_date`
  - 0002 実行前のDBでも画面が壊れないよう、`queries/spots.ts` の `normalize()` で `scenes` を `[]` で補う
    （ただし保存は失敗するので、**0002 を実行してからデプロイする**）
- 一括登録 `/admin/spots/bulk`: JSON（```json の囲みごと貼ってもよい）→ 検査 → 一覧で確認 → 登録
  - 区・ジャンル等は id でも日本語ラベルでも可。SNS URL は自動で整形
  - 登録済みと同名（空白・大文字小文字を無視）や貼り付け内の重複は警告し、最初はチェックを外す
  - 保存は1回の insert（1件でもDBに拒否されると全件保存されない）

---

## 開発コマンド

```bash
npm run dev     # 開発サーバー起動 → http://localhost:3000
npm run build   # 本番ビルド（公開前の確認。これが通らないとVercelでも失敗する）
npm run lint    # 書き方のチェック
npx tsc --noEmit # 型（打ち間違い）のチェック

npm run check:supabase  # Supabaseの設定が正しいか確認（つまずいたら最初にこれ）
npm run sql:scenes      # シーン追加のSQL（0002）をクリップボードへコピー
```

## ブラウザでの自動検証（各フェーズで実施する）

コンソールエラーや描画崩れは `tsc` / `build` では検出できない。
ローカルにインストール済みの Chrome を headless で動かして確認する。
（検証用スクリプトはプロジェクト外の一時フォルダに置き、本体には含めない）

確認する項目:
- `pageerror` / `console.error` が0件か
- 失敗した通信（`requestfailed` / ステータス400以上）が0件か
- `.maplibregl-marker` の数が想定どおりか
- タイル(`.pbf`)の取得が成功しているか ← ワーカーが生きている証拠
- スクリーンショットを実際に目で見る

## 進め方のルール

- 各フェーズの終わりに**必ず止まり**、「ローカルで動作確認する手順」を提示する
- 各フェーズごとに Git でコミットし、壊れても戻せる状態を保つ
- オーナーの手作業（アカウント作成・キー取得）は、**画面のどこを押すかまで**案内する
- このファイルの「進捗」を各フェーズ完了時に更新する
