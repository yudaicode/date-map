import type { Session } from '@supabase/supabase-js'
import { getSupabase } from './client'

/**
 * 管理者ログインの処理。
 *
 * 【方式】メールアドレス＋パスワード
 * 管理者アカウントは Supabase の管理画面から手動で1つだけ作り、
 * 一般ユーザーの新規登録は無効にしておきます（＝あなた以外は作れない）。
 *
 * 【ログイン状態はどこに保存される？】
 * ブラウザの保存領域（localStorage）に、期限付きの引換券が保存されます。
 * この引換券があると、データベース側は「ログイン済みの人」として扱い、
 * RLS の書き込み許可が有効になります。
 */

export async function signIn(email: string, password: string): Promise<void> {
  const { error } = await getSupabase().auth.signInWithPassword({ email, password })

  if (error) {
    // Supabase からのエラーは英語なので、よくあるものは日本語に言い換える
    const message = error.message.includes('Invalid login credentials')
      ? 'メールアドレスまたはパスワードが違います。'
      : error.message.includes('Email not confirmed')
        ? 'メールアドレスがまだ確認されていません。Supabaseの管理画面でユーザーを作る際に「Auto Confirm User」を有効にしてください。'
        : `ログインに失敗しました: ${error.message}`
    throw new Error(message)
  }
}

export async function signOut(): Promise<void> {
  const { error } = await getSupabase().auth.signOut()
  if (error) throw new Error(`ログアウトに失敗しました: ${error.message}`)
}

export async function getSession(): Promise<Session | null> {
  const { data } = await getSupabase().auth.getSession()
  return data.session
}

/** ログイン状態が変わったときに知らせてくれる仕組み。戻り値を呼ぶと監視をやめる */
export function onAuthChange(callback: (session: Session | null) => void): () => void {
  const { data } = getSupabase().auth.onAuthStateChange((_event, session) => {
    callback(session)
  })
  return () => data.subscription.unsubscribe()
}
