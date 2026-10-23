import type { Metadata } from 'next'
import SavedScreen from '@/components/spot/SavedScreen'

export const metadata: Metadata = {
  title: '保存したスポット | デートマップ',
}

export default function SavedPage() {
  return <SavedScreen />
}
