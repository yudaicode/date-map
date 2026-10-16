/** 読み込み中・エラー・0件 のときに出す共通の表示 */
export function StatusMessage({
  tone = 'info',
  title,
  detail,
}: {
  tone?: 'info' | 'error'
  title: string
  detail?: string
}) {
  const color =
    tone === 'error'
      ? 'border-rose-200 bg-rose-50 text-rose-900'
      : 'border-slate-200 bg-white text-slate-700'

  return (
    <div className={`mx-auto max-w-md rounded-lg border px-4 py-3 text-sm shadow-sm ${color}`}>
      <p className="font-semibold">{title}</p>
      {detail && <p className="mt-1 whitespace-pre-wrap text-xs leading-relaxed">{detail}</p>}
    </div>
  )
}
