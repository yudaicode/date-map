import Link from 'next/link'
import SpotForm from '@/components/admin/SpotForm'

// 理由は /admin/(protected)/page.tsx のコメントを参照
export const instant = false

export default function NewSpotPage() {
  return (
    <div>
      <Link href="/admin" className="text-xs text-slate-500 hover:text-slate-900">
        ← 一覧に戻る
      </Link>
      <h1 className="mt-2 text-lg font-bold tracking-tight">スポットを新規登録</h1>
      <p className="mt-1 text-xs text-slate-500">
        住所を入れて「住所から位置を取得」を押すと、地図のピンが自動で移動します。
      </p>

      <div className="mt-6">
        <SpotForm />
      </div>
    </div>
  )
}
