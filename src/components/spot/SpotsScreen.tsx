'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

import MapViewClient from '@/components/map/MapViewClient'
import { StatusMessage } from '@/components/ui/StatusMessage'
import { fetchPublishedSpots } from '@/lib/queries/spots'
import { GENRES } from '@/constants/genres'
import type { Spot } from '@/types/spot'

/**
 * トップページ（地図画面）の中身。
 *
 * 【なぜブラウザ側でデータを取るのか】
 * Phase 3 で付けるフィルタ（区・ジャンル・予算・時間帯）は、
 * ボタンを押すたびに即座に絞り込みたいので、どのみちブラウザ側で動かします。
 * 最初にまとめて取得しておけば、絞り込みのたびに通信せずに済み、動作が軽くなります。
 */
export default function SpotsScreen() {
  const [spots, setSpots] = useState<Spot[]>([])
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')
  const [errorMessage, setErrorMessage] = useState('')

  useEffect(() => {
    let cancelled = false // 画面を離れた後に状態を書き換えてしまうのを防ぐ目印

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

  return (
    <div className="flex h-full flex-col">
      <header className="z-10 flex shrink-0 items-center justify-between gap-3 border-b border-slate-200 bg-white px-4 py-3">
        <div>
          <h1 className="text-base font-bold tracking-tight">デートマップ</h1>
          <p className="mt-0.5 text-xs text-slate-500">
            東京23区のデートスポット{' '}
            {status === 'ready' ? `${spots.length}件` : status === 'loading' ? '読み込み中…' : '—'}
          </p>
        </div>
        <Link
          href="/admin"
          className="shrink-0 rounded-md border border-slate-200 px-2.5 py-1.5 text-xs text-slate-600 transition-colors hover:bg-slate-50"
        >
          管理
        </Link>
      </header>

      <main className="relative flex-1">
        {status === 'error' ? (
          <div className="flex h-full items-center justify-center p-4">
            <StatusMessage
              tone="error"
              title="スポットを読み込めませんでした"
              detail={errorMessage}
            />
          </div>
        ) : (
          <>
            <MapViewClient spots={spots} />

            {/* ジャンルの色の凡例。地図の上に重ねて表示している。
                左上に置く理由: 右上は拡大縮小ボタン、右下は出典表示、
                左下は開発中だけ出る Next.js のボタンと重なるため */}
            <div className="pointer-events-none absolute top-3 left-3 z-10 rounded-lg border border-slate-200 bg-white/95 px-3 py-2 shadow-sm">
              <p className="mb-1.5 text-[10px] font-semibold tracking-wide text-slate-500">
                ジャンル
              </p>
              <ul className="flex flex-col gap-1">
                {GENRES.map((g) => (
                  <li key={g.id} className="flex items-center gap-2 text-[11px] text-slate-700">
                    <span
                      className="inline-block h-3 w-3 shrink-0 rounded-full"
                      style={{ backgroundColor: g.color }}
                    />
                    {g.emoji} {g.label}
                  </li>
                ))}
              </ul>
            </div>

            {status === 'ready' && spots.length === 0 && (
              <div className="pointer-events-none absolute inset-x-0 bottom-10 z-10 px-4">
                <StatusMessage
                  title="まだスポットが登録されていません"
                  detail="右上の「管理」からログインして登録するか、supabase/seed.sql を実行して動作確認用の10件を入れてください。"
                />
              </div>
            )}
          </>
        )}
      </main>
    </div>
  )
}
