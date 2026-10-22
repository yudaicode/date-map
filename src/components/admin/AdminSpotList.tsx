'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

import { StatusMessage } from '@/components/ui/StatusMessage'
import { fetchAllSpots } from '@/lib/queries/spots'
import { signOut } from '@/lib/supabase/auth'
import { wardLabel } from '@/constants/wards'
import { genre } from '@/constants/genres'
import { budgetLabel } from '@/constants/budgets'
import { timeOfDayLabel } from '@/constants/timeOfDay'
import type { Spot } from '@/types/spot'

export default function AdminSpotList() {
  const router = useRouter()
  const [spots, setSpots] = useState<Spot[]>([])
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false

    fetchAllSpots()
      .then((rows) => {
        if (cancelled) return
        setSpots(rows)
        setStatus('ready')
      })
      .catch((e: unknown) => {
        if (cancelled) return
        setError(e instanceof Error ? e.message : String(e))
        setStatus('error')
      })

    return () => {
      cancelled = true
    }
  }, [])

  async function handleSignOut() {
    await signOut()
    router.replace('/admin/login')
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-bold tracking-tight">スポット一覧</h1>
          <p className="mt-0.5 text-xs text-slate-500">
            {status === 'ready' ? `${spots.length}件（下書きを含む）` : '読み込み中…'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/admin/spots/new"
            className="rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-85"
          >
            ＋ 新規登録
          </Link>
          <Link
            href="/admin/spots/bulk"
            className="rounded-md border border-slate-300 px-4 py-2 text-sm text-slate-700 transition-colors hover:bg-slate-50"
          >
            まとめて登録
          </Link>
          <button
            type="button"
            onClick={handleSignOut}
            className="rounded-md border border-slate-300 bg-white px-3 py-2 text-xs text-slate-600 transition-colors hover:bg-slate-50"
          >
            ログアウト
          </button>
        </div>
      </div>

      <div className="mt-6">
        {status === 'error' && (
          <StatusMessage tone="error" title="読み込みに失敗しました" detail={error} />
        )}

        {status === 'ready' && spots.length === 0 && (
          <StatusMessage
            title="まだスポットがありません"
            detail="右上の「＋ 新規登録」から追加してください。"
          />
        )}

        <ul className="flex flex-col gap-2">
          {spots.map((spot) => {
            const g = genre(spot.genre)
            return (
              <li key={spot.id}>
                <Link
                  href={`/admin/spots/${spot.id}`}
                  className="flex items-start gap-3 rounded-lg border border-slate-200 bg-white px-4 py-3 transition-colors hover:border-slate-400"
                >
                  <span
                    className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-sm"
                    style={{ backgroundColor: g?.color ?? '#374151' }}
                  >
                    {g?.emoji ?? '📍'}
                  </span>

                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-semibold">{spot.name}</span>
                      {!spot.is_published && (
                        <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-800">
                          下書き
                        </span>
                      )}
                    </span>
                    <span className="mt-0.5 block text-xs text-slate-500">
                      {wardLabel(spot.ward)} ・ {g?.label} ・ {budgetLabel(spot.budget_band)} ・{' '}
                      {timeOfDayLabel(spot.time_of_day)}
                    </span>
                    <span className="mt-0.5 block truncate text-xs text-slate-400">
                      {spot.address}
                    </span>
                  </span>

                  <span className="shrink-0 self-center text-xs text-slate-400">編集 →</span>
                </Link>
              </li>
            )
          })}
        </ul>
      </div>
    </div>
  )
}
