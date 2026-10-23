'use client'

import { useEffect, useState, type ReactNode } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'

import SpotLocationMapClient from '@/components/map/SpotLocationMapClient'
import SnsEmbed from '@/components/spot/SnsEmbed'
import { StatusMessage } from '@/components/ui/StatusMessage'
import { mapHrefFromMemory } from '@/components/spot/mapQueryMemory'
import { useSavedSpots } from '@/components/spot/useSavedSpots'
import { fetchSpot } from '@/lib/queries/spots'
import { genre } from '@/constants/genres'
import { wardLabel } from '@/constants/wards'
import { budgetLabel } from '@/constants/budgets'
import { timeOfDayLabel } from '@/constants/timeOfDay'
import { sceneLabel } from '@/constants/scenes'
import { snsEmbedUrl } from '@/lib/sns'
import type { Spot } from '@/types/spot'

/** 見出しと中身の1行（予算・時間帯など） */
function InfoRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex gap-4 border-b border-slate-100 py-2.5 text-sm last:border-b-0">
      <dt className="w-16 shrink-0 text-xs font-semibold text-slate-500">{label}</dt>
      <dd className="min-w-0 flex-1 text-slate-800">{children}</dd>
    </div>
  )
}

/** 外部サイトへのリンクボタン（新しいタブで開く） */
function ExternalButton({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a
      href={href}
      target="_blank"
      // noreferrer: 移動先のサイトに「どこから来たか」を伝えない＆元のタブを操作させない安全策
      rel="noreferrer"
      className="inline-flex items-center rounded-md border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50"
    >
      {children} ↗
    </a>
  )
}

export default function SpotDetailScreen() {
  const router = useRouter()
  // useParams は URL の [id] の部分を取り出すための仕組み
  const params = useParams<{ id: string }>()
  const id = params?.id

  const [spot, setSpot] = useState<Spot | null>(null)
  const [status, setStatus] = useState<'loading' | 'ready' | 'notFound' | 'error'>('loading')
  const [error, setError] = useState('')

  useEffect(() => {
    if (!id) return
    let cancelled = false

    // 一般の人はRLSにより公開済みのスポットしか取得できない（下書きは「見つからない」になる）
    fetchSpot(id)
      .then((row) => {
        if (cancelled) return
        if (!row) {
          setStatus('notFound')
          return
        }
        setSpot(row)
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
  }, [id])

  // ブラウザのタブに出るタイトルをスポット名にする
  useEffect(() => {
    if (spot) document.title = `${spot.name} | デートマップ`
  }, [spot])

  function backToMap(event: React.MouseEvent<HTMLAnchorElement>) {
    if (event.ctrlKey || event.metaKey || event.shiftKey) return // 新しいタブで開く操作はそのまま
    event.preventDefault()
    router.push(mapHrefFromMemory()) // 絞り込み条件を付けたまま地図に戻る
  }

  const { savedIds, toggleSaved } = useSavedSpots()
  const saved = spot ? savedIds.has(spot.id) : false
  const g = spot ? genre(spot.genre) : undefined
  const embeddablePosts = [spot?.instagram_url, spot?.tiktok_url].filter(
    (url): url is string => !!url && snsEmbedUrl(url) !== null
  )

  return (
    <div className="h-full overflow-y-auto bg-slate-50">
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white px-4 py-3">
        <div className="mx-auto max-w-2xl">
          <Link href="/" onClick={backToMap} className="text-xs text-slate-500 hover:text-slate-900">
            ← 地図に戻る
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-2xl px-4 py-6">
        {status === 'loading' && <p className="text-sm text-slate-500">読み込み中…</p>}

        {status === 'notFound' && (
          <StatusMessage
            title="このスポットは見つかりませんでした"
            detail="削除されたか、まだ公開されていない可能性があります。"
          />
        )}

        {status === 'error' && (
          <StatusMessage tone="error" title="読み込みに失敗しました" detail={error} />
        )}

        {status === 'ready' && spot && (
          <article className="flex flex-col gap-5">
            {spot.image_url && (
              // eslint-disable-next-line @next/next/no-img-element -- アップロード時に縮小済みのため next/image の変換は不要
              <img
                src={spot.image_url}
                alt={spot.name}
                className="aspect-[4/3] w-full rounded-xl border border-slate-200 object-cover"
              />
            )}
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold text-white"
                  style={{ backgroundColor: g?.color ?? '#374151' }}
                >
                  {g?.emoji} {g?.label ?? spot.genre}
                </span>
                <span className="rounded-full bg-slate-200 px-2.5 py-1 text-xs text-slate-700">
                  {wardLabel(spot.ward)}
                </span>
                {/* 下書きはログイン中の管理者にだけ見える。一般公開されていないことを明示する */}
                {!spot.is_published && (
                  <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-800">
                    下書き（非公開）
                  </span>
                )}
              </div>
              <div className="mt-3 flex items-start justify-between gap-3">
                <h1 className="text-xl font-bold tracking-tight">{spot.name}</h1>
                <button
                  type="button"
                  onClick={() => toggleSaved(spot.id)}
                  aria-pressed={saved}
                  className={`shrink-0 rounded-full border px-3.5 py-2 text-xs font-bold transition-colors ${
                    saved
                      ? 'border-rose-600 bg-rose-600 text-white'
                      : 'border-slate-300 bg-white text-slate-700 hover:border-rose-400'
                  }`}
                >
                  {saved ? '♥ 保存済み' : '♡ 保存'}
                </button>
              </div>
              {spot.scenes.length > 0 && (
                <ul className="mt-2 flex flex-wrap gap-1.5">
                  {spot.scenes.map((scene) => (
                    <li
                      key={scene}
                      className="rounded-full border border-slate-300 bg-white px-2.5 py-0.5 text-xs text-slate-700"
                    >
                      #{sceneLabel(scene)}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {spot.memo && (
              <p className="rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap text-slate-800">
                {spot.memo}
              </p>
            )}

            <dl className="rounded-lg border border-slate-200 bg-white px-4 py-1">
              <InfoRow label="予算">{budgetLabel(spot.budget_band)}（ひとりあたり）</InfoRow>
              <InfoRow label="時間帯">{timeOfDayLabel(spot.time_of_day)}</InfoRow>
              <InfoRow label="住所">{spot.address}</InfoRow>
            </dl>

            <section className="flex flex-col gap-2">
              <SpotLocationMapClient spot={spot} />
              <div className="flex flex-wrap gap-2">
                <ExternalButton
                  href={`https://www.google.com/maps/search/?api=1&query=${spot.lat},${spot.lng}`}
                >
                  Googleマップで開く
                </ExternalButton>
                {spot.instagram_url && (
                  <ExternalButton href={spot.instagram_url}>Instagramの投稿</ExternalButton>
                )}
                {spot.tiktok_url && (
                  <ExternalButton href={spot.tiktok_url}>TikTokの投稿</ExternalButton>
                )}
              </div>
            </section>

            {/* 元の投稿を公式の埋め込みで表示（埋め込めない形のURLのときは上のボタンだけ） */}
            {embeddablePosts.length > 0 && (
              <section className="flex flex-col gap-2">
                <h2 className="text-xs font-semibold text-slate-500">元の投稿</h2>
                <div className="flex flex-wrap gap-4">
                  {embeddablePosts.map((url) => (
                    <SnsEmbed key={url} url={url} />
                  ))}
                </div>
              </section>
            )}
          </article>
        )}
      </div>
    </div>
  )
}
