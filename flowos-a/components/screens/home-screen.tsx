'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useRef, useState } from 'react'
import { ArrowRight, ArrowUpRight, FileImage, Film, LayoutGrid, Music2, PenLine, Play, Sparkles } from 'lucide-react'
import { AppShell } from '@/components/app-shell'
import { NewProjectDialog } from '@/components/new-project-dialog'
import { projects, templates } from '@/lib/data'

const creationTypes = [
  { label: '图像创作', detail: '海报 · 插画 · 产品图', icon: FileImage, tone: 'mint' },
  { label: '视频创作', detail: '短视频 · 广告 · 动态', icon: Film, tone: 'coral' },
  { label: '文案写作', detail: '标题 · 脚本 · 营销文案', icon: PenLine, tone: 'sky' },
  { label: '音频创作', detail: '配音 · 音乐 · 音效', icon: Music2, tone: 'peach' },
  { label: '设计稿生成', detail: 'UI · Logo · 品牌视觉', icon: LayoutGrid, tone: 'lavender' },
  { label: '更多工具', detail: '扩图 · 重绘 · 智能编辑', icon: Sparkles, tone: 'rose' },
]

export function HomeScreen() {
  const router = useRouter()
  const promptRef = useRef<HTMLTextAreaElement>(null)
  const [prompt, setPrompt] = useState('')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [references, setReferences] = useState<string[]>([])
  const [style, setStyle] = useState('清新自然')
  const [showStyles, setShowStyles] = useState(false)

  const start = () => {
    if (!prompt.trim()) { promptRef.current?.focus(); return }
    setDialogOpen(true)
  }

  return (
    <AppShell>
      <main className="page home-page">
        <div className="home-reference-layout"><div className="home-primary">
          <section className="welcome-row"><div><span className="eyebrow accent">GOOD MORNING · 林夏</span><h1>早上好，<br />让灵感变成作品吧！</h1><p>告诉我你想创作什么，我来帮你完成从想法到成片的全过程。</p></div><div className="hand-note">Good ideas<br />create a brighter you.</div></section>
          <section className="home-hero-stage">
            <Image src="/media/neon.webp" alt="城市夜色创作预览" fill sizes="(max-width: 760px) 100vw, 900px" priority />
            <div className="home-hero-shade" />
            <div className="home-hero-copy">
              <span className="home-hero-kicker"><i />FEATURED PROJECT · 01</span>
              <h2>城市里的<br /><em>小小光芒</em></h2>
              <p>一支关于夜晚、灵感和人与城市相遇的品牌短片。</p>
              <Link href="/project/city-light" className="hero-link">继续创作 <ArrowUpRight size={16} /></Link>
            </div>
            <div className="home-hero-meta"><span>06 镜头</span><span>00:30</span><span>制作中</span><button type="button" aria-label="预览项目" onClick={() => router.push('/project/city-light')}><Play size={14} fill="currentColor" /></button></div>
          </section>
          <section className="composer" aria-label="开始创作"><div className="composer-input"><Sparkles size={21} /><textarea ref={promptRef} value={prompt} onChange={(event) => setPrompt(event.target.value)} rows={2} placeholder="例如：帮我生成一组夏日咖啡品牌的社媒海报，风格清新自然，包含 3 张不同场景…" /></div><div className="composer-toolbar"><div><button type="button" className="chip" onClick={() => setReferences((items) => items.includes('品牌参考') ? items.filter((item) => item !== '品牌参考') : [...items, '品牌参考'])}>添加参考{references.length ? ` (${references.length})` : ''}</button><button type="button" className="chip" onClick={() => setPrompt((value) => value.trim() ? `${value.trim()}，主体清晰，光线自然，构图专业，保持统一品牌视觉。` : '创作一组主体清晰、光线自然、构图专业且视觉统一的品牌内容。')}>智能增强</button><button type="button" className="chip" aria-expanded={showStyles} onClick={() => setShowStyles(!showStyles)}>{style}</button></div><span>{prompt.length}/500</span><button className="button primary" type="button" onClick={start}>生成<ArrowRight size={16} /></button></div>{(showStyles || references.length > 0) && <div className="composer-options">{references.map((item) => <button key={item} type="button" onClick={() => setReferences([])}>参考：{item} ×</button>)}{showStyles && <div>{['清新自然', '电影写实', '极简产品', '东方叙事'].map((item) => <button type="button" className={style === item ? 'active' : ''} key={item} onClick={() => { setStyle(item); setShowStyles(false) }}>{item}</button>)}</div>}</div>}</section>
          <section className="section-block"><div className="section-heading"><div><h2>开始创作</h2><p>选择常用任务，快速进入对应工作流</p></div><Link href="/create">查看全部工具<ArrowRight size={14} /></Link></div><div className="creation-grid">{creationTypes.map(({ label, detail, icon: Icon, tone }) => <button key={label} type="button" className={`creation-tile ${tone}`} onClick={() => { setPrompt(`创建一个${label}项目`); setDialogOpen(true) }}><span className="creation-icon"><Icon size={22} /></span><strong>{label}</strong><small>{detail}</small><ArrowRight size={15} /></button>)}</div></section>
          <section className="section-block"><div className="section-heading"><h2>最近项目</h2><Link href="/projects">查看全部<ArrowRight size={14} /></Link></div><div className="recent-grid">{projects.slice(0, 4).map((project) => <Link key={project.id} href={`/project/${project.id}`} className="project-card"><div className="media-box ratio-wide"><Image src={project.image} alt="" fill sizes="(max-width: 700px) 100vw, 33vw" /></div><div className="project-card-body"><span className={`status ${project.status}`}>{project.status}</span><h3>{project.name}</h3><p>{project.kind} · {project.shots} 镜头 · {project.updated}</p></div></Link>)}</div></section>
        </div><aside className="home-rail">
          <section className="home-quote"><strong>“ 创作，是让平凡的日常<br />拥有更多可能。 ”</strong><span>作品集演示数据</span><div><b>10,428<small>创作者</small></b><b>286,317<small>生成作品</small></b><b>98%<small>用户满意度</small></b></div></section>
          <section className="queue-panel"><div className="section-heading"><h2>示例任务队列 (3)</h2><Link href="/project/city-light">查看项目<ArrowRight size={14} /></Link></div>{[
            ['夏日人像写真组', '图像生成 · 3/8', '64%', '/media/portrait.webp'],
            ['旅行 Vlog 脚本', 'AI 正在创作…', '38%', '/media/mountain.webp'],
            ['香氛产品视频', '排队中 · 第 1 位', '8%', '/media/interior.webp'],
          ].map(([title, detail, progress, image]) => <div className="queue-item" key={title}><div className="mini-thumb"><Image src={image} alt="" fill sizes="48px" /></div><div><strong>{title}</strong><small>{detail}</small><span className="progress"><i style={{ width: progress }} /></span></div><b>{progress}</b></div>)}</section>
          <section className="home-templates"><div className="section-heading"><h2>精选模板</h2><Link href="/templates">查看全部<ArrowRight size={14} /></Link></div><div>{templates.map((template) => <button key={template.title} type="button" className="template-card" onClick={() => router.push(`/project/new-template?template=${encodeURIComponent(template.title)}`)}><div className="media-box ratio-poster"><Image src={template.image} alt="" fill sizes="160px" /></div><div><span>{template.kind}</span><h3>{template.title}</h3></div></button>)}</div></section>
        </aside></div>
      </main>
      <NewProjectDialog key={prompt} open={dialogOpen} onClose={() => setDialogOpen(false)} initialBrief={prompt} />
    </AppShell>
  )
}
