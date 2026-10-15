'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import { Box, ChevronRight, Clapperboard, Folder, Library, Plus, Search, Sparkles, Users, Workflow, Menu } from 'lucide-react'
import { NewProjectDialog } from './NewProjectDialog'
import { ThemeToggle } from './ThemeToggle'
import { useProjectStore } from '@/lib/use-project-store'
import type { ProjectLanguage } from '@/lib/types'

const nav = [
  ['/home', '工作台', Sparkles],
  ['/projects', '项目', Folder],
  ['/discover', '资源库', Library],
  ['/models', '模型', Box],
  ['/workflows', '工作流', Workflow],
  ['/creator', '创作者中心', Users],
] as const

export function AppShell({
  children,
  compact = false,
  newProjectLanguage = 'zh-CN',
}: {
  children: React.ReactNode
  compact?: boolean
  newProjectLanguage?: ProjectLanguage
}) {
  const path = usePathname()
  const [showNewProject, setShowNewProject] = useState(false)
  const [showMore, setShowMore] = useState(false)
  const { projects, currentProject } = useProjectStore()
  const visibleProjects = projects.filter((project) => project.status !== 'trashed' && project.status !== 'archived')

  return (
    <div className="app-shell flex min-h-screen max-w-full">
      {!compact && <aside className="app-sidebar sticky top-0 hidden h-dvh w-[216px] shrink-0 flex-col border-r border-[var(--line)] bg-[var(--surface)] md:flex">
        <Link href="/home" className="focus-ring flex h-16 shrink-0 items-center gap-2.5 border-b border-[var(--line)] px-5">
          <span className="grid h-8 w-8 place-items-center rounded-md bg-[var(--cyan)] font-bold text-[var(--on-accent)]">F</span>
          <span className="text-base font-semibold">FlowOS</span>
          <span className="ml-auto text-[11px] text-[var(--muted)]">预览版</span>
        </Link>
        <div className="p-3">
          <button onClick={() => setShowNewProject(true)} type="button" className="focus-ring flex h-10 w-full items-center justify-center gap-2 rounded-md bg-[var(--text)] text-[var(--surface)]">
            <Plus size={16} aria-hidden="true" />新建项目
          </button>
        </div>
        <nav aria-label="主要导航" className="space-y-1 px-3">
          {nav.map(([href, label, Icon]) => <Link key={href} href={href} aria-current={path === href ? 'page' : undefined} className={`focus-ring flex h-11 items-center gap-3 rounded-md px-3 ${path === href ? 'bg-[var(--selection)] font-medium text-[var(--cyan)]' : 'text-[var(--muted)] hover:bg-[var(--surface2)]'}`}>
            <Icon size={18} aria-hidden="true" />{label}
            {href === '/projects' && <span className="ml-auto text-xs tabular-nums">{visibleProjects.length}</span>}
          </Link>)}
        </nav>
        <div className="mt-8 px-6 text-xs text-[var(--muted)]">当前项目</div>
        <div className="mt-3 px-3">
          {currentProject && currentProject.status !== 'trashed' ? <Link href={`/project/${currentProject.id}`} className="focus-ring flex items-center gap-2 rounded-md border border-[var(--line)] p-3">
            <Clapperboard size={18} className="shrink-0 text-[var(--cyan)]" aria-hidden="true" />
            <span className="min-w-0 flex-1 truncate text-xs">{currentProject.name}</span>
            <ChevronRight size={14} aria-hidden="true" />
          </Link> : <button type="button" onClick={() => setShowNewProject(true)} className="focus-ring text-xs text-[var(--muted)]">创建项目</button>}
        </div>
        <div className="mt-auto flex items-center gap-3 border-t border-[var(--line)] p-4">
          <span className="grid h-8 w-8 place-items-center rounded-full bg-[var(--surface2)]"><Users size={16} aria-hidden="true" /></span>
          <div className="flex-1"><div className="text-xs font-medium">本地工作区</div><div className="mt-1 text-[11px] text-[var(--muted)]">浏览器本地保存</div></div>
          <ThemeToggle />
        </div>
      </aside>}

      <div className={`min-w-0 flex-1 ${compact ? '' : 'app-content'}`}>{children}</div>

      {!compact && <>
        {showMore && <div className="fixed inset-0 z-40 md:hidden">
          <button type="button" aria-label="关闭更多导航" className="absolute inset-0 bg-black/40" onClick={() => setShowMore(false)} />
          <nav aria-label="更多导航" className="mobile-more absolute inset-x-0 border-t border-[var(--line)] bg-[var(--surface)] p-4 shadow-lg" onKeyDown={(event) => { if (event.key === 'Escape') setShowMore(false) }}>
            {nav.slice(3).map(([href, label, Icon]) => <Link autoFocus={href === '/models'} onClick={() => setShowMore(false)} href={href} key={href} className="focus-ring flex min-h-12 items-center gap-3 rounded-md px-3 hover:bg-[var(--surface2)]"><Icon size={18} aria-hidden="true" />{label}</Link>)}
          </nav>
        </div>}
        <nav aria-label="移动端主要导航" className="flowos-mobile-nav fixed inset-x-0 bottom-0 z-50 grid grid-cols-5 border-t border-[var(--line)] bg-[var(--surface)] md:hidden">
          {nav.slice(0, 2).map(([href, label, Icon]) => <MobileNavItem key={href} href={href} label={label} active={path === href} icon={Icon} />)}
          <button type="button" onClick={() => { setShowMore(false); setShowNewProject(true) }} aria-label="新建项目" className="focus-ring flex min-h-16 flex-col items-center justify-center gap-1 text-[var(--cyan)]"><Plus size={24} aria-hidden="true" /><span className="text-[11px]">新建</span></button>
          <MobileNavItem href="/discover" label="资源库" active={path === '/discover'} icon={Library} />
          <button type="button" aria-label="更多导航" aria-expanded={showMore} onClick={() => setShowMore(!showMore)} className="focus-ring flex min-h-16 flex-col items-center justify-center gap-1 text-[var(--muted)]"><Menu size={20} aria-hidden="true" /><span className="text-[11px]">更多</span></button>
        </nav>
      </>}
      {showNewProject && <NewProjectDialog open onOpenChange={setShowNewProject} initialLanguage={newProjectLanguage} />}
    </div>
  )
}

