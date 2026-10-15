'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { FormEvent, useEffect, useMemo, useState } from 'react'
import {
  Boxes,
  ChartNoAxesCombined,
  CircleUserRound,
  Compass,
  FolderOpen,
  FolderKanban,
  House,
  Lightbulb,
  Menu,
  MoreHorizontal,
  Palette,
  Plus,
  Search,
  Settings,
  Sparkles,
  UsersRound,
  WandSparkles,
  Workflow,
  X,
} from 'lucide-react'
import { NewProjectDialog } from '@/components/new-project-dialog'
import { discoverItems, models, projects, workflows } from '@/lib/data'

const navItems = [
  { href: '/home', label: '首页', icon: House },
  { href: '/create', label: '创作', icon: WandSparkles },
  { href: '/projects', label: '项目', icon: FolderKanban },
  { href: '/assets', label: '素材库', icon: FolderOpen },
  { href: '/discover', label: '发现', icon: Compass },
  { href: '/models', label: '模型', icon: Boxes },
  { href: '/workflows', label: '工作流', icon: Workflow },
  { href: '/creator', label: '创作者中心', icon: CircleUserRound },
]

const moreItems = [
  { href: '/templates', label: '模板中心', icon: Lightbulb },
  { href: '/tools', label: 'AI 工具', icon: Sparkles },
  { href: '/team', label: '团队协作', icon: UsersRound },
  { href: '/brand', label: '品牌库', icon: Palette },
  { href: '/analytics', label: '数据洞察', icon: ChartNoAxesCombined },
  { href: '/community', label: '社区', icon: Compass },
  { href: '/settings', label: '设置', icon: Settings },
  { href: '/admin/models', label: '模型管理', icon: Boxes },
]

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  useEffect(() => {
    document.documentElement.dataset.flowosHydrated = 'true'
    return () => { delete document.documentElement.dataset.flowosHydrated }
  }, [])
  const [showCreate, setShowCreate] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const [moreOpen, setMoreOpen] = useState(false)
  const [notifications, setNotifications] = useState(['镜头 03 已生成完成', '周宁在资产上留下评论', '模型目录已完成同步'])
  const searchResults = useMemo(() => {
    const query = search.trim().toLowerCase()
    if (!query) return []
    return [
      ...projects.map((item) => ({ label: item.name, meta: item.kind, href: `/project/${item.id}` })),
      ...discoverItems.map((item) => ({ label: item.title, meta: '资源', href: `/asset/${item.id}` })),
      ...models.map((item) => ({ label: item.name, meta: `${item.type}模型`, href: '/models' })),
      ...workflows.map((item) => ({ label: item.name, meta: '工作流', href: '/workflows' })),
    ].filter((item) => `${item.label} ${item.meta}`.toLowerCase().includes(query)).slice(0, 6)
  }, [search])

  const submitSearch = (event: FormEvent) => {
    event.preventDefault()
    const first = searchResults[0]
    if (first) window.location.assign(first.href)
  }

  return (
    <div className="app-shell">
      <aside className={`sidebar ${mobileOpen ? 'sidebar-open' : ''}`}>
        <div className="brand-row">
          <Link href="/home" className="brand" onClick={() => setMobileOpen(false)}>
            <span className="brand-mark"><Sparkles size={17} /></span>
            <span>FlowOS</span>
          </Link>
          <span className="beta">LUMEN</span>
          <button className="icon-button mobile-close" type="button" aria-label="关闭导航" onClick={() => setMobileOpen(false)}><X size={18} /></button>
        </div>
        <button className="new-project-button" type="button" onClick={() => { setMobileOpen(false); setShowCreate(true) }}>
          <Plus size={17} />新建项目
        </button>
        <nav className="primary-nav" aria-label="主要导航">
          {navItems.map(({ href, label, icon: Icon }) => {
            const active = pathname === href || (href === '/projects' && pathname.startsWith('/project/'))
            return (
              <Link key={href} href={href} className={active ? 'nav-item active' : 'nav-item'} onClick={() => setMobileOpen(false)}>
                <Icon size={18} />
                <span>{label}</span>
              </Link>
            )
          })}
        </nav>
        <div className="sidebar-more">
          <button type="button" aria-expanded={moreOpen} onClick={() => setMoreOpen(!moreOpen)}><MoreHorizontal size={18} /><span>更多工作区</span></button>
          {moreOpen && <div className="sidebar-more-menu">{moreItems.map(({ href, label, icon: Icon }) => <Link key={href} href={href} onClick={() => { setMoreOpen(false); setMobileOpen(false) }}><Icon size={15} />{label}</Link>)}</div>}
        </div>
        <div className="sidebar-project">
          <span className="eyebrow">当前项目</span>
          <Link href="/project/city-light" className="current-project">
            <span className="project-thumb"><Image src="/media/neon.webp" alt="" fill sizes="38px" /></span>
            <span><strong>城市里的小小光芒</strong><small>品牌短片 · 6 镜头</small></span>
          </Link>
        </div>
        <div className="sidebar-footer">
          <div className="quota"><span>示例生成额度</span><strong>682 / 1,000</strong><i><b /></i></div>
          <div className="profile"><span className="avatar">林</span><span><strong>林夏</strong><small>晨光工作室</small></span><Settings size={16} /></div>
        </div>
      </aside>

      {mobileOpen && <button type="button" className="sidebar-backdrop" aria-label="关闭导航" onClick={() => setMobileOpen(false)} />}

      <div className="shell-main">
        <header className="topbar">
          <button className="icon-button menu-button" type="button" aria-label="打开导航" onClick={() => setMobileOpen(true)}><Menu size={19} /></button>
          <form className="topbar-search" onSubmit={submitSearch}><Search size={16} /><input aria-label="全局搜索" placeholder="搜索项目、素材和模型…" value={search} onChange={(event) => setSearch(event.target.value)} />{search && <div className="global-search-results">{searchResults.length ? searchResults.map((item) => <Link key={`${item.href}-${item.label}`} href={item.href} onClick={() => setSearch('')}><span>{item.label}</span><small>{item.meta}</small></Link>) : <span>没有匹配结果</span>}</div>}</form>
          <span className="preview-badge" title="这是用于展示前端能力的作品集预览">作品集预览</span>
          <button className="icon-button" type="button" aria-label="通知" aria-expanded={notificationsOpen} onClick={() => setNotificationsOpen(!notificationsOpen)}>{notifications.length > 0 && <span className="notification-dot" />}<Sparkles size={18} /></button>
          {notificationsOpen && <div className="notification-panel"><div><strong>通知</strong><button type="button" onClick={() => setNotifications([])}>全部已读</button></div>{notifications.length ? notifications.map((item, index) => <button type="button" key={item} onClick={() => setNotifications((items) => items.filter((_, itemIndex) => itemIndex !== index))}><i /><span>{item}<small>刚刚</small></span></button>) : <p>没有新通知</p>}</div>}
          <span className="topbar-avatar">林夏</span>
        </header>
        {children}
      </div>

      <nav className="mobile-nav" aria-label="移动端导航">
        {navItems.slice(0, 2).map(({ href, label, icon: Icon }) => <Link key={href} href={href} className={pathname === href ? 'active' : ''}><Icon size={19} /><span>{label}</span></Link>)}
        <button type="button" aria-label="新建项目" onClick={() => setShowCreate(true)}><span className="mobile-create"><Plus size={22} /></span><span>新建</span></button>
        <Link href="/discover" className={pathname === '/discover' ? 'active' : ''}><Compass size={19} /><span>发现</span></Link>
        <button type="button" onClick={() => setMobileOpen(true)}><Menu size={19} /><span>更多</span></button>
      </nav>

      <NewProjectDialog open={showCreate} onClose={() => setShowCreate(false)} />
    </div>
  )
}

export function PageHeader({ eyebrow, title, description, actions }: { eyebrow?: string; title: string; description?: string; actions?: React.ReactNode }) {
  return (
    <div className="page-header">
      <div>{eyebrow && <div className="eyebrow accent">{eyebrow}</div>}<h1>{title}</h1>{description && <p>{description}</p>}</div>
      {actions && <div className="page-actions">{actions}</div>}
    </div>
  )
}

export function EmptyState({ title, text }: { title: string; text: string }) {
  return <div className="empty-state"><Search size={24} /><strong>{title}</strong><span>{text}</span></div>
}
