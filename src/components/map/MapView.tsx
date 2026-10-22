'use client'
// ↑ この1行で「このファイルはブラウザの中で動く」という意味になります。
//   地図は画面の大きさやマウス操作を使うので、ブラウザ側でしか動かせません。

import { useEffect, useRef } from 'react'
import { LngLatBounds, type MapLibreMap, Marker, Popup } from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css' // 地図の操作ボタンなどの見た目用CSS

import type { Spot } from '@/types/spot'
import { genre } from '@/constants/genres'
import { wardLabel } from '@/constants/wards'
import { budgetLabel } from '@/constants/budgets'
import { timeOfDayLabel } from '@/constants/timeOfDay'
import { sceneLabel } from '@/constants/scenes'
import { DEFAULT_ZOOM, THUMBNAIL_ZOOM, TOKYO_CENTER } from '@/lib/map/config'
import { createBaseMap, createPinElement, popupOffsetFor, type MarkerMode } from './mapParts'

type Props = {
  spots: Spot[]
  /** true のとき、spots が変わるたびに全部のピンが収まるよう地図を動かす */
  fitToSpots: boolean
  /** 吹き出しの「詳しく見る」が押されたときに呼ばれる */
  onOpenDetail: (spot: Spot) => void
}

/** 文字列をHTMLに安全に埋め込むための処理（< > などを無害な文字に変換する） */
function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

/** ピンをクリックしたときに出る吹き出しの中身 */
function createPopupContent(spot: Spot, onOpenDetail: (spot: Spot) => void): HTMLElement {
  const g = genre(spot.genre)
  const el = document.createElement('div')
  el.style.cssText = 'font-family:inherit;max-width:240px'
  el.innerHTML = `
    ${
      spot.image_url
        ? `<img src="${escapeHtml(spot.image_url)}" alt="" style="display:block;width:100%;height:120px;object-fit:cover;border-radius:6px;margin-bottom:8px">`
        : ''
    }
    <div style="font-weight:700;font-size:14px;margin-bottom:4px">${escapeHtml(spot.name)}</div>
    <div style="font-size:12px;color:#4b5563;margin-bottom:6px">
      ${escapeHtml(wardLabel(spot.ward))} ・ ${escapeHtml(g?.label ?? spot.genre)}
    </div>
    <div style="font-size:12px;color:#4b5563;margin-bottom:6px">
      ${escapeHtml(budgetLabel(spot.budget_band))} ・ ${escapeHtml(timeOfDayLabel(spot.time_of_day))}
    </div>
    ${
      spot.scenes.length > 0
        ? `<div style="font-size:11px;color:#334155;margin-bottom:6px">${spot.scenes
            .map((s) => `#${escapeHtml(sceneLabel(s))}`)
            .join(' ')}</div>`
        : ''
    }
    <div style="font-size:12px;line-height:1.5">${escapeHtml(spot.memo)}</div>
  `

  // 「詳しく見る」リンク。普通のクリックは画面遷移を Next.js に任せて速くし、
  // Ctrl+クリックなど（新しいタブで開く操作）はブラウザ標準の動きのままにする
  const link = document.createElement('a')
  link.href = `/spots/${spot.id}`
  link.textContent = '詳しく見る →'
  link.style.cssText =
    'display:inline-block;margin-top:8px;font-size:12px;font-weight:600;color:#0f172a;text-decoration:underline'
  link.addEventListener('click', (event) => {
    if (event.ctrlKey || event.metaKey || event.shiftKey || event.button !== 0) return
    event.preventDefault()
    onOpenDetail(spot)
  })
  el.appendChild(link)
  return el
}

export default function MapView({ spots, fitToSpots, onOpenDetail }: Props) {
  // useRef は「画面のこの場所」を覚えておくための箱。
  // 地図はこの div の中に描かれます。
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<MapLibreMap | null>(null)
  // いま置いてある吹き出しの一覧（ピン⇔サムネイルの切り替え時に位置を直すため）
  const popupsRef = useRef<Popup[]>([])
  // いまの表示が 'pin'（ピン）か 'thumb'（サムネイル）か
  const modeRef = useRef<MarkerMode>('pin')

  // 最新の onOpenDetail を覚えておく箱（LocationPicker.tsx と同じ理由）
  const onOpenDetailRef = useRef(onOpenDetail)
  useEffect(() => {
    onOpenDetailRef.current = onOpenDetail
  }, [onOpenDetail])

  // 1つめの useEffect: 画面が表示されたときに地図を1回だけ作る
  useEffect(() => {
    if (!containerRef.current) return
    if (mapRef.current) return // すでに作ってあるなら何もしない

    const map = createBaseMap(containerRef.current, { center: TOKYO_CENTER, zoom: DEFAULT_ZOOM })
    mapRef.current = map

    // ズームに合わせて、ピンとサムネイルを切り替える
    const syncMarkerMode = () => {
      const mode: MarkerMode = map.getZoom() >= THUMBNAIL_ZOOM ? 'thumb' : 'pin'
      if (mode === modeRef.current) return
      modeRef.current = mode
      map.getContainer().classList.toggle('map-thumbs', mode === 'thumb')
      popupsRef.current.forEach((popup) => popup.setOffset(popupOffsetFor(mode)))
    }
    map.on('zoom', syncMarkerMode)

    // 画面から消えるときに地図を片付ける（放置するとメモリを使い続けるため）
    return () => {
      map.remove()
      mapRef.current = null
    }
  }, [])

  // 2つめの useEffect: spots（表示するスポット）が変わるたびにピンを置き直す
  // フィルタで絞り込むたびにここが動いてピンが入れ替わります。
  useEffect(() => {
    const map = mapRef.current
    if (!map) return

    // 北にあるスポットから順に置く。後から置いたものが上に重なるので、
    // サムネイル同士が重なったとき、画面の下側（手前）にあるものが上に見えて自然になる
    const ordered = [...spots].sort((a, b) => b.lat - a.lat)
    const popups: Popup[] = []
    const markers = ordered.map((spot) => {
      const popup = new Popup({ offset: popupOffsetFor(modeRef.current), closeButton: true })
        .setDOMContent(createPopupContent(spot, (s) => onOpenDetailRef.current(s)))
      popups.push(popup)
      return new Marker({ element: createPinElement(spot), anchor: 'bottom' })
        .setLngLat([spot.lng, spot.lat]) // 経度, 緯度 の順番
        .setPopup(popup)
        .addTo(map)
    })
    popupsRef.current = popups

    // 絞り込み中は、残ったピンが全部見える位置まで地図を動かす
    if (fitToSpots && spots.length > 0) {
      const bounds = new LngLatBounds()
      spots.forEach((spot) => bounds.extend([spot.lng, spot.lat]))
      // maxZoom: ピンが1個だけのときに寄りすぎないための上限
      map.fitBounds(bounds, { padding: 80, maxZoom: 14, duration: 600 })
    }

    // 次にこの処理が動く前に、前回置いたピンを全部消す
    return () => {
      markers.forEach((m) => m.remove())
    }
  }, [spots, fitToSpots])

  return <div ref={containerRef} className="h-full w-full" />
}
