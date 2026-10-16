// 予算帯。ひとり当たりの目安金額です。
// 「幅」で持つ理由: 店ごとの正確な金額は変わるので、ざっくり絞れれば十分だから。

export const BUDGET_BANDS = [
  { id: 'under_1000', label: '〜1,000円' },
  { id: 'b1000_3000', label: '1,000〜3,000円' },
  { id: 'b3000_6000', label: '3,000〜6,000円' },
  { id: 'b6000_10000', label: '6,000〜10,000円' },
  { id: 'over_10000', label: '10,000円〜' },
] as const

export type BudgetBandId = (typeof BUDGET_BANDS)[number]['id']

export function budgetLabel(id: BudgetBandId): string {
  return BUDGET_BANDS.find((b) => b.id === id)?.label ?? id
}
