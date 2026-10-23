/**
 * 「保存したスポット」の一覧を、使っている端末（ブラウザの localStorage）に保存する。
 *
 * 【なぜ1つのファイルにまとめるのか】
 * 将来、会員登録して保存（どの端末でも同じ一覧）に切り替える予定。
 * 保存の読み書きをここだけで行っておけば、切り替えるときに直すのはこのファイルだけで済む。
 *
 * 【注意】localStorage は「その端末のそのブラウザ」だけの保存場所。
 * 機種変更・履歴の削除・シークレットモードでは消える（または保存できない）。
 * 保存できない環境でも画面が壊れないよう、失敗はすべて無視する。
 */

const KEY = 'date-map:saved:v1'

export type SavedEntry = {
  id: string // スポットの id
  savedAt: string // 保存した日時（新しい順に並べるため）
}

const EMPTY: SavedEntry[] = []

// 同じ中身なら同じ一覧を返すための覚え書き。
// （React は「前回と別物の一覧」を受け取ると画面を描き直すので、毎回作り直すと無限に描き直してしまう）
let cachedRaw: string | null = null
let cachedList: SavedEntry[] = EMPTY

function read(): SavedEntry[] {
  let raw: string | null = null
  try {
    raw = localStorage.getItem(KEY)
  } catch {
    return EMPTY
  }
  if (raw === cachedRaw) return cachedList

  cachedRaw = raw
  try {
    const data: unknown = raw ? JSON.parse(raw) : []
    cachedList = Array.isArray(data)
      ? data.filter(
          (e): e is SavedEntry =>
            typeof e === 'object' && e !== null && typeof e.id === 'string' && typeof e.savedAt === 'string'
        )
      : EMPTY
  } catch {
    cachedList = EMPTY // 壊れたデータは空として扱う
  }
  return cachedList
}

// 同じ画面の中で「保存が変わった」ことを知らせる相手の一覧
const listeners = new Set<() => void>()

function write(list: SavedEntry[]): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(list))
  } catch {
    // 保存できない環境（容量不足・シークレットモード等）では何もしない
  }
  listeners.forEach((listener) => listener())
}

/** 保存した一覧（新しい順） */
export function getSavedEntries(): SavedEntry[] {
  return read()
}

/** サーバー側で画面を組み立てるときは端末の保存場所が読めないので、空として扱う */
export function getServerSavedEntries(): SavedEntry[] {
  return EMPTY
}

export function isSaved(id: string): boolean {
  return read().some((e) => e.id === id)
}

export function saveSpot(id: string): void {
  if (isSaved(id)) return
  write([{ id, savedAt: new Date().toISOString() }, ...read()])
}

export function unsaveSpot(id: string): void {
  write(read().filter((e) => e.id !== id))
}

export function toggleSaved(id: string): void {
  if (isSaved(id)) unsaveSpot(id)
  else saveSpot(id)
}

/**
 * 保存の変化を見張る。変わったら callback が呼ばれる。
 * 別のタブで保存した場合も "storage" という知らせで分かる。
 * 戻り値は「見張るのをやめる」関数。
 */
export function subscribeSaved(callback: () => void): () => void {
  listeners.add(callback)
  const onStorage = (event: StorageEvent) => {
    if (event.key === KEY) callback()
  }
  window.addEventListener('storage', onStorage)
  return () => {
    listeners.delete(callback)
    window.removeEventListener('storage', onStorage)
  }
}
