// 地図まわりの共通部品。トップの地図・詳細画面の地図・管理画面の位置調整で使い回す。
// MapLibre はブラウザ専用なので、このファイルは ssr: false で読み込まれる部品からだけ使うこと。

// MapLibre v6 は「名前付きエクスポート」のみです。
// （ネット上の古い記事にある import maplibregl from 'maplibre-gl' は v6 では動きません）
import {
  getVersion,
  MapLibreMap,
  NavigationControl,
  setWorkerUrl,
  type PositionAnchor,
} from 'maplibre-gl'

import type { Spot } from '@/types/spot'
import { genre } from '@/constants/genres'
import {
  MAP_ATTRIBUTION,
  MAP_STYLE_URL,
  MAPLIBRE_WORKER_PATH,
  MIN_ZOOM,
  TOKYO_23KU_BOUNDS,
} from '@/lib/map/config'
import { getThemeId, subscribeTheme } from '@/lib/theme/themeStore'
import { themeById } from '@/lib/theme/themes'

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
    /**
     * true（省略時）: 着せ替えのテーマに合わせて地図の見た目も変え、切り替えにも追従する。
     * 管理画面の地図はテーマに関係なく標準の見た目にするため false を渡す
     */
    followTheme?: boolean
  }
): MapLibreMap {
  const followTheme = options.followTheme ?? true
  let styleUrl = followTheme ? themeById(getThemeId()).mapStyleUrl : MAP_STYLE_URL

  // 地図データを裏で処理する「ワーカー」の場所を明示的に指定する。
  // MapLibre v6 は本来この場所を自分で推測するが、Next.js がファイルをまとめると
  // 推測が外れて空になり、ブラウザに "Worker failed to load" というエラーが出る。
  // ?v=... はライブラリを更新したときに、古いワーカーが使われ続けるのを防ぐための印。
  setWorkerUrl(`${MAPLIBRE_WORKER_PATH}?v=${getVersion()}`)

  const map = new MapLibreMap({
    container,
    style: styleUrl,
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
  // 'style.load' は最初の読み込みに加え、テーマの切り替えで見た目を差し替えたときにも起きる
  map.on('style.load', () => applyJapaneseLabels(map))

  // テーマが切り替わったら地図の見た目も差し替える（目印や吹き出しはそのまま残る）
  if (followTheme) {
    const unsubscribe = subscribeTheme(() => {
      const next = themeById(getThemeId()).mapStyleUrl
      if (next === styleUrl) return
      styleUrl = next
      map.setStyle(next)
    })
    map.on('remove', unsubscribe) // 地図を片付けるときに見張りもやめる
  }
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

/**
 * スポット1件分の目印を作る。中に「ピン」と「サムネイル（写真カード）」の両方を入れておき、
 * どちらを見せるかは CSS（globals.css の .spot-marker）で切り替える。
 * 地図の外枠に .map-thumbs が付いているとサムネイル、付いていないとピンが見える。
 *
 * 【なぜ両方入れておくのか】
 * ズームのたびに目印を作り直すと、ピンが一瞬消えてチラつき、数が多いと重くなる。
 * 外枠のクラスを1つ付け外しするだけなら、ブラウザが一瞬で切り替えてくれる。
 *
 * 目印の「下端の中央」がスポットの位置になる（Marker の anchor: 'bottom' と組み合わせて使う）。
 */
export function createPinElement(spot: Spot): HTMLElement {
  const g = genre(spot.genre)
  const el = document.createElement('div')
  el.className = 'spot-marker'
  // ジャンルの色。CSS 側で var(--pin-color) として使う
  el.style.setProperty('--pin-color', g?.color ?? '#374151')
  el.setAttribute('aria-label', spot.name)
  el.title = spot.name

  const pin = document.createElement('div')
  pin.className = 'spot-marker__pin'
  pin.textContent = g?.emoji ?? '📍'

  const thumb = document.createElement('div')
  thumb.className = 'spot-marker__thumb'
  const photo = document.createElement('div')
  photo.className = 'spot-marker__photo'
  if (spot.image_url) {
    const img = document.createElement('img')
    img.src = spot.image_url
    img.alt = ''
    img.loading = 'lazy' // サムネイルが表示されるまで写真を読み込まない
    img.decoding = 'async'
    photo.appendChild(img)
  } else {
    // 写真が無いときは、ジャンルの色の背景に絵文字を大きく出す
    photo.textContent = g?.emoji ?? '📍'
  }
  const name = document.createElement('div')
  name.className = 'spot-marker__name'
  name.textContent = spot.name
  // 保存したスポットにだけ出る ♥ の印（CSS の .is-saved で表示）
  const heart = document.createElement('span')
  heart.className = 'spot-marker__heart'
  heart.textContent = '♥'
  thumb.append(photo, name, heart)

  el.append(pin, thumb)
  return el
}

/** 目印の大きさ（吹き出しを目印の真上に出すために使う。globals.css の値と合わせる） */
export const MARKER_SIZE = {
  pin: { width: 34, height: 42 },
  thumb: { width: 70, height: 84 },
  // 引いた地図での「保存したスポット」の小さめのサムネイル（名前なし）
  mini: { width: 50, height: 58 },
} as const

export type MarkerMode = keyof typeof MARKER_SIZE

/**
 * 吹き出しの位置のずらし方。吹き出しは画面の端に近いと上下左右どこにでも出るので、
 * 出る向きごとに「目印にかぶらない位置」を指定する。
 */
export function popupOffsetFor(mode: MarkerMode): Record<PositionAnchor, [number, number]> {
  const { width, height } = MARKER_SIZE[mode]
  const half = width / 2
  return {
    center: [0, -height / 2],
    top: [0, 0],
    'top-left': [0, 0],
    'top-right': [0, 0],
    bottom: [0, -height],
    'bottom-left': [0, -height],
    'bottom-right': [0, -height],
    left: [half, -height / 2],
    right: [-half, -height / 2],
  }
}
