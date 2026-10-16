/**
 * 詳細画面へ移る直前の「地図の絞り込み条件（URLの ? 以降）」を一時的に覚えておく。
 * 詳細画面の「地図に戻る」で、同じ条件の地図に戻すために使う。
 *
 * sessionStorage はタブを閉じると消える保存場所。
 * シークレットモードなどで使えない場合もあるので、失敗しても無視する（戻り先が "/" になるだけ）。
 */

const KEY = 'date-map:map-query'

export function saveMapQuery(search: string): void {
  try {
    sessionStorage.setItem(KEY, search)
  } catch {
    // 保存できなくても困らない
  }
}

/** 戻り先のURL。覚えていなければトップ "/" */
export function mapHrefFromMemory(): string {
  try {
    const search = sessionStorage.getItem(KEY)
    return search ? `/${search}` : '/'
  } catch {
    return '/'
  }
}
