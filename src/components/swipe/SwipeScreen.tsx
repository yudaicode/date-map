'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'

import FilterPanel from '@/components/spot/FilterPanel'
import { useSavedSpots } from '@/components/spot/useSavedSpots'
import SwipeCard, { type SwipeDirection } from '@/components/swipe/SwipeCard'
import { HeaderNav, TabBar } from '@/components/ui/AppNav'
import { StatusMessage } from '@/components/ui/StatusMessage'
import { fetchPublishedSpots } from '@/lib/queries/spots'
import {
  filterFromSearchParams,
  filterSpots,
  filterToQueryString,
  type SpotFilter,
} from '@/lib/filters/spotFilter'
import { saveSpot, unsaveSpot } from '@/lib/saved/savedSpots'
import type { Spot } from '@/types/spot'

/** カードが飛んでいくアニメーションの時間（SwipeCard の transition と合わせる） */
const EXIT_MS = 260

/** 並びをランダムにする（毎回同じ順だと、上の方のスポットばかり保存されるため） */
function shuffle<T>(list: T[]): T[] {
  const result = [...list]
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[result[i], result[j]] = [result[j], result[i]]
  }
  return result
}

/**
 * スワイプ画面（/swipe）。
 * 「デートの日は決まっているけど、何をするか・どこに行くかが決まっていない」人向け。
 *
 * 流れ: ① 地図と同じ条件で絞り込む → ② カードを右（保存）/ 左（パス）にスワイプ
 *       → ③ 保存したスポットは「保存」タブの一覧と、地図のサムネイルに出る
 *
 * 絞り込み条件は地図と同じく URL に入れる（/swipe?scene=first_date など）。
 */
