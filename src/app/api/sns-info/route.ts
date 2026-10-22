import { NextResponse } from 'next/server'

import {
  detectSnsPlatform,
  isTiktokShortUrl,
  normalizeSnsUrl,
  snsEmbedUrl,
  tiktokVideoId,
  type SnsInfo,
} from '@/lib/sns'

/**
 * 投稿URL → 保存用に整えたURL・埋め込み表示用URL・投稿者名 を返す中継窓口。
 * 管理画面の登録フォームから /api/sns-info?url=... のように呼び出します。
 *
 * 【やっていること】
 * - TikTok の短縮URL（vt.tiktok.com/...）を、転送先の正式なURLに置き換える
 * - TikTok の公式窓口（oEmbed）から動画番号（埋め込み用）と、あれば投稿者名・説明文を受け取る
 *   → 2026年10月時点の oEmbed は投稿者名・説明文を返さないことが多い。返ってきたときだけ表示する
 *   → 説明文は「スポット名を考えるヒント」として画面に出すだけで、保存はしない
 * - Instagram は公式窓口の利用に審査付きのキーが必要なため、URLの整形だけを行う
 *
 * 投稿ページの中身を読み取る（スクレイピング）ことは、規約違反なので一切しない。
 */

const TIMEOUT = 8_000

/** 短縮URLの転送先をたどる（最大3回） */
async function resolveRedirects(url: string): Promise<string> {
  let current = url
  for (let i = 0; i < 3; i++) {
    const response = await fetch(current, {
      redirect: 'manual', // 自動で転送先に進まず、転送先の住所だけ受け取る
      signal: AbortSignal.timeout(TIMEOUT),
    })
    const next = response.headers.get('location')
    if (!next) break
    current = new URL(next, current).toString()
  }
  return current
}

type TiktokOembed = {
  author_unique_id?: string
  author_name?: string
  title?: string
  embed_product_id?: string // 動画番号
}

async function fetchTiktokOembed(url: string): Promise<TiktokOembed | null> {
  try {
    const response = await fetch(`https://www.tiktok.com/oembed?url=${encodeURIComponent(url)}`, {
      signal: AbortSignal.timeout(TIMEOUT),
    })
    return response.ok ? ((await response.json()) as TiktokOembed) : null
  } catch {
    return null
  }
}

export async function GET(request: Request) {
  const raw = new URL(request.url).searchParams.get('url')?.trim() ?? ''
  const platform = detectSnsPlatform(raw)

  if (!platform) {
    return NextResponse.json(
      { error: 'Instagram か TikTok の投稿URLを入力してください。' },
      { status: 400 }
    )
  }

  if (platform === 'instagram') {
    const url = normalizeSnsUrl(raw)
    const info: SnsInfo = { platform, url, embedUrl: snsEmbedUrl(url), author: null, caption: null }
    return NextResponse.json(info)
  }

  // TikTok
  let url = normalizeSnsUrl(raw)
  if (isTiktokShortUrl(raw)) {
    try {
      const resolved = await resolveRedirects(raw)
      // 転送先が「動画のページ」のときだけ置き換える。
      // 無効な短縮URLだとトップページに転送されるので、その場合は元のURLのまま保存する
      if (tiktokVideoId(resolved)) url = normalizeSnsUrl(resolved)
    } catch {
      // 転送先が分からなくても、短縮URLのまま保存はできるので続ける
    }
  }

  const oembed = await fetchTiktokOembed(url)
  const videoId = tiktokVideoId(url) ?? oembed?.embed_product_id
  const info: SnsInfo = {
    platform,
    url,
    embedUrl: videoId ? snsEmbedUrl(`https://www.tiktok.com/video/${videoId}`) : null,
    author: oembed?.author_unique_id ? `@${oembed.author_unique_id}` : (oembed?.author_name ?? null),
    caption: oembed?.title?.trim() || null,
  }
  return NextResponse.json(info)
}
