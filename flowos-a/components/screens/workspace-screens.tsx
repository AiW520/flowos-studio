'use client'

import Image from 'next/image'
import Link from 'next/link'
import { ChangeEvent, useEffect, useMemo, useRef, useState } from 'react'
import { BarChart3, BookOpen, Check, ChevronRight, Clock3, FileImage, Film, Heart, Layers3, LayoutGrid, MessageSquare, Music2, Palette, PenLine, Plus, Search, Settings, ShieldCheck, Sparkles, Upload, UsersRound, WandSparkles, Workflow } from 'lucide-react'
import { AppShell, EmptyState, PageHeader } from '@/components/app-shell'
import { assetItems, type AssetRecord, templates, workflows } from '@/lib/data'
import { listLocalAssets, saveLocalAsset } from '@/lib/local-assets'

export function AssetsScreen() {
  const [query, setQuery] = useState('')
  const [type, setType] = useState('全部')
  const [liked, setLiked] = useState<string[]>([])
  const [notice, setNotice] = useState('')
  const [uploaded, setUploaded] = useState<AssetRecord[]>([])
  const fileInput = useRef<HTMLInputElement>(null)
  useEffect(() => { listLocalAssets().then(setUploaded).catch(() => setNotice('无法读取浏览器本地素材')) }, [])
  const visible = [...uploaded, ...assetItems].filter((item) => (type === '全部' || item.type === type) && item.name.toLowerCase().includes(query.toLowerCase()))
  const notify = (message: string) => { setNotice(message); window.setTimeout(() => setNotice(''), 2200) }
  const upload = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = [...(event.target.files ?? [])]
    if (!files.length) return
    try { const records = await Promise.all(files.map(saveLocalAsset)); setUploaded((items) => [...records, ...items]); notify(`${records.length} 个素材已保存到此浏览器`) }
    catch (error) { notify(`保存失败：${error instanceof Error ? error.message : '请检查浏览器存储空间'}`) }
    event.target.value = ''
  }

  return <AppShell><main className="page assets-page"><PageHeader eyebrow="ASSET LIBRARY" title="素材库" description="集中管理项目文件、生成结果、参考素材与授权信息。" actions={<><input ref={fileInput} type="file" accept="image/*,video/*,audio/*,.pdf,.svg" multiple hidden onChange={upload} /><button className="button primary" onClick={() => fileInput.current?.click()}><Upload size={15} />上传素材</button></>} />
    <div className="asset-library-toolbar"><div className="search-field"><Search size={15} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜索素材、标签或项目" /></div><div className="segmented">{['全部','图像','视频','音频','设计','文档'].map((item) => <button key={item} className={type === item ? 'active' : ''} onClick={() => setType(item)}>{item}</button>)}</div></div>
    {visible.length ? <div className="asset-library-grid">{visible.map((item) => <article key={item.id}><Link href={`/asset/${item.id}`} className="asset-library-preview">{item.image ? <Image src={item.image} alt="" fill sizes="(max-width: 720px) 50vw, 22vw" /> : <span>{item.type === '音频' ? <Music2 size={34} /> : item.type === '设计' ? <Palette size={34} /> : item.type === '文档' ? <BookOpen size={34} /> : <FileImage size={34} />}</span>}</Link><div><span><strong>{item.name}</strong><small>{item.type} · {item.size}</small></span><button aria-label={`收藏 ${item.name}`} onClick={() => setLiked((items) => items.includes(item.id) ? items.filter((id) => id !== item.id) : [...items, item.id])}><Heart size={15} fill={liked.includes(item.id) ? 'currentColor' : 'none'} /></button></div></article>)}</div> : <EmptyState title="没有匹配素材" text="调整关键词或切换素材类型。" />}
    {notice && <div className="toast"><Check size={15} />{notice}</div>}
  </main></AppShell>
}

const createTypes = [
  ['图像创作', '海报、产品图与插画', FileImage, '/project/image-studio'],
  ['视频创作', '广告、短片与动态内容', Film, '/project/video-studio'],
  ['文案写作', '标题、脚本与营销文案', PenLine, '/project/copy-studio'],
  ['音频创作', '配音、音乐与环境音', Music2, '/project/audio-studio'],
  ['设计稿生成', 'UI、Logo 与品牌视觉', LayoutGrid, '/project/design-studio'],
  ['工作流编排', '组合模型与交付节点', Workflow, '/workflows'],
] as const

