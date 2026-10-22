'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

import LocationPickerClient from './LocationPickerClient'
import SnsEmbed from '@/components/spot/SnsEmbed'
import { StatusMessage } from '@/components/ui/StatusMessage'
import { WARDS } from '@/constants/wards'
import { GENRES } from '@/constants/genres'
import { BUDGET_BANDS } from '@/constants/budgets'
import { TIME_OF_DAY } from '@/constants/timeOfDay'
import { SCENES } from '@/constants/scenes'
import { toggleValue } from '@/lib/filters/spotFilter'
import { geocodeAddress, searchPlaces, wardFromAddress, type PlaceCandidate } from '@/lib/geocode'
import { extractUrl, fetchSnsInfo, type SnsInfo } from '@/lib/sns'
import { createSpot, deleteSpot, updateSpot, type SpotInput } from '@/lib/queries/spots'
import { uploadSpotImage } from '@/lib/storage/spotImages'
import { TOKYO_CENTER } from '@/lib/map/config'
import type { Spot } from '@/types/spot'

/** 新規作成時の初期値 */
const EMPTY: SpotInput = {
  name: '',
  address: '',
  ward: 'shibuya',
  genre: 'cafe',
  budget_band: 'b1000_3000',
  time_of_day: 'both',
  scenes: [],
  memo: '',
  lat: TOKYO_CENTER[1],
  lng: TOKYO_CENTER[0],
  instagram_url: null,
  tiktok_url: null,
  image_url: null,
  is_published: true,
}

/**
 * データベースから読んだスポットを、入力欄の値に変換する。
 *
 * 【なぜ1つずつ書き写しているのか】
 * データベースは created_at / updated_at / id といった
 * 「自動で管理される列」も一緒に返してきます。
 * まとめてコピーすると、保存時にそれらまで送り返してしまい、
 * 更新日時が正しく記録されなくなる等の不具合につながります。
 * 入力欄で扱う項目だけを、明示的に選び出しています。
 */
function toInput(spot: Spot): SpotInput {
  return {
    name: spot.name,
    address: spot.address,
    ward: spot.ward,
    genre: spot.genre,
    budget_band: spot.budget_band,
    time_of_day: spot.time_of_day,
    scenes: spot.scenes,
    memo: spot.memo,
    lat: spot.lat,
    lng: spot.lng,
    instagram_url: spot.instagram_url,
    tiktok_url: spot.tiktok_url,
    image_url: spot.image_url,
    is_published: spot.is_published,
  }
}

const labelClass = 'block text-xs font-semibold text-slate-600'
// text-base sm:text-sm: スマホ幅では16px、広い画面では14px。
// iPhone は16px未満の入力欄に触れると画面を勝手に拡大してしまうため。
const inputClass =
  'w-full rounded-md border border-slate-300 px-3 py-2 text-base outline-none focus:border-slate-900 sm:text-sm'
const smallButtonClass =
  'shrink-0 rounded-md bg-slate-900 px-3 py-2 text-xs font-semibold text-white transition-opacity hover:opacity-85 disabled:opacity-50'

/** 施設が見つからないときに、Googleマップで調べてもらうためのリンク */
function googleMapsSearchUrl(name: string): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${name} 東京`)}`
}

/**
 * スマホの「共有」から開かれたときの投稿URL（/admin/spots/new?url=... の ... の部分）。
 * この部品はログイン確認の後にブラウザ側でだけ描かれるので、window を直接読んでよい。
 */
function sharedUrlFromAddressBar(): string | null {
  if (typeof window === 'undefined') return null
  return extractUrl(new URLSearchParams(window.location.search).get('url') ?? '')
}

