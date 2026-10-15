import type { Metadata } from 'next'
import { AdminModelsScreen } from '@/components/screens/admin-models-screen'

export const metadata: Metadata = {
  title: '模型管理 · FlowOS Lumen',
  robots: { index: false, follow: false },
}

export default function Page() {
  return <AdminModelsScreen />
}
