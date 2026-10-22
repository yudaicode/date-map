/**
 * Instagram / TikTok の投稿URLを見分けたり、埋め込み用の情報を取り出したりする。
 *
 * 【大事な決まり】
 * ここでは「URLの文字列を読むだけ」で、投稿の中身を自動で集めることはしません
 * （Instagram / TikTok の規約で禁止されているため）。
 * 投稿の表示には、各サービスが公式に用意している「埋め込み」の仕組みだけを使います。
 *
 * 画面（React）に依存しない書き方にしてあるので、iOS版でもそのまま使い回せます。
 */

export type SnsPlatform = 'instagram' | 'tiktok'

/** 文字列をURLとして読む。URLでなければ null */
function parseUrl(value: string): URL | null {
  try {
    const url = new URL(value.trim())
    return url.protocol === 'https:' || url.protocol === 'http:' ? url : null
  } catch {
    return null
  }
}

/** どのSNSのURLか。どちらでもなければ null */
export function detectSnsPlatform(value: string): SnsPlatform | null {
  const url = parseUrl(value)
  if (!url) return null
  const host = url.hostname.replace(/^www\./, '')
  if (host === 'instagram.com' || host.endsWith('.instagram.com')) return 'instagram'
  if (host === 'tiktok.com' || host.endsWith('.tiktok.com')) return 'tiktok'
  return null
}

/**
 * 文章の中からURLを1つ取り出す。
 * スマホの「共有」では「〇〇さんの投稿をチェック https://...」のように
 * URLの前後に文章が付いてくることがあるため。
 */
export function extractUrl(text: string): string | null {
  return text.match(/https?:\/\/[^\s"'<>]+/)?.[0] ?? null
}

/**
 * Instagram の投稿の「短い識別コード」を取り出す。
 * 例: https://www.instagram.com/p/AbC123/?igsh=xxx → { kind: 'p', code: 'AbC123' }
 */
export function instagramPostCode(value: string): { kind: 'p' | 'reel'; code: string } | null {
  const url = parseUrl(value)
  if (!url || detectSnsPlatform(value) !== 'instagram') return null
  // /p/コード/ や /reel/コード/、/ユーザー名/p/コード/ の形に対応
  const match = url.pathname.match(/\/(p|reel|reels|tv)\/([A-Za-z0-9_-]+)/)
  if (!match) return null
  return { kind: match[1] === 'p' || match[1] === 'tv' ? 'p' : 'reel', code: match[2] }
}

/**
 * 保存用にURLを整える。
 * Instagram は ?igsh=... のような「誰が共有したか」を表す余計な部分を取り除く
 * （あなたのアカウントの手がかりを公開ページに載せないため）。
 */
export function normalizeSnsUrl(value: string): string {
  const trimmed = value.trim()
  const ig = instagramPostCode(trimmed)
  if (ig) return `https://www.instagram.com/${ig.kind}/${ig.code}/`

  const url = parseUrl(trimmed)
  if (url && detectSnsPlatform(trimmed) === 'tiktok') {
    url.search = '' // ?is_from_webapp=1&sender_device=... などを外す
    url.hash = ''
    return url.toString()
  }
  return trimmed
}

/** TikTok の動画番号を取り出す。例: .../@user/video/7123456789 → '7123456789' */
export function tiktokVideoId(value: string): string | null {
  const url = parseUrl(value)
  if (!url || detectSnsPlatform(value) !== 'tiktok') return null
  return url.pathname.match(/\/video\/(\d+)/)?.[1] ?? null
}

/** TikTok の短縮URL（vt.tiktok.com/xxxx など）か。動画番号を知るには転送先を調べる必要がある */
export function isTiktokShortUrl(value: string): boolean {
  const url = parseUrl(value)
  if (!url) return false
  return ['vt.tiktok.com', 'vm.tiktok.com'].includes(url.hostname) || /^\/t\//.test(url.pathname)
}

/** 公式の埋め込み表示用のURL。作れなければ null */
export function snsEmbedUrl(value: string): string | null {
  const ig = instagramPostCode(value)
  if (ig) return `https://www.instagram.com/${ig.kind}/${ig.code}/embed/`

  const videoId = tiktokVideoId(value)
  if (videoId) return `https://www.tiktok.com/player/v1/${videoId}?description=1`

  return null
}

/** 投稿URLを読み込んだ結果（/api/sns-info が返す形） */
export type SnsInfo = {
  platform: SnsPlatform
  url: string // 保存用に整えたURL
  embedUrl: string | null
  author: string | null // 例: @tokyo_date（TikTokのみ）
  caption: string | null // 投稿の説明文（TikTokのみ。ヒントとして表示するだけで保存しない）
}

/** ブラウザから /api/sns-info を呼び出す */
export async function fetchSnsInfo(url: string): Promise<SnsInfo> {
  const response = await fetch(`/api/sns-info?url=${encodeURIComponent(url)}`)
  const body = await response.json()
  if (!response.ok) throw new Error(body?.error ?? '投稿URLの読み込みに失敗しました。')
  return body as SnsInfo
}
