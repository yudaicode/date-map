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
        投稿URLを読み込む → スポット名を入れて「施設名で位置を検索」の順が早いです。見つからなければ住所から位置を取得できます。
      </p>

      <div className="mt-6">
        <SpotForm />
      </div>
    </div>
  )
}
