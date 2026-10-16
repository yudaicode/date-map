'use client'

import dynamic from 'next/dynamic'
import type { Spot } from '@/types/spot'

/**
 * 地図をブラウザ側だけで読み込むための「包み紙」。
 *
 * 【なぜこのファイルが必要か】
 * Next.js は画面を速く出すため、まずサーバー側でHTMLを組み立てます。
 * しかし地図はブラウザの機能（画面サイズ・WebGL）を使うので、サーバーでは作れません。
 * ssr: false は「サーバーでは組み立てず、ブラウザに届いてから読み込む」という指定です。
 * この指定は 'use client' のファイルの中にしか書けないルールがあるため、
 * 専用のファイルに分けています。
 */
const MapView = dynamic(() => import('./MapView'), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center bg-slate-100 text-sm text-slate-500">
      地図を読み込み中…
    </div>
  ),
})

export default function MapViewClient({ spots }: { spots: Spot[] }) {
  return <MapView spots={spots} />
}
