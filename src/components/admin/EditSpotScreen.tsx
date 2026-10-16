'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'

import SpotForm from '@/components/admin/SpotForm'
import { StatusMessage } from '@/components/ui/StatusMessage'
import { fetchSpot } from '@/lib/queries/spots'
import type { Spot } from '@/types/spot'

export default function EditSpotScreen() {
  // useParams は URL の [id] の部分を取り出すための仕組み
  const params = useParams<{ id: string }>()
  const id = params?.id

  const [spot, setSpot] = useState<Spot | null>(null)
  const [status, setStatus] = useState<'loading' | 'ready' | 'notFound' | 'error'>('loading')
  const [error, setError] = useState('')

  useEffect(() => {
    if (!id) return
    let cancelled = false

    fetchSpot(id)
      .then((row) => {
        if (cancelled) return
        if (!row) {
          setStatus('notFound')
          return
        }
        setSpot(row)
        setStatus('ready')
      })
      .catch((e: unknown) => {
        if (cancelled) return
        setError(e instanceof Error ? e.message : String(e))
        setStatus('error')
      })

    return () => {
      cancelled = true
    }
  }, [id])

  return (
    <div>
      <Link href="/admin" className="text-xs text-slate-500 hover:text-slate-900">
        ← 一覧に戻る
      </Link>
      <h1 className="mt-2 text-lg font-bold tracking-tight">
        {status === 'ready' && spot ? spot.name : 'スポットを編集'}
      </h1>

      <div className="mt-6">
        {status === 'loading' && <p className="text-sm text-slate-500">読み込み中…</p>}

        {status === 'notFound' && (
          <StatusMessage
            title="このスポットは見つかりませんでした"
            detail="すでに削除された可能性があります。"
          />
        )}

        {status === 'error' && (
          <StatusMessage tone="error" title="読み込みに失敗しました" detail={error} />
        )}

        {status === 'ready' && spot && <SpotForm existing={spot} />}
      </div>
    </div>
  )
}
