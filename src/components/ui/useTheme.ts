'use client'

import { useSyncExternalStore } from 'react'

import { getServerThemeId, getThemeId, setThemeId, subscribeTheme } from '@/lib/theme/themeStore'
import { THEMES } from '@/lib/theme/themes'

/**
 * いまのテーマと、切り替える関数を画面で使うためのフック。
 * 使い方: const { themeId, setThemeId, themes } = useTheme()
 */
export function useTheme() {
  const themeId = useSyncExternalStore(subscribeTheme, getThemeId, getServerThemeId)
  return { themeId, setThemeId, themes: THEMES }
}
