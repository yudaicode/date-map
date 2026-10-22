'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

import { StatusMessage } from '@/components/ui/StatusMessage'
import { createSpots, fetchAllSpots } from '@/lib/queries/spots'
import { parseBulkText, type ParsedRow } from '@/lib/validation/spotInput'
import { wardLabel } from '@/constants/wards'
import { genreLabel } from '@/constants/genres'
import { budgetLabel } from '@/constants/budgets'
import { timeOfDayLabel } from '@/constants/timeOfDay'
import { sceneLabel } from '@/constants/scenes'

/** 名前の比較用。空白と大文字小文字の違いを無視する（「SHIBUYA SKY」と「shibuya sky」を同じとみなす） */
function nameKey(name: string): string {
  return name.replace(/\s+/g, '').toLowerCase()
}

/**
 * まとめて登録する画面。
 * 流れ: 貼り付ける →「内容を確認」→ 一覧で中身を見る →「〇件を登録」
 *
 * 登録済みと同じ名前のスポットは、二重登録を防ぐため最初はチェックを外しておく。
 */
export default function BulkImportScreen() {
  const [text, setText] = useState('')
  const [isPublished, setIsPublished] = useState(true)
  const [rows, setRows] = useState<ParsedRow[] | null>(null) // null = まだ確認していない
  const [selected, setSelected] = useState<boolean[]>([])
  const [existingNames, setExistingNames] = useState<Set<string>>(new Set())
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [savedCount, setSavedCount] = useState<number | null>(null)

  // 二重登録の確認用に、登録済みのスポット名を読んでおく
  useEffect(() => {
    let cancelled = false
    fetchAllSpots()
      .then((spots) => {
        if (!cancelled) setExistingNames(new Set(spots.map((s) => nameKey(s.name))))
      })
      .catch((e: unknown) => {
        if (!cancelled) setError(e instanceof Error ? e.message : String(e))
      })
    return () => {
      cancelled = true
    }
  }, [])

  /** その行が「登録済み、または同じ貼り付けの中で重複」しているか */
  function isDuplicate(index: number, list: ParsedRow[]): boolean {
    const input = list[index].input
    if (!input) return false
    const key = nameKey(input.name)
    if (existingNames.has(key)) return true
    return list.slice(0, index).some((row) => row.input && nameKey(row.input.name) === key)
  }

  function handleCheck() {
    setError('')
    setSavedCount(null)
    const result = parseBulkText(text, isPublished)
    if (result.error) {
      setError(result.error)
      setRows(null)
      return
    }
    setRows(result.rows)
    // 問題がなく、重複でもない行だけを最初から選んでおく
    setSelected(result.rows.map((row, i) => row.input !== null && !isDuplicate(i, result.rows)))
  }

  async function handleSave() {
    if (!rows) return
    // 公開・下書きの選択は「内容を確認」の後に変えても反映されるよう、保存直前に上書きする
    const inputs = rows
      .filter((row, i) => selected[i] && row.input)
      .map((row) => ({ ...row.input!, is_published: isPublished }))
    if (inputs.length === 0) return

    setError('')
    setSaving(true)
    try {
      const count = await createSpots(inputs)
      setSavedCount(count)
      setRows(null)
      setText('')
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setSaving(false)
    }
  }

  const selectedCount = rows ? rows.filter((row, i) => selected[i] && row.input).length : 0
  const errorCount = rows ? rows.filter((row) => !row.input).length : 0

  return (
    <div className="flex flex-col gap-5">
      {error && <StatusMessage tone="error" title="エラー" detail={error} />}
      {savedCount !== null && (
        <StatusMessage
          title={`${savedCount}件を登録しました`}
          detail="一覧や地図で確認できます。続けて登録する場合は、次のデータを貼り付けてください。"
        />
      )}

      <div>
        <label className="block text-xs font-semibold text-slate-600" htmlFor="bulk">
          Claude が作った登録用データを、まるごと貼り付けてください
        </label>
        <textarea
          id="bulk"
          className="mt-1 min-h-48 w-full rounded-md border border-slate-300 px-3 py-2 font-mono text-base outline-none focus:border-slate-900 sm:text-xs"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={'[\n  { "name": "...", "address": "...", ... },\n  ...\n]'}
          spellCheck={false}
        />
      </div>

      <fieldset className="flex flex-wrap gap-4 text-sm text-slate-700">
        <legend className="sr-only">公開の設定</legend>
        <label className="flex items-center gap-2">
          <input type="radio" checked={isPublished} onChange={() => setIsPublished(true)} />
          すぐ公開する
        </label>
        <label className="flex items-center gap-2">
          <input type="radio" checked={!isPublished} onChange={() => setIsPublished(false)} />
          下書きで登録（あとで1件ずつ確認して公開）
        </label>
      </fieldset>

      <div>
        <button
          type="button"
          onClick={handleCheck}
          disabled={!text.trim()}
          className="rounded-md bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-85 disabled:opacity-50"
        >
          内容を確認
        </button>
      </div>

      {rows && (
        <section className="flex flex-col gap-3">
          <p className="text-sm text-slate-700">
            {rows.length}件を読み取りました
            {errorCount > 0 && (
              <span className="font-semibold text-rose-700">（うち{errorCount}件に問題あり）</span>
            )}
            。チェックを付けたものだけ登録します。
          </p>

          <ul className="flex flex-col gap-2">
            {rows.map((row, i) => {
              const duplicate = isDuplicate(i, rows)
              const input = row.input
              return (
                <li
                  key={i}
                  className={`rounded-lg border bg-white px-3 py-2.5 text-xs ${
                    input ? 'border-slate-200' : 'border-rose-300 bg-rose-50'
                  }`}
                >
                  <label className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      className="mt-0.5 h-4 w-4 shrink-0"
                      checked={selected[i] ?? false}
                      disabled={!input}
                      onChange={(e) =>
                        setSelected((prev) => prev.map((v, j) => (j === i ? e.target.checked : v)))
                      }
                    />
                    <span className="min-w-0 flex-1">
                      {input ? (
                        <>
                          <span className="block text-sm font-semibold text-slate-900">
                            {i + 1}. {input.name}
                          </span>
                          <span className="block text-slate-600">
                            {wardLabel(input.ward)} ・ {genreLabel(input.genre)} ・{' '}
                            {budgetLabel(input.budget_band)} ・ {timeOfDayLabel(input.time_of_day)}
                            {input.scenes.length > 0 &&
                              ` ・ ${input.scenes.map((s) => `#${sceneLabel(s)}`).join(' ')}`}
                          </span>
                          <span className="block text-slate-500">{input.address}</span>
                          {input.memo && (
                            <span className="mt-1 block text-slate-700">{input.memo}</span>
                          )}
                          <span className="mt-1 block text-slate-500">
                            {input.tiktok_url && 'TikTok あり '}
                            {input.instagram_url && 'Instagram あり '}
                            {!input.tiktok_url && !input.instagram_url && (
                              <span className="text-amber-700">SNSの投稿URLなし</span>
                            )}
                          </span>
                          {duplicate && (
                            <span className="mt-1 block font-semibold text-amber-700">
                              同じ名前のスポットが登録済み（または貼り付けの中で重複）です。二重登録にならないか確認してください。
                            </span>
                          )}
                        </>
                      ) : (
                        <>
                          <span className="block text-sm font-semibold text-rose-900">
                            {i + 1}. この行は登録できません
                          </span>
                          <ul className="mt-1 list-disc pl-4 text-rose-800">
                            {row.errors.map((message) => (
                              <li key={message}>{message}</li>
                            ))}
                          </ul>
                        </>
                      )}
                    </span>
                  </label>
                </li>
              )
            })}
          </ul>

          <div className="flex flex-wrap items-center gap-3 border-t border-slate-200 pt-4">
            <button
              type="button"
              onClick={handleSave}
              disabled={saving || selectedCount === 0}
              className="rounded-md bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-85 disabled:opacity-50"
            >
              {saving
                ? '登録中…'
                : `${selectedCount}件を${isPublished ? '公開で' : '下書きで'}登録する`}
            </button>
            <Link href="/admin" className="text-sm text-slate-600 underline">
              一覧に戻る
            </Link>
          </div>
        </section>
      )}
    </div>
  )
}
