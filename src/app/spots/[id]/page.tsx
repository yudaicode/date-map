import { Suspense } from 'react'
import SpotDetailScreen from '@/components/spot/SpotDetailScreen'

/**
 * 「/spots/〇〇」= スポット詳細画面。
 * SpotDetailScreen は URL の〇〇（スポットのid）を読むため、
 * トップページと同じ理由で Suspense で囲んでいる（app/page.tsx のコメント参照）。
 */
export default function SpotDetailPage() {
  return (
    <Suspense
      fallback={<p className="p-6 text-sm text-slate-500">読み込み中…</p>}
    >
      <SpotDetailScreen />
    </Suspense>
  )
}
