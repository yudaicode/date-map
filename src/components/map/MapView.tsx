'use client'
// ↑ この1行で「このファイルはブラウザの中で動く」という意味になります。
//   地図は画面の大きさやマウス操作を使うので、ブラウザ側でしか動かせません。

import { useEffect, useRef } from 'react'
// MapLibre v6 は「名前付きエクスポート」のみです。
// （ネット上の古い記事にある import maplibregl from 'maplibre-gl' は v6 では動きません）
import { MapLibreMap, Marker, NavigationControl, Popup } from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css' // 地図の操作ボタンなどの見た目用CSS

import type { Spot } from '@/types/spot'
import { genre } from '@/constants/genres'
import { wardLabel } from '@/constants/wards'
import { budgetLabel } from '@/constants/budgets'
import { timeOfDayLabel } from '@/constants/timeOfDay'
import {
  MAP_ATTRIBUTION,
  MAP_STYLE_URL,
  MIN_ZOOM,
  DEFAULT_ZOOM,
  TOKYO_23KU_BOUNDS,
  TOKYO_CENTER,
} from '@/lib/map/config'

type Props = {
  spots: Spot[]
}

/** 文字列をHTMLに安全に埋め込むための処理（< > などを無害な文字に変換する） */
function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

/** ピン1個の見た目を作る。ジャンルごとに色と絵文字を変えています */
function createPinElement(spot: Spot): HTMLElement {
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

/** ピンをクリックしたときに出る吹き出しの中身 */
function popupHtml(spot: Spot): string {
  const g = genre(spot.genre)
  return `
    <div style="font-family:inherit;max-width:240px">
      <div style="font-weight:700;font-size:14px;margin-bottom:4px">${escapeHtml(spot.name)}</div>
      <div style="font-size:12px;color:#4b5563;margin-bottom:6px">
        ${escapeHtml(wardLabel(spot.ward))} ・ ${escapeHtml(g?.label ?? spot.genre)}
      </div>
      <div style="font-size:12px;color:#4b5563;margin-bottom:6px">
        ${escapeHtml(budgetLabel(spot.budget_band))} ・ ${escapeHtml(timeOfDayLabel(spot.time_of_day))}
      </div>
      <div style="font-size:12px;line-height:1.5">${escapeHtml(spot.memo)}</div>
    </div>
  `
}

export default function MapView({ spots }: Props) {
  // useRef は「画面のこの場所」を覚えておくための箱。
  // 地図はこの div の中に描かれます。
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<MapLibreMap | null>(null)

  // 1つめの useEffect: 画面が表示されたときに地図を1回だけ作る
  useEffect(() => {
    if (!containerRef.current) return
    if (mapRef.current) return // すでに作ってあるなら何もしない

    const map = new MapLibreMap({
      container: containerRef.current,
      style: MAP_STYLE_URL,
      center: TOKYO_CENTER,
      zoom: DEFAULT_ZOOM,
      minZoom: MIN_ZOOM,
      maxBounds: TOKYO_23KU_BOUNDS, // 23区の外へ行きすぎないようにする
      attributionControl: { customAttribution: MAP_ATTRIBUTION },
    })

    map.addControl(new NavigationControl(), 'top-right') // 拡大・縮小ボタン
    mapRef.current = map

    // 画面から消えるときに地図を片付ける（放置するとメモリを使い続けるため）
    return () => {
      map.remove()
      mapRef.current = null
    }
  }, [])

  // 2つめの useEffect: spots（スポット一覧）が変わるたびにピンを置き直す
  // Phase 3 でフィルタを付けると、絞り込むたびにここが動いてピンが入れ替わります。
  useEffect(() => {
    const map = mapRef.current
    if (!map) return

    const markers = spots.map((spot) => {
      const popup = new Popup({ offset: 20, closeButton: true }).setHTML(popupHtml(spot))
      return new Marker({ element: createPinElement(spot) })
        .setLngLat([spot.lng, spot.lat]) // 経度, 緯度 の順番
        .setPopup(popup)
        .addTo(map)
    })

    // 次にこの処理が動く前に、前回置いたピンを全部消す
    return () => {
      markers.forEach((m) => m.remove())
    }
  }, [spots])

  return <div ref={containerRef} className="h-full w-full" />
}
