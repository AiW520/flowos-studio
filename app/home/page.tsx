'use client'

import { useCallback, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { ArrowRight, Clock3, Compass, FolderOpen, LayoutTemplate, Plus, Search, Sparkles, X } from 'lucide-react'
import { AppShell, SearchBox } from '@/components/AppShell'
import { NewProjectDialog, projectFormats, projectLanguages, type ProjectFormatId } from '@/components/NewProjectDialog'
import { PreviewImage } from '@/components/PreviewImage'
import { ThemeToggle } from '@/components/ThemeToggle'
import { creationTemplates, popularTemplates, templatePlatforms, type TemplatePlatform } from '@/lib/template-catalog'
import { useProjectStore } from '@/lib/use-project-store'
import type { ProjectLanguage } from '@/lib/types'
import './home.css'

export default function HomePage() {
  const { projects, hydrated, persistenceError } = useProjectStore()
  const [query, setQuery] = useState('')
  const [prompt, setPrompt] = useState('')
  const [format, setFormat] = useState<ProjectFormatId>('image-design')
  const [language, setLanguage] = useState<ProjectLanguage>('zh-CN')
  const [platform, setPlatform] = useState<'全部' | TemplatePlatform>('全部')
  const [dialog, setDialog] = useState<{ brief: string; type: ProjectFormatId; language: ProjectLanguage } | null>(null)
  const onDialogOpenChange = useCallback((open: boolean) => { if (!open) setDialog(null) }, [])
  const promptRef = useRef<HTMLTextAreaElement>(null)
  const visibleProjects = useMemo(() => projects
    .filter((project) => project.status !== 'trashed' && project.status !== 'archived')
    .filter((project) => `${project.name} ${project.type}`.toLowerCase().includes(query.trim().toLowerCase()))
    .sort((a, b) => b.updatedAtIso.localeCompare(a.updatedAtIso)), [projects, query])
  const visibleTemplates = creationTemplates.filter((template) => platform === '全部' || template.platform === platform)
  const openDialog = (brief: string, type: ProjectFormatId) => setDialog({ brief, type, language })
  const openTemplate = (template: (typeof creationTemplates)[number]) => openDialog(template.initialBrief, template.projectType)

  return <AppShell newProjectLanguage={language}>
    <main className="violet-home">
      <header className="vh-topbar">
        <span className="vh-mobile-brand"><Sparkles size={20} aria-hidden="true" />FlowOS</span>
        <SearchBox value={query} onChange={setQuery} className="vh-search" />
        {query && <button className="vh-icon" type="button" title="清空搜索" aria-label="清空搜索" onClick={() => setQuery('')}><X size={17} /></button>}
        <Link className="vh-discover" href="/discover"><Compass size={16} aria-hidden="true" />资源库</Link>
        <button type="button" className="vh-new" onClick={() => openDialog('', format)}><Plus size={16} aria-hidden="true" /><span>新建项目</span></button>
        <ThemeToggle className="md:hidden" />
      </header>
      {persistenceError && <p className="vh-warning" role="status">浏览器无法保存项目，刷新或关闭页面可能丢失修改。</p>}
      {query ? <section className="vh-section" aria-labelledby="search-title">
        <div className="vh-section-heading"><h1 id="search-title">项目搜索</h1><span>{visibleProjects.length} 个项目</span></div>
        <ProjectList projects={visibleProjects} hydrated={hydrated} onCreate={() => openDialog('', format)} />
      </section> : <>
        <section className="vh-hero" aria-labelledby="home-title">
          <img src="/home/castle.webp" alt="" className="vh-hero-scene" fetchPriority="high" />
          <div className="vh-hero-inner">
            <div className="vh-hero-heading"><span className="vh-edition">紫夜幻想 · VOL. 04</span><h1 id="home-title">FlowOS</h1><h2>开始新创作</h2></div>
            <form className="vh-composer" onSubmit={(event) => { event.preventDefault(); openDialog(prompt.trim(), format) }}>
              <div className="vh-prompt"><Sparkles size={21} aria-hidden="true" /><textarea ref={promptRef} value={prompt} onChange={(event) => setPrompt(event.target.value)} rows={2} maxLength={5000} placeholder="此刻，你脑海里的画面是……" aria-label="创作描述" /></div>
              <div className="vh-composer-actions">
                <div className="vh-composer-selects"><select aria-label="项目类型" value={format} onChange={(event) => setFormat(event.target.value as ProjectFormatId)}>{projectFormats.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</select><select aria-label="输出语言" value={language} onChange={(event) => setLanguage(event.target.value as ProjectLanguage)}>{projectLanguages.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</select></div>
                <button type="submit" className="vh-create"><Sparkles size={16} aria-hidden="true" />创建方案<ArrowRight size={16} aria-hidden="true" /></button>
              </div>
            </form>
            <div className="vh-suggestions">{['月光下的幻想城堡', '一组夏日饮品海报', '电影感城市夜景'].map((text) => <button type="button" key={text} onClick={() => { setPrompt(text); promptRef.current?.focus() }}>{text}<ArrowRight size={12} aria-hidden="true" /></button>)}</div>
          </div>
        </section>
        <section className="vh-section vh-template-strip" aria-labelledby="popular-template-title">
          <div className="vh-section-heading"><div><h2 id="popular-template-title">热门模板</h2><p className="vh-section-kicker">按平台直接套用，Brief、画幅和交付数量已预设</p></div><Link href="#template-title">浏览全部模板<ArrowRight size={14} aria-hidden="true" /></Link></div>
          <div className="vh-template-feature-grid">{popularTemplates.slice(0, 6).map((template) => <article className="vh-template-feature" key={template.id}>
            <PreviewImage src={`/home/${template.image}.webp`} alt="" loading="lazy" />
            <div className="vh-template-feature-body"><div className="vh-template-line"><span className="vh-platform-badge">{template.platform}</span><span className="vh-template-usage">{template.usageLabel}</span></div><h3>{template.title}</h3><p>{template.headline}</p><div className="vh-template-meta"><span>{template.aspectRatio}</span><span>{template.outputCount}</span><span><Clock3 size={12} aria-hidden="true" />{template.estimatedTime}</span></div><button type="button" className="vh-template-use" aria-label={`使用模板：${template.title}`} onClick={() => openTemplate(template)}><LayoutTemplate size={14} aria-hidden="true" />使用模板</button></div>
          </article>)}</div>
        </section>
        <section className="vh-section vh-projects" aria-labelledby="recent-title">
          <div className="vh-section-heading"><h2 id="recent-title">最近项目</h2><Link href="/projects">全部项目<ArrowRight size={14} aria-hidden="true" /></Link></div>
          <ProjectList projects={visibleProjects.slice(0, 3)} hydrated={hydrated} onCreate={() => openDialog('', format)} />
        </section>
        <section className="vh-section vh-inspiration" aria-labelledby="template-title">
          <div className="vh-section-heading"><div><h2 id="template-title">模板推荐</h2><p className="vh-section-kicker">按内容场景筛选可复用的成套方案</p></div><span>{visibleTemplates.length} 个模板</span></div>
          <div className="vh-filters" role="group" aria-label="模板分类">{templatePlatforms.map((item) => <button type="button" key={item} aria-pressed={platform === item} onClick={() => setPlatform(item)}>{item}</button>)}</div>
          <div className="vh-template-grid">{visibleTemplates.map((template) => <article className="vh-template-card" key={template.id}>
            <PreviewImage src={`/home/${template.image}.webp`} alt="" loading="lazy" />
            <div className="vh-template-card-body"><div className="vh-template-line"><span className="vh-platform-badge">{template.platform}</span><span className="vh-template-category">{template.category}</span></div><h3>{template.title}</h3><p>{template.headline}</p><div className="vh-template-meta"><span>{template.aspectRatio}</span><span>{template.outputCount}</span><span><Clock3 size={12} aria-hidden="true" />{template.estimatedTime}</span></div><div className="vh-template-card-footer"><span>{template.delivery}</span><button type="button" className="vh-template-use vh-template-use-icon" aria-label={`使用模板：${template.title}`} title={`使用模板：${template.title}`} onClick={() => openTemplate(template)}><LayoutTemplate size={15} aria-hidden="true" /></button></div></div>
          </article>)}</div>
        </section>
      </>}
    </main>
    {dialog && <NewProjectDialog open onOpenChange={onDialogOpenChange} initialBrief={dialog.brief} initialType={dialog.type} initialLanguage={dialog.language} />}
  </AppShell>
}

function ProjectList({ projects, hydrated, onCreate }: { projects: ReturnType<typeof useProjectStore>['projects']; hydrated: boolean; onCreate: () => void }) {
  if (!hydrated) return <p className="vh-empty" role="status">正在载入项目……</p>
  if (!projects.length) return <div className="vh-empty"><Search size={20} aria-hidden="true" /><p>没有匹配的项目</p><button type="button" onClick={onCreate}><Plus size={15} aria-hidden="true" />新建项目</button></div>
  return <div className="vh-project-list">{projects.map((project) => <Link key={project.id} href={`/project/${encodeURIComponent(project.id)}`}>
    <FolderOpen size={20} aria-hidden="true" /><span><strong>{project.name}</strong><small>{project.type} · {project.outputLanguage ? projectLanguages.find((item) => item.id === project.outputLanguage)?.label : '简体中文'} · {project.updated}</small></span><ArrowRight size={15} aria-hidden="true" />
  </Link>)}</div>
}
