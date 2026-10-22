import type { WardId } from '@/constants/wards'
import type { GenreId } from '@/constants/genres'
import type { BudgetBandId } from '@/constants/budgets'
import type { TimeOfDayId } from '@/constants/timeOfDay'
import type { SceneId } from '@/constants/scenes'

/**
 * スポット1件のデータの形。
 *
 * 【なぜ列名が snake_case（単語を _ でつなぐ書き方）なのか】
 * Phase 2 で使う Supabase（データベース）の列名に完全に一致させています。
 * 一致させておくと「DBから取ってきた値を詰め替える処理」を書かずに済み、
 * 詰め替えミスによるバグが起きません。
 * 将来の iOS アプリ版でも、このファイルをそのまま使い回せます。
 */
export type Spot = {
  id: string
  name: string
  address: string
  ward: WardId
  genre: GenreId
  budget_band: BudgetBandId
  time_of_day: TimeOfDayId
  scenes: SceneId[] // シーン（タグ）。複数付けられる。無ければ空の一覧 []
  memo: string
  lat: number // 緯度（南北。東京は 35.6 くらい）
  lng: number // 経度（東西。東京は 139.7 くらい）
  instagram_url: string | null // 元投稿リンク。無ければ null
  tiktok_url: string | null
  // 写真（地図のサムネイル用）。管理画面でアップロードした写真のURL。無ければ null
  // 他人のSNS投稿の画像は使わない（自分で撮った写真か、掲載の許可をもらった写真だけ）
  image_url: string | null
  is_published: boolean // false なら下書き（一般公開されない）
}
