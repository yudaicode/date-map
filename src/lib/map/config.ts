/**
 * 地図の基本設定をここに集約。
 * 地図の配信元を変えたくなったら MAP_STYLES の URL を差し替えればOKです。
 */

// OpenFreeMap: 無料・APIキー不要の地図タイル配信サービス。
// どのテーマでどれを使うかは src/lib/theme/themes.ts で決める。
export const MAP_STYLES = {
  liberty: 'https://tiles.openfreemap.org/styles/liberty', // 標準的な色つきの地図
  positron: 'https://tiles.openfreemap.org/styles/positron', // 白っぽく淡い地図（目印が目立つ）
  dark: 'https://tiles.openfreemap.org/styles/dark', // 暗い地図
} as const

// テーマに関係なく使う標準の地図（管理画面など）
export const MAP_STYLE_URL = MAP_STYLES.liberty

// 地図を開いたときの中心。東京駅のあたり。[経度, 緯度] の順番（緯度が先ではない点に注意）
export const TOKYO_CENTER: [number, number] = [139.7671, 35.6812]

export const DEFAULT_ZOOM = 10.5

// 23区の外へスクロールしていかないようにする枠。[[南西の角], [北東の角]]
export const TOKYO_23KU_BOUNDS: [[number, number], [number, number]] = [
  [139.45, 35.45],
  [140.0, 35.9],
]

export const MIN_ZOOM = 9

// この倍率以上にズームすると、地図のピンが写真のサムネイルに変わる。
// 14 ≒ 駅の周り（半径1kmほど）が画面に収まるくらい。これより引くとサムネイル同士が重なりすぎる
export const THUMBNAIL_ZOOM = 14

// OpenStreetMap のデータを使う場合、出典の表示が必須です（ライセンス条件）。
export const MAP_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a> contributors | <a href="https://openfreemap.org" target="_blank" rel="noreferrer">OpenFreeMap</a>'

// MapLibre のワーカー（地図データを裏で処理する別スレッド）の置き場所。
// scripts/copy-maplibre-worker.mjs が public/maplibre/ に自動コピーしている。
export const MAPLIBRE_WORKER_PATH = '/maplibre/maplibre-gl-worker.js'
