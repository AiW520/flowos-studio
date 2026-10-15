'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { AppShell, SearchBox, Topbar } from '@/components/AppShell'
import {
  ArrowUpRight,
  Check,
  Eye,
  Film,
  Image,
  ListFilter,
  Lock,
  RotateCcw,
  Search,
  Sparkles,
  Workflow,
  X,
} from '@/components/icons'
import { images } from '@/lib/mock'
import { useProjectStore } from '@/lib/use-project-store'

type DiscoverKind = 'image' | 'video' | 'workflow' | 'character'
type RecipeVisibility = 'public' | 'visible' | 'hidden'
type DiscoverTab = 'all' | DiscoverKind | 'commercial'

interface CommunityWork {
  id: string
  title: string
  image: string
  author: string
  purpose: string
  kind: DiscoverKind
  recipe: RecipeVisibility
  uses: number
  usesLabel: string
  license: 'Commercial safe' | 'Editorial' | 'Personal'
  model: string
  description: string
}

const works: CommunityWork[] = [
  {
    id: 'rain-window-study',
    title: 'Rain window study',
    image: images.rain,
    author: 'Mira Studio',
    purpose: 'Product film',
    kind: 'video',
    recipe: 'public',
    uses: 2400,
    usesLabel: '2.4k remixes',
    license: 'Commercial safe',
    model: 'Cinematic Core 4',
    description: '冷色雨幕、暖色室内光与产品微距运动的完整镜头方法。',
  },
  {
    id: 'after-hours',
    title: 'After hours',
    image: images.person,
    author: 'Kite House',
    purpose: 'Character study',
    kind: 'character',
    recipe: 'visible',
    uses: 840,
    usesLabel: '840 uses',
    license: 'Personal',
    model: 'Pulse Draft 2.1',
    description: '用于角色表情、服装和侧逆光一致性测试的参考组。',
  },
  {
    id: 'cold-brew-35mm',
    title: 'Cold brew / 35mm',
    image: images.coffee,
    author: 'Lin Chen',
    purpose: 'Brand visual',
    kind: 'image',
    recipe: 'public',
    uses: 1200,
    usesLabel: '1.2k remixes',
    license: 'Commercial safe',
    model: 'Aperture Studio X',
    description: '35mm 颗粒、低照度材质和冷萃产品高光的品牌视觉配方。',
  },
  {
    id: 'street-light-test',
    title: 'Street light test',
    image: images.street,
    author: 'Noon Works',
    purpose: 'Moodboard',
    kind: 'workflow',
    recipe: 'hidden',
    uses: 320,
    usesLabel: '320 uses',
    license: 'Editorial',
    model: 'Private route',
    description: '城市夜景的光源分层与环境连续性研究，作者暂未公开 Recipe。',
  },
  {
    id: 'bottle-details',
    title: 'Bottle details',
    image: images.package,
    author: 'Rae Kim',
    purpose: 'Product still',
    kind: 'image',
    recipe: 'public',
    uses: 612,
    usesLabel: '612 uses',
    license: 'Commercial safe',
    model: 'Aperture Studio X',
    description: '锁定包装比例、标签位置与材质反射的多参考产品图流程。',
  },
  {
    id: 'blue-hour-loop',
    title: 'Blue hour loop',
    image: images.hero,
    author: 'Orbit Club',
    purpose: 'Social video',
    kind: 'video',
    recipe: 'public',
    uses: 1800,
    usesLabel: '1.8k remixes',
    license: 'Commercial safe',
    model: 'Cinematic Core 4',
    description: '适合社媒循环播放的蓝调时刻运镜与首尾帧衔接方案。',
  },
]

const tabs: { id: DiscoverTab; label: string }[] = [
  { id: 'all', label: '全部' },
  { id: 'image', label: '图片' },
  { id: 'video', label: '视频' },
  { id: 'workflow', label: '工作流' },
  { id: 'character', label: '角色' },
  { id: 'commercial', label: '可商用' },
]

const recipeLabels: Record<RecipeVisibility, string> = {
  public: 'Recipe 公开',
  visible: 'Recipe 可见',
  hidden: 'Recipe 隐藏',
}

const kindLabels: Record<DiscoverKind, string> = {
  image: '图片',
  video: '视频',
  workflow: '工作流',
  character: '角色',
}

function KindIcon({ kind }: { kind: DiscoverKind }) {
  const Icon = kind === 'image' ? Image : kind === 'video' ? Film : kind === 'workflow' ? Workflow : Sparkles
  return <Icon size={13} aria-hidden="true" />
}

