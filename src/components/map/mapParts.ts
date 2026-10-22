// 地図まわりの共通部品。トップの地図・詳細画面の地図・管理画面の位置調整で使い回す。
// MapLibre はブラウザ専用なので、このファイルは ssr: false で読み込まれる部品からだけ使うこと。

// MapLibre v6 は「名前付きエクスポート」のみです。
// （ネット上の古い記事にある import maplibregl from 'maplibre-gl' は v6 では動きません）
import { getVersion, MapLibreMap, NavigationControl, setWorkerUrl } from 'maplibre-gl'

import type { Spot } from '@/types/spot'
import { genre } from '@/constants/genres'
import {
  MAP_ATTRIBUTION,
  MAP_STYLE_URL,
  MAPLIBRE_WORKER_PATH,
  MIN_ZOOM,
  TOKYO_23KU_BOUNDS,
} from '@/lib/map/config'

/**
 * 共通設定を済ませた地図を作る。
 * （ワーカーの場所・23区の枠・出典表示・ズームボタン・日本語ラベル）
 */
export function createBaseMap(
  container: HTMLElement,
  options: {
    center: [number, number]
    zoom: number
    /**
     * true にすると、スマホでは「2本指」でだけ地図が動く。
     * ページの途中に置く小さな地図用。1本指のときはページのスクロールが優先される
     * （そうしないと、地図の上で指を動かしてもページがスクロールできなくなる）
     */
    cooperativeGestures?: boolean
  }
): MapLibreMap {
  // 地図データを裏で処理する「ワーカー」の場所を明示的に指定する。
  // MapLibre v6 は本来この場所を自分で推測するが、Next.js がファイルをまとめると
  // 推測が外れて空になり、ブラウザに "Worker failed to load" というエラーが出る。
  // ?v=... はライブラリを更新したときに、古いワーカーが使われ続けるのを防ぐための印。
  setWorkerUrl(`${MAPLIBRE_WORKER_PATH}?v=${getVersion()}`)

  const map = new MapLibreMap({
    container,
    style: MAP_STYLE_URL,
    center: options.center, // [経度, 緯度] の順番
    zoom: options.zoom,
    minZoom: MIN_ZOOM,
    maxBounds: TOKYO_23KU_BOUNDS, // 23区の外へ行きすぎないようにする
    attributionControl: { customAttribution: MAP_ATTRIBUTION },
    cooperativeGestures: options.cooperativeGestures ?? false,
    // 地図の回転・傾きは使わない。スマホで2本指操作したときに
    // 意図せず地図が回って北がわからなくなるのを防ぐため
    maxPitch: 0,
    // 地図の上に出る案内文を日本語にする
    locale: {
      'CooperativeGesturesHandler.MobileHelpText': '2本指で地図を動かせます',
      'CooperativeGesturesHandler.WindowsHelpText': 'Ctrl キーを押しながらスクロールで拡大・縮小',
      'CooperativeGesturesHandler.MacHelpText': '⌘ キーを押しながらスクロールで拡大・縮小',
    },
  })
  map.dragRotate.disable()
  map.keyboard.disableRotation()
  map.touchZoomRotate.disableRotation()

  // 拡大・縮小ボタン（回転を使わないので方位磁針は出さない）
  map.addControl(new NavigationControl({ showCompass: false }), 'top-right')

  // スタイル（地図の見た目データ）の読み込みが終わってから日本語化する。
  // 読み込み前に実行しても、まだレイヤーが存在しないため効果がない。
  map.on('load', () => applyJapaneseLabels(map))
  return map
}

/**
 * 地図上の地名を日本語優先で表示する。
 *
 * OpenFreeMap の標準スタイルは地名を英語混じりで出すため（例: Tokyo / Koto）、
 * 日本語名 name:ja があればそれを使うように、文字表示の設定を上書きする。
 * coalesce は「左から順に見て、最初に中身があるものを使う」という意味。
 */
function applyJapaneseLabels(map: MapLibreMap) {
  const layers = map.getStyle().layers ?? []

  for (const layer of layers) {
    if (layer.type !== 'symbol') continue

    const textField = map.getLayoutProperty(layer.id, 'text-field')
    // 国道番号などの「地名ではない文字」を消さないよう、
    // 地名(name)を使っているレイヤーだけを対象にする
    if (!textField || !JSON.stringify(textField).includes('name')) continue

    map.setLayoutProperty(layer.id, 'text-field', [
      'coalesce',
      ['get', 'name:ja'],
      ['get', 'name:latin'],
      ['get', 'name'],
    ])
  }
}

/** ピン1個の見た目を作る。ジャンルごとに色と絵文字を変えています */
export function createPinElement(spot: Spot): HTMLElement {
  const g = genre(spot.genre)
  const el = document.createElement('div')
  // ここだけ Tailwind ではなく直接スタイル指定にしています。
  // 理由: このピンは React ではなく JavaScript で直接作る要素なので、
  //       直接指定のほうが確実に反映されます。
  el.style.cssText = [
    'width:34px',
    'height:34px',
    'border-radius:9999px',
    `background:${g?.color ?? '#374151'}`,
    'display:flex',
    'align-items:center',
    'justify-content:center',
    'font-size:16px',
    'line-height:1',
    'border:2px solid #ffffff',
    'box-shadow:0 2px 6px rgba(0,0,0,0.35)',
    'cursor:pointer',
  ].join(';')
  el.textContent = g?.emoji ?? '📍'
  el.setAttribute('aria-label', spot.name)
  el.title = spot.name
  return el
}
