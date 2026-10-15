import Link from 'next/link'
import { ArrowLeft, Compass } from 'lucide-react'

export default function NotFound() {
  return <main className="not-found-page"><span><Compass size={24} /></span><p className="eyebrow accent">404 / LOST FRAME</p><h1>这个画面还没有被创作</h1><p>你访问的页面不存在，或已经移动到新的工作区。</p><Link href="/home" className="button primary"><ArrowLeft size={15} />返回首页</Link></main>
}
