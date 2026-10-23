'use client'

import { useEffect, useRef } from 'react'
import { Marker } from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'

import type { Spot } from '@/types/spot'
import { createBaseMap, createPinElement } from './mapParts'

/** 詳細画面に出す、スポット1件だけの小さな地図 */
export default function SpotLocationMap({ spot }: { spot: Spot }) {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!containerRef.current) return

    const map = createBaseMap(containerRef.current, {
      center: [spot.lng, spot.lat],
      zoom: 15,
      cooperativeGestures: true, // ページのスクロールを邪魔しないため
    })
    new Marker({ element: createPinElement(spot), anchor: 'bottom' }).setLngLat([spot.lng, spot.lat]).addTo(map)

    return () => map.remove()
  }, [spot])

  return <div ref={containerRef} className="h-64 w-full rounded-lg border border-line" />
}
