import type { Metadata } from 'next'
import './globals.css'

// metadata はブラウザのタブに出るタイトルや、SNSでシェアしたときの説明文に使われます
export const metadata: Metadata = {
  title: 'デートマップ | 東京23区のデートスポットを地図で探す',
  description:
    'InstagramやTikTokで見つけた東京23区のデートスポットを、地図とフィルタで探せるアプリ。',
}

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    // lang="ja" は「このページは日本語」という宣言。読み上げ機能や翻訳が正しく働きます
    <html lang="ja" className="h-full antialiased">
      <body className="h-full">{children}</body>
    </html>
  )
}
