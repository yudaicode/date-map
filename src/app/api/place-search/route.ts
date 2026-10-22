import { NextResponse } from 'next/server'

import { WARDS } from '@/constants/wards'
import type { PlaceCandidate } from '@/lib/geocode'

/**
 * 施設名・店名 → 住所と緯度経度の候補 を調べる中継窓口。
 * ブラウザから /api/place-search?q=東京タワー のように呼び出します。
 *
 * 【使っているAPI】
 * OpenStreetMap の検索サービス「Nominatim」。無料・キー不要。
 * 有名な施設には強いが、小さな店は登録されていないことが多い。
 *
 * 【利用ルール（守らないと使えなくなる）】
 * - 1秒に1回まで。入力のたびに検索する作りにはせず、ボタンを押したときだけ呼ぶ
 * - どのアプリからの利用か分かる名前（User-Agent）を付ける
 * - 結果を使う画面では OpenStreetMap の出典を示す（地図の右下に表示済み）
 */

const ENDPOINT = 'https://nominatim.openstreetmap.org/search'
const USER_AGENT = 'date-map/0.1 (https://date-map-murex.vercel.app)'

// 23区とその周辺だけを検索する枠（左・上・右・下）
const VIEWBOX = '139.56,35.82,139.93,35.52'

type NominatimResult = {
  name?: string
  display_name?: string
  lat?: string
  lon?: string
  category?: string
  type?: string
  address?: Record<string, string>
}

/** OpenStreetMap の住所の部品を、日本式の住所の順番に並べ直す */
function toJapaneseAddress(address: Record<string, string>): string {
  const city = address.city ?? address.city_district ?? ''
  const town = address.neighbourhood ?? address.quarter ?? address.suburb ?? ''
  const number = address.house_number ?? ''
  return `東京都${city}${town}${number}`
}

export async function GET(request: Request) {
  const query = new URL(request.url).searchParams.get('q')?.trim()

  if (!query) {
    return NextResponse.json({ error: '施設名を入力してください。' }, { status: 400 })
  }

  let results: NominatimResult[]
  try {
    const params = new URLSearchParams({
      q: query,
      format: 'jsonv2',
      countrycodes: 'jp',
      viewbox: VIEWBOX,
      bounded: '1', // 枠の外は探さない
      limit: '5',
      'accept-language': 'ja',
      addressdetails: '1',
    })
    const response = await fetch(`${ENDPOINT}?${params}`, {
      headers: { 'User-Agent': USER_AGENT },
      cache: 'no-store',
      signal: AbortSignal.timeout(10_000),
    })
    if (!response.ok) {
      return NextResponse.json(
        { error: `施設検索サービスが応答しませんでした（${response.status}）。少し待ってから再度お試しください。` },
        { status: 502 }
      )
    }
    results = (await response.json()) as NominatimResult[]
  } catch {
    return NextResponse.json(
      { error: '施設検索サービスに接続できませんでした。時間をおいて再度お試しください。' },
      { status: 502 }
    )
  }

  const candidates: PlaceCandidate[] = results
    .filter((r) => r.lat && r.lon)
    .map((r) => {
      const address = r.address ?? {}
      const cityLabel = address.city ?? address.city_district ?? ''
      return {
        name: r.name || query,
        address: toJapaneseAddress(address),
        ward: WARDS.find((w) => w.label === cityLabel)?.id ?? null,
        lat: Number(Number(r.lat).toFixed(6)),
        lng: Number(Number(r.lon).toFixed(6)),
        detail: r.display_name ?? '',
      }
    })

  return NextResponse.json({ candidates })
}
