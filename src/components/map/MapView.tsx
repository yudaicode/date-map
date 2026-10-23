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
  /** 保存したスポットの id。保存したスポットはズームに関係なく常にサムネイルで出す */
  savedIds: Set<string>
  /** 吹き出しの「♡ 保存」が押されたときに呼ばれる */
  onToggleSave: (spot: Spot) => void
}

/** 置いた目印1個分の部品。保存の状態が変わったときに見た目を直すために覚えておく */
type MarkerEntry = {
  element: HTMLElement
  popup: Popup
  saveButton: HTMLButtonElement
}

/**
 * 目印の見た目を、いまのズームと保存の状態に合わせる。
 * 保存したスポットは、引いた地図でもサムネイル＋♥ で目立たせる。
 */
function applyMarkerState(entries: Map<string, MarkerEntry>, savedIds: Set<string>, zoomMode: MarkerMode) {
  entries.forEach((entry, id) => {
    const saved = savedIds.has(id)
    entry.element.classList.toggle('is-saved', saved)
    entry.popup.setOffset(popupOffsetFor(saved && zoomMode === 'pin' ? 'mini' : zoomMode))
    entry.saveButton.textContent = saved ? '♥ 保存済み' : '♡ 保存'
    entry.saveButton.setAttribute('aria-pressed', String(saved))
    entry.saveButton.style.color = saved ? '#e11d48' : '#0f172a'
  })
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
function createPopupContent(
  spot: Spot,
  onOpenDetail: (spot: Spot) => void,
  onToggleSave: (spot: Spot) => void
): { el: HTMLElement; saveButton: HTMLButtonElement } {
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
    'font-size:12px;font-weight:600;color:#0f172a;text-decoration:underline'
  link.addEventListener('click', (event) => {
    if (event.ctrlKey || event.metaKey || event.shiftKey || event.button !== 0) return
    event.preventDefault()
    onOpenDetail(spot)
  })

  // 保存ボタン。文字（♡ 保存 / ♥ 保存済み）は applyMarkerState が書き換える
  const saveButton = document.createElement('button')
  saveButton.type = 'button'
  saveButton.style.cssText =
    'font-size:12px;font-weight:700;padding:6px 10px;border:1px solid #e2e8f0;border-radius:9999px;background:#fff;cursor:pointer'
  saveButton.addEventListener('click', () => onToggleSave(spot))

  const actions = document.createElement('div')
  actions.style.cssText =
    'display:flex;align-items:center;justify-content:space-between;gap:8px;margin-top:8px'
  actions.append(link, saveButton)
  el.appendChild(actions)
  return { el, saveButton }
}

export default function MapView({ spots, fitToSpots, onOpenDetail, savedIds, onToggleSave }: Props) {
  // useRef は「画面のこの場所」を覚えておくための箱。
  // 地図はこの div の中に描かれます。
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<MapLibreMap | null>(null)
  // いま置いてある目印の一覧（スポットの id → 部品）。ズームや保存の変化で見た目を直すため
  const entriesRef = useRef(new Map<string, MarkerEntry>())
  // いまのズームでの表示が 'pin'（ピン）か 'thumb'（サムネイル）か
  const modeRef = useRef<MarkerMode>('pin')
  const savedIdsRef = useRef(savedIds)

  // 最新の onOpenDetail / onToggleSave を覚えておく箱（LocationPicker.tsx と同じ理由）
  const onOpenDetailRef = useRef(onOpenDetail)
  const onToggleSaveRef = useRef(onToggleSave)
  useEffect(() => {
    onOpenDetailRef.current = onOpenDetail
    onToggleSaveRef.current = onToggleSave
  }, [onOpenDetail, onToggleSave])

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
      applyMarkerState(entriesRef.current, savedIdsRef.current, mode)
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
    const entries = new Map<string, MarkerEntry>()
    const markers = ordered.map((spot) => {
      const { el, saveButton } = createPopupContent(
        spot,
        (s) => onOpenDetailRef.current(s),
        (s) => onToggleSaveRef.current(s)
      )
      const popup = new Popup({ closeButton: true }).setDOMContent(el)
      const element = createPinElement(spot)
      entries.set(spot.id, { element, popup, saveButton })
      return new Marker({ element, anchor: 'bottom' })
        .setLngLat([spot.lng, spot.lat]) // 経度, 緯度 の順番
        .setPopup(popup)
        .addTo(map)
    })
    entriesRef.current = entries
    applyMarkerState(entries, savedIdsRef.current, modeRef.current)

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

  // 3つめの useEffect: 保存が変わったら、目印を作り直さずに見た目（サムネイル・♥）だけ直す
  useEffect(() => {
    savedIdsRef.current = savedIds
    applyMarkerState(entriesRef.current, savedIds, modeRef.current)
  }, [savedIds])

  return <div ref={containerRef} className="h-full w-full" />
}
