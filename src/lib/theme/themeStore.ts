/**
 * 選んだテーマを、使っている端末（localStorage）に覚えておく。
 * 保存したスポット（lib/saved/savedSpots.ts）と同じ作り。
 *
 * テーマは <html data-theme="〇〇"> を付け替えるだけで画面全体に反映される。
 * 最初の表示で一瞬「標準の色」が見えてしまわないよう、開いた直後の付け替えは
 * app/layout.tsx の小さなスクリプト（THEME_BOOT_SCRIPT）が先に済ませる。
 */
import { DEFAULT_THEME_ID, isThemeId, THEMES, type ThemeId } from './themes'

export const THEME_STORAGE_KEY = 'date-map:theme:v1'

function read(): ThemeId {
  try {
    const raw = localStorage.getItem(THEME_STORAGE_KEY)
    return isThemeId(raw) ? raw : DEFAULT_THEME_ID
  } catch {
    return DEFAULT_THEME_ID
  }
}

const listeners = new Set<() => void>()

/** いま選ばれているテーマ */
export function getThemeId(): ThemeId {
  return read()
}

/** サーバー側では端末の保存場所が読めないので、最初のテーマとして扱う */
export function getServerThemeId(): ThemeId {
  return DEFAULT_THEME_ID
}

/** テーマを切り替えて覚える */
export function setThemeId(id: ThemeId): void {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, id)
  } catch {
    // 保存できない環境でも、いま開いている画面だけは切り替える
  }
  applyThemeToDocument(id)
  listeners.forEach((listener) => listener())
}

/** <html> に data-theme を付ける */
export function applyThemeToDocument(id: ThemeId): void {
  document.documentElement.dataset.theme = id
}

/**
 * テーマの変化を見張る。別のタブで切り替えた場合も反映する。
 * 戻り値は「見張るのをやめる」関数。
 */
export function subscribeTheme(callback: () => void): () => void {
  listeners.add(callback)
  const onStorage = (event: StorageEvent) => {
    if (event.key !== THEME_STORAGE_KEY) return
    applyThemeToDocument(read())
    callback()
  }
  window.addEventListener('storage', onStorage)
  return () => {
    listeners.delete(callback)
    window.removeEventListener('storage', onStorage)
  }
}

/**
 * 画面が描かれる前に実行する小さなスクリプト（app/layout.tsx の <head> に入れる）。
 * React が動き出す前なので、ここだけは普通の JavaScript の文字列で書く。
 * 知らないテーマ名が保存されていたら何もしない（＝最初のテーマのまま）。
 */
export const THEME_BOOT_SCRIPT = `try{var t=localStorage.getItem(${JSON.stringify(
  THEME_STORAGE_KEY
)});if(${JSON.stringify(THEMES.map((t) => t.id))}.indexOf(t)>=0)document.documentElement.dataset.theme=t}catch(e){}`
