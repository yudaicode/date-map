import MapViewClient from '@/components/map/MapViewClient'
import { DUMMY_SPOTS } from '@/data/dummySpots'
import { GENRES } from '@/constants/genres'

export default function Home() {
  // Phase 1 は仮データ。Phase 2 で Supabase から取得する処理に置き換えます。
  const spots = DUMMY_SPOTS

  return (
    <div className="flex h-full flex-col">
      {/* 画面上部の見出し */}
      <header className="z-10 shrink-0 border-b border-slate-200 bg-white px-4 py-3">
        <h1 className="text-base font-bold tracking-tight">デートマップ</h1>
        <p className="mt-0.5 text-xs text-slate-500">
          東京23区のデートスポット　{spots.length}件（Phase 1: 仮データ）
        </p>
      </header>

      {/* 地図エリア。flex-1 で「残りの高さを全部使う」 */}
      <main className="relative flex-1">
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
      </main>
    </div>
  )
}
