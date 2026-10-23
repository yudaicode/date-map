'use client'

import dynamic from 'next/dynamic'
import type { Spot } from '@/types/spot'

/**
 * SpotLocationMap をブラウザ側だけで読み込むための包み紙。
 * 理由は MapViewClient.tsx と同じ（地図はサーバーでは組み立てられないため）。
 */
const SpotLocationMap = dynamic(() => import('./SpotLocationMap'), {
  ssr: false,
  loading: () => (
    <div className="flex h-64 w-full items-center justify-center rounded-lg border border-line bg-sunken text-sm text-muted">
      地図を読み込み中…
    </div>
  ),
})

export default function SpotLocationMapClient({ spot }: { spot: Spot }) {
  return <SpotLocationMap spot={spot} />
}
