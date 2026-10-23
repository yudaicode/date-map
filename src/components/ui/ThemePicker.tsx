'use client'

import { useEffect, useId, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

import { useTheme } from '@/components/ui/useTheme'

/**
 * 「🎨 着せ替え」ボタンと、テーマを選ぶ画面（スマホでは下から出るシート）。
 * 各ヘッダーの右側に置く。選んだテーマはその端末に記録される（lib/theme/themeStore.ts）。
 */
export function ThemeButton() {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        aria-label="着せ替え"
        className="rounded-control border border-line px-2.5 py-1.5 text-xs text-ink-mid transition-colors hover:bg-sunken"
      >
        🎨<span className="ml-1 hidden md:inline">着せ替え</span>
      </button>
      {/* ヘッダーの中に置くと、下のタブなどの裏に隠れてしまうため、ページの一番外側（body）に出す */}
      {open && createPortal(<ThemeSheet onClose={() => setOpen(false)} />, document.body)}
    </>
  )
}

function ThemeSheet({ onClose }: { onClose: () => void }) {
  const { themeId, setThemeId, themes } = useTheme()
  const titleId = useId()
  const closeRef = useRef<HTMLButtonElement>(null)

  // 開いたら「閉じる」に操作の位置を移し、Esc キーでも閉じられるようにする
  useEffect(() => {
    closeRef.current?.focus()
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center md:items-center">
      {/* 背景の暗い幕。押すと閉じる */}
      <button
        type="button"
        aria-label="閉じる"
        tabIndex={-1}
        onClick={onClose}
        className="absolute inset-0 bg-black/40"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative max-h-[85%] w-full overflow-y-auto rounded-t-card bg-surface px-4 pt-4 pb-[max(1rem,env(safe-area-inset-bottom))] shadow-xl md:max-w-md md:rounded-card"
      >
        <div className="flex items-center justify-between">
          <h2 id={titleId} className="font-display text-base font-bold">
            🎨 着せ替え
          </h2>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            className="rounded-control px-2.5 py-1.5 text-sm text-muted hover:bg-sunken"
          >
            閉じる
          </button>
        </div>
        <p className="mt-1 text-xs text-muted">選んだ見た目は、この端末に記録されます</p>

        <ul className="mt-4 grid grid-cols-2 gap-3">
          {themes.map((theme) => {
            const selected = theme.id === themeId
            return (
              <li key={theme.id}>
                <button
                  type="button"
                  onClick={() => setThemeId(theme.id)}
                  aria-pressed={selected}
                  className={`w-full rounded-panel border-2 p-1.5 text-left transition-colors ${
                    selected ? 'border-accent' : 'border-transparent hover:border-line'
                  }`}
                >
                  <ThemePreview themeId={theme.id} />
                  <span className="mt-2 flex items-center gap-1 px-1 text-sm font-bold text-ink">
                    {theme.label}
                    {selected && <span className="text-xs text-accent">✓ 使用中</span>}
                  </span>
                  <span className="block px-1 text-[11px] leading-snug text-muted">{theme.description}</span>
                </button>
              </li>
            )
          })}
        </ul>
      </div>
    </div>
  )
}

/**
 * テーマの見本。この部分だけ data-theme を付け替えるので、
 * 今のテーマのまま「そのテーマで見たらどうなるか」を小さく描ける。
 */
function ThemePreview({ themeId }: { themeId: string }) {
  return (
    <span data-theme={themeId} className="block rounded-panel bg-canvas p-2 font-[family-name:var(--t-font-body)]">
      <span className="block overflow-hidden rounded-card border border-line bg-surface">
        <span
          className="block h-12"
          style={{ background: 'linear-gradient(160deg, #ffb3cf, #ff8a6b 60%, #ffc46b)' }}
        />
        <span className="block px-2 pt-1.5 pb-2">
          <span className="block font-display text-xs font-bold text-ink">夜景デート</span>
          <span className="mt-1 inline-block rounded-pill border border-line-strong px-1.5 text-[9px] text-ink-soft">
            #初デート
          </span>
        </span>
      </span>
      <span className="mt-2 flex justify-center gap-2">
        <span className="flex h-6 w-6 items-center justify-center rounded-full border border-line bg-surface text-[10px] text-muted">
          ✕
        </span>
        <span className="bg-accent-fill shadow-accent flex h-6 w-6 items-center justify-center rounded-full text-[10px] text-on-accent">
          ♥
        </span>
      </span>
    </span>
  )
}