function MobileNavItem({ href, label, active, icon: Icon }: { href: string; label: string; active: boolean; icon: typeof Sparkles }) {
  return <Link href={href} aria-current={active ? 'page' : undefined} className={`focus-ring flex min-h-16 min-w-0 flex-col items-center justify-center gap-1 ${active ? 'text-[var(--cyan)]' : 'text-[var(--muted)]'}`}><Icon size={20} aria-hidden="true" /><span className="text-[11px]">{label}</span></Link>
}

export function Topbar({ title, actions }: { title: string; actions?: React.ReactNode }) {
  const translatedTitle = nav.find((_, index) => ['Home', 'Projects', 'Discover', 'Models', 'Workflows', 'Creator'][index] === title)?.[1] ?? title
  return <header className="sticky top-0 z-20 flex min-h-16 items-center gap-3 border-b border-[var(--line)] bg-[var(--surface)] px-4 py-2 sm:px-6">
    <div className="flex min-w-0 items-center gap-2"><Clapperboard size={18} className="shrink-0 text-[var(--cyan)]" aria-hidden="true" /><span className="truncate font-medium">{translatedTitle}</span></div>
    <div className="ml-auto flex min-w-0 items-center justify-end gap-2">{actions}<ThemeToggle className="md:hidden" /></div>
  </header>
}

export function SearchBox({ placeholder = '搜索项目', value, onChange, className = '' }: { placeholder?: string; value?: string; onChange?: (value: string) => void; className?: string }) {
  return <label className={`flex h-10 w-full min-w-0 max-w-xs items-center gap-2 rounded-md border border-[var(--line)] bg-[var(--surface)] px-3 text-[var(--muted)] ${className}`}>
    <Search size={16} className="shrink-0" aria-hidden="true" /><span className="sr-only">{placeholder}</span>
    <input aria-label={placeholder} placeholder={placeholder} value={value} onChange={onChange ? (event) => onChange(event.target.value) : undefined} className="min-w-0 w-full bg-transparent text-sm text-[var(--text)] outline-none" />
  </label>
}
