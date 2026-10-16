/**
 * 地図の基本設定をここに集約。
 * 地図の配信元を変えたくなったら MAP_STYLE_URL の1行だけ差し替えればOKです。
 */

// OpenFreeMap: 無料・APIキー不要の地図タイル配信サービス。
// 'liberty' は標準的な見た目。'positron' は白っぽい淡い見た目（ピンが目立つ）。
export const MAP_STYLE_URL = 'https://tiles.openfreemap.org/styles/liberty'

// 地図を開いたときの中心。東京駅のあたり。[経度, 緯度] の順番（緯度が先ではない点に注意）
export const TOKYO_CENTER: [number, number] = [139.7671, 35.6812]

export const DEFAULT_ZOOM = 10.5

// 23区の外へスクロールしていかないようにする枠。[[南西の角], [北東の角]]
export const TOKYO_23KU_BOUNDS: [[number, number], [number, number]] = [
  [139.45, 35.45],
  [140.0, 35.9],
]

export const MIN_ZOOM = 9

// OpenStreetMap のデータを使う場合、出典の表示が必須です（ライセンス条件）。
export const MAP_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a> contributors | <a href="https://openfreemap.org" target="_blank" rel="noreferrer">OpenFreeMap</a>'

// MapLibre のワーカー（地図データを裏で処理する別スレッド）の置き場所。
// scripts/copy-maplibre-worker.mjs が public/maplibre/ に自動コピーしている。
export const MAPLIBRE_WORKER_PATH = '/maplibre/maplibre-gl-worker.js'