export function CreateScreen() {
  const [prompt, setPrompt] = useState('')
  return <AppShell><main className="page create-page"><PageHeader eyebrow="CREATE" title="创作工作台" description="选择创作类型，或者直接描述你想完成的交付物。" />
    <section className="create-command"><Sparkles size={22} /><textarea value={prompt} onChange={(event) => setPrompt(event.target.value)} placeholder="例如：制作一组夏日咖啡品牌社媒海报，清新自然，包含 3 个不同场景…" rows={4} /><Link className={`button primary ${prompt.trim() ? '' : 'disabled-link'}`} href={prompt.trim() ? `/project/new-creation?brief=${encodeURIComponent(prompt.trim())}` : '/create'}><WandSparkles size={16} />开始创作</Link></section>
    <div className="create-launcher">{createTypes.map(([title, detail, Icon, href]) => <Link href={href.startsWith('/project/') ? `${href}?kind=${encodeURIComponent(title)}` : href} key={title}><span><Icon size={23} /></span><strong>{title}</strong><small>{detail}</small><ChevronRight size={16} /></Link>)}</div>
    <section className="section-block"><div className="section-heading"><div><h2>最近使用的工作流</h2><p>继续上一次创作设置</p></div><Link href="/workflows">查看全部<ChevronRight size={14} /></Link></div><div className="compact-workflow-list">{workflows.slice(0, 3).map((flow) => <Link href={`/project/${flow.id}?workflow=${flow.id}`} key={flow.id}><Image src={flow.image} alt="" width={64} height={48} /><span><strong>{flow.name}</strong><small>{flow.steps} 个步骤 · {flow.success} 完成率</small></span><ChevronRight size={15} /></Link>)}</div></section>
  </main></AppShell>
}

export function TemplatesScreen() {
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('全部')
  const [favorites, setFavorites] = useState<string[]>(['户外品牌宣传片'])
  const [notice, setNotice] = useState('')
  const categories = ['全部', '社媒', '视频', '海报', '概念设计']
  const templateItems = templates.map((item, index) => ({
    ...item,
    category: index === 0 ? '社媒' : item.kind,
    uses: ['2.4k', '1.8k', '1.2k', '980'][index],
    updated: ['今天', '昨天', '3 天前', '1 周前'][index],
  }))
  const visible = templateItems.filter((item) => (category === '全部' || item.category === category) && `${item.title} ${item.kind}`.toLowerCase().includes(query.toLowerCase()))
  const notify = (message: string) => { setNotice(message); window.setTimeout(() => setNotice(''), 2200) }

  return <AppShell><main className="page templates-page"><PageHeader eyebrow="TEMPLATE CENTER" title="模板中心" description="把成熟的创作结构保存成模板，快速复用画幅、模型路由与交付规范。" actions={<button className="button primary" onClick={() => notify('空白模板草稿已创建')}><Plus size={15} />新建模板</button>} />
    <section className="template-overview"><div><span><LayoutGrid size={18} /></span><p><strong>12</strong><small>我的模板</small></p></div><div><span><Layers3 size={18} /></span><p><strong>4</strong><small>团队共享</small></p></div><div><span><Clock3 size={18} /></span><p><strong>3.8h</strong><small>本月节省时间</small></p></div><div><span><Heart size={18} /></span><p><strong>{favorites.length}</strong><small>已收藏</small></p></div></section>
    <div className="template-toolbar"><label className="search-field"><Search size={15} /><input aria-label="搜索模板" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜索模板名称或交付类型" /></label><div className="segmented">{categories.map((item) => <button key={item} className={category === item ? 'active' : ''} onClick={() => setCategory(item)}>{item}</button>)}</div></div>
    <div className="section-heading"><div><h2>精选工作模板</h2><p>{visible.length} 个可直接使用的完整创作结构</p></div><button onClick={() => { setQuery(''); setCategory('全部') }}>查看全部</button></div>
    {visible.length ? <div className="template-catalog-grid">{visible.map((item) => <article key={item.title}><div className="template-visual"><Image src={item.image} alt="" fill sizes="(max-width: 760px) 100vw, 33vw" /><span>{item.kind}</span><button aria-label={`${favorites.includes(item.title) ? '取消收藏' : '收藏'} ${item.title}`} onClick={() => setFavorites((current) => current.includes(item.title) ? current.filter((title) => title !== item.title) : [...current, item.title])}><Heart size={16} fill={favorites.includes(item.title) ? 'currentColor' : 'none'} /></button></div><div className="template-card-body"><div><h3>{item.title}</h3><p>{item.ratio} · {item.count} · 包含模型与交付预设</p></div><dl><span><dt>使用次数</dt><dd>{item.uses}</dd></span><span><dt>最近更新</dt><dd>{item.updated}</dd></span></dl><Link href={`/project/template-start?template=${encodeURIComponent(item.title)}`} className="button secondary wide">使用此模板<ChevronRight size={14} /></Link></div></article>)}</div> : <EmptyState title="没有匹配的模板" text="调整关键词或切换模板分类。" />}
    <section className="template-builder-band"><div><span className="template-builder-icon"><Workflow size={21} /></span><span><strong>从现有项目创建模板</strong><small>保留节点结构、模型路由和交付规格，自动移除项目私有素材。</small></span></div><Link href="/projects" className="button secondary">选择项目<ChevronRight size={14} /></Link></section>
    {notice && <div className="toast"><Check size={15} />{notice}</div>}
  </main></AppShell>
}

