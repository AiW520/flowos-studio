'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import {
  ArrowUpRight,
  BarChart3,
  CheckCircle2,
  Coins,
  Download,
  Plus,
  Upload,
  Workflow,
  X,
} from '@/components/icons'
import { AppShell, Topbar } from '@/components/AppShell'

type PublishKind = 'Workflow' | 'Skill' | 'Template'
type LicenseOption = 'Commercial remix' | 'Commercial use' | 'Personal use'

interface PublishedItem {
  id: string
  name: string
  kind: PublishKind
  version: string
  uses: number
  reuseRate: number
  earnings: number
  license: LicenseOption
  price: number
  notes: string
  publishedAt: string
}

const initialPublished: PublishedItem[] = [
  { id: 'pub-1', name: 'Rainy product insert', kind: 'Workflow', version: 'v3.2', uses: 842, reuseRate: 72, earnings: 6780, license: 'Commercial remix', price: 8, notes: '优化雨幕边缘与包装文字质量检查。', publishedAt: '2026-08-28' },
  { id: 'pub-2', name: 'Character continuity pack', kind: 'Skill', version: 'v2.6', uses: 322, reuseRate: 64, earnings: 3840, license: 'Commercial use', price: 12, notes: '新增服装锁定和侧脸参考。', publishedAt: '2026-08-17' },
  { id: 'pub-3', name: 'Night voice bed', kind: 'Template', version: 'v1.1', uses: 120, reuseRate: 51, earnings: 1860, license: 'Commercial use', price: 6, notes: '首次公开版本。', publishedAt: '2026-07-30' },
]

const storageKey = 'flowos:creator-library:v1'

