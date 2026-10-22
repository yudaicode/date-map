import { WARDS } from '@/constants/wards'
import { GENRES } from '@/constants/genres'
import { BUDGET_BANDS } from '@/constants/budgets'
import { TIME_OF_DAY } from '@/constants/timeOfDay'
import { SCENES, type SceneId } from '@/constants/scenes'
import { detectSnsPlatform, normalizeSnsUrl } from '@/lib/sns'
import type { SpotInput } from '@/lib/queries/spots'

/**
 * 一括登録で貼り付けたデータ（JSON）を検査して、保存できる形に整える。
 *
 * 【受け付ける形】スポットの一覧（[ {...}, {...} ]）。1件の例:
 * {
 *   "name": "SHIBUYA SKY",
 *   "address": "東京都渋谷区渋谷2-24-12",
 *   "ward": "shibuya",            ← "渋谷区" のような日本語でもOK
 *   "genre": "nightview",         ← "夜景" でもOK
 *   "budget_band": "b3000_6000",  ← "3,000〜6,000円" でもOK
 *   "time_of_day": "night",       ← "夜" でもOK
 *   "scenes": ["anniversary"],    ← "記念日" でもOK。無ければ省略可
 *   "memo": "…",
 *   "lat": 35.658, "lng": 139.7016,
 *   "instagram_url": null, "tiktok_url": "https://www.tiktok.com/@…/video/…"
 * }
 *
 * DB側にも同じ制約があるが、ここで先に検査すると「どの行の何がダメか」を日本語で出せる。
 */

export type ParsedRow = {
  input: SpotInput | null // 問題がなければ保存用のデータ
  errors: string[] // 問題の一覧（日本語）
  raw: unknown
}

type Option<T extends string> = { id: T; label: string }

/** id（英字）でも label（日本語）でも受け付ける */
function pickOption<T extends string>(value: unknown, options: readonly Option<T>[]): T | null {
  if (typeof value !== 'string') return null
  const v = value.trim()
  return options.find((o) => o.id === v || o.label === v)?.id ?? null
}

function asText(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

function asNumber(value: unknown): number | null {
  const n = typeof value === 'string' ? Number(value) : value
  return typeof n === 'number' && Number.isFinite(n) ? n : null
}

/** SNSのURL欄。空なら null、違うSNSのURLならエラー */
function snsField(
  value: unknown,
  platform: 'instagram' | 'tiktok',
  errors: string[]
): string | null {
  const text = asText(value)
  if (!text) return null
  if (detectSnsPlatform(text) !== platform) {
    errors.push(`${platform === 'instagram' ? 'Instagram' : 'TikTok'} のURLではありません: ${text}`)
    return null
  }
  return normalizeSnsUrl(text)
}

export function parseSpotRow(raw: unknown, isPublished: boolean): ParsedRow {
  const errors: string[] = []
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
    return { input: null, errors: ['{ } で囲まれた1件分のデータになっていません'], raw }
  }
  const r = raw as Record<string, unknown>

  const name = asText(r.name)
  if (!name) errors.push('name（スポット名）が空です')

  const address = asText(r.address)
  if (!address) errors.push('address（住所）が空です')

  const ward = pickOption(r.ward, WARDS)
  if (!ward) errors.push(`ward（区）が正しくありません: ${String(r.ward)}`)

  const genre = pickOption(r.genre, GENRES)
  if (!genre) errors.push(`genre（ジャンル）が正しくありません: ${String(r.genre)}`)

  const budget = pickOption(r.budget_band, BUDGET_BANDS)
  if (!budget) errors.push(`budget_band（予算帯）が正しくありません: ${String(r.budget_band)}`)

  const time = pickOption(r.time_of_day, TIME_OF_DAY)
  if (!time) errors.push(`time_of_day（時間帯）が正しくありません: ${String(r.time_of_day)}`)

  const scenes: SceneId[] = []
  if (r.scenes !== undefined && r.scenes !== null) {
    if (!Array.isArray(r.scenes)) {
      errors.push('scenes（シーン）は ["初デート", "映え"] のような一覧で書いてください')
    } else {
      for (const value of r.scenes) {
        const scene = pickOption(value, SCENES)
        if (!scene) errors.push(`scenes に知らないシーンがあります: ${String(value)}`)
        else if (!scenes.includes(scene)) scenes.push(scene)
      }
    }
  }

  // 緯度・経度。23区からかけ離れた値は入力ミスとみなす（DBの制約と同じ範囲）
  const lat = asNumber(r.lat)
  const lng = asNumber(r.lng)
  if (lat === null || lat < 35.4 || lat > 35.95) errors.push(`lat（緯度）が東京23区の範囲外です: ${String(r.lat)}`)
  if (lng === null || lng < 139.4 || lng > 140.05) errors.push(`lng（経度）が東京23区の範囲外です: ${String(r.lng)}`)

  const instagram_url = snsField(r.instagram_url, 'instagram', errors)
  const tiktok_url = snsField(r.tiktok_url, 'tiktok', errors)

  if (errors.length > 0 || !ward || !genre || !budget || !time || lat === null || lng === null) {
    return { input: null, errors, raw }
  }

  return {
    input: {
      name,
      address,
      ward,
      genre,
      budget_band: budget,
      time_of_day: time,
      scenes,
      memo: asText(r.memo),
      lat: Number(lat.toFixed(6)),
      lng: Number(lng.toFixed(6)),
      instagram_url,
      tiktok_url,
      // 写真は一括登録では受け付けない（ネット上の画像のURLを貼れてしまうため）。
      // 写真は1件ずつ編集画面でアップロードする
      image_url: null,
      is_published: isPublished,
    },
    errors: [],
    raw,
  }
}

/** 貼り付けた文字全体を読む。JSONとして読めなければ error を返す */
export function parseBulkText(
  text: string,
  isPublished: boolean
): { rows: ParsedRow[]; error: string | null } {
  // 私（Claude）が ```json ... ``` で囲んで渡した場合も、そのまま貼れるようにする
  const cleaned = text.trim().replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '')
  if (!cleaned) return { rows: [], error: null }

  let data: unknown
  try {
    data = JSON.parse(cleaned)
  } catch {
    return {
      rows: [],
      error: 'データの形式が読み取れません。[ で始まり ] で終わる全体をコピーして貼り付けてください。',
    }
  }

  const list = Array.isArray(data) ? data : [data]
  return { rows: list.map((raw) => parseSpotRow(raw, isPublished)), error: null }
}
