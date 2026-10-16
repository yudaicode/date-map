/**
 * MapLibre の「ワーカー」ファイルを public/ にコピーするスクリプト。
 *
 * 【なぜ必要か】
 * MapLibre は地図データの解析を、画面とは別の裏スレッド（ワーカー）で行います。
 * v6 はそのワーカーファイルの場所を「自分自身のURL」から逆算する作りですが、
 * Next.js はファイルをまとめてしまうため逆算が失敗し、URLが空になってしまいます。
 * （ブラウザに "Worker failed to load" というエラーが出る原因）
 *
 * そこでワーカーファイルを public/ に置いて自分で配信し、
 * MapView.tsx から setWorkerUrl() で場所を明示的に教えます。
 *
 * 【なぜ .mjs ではなく .js という名前でコピーするのか】
 * ブラウザはファイルの中身ではなく「配信時の種類表示（MIMEタイプ）」を見て
 * JavaScriptかどうか判断します。.js なら確実に JavaScript として配信されます。
 *
 * このスクリプトは npm install / npm run dev / npm run build の前に自動実行されます
 * （package.json の postinstall / predev / prebuild）。手で実行する必要はありません。
 */
import { copyFileSync, mkdirSync, readFileSync, existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const projectRoot = join(dirname(fileURLToPath(import.meta.url)), '..')

const source = join(projectRoot, 'node_modules', 'maplibre-gl', 'dist', 'maplibre-gl-worker.mjs')
const destDir = join(projectRoot, 'public', 'maplibre')
const dest = join(destDir, 'maplibre-gl-worker.js')

if (!existsSync(source)) {
  console.error(
    '[maplibre] ワーカーファイルが見つかりません:\n' +
      `  ${source}\n` +
      '  `npm install` を実行してから、もう一度お試しください。'
  )
  process.exit(1)
}

const version = JSON.parse(
  readFileSync(join(projectRoot, 'node_modules', 'maplibre-gl', 'package.json'), 'utf8')
).version

mkdirSync(destDir, { recursive: true })
copyFileSync(source, dest)

console.log(`[maplibre] worker v${version} -> public/maplibre/maplibre-gl-worker.js`)