export default function CreatorPage() {
  const [items, setItems] = useState<PublishedItem[]>(initialPublished)
  const [hydrated, setHydrated] = useState(false)
  const [showPublish, setShowPublish] = useState(false)
  const [selected, setSelected] = useState<PublishedItem | null>(null)
  const [manageAll, setManageAll] = useState(false)
  const [notice, setNotice] = useState('')

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(storageKey)
      if (stored) {
        const parsed = JSON.parse(stored) as PublishedItem[]
        if (Array.isArray(parsed) && parsed.length > 0) setItems(parsed)
      }
    } catch {
      setNotice('本地发布记录暂时无法读取；本次会话仍可继续操作。')
    } finally {
      setHydrated(true)
    }
  }, [])

  useEffect(() => {
    if (!hydrated) return
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(items))
    } catch {
      setNotice('发布已完成，但浏览器阻止了本地持久化。')
    }
  }, [hydrated, items])

  const stats = useMemo(() => {
    const uses = items.reduce((sum, item) => sum + item.uses, 0)
    const earnings = items.reduce((sum, item) => sum + item.earnings, 0)
    const weightedReuse = uses ? Math.round(items.reduce((sum, item) => sum + item.reuseRate * item.uses, 0) / uses) : 0
    return [
      ['Published assets', String(items.length), `${Math.max(0, items.length - initialPublished.length)} new locally`],
      ['Reuse rate', `${weightedReuse}%`, 'Across published runs'],
      ['Successful runs', uses.toLocaleString('en-US'), '+26% vs last month'],
      ['Earnings', `¥${earnings.toLocaleString('zh-CN')}`, 'Pending ¥2,140'],
    ]
  }, [items])

  const publish = (draft: Omit<PublishedItem, 'id' | 'uses' | 'reuseRate' | 'earnings' | 'publishedAt'>) => {
    const item: PublishedItem = {
      ...draft,
      id: `pub-${Date.now()}`,
      uses: 0,
      reuseRate: 0,
      earnings: 0,
      publishedAt: new Date().toISOString().slice(0, 10),
    }
    setItems((current) => [item, ...current])
    setShowPublish(false)
    setSelected(item)
    setNotice(`${item.name} ${item.version} 已发布到创作者资料库。`)
  }

  const publishNewVersion = (item: PublishedItem) => {
    const match = item.version.match(/^v(\d+)\.(\d+)$/)
    const nextVersion = match ? `v${match[1]}.${Number(match[2]) + 1}` : `${item.version}.1`
    const updated = { ...item, version: nextVersion, publishedAt: new Date().toISOString().slice(0, 10), notes: `基于 ${item.version} 发布的新版本。` }
    setItems((current) => current.map((candidate) => candidate.id === item.id ? updated : candidate))
    setSelected(updated)
    setNotice(`${item.name} 已更新至 ${nextVersion}。`)
  }

  const exportReport = () => {
    const rows = [
      ['Name', 'Kind', 'Version', 'License', 'Price (credits)', 'Uses', 'Reuse rate', 'Earnings (CNY)'],
      ...items.map((item) => [item.name, item.kind, item.version, item.license, String(item.price), String(item.uses), `${item.reuseRate}%`, String(item.earnings)]),
    ]
    const csv = rows.map((row) => row.map((cell) => `"${cell.replaceAll('"', '""')}"`).join(',')).join('\n')
    const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = 'flowos-creator-report.csv'
    anchor.click()
    URL.revokeObjectURL(url)
    setNotice('创作者数据报告已导出。')
  }

  return (
    <AppShell>
      <Topbar
        title="Creator"
        actions={(
          <button type="button" onClick={() => setShowPublish(true)} className="focus-ring flex h-9 shrink-0 items-center gap-1.5 rounded-lg bg-[#4ee1ff] px-3 text-xs font-semibold text-[#071014]">
            <Upload size={14} aria-hidden="true" /> Publish
          </button>
        )}
      />
      <main className="mx-auto max-w-[1200px] p-4 sm:p-6 lg:p-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="text-xs uppercase tracking-[.16em] text-[#4ee1ff]">Creator studio</div>
            <h1 className="mt-2 text-2xl font-semibold">Your methods, in public.</h1>
            <p className="mt-2 text-sm text-[#8f98a6]">发布可复用系统，并查看版本、许可与真实复用表现。</p>
          </div>
          <button type="button" onClick={exportReport} className="focus-ring flex h-9 w-full items-center justify-center gap-2 rounded-lg border border-[#343a45] px-3 text-xs text-[#b8c1cc] hover:bg-[#1b1f26] sm:w-auto">
            <Download size={14} aria-hidden="true" /> 导出数据
          </button>
        </div>

        {notice && (
          <div role="status" className="mt-5 flex items-start gap-2 rounded-lg border border-[#31505a] bg-[#132229] px-3 py-2.5 text-xs text-[#b7c8cf]">
            <CheckCircle2 size={14} className="mt-0.5 shrink-0 text-[#4ee1ff]" aria-hidden="true" />
            <span className="min-w-0 flex-1 break-words">{notice}</span>
            <button type="button" onClick={() => setNotice('')} className="focus-ring shrink-0 rounded p-0.5 text-[#81909b]" aria-label="关闭通知"><X size={13} /></button>
          </div>
        )}

        <section aria-label="创作者指标" className="mt-7 grid grid-cols-2 gap-3 lg:grid-cols-4">
          {stats.map(([label, value, context], index) => (
            <div key={label} className="surface min-w-0 p-3 sm:p-4">
              <div className="truncate text-[11px] text-[#7d8795] sm:text-xs">{label}</div>
              <div className="mt-3 break-words text-xl font-semibold sm:text-2xl">{value}</div>
              <div className={`mt-1 truncate text-[10px] sm:text-[11px] ${index === 3 ? 'text-[#b8a8ff]' : 'text-[#56c596]'}`}>{context}</div>
            </div>
          ))}
        </section>

        <div className="mt-7 grid gap-5 lg:grid-cols-[1.2fr_.8fr]">
          <section className="surface min-w-0 p-4 sm:p-5">
            <div className="flex items-center justify-between gap-3">
              <h2 className="font-medium">Published library</h2>
              <button type="button" onClick={() => setManageAll((current) => !current)} aria-expanded={manageAll} className="focus-ring shrink-0 rounded-lg px-2 py-1.5 text-xs text-[#4ee1ff] hover:bg-[#20252d]">
                {manageAll ? '收起管理' : 'Manage all'} <ArrowUpRight size={13} className="inline" aria-hidden="true" />
              </button>
            </div>

            <div className="mt-2">
              {items.map((item) => (
                <div key={item.id} className="border-b border-[#282d36] py-3 last:border-0 sm:py-4">
                  <button type="button" onClick={() => setSelected(item)} className="focus-ring flex w-full min-w-0 items-center gap-3 rounded-lg text-left">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-[#232b33] text-[#4ee1ff]"><Workflow size={16} aria-hidden="true" /></span>
                    <span className="min-w-0 flex-1"><span className="block truncate text-xs">{item.name}</span><span className="mt-1 block truncate text-[10px] text-[#7d8795]">{item.version} · {item.kind} · {item.uses.toLocaleString()} uses</span></span>
                    <span className="shrink-0 text-[10px] text-[#56c596]">Live</span>
                    <ArrowUpRight size={13} className="shrink-0 text-[#6f7987]" aria-hidden="true" />
                  </button>
                  {manageAll && <div className="ml-12 mt-3 grid grid-cols-2 gap-2 text-[10px] text-[#929caa] sm:grid-cols-4"><span>{item.license}</span><span>{item.price ? `${item.price} cr / run` : 'Free'}</span><span>{item.reuseRate}% reuse</span><span className="sm:text-right">¥{item.earnings.toLocaleString()}</span></div>}
                </div>
              ))}
            </div>

            <button type="button" onClick={() => setShowPublish(true)} className="focus-ring mt-3 flex h-10 w-full items-center justify-center gap-2 rounded-lg border border-dashed border-[#3a414d] text-xs text-[#a9b2bf] hover:bg-[#1a1e24]">
              <Plus size={14} aria-hidden="true" /> 发布一个新方法
            </button>
          </section>

          <div className="space-y-5">
            <section className="surface p-4 sm:p-5">
              <div className="flex items-center gap-2"><BarChart3 size={16} className="text-[#4ee1ff]" aria-hidden="true" /><h2 className="font-medium">Recent activity</h2></div>
              <div className="mt-4 space-y-4 text-xs">
                {['Maya remixed Rainy product insert', 'New review on Character continuity', 'Payout processed · ¥3,840'].map((activity, index) => (
                  <div key={activity} className="flex gap-3"><span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${index === 2 ? 'bg-[#56c596]' : 'bg-[#4ee1ff]'}`} /><div className="min-w-0 break-words">{activity}<div className="mt-1 text-[10px] text-[#737d8b]">{index + 1}h ago</div></div></div>
                ))}
              </div>
            </section>

            <section className="surface p-4 sm:p-5">
              <div className="flex items-center gap-2"><Coins size={16} className="text-[#f2c56b]" aria-hidden="true" /><h2 className="font-medium">Payout</h2></div>
              <div className="mt-4 flex items-end justify-between gap-3"><div><div className="text-[10px] text-[#7d8795]">Next payout</div><div className="mt-1 text-lg font-semibold">¥2,140</div></div><span className="rounded-md bg-[#20252d] px-2 py-1 text-[10px] text-[#9da7b5]">Sep 15</span></div>
              <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-[#252a32]"><div className="h-full w-[68%] rounded-full bg-[#f2c56b]" /></div>
              <div className="mt-2 text-[10px] text-[#747e8c]">68% of monthly settlement window</div>
            </section>
          </div>
        </div>
      </main>

      {showPublish && <PublishDialog onClose={() => setShowPublish(false)} onPublish={publish} />}
      {selected && <PublishedDetail item={items.find((item) => item.id === selected.id) ?? selected} onClose={() => setSelected(null)} onNewVersion={publishNewVersion} />}
    </AppShell>
  )
}

function PublishDialog({ onClose, onPublish }: { onClose: () => void; onPublish: (draft: Omit<PublishedItem, 'id' | 'uses' | 'reuseRate' | 'earnings' | 'publishedAt'>) => void }) {
  const titleRef = useRef<HTMLInputElement>(null)
  const [name, setName] = useState('')
  const [kind, setKind] = useState<PublishKind>('Workflow')
  const [version, setVersion] = useState('v1.0')
  const [license, setLicense] = useState<LicenseOption>('Commercial remix')
  const [price, setPrice] = useState(8)
  const [notes, setNotes] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null
    titleRef.current?.focus()
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKeyDown)
    return () => { document.removeEventListener('keydown', onKeyDown); previous?.focus() }
  }, [onClose])

  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!name.trim()) { setError('请填写公开名称。'); titleRef.current?.focus(); return }
    if (!/^v\d+\.\d+$/.test(version)) { setError('版本号请使用 v1.0 格式。'); return }
    onPublish({ name: name.trim(), kind, version, license, price, notes: notes.trim() || '首次公开版本。' })
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/70 sm:items-center sm:p-6" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}>
      <div role="dialog" aria-modal="true" aria-labelledby="publish-title" className="max-h-[94dvh] w-full overflow-y-auto rounded-t-2xl border border-[#303641] bg-[#111318] shadow-2xl sm:max-w-[620px] sm:rounded-2xl">
        <div className="sticky top-0 z-10 flex items-start border-b border-[#292e38] bg-[#111318] p-4 sm:p-5"><div><h2 id="publish-title" className="font-semibold">发布创作方法</h2><p className="mt-1 text-xs text-[#86909e]">定义版本、许可和每次运行价格。</p></div><button type="button" onClick={onClose} className="focus-ring ml-auto rounded-lg p-2 text-[#8791a0] hover:bg-[#20242b]" aria-label="关闭发布窗口"><X size={17} /></button></div>
        <form onSubmit={submit}>
          <div className="space-y-4 p-4 sm:p-5">
            <label className="block text-xs text-[#9aa4b2]">公开名称<input ref={titleRef} value={name} onChange={(event) => { setName(event.target.value); setError('') }} placeholder="例如：Product hero shot system" className="focus-ring mt-2 h-10 w-full rounded-lg border border-[#303641] bg-[#171a20] px-3 text-sm text-white outline-none placeholder:text-[#66707e]" /></label>
            <fieldset><legend className="text-xs text-[#9aa4b2]">类型</legend><div className="mt-2 grid grid-cols-3 gap-2">{(['Workflow', 'Skill', 'Template'] as PublishKind[]).map((option) => <button key={option} type="button" onClick={() => setKind(option)} aria-pressed={kind === option} className={`focus-ring min-w-0 rounded-lg border px-2 py-2.5 text-[11px] ${kind === option ? 'border-[#4ee1ff] bg-[#17262b] text-[#4ee1ff]' : 'border-[#303641] bg-[#171a20] text-[#9ba5b2]'}`}>{option}</button>)}</div></fieldset>
            <div className="grid grid-cols-2 gap-3"><label className="min-w-0 text-xs text-[#9aa4b2]">版本<input value={version} onChange={(event) => { setVersion(event.target.value); setError('') }} className="focus-ring mt-2 h-10 w-full rounded-lg border border-[#303641] bg-[#171a20] px-3 text-sm outline-none" /></label><label className="min-w-0 text-xs text-[#9aa4b2]">每次运行积分<input type="number" min={0} max={999} value={price} onChange={(event) => setPrice(Number(event.target.value))} className="focus-ring mt-2 h-10 w-full rounded-lg border border-[#303641] bg-[#171a20] px-3 text-sm outline-none" /></label></div>
            <label className="block text-xs text-[#9aa4b2]">许可<select value={license} onChange={(event) => setLicense(event.target.value as LicenseOption)} className="focus-ring mt-2 h-10 w-full rounded-lg border border-[#303641] bg-[#171a20] px-3 text-sm outline-none"><option>Commercial remix</option><option>Commercial use</option><option>Personal use</option></select></label>
            <label className="block text-xs text-[#9aa4b2]">更新日志<textarea value={notes} onChange={(event) => setNotes(event.target.value)} rows={3} placeholder="说明输入、输出或兼容性变化" className="focus-ring mt-2 w-full resize-none rounded-lg border border-[#303641] bg-[#171a20] p-3 text-sm leading-5 outline-none placeholder:text-[#66707e]" /></label>
            <div className="rounded-lg bg-[#1b2027] p-3 text-[11px] leading-5 text-[#909aa8]">发布后可继续创建新版本；使用量、复用率和收益将在 Creator 中按版本记录。</div>
            {error && <p role="alert" className="text-xs text-[#ff8f98]">{error}</p>}
          </div>
          <div className="sticky bottom-0 flex gap-2 border-t border-[#292e38] bg-[#111318] p-4 sm:justify-end sm:p-5"><button type="button" onClick={onClose} className="focus-ring h-10 flex-1 rounded-lg border border-[#343a45] px-4 text-xs text-[#b4bdc8] sm:flex-none">取消</button><button type="submit" className="focus-ring flex h-10 flex-1 items-center justify-center gap-2 rounded-lg bg-[#4ee1ff] px-4 text-xs font-semibold text-[#071014] sm:flex-none"><Upload size={14} /> 发布 {version}</button></div>
        </form>
      </div>
    </div>
  )
}

function PublishedDetail({ item, onClose, onNewVersion }: { item: PublishedItem; onClose: () => void; onNewVersion: (item: PublishedItem) => void }) {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [onClose])

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/70 sm:items-center sm:p-6" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}>
      <div role="dialog" aria-modal="true" aria-labelledby="published-detail-title" className="max-h-[92dvh] w-full overflow-y-auto rounded-t-2xl border border-[#303641] bg-[#111318] p-4 shadow-2xl sm:max-w-[560px] sm:rounded-2xl sm:p-5">
        <div className="flex items-start gap-3"><div className="min-w-0 flex-1"><div className="text-[10px] uppercase tracking-[.14em] text-[#4ee1ff]">{item.kind} · Live</div><h2 id="published-detail-title" className="mt-2 break-words text-lg font-semibold">{item.name}</h2></div><button type="button" onClick={onClose} autoFocus className="focus-ring rounded-lg p-2 text-[#8791a0] hover:bg-[#20242b]" aria-label="关闭发布详情"><X size={17} /></button></div>
        <div className="mt-5 grid grid-cols-2 gap-3"><DetailCell label="Version" value={item.version} /><DetailCell label="Published" value={item.publishedAt} /><DetailCell label="License" value={item.license} /><DetailCell label="Price" value={item.price ? `${item.price} cr / run` : 'Free'} /><DetailCell label="Usage" value={`${item.uses.toLocaleString()} runs`} /><DetailCell label="Reuse rate" value={`${item.reuseRate}%`} /></div>
        <div className="mt-4 rounded-xl border border-[#2b3039] bg-[#171a20] p-4"><div className="text-[10px] uppercase tracking-[.14em] text-[#707a89]">Changelog</div><p className="mt-2 text-xs leading-5 text-[#afb7c2]">{item.notes}</p></div>
        <div className="mt-5 flex gap-2"><button type="button" onClick={onClose} className="focus-ring h-10 flex-1 rounded-lg border border-[#343a45] px-4 text-xs">完成</button><button type="button" onClick={() => onNewVersion(item)} className="focus-ring flex h-10 flex-1 items-center justify-center gap-2 rounded-lg bg-[#4ee1ff] px-4 text-xs font-semibold text-[#071014]"><Plus size={14} /> 发布新版本</button></div>
      </div>
    </div>
  )
}

function DetailCell({ label, value }: { label: string; value: string }) {
  return <div className="min-w-0 rounded-lg bg-[#191c22] p-3"><div className="text-[10px] text-[#707a89]">{label}</div><div className="mt-1 break-words text-xs">{value}</div></div>
}
