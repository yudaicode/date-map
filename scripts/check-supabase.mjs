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

// --- 2b. 危険な鍵を貼っていないか -----------------------------
// Supabase には2世代のキー形式がある:
//   旧: JWT（eyJ... で始まる長い文字列。中に role が書いてある）
//   新: sb_publishable_... （公開用） / sb_secret_... （秘密用）
function keyRole(key) {
  if (key.startsWith('sb_secret_')) return 'secret'
  if (key.startsWith('sb_publishable_')) return 'publishable'
  if (key.startsWith('eyJ')) {
    try {
      const payload = JSON.parse(Buffer.from(key.split('.')[1], 'base64url').toString('utf8'))
      return payload.role ?? 'unknown'
    } catch {
      return 'unknown'
    }
  }
  return 'unknown'
}

const role = keyRole(anonKey)

if (role === 'service_role' || role === 'secret') {
  ng('秘密のキー（service_role / secret）が貼られています。ただちに差し替えてください。')
  console.log('       このキーは RLS を無視して何でもできてしまう強力な鍵です。')
  console.log('       NEXT_PUBLIC_ で始まる変数はブラウザに送られるため、絶対に入れてはいけません。')
  console.log('       Supabase の API Keys 画面から anon public（または publishable）キーを使ってください。')
  process.exit(1)
}

if (role === 'anon' || role === 'publishable') {
  ok(`キーの種類: ${role}（公開してよいキー）`)
} else {
  console.log(`  ??   キーの種類を判別できませんでした（${role}）。続行して実際に試します。`)
}

if (env.SUPABASE_SERVICE_ROLE_KEY) {
  ng('.env.local に SUPABASE_SERVICE_ROLE_KEY が書かれています。')
  console.log('       このプロジェクトでは使いません。行ごと削除してください。')
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
