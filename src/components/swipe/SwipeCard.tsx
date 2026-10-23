'use client'

import { useRef, useState } from 'react'

import SpotThumb from '@/components/spot/SpotThumb'
import { genre } from '@/constants/genres'
import { wardLabel } from '@/constants/wards'
import { budgetLabel } from '@/constants/budgets'
import { timeOfDayLabel } from '@/constants/timeOfDay'
import { sceneLabel } from '@/constants/scenes'
import { detectSnsPlatform, snsEmbedUrl } from '@/lib/sns'
import type { Spot } from '@/types/spot'

/** これ以上（px）横に動かして離したら、スワイプしたとみなす */
const SWIPE_THRESHOLD = 90

export type SwipeDirection = -1 | 1 // -1 = 左（パス） / 1 = 右（保存）

type Props = {
  spot: Spot
  /** 一番上のカードか。動かせるのも、投稿を埋め込むのも一番上だけ（重くならないように） */
  isTop: boolean
  /** ボタンやスワイプで「飛んでいく」途中なら、その向き */
  exitDir: SwipeDirection | null
  onSwipe: (dir: SwipeDirection) => void
}

/** スワイプに使う投稿URL。TikTok を優先（縦長の動画がカードに収まりやすいため） */
function embedTarget(spot: Spot): string | null {
  return [spot.tiktok_url, spot.instagram_url].find((url) => url && snsEmbedUrl(url)) ?? null
}

/**
 * マッチングアプリ風のカード1枚。
 *
 * 上半分: 元の投稿（TikTok / Instagram の公式埋め込み）。投稿が無ければ写真か代わりの絵
 * 下半分: スポットの情報。ここを指で左右に動かしてスワイプする
 *
 * 【なぜ投稿の上ではスワイプできないのか】
 * 埋め込みは TikTok / Instagram の画面を「窓」として載せているため、
 * その上での指の動きは TikTok 側に届き、こちらでは受け取れない。
 */
