'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'

import SpotThumb from '@/components/spot/SpotThumb'
import { useSavedSpots } from '@/components/spot/useSavedSpots'
import { saveMapQuery } from '@/components/spot/mapQueryMemory'
import { HeaderNav, TabBar } from '@/components/ui/AppNav'
import { StatusMessage } from '@/components/ui/StatusMessage'
import { fetchPublishedSpots } from '@/lib/queries/spots'
import { genre } from '@/constants/genres'
import { wardLabel } from '@/constants/wards'
import { budgetLabel } from '@/constants/budgets'
import { timeOfDayLabel } from '@/constants/timeOfDay'
import type { Spot } from '@/types/spot'

/**
 * 保存したスポットの一覧（/saved）。新しく保存した順に並べる。
 * 保存の中身は端末（localStorage）にあるのは id だけなので、スポットの情報はDBから読む。
 * 削除・非公開になったスポットは、一覧に出さない。
 */
export default function SavedScreen() {
  const { entries, toggleSaved } = useSavedSpots()
  const [spots, setSpots] = useState<Spot[]>([])
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')
  const [errorMessage, setErrorMessage] = useState('')

  useEffect(() => {
    let cancelled = false
    fetchPublishedSpots()
      .then((rows) => {
        if (cancelled) return
        setSpots(rows)
        setStatus('ready')
      })
      .catch((error: unknown) => {
        if (cancelled) return
        setErrorMessage(error instanceof Error ? error.message : String(error))
        setStatus('error')
      })
    return () => {
      cancelled = true
    }
  }, [])

  const savedSpots = useMemo(() => {
    const byId = new Map(spots.map((s) => [s.id, s]))
    return entries.map((e) => byId.get(e.id)).filter((s): s is Spot => s !== undefined)
  }, [entries, spots])

  return (
    <div className="flex h-full flex-col bg-slate-50">
      <header className="z-20 flex shrink-0 items-center justify-between gap-3 border-b border-slate-200 bg-white px-4 py-3">
        <div className="min-w-0">
          <h1 className="text-base font-bold tracking-tight">保存したスポット</h1>
          <p className="mt-0.5 text-xs text-slate-500">
            {status === 'ready' ? `${savedSpots.length}件` : '読み込み中…'}
          </p>
        </div>
        <HeaderNav />
      </header>

      <main className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto max-w-xl px-4 py-4">
          {status === 'error' && (
            <StatusMessage tone="error" title="スポットを読み込めませんでした" detail={errorMessage} />
          )}

          {status === 'ready' && savedSpots.length === 0 && (
            <div className="flex flex-col items-center gap-3 py-12 text-center">
              <p className="text-4xl">♡</p>
              <p className="text-sm font-bold">まだ保存したスポットはありません</p>
              <p className="text-xs text-slate-500">
                スワイプで右に送ったスポットや、♡ を押したスポットがここに並びます。
              </p>
              <Link
                href="/swipe"
                className="mt-2 rounded-xl bg-rose-600 px-5 py-3 text-sm font-bold text-white"
              >
                スワイプで探す
              </Link>
            </div>
          )}

          {savedSpots.length > 0 && (
            <>
              <Link
                href="/?saved=1"
                className="mb-4 flex items-center justify-center rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-700"
              >
                🗺️ 保存したスポットを地図で見る
              </Link>
              <ul className="flex flex-col gap-2.5">
                {savedSpots.map((spot) => {
                  const g = genre(spot.genre)
                  return (
                    <li
                      key={spot.id}
                      className="flex items-stretch gap-3 rounded-xl border border-slate-200 bg-white p-2.5"
                    >
                      <Link
                        href={`/spots/${spot.id}`}
                        // 詳細画面の「地図に戻る」で、保存したスポットだけの地図に戻れるようにする
                        onClick={() => saveMapQuery('?saved=1')}
                        className="flex min-w-0 flex-1 items-center gap-3"
                      >
                        <SpotThumb
                          spot={spot}
                          className="h-20 w-20 shrink-0 rounded-lg"
                          emojiClassName="text-3xl"
                        />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-bold">{spot.name}</span>
                          <span className="mt-0.5 block text-xs text-slate-500">
                            {g?.emoji} {g?.label} ・ {wardLabel(spot.ward)}
                          </span>
                          <span className="block text-xs text-slate-500">
                            {budgetLabel(spot.budget_band)} ・ {timeOfDayLabel(spot.time_of_day)}
                          </span>
                        </span>
                      </Link>
                      <button
                        type="button"
                        onClick={() => toggleSaved(spot.id)}
                        aria-label={`「${spot.name}」の保存をやめる`}
                        className="shrink-0 self-center rounded-full px-3 py-2 text-xl text-rose-600"
                      >
                        ♥
                      </button>
                    </li>
                  )
                })}
              </ul>
              <p className="mt-4 text-center text-[11px] text-slate-400">
                保存はこの端末のブラウザの中だけに記録されます（機種変更や履歴の削除で消えます）
              </p>
            </>
          )}
        </div>
      </main>

      <TabBar />
    </div>
  )
}
