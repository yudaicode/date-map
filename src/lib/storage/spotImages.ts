import { getSupabase } from '@/lib/supabase/client'

/**
 * スポットの写真を Supabase Storage（写真の置き場所）にアップロードする。
 * 置き場所は supabase/migrations/0003_add_images.sql で作る。
 *
 * 【なぜアップロード前に縮小するのか】
 * iPhone の写真は1枚 3〜5MB あり、地図に何十枚も並べると表示が重くなる。
 * 長い辺を 1200px・JPEG にすると 200KB 前後になる。
 * また、写真に含まれる撮影場所などの情報（Exif）も、描き直す過程で消える。
 */

const BUCKET = 'spot-images'
const MAX_SIDE = 1200 // 長い辺の最大ピクセル数
const JPEG_QUALITY = 0.82

/** 写真を縮小して JPEG にする */
async function resizeImage(file: File): Promise<Blob> {
  let bitmap: ImageBitmap
  try {
    // imageOrientation: 'from-image' = 縦向きで撮った写真が横倒しにならないようにする
    bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' })
  } catch {
    throw new Error('この写真の形式は読み込めませんでした。JPEG か PNG の写真を選んでください。')
  }

  const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(bitmap.width * scale)
  canvas.height = Math.round(bitmap.height * scale)
  canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  bitmap.close()

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('写真の変換に失敗しました。'))),
      'image/jpeg',
      JPEG_QUALITY
    )
  })
}

/** 写真をアップロードして、表示用のURLを返す */
export async function uploadSpotImage(file: File): Promise<string> {
  const blob = await resizeImage(file)
  // ファイル名は毎回ランダムにする（同じ名前で上書きすると、古い写真が表示され続けることがあるため）
  const path = `${crypto.randomUUID()}.jpg`

  const storage = getSupabase().storage.from(BUCKET)
  const { error } = await storage.upload(path, blob, {
    contentType: 'image/jpeg',
    cacheControl: '31536000', // 同じURLの中身は変わらないので、ブラウザに長く覚えさせてよい
    upsert: false,
  })
  if (error) {
    throw new Error(
      `写真のアップロードに失敗しました: ${error.message}（写真の置き場所を作るSQL「npm run sql:images」は実行済みですか？）`
    )
  }
  return storage.getPublicUrl(path).data.publicUrl
}
