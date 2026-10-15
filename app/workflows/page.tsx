'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { AppShell, SearchBox, Topbar } from '@/components/AppShell'
import {
  ArrowRight,
  Check,
  CheckCircle2,
  Clock3,
  Layers3,
  Plus,
  Workflow,
  X,
  Zap,
} from '@/components/icons'
import { projectWorkspaceHref, rememberProjectBrief } from '@/components/NewProjectDialog'
import { useProjectStore } from '@/lib/use-project-store'

type WorkflowKind = 'Workflow' | 'Skill' | 'Template'

interface WorkflowListing {
  id: string
  name: string
  kind: WorkflowKind
  input: string
  output: string
  steps: number
  compatibleModels: string[]
  completion: number
  price: string
  version: string
  description: string
  accent: string
  inLibrary?: boolean
}

const listings: WorkflowListing[] = [
  {
    id: 'rainy-product-insert',
    name: 'Rainy product insert',
    kind: 'Workflow',
    input: '产品图 + 氛围 Brief',
    output: '6 秒商品视频',
    steps: 6,
    compatibleModels: ['Cinematic Core 4', 'Pulse Draft 2.1'],
    completion: 94,
    price: 'Free',
    version: 'v3.2',
    description: '锁定包装结构，再依次完成雨幕、灯光、运镜与质量检查。',
    accent: '#4EE1FF',
    inLibrary: true,
  },
  {
    id: 'character-continuity-pack',
    name: 'Character continuity pack',
    kind: 'Skill',
    input: '角色参考 + 台词',
    output: '6 个连续镜头',
    steps: 8,
    compatibleModels: ['Cinematic Core 4', 'Aperture Studio X'],
    completion: 88,
    price: '12 cr / run',
    version: 'v2.6',
    description: '从角色 Bible 提取锁定特征，并在每个镜头后执行一致性检查。',
    accent: '#A992FF',
  },
  {
    id: 'social-cutdown-kit',
    name: 'Social cutdown kit',
    kind: 'Template',
    input: '主版视频',
    output: '横版 / 竖版 / 方形',
    steps: 4,
    compatibleModels: ['Any video model'],
    completion: 91,
    price: 'Free',
    version: 'v1.9',
    description: '重构画面焦点与字幕安全区，批量准备三个社媒交付规格。',
    accent: '#F2C56B',
    inLibrary: true,
  },
  {
    id: 'brand-sound-bed',
    name: 'Brand sound bed',
    kind: 'Workflow',
    input: '品牌 Brief + 声音参考',
    output: '30 秒声音层',
    steps: 5,
    compatibleModels: ['Core Audio'],
    completion: 86,
    price: '8 cr / run',
    version: 'v1.4',
    description: '将品牌节奏拆成环境、音乐与标志音，并输出可循环分轨。',
    accent: '#77D7A8',
  },
]

const tabs = ['All', 'Workflows', 'Skills', 'Templates', 'My library'] as const
type Tab = (typeof tabs)[number]

interface LaunchState {
  workflow: WorkflowListing
  projectId: string
  projectName: string
}