export default function SwipeScreen() {
  const searchParams = useSearchParams()
  const { savedIds } = useSavedSpots()

  const [spots, setSpots] = useState<Spot[]>([])
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')
  const [errorMessage, setErrorMessage] = useState('')

  // deck が null の間は「絞り込み」の段階。スタートを押すとカードの束が入る
  const [deck, setDeck] = useState<Spot[] | null>(null)
  const [index, setIndex] = useState(0) // いま一番上にあるカードの番号
  const [history, setHistory] = useState<{ spot: Spot; dir: SwipeDirection }[]>([])
  const [exiting, setExiting] = useState<SwipeDirection | null>(null)
  const exitTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

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
      if (exitTimer.current) clearTimeout(exitTimer.current)
    }
  }, [])

  const filter = useMemo(() => filterFromSearchParams(searchParams), [searchParams])
  const matches = useMemo(() => filterSpots(spots, filter), [spots, filter])
  const availableWards = useMemo(() => [...new Set(spots.map((s) => s.ward))], [spots])
  // 保存済みのスポットは、もう一度スワイプする必要がないので除く
  const candidates = matches.filter((s) => !savedIds.has(s.id))
  const alreadySavedCount = matches.length - candidates.length

  function updateFilter(next: SpotFilter) {
    const query = filterToQueryString(next)
    window.history.replaceState(null, '', query ? `/swipe?${query}` : '/swipe')
  }

  function start() {
    setDeck(shuffle(candidates))
    setIndex(0)
    setHistory([])
  }

  function swipe(dir: SwipeDirection) {
    if (!deck || exiting || index >= deck.length) return
    const spot = deck[index]
    // 保存はすぐに行う（アニメーション中に画面を離れても保存されるように）
    if (dir === 1) saveSpot(spot.id)
    setExiting(dir)
    exitTimer.current = setTimeout(() => {
      setHistory((h) => [...h, { spot, dir }])
      setIndex((i) => i + 1)
      setExiting(null)
    }, EXIT_MS)
  }

  /** ひとつ前のカードに戻す（保存していたら取り消す） */
  function undo() {
    const last = history.at(-1)
    if (!last || exiting) return
    if (last.dir === 1) unsaveSpot(last.spot.id)
    setHistory((h) => h.slice(0, -1))
    setIndex((i) => i - 1)
  }

  // パソコンでは ← → キーでもスワイプできる
  const swipeRef = useRef(swipe)
  useEffect(() => {
    swipeRef.current = swipe // 最新の swipe を覚えておく（MapView.tsx の onOpenDetailRef と同じ理由）
  })
  useEffect(() => {
    if (!deck) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'ArrowRight') swipeRef.current(1)
      if (event.key === 'ArrowLeft') swipeRef.current(-1)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [deck])

  const finished = deck !== null && index >= deck.length
  const likedCount = history.filter((h) => h.dir === 1).length

  return (
    <div className="flex h-full flex-col bg-canvas">
      <header className="z-20 flex shrink-0 items-center justify-between gap-3 border-b border-line bg-surface px-4 py-3">
        <div className="min-w-0">
          <h1 className="font-display text-base font-bold tracking-tight">スワイプで選ぶ</h1>
          <p className="mt-0.5 text-xs text-muted">
            {deck && !finished
              ? `${index + 1} / ${deck.length}枚目`
              : '行き先が決まっていないデートに'}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {deck && (
            <button
              type="button"
              onClick={() => setDeck(null)}
              className="rounded-md border border-line px-2.5 py-1.5 text-xs text-ink-mid transition-colors hover:bg-sunken"
            >
              条件を変える
            </button>
          )}
          <HeaderNav />
        </div>
      </header>

      <main className="relative min-h-0 flex-1">
        {status === 'loading' && (
          <p className="p-6 text-center text-sm text-muted">読み込み中…</p>
        )}
        {status === 'error' && (
          <div className="p-4">
            <StatusMessage tone="error" title="スポットを読み込めませんでした" detail={errorMessage} />
          </div>
        )}

        {/* ① 絞り込み */}
        {status === 'ready' && !deck && (
          <div className="flex h-full flex-col">
            <div className="min-h-0 flex-1 overflow-y-auto">
              <div className="mx-auto max-w-xl px-4 py-5">
                <p className="text-sm font-bold">どんなデートにする？</p>
                <p className="mt-1 mb-5 text-xs text-muted">
                  条件を選んでスワイプ開始。気になったら右、違ったら左。
                  何も選ばなければ全部のスポットから出します。
                </p>
                <FilterPanel
                  filter={filter}
                  onChange={updateFilter}
                  availableWards={availableWards}
                />
              </div>
            </div>
            <div className="shrink-0 border-t border-line bg-surface px-4 py-3">
              <div className="mx-auto max-w-xl">
                <button
                  type="button"
                  onClick={start}
                  disabled={candidates.length === 0}
                  className="w-full rounded-button bg-accent px-4 py-3 text-sm font-bold text-on-accent transition-opacity hover:opacity-90 disabled:bg-line-strong"
                >
                  {candidates.length > 0
                    ? `${candidates.length}件をスワイプする`
                    : matches.length > 0
                      ? '条件に合うスポットはすべて保存済みです'
                      : '条件に合うスポットがありません'}
                </button>
                {alreadySavedCount > 0 && (
                  <p className="mt-1.5 text-center text-[11px] text-muted">
                    保存済みの{alreadySavedCount}件は除いています
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ② スワイプ */}
        {deck && !finished && (
          <div className="mx-auto flex h-full max-w-md flex-col px-4 pt-3 pb-3">
            <div className="relative min-h-0 flex-1">
              {/* 一番上と、その次の1枚だけを描く（全部描くと埋め込みで重くなるため）。
                  後ろのカードを先に置くと、一番上のカードが手前に重なる */}
              {deck
                .slice(index, index + 2)
                .reverse()
                .map((spot) => (
                  <SwipeCard
                    key={spot.id}
                    spot={spot}
                    isTop={spot.id === deck[index].id}
                    exitDir={spot.id === deck[index].id ? exiting : null}
                    onSwipe={swipe}
                  />
                ))}
            </div>
            {index === 0 && (
              <p className="mt-2 text-center text-[11px] text-muted">
                下の情報の部分を左右にスワイプ、またはボタンで選べます
              </p>
            )}
            <div className="mt-3 flex shrink-0 items-center justify-center gap-5">
              <button
                type="button"
                onClick={undo}
                disabled={history.length === 0}
                aria-label="ひとつ戻す"
                className="flex h-11 w-11 items-center justify-center rounded-full border border-line bg-surface text-lg text-amber-600 shadow-sm disabled:opacity-30"
              >
                ↺
              </button>
              <button
                type="button"
                onClick={() => swipe(-1)}
                aria-label="パス"
                className="flex h-16 w-16 items-center justify-center rounded-full border border-line bg-surface text-2xl text-muted shadow-md active:scale-95"
              >
                ✕
              </button>
              <button
                type="button"
                onClick={() => swipe(1)}
                aria-label="保存"
                className="flex h-16 w-16 items-center justify-center rounded-full bg-accent text-2xl text-on-accent shadow-md active:scale-95"
              >
                ♥
              </button>
              {/* 左右のバランスを取るための空き */}
              <span className="h-11 w-11" aria-hidden />
            </div>
          </div>
        )}

        {/* ③ 全部見終わった */}
        {finished && (
          <div className="mx-auto flex h-full max-w-md flex-col items-center justify-center gap-3 px-6 text-center">
            <p className="text-4xl">🎉</p>
            <p className="text-base font-bold">ぜんぶ見ました！</p>
            <p className="text-sm text-ink-mid">
              今回は{likedCount}件を保存しました。
            </p>
            <Link
              href="/saved"
              className="mt-2 w-full rounded-button bg-accent px-4 py-3 text-sm font-bold text-on-accent"
            >
              保存した一覧を見る
            </Link>
            <Link
              href="/?saved=1"
              className="w-full rounded-button border border-line-strong bg-surface px-4 py-3 text-sm font-semibold text-ink-soft"
            >
              保存したスポットを地図で見る
            </Link>
            <button
              type="button"
              onClick={() => setDeck(null)}
              className="text-xs text-muted underline"
            >
              条件を変えてもう一度
            </button>
          </div>
        )}
      </main>

      <TabBar />
    </div>
  )
}
