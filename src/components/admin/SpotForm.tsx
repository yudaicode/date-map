'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

import LocationPickerClient from './LocationPickerClient'
import { StatusMessage } from '@/components/ui/StatusMessage'
import { WARDS } from '@/constants/wards'
import { GENRES } from '@/constants/genres'
import { BUDGET_BANDS } from '@/constants/budgets'
import { TIME_OF_DAY } from '@/constants/timeOfDay'
import { geocodeAddress } from '@/lib/geocode'
import { createSpot, deleteSpot, updateSpot, type SpotInput } from '@/lib/queries/spots'
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
  memo: '',
  lat: TOKYO_CENTER[1],
  lng: TOKYO_CENTER[0],
  instagram_url: null,
  tiktok_url: null,
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
    memo: spot.memo,
    lat: spot.lat,
    lng: spot.lng,
    instagram_url: spot.instagram_url,
    tiktok_url: spot.tiktok_url,
    is_published: spot.is_published,
  }
}

const labelClass = 'block text-xs font-semibold text-slate-600'
const inputClass =
  'w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-900'

export default function SpotForm({ existing }: { existing?: Spot }) {
  const router = useRouter()

  // existing があれば編集、なければ新規登録
  const [form, setForm] = useState<SpotInput>(() => (existing ? toInput(existing) : EMPTY))

  const [saving, setSaving] = useState(false)
  const [geocoding, setGeocoding] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  /** 入力欄1つ分の値を書き換えるための小さな関数 */
  function update<K extends keyof SpotInput>(key: K, value: SpotInput[K]) {
    setForm((previous) => ({ ...previous, [key]: value }))
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
      setForm((previous) => ({ ...previous, lat: result.lat, lng: result.lng }))
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

      <div>
        <label className={labelClass} htmlFor="name">
          スポット名 <span className="text-rose-600">必須</span>
        </label>
        <input
          id="name"
          className={`mt-1 ${inputClass}`}
          value={form.name}
          onChange={(e) => update('name', e.target.value)}
          required
          placeholder="例: SHIBUYA SKY"
        />
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
          disabled={saving}
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
