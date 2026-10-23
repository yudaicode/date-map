/**
 * Google マップで「いまいる場所 → スポットを順番に回る」ルートを開くための URL を作る。
 * Google 公式の「Maps URLs」という仕組みで、APIキーは不要（アプリが入っていればアプリで開く）。
 * https://developers.google.com/maps/documentation/urls/get-started#directions-action
 *
 * - 出発地（origin）は書かない → Google マップが「現在地」から案内する
 * - 最後のスポットが目的地（destination）、それ以外が経由地（waypoints）
 * - 移動手段は書かない → 開いた人が電車・徒歩などを選べる
 *   （電車を選ぶと経由地は使えないことがある。Google マップ側の仕様）
 */

/** 1つのルートに入れられる数。スマホの Google マップは経由地が少ないため、目的地＋経由地3つまでにする */
export const MAX_ROUTE_STOPS = 4

export function googleMapsRouteUrl(stops: { lat: number; lng: number }[]): string | null {
  if (stops.length === 0) return null
  const points = stops.slice(0, MAX_ROUTE_STOPS).map((s) => `${s.lat},${s.lng}`)
  const destination = points.at(-1)!
  const waypoints = points.slice(0, -1)
  const params = new URLSearchParams({ api: '1', destination })
  if (waypoints.length > 0) params.set('waypoints', waypoints.join('|'))
  return `https://www.google.com/maps/dir/?${params.toString()}`
}
