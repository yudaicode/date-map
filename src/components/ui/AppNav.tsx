'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

import { useSavedSpots } from '@/components/spot/useSavedSpots'

/** 一般向けの3つの画面。地図で探す / スワイプで選ぶ / 保存した一覧 */
const TABS = [
  { href: '/', label: '地図', icon: '🗺️' },
  { href: '/swipe', label: 'スワイプ', icon: '💘' },
  { href: '/saved', label: '保存', icon: '♥' },
] as const

function useTabs() {
  const pathname = usePathname()
  const { entries } = useSavedSpots()
  return TABS.map((tab) => ({
    ...tab,
    active: pathname === tab.href,
    badge: tab.href === '/saved' && entries.length > 0 ? entries.length : null,
  }))
}

/** スマホ幅で画面の下に出すタブ（親指で押しやすい位置）。広い画面では隠す */
export function TabBar() {
  const tabs = useTabs()
  return (
    <nav
      aria-label="画面の切り替え"
      // pb-[env(safe-area-inset-bottom)]: iPhone の画面下の「ホームバー」に重ならないよう余白を足す
      className="z-30 flex shrink-0 border-t border-line bg-surface pb-[env(safe-area-inset-bottom)] md:hidden"
    >
      {tabs.map((tab) => (
        <Link
          key={tab.href}
          href={tab.href}
          aria-current={tab.active ? 'page' : undefined}
          className={`relative flex flex-1 flex-col items-center gap-0.5 py-2 text-[11px] ${
            tab.active ? 'font-bold text-ink' : 'text-muted'
          }`}
        >
          <span className="text-lg leading-none">{tab.icon}</span>
          {tab.label}
          {tab.badge !== null && (
            <span className="absolute top-1 left-1/2 ml-2 min-w-4 rounded-full bg-accent px-1 text-[10px] leading-4 font-bold text-on-accent">
              {tab.badge}
            </span>
          )}
        </Link>
      ))}
    </nav>
  )
}

/** 広い画面でヘッダーに並べるリンク。スマホ幅では下のタブがあるので隠す */
export function HeaderNav() {
  const tabs = useTabs()
  return (
    <nav aria-label="画面の切り替え" className="hidden items-center gap-1 md:flex">
      {tabs.map((tab) => (
        <Link
          key={tab.href}
          href={tab.href}
          aria-current={tab.active ? 'page' : undefined}
          className={`rounded-md px-2.5 py-1.5 text-xs transition-colors ${
            tab.active ? 'bg-inverse font-semibold text-on-inverse' : 'text-ink-mid hover:bg-sunken'
          }`}
        >
          {tab.icon} {tab.label}
          {tab.badge !== null && `（${tab.badge}）`}
        </Link>
      ))}
    </nav>
  )
}
