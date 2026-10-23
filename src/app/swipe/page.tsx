import { Suspense } from 'react'
import type { Metadata } from 'next'
import SwipeScreen from '@/components/swipe/SwipeScreen'

export const metadata: Metadata = {
  title: 'スワイプで選ぶ | デートマップ',
}

/** SwipeScreen は URL の条件を読む（useSearchParams）ため Suspense で囲む。理由は app/page.tsx を参照 */
export default function SwipePage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-full items-center justify-center bg-canvas text-sm text-muted">
          読み込み中…
        </div>
      }
    >
      <SwipeScreen />
    </Suspense>
  )
}
