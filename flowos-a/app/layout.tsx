import type { Metadata } from 'next'
import '@xyflow/react/dist/style.css'
import './globals.css'

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'http://flow.47.107.92.13.nip.io'),
  applicationName: 'FlowOS Lumen',
  title: {
    default: 'FlowOS Lumen · AI 创作工作台',
    template: '%s · FlowOS Lumen',
  },
  description: '从灵感、资产到成片的一体化 AI 创作工作台',
  openGraph: {
    title: 'FlowOS Lumen · AI 创作工作台',
    description: '从灵感、资产到成片的一体化 AI 创作工作台',
    type: 'website',
    locale: 'zh_CN',
    siteName: 'FlowOS Lumen',
  },
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  )
}
