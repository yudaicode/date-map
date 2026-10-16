import AdminSpotList from '@/components/admin/AdminSpotList'

/**
 * ログイン確認が終わるまで中身を描かないため、
 * Next.js 16 の「即座に表示されるか」の検査は通りません。
 * instant = false は、それを正しく申告して検査対象から外す設定です。
 * （この設定はサーバー側のファイルにしか書けないため、
 *   画面の中身は components/admin/AdminSpotList.tsx に分けています）
 */
export const instant = false

export default function AdminSpotListPage() {
  return <AdminSpotList />
}
