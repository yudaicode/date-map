'use client'

import { useEffect, useRef } from 'react'
import { getVersion, MapLibreMap, Marker, NavigationControl, setWorkerUrl } from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'

import {
  MAP_ATTRIBUTION,
  MAP_STYLE_URL,
  MAPLIBRE_WORKER_PATH,
  TOKYO_23KU_BOUNDS,
} from '@/lib/map/config'

type Props = {
  lat: number
  lng: number
  onChange: (lat: number, lng: number) => void
}

/**
 * ピンをドラッグして位置を微調整するための小さな地図。
 *
 * 住所からの自動取得は、建物の裏や道路の中心にズレることがあります。
 * 最後は目で見て直せるようにしておくのが、結局いちばん速くて正確です。
 */
export default function LocationPicker({ lat, lng, onChange }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<MapLibreMap | null>(null)
  const markerRef = useRef<Marker | null>(null)

  // 最新の onChange を覚えておく箱。
  // これが無いと、地図を作り直すたびに古い関数を呼んでしまう。
  // 書き換えは useEffect の中で行う（画面を描いている最中に書き換えると
  // 表示が更新されない不具合の原因になるため）。
  const onChangeRef = useRef(onChange)
  useEffect(() => {
    onChangeRef.current = onChange
  }, [onChange])

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return

    setWorkerUrl(`${MAPLIBRE_WORKER_PATH}?v=${getVersion()}`)

    const map = new MapLibreMap({
      container: containerRef.current,
      style: MAP_STYLE_URL,
      center: [lng, lat],
      zoom: 16,
      maxBounds: TOKYO_23KU_BOUNDS,
      attributionControl: { customAttribution: MAP_ATTRIBUTION },
    })
    map.addControl(new NavigationControl(), 'top-right')

    // draggable: true でピンをつまんで動かせるようになる
    const marker = new Marker({ draggable: true, color: '#e11d48' })
      .setLngLat([lng, lat])
      .addTo(map)

    marker.on('dragend', () => {
      const position = marker.getLngLat()
      // 小数6桁 ≒ 約10cmの精度。これ以上は不要なので丸める
      onChangeRef.current(
        Number(position.lat.toFixed(6)),
        Number(position.lng.toFixed(6))
      )
    })

    // 地図をクリックした場所にもピンを移動できる
    map.on('click', (event) => {
      marker.setLngLat(event.lngLat)
      onChangeRef.current(
        Number(event.lngLat.lat.toFixed(6)),
        Number(event.lngLat.lng.toFixed(6))
      )
    })

    mapRef.current = map
    markerRef.current = marker

    return () => {
      map.remove()
      mapRef.current = null
      markerRef.current = null
    }
    // 初回だけ作る。以降の座標変更は下の useEffect が担当する
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // 「住所から座標を取得」ボタンなどで外から座標が変わったら、ピンと地図を追従させる
  useEffect(() => {
    const map = mapRef.current
    const marker = markerRef.current
    if (!map || !marker) return

    const current = marker.getLngLat()
    // ほぼ同じ位置なら動かさない（ドラッグ直後に地図が跳ねるのを防ぐ）
    if (Math.abs(current.lat - lat) < 1e-7 && Math.abs(current.lng - lng) < 1e-7) return

    marker.setLngLat([lng, lat])
    map.easeTo({ center: [lng, lat], duration: 500 })
  }, [lat, lng])

  return <div ref={containerRef} className="h-64 w-full rounded-lg border border-slate-200" />
}
