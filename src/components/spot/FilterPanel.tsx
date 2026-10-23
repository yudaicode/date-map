'use client'

import type { ReactNode } from 'react'

import { WARDS, type WardId } from '@/constants/wards'
import { GENRES } from '@/constants/genres'
import { BUDGET_BANDS } from '@/constants/budgets'
import { SCENES } from '@/constants/scenes'
import {
  countActiveFilters,
  EMPTY_FILTER,
  TIME_FILTER_OPTIONS,
  toggleValue,
  type SpotFilter,
} from '@/lib/filters/spotFilter'

type Props = {
  filter: SpotFilter
  onChange: (next: SpotFilter) => void
  /** 1件以上スポットがある区。0件の区のボタンを並べても押す意味が無いため */
  availableWards: WardId[]
}

/** オン・オフを切り替えられる丸いボタン */
function Chip({
  selected,
  onClick,
  color,
  children,
}: {
  selected: boolean
  onClick: () => void
  color?: string // ジャンルの色（凡例を兼ねる）
  children: ReactNode
}) {
  return (
    <button
      type="button"
      aria-pressed={selected} // 読み上げ機能に「選択中かどうか」を伝える
      onClick={onClick}
      // スマホ幅では指で押しやすいよう高さを約40pxに、広い画面では小さめにする
      className={`inline-flex items-center gap-1.5 rounded-pill border px-3.5 py-2.5 text-[13px] transition-colors md:px-3 md:py-1.5 md:text-xs ${
        selected
          ? 'border-inverse bg-inverse text-on-inverse'
          : 'border-line bg-surface text-ink-soft hover:border-faint'
      }`}
    >
      {color && (
        <span
          className="inline-block h-2.5 w-2.5 shrink-0 rounded-full ring-1 ring-surface"
          style={{ backgroundColor: color }}
        />
      )}
      {children}
    </button>
  )
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <h2 className="mb-2 text-[11px] font-semibold tracking-wide text-muted">{title}</h2>
      <div className="flex flex-wrap gap-1.5">{children}</div>
    </section>
  )
}

/**
 * 絞り込み条件を選ぶパネル。
 * 選んだ結果は onChange で親（SpotsScreen）に渡すだけで、自分では覚えない。
 * （条件の保管場所を1か所＝URLにまとめ、食い違いを起こさないため）
 */
export default function FilterPanel({ filter, onChange, availableWards }: Props) {
  const wards = WARDS.filter((w) => availableWards.includes(w.id))

  return (
    <div className="flex flex-col gap-5">
      {/* シーンを先頭に置くのは、Z世代が「どんなデートか」から探すことが多いため */}
      <Section title="シーン">
        {SCENES.map((s) => (
          <Chip
            key={s.id}
            selected={filter.scenes.includes(s.id)}
            onClick={() => onChange({ ...filter, scenes: toggleValue(filter.scenes, s.id) })}
          >
            {s.label}
          </Chip>
        ))}
      </Section>
      <p className="-mt-3 text-[11px] text-faint">
        シーンは、選んだものすべてに当てはまるスポットを表示します
      </p>

      <Section title="ジャンル">
        {GENRES.map((g) => (
          <Chip
            key={g.id}
            color={g.color}
            selected={filter.genres.includes(g.id)}
            onClick={() => onChange({ ...filter, genres: toggleValue(filter.genres, g.id) })}
          >
            {g.emoji} {g.label}
          </Chip>
        ))}
      </Section>

      <Section title="区">
        {wards.map((w) => (
          <Chip
            key={w.id}
            selected={filter.wards.includes(w.id)}
            onClick={() => onChange({ ...filter, wards: toggleValue(filter.wards, w.id) })}
          >
            {w.label}
          </Chip>
        ))}
      </Section>

      <Section title="予算（ひとり）">
        {BUDGET_BANDS.map((b) => (
          <Chip
            key={b.id}
            selected={filter.budgets.includes(b.id)}
            onClick={() => onChange({ ...filter, budgets: toggleValue(filter.budgets, b.id) })}
          >
            {b.label}
          </Chip>
        ))}
      </Section>

      <Section title="時間帯">
        {TIME_FILTER_OPTIONS.map((t) => (
          <Chip
            key={t.id}
            selected={filter.times.includes(t.id)}
            onClick={() => onChange({ ...filter, times: toggleValue(filter.times, t.id) })}
          >
            {t.label}
          </Chip>
        ))}
      </Section>
      <p className="-mt-3 text-[11px] text-faint">
        「昼・夜どちらも」のスポットは、昼・夜どちらを選んでも表示されます
      </p>

      <button
        type="button"
        onClick={() => onChange(EMPTY_FILTER)}
        disabled={countActiveFilters(filter) === 0}
        className="self-start text-xs text-muted underline transition-colors hover:text-ink disabled:no-underline disabled:opacity-40"
      >
        条件をすべてクリア
      </button>
    </div>
  )
}
