import { Suspense } from 'react'
import SpotsScreen from '@/components/spot/SpotsScreen'

/**
 * SpotsScreen は URL の ?genre=cafe などを読む（useSearchParams）。
 * URL の中身は「アクセスされるまで分からない」ため、Next.js 16 では
 * Suspense（＝準備中は代わりの表示を出す枠）で囲むことが必須になっている。
 */
export default function Home() {
  return (
    <Suspense
      fallback={
        <div className="flex h-full items-center justify-center bg-slate-100 text-sm text-slate-500">
          読み込み中…
        </div>
      }
    >
      <SpotsScreen />
    </Suspense>
  )
}
