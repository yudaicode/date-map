'use client'

import { useMemo, useSyncExternalStore } from 'react'

import {
  getSavedEntries,
  getServerSavedEntries,
  subscribeSaved,
  toggleSaved,
} from '@/lib/saved/savedSpots'

/**
 * 保存したスポットを画面で使うための部品（React のフック）。
 * useSyncExternalStore は「React の外にある値（ここでは localStorage）」を、
 * 変わったら画面に自動で反映させる仕組み。
 */
export function useSavedSpots() {
  const entries = useSyncExternalStore(subscribeSaved, getSavedEntries, getServerSavedEntries)
  const savedIds = useMemo(() => new Set(entries.map((e) => e.id)), [entries])
  return { entries, savedIds, toggleSaved }
}
