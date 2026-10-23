import { detectSnsPlatform, snsEmbedUrl } from '@/lib/sns'

/**
 * Instagram / TikTok の投稿を、各サービス公式の埋め込みプレーヤーで表示する。
 *
 * 写真や動画をこちらで保存・転載するのではなく、元の投稿をそのまま「窓」越しに
 * 見せる仕組みなので、投稿者の権利を侵害しない（投稿者名も元のまま表示される）。
 * 投稿が削除・非公開になった場合は、窓の中に各サービスのお知らせが出る。
 */
export default function SnsEmbed({ url }: { url: string }) {
  const src = snsEmbedUrl(url)
  if (!src) return null

  const isTiktok = detectSnsPlatform(url) === 'tiktok'

  return (
    <iframe
      src={src}
      title={isTiktok ? 'TikTok の投稿' : 'Instagram の投稿'}
      loading="lazy" // 画面に近づくまで読み込まない（ページを軽くするため）
      allow="encrypted-media; fullscreen; picture-in-picture"
      allowFullScreen
      // TikTok は縦長の動画、Instagram は写真＋投稿者名＋説明文が入る高さにする
      className={`w-full max-w-[340px] rounded-panel border border-line bg-surface ${
        isTiktok ? 'h-[600px]' : 'h-[640px]'
      }`}
    />
  )
}
