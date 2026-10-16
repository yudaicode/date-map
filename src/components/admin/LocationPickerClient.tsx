'use client'

import dynamic from 'next/dynamic'

/**
 * LocationPicker をブラウザ側だけで読み込むための包み紙。
 * 理由は MapViewClient.tsx と同じ（地図はサーバーでは組み立てられないため）。
 */
const LocationPicker = dynamic(() => import('./LocationPicker'), {
  ssr: false,
  loading: () => (
    <div className="flex h-64 w-full items-center justify-center rounded-lg border border-slate-200 bg-slate-100 text-sm text-slate-500">
      地図を読み込み中…
    </div>
  ),
})

export default function LocationPickerClient(props: {
  lat: number
  lng: number
  onChange: (lat: number, lng: number) => void
}) {
  return <LocationPicker {...props} />
}
