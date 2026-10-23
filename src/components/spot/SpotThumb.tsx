import { genre } from '@/constants/genres'
import type { Spot } from '@/types/spot'

/**
 * スポットの写真。写真が無いときは、地図のサムネイルと同じく
 * ジャンルの色のグラデーション＋絵文字で代わりの絵を出す。
 * 大きさ・角丸は className で外から決める。
 */
export default function SpotThumb({
  spot,
  className = '',
  emojiClassName = 'text-3xl',
}: {
  spot: Pick<Spot, 'name' | 'genre' | 'image_url'>
  className?: string
  emojiClassName?: string
}) {
  const g = genre(spot.genre)
  const color = g?.color ?? '#374151'

  if (spot.image_url) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- アップロード時に縮小済みのため next/image の変換は不要
      <img src={spot.image_url} alt={spot.name} className={`object-cover ${className}`} />
    )
  }
  return (
    <div
      role="img"
      aria-label={spot.name}
      className={`flex items-center justify-center ${className}`}
      style={{
        background: `linear-gradient(135deg, ${color}, color-mix(in srgb, ${color} 55%, #ffffff))`,
      }}
    >
      <span className={`leading-none ${emojiClassName}`}>{g?.emoji ?? '📍'}</span>
    </div>
  )
}