export default function SwipeCard({ spot, isTop, exitDir, onSwipe }: Props) {
  const [dx, setDx] = useState(0) // 指で横に動かした量（px）
  const [dragging, setDragging] = useState(false)
  const [expanded, setExpanded] = useState(false) // 「もっと見る」で情報を広げたか
  const startX = useRef<number | null>(null)
  const moved = useRef(false) // 少しでも動かしたか（動かした後の「タップ」を無視するため）

  const g = genre(spot.genre)
  const embedUrl = isTop ? embedTarget(spot) : null
  const isTiktok = embedUrl ? detectSnsPlatform(embedUrl) === 'tiktok' : false

  function handlePointerDown(event: React.PointerEvent<HTMLDivElement>) {
    if (!isTop || exitDir) return
    // ボタンの上から動かし始めた場合はスワイプにしない（ボタンが押せなくなるため）
    if ((event.target as HTMLElement).closest('button, a')) return
    startX.current = event.clientX
    moved.current = false
    // 指が枠の外へ出ても、離すまでこのカードが動きを受け取り続けるようにする
    event.currentTarget.setPointerCapture(event.pointerId)
    setDragging(true)
  }

  function handlePointerMove(event: React.PointerEvent<HTMLDivElement>) {
    if (startX.current === null) return
    const distance = event.clientX - startX.current
    if (Math.abs(distance) > 6) moved.current = true
    setDx(distance)
  }

  function handlePointerEnd() {
    if (startX.current === null) return
    startX.current = null
    setDragging(false)
    if (Math.abs(dx) > SWIPE_THRESHOLD) onSwipe(dx > 0 ? 1 : -1)
    else setDx(0) // 少ししか動かしていなければ元の位置に戻す
  }

  // カードの位置と傾き。飛んでいく途中なら画面の外へ
  const x = exitDir ? `${exitDir * 130}vw` : `${dx}px`
  const rotate = exitDir ? exitDir * 24 : dx / 18
  // 「保存」「パス」の文字の濃さ（動かすほど濃くなる）
  const likeOpacity = exitDir === 1 ? 1 : Math.min(Math.max(dx / SWIPE_THRESHOLD, 0), 1)
  const passOpacity = exitDir === -1 ? 1 : Math.min(Math.max(-dx / SWIPE_THRESHOLD, 0), 1)

  return (
    <div
      className="absolute inset-0 flex flex-col overflow-hidden rounded-card border border-line bg-surface shadow-xl select-none"
      style={{
        transform: isTop
          ? `translateX(${x}) rotate(${rotate}deg)`
          : 'translateY(14px) scale(0.95)', // 後ろのカードは少し小さく、下にずらして重なりを見せる
        transition: dragging ? 'none' : 'transform 0.28s ease-out',
        zIndex: isTop ? 2 : 1,
      }}
      // 動かした直後の「タップ」で、中のボタンが押されてしまうのを防ぐ
      onClickCapture={(event) => {
        if (moved.current) {
          event.preventDefault()
          event.stopPropagation()
          moved.current = false
        }
      }}
    >
      {/* 上半分: 元の投稿 or 写真 */}
      <div
        className={`relative min-h-0 flex-1 ${embedUrl ? 'bg-black' : ''}`}
        // 投稿が無いときは写真の上でもスワイプできる
        {...(!embedUrl && {
          onPointerDown: handlePointerDown,
          onPointerMove: handlePointerMove,
          onPointerUp: handlePointerEnd,
          onPointerCancel: handlePointerEnd,
          style: { touchAction: 'none' },
        })}
      >
        <SpotThumb spot={spot} className="h-full w-full" emojiClassName="text-7xl" />
        {embedUrl && (
          <iframe
            src={snsEmbedUrl(embedUrl)!}
            title={isTiktok ? 'TikTok の投稿' : 'Instagram の投稿'}
            allow="encrypted-media; fullscreen; picture-in-picture"
            allowFullScreen
            className="absolute inset-0 h-full w-full bg-surface"
          />
        )}

        {/* 動かしている向きの文字 */}
        <span
          className="pointer-events-none absolute top-5 left-4 -rotate-12 rounded-lg border-4 border-emerald-500 bg-surface/90 px-3 py-1 text-2xl font-black text-emerald-600"
          style={{ opacity: likeOpacity }}
        >
          保存 ♥
        </span>
        <span
          className="pointer-events-none absolute top-5 right-4 rotate-12 rounded-lg border-4 border-muted bg-surface/90 px-3 py-1 text-2xl font-black text-ink-mid"
          style={{ opacity: passOpacity }}
        >
          パス
        </span>
      </div>

      {/* 下半分: スポットの情報。ここを左右にスワイプする */}
      <div
        className={`shrink-0 cursor-grab border-t border-sunken px-4 pt-3 pb-4 active:cursor-grabbing ${
          expanded ? 'max-h-[60%] overflow-y-auto' : ''
        }`}
        style={{ touchAction: 'none' }} // 指の動きをブラウザのスクロールに使わせず、スワイプに使う
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerEnd}
        onPointerCancel={handlePointerEnd}
      >
        <div className="flex items-center gap-1.5 text-[11px]">
          <span
            className="rounded-full px-2 py-0.5 font-semibold text-white"
            style={{ backgroundColor: g?.color ?? '#374151' }}
          >
            {g?.emoji} {g?.label}
          </span>
          <span className="rounded-full bg-sunken px-2 py-0.5 text-ink-soft">
            {wardLabel(spot.ward)}
          </span>
          <span className="text-muted">
            {budgetLabel(spot.budget_band)} ・ {timeOfDayLabel(spot.time_of_day)}
          </span>
        </div>
        <h2 className="mt-1.5 font-display text-lg leading-snug font-bold">{spot.name}</h2>
        {spot.scenes.length > 0 && (
          <p className="mt-0.5 text-xs text-ink-mid">
            {spot.scenes.map((s) => `#${sceneLabel(s)}`).join(' ')}
          </p>
        )}
        {spot.memo && (
          <p
            className={`mt-1.5 text-[13px] leading-relaxed text-ink-soft ${
              expanded ? 'whitespace-pre-wrap' : 'line-clamp-2'
            }`}
          >
            {spot.memo}
          </p>
        )}
        {expanded && <p className="mt-1.5 text-xs text-muted">📍 {spot.address}</p>}
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="mt-1 text-xs font-semibold text-muted underline"
        >
          {expanded ? '閉じる' : 'もっと見る'}
        </button>
      </div>
    </div>
  )
}
