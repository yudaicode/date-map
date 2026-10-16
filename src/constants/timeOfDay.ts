// 時間帯。'both' は昼でも夜でも楽しめるスポット用。

export const TIME_OF_DAY = [
  { id: 'day', label: '昼' },
  { id: 'night', label: '夜' },
  { id: 'both', label: '昼・夜どちらも' },
] as const

export type TimeOfDayId = (typeof TIME_OF_DAY)[number]['id']

export function timeOfDayLabel(id: TimeOfDayId): string {
  return TIME_OF_DAY.find((t) => t.id === id)?.label ?? id
}
