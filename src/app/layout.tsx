import type { Metadata } from 'next'
import { M_PLUS_Rounded_1c, Shippori_Mincho, Zen_Kaku_Gothic_New } from 'next/font/google'
import './globals.css'

import { THEME_BOOT_SCRIPT } from '@/lib/theme/themeStore'
import { DEFAULT_THEME_ID } from '@/lib/theme/themes'

// 着せ替えのテーマで使う文字（Google Fonts を自分のサイトから配信する仕組み = next/font）。
// preload: false … 日本語の文字は大きいので先読みしない。ブラウザは「いま画面で使われている文字」の
// 分だけを取りに行くので、選んでいないテーマの文字はダウンロードされない。
// variable … CSS から var(--font-rounded) のように呼び出すための名前（globals.css のテーマで使う）
const rounded = M_PLUS_Rounded_1c({ weight: ['400', '700', '800'], preload: false, variable: '--font-rounded' })
const zenkaku = Zen_Kaku_Gothic_New({ weight: ['400', '700'], preload: false, variable: '--font-zenkaku' })
const mincho = Shippori_Mincho({ weight: ['600', '800'], preload: false, variable: '--font-mincho' })

// metadata はブラウザのタブに出るタイトルや、SNSでシェアしたときの説明文に使われます
export const metadata: Metadata = {
  title: 'デートマップ | 東京23区のデートスポットを地図で探す',
  description:
    'InstagramやTikTokで見つけた東京23区のデートスポットを、地図とフィルタで探せるアプリ。',
}

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    // lang="ja" は「このページは日本語」という宣言。読み上げ機能や翻訳が正しく働きます
    // data-theme は着せ替えのテーマ。下のスクリプトが、端末に覚えたテーマへすぐ付け替える。
    // suppressHydrationWarning: その付け替えを React が「食い違い」と勘違いして警告しないための印
    <html
      lang="ja"
      className={`h-full antialiased ${rounded.variable} ${zenkaku.variable} ${mincho.variable}`}
      data-theme={DEFAULT_THEME_ID}
      suppressHydrationWarning
    >
      <head>
        {/* 画面が描かれる前にテーマを付け替える（一瞬だけ標準の色が見えるのを防ぐ） */}
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOT_SCRIPT }} />
      </head>
      <body className="h-full">{children}</body>
    </html>
  )
}
