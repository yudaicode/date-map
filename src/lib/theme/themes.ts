/**
 * 着せ替え（テーマ）の一覧。
 *
 * 画面の色・角の丸み・文字は globals.css の [data-theme="〇〇"] に書き、
 * ここには「名前」と「地図の見た目」など、CSS では決められないものだけを書く。
 *
 * 【新しいテーマを足すとき】
 * 1. globals.css の [data-theme="standard"] をコピーして値を変える
 * 2. 下の THEMES に1行足す（id は CSS の data-theme の名前と同じにする）
 */
import { MAP_STYLE_URL } from '@/lib/map/config'

export type Theme = {
  /** CSS の data-theme の名前と同じにする */
  id: string
  /** 着せ替えの画面に出す名前 */
  label: string
  /** 地図の見た目（OpenFreeMap のスタイルURL）。暗いテーマなら暗い地図にする */
  mapStyleUrl: string
}

export const THEMES = [
  { id: 'standard', label: 'スタンダード', mapStyleUrl: MAP_STYLE_URL },
] as const satisfies readonly Theme[]

export type ThemeId = (typeof THEMES)[number]['id']

/** 初めて開いた人に見せるテーマ */
export const DEFAULT_THEME_ID: ThemeId = 'standard'

export function isThemeId(value: unknown): value is ThemeId {
  return THEMES.some((t) => t.id === value)
}

export function themeById(id: ThemeId): Theme {
  return THEMES.find((t) => t.id === id) ?? THEMES[0]
}
