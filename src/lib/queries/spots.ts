import { getSupabase } from '@/lib/supabase/client'
import type { Spot } from '@/types/spot'

/**
 * スポットの取得・保存処理をこのファイルに集約する。
 *
 * 【なぜ1か所にまとめるのか】
 * 画面のあちこちでデータベースを直接触ると、仕様変更のときに全部直す羽目になります。
 * ここに集約しておけば、将来 iOS アプリ版を作るときも、このファイルをほぼそのまま
 * 持っていくだけで済みます。
 */

/** 新規登録・編集時に渡すデータ（id や日時は自動で付くので含めない） */
export type SpotInput = Omit<Spot, 'id'>

const TABLE = 'spots'

/** 一般公開用: 公開済みのスポットだけを取得 */
export async function fetchPublishedSpots(): Promise<Spot[]> {
  const { data, error } = await getSupabase()
    .from(TABLE)
    .select('*')
    .eq('is_published', true)
    .order('created_at', { ascending: false })

  if (error) throw new Error(`スポットの取得に失敗しました: ${error.message}`)
  return (data ?? []) as Spot[]
}

/** 管理用: 下書きも含めて全件取得（ログインしていないとRLSにより0件になる） */
export async function fetchAllSpots(): Promise<Spot[]> {
  const { data, error } = await getSupabase()
    .from(TABLE)
    .select('*')
    .order('created_at', { ascending: false })

  if (error) throw new Error(`スポットの取得に失敗しました: ${error.message}`)
  return (data ?? []) as Spot[]
}

/** 1件だけ取得。見つからなければ null */
export async function fetchSpot(id: string): Promise<Spot | null> {
  const { data, error } = await getSupabase()
    .from(TABLE)
    .select('*')
    .eq('id', id)
    .maybeSingle() // 0件でもエラーにしない

  if (error) throw new Error(`スポットの取得に失敗しました: ${error.message}`)
  return (data as Spot) ?? null
}

/** 新規登録 */
export async function createSpot(input: SpotInput): Promise<Spot> {
  const { data, error } = await getSupabase()
    .from(TABLE)
    .insert(input)
    .select()
    .single()

  if (error) throw new Error(`登録に失敗しました: ${error.message}`)
  return data as Spot
}

/** 編集 */
export async function updateSpot(id: string, input: SpotInput): Promise<Spot> {
  const { data, error } = await getSupabase()
    .from(TABLE)
    .update(input)
    .eq('id', id)
    .select()
    .single()

  if (error) throw new Error(`更新に失敗しました: ${error.message}`)
  return data as Spot
}

/** 削除 */
export async function deleteSpot(id: string): Promise<void> {
  const { error } = await getSupabase().from(TABLE).delete().eq('id', id)
  if (error) throw new Error(`削除に失敗しました: ${error.message}`)
}
