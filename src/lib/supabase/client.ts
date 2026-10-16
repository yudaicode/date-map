import { createClient, type SupabaseClient } from '@supabase/supabase-js'

/**
 * Supabase（クラウド上のデータベース）への接続を作る。
 *
 * 【anonキーは公開されても大丈夫なのか？】
 * 大丈夫です。このキーは「誰でも持っている鍵」という前提で設計されています。
 * 実際に何ができるかは、データベース側の RLS（行レベルセキュリティ）が決めます。
 * 今回の設定では、鍵を持っていても「公開済みスポットを読む」ことしかできません。
 * 追加・編集・削除にはログインが必要です。
 *
 * 【逆に絶対に漏らしてはいけないキー】
 * Supabase の画面には service_role という別のキーもあります。
 * こちらは RLS を無視して何でもできてしまうため、
 * このプロジェクトでは一切使いません（.env.local にも書きません）。
 */

let cached: SupabaseClient | null = null

export function getSupabase(): SupabaseClient {
  if (cached) return cached

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url || !anonKey) {
    throw new Error(
      [
        'Supabaseの接続情報が設定されていません。',
        '',
        'プロジェクト直下の .env.local に次の2行を書いてください:',
        '  NEXT_PUBLIC_SUPABASE_URL=（SupabaseのProject URL）',
        '  NEXT_PUBLIC_SUPABASE_ANON_KEY=（Supabaseのanon public キー）',
        '',
        '書き換えたあとは、開発サーバーを Ctrl+C で止めて npm run dev で再起動してください。',
        '（.env.local は起動時にしか読み込まれないため）',
      ].join('\n')
    )
  }

  cached = createClient(url, anonKey)
  return cached
}
