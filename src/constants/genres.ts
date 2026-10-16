// スポットのジャンル。
// color と emoji は地図のピンの見た目に使います（ジャンルごとに色分け）。

export const GENRES = [
  { id: 'cafe', label: 'カフェ', emoji: '☕', color: '#B45309' },
  { id: 'dinner', label: 'ディナー', emoji: '🍽️', color: '#BE123C' },
  { id: 'nightview', label: '夜景', emoji: '🌃', color: '#4338CA' },
  { id: 'experience', label: '体験', emoji: '🎨', color: '#0F766E' },
  { id: 'walk', label: '散歩・公園', emoji: '🌳', color: '#15803D' },
  { id: 'indoor', label: '屋内', emoji: '🏛️', color: '#7E22CE' },
] as const

export type GenreId = (typeof GENRES)[number]['id']

export function genre(id: GenreId) {
  return GENRES.find((g) => g.id === id)
}

export function genreLabel(id: GenreId): string {
  return genre(id)?.label ?? id
}
