'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'

import MapViewClient from '@/components/map/MapViewClient'
import FilterPanel from '@/components/spot/FilterPanel'
import { StatusMessage } from '@/components/ui/StatusMessage'
import { fetchPublishedSpots } from '@/lib/queries/spots'
import {
  countActiveFilters,
  EMPTY_FILTER,
  filterFromSearchParams,
  filterSpots,
  filterToQueryString,
  type SpotFilter,
} from '@/lib/filters/spotFilter'
import { saveMapQuery } from '@/components/spot/mapQueryMemory'
import { useSavedSpots } from '@/components/spot/useSavedSpots'
import { HeaderNav, TabBar } from '@/components/ui/AppNav'
import type { Spot } from '@/types/spot'

/**
 * トップページ（地図画面）の中身。
 *
 * 【なぜブラウザ側でデータを取るのか】
 * フィルタ（区・ジャンル・予算・時間帯）は、ボタンを押すたびに即座に絞り込みたいので
 * ブラウザ側で動かします。最初にまとめて取得しておけば、絞り込みのたびに
 * 通信せずに済み、動作が軽くなります。
 *
 * 【絞り込み条件はURLに入れる】
 * 例: /?genre=cafe&ward=shibuya
 * こうしておくと、詳細画面から戻っても条件が残り、URLを送れば同じ結果を共有できます。
 */
