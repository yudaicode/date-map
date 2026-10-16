/**
 * Supabase の設定が正しくできているかを確認するスクリプト。
 *
 *   npm run check:supabase
 *
 * 「アプリが動かない」ときに、原因が .env.local なのか、SQLの実行忘れなのか、
 * RLSの設定なのかを切り分けるために使います。
 */
import { existsSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createClient } from '@supabase/supabase-js'

const projectRoot = join(dirname(fileURLToPath(import.meta.url)), '..')
const envPath = join(projectRoot, '.env.local')

const ok = (msg) => console.log(`  OK   ${msg}`)
const ng = (msg) => console.log(`  NG   ${msg}`)

console.log('\n=== Supabase 接続チェック ===\n')

// --- 1. .env.local があるか ---------------------------------
if (!existsSync(envPath)) {
  ng('.env.local が見つかりません。')
  console.log('\n  対処: プロジェクト直下に .env.local を作り、次の2行を書いてください。')
  console.log('    NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co')
  console.log('    NEXT_PUBLIC_SUPABASE_ANON_KEY=（anon public キー）\n')
  process.exit(1)
}
ok('.env.local が見つかりました')

// --- 2. 中身を読む ------------------------------------------
const env = {}
for (const line of readFileSync(envPath, 'utf8').split(/\r?\n/)) {
  const trimmed = line.trim()
  if (!trimmed || trimmed.startsWith('#')) continue
  const index = trimmed.indexOf('=')
  if (index === -1) continue
  env[trimmed.slice(0, index).trim()] = trimmed.slice(index + 1).trim()
}

const url = env.NEXT_PUBLIC_SUPABASE_URL
const anonKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!url) {
  ng('NEXT_PUBLIC_SUPABASE_URL が空です')
  process.exit(1)
}
if (!anonKey) {
  ng('NEXT_PUBLIC_SUPABASE_ANON_KEY が空です')
  process.exit(1)
}
if (!/^https:\/\/.+\.supabase\.co\/?$/.test(url)) {
  ng(`URLの形式が想定と違います: ${url}`)
  console.log('       https://xxxxxxxx.supabase.co の形を貼り付けてください。')
  process.exit(1)
}
ok(`URL: ${url}`)
ok(`キー: ${anonKey.slice(0, 12)}…（${anonKey.length}文字）`)

if (env.SUPABASE_SERVICE_ROLE_KEY || /service_role/.test(anonKey)) {
  ng('service_role キーが .env.local に入っている可能性があります。')
  console.log('       service_role キーは RLS を無視できる強力な鍵です。')
  console.log('       このプロジェクトでは使いません。削除して anon public キーを使ってください。')
  process.exit(1)
}

// --- 3. 実際に接続して読んでみる -----------------------------
const supabase = createClient(url, anonKey)

const { data, error, count } = await supabase
  .from('spots')
  .select('id, name, is_published', { count: 'exact' })
  .limit(3)

if (error) {
  ng(`spots 表を読めませんでした: ${error.message}`)
  console.log('\n  よくある原因:')
  if (/relation .* does not exist|schema cache/i.test(error.message)) {
    console.log('    - supabase/migrations/0001_create_spots.sql をまだ実行していない')
    console.log('      → Supabase の SQL Editor に貼り付けて Run してください。')
  } else if (/Invalid API key|JWT/i.test(error.message)) {
    console.log('    - キーの貼り付け間違い（途中で切れている / 別のキー）')
  } else {
    console.log('    - RLS の設定が未実行、またはキーが別プロジェクトのもの')
  }
  console.log('')
  process.exit(1)
}

ok(`spots 表に接続できました（公開済み ${count ?? 0} 件）`)

if ((count ?? 0) === 0) {
  console.log('\n  ヒント: 0件の場合は supabase/seed.sql を SQL Editor で実行すると')
  console.log('          動作確認用の10件が入ります。\n')
} else {
  console.log('\n  読み取れた例:')
  for (const row of data ?? []) console.log(`    - ${row.name}`)
  console.log('')
}

// --- 4. 書き込みが拒否されるか（RLSが効いているか）------------
const { error: writeError } = await supabase.from('spots').insert({
  name: '__rls_test__',
  address: '東京都千代田区',
  ward: 'chiyoda',
  genre: 'cafe',
  budget_band: 'under_1000',
  time_of_day: 'day',
  lat: 35.68,
  lng: 139.76,
})

if (writeError) {
  ok('ログインなしでの書き込みは拒否されました（RLSが正しく効いています）')
} else {
  ng('ログインなしで書き込めてしまいました。RLS が有効になっていません。')
  console.log('       0001_create_spots.sql の RLS 部分を実行し直してください。')
  await supabase.from('spots').delete().eq('name', '__rls_test__')
  process.exit(1)
}

console.log('\n=== すべて正常です ===\n')
