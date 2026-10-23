import type { Metadata } from 'next'
import './globals.css'

import { THEME_BOOT_SCRIPT } from '@/lib/theme/themeStore'
import { DEFAULT_THEME_ID } from '@/lib/theme/themes'

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
    <html lang="ja" className="h-full antialiased" data-theme={DEFAULT_THEME_ID} suppressHydrationWarning>
      <head>
        {/* 画面が描かれる前にテーマを付け替える（一瞬だけ標準の色が見えるのを防ぐ） */}
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOT_SCRIPT }} />
      </head>
      <body className="h-full">{children}</body>
    </html>
  )
}
