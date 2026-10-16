import type { ReactNode } from 'react'
import Link from 'next/link'

/**
 * 管理画面の共通の外枠（ヘッダーなど）。
 * ログインの確認は、この下の (protected) フォルダの layout が担当します。
 */
export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-full flex-col bg-slate-50">
      <header className="shrink-0 border-b border-slate-200 bg-white px-4 py-3">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3">
          <Link href="/admin" className="text-sm font-bold tracking-tight">
            デートマップ 管理画面
          </Link>
          <Link
            href="/"
            className="text-xs text-slate-500 transition-colors hover:text-slate-900"
          >
            地図を見る →
          </Link>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-3xl px-4 py-6">{children}</div>
      </div>
    </div>
  )
}
