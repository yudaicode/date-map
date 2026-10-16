import { NextResponse } from 'next/server'

/**
 * 住所 → 緯度経度 を調べる中継窓口。
 * ブラウザから /api/geocode?q=東京都渋谷区... のように呼び出します。
 *
 * 【なぜ中継するのか（ブラウザから直接呼ばない理由）】
 * 国土地理院のAPIは、別サイトのブラウザから直接呼ばれることを許可していません
 * （CORSという仕組みによる制限）。そこで、いったん自分のサーバーが代わりに
 * 問い合わせて、その結果をブラウザへ返しています。
 *
 * 【使っているAPI】
 * 国土地理院「住所検索API」。APIキー不要・無料・日本の住所に強い。
 */

const GSI_ENDPOINT = 'https://msearch.gsi.go.jp/address-search/AddressSearch'

// 東京23区のおおよその範囲（これを外れたら住所の書き間違いの可能性が高い）
const TOKYO_BOUNDS = { minLat: 35.4, maxLat: 35.95, minLng: 139.4, maxLng: 140.05 }

type GsiFeature = {
  geometry?: { coordinates?: [number, number] } // [経度, 緯度] の順
  properties?: { title?: string }
}

export async function GET(request: Request) {
  const query = new URL(request.url).searchParams.get('q')?.trim()

  if (!query) {
    return NextResponse.json({ error: '住所を入力してください。' }, { status: 400 })
  }

  let features: GsiFeature[]
  try {
    const response = await fetch(`${GSI_ENDPOINT}?q=${encodeURIComponent(query)}`, {
      cache: 'no-store',
      signal: AbortSignal.timeout(10_000), // 10秒で打ち切る
    })

    if (!response.ok) {
      return NextResponse.json(
        { error: `住所検索サービスが応答しませんでした（${response.status}）。` },
        { status: 502 }
      )
    }
    features = (await response.json()) as GsiFeature[]
  } catch {
    return NextResponse.json(
      { error: '住所検索サービスに接続できませんでした。時間をおいて再度お試しください。' },
      { status: 502 }
    )
  }

  const coordinates = features?.[0]?.geometry?.coordinates
  if (!coordinates) {
    return NextResponse.json(
      { error: '住所が見つかりませんでした。「東京都」から始まる表記や、番地までの入力をお試しください。' },
      { status: 404 }
    )
  }

  const [lng, lat] = coordinates

  if (
    lat < TOKYO_BOUNDS.minLat || lat > TOKYO_BOUNDS.maxLat ||
    lng < TOKYO_BOUNDS.minLng || lng > TOKYO_BOUNDS.maxLng
  ) {
    return NextResponse.json(
      { error: '東京23区の範囲外の住所のようです。住所をご確認ください。' },
      { status: 422 }
    )
  }

  return NextResponse.json({
    lat,
    lng,
    matchedAddress: features[0]?.properties?.title ?? query,
  })
}