export default function SpotsScreen() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [spots, setSpots] = useState<Spot[]>([])
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')
  const [errorMessage, setErrorMessage] = useState('')
  // スマホ幅のときだけ使う「絞り込みパネルを開いているか」
  const [panelOpen, setPanelOpen] = useState(false)

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

  // useMemo は「元の値が変わったときだけ計算し直す」仕組み。
  // 毎回計算し直すと、地図のピンが無駄に置き直されてしまうため。
  const { savedIds, toggleSaved } = useSavedSpots()
  const filter = useMemo(() => filterFromSearchParams(searchParams), [searchParams])
  // ?saved=1 のときは、保存したスポットだけを表示する（スワイプ・保存一覧の「地図で見る」から来る）
  const onlySaved = searchParams.get('saved') === '1'
  const visibleSpots = useMemo(() => {
    const filtered = filterSpots(spots, filter)
    return onlySaved ? filtered.filter((s) => savedIds.has(s.id)) : filtered
  }, [spots, filter, onlySaved, savedIds])
  const availableWards = useMemo(() => [...new Set(spots.map((s) => s.ward))], [spots])
  const activeCount = countActiveFilters(filter)

  function updateFilter(next: SpotFilter, nextOnlySaved = onlySaved) {
    const filterQuery = filterToQueryString(next)
    const query = nextOnlySaved ? (filterQuery ? `saved=1&${filterQuery}` : 'saved=1') : filterQuery
    // replaceState: ページを読み込み直さずにURLだけ書き換える。
    // Next.js はこれを検知して useSearchParams の値を更新してくれる。
    // （push ではなく replace なのは、ボタンを押すたびに「戻る」の履歴が増えないようにするため）
    window.history.replaceState(null, '', query ? `/?${query}` : '/')
  }

  const handleToggleSave = useCallback((spot: Spot) => toggleSaved(spot.id), [toggleSaved])

  const openDetail = useCallback(
    (spot: Spot) => {
      saveMapQuery(window.location.search) // 詳細画面の「地図に戻る」で条件を復元するため
      router.push(`/spots/${spot.id}`)
    },
    [router]
  )

  return (
    <div className="flex h-full flex-col">
      <header className="z-20 flex shrink-0 items-center justify-between gap-3 border-b border-line bg-surface px-4 py-3">
        <div className="min-w-0">
          <h1 className="font-display text-base font-bold tracking-tight">デートマップ</h1>
          <p className="mt-0.5 text-xs text-muted">
            {/* スマホ幅では1行に収まるよう説明を省く */}
            <span className="hidden sm:inline">東京23区のデートスポット </span>
            {status === 'ready'
              ? activeCount > 0 || onlySaved
                ? `${spots.length}件中 ${visibleSpots.length}件を表示`
                : `${spots.length}件`
              : status === 'loading'
                ? '読み込み中…'
                : '—'}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {/* md: = 画面幅が768px以上。広い画面ではパネルが常に出ているのでボタンは隠す */}
          <button
            type="button"
            onClick={() => setPanelOpen((open) => !open)}
            aria-expanded={panelOpen}
            className={`rounded-md border px-2.5 py-1.5 text-xs transition-colors md:hidden ${
              activeCount > 0
                ? 'border-inverse bg-inverse text-on-inverse'
                : 'border-line text-ink-mid hover:bg-sunken'
            }`}
          >
            絞り込み{activeCount > 0 && `（${activeCount}）`}
          </button>
          <HeaderNav />
          <Link
            href="/admin"
            className="rounded-md border border-line px-2.5 py-1.5 text-xs text-ink-mid transition-colors hover:bg-sunken"
          >
            管理
          </Link>
        </div>
      </header>

      <div className="relative flex min-h-0 flex-1">
        {/* 絞り込みパネル。
            スマホ幅: ボタンで開閉し、地図の上に重ねて表示
            広い画面: 左側に常に表示 */}
        <aside
          className={`${
            panelOpen ? 'block' : 'hidden'
          } absolute inset-x-0 top-0 z-20 max-h-[75%] overflow-y-auto border-b border-line bg-surface p-4 shadow-lg md:static md:block md:max-h-none md:w-72 md:shrink-0 md:border-r md:border-b-0 md:shadow-none`}
        >
          <FilterPanel filter={filter} onChange={updateFilter} availableWards={availableWards} />
          <button
            type="button"
            onClick={() => setPanelOpen(false)}
            className="mt-5 w-full rounded-md bg-inverse px-4 py-2.5 text-sm font-semibold text-on-inverse md:hidden"
          >
            {visibleSpots.length}件を地図で見る
          </button>
        </aside>

        <main className="relative min-w-0 flex-1">
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
              <MapViewClient
                spots={visibleSpots}
                fitToSpots={activeCount > 0 || onlySaved}
                onOpenDetail={openDetail}
                savedIds={savedIds}
                onToggleSave={handleToggleSave}
              />

              {/* 保存したスポットだけに切り替えるボタン（地図の左上） */}
              {status === 'ready' && savedIds.size > 0 && (
                <button
                  type="button"
                  onClick={() => updateFilter(filter, !onlySaved)}
                  aria-pressed={onlySaved}
                  className={`absolute top-3 left-3 z-10 rounded-pill border px-3.5 py-2 text-xs font-bold shadow-md transition-colors ${
                    onlySaved
                      ? 'border-accent bg-accent text-on-accent'
                      : 'border-white bg-surface text-accent'
                  }`}
                >
                  ♥ 保存したスポットだけ（{savedIds.size}）
                </button>
              )}

              {status === 'ready' && spots.length === 0 && (
                <div className="pointer-events-none absolute inset-x-0 bottom-10 z-10 px-4">
                  <StatusMessage
                    title="まだスポットが登録されていません"
                    detail="右上の「管理」からログインして登録するか、supabase/seed.sql を実行して動作確認用の10件を入れてください。"
                  />
                </div>
              )}

              {status === 'ready' && spots.length > 0 && visibleSpots.length === 0 && (
                <div className="absolute inset-x-0 bottom-10 z-10 px-4">
                  <div className="mx-auto max-w-md rounded-lg border border-line bg-surface px-4 py-3 text-sm text-ink-soft shadow-sm">
                    <p className="font-semibold">条件に合うスポットがありません</p>
                    <p className="mt-1 text-xs">条件を減らすと見つかるかもしれません。</p>
                    <button
                      type="button"
                      onClick={() => updateFilter(EMPTY_FILTER, false)}
                      className="mt-2 text-xs font-semibold underline"
                    >
                      条件をすべてクリア
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </main>
      </div>

      <TabBar />
    </div>
  )
}
