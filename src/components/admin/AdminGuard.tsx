'use client'

import { useEffect, useState, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'

import { StatusMessage } from '@/components/ui/StatusMessage'
import { getSession, onAuthChange } from '@/lib/supabase/auth'

type State = 'checking' | 'signedIn' | 'signedOut' | 'failed'

/**
 * ログインしていなければログイン画面へ送る「門番」。
 *
 * 【重要：これはセキュリティ対策ではありません】
 * これは画面の出し分けをしているだけです。
 * 本当の防御は、データベース側の RLS（行レベルセキュリティ）が行っています。
 * 仮に誰かがこの門番を回避して画面を開いても、
 * ログインしていなければ、データの追加・編集・削除は一切できません。
 */
export default function AdminGuard({ children }: { children: ReactNode }) {
  const router = useRouter()
  const [state, setState] = useState<State>('checking')
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    let unsubscribe = () => {}

    /** 設定ミスや通信エラーを、画面に出せる形で受け止める */
    function fail(e: unknown) {
      if (cancelled) return
      setError(e instanceof Error ? e.message : String(e))
      setState('failed')
    }

    try {
      // ログアウトされた瞬間にも反応できるよう、状態の変化を監視する。
      // .env.local が未設定だとここで例外が出るので、必ず try で囲む。
      unsubscribe = onAuthChange((session) => {
        if (!cancelled) setState(session ? 'signedIn' : 'signedOut')
      })

      getSession()
        .then((session) => {
          if (!cancelled) setState(session ? 'signedIn' : 'signedOut')
        })
        .catch(fail)
    } catch (e) {
      fail(e)
    }

    return () => {
      cancelled = true
      unsubscribe()
    }
  }, [])

  useEffect(() => {
    if (state === 'signedOut') router.replace('/admin/login')
  }, [state, router])

  if (state === 'failed') {
    return (
      <StatusMessage
        tone="error"
        title="管理画面を開けませんでした"
        detail={error}
      />
    )
  }

  if (state !== 'signedIn') {
    return (
      <p className="text-sm text-slate-500">
        {state === 'checking' ? 'ログイン状態を確認しています…' : 'ログイン画面へ移動します…'}
      </p>
    )
  }

  return <>{children}</>
}
