# デートマップ（date-map）

SNS（Instagram / TikTok）で見つけた**東京23区のデートスポット**を、地図とフィルタで探せるWebアプリ。
最終目標は「旅行版の食べログ」。本リポジトリはその第一歩として東京23区のデートスポットに限定する。

- 開発者: 1名（オーナー＝管理者）。**プログラミング未経験**のため、専門用語は短く補足して説明する
- 解決したい課題: SNSのデートスポット情報は有用だが、場所の把握と条件での絞り込みが難しい

---

## 技術スタック（決定事項）

| 領域 | 採用 | 決定理由 |
|---|---|---|
| フレームワーク | Next.js 16.4.2（App Router / TypeScript） | 画面とサーバー処理を1つで書ける |
| スタイル | Tailwind CSS v4 | `next.config.ts` の turbopack ルール経由で読み込む（`postcss.config` は無い） |
| 地図ライブラリ | MapLibre GL JS v6 | オープンソース・無料。配信元を後から差し替えられる |
| 地図タイル | OpenFreeMap（`tiles.openfreemap.org`） | **APIキー・クレカ登録 不要／無料**。乗り換え先候補は MapTiler（月10万タイル無料） |
| ジオコーディング | Geolonia 住所ジオコーディング（Phase 2で導入） | 無料・キー不要・日本の住所に強い |
| DB / 認証 | Supabase（Phase 2で導入） | iOS版（Expo）からも同じDBを使い回せる |
| 公開 | Vercel（Phase 4で導入） | Next.js と相性が良く無料枠で足りる |

### 実装上の重要な注意点
- **MapLibre v6 には default export が無い。** `import maplibregl from 'maplibre-gl'` は動かない。
  正: `import { MapLibreMap, Marker, Popup, NavigationControl } from 'maplibre-gl'`
  （`Map` は JavaScript 標準の `Map` と名前が衝突するため、別名の `MapLibreMap` を使う）
- 地図は**ブラウザ側専用**。`next/dynamic` の `ssr: false` で読み込む。
  この指定は `'use client'` ファイル内にしか書けないので `MapViewClient.tsx` に分離している。
- `Spot` 型のプロパティ名は **snake_case**。Supabase の列名と完全一致させ、詰め替え処理を不要にする狙い。
- 座標の順番は MapLibre の仕様で **`[経度, 緯度]`**（lng, lat）。緯度が先ではない。
- `next.config.ts` で `cacheComponents: true` が有効。Phase 2 で動的データを扱う際は
  `node_modules/next/dist/docs/01-app/02-guides/migrating-to-cache-components.md` を確認する。
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
├── app/                    URL = フォルダ名 でページが決まる
│   ├── layout.tsx              全ページ共通の外枠
│   ├── page.tsx                「/」= 地図画面
│   └── globals.css
├── components/map/         地図まわりの部品
│   ├── MapView.tsx             地図本体（ブラウザ側で動く）
│   └── MapViewClient.tsx       ssr:false で包むためのラッパー
├── constants/              選択肢の定義（フィルタUIの元ネタ）
│   ├── wards.ts / genres.ts / budgets.ts / timeOfDay.ts
├── types/spot.ts           スポット1件のデータの形（iOS版と共有する中心）
├── lib/map/config.ts       地図の設定（配信元URL・中心座標・表示範囲）
└── data/dummySpots.ts      Phase 1 の仮データ。Phase 2 で削除予定
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
| 2 | Supabase接続・テーブル作成・管理画面（住所→緯度経度の自動取得） | 未着手 |
| 3 | フィルタ（区／ジャンル／予算／時間帯）とスポット詳細画面 | 未着手 |
| 4 | スマホ表示の調整と Vercel への公開 | 未着手 |
| 5 | iOSアプリ化（Expo / React Native） | 後日 |

### Phase 1 でやったこと
- `create-next-app` で土台作成（TypeScript / Tailwind / App Router / src ディレクトリ）
- `maplibre-gl` v6.14.0 を導入
- 区・ジャンル・予算帯・時間帯の選択肢を `src/constants/` に定義
- `Spot` 型を定義し、仮データ10件を `src/data/dummySpots.ts` に用意
- 地図を表示し、ジャンル別に色分けしたピンを設置。クリックで吹き出し表示
- 23区の外へスクロールしすぎないよう `maxBounds` を設定
- OpenStreetMap の出典表示（ライセンス条件）を地図右下に表示
- 検証: `npx tsc --noEmit` / `npm run build` / dev サーバーのHTML・CSS内容チェック すべて通過

### Phase 1 の既知の留保事項
- `npm audit` が `braces` 由来の high 5件を報告する。これは `eslint-config-next` の
  **開発時のみ使う依存**で、公開するアプリには含まれない。`npm audit fix --force` は
  eslint-config-next を v14 へ**ダウングレードしてしまう**ため実行しない。
- OpenFreeMap は寄付運営のため、本格運用時は MapTiler 等への移行を検討する
  （`src/lib/map/config.ts` の `MAP_STYLE_URL` 1行の差し替えで済む）。

---

## 開発コマンド

```bash
npm run dev     # 開発サーバー起動 → http://localhost:3000
npm run build   # 本番ビルド（公開前の確認。これが通らないとVercelでも失敗する）
npm run lint    # 書き方のチェック
npx tsc --noEmit # 型（打ち間違い）のチェック
```

## 進め方のルール

- 各フェーズの終わりに**必ず止まり**、「ローカルで動作確認する手順」を提示する
- 各フェーズごとに Git でコミットし、壊れても戻せる状態を保つ
- オーナーの手作業（アカウント作成・キー取得）は、**画面のどこを押すかまで**案内する
- このファイルの「進捗」を各フェーズ完了時に更新する
