import { WARDS, type WardId } from '@/constants/wards'
import { GENRES, type GenreId } from '@/constants/genres'
import { BUDGET_BANDS, type BudgetBandId } from '@/constants/budgets'
import { SCENES, type SceneId } from '@/constants/scenes'
import type { Spot } from '@/types/spot'

/**
 * スポットの絞り込み（フィルタ）のルールをここに集約する。
 *
 * 【ルール】
 * - 同じ項目の中で複数選ぶと「どれか1つに当てはまればOK」（例: 渋谷区 または 港区）
 * - 違う項目どうしは「全部に当てはまる必要がある」（例: 渋谷区 かつ カフェ）
 * - 何も選んでいない項目は「絞り込まない」
 * - シーンだけは例外で「選んだもの全部に当てはまる」（例: 雨の日OK かつ 初デート）。
 *   シーンは条件を足すほど絞りたい性質のため（雨の日を選んで晴れの日向きが出ては困る）
 *
 * 画面（React）に依存しない書き方にしてあるので、iOS版でもそのまま使い回せます。
 */

/** 時間帯の絞り込みは「昼」「夜」の2択。「昼・夜どちらも」のスポットはどちらでも表示する */
export const TIME_FILTER_OPTIONS = [
  { id: 'day', label: '昼' },
  { id: 'night', label: '夜' },
] as const

export type TimeFilterId = (typeof TIME_FILTER_OPTIONS)[number]['id']

export type SpotFilter = {
  scenes: SceneId[]
  wards: WardId[]
  genres: GenreId[]
  budgets: BudgetBandId[]
  times: TimeFilterId[]
}

export const EMPTY_FILTER: SpotFilter = {
  scenes: [],
  wards: [],
  genres: [],
  budgets: [],
  times: [],
}

export function filterSpots(spots: Spot[], filter: SpotFilter): Spot[] {
  return spots.filter(
    (spot) =>
      filter.scenes.every((scene) => spot.scenes.includes(scene)) &&
      (filter.wards.length === 0 || filter.wards.includes(spot.ward)) &&
      (filter.genres.length === 0 || filter.genres.includes(spot.genre)) &&
      (filter.budgets.length === 0 || filter.budgets.includes(spot.budget_band)) &&
      (filter.times.length === 0 ||
        spot.time_of_day === 'both' ||
        filter.times.includes(spot.time_of_day))
  )
}

/** 選んでいる条件の数（「絞り込み (3)」のような表示に使う） */
export function countActiveFilters(filter: SpotFilter): number {
  return (
    filter.scenes.length +
    filter.wards.length +
    filter.genres.length +
    filter.budgets.length +
    filter.times.length
  )
}

/** 一覧に value があれば外し、無ければ足す（ボタンのオン・オフ切り替え用） */
export function toggleValue<T>(list: T[], value: T): T[] {
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value]
}

// ------------------------------------------------------------
// URL との変換
// 絞り込み条件を URL（?ward=shibuya,minato&genre=cafe）に入れておくと、
// 詳細画面から戻ったときに条件が残り、そのURLを人に送れば同じ結果を見せられる。
// ------------------------------------------------------------

/** URL の値を読み、決められた選択肢に含まれるものだけを残す（打ち間違いや古いURL対策） */
function pick<T extends string>(raw: string | null, allowed: readonly { id: T }[]): T[] {
  if (!raw) return []
  const ids = new Set(allowed.map((a) => a.id))
  return raw.split(',').filter((v): v is T => ids.has(v as T))
}

export function filterFromSearchParams(params: URLSearchParams): SpotFilter {
  return {
    scenes: pick(params.get('scene'), SCENES),
    wards: pick(params.get('ward'), WARDS),
    genres: pick(params.get('genre'), GENRES),
    budgets: pick(params.get('budget'), BUDGET_BANDS),
    times: pick(params.get('time'), TIME_FILTER_OPTIONS),
  }
}

/** 条件を URL の ? 以降の文字列にする。条件が無ければ空文字 */
export function filterToQueryString(filter: SpotFilter): string {
  const params = new URLSearchParams()
  if (filter.scenes.length) params.set('scene', filter.scenes.join(','))
  if (filter.wards.length) params.set('ward', filter.wards.join(','))
  if (filter.genres.length) params.set('genre', filter.genres.join(','))
  if (filter.budgets.length) params.set('budget', filter.budgets.join(','))
  if (filter.times.length) params.set('time', filter.times.join(','))
  // URLSearchParams は , を %2C に変換するが、読みやすさのため元に戻す
  return params.toString().replace(/%2C/g, ',')
}
