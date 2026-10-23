/**
 * 着せ替え（テーマ）の一覧。
 *
 * 画面の色・角の丸み・文字は globals.css の [data-theme="〇〇"] に書き、
 * ここには「名前」と「地図の見た目」など、CSS では決められないものだけを書く。
 *
 * 【新しいテーマを足すとき】
 * 1. globals.css の [data-theme="pop"] などをコピーして値を変える
 * 2. 下の THEMES に1行足す（id は CSS の data-theme の名前と同じにする）
 */

import { MAP_STYLES } from '@/lib/map/config'

export type Theme = {
  /** CSS の data-theme の名前と同じにする */
  id: string
  /** 着せ替えの画面に出す名前 */
  label: string
  /** 着せ替えの画面に出す、ひとことの説明 */
  description: string
  /** 地図の見た目（OpenFreeMap のスタイルURL）。暗いテーマなら暗い地図にする */
  mapStyleUrl: string
}

/** 着せ替えの画面に並ぶ順番 */
export const THEMES = [
  {
    id: 'pop',
    label: '甘めポップ',
    description: 'ピンク〜オレンジ、まんまるで明るい',
    mapStyleUrl: MAP_STYLES.positron,
  },
  {
    id: 'night',
    label: '夜デート',
    description: '黒にネオン。夜景・ディナーが映える',
    mapStyleUrl: MAP_STYLES.dark,
  },
  {
    id: 'magazine',
    label: '雑誌風',
    description: '生成りの紙に明朝。落ち着いた大人っぽさ',
    mapStyleUrl: MAP_STYLES.positron,
  },
  {
    id: 'standard',
    label: 'シンプル',
    description: '白×ローズのすっきりした見た目',
    mapStyleUrl: MAP_STYLES.liberty,
  },
] as const satisfies readonly Theme[]

export type ThemeId = (typeof THEMES)[number]['id']

/** 初めて開いた人に見せるテーマ（2026-10-23 オーナー決定: 甘めポップ） */
export const DEFAULT_THEME_ID: ThemeId = 'pop'

export function isThemeId(value: unknown): value is ThemeId {
  return THEMES.some((t) => t.id === value)
}

export function themeById(id: ThemeId): Theme {
  return THEMES.find((t) => t.id === id) ?? THEMES[0]
}
