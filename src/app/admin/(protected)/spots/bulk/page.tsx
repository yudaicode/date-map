import Link from 'next/link'
import BulkImportScreen from '@/components/admin/BulkImportScreen'

// 理由は /admin/(protected)/page.tsx のコメントを参照
export const instant = false

export default function BulkImportPage() {
  return (
    <div>
      <Link href="/admin" className="text-xs text-slate-500 hover:text-slate-900">
        ← 一覧に戻る
      </Link>
      <h1 className="mt-2 text-lg font-bold tracking-tight">まとめて登録</h1>
      <p className="mt-1 text-xs text-slate-500">
        Claude に調べてもらった登録用データを貼り付けると、中身を確認してから一度に登録できます。
      </p>

      <div className="mt-6">
        <BulkImportScreen />
      </div>
    </div>
  )
}