export default function WorkflowsPage() {
  const router = useRouter()
  const { createProject } = useProjectStore()
  const [search, setSearch] = useState('')
  const [tab, setTab] = useState<Tab>('All')
  const [selected, setSelected] = useState<WorkflowListing | null>(null)
  const [libraryIds, setLibraryIds] = useState(() => new Set(listings.filter((item) => item.inLibrary).map((item) => item.id)))
  const [launching, setLaunching] = useState(false)
  const [launched, setLaunched] = useState<LaunchState | null>(null)

  const filtered = useMemo(() => {
    const query = search.trim().toLocaleLowerCase()
    return listings.filter((listing) => {
      const matchesTab = tab === 'All'
        || (tab === 'My library' ? libraryIds.has(listing.id) : `${listing.kind}s` === tab)
      const haystack = [listing.name, listing.description, listing.input, listing.output, ...listing.compatibleModels]
        .join(' ')
        .toLocaleLowerCase()
      return matchesTab && (!query || haystack.includes(query))
    })
  }, [libraryIds, search, tab])

  const launchWorkflow = () => {
    if (!selected || launching) return
    setLaunching(true)
    const brief = `使用 ${selected.name} ${selected.version}：${selected.input} → ${selected.output}。${selected.description}`
    const created = createProject({
      name: `${selected.name} · 试运行`,
      type: `${selected.kind} 试运行`,
    })
    rememberProjectBrief(created.id, brief)
    setLibraryIds((current) => new Set(current).add(selected.id))
    setLaunched({ workflow: selected, projectId: created.id, projectName: created.name })
    setLaunching(false)
    setSelected(null)
  }

  return (
    <AppShell>
      <Topbar
        title="Workflows"
        actions={(
          <SearchBox
            placeholder="搜索工作流、Skill"
            value={search}
            onChange={setSearch}
            className="max-w-[180px] sm:max-w-xs"
          />
        )}
      />
      <main className="mx-auto max-w-[1200px] p-4 sm:p-6 lg:p-8">
        <div className="text-xs uppercase tracking-[.16em] text-[#4ee1ff]">Workflow market</div>
        <h1 className="mt-2 text-2xl font-semibold">Methods worth reusing.</h1>
        <p className="mt-2 max-w-2xl text-sm text-[#8f98a6]">将成熟的创作方法直接带进项目，并在节点模式继续调整。</p>

        {launched && (
          <section role="status" className="mt-6 flex flex-col gap-4 rounded-xl border border-[#31505a] bg-[#132229] p-4 sm:flex-row sm:items-center">
            <div className="flex min-w-0 items-start gap-3">
              <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#17343d] text-[#4ee1ff]">
                <CheckCircle2 size={17} aria-hidden="true" />
              </span>
              <div className="min-w-0">
                <div className="text-sm font-medium">试运行已准备</div>
                <div className="mt-1 break-words text-xs text-[#9babb5]">{launched.workflow.name} 已加入“{launched.projectName}”，输入 Brief 已写入 Agent。</div>
              </div>
            </div>
            <div className="flex shrink-0 gap-2 sm:ml-auto">
              <button type="button" onClick={() => setLaunched(null)} className="focus-ring h-9 rounded-lg border border-[#34414a] px-3 text-xs text-[#aeb9c1] hover:bg-[#1b2b32]">收起</button>
              <button type="button" onClick={() => router.push(projectWorkspaceHref(launched.projectId))} className="focus-ring flex h-9 flex-1 items-center justify-center gap-2 rounded-lg bg-[#4ee1ff] px-3 text-xs font-semibold text-[#071014] sm:flex-none">
                打开工作区 <ArrowRight size={14} aria-hidden="true" />
              </button>
            </div>
          </section>
        )}

        <div className="scrollbar mt-7 overflow-x-auto border-b border-[#292e38] pb-3">
          <div className="flex min-w-max gap-2" role="tablist" aria-label="工作流类型">
            {tabs.map((item) => (
              <button key={item} type="button" role="tab" aria-selected={tab === item} onClick={() => setTab(item)} className={`focus-ring rounded px-3 py-1.5 text-xs ${tab === item ? 'bg-[#26333a] text-[#4ee1ff]' : 'text-[#929baa] hover:bg-[#191d23] hover:text-white'}`}>
                {item}
              </button>
            ))}
          </div>
        </div>

        {filtered.length > 0 ? (
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            {filtered.map((listing) => (
              <article key={listing.id} className="surface flex min-w-0 flex-col p-4 sm:p-5">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-[#303640] bg-[#20252d]" style={{ color: listing.accent }}>
                    <Workflow size={19} aria-hidden="true" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="break-words font-medium">{listing.name}</h2>
                      <span className="rounded bg-[#252a33] px-1.5 py-0.5 text-[10px] text-[#aab2bf]">{listing.kind}</span>
                      {libraryIds.has(listing.id) && <span className="flex items-center gap-1 rounded bg-[#1b342b] px-1.5 py-0.5 text-[10px] text-[#77d7a8]"><Check size={10} aria-hidden="true" /> Library</span>}
                    </div>
                    <div className="mt-1 text-xs text-[#8b95a3]">{listing.input} → {listing.output}</div>
                  </div>
                  <button type="button" onClick={() => setSelected(listing)} className="focus-ring shrink-0 rounded-lg p-2 text-[#4ee1ff] hover:bg-[#20252d]" aria-label={`查看 ${listing.name} 详情`}><ArrowRight size={16} aria-hidden="true" /></button>
                </div>

                <p className="mt-4 min-h-10 text-xs leading-5 text-[#9aa3b2]">{listing.description}</p>
                <div className="mt-4 grid grid-cols-2 gap-2 text-[10px] sm:grid-cols-3">
                  <Metric icon={Layers3} label={`${listing.steps} 步 · ${listing.version}`} />
                  <Metric icon={CheckCircle2} label={`${listing.completion}% 完成率`} />
                  <Metric icon={Zap} label={listing.price} className="col-span-2 sm:col-span-1" />
                </div>
                <div className="mt-3 truncate text-[10px] text-[#737d8b]" title={listing.compatibleModels.join(' / ')}>兼容：{listing.compatibleModels.join(' / ')}</div>
                <button type="button" onClick={() => setSelected(listing)} className="focus-ring mt-4 h-9 w-full rounded-lg bg-[#20252d] text-xs hover:bg-[#29313b]">Try workflow</button>
              </article>
            ))}
          </div>
        ) : (
          <div className="mt-5 rounded-xl border border-dashed border-[#333945] py-14 text-center">
            <Workflow size={24} className="mx-auto text-[#626c7a]" aria-hidden="true" />
            <div className="mt-3 text-sm">没有匹配的工作流</div>
            <button type="button" onClick={() => { setSearch(''); setTab('All') }} className="focus-ring mt-4 rounded-lg border border-[#343a45] px-3 py-2 text-xs text-[#b4bdc8]">清除筛选</button>
          </div>
        )}
      </main>

      {selected && (
        <WorkflowDialog
          listing={selected}
          inLibrary={libraryIds.has(selected.id)}
          launching={launching}
          onClose={() => setSelected(null)}
          onToggleLibrary={() => setLibraryIds((current) => {
            const next = new Set(current)
            if (next.has(selected.id)) next.delete(selected.id)
            else next.add(selected.id)
            return next
          })}
          onLaunch={launchWorkflow}
        />
      )}
    </AppShell>
  )
}

function Metric({ icon: Icon, label, className = '' }: { icon: typeof Clock3; label: string; className?: string }) {
  return <div className={`flex min-w-0 items-center gap-1.5 rounded-lg bg-[#191c22] px-2.5 py-2 text-[#98a2b0] ${className}`}><Icon size={12} className="shrink-0" aria-hidden="true" /><span className="truncate">{label}</span></div>
}

function WorkflowDialog({ listing, inLibrary, launching, onClose, onToggleLibrary, onLaunch }: { listing: WorkflowListing; inLibrary: boolean; launching: boolean; onClose: () => void; onToggleLibrary: () => void; onLaunch: () => void }) {
  const dialogRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null
    dialogRef.current?.focus()
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKeyDown)
    return () => { document.removeEventListener('keydown', onKeyDown); previous?.focus() }
  }, [onClose])

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/70 sm:items-center sm:p-6" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}>
      <div ref={dialogRef} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby="workflow-dialog-title" className="max-h-[92dvh] w-full overflow-y-auto rounded-t-2xl border border-[#303641] bg-[#111318] shadow-2xl sm:max-w-[620px] sm:rounded-2xl">
        <div className="sticky top-0 z-10 flex items-start gap-3 border-b border-[#292e38] bg-[#111318] p-4 sm:p-5">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#20252d]" style={{ color: listing.accent }}><Workflow size={19} aria-hidden="true" /></span>
          <div className="min-w-0"><h2 id="workflow-dialog-title" className="break-words font-semibold">{listing.name}</h2><div className="mt-1 text-xs text-[#828c9b]">{listing.kind} · {listing.version} · {listing.completion}% 完成率</div></div>
          <button type="button" onClick={onClose} className="focus-ring ml-auto rounded-lg p-2 text-[#8791a0] hover:bg-[#20242b]" aria-label="关闭工作流详情"><X size={17} aria-hidden="true" /></button>
        </div>

        <div className="p-4 sm:p-5">
          <p className="text-sm leading-6 text-[#b2bac5]">{listing.description}</p>
          <div className="mt-5 grid grid-cols-2 gap-3"><Detail label="输入" value={listing.input} /><Detail label="输出" value={listing.output} /><Detail label="执行步骤" value={`${listing.steps} 个节点`} /><Detail label="每次运行" value={listing.price} /></div>
          <div className="mt-4 rounded-xl border border-[#2b3039] bg-[#171a20] p-4"><div className="text-[10px] uppercase tracking-[.14em] text-[#707a89]">Compatible models</div><div className="mt-3 flex flex-wrap gap-2">{listing.compatibleModels.map((model) => <span key={model} className="rounded-md bg-[#242932] px-2.5 py-1.5 text-xs text-[#b8c0cb]">{model}</span>)}</div></div>
          <div className="mt-4 flex items-start gap-2 rounded-lg bg-[#1b2027] p-3 text-[11px] leading-5 text-[#9ba5b3]"><Clock3 size={14} className="mt-0.5 shrink-0 text-[#4ee1ff]" aria-hidden="true" />试运行会创建独立项目，并把工作流输入说明写入 Agent Brief；不会调用真实模型或消耗真实费用。</div>
        </div>

        <div className="sticky bottom-0 flex gap-2 border-t border-[#292e38] bg-[#111318] p-4 sm:justify-end sm:p-5">
          <button type="button" onClick={onToggleLibrary} className="focus-ring flex h-10 flex-1 items-center justify-center gap-2 rounded-lg border border-[#343a45] px-4 text-xs text-[#b4bdc8] sm:flex-none">{inLibrary ? <Check size={14} aria-hidden="true" /> : <Plus size={14} aria-hidden="true" />}{inLibrary ? '已在资料库' : '加入资料库'}</button>
          <button type="button" onClick={onLaunch} disabled={launching} className="focus-ring flex h-10 flex-1 items-center justify-center gap-2 rounded-lg bg-[#4ee1ff] px-4 text-xs font-semibold text-[#071014] disabled:opacity-60 sm:flex-none">{launching ? '正在准备…' : '开始试运行'} <ArrowRight size={14} aria-hidden="true" /></button>
        </div>
      </div>
    </div>
  )
}

function Detail({ label, value }: { label: string; value: string }) {
  return <div className="min-w-0 rounded-lg bg-[#191c22] p-3"><div className="text-[10px] text-[#707a89]">{label}</div><div className="mt-1 break-words text-xs text-[#e5e9ef]">{value}</div></div>
}
