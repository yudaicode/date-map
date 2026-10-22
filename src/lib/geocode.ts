/**
 * ブラウザから住所検索・施設検索を呼び出すための関数。
 * 実際の問い合わせは /api/geocode と /api/place-search（src/app/api/）が行う。
 */

import { WARDS, type WardId } from '@/constants/wards'

/** 施設検索の候補1件 */
export type PlaceCandidate = {
  name: string
  address: string // 例: 東京都港区芝公園四丁目（番地まで分からないことが多い）
  ward: WardId | null
  lat: number
  lng: number
  detail: string // 候補を見分けるための補足（OpenStreetMap の表記そのまま）
}

export type GeocodeResult = {
  lat: number
  lng: number
  matchedAddress: string
}

export async function geocodeAddress(address: string): Promise<GeocodeResult> {
  const response = await fetch(`/api/geocode?q=${encodeURIComponent(address)}`)
  const body = await response.json()

  if (!response.ok) {
    throw new Error(body?.error ?? '住所の変換に失敗しました。')
  }
  return body as GeocodeResult
}

/** 施設名から候補を探す。見つからなければ空の配列 */
export async function searchPlaces(name: string): Promise<PlaceCandidate[]> {
  const response = await fetch(`/api/place-search?q=${encodeURIComponent(name)}`)
  const body = await response.json()

  if (!response.ok) {
    throw new Error(body?.error ?? '施設の検索に失敗しました。')
  }
  return (body.candidates ?? []) as PlaceCandidate[]
}

/** 住所の文字列に含まれる区名から、区のidを見つける。例: 「東京都港区芝公園」→ 'minato' */
export function wardFromAddress(address: string): WardId | null {
  return WARDS.find((w) => address.includes(w.label))?.id ?? null
}
