// シーン（タグ）。Z世代が「どんなデートか」で探すときの切り口。
// ジャンル・予算・時間帯と違い、1つのスポットに複数付けられる（付けなくてもよい）。
// 増やすときは supabase/migrations の CHECK制約（spots_scenes_check）も合わせて更新すること。

export const SCENES = [
  { id: 'first_date', label: '初デート' },
  { id: 'anniversary', label: '記念日' },
  { id: 'rainy_day', label: '雨の日OK' },
  { id: 'photogenic', label: '映え' },
  { id: 'no_reservation', label: '予約なしでOK' },
] as const

export type SceneId = (typeof SCENES)[number]['id']

export function sceneLabel(id: SceneId): string {
  return SCENES.find((s) => s.id === id)?.label ?? id
}
