// 東京23区の一覧。
// id は英数字（データベースやURLで使う用）、label は画面に出す日本語。
// この形（id + label）に揃えておくと、フィルタのボタンを自動で並べられます。

export const WARDS = [
  { id: 'chiyoda', label: '千代田区' },
  { id: 'chuo', label: '中央区' },
  { id: 'minato', label: '港区' },
  { id: 'shinjuku', label: '新宿区' },
  { id: 'bunkyo', label: '文京区' },
  { id: 'taito', label: '台東区' },
  { id: 'sumida', label: '墨田区' },
  { id: 'koto', label: '江東区' },
  { id: 'shinagawa', label: '品川区' },
  { id: 'meguro', label: '目黒区' },
  { id: 'ota', label: '大田区' },
  { id: 'setagaya', label: '世田谷区' },
  { id: 'shibuya', label: '渋谷区' },
  { id: 'nakano', label: '中野区' },
  { id: 'suginami', label: '杉並区' },
  { id: 'toshima', label: '豊島区' },
  { id: 'kita', label: '北区' },
  { id: 'arakawa', label: '荒川区' },
  { id: 'itabashi', label: '板橋区' },
  { id: 'nerima', label: '練馬区' },
  { id: 'adachi', label: '足立区' },
  { id: 'katsushika', label: '葛飾区' },
  { id: 'edogawa', label: '江戸川区' },
] as const

// WardId は 'chiyoda' | 'chuo' | ... という「決まった文字列のどれか」を表す型。
// これのおかげで 'sibuya'（打ち間違い）と書いた瞬間にエラーで教えてくれます。
export type WardId = (typeof WARDS)[number]['id']

// id から日本語の区名を引く関数
export function wardLabel(id: WardId): string {
  return WARDS.find((w) => w.id === id)?.label ?? id
}