type UtilityKey = 'templates' | 'tools' | 'team' | 'brand' | 'analytics' | 'community' | 'settings'

const utilityConfig: Record<UtilityKey, { eyebrow: string; title: string; description: string; icon: typeof Sparkles }> = {
  templates: { eyebrow: 'TEMPLATE CENTER', title: '模板中心', description: '管理可复用的创作规格、画幅和交付结构。', icon: LayoutGrid },
  tools: { eyebrow: 'AI TOOLBOX', title: 'AI 工具', description: '扩图、重绘、抠图、清理与格式转换集中处理。', icon: Sparkles },
  team: { eyebrow: 'TEAM', title: '团队协作', description: '管理成员、角色、项目权限与审核任务。', icon: UsersRound },
  brand: { eyebrow: 'BRAND LIBRARY', title: '品牌库', description: '保存品牌颜色、字体、Logo 和视觉约束。', icon: Palette },
  analytics: { eyebrow: 'ANALYTICS', title: '数据洞察', description: '查看生成效率、模型成本、资产复用与交付趋势。', icon: BarChart3 },
  community: { eyebrow: 'COMMUNITY', title: '社区', description: '关注创作者、讨论创作配方并收藏优质作品。', icon: MessageSquare },
  settings: { eyebrow: 'SETTINGS', title: '设置', description: '配置工作区、生成偏好、安全与通知。', icon: Settings },
}

export function UtilityScreen({ section }: { section: UtilityKey }) {
  const config = utilityConfig[section]
  const [notice, setNotice] = useState('')
  const [enabled, setEnabled] = useState(['生成完成通知', '商用许可检查'])
  const notify = (message: string) => { setNotice(message); window.setTimeout(() => setNotice(''), 2200) }
  const content = useMemo(() => section === 'settings' ? ['生成完成通知','商用许可检查','失败任务提醒','每周数据摘要'] : section === 'team' ? ['林夏 · 所有者','周宁 · 编辑者','陈墨 · 审核者','邀请新成员'] : section === 'brand' ? ['晨光主色 · #12B7C8','强调色 · #FF6F61','品牌字体 · 思源黑体','品牌 Logo · 4 个版本'] : section === 'analytics' ? ['生成任务 · 1,842','平均交付时间 · 12m','模型成本 · ¥1,624','资产复用率 · 38%'] : section === 'community' ? ['本周热门讨论','创作者互助小组','商业授权经验','工作流分享计划'] : section === 'tools' ? ['智能扩图','局部重绘','背景清理','画质增强','字幕提取','格式转换'] : templates.map((item) => item.title), [section])
  const Icon = config.icon
  return <AppShell><main className="page utility-page"><PageHeader eyebrow={config.eyebrow} title={config.title} description={config.description} actions={<button className="button primary" onClick={() => notify(`${config.title}内容已同步`)}><Plus size={15} />{section === 'team' ? '邀请成员' : section === 'settings' ? '保存设置' : '新建内容'}</button>} />
    {section === 'analytics' && <div className="utility-chart"><div><strong>创作效率趋势</strong><small>过去 30 天</small></div><svg viewBox="0 0 900 220" role="img" aria-label="创作效率趋势"><polyline points="0,190 90,174 180,158 270,168 360,120 450,135 540,92 630,108 720,54 810,75 900,32" fill="none" stroke="#12b7c8" strokeWidth="5" /></svg></div>}
    <div className="utility-grid">{content.map((item, index) => <article key={item}><span className={`utility-icon tone-${index % 4}`}><Icon size={20} /></span><div><strong>{item}</strong><small>{section === 'settings' ? '控制当前工作区的行为' : '最近更新 · 可继续管理'}</small></div>{section === 'settings' ? <label className="switch"><input type="checkbox" checked={enabled.includes(item)} onChange={() => setEnabled((items) => items.includes(item) ? items.filter((entry) => entry !== item) : [...items, item])} /><i /></label> : <button aria-label={`打开 ${item}`} onClick={() => notify(`已打开：${item}`)}><ChevronRight size={17} /></button>}</article>)}</div>
    <section className="utility-security"><ShieldCheck size={20} /><span><strong>工作区数据受保护</strong><small>所有演示操作仅保存在本地会话，不会上传密钥或私有素材。</small></span><button className="button secondary" onClick={() => notify('安全详情已检查')}>查看详情</button></section>
    {notice && <div className="toast"><Check size={15} />{notice}</div>}
  </main></AppShell>
}
