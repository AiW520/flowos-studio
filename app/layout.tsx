import './globals.css'
import type { Metadata } from 'next'
export const metadata:Metadata={title:'FlowOS · AI 创作工作台',description:'从 Brief 到可交付成片的 AI 原生创作操作系统'}
const themeScript = `(function(){try{var t=localStorage.getItem('flowos:theme');if(t!=='dark'&&t!=='light'){t=matchMedia('(prefers-color-scheme: light)').matches?'light':'dark'}document.documentElement.dataset.theme=t;document.documentElement.style.colorScheme=t}catch(e){document.documentElement.dataset.theme='dark'}})()`
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="zh-CN" suppressHydrationWarning><head><script dangerouslySetInnerHTML={{__html:themeScript}} /></head><body>{children}</body></html>}
