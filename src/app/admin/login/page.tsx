'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

import { StatusMessage } from '@/components/ui/StatusMessage'
import { signIn } from '@/lib/supabase/auth'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    setError('')
    setSubmitting(true)

    try {
      await signIn(email, password)
      router.replace('/admin')
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
      setSubmitting(false)
    }
  }

  return (
    <div className="mx-auto max-w-sm">
      <h1 className="text-lg font-bold tracking-tight">管理者ログイン</h1>
      <p className="mt-1 text-xs text-slate-500">
        このアカウントはあなた専用です。一般の方の新規登録はできません。
      </p>

      <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
        {error && <StatusMessage tone="error" title="ログインできません" detail={error} />}

        <div>
          <label className="block text-xs font-semibold text-slate-600" htmlFor="email">
            メールアドレス
          </label>
          <input
            id="email"
            type="email"
            autoComplete="username"
            required
            className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-base outline-none focus:border-slate-900 sm:text-sm"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-600" htmlFor="password">
            パスワード
          </label>
          <input
            id="password"
            type="password"
            autoComplete="current-password"
            required
            className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-base outline-none focus:border-slate-900 sm:text-sm"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="mt-2 rounded-md bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-85 disabled:opacity-50"
        >
          {submitting ? 'ログイン中…' : 'ログイン'}
        </button>
      </form>
    </div>
  )
}
