/**
 * ブラウザから住所検索を呼び出すための関数。
 * 実際の問い合わせは /api/geocode（src/app/api/geocode/route.ts）が行う。
 */

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