export default function SpotForm({ existing }: { existing?: Spot }) {
  const router = useRouter()

  // existing があれば編集、なければ新規登録
  const [form, setForm] = useState<SpotInput>(() => (existing ? toInput(existing) : EMPTY))

  const [saving, setSaving] = useState(false)
  const [geocoding, setGeocoding] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  // 共有から開かれた場合の投稿URL（編集画面では使わない）
  const [sharedUrl] = useState(() => (existing ? null : sharedUrlFromAddressBar()))
  const [snsInput, setSnsInput] = useState(sharedUrl ?? '')
  const [snsLoading, setSnsLoading] = useState(Boolean(sharedUrl))
  const [snsInfo, setSnsInfo] = useState<SnsInfo | null>(null)

  const [places, setPlaces] = useState<PlaceCandidate[] | null>(null) // null = まだ検索していない
  const [placeSearching, setPlaceSearching] = useState(false)
  const [uploading, setUploading] = useState(false)

  /** 入力欄1つ分の値を書き換えるための小さな関数 */
  function update<K extends keyof SpotInput>(key: K, value: SpotInput[K]) {
    setForm((previous) => ({ ...previous, [key]: value }))
  }

  /** 投稿URLの読み込み結果を、Instagram / TikTok どちらかの欄に入れる */
  function applySnsInfo(info: SnsInfo) {
    setSnsInfo(info)
    setForm((previous) => ({
      ...previous,
      [info.platform === 'instagram' ? 'instagram_url' : 'tiktok_url']: info.url,
    }))
  }

  function showError(e: unknown) {
    setError(e instanceof Error ? e.message : String(e))
  }

  // 共有から開かれたときは、最初に1回だけ自動で投稿URLを読み込む
  useEffect(() => {
    if (!sharedUrl) return
    fetchSnsInfo(sharedUrl)
      .then(applySnsInfo)
      .catch(showError)
      .finally(() => setSnsLoading(false))
  }, [sharedUrl])

  /** 貼り付けた投稿URLを読み込む */
  async function handleLoadSns() {
    setError('')
    const url = extractUrl(snsInput)
    if (!url) {
      setError('投稿URL（https:// から始まる文字）が見つかりません。')
      return
    }
    setSnsLoading(true)
    try {
      applySnsInfo(await fetchSnsInfo(url))
    } catch (e) {
      showError(e)
    } finally {
      setSnsLoading(false)
    }
  }

  /** スポット名（施設名）から、住所と位置の候補を探す */
  async function handlePlaceSearch() {
    setError('')
    setNotice('')
    if (!form.name.trim()) {
      setError('先にスポット名（施設名・店名）を入力してください。')
      return
    }
    setPlaceSearching(true)
    try {
      setPlaces(await searchPlaces(form.name))
    } catch (e) {
      showError(e)
    } finally {
      setPlaceSearching(false)
    }
  }

  /** 検索候補を選んだら、住所・区・位置をまとめて入れる */
  function choosePlace(place: PlaceCandidate) {
    setForm((previous) => ({
      ...previous,
      address: place.address,
      ward: place.ward ?? previous.ward,
      lat: place.lat,
      lng: place.lng,
    }))
    setPlaces(null)
    setNotice(
      `「${place.name}」の位置を設定しました。住所は番地まで入らないことが多いので、必要なら書き足してください。下の地図でピンの位置も確認してください。`
    )
  }

  /** 写真を選んだら、縮小してすぐアップロードする（保存ボタンで保存されるのはURLだけ） */
  async function handleImageChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = '' // 同じ写真を選び直しても反応するように空にしておく
    if (!file) return
    setError('')
    setUploading(true)
    try {
      update('image_url', await uploadSpotImage(file))
    } catch (e) {
      showError(e)
    } finally {
      setUploading(false)
    }
  }

  /** 住所 → 緯度経度 */
  async function handleGeocode() {
    setError('')
    setNotice('')

    if (!form.address.trim()) {
      setError('先に住所を入力してください。')
      return
    }

    setGeocoding(true)
    try {
      const result = await geocodeAddress(form.address)
      // 住所に区名が入っていれば、区の選択も自動で合わせる
      const ward = wardFromAddress(result.matchedAddress)
      setForm((previous) => ({
        ...previous,
        lat: result.lat,
        lng: result.lng,
        ward: ward ?? previous.ward,
      }))
      setNotice(
        `「${result.matchedAddress}」として認識しました。ズレている場合は、下の地図でピンをドラッグして直してください。`
      )
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setGeocoding(false)
    }
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    setError('')
    setNotice('')
    setSaving(true)

    try {
      // 空欄のリンクは null として保存する（空文字と null が混ざらないように）
      const payload: SpotInput = {
        ...form,
        name: form.name.trim(),
        address: form.address.trim(),
        memo: form.memo.trim(),
        instagram_url: form.instagram_url?.trim() || null,
        tiktok_url: form.tiktok_url?.trim() || null,
      }

      if (existing) {
        await updateSpot(existing.id, payload)
      } else {
        await createSpot(payload)
      }
      router.push('/admin')
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!existing) return
    if (!window.confirm(`「${existing.name}」を削除します。元に戻せません。よろしいですか？`)) {
      return
    }

    setError('')
    setSaving(true)
    try {
      await deleteSpot(existing.id)
      router.push('/admin')
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      {error && <StatusMessage tone="error" title="エラー" detail={error} />}
      {notice && <StatusMessage title="位置を取得しました" detail={notice} />}

      {/* ① SNSの投稿URL。共有から開いた場合は自動で入る */}
      <div className="rounded-lg border border-slate-200 bg-white p-4">
        <label className={labelClass} htmlFor="sns">
          SNSの投稿URL
        </label>
        <p className="mt-0.5 text-[11px] text-slate-500">
          Instagram・TikTok の「共有」→「リンクをコピー」で取ったURLを貼って「読み込む」。
          下の Instagram / TikTok の欄に自動で入ります。
        </p>
        <div className="mt-2 flex flex-wrap gap-2">
          <input
            id="sns"
            // type="url" にしないのは、共有で付いてくる前後の文章ごと貼れるようにするため
            type="text"
            inputMode="url"
            className={`min-w-50 flex-1 ${inputClass}`}
            value={snsInput}
            onChange={(e) => setSnsInput(e.target.value)}
            placeholder="https://www.instagram.com/p/..."
          />
          <button
            type="button"
            onClick={handleLoadSns}
            disabled={snsLoading}
            className={smallButtonClass}
          >
            {snsLoading ? '読み込み中…' : '読み込む'}
          </button>
        </div>

        {snsInfo && (
          <div className="mt-3 flex flex-col gap-2">
            <p className="text-xs text-slate-600">
              {snsInfo.platform === 'instagram' ? 'Instagram' : 'TikTok'} の欄に入れました
              {snsInfo.author && `（投稿者 ${snsInfo.author}）`}
            </p>
            {snsInfo.caption && (
              <p className="line-clamp-4 rounded-md bg-slate-50 px-3 py-2 text-xs whitespace-pre-wrap text-slate-600">
                <span className="font-semibold">投稿の説明（ヒント用・保存されません）</span>
                <br />
                {snsInfo.caption}
              </p>
            )}
            <SnsEmbed url={snsInfo.url} />
          </div>
        )}
      </div>

      <div>
        <label className={labelClass} htmlFor="name">
          スポット名 <span className="text-rose-600">必須</span>
        </label>
        <div className="mt-1 flex flex-wrap gap-2">
          <input
            id="name"
            className={`min-w-50 flex-1 ${inputClass}`}
            value={form.name}
            onChange={(e) => update('name', e.target.value)}
            required
            placeholder="例: 東京タワー"
          />
          <button
            type="button"
            onClick={handlePlaceSearch}
            disabled={placeSearching}
            className={smallButtonClass}
          >
            {placeSearching ? '検索中…' : '施設名で位置を検索'}
          </button>
        </div>

        {/* ② 施設名の検索結果 */}
        {places && (
          <div className="mt-2 rounded-lg border border-slate-200 bg-white p-3 text-xs">
            {places.length === 0 ? (
              <p className="text-slate-600">
                見つかりませんでした。小さなお店は登録されていないことがあります。
              </p>
            ) : (
              <>
                <p className="mb-2 text-slate-500">
                  当てはまるものを選んでください（違う場所が出ることもあるので住所を確認）
                </p>
                <ul className="flex flex-col gap-1.5">
                  {places.map((place) => (
                    <li key={`${place.lat},${place.lng}`}>
                      <button
                        type="button"
                        onClick={() => choosePlace(place)}
                        className="w-full rounded-md border border-slate-200 px-3 py-2 text-left transition-colors hover:border-slate-900"
                      >
                        <span className="block text-sm font-semibold text-slate-900">
                          {place.name}
                        </span>
                        <span className="block text-slate-600">{place.address}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              </>
            )}
            <p className="mt-2 text-slate-600">
              見つからない・違うときは{' '}
              <a
                href={googleMapsSearchUrl(form.name)}
                target="_blank"
                rel="noreferrer"
                className="font-semibold underline"
              >
                Googleマップで調べる ↗
              </a>{' '}
              → 住所をコピーして下の住所欄に貼り、「住所から位置を取得」を押してください。
            </p>
          </div>
        )}
      </div>

      <div>
        <label className={labelClass} htmlFor="address">
          住所 <span className="text-rose-600">必須</span>
        </label>
        <div className="mt-1 flex flex-wrap gap-2">
          <input
            id="address"
            className={`min-w-50 flex-1 ${inputClass}`}
            value={form.address}
            onChange={(e) => update('address', e.target.value)}
            required
            placeholder="例: 東京都渋谷区渋谷2-24-12"
          />
          <button
            type="button"
            onClick={handleGeocode}
            disabled={geocoding}
            className="shrink-0 rounded-md bg-slate-900 px-3 py-2 text-xs font-semibold text-white transition-opacity hover:opacity-85 disabled:opacity-50"
          >
            {geocoding ? '取得中…' : '住所から位置を取得'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={labelClass} htmlFor="ward">
            区
          </label>
          <select
            id="ward"
            className={`mt-1 ${inputClass}`}
            value={form.ward}
            onChange={(e) => update('ward', e.target.value as SpotInput['ward'])}
          >
            {WARDS.map((w) => (
              <option key={w.id} value={w.id}>
                {w.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className={labelClass} htmlFor="genre">
            ジャンル
          </label>
          <select
            id="genre"
            className={`mt-1 ${inputClass}`}
            value={form.genre}
            onChange={(e) => update('genre', e.target.value as SpotInput['genre'])}
          >
            {GENRES.map((g) => (
              <option key={g.id} value={g.id}>
                {g.emoji} {g.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className={labelClass} htmlFor="budget">
            予算帯
          </label>
          <select
            id="budget"
            className={`mt-1 ${inputClass}`}
            value={form.budget_band}
            onChange={(e) => update('budget_band', e.target.value as SpotInput['budget_band'])}
          >
            {BUDGET_BANDS.map((b) => (
              <option key={b.id} value={b.id}>
                {b.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className={labelClass} htmlFor="time">
            時間帯
          </label>
          <select
            id="time"
            className={`mt-1 ${inputClass}`}
            value={form.time_of_day}
            onChange={(e) => update('time_of_day', e.target.value as SpotInput['time_of_day'])}
          >
            {TIME_OF_DAY.map((t) => (
              <option key={t.id} value={t.id}>
                {t.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* シーン（タグ）。当てはまるものをいくつでも */}
      <fieldset>
        <legend className={labelClass}>シーン（当てはまるものをすべて）</legend>
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          {SCENES.map((scene) => {
            const selected = form.scenes.includes(scene.id)
            return (
              <button
                key={scene.id}
                type="button"
                aria-pressed={selected}
                onClick={() => update('scenes', toggleValue(form.scenes, scene.id))}
                className={`rounded-full border px-3.5 py-2 text-[13px] transition-colors sm:py-1.5 sm:text-xs ${
                  selected
                    ? 'border-slate-900 bg-slate-900 text-white'
                    : 'border-slate-300 bg-white text-slate-700 hover:border-slate-500'
                }`}
              >
                {scene.label}
              </button>
            )
          })}
        </div>
      </fieldset>

      <div>
        <label className={labelClass} htmlFor="memo">
          ひとことメモ
        </label>
        <textarea
          id="memo"
          className={`mt-1 min-h-24 ${inputClass}`}
          value={form.memo}
          onChange={(e) => update('memo', e.target.value)}
          placeholder="例: 日没30分前の回を予約すると夕景と夜景を両方見られる"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className={labelClass} htmlFor="instagram">
            Instagram 投稿URL
          </label>
          <input
            id="instagram"
            type="url"
            className={`mt-1 ${inputClass}`}
            value={form.instagram_url ?? ''}
            onChange={(e) => update('instagram_url', e.target.value)}
            placeholder="https://www.instagram.com/p/..."
          />
        </div>
        <div>
          <label className={labelClass} htmlFor="tiktok">
            TikTok 投稿URL
          </label>
          <input
            id="tiktok"
            type="url"
            className={`mt-1 ${inputClass}`}
            value={form.tiktok_url ?? ''}
            onChange={(e) => update('tiktok_url', e.target.value)}
            placeholder="https://www.tiktok.com/@.../video/..."
          />
        </div>
      </div>

      {/* 写真（地図をズームしたときのサムネイル・スワイプのカードに使う） */}
      <div>
        <p className={labelClass}>写真（サムネイル）</p>
        <p className="mt-0.5 text-[11px] text-slate-500">
          自分で撮った写真か、掲載の許可をもらった写真だけを使ってください（SNS投稿のスクショは不可）。
          写真が無いスポットは、ジャンルの色と絵文字のカードで表示されます。
        </p>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          {form.image_url ? (
            // eslint-disable-next-line @next/next/no-img-element -- アップロード時に縮小済みのため next/image の変換は不要
            <img
              src={form.image_url}
              alt=""
              className="h-24 w-24 rounded-lg border border-slate-200 object-cover"
            />
          ) : (
            <div className="flex h-24 w-24 items-center justify-center rounded-lg border border-dashed border-slate-300 text-[11px] text-slate-400">
              写真なし
            </div>
          )}
          <div className="flex flex-col items-start gap-2">
            <label
              className={`cursor-pointer ${smallButtonClass} ${uploading ? 'pointer-events-none opacity-50' : ''}`}
            >
              {uploading ? 'アップロード中…' : form.image_url ? '写真を変える' : '写真を選ぶ'}
              <input
                type="file"
                accept="image/*"
                className="sr-only"
                onChange={handleImageChange}
                disabled={uploading}
              />
            </label>
            {form.image_url && (
              <button
                type="button"
                onClick={() => update('image_url', null)}
                className="text-xs text-slate-500 underline"
              >
                写真を外す
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 位置の確認・微調整 */}
      <div>
        <div className="flex flex-wrap items-end justify-between gap-2">
          <p className={labelClass}>地図上の位置（ピンをドラッグ、または地図をクリック）</p>
          <p className="text-[11px] tabular-nums text-slate-500">
            緯度 {form.lat.toFixed(6)} / 経度 {form.lng.toFixed(6)}
          </p>
        </div>
        <div className="mt-1">
          <LocationPickerClient
            lat={form.lat}
            lng={form.lng}
            onChange={(lat, lng) => setForm((previous) => ({ ...previous, lat, lng }))}
          />
        </div>
      </div>

      <label className="flex items-center gap-2 text-sm text-slate-700">
        <input
          type="checkbox"
          className="h-4 w-4"
          checked={form.is_published}
          onChange={(e) => update('is_published', e.target.checked)}
        />
        公開する（外すと下書きになり、トップページの地図には出ません）
      </label>

      <div className="flex flex-wrap items-center gap-3 border-t border-slate-200 pt-5">
        <button
          type="submit"
          disabled={saving || uploading}
          className="rounded-md bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-85 disabled:opacity-50"
        >
          {saving ? '保存中…' : existing ? '変更を保存' : '登録する'}
        </button>

        <button
          type="button"
          onClick={() => router.push('/admin')}
          className="rounded-md border border-slate-300 px-4 py-2.5 text-sm text-slate-700 transition-colors hover:bg-slate-50"
        >
          キャンセル
        </button>

        {existing && (
          <button
            type="button"
            onClick={handleDelete}
            disabled={saving}
            className="ml-auto rounded-md border border-rose-300 px-4 py-2.5 text-sm font-semibold text-rose-700 transition-colors hover:bg-rose-50 disabled:opacity-50"
          >
            削除
          </button>
        )}
      </div>
    </form>
  )
}