function CommunityDialog({
  work,
  onClose,
  onRemix,
  onRequestAccess,
  remixing,
}: {
  work: CommunityWork
  onClose: () => void
  onRemix: () => void
  onRequestAccess: () => void
  remixing: boolean
}) {
  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', closeOnEscape)
    return () => window.removeEventListener('keydown', closeOnEscape)
  }, [onClose])

  const recipeHidden = work.recipe === 'hidden'

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-6">
      <button
        type="button"
        aria-label="关闭作品详情"
        className="absolute inset-0 cursor-default bg-black/70"
        onClick={onClose}
      />
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="community-work-title"
        className="relative max-h-[92vh] w-full overflow-y-auto rounded-t-2xl border border-[#303641] bg-[#15171c] shadow-2xl sm:max-w-3xl sm:rounded-xl"
      >
        <div className="grid md:grid-cols-[1.1fr_.9fr]">
          <img src={work.image} alt={`${work.title} 预览`} className="aspect-[4/3] h-full min-h-0 w-full object-cover" />
          <div className="p-5 sm:p-6">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="text-[10px] uppercase tracking-[.16em] text-[#4ee1ff]">{kindLabels[work.kind]}</div>
                <h2 id="community-work-title" className="mt-2 truncate text-lg font-semibold">{work.title}</h2>
                <p className="mt-1 text-xs text-[#858f9e]">by {work.author}</p>
              </div>
              <button
                type="button"
                onClick={onClose}
                autoFocus
                className="focus-ring rounded-lg p-2 text-[#8e98a7] hover:bg-[#22262e] hover:text-white"
                aria-label="关闭"
              >
                <X size={17} aria-hidden="true" />
              </button>
            </div>

            <p className="mt-5 text-sm leading-6 text-[#bcc3ce]">{work.description}</p>
            <dl className="mt-5 grid grid-cols-2 gap-2 text-xs">
              {[
                ['用途', work.purpose],
                ['许可', work.license],
                ['模型路由', work.model],
                ['使用量', work.usesLabel],
              ].map(([label, value]) => (
                <div key={label} className="rounded-lg bg-[#1b1e24] p-3">
                  <dt className="text-[10px] text-[#737d8c]">{label}</dt>
                  <dd className="mt-1 text-[#e4e8ee]">{value}</dd>
                </div>
              ))}
            </dl>

            <div className={`mt-4 rounded-lg border p-3 ${recipeHidden ? 'border-[#493b31] bg-[#211c19]' : 'border-[#294047] bg-[#172328]'}`}>
              <div className="flex items-center gap-2 text-xs">
                {recipeHidden ? <Lock size={14} aria-hidden="true" /> : <Check size={14} className="text-[#56c596]" aria-hidden="true" />}
                <span>{recipeLabels[work.recipe]}</span>
              </div>
              <p className="mt-1.5 text-[11px] leading-5 text-[#8f98a6]">
                {recipeHidden
                  ? '提示词、参数和引用实体仅对获批成员开放。'
                  : 'Remix 会复制可编辑镜头、实体和来源关系，不会修改原作。'}
              </p>
            </div>

            <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button type="button" onClick={onClose} className="focus-ring rounded-lg border border-[#303641] px-4 py-2.5 text-xs hover:bg-[#20242b]">
                返回浏览
              </button>
              {recipeHidden ? (
                <button type="button" onClick={onRequestAccess} className="focus-ring rounded-lg bg-[#f5f7fa] px-4 py-2.5 text-xs font-semibold text-[#111318] hover:bg-white">
                  申请 Recipe 访问
                </button>
              ) : (
                <button
                  type="button"
                  onClick={onRemix}
                  disabled={remixing}
                  className="focus-ring flex items-center justify-center gap-2 rounded-lg bg-[#4ee1ff] px-4 py-2.5 text-xs font-semibold text-[#071014] hover:bg-[#7ae9ff] disabled:cursor-wait disabled:opacity-60"
                >
                  <RotateCcw size={14} aria-hidden="true" />
                  {remixing ? '正在创建…' : 'Remix 到工作区'}
                </button>
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}

export default function Discover() {
  const router = useRouter()
  const { remix, hydrated } = useProjectStore('rain-coffee')
  const [query, setQuery] = useState('')
  const [activeTab, setActiveTab] = useState<DiscoverTab>('all')
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [license, setLicense] = useState('all')
  const [recipe, setRecipe] = useState('all')
  const [model, setModel] = useState('all')
  const [selectedWork, setSelectedWork] = useState<CommunityWork | null>(null)
  const [remixingId, setRemixingId] = useState<string | null>(null)
  const [notice, setNotice] = useState('')

  useEffect(() => {
    if (!notice) return
    const timer = window.setTimeout(() => setNotice(''), 3600)
    return () => window.clearTimeout(timer)
  }, [notice])

  const filteredWorks = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase()
    return works.filter((work) => {
      const matchesQuery = !needle || [work.title, work.author, work.purpose, work.model, work.description]
        .some((value) => value.toLocaleLowerCase().includes(needle))
      const matchesTab = activeTab === 'all'
        || (activeTab === 'commercial' ? work.license === 'Commercial safe' : work.kind === activeTab)
      const matchesLicense = license === 'all' || work.license === license
      const matchesRecipe = recipe === 'all' || work.recipe === recipe
      const matchesModel = model === 'all' || work.model === model
      return matchesQuery && matchesTab && matchesLicense && matchesRecipe && matchesModel
    })
  }, [activeTab, license, model, query, recipe])

  const resetFilters = () => {
    setQuery('')
    setActiveTab('all')
    setLicense('all')
    setRecipe('all')
    setModel('all')
  }

  const remixWork = (work: CommunityWork) => {
    if (work.recipe === 'hidden') {
      setSelectedWork(work)
      return
    }
    if (!hydrated || remixingId) return
    setRemixingId(work.id)
    try {
      const created = remix({ name: `${work.title} · Remix` })
      setNotice(`已创建 ${created.name}，正在打开画布。`)
      router.push(`/project/${created.id}?mode=canvas&source=discover`)
    } catch {
      setRemixingId(null)
      setNotice('Remix 创建失败，请稍后重试。')
    }
  }

  const requestAccess = (work: CommunityWork) => {
    setSelectedWork(null)
    setNotice(`已向 ${work.author} 发送 Recipe 访问申请。`)
  }

  return (
    <AppShell>
      <Topbar
        title="Discover"
        actions={(
          <SearchBox
            placeholder="搜索作品、作者或模型"
            value={query}
            onChange={setQuery}
            className="w-[58vw] max-w-[19rem] sm:w-72"
          />
        )}
      />

      <div className="mx-auto max-w-[1320px] p-4 sm:p-6 lg:p-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="text-xs uppercase tracking-[.16em] text-[#4ee1ff]">Community library</div>
            <h1 className="mt-2 text-2xl font-semibold">从可复用的方法开始。</h1>
            <p className="mt-2 text-sm text-[#8f98a6]">查看来源、许可与 Recipe，再把作品带进自己的工作区。</p>
          </div>
          <button
            type="button"
            onClick={() => setFiltersOpen((open) => !open)}
            aria-expanded={filtersOpen}
            aria-controls="discover-filters"
            className={`focus-ring flex w-fit items-center gap-2 rounded-lg border px-3 py-2 text-xs ${filtersOpen ? 'border-[#4ee1ff] bg-[#172329] text-[#4ee1ff]' : 'border-[#2b3039] bg-[#1b1f26] text-[#c2c8d1]'}`}
          >
            <ListFilter size={14} aria-hidden="true" />
            筛选
          </button>
        </div>

        <div className="scrollbar mt-7 flex gap-2 overflow-x-auto border-b border-[#292e38] pb-3" role="tablist" aria-label="作品类型">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={activeTab === tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`focus-ring shrink-0 rounded px-3 py-1.5 text-xs ${activeTab === tab.id ? 'bg-[#26333a] text-[#4ee1ff]' : 'text-[#818b99] hover:bg-[#191c22] hover:text-white'}`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {filtersOpen && (
          <section id="discover-filters" aria-label="高级筛选" className="mt-3 grid gap-3 rounded-xl border border-[#2a2e38] bg-[#14161b] p-4 sm:grid-cols-3">
            <label className="text-[11px] text-[#8892a1]">
              许可
              <select value={license} onChange={(event) => setLicense(event.target.value)} className="focus-ring mt-1.5 h-9 w-full rounded-lg border border-[#303540] bg-[#1b1e24] px-3 text-xs text-[#f5f7fa]">
                <option value="all">全部许可</option>
                <option value="Commercial safe">可商用</option>
                <option value="Editorial">仅编辑用途</option>
                <option value="Personal">个人用途</option>
              </select>
            </label>
            <label className="text-[11px] text-[#8892a1]">
              Recipe
              <select value={recipe} onChange={(event) => setRecipe(event.target.value)} className="focus-ring mt-1.5 h-9 w-full rounded-lg border border-[#303540] bg-[#1b1e24] px-3 text-xs text-[#f5f7fa]">
                <option value="all">全部可见性</option>
                <option value="public">公开</option>
                <option value="visible">可见</option>
                <option value="hidden">隐藏</option>
              </select>
            </label>
            <label className="text-[11px] text-[#8892a1]">
              模型
              <select value={model} onChange={(event) => setModel(event.target.value)} className="focus-ring mt-1.5 h-9 w-full rounded-lg border border-[#303540] bg-[#1b1e24] px-3 text-xs text-[#f5f7fa]">
                <option value="all">全部模型</option>
                <option value="Pulse Draft 2.1">Pulse Draft 2.1</option>
                <option value="Cinematic Core 4">Cinematic Core 4</option>
                <option value="Aperture Studio X">Aperture Studio X</option>
                <option value="Private route">Private route</option>
              </select>
            </label>
          </section>
        )}

        <div className="mt-4 flex items-center justify-between gap-3 text-[11px] text-[#7f8998]" aria-live="polite">
          <span>{filteredWorks.length} 个结果</span>
          {(query || activeTab !== 'all' || license !== 'all' || recipe !== 'all' || model !== 'all') && (
            <button type="button" onClick={resetFilters} className="focus-ring rounded px-2 py-1 text-[#4ee1ff] hover:bg-[#182329]">清除筛选</button>
          )}
        </div>

        {filteredWorks.length > 0 ? (
          <div className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filteredWorks.map((work) => {
              const hidden = work.recipe === 'hidden'
              const remixing = remixingId === work.id
              return (
                <article key={work.id} className="surface group overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setSelectedWork(work)}
                    className="focus-ring relative block w-full overflow-hidden text-left"
                    aria-label={`查看 ${work.title} 详情`}
                  >
                    <img src={work.image} alt="" className="aspect-[4/3] w-full object-cover transition duration-300 group-hover:scale-[1.03]" />
                    <span className="absolute bottom-2 left-2 flex items-center gap-1.5 rounded bg-[#0b0c0f]/85 px-2 py-1 text-[10px]">
                      <KindIcon kind={work.kind} />
                      {work.purpose}
                    </span>
                    <span className="absolute right-2 top-2 rounded bg-[#0b0c0f]/85 p-1.5 text-[#dfe5ec]">
                      <Eye size={13} aria-hidden="true" />
                    </span>
                  </button>
                  <div className="p-3">
                    <button type="button" onClick={() => setSelectedWork(work)} className="focus-ring max-w-full rounded text-left text-sm font-medium hover:text-[#4ee1ff]">
                      {work.title}
                    </button>
                    <div className="mt-1 text-[11px] text-[#7d8795]">by {work.author}</div>
                    <div className="mt-3 flex min-w-0 items-center gap-2 text-[10px] text-[#8f98a6]">
                      <span className={`flex shrink-0 items-center gap-1 rounded px-1.5 py-1 ${hidden ? 'bg-[#29211d] text-[#c7a384]' : 'bg-[#20252d]'}`}>
                        {hidden && <Lock size={10} aria-hidden="true" />}
                        {recipeLabels[work.recipe]}
                      </span>
                      <span className="min-w-0 truncate">{work.usesLabel}</span>
                      <button
                        type="button"
                        onClick={() => hidden ? setSelectedWork(work) : remixWork(work)}
                        disabled={!hidden && (!hydrated || Boolean(remixingId))}
                        className="focus-ring ml-auto flex shrink-0 items-center gap-1 rounded px-1.5 py-1 text-[#4ee1ff] hover:bg-[#182329] disabled:cursor-wait disabled:opacity-50"
                        aria-label={hidden ? `申请访问 ${work.title} 的 Recipe` : `Remix ${work.title}`}
                      >
                        {hidden ? '申请访问' : remixing ? '创建中…' : 'Remix'}
                        {!hidden && !remixing && <ArrowUpRight size={11} aria-hidden="true" />}
                      </button>
                    </div>
                  </div>
                </article>
              )
            })}
          </div>
        ) : (
          <section className="mt-3 flex min-h-72 flex-col items-center justify-center rounded-xl border border-dashed border-[#303641] px-5 text-center">
            <Search size={22} className="text-[#647080]" aria-hidden="true" />
            <h2 className="mt-3 text-sm font-medium">没有匹配的社区作品</h2>
            <p className="mt-1 text-xs text-[#7f8998]">换一个关键词，或清除媒体与许可筛选。</p>
            <button type="button" onClick={resetFilters} className="focus-ring mt-4 rounded-lg bg-[#20252d] px-3 py-2 text-xs hover:bg-[#29303a]">清除筛选</button>
          </section>
        )}
      </div>

      {selectedWork && (
        <CommunityDialog
          work={selectedWork}
          onClose={() => setSelectedWork(null)}
          onRemix={() => remixWork(selectedWork)}
          onRequestAccess={() => requestAccess(selectedWork)}
          remixing={remixingId === selectedWork.id}
        />
      )}

      {notice && (
        <div role="status" aria-live="polite" className="fixed bottom-20 left-1/2 z-[60] w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 rounded-lg border border-[#3a414c] bg-[#1c2027] px-4 py-3 text-xs shadow-2xl md:bottom-6">
          {notice}
        </div>
      )}
    </AppShell>
  )
}
