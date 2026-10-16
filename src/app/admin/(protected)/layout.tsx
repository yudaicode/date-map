import type { ReactNode } from 'react'
import AdminGuard from '@/components/admin/AdminGuard'

/**
 * ログインが必要なページをまとめる枠。
 *
 * 【フォルダ名の (protected) というカッコについて】
 * Next.js では、カッコで囲んだフォルダ名は URL に含まれません。
 * つまり (protected)/page.tsx は /admin/(protected) ではなく /admin になります。
 * 「URLは変えずに、ここから下だけ共通処理をかけたい」ときに使う書き方です。
 * ログイン画面 /admin/login はこの枠の外にあるので、門番の対象になりません
 * （対象にしてしまうと、ログイン画面に入れずぐるぐる回ってしまいます）。
 */
export default function ProtectedLayout({ children }: { children: ReactNode }) {
  return <AdminGuard>{children}</AdminGuard>
}
