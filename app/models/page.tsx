'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { AppShell, SearchBox, Topbar } from '@/components/AppShell'
import { ModelProviderManager } from '@/components/ModelProviderManager'
import { PreviewImage } from '@/components/PreviewImage'
import {
  ArrowUpRight,
  AudioLines,
  Check,
  CheckCircle2,
  Clock3,
  Image,
  Search,
  Settings2,
  Video,
  X,
  Zap,
} from '@/components/icons'
import type { MediaType, ModelVersion } from '@/lib/types'
import { useModelCatalog } from '@/lib/use-model-catalog'
import { useProjectStore } from '@/lib/use-project-store'

type MediaFilter = 'all' | MediaType

const mediaLabels: Record<MediaType, string> = {
  image: '图片',
  video: '视频',
  audio: '音频',
}

const mediaFilters: { id: MediaFilter; label: string }[] = [
  { id: 'all', label: '全部' },
  { id: 'image', label: '图片' },
  { id: 'video', label: '视频' },
  { id: 'audio', label: '音频' },
]

const modelPreviewById: Record<string, string> = {
  m1: '/home/neon.webp',
  m2: '/home/interior.webp',
  m3: '/home/portrait.webp',
}

const fallbackPreviews = ['/home/neon.webp', '/home/interior.webp', '/home/portrait.webp', '/home/fantasy.webp', '/home/castle.webp']

function modelPreview(model: ModelVersion): string {
  if (modelPreviewById[model.id]) return modelPreviewById[model.id]
  const hash = [...(model.modelId ?? model.id)].reduce((total, character) => total + character.charCodeAt(0), 0)
  return fallbackPreviews[hash % fallbackPreviews.length]
}

function MediaIcon({ media }: { media: MediaType }) {
  const Icon = media === 'image' ? Image : media === 'video' ? Video : AudioLines
  return <Icon size={12} aria-hidden="true" />
}

function ModelDetailsDialog({
  model,
  selected,
  onClose,
  onSelect,
  onUse,
}: {
  model: ModelVersion
  selected: boolean
  onClose: () => void
  onSelect: () => void
  onUse: () => void
}) {
  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', closeOnEscape)
    return () => window.removeEventListener('keydown', closeOnEscape)
  }, [onClose])

  const available = model.status === 'available'

  return (
    <div className="fixed inset-0 z-50">
      <button type="button" aria-label="关闭模型详情" onClick={onClose} className="absolute inset-0 cursor-default bg-black/70" />
      <aside
        role="dialog"
        aria-modal="true"
        aria-labelledby="model-detail-title"
        className="absolute inset-x-0 bottom-0 max-h-[92vh] overflow-y-auto rounded-t-2xl border border-[#303641] bg-[#15171c] p-5 shadow-2xl sm:inset-y-0 sm:left-auto sm:w-full sm:max-w-md sm:rounded-none sm:border-y-0 sm:border-r-0 sm:p-6"
      >
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="text-[10px] uppercase tracking-[.16em] text-[#4ee1ff]">Model version</div>
            <h2 id="model-detail-title" className="mt-2 text-xl font-semibold">{model.name}</h2>
            <p className="mt-1 text-xs text-[#7f8997]">{model.provider}</p>
          </div>
          <button type="button" onClick={onClose} autoFocus aria-label="关闭" className="focus-ring rounded-lg p-2 text-[#8e98a7] hover:bg-[#22262e] hover:text-white">
            <X size={18} aria-hidden="true" />
          </button>
        </div>

        <div className={`mt-5 flex items-center gap-2 rounded-lg border px-3 py-2.5 text-xs ${available ? 'border-[#294536] bg-[#17251e] text-[#79d5a5]' : 'border-[#4a3d31] bg-[#251f1a] text-[#d4aa82]'}`}>
          {available ? <CheckCircle2 size={14} aria-hidden="true" /> : <Clock3 size={14} aria-hidden="true" />}
          {available ? '当前可用' : '维护中，暂不可提交任务'}
        </div>

        <p className="mt-5 text-sm leading-6 text-[#b8c0cb]">{model.reason}</p>

        <div className="mt-5 flex flex-wrap gap-1.5">
          {model.media.map((media) => (
            <span key={media} className="flex items-center gap-1.5 rounded-full bg-[#20252d] px-2.5 py-1 text-[10px] text-[#b3bbc7]">
              <MediaIcon media={media} />
              {mediaLabels[media]}
            </span>
          ))}
        </div>

        <dl className="mt-5 grid grid-cols-2 gap-2">
          {[
            ['质量档', model.quality],
            ['预计耗时', model.speed],
            ['预计成本', model.cost],
            ['最高输出', model.resolution],
            ['最长时长', model.duration],
            ['引用限制', model.refs],
          ].map(([label, value]) => (
            <div key={label} className="rounded-lg bg-[#1b1e24] p-3">
              <dt className="text-[10px] text-[#717b89]">{label}</dt>
              <dd className="mt-1 text-xs text-[#edf0f4]">{value}</dd>
            </div>
          ))}
        </dl>

        <section className="mt-5 border-t border-[#2b3039] pt-5" aria-labelledby="capabilities-title">
          <h3 id="capabilities-title" className="text-xs font-medium">能力与约束</h3>
          <ul className="mt-3 space-y-2">
            {model.capabilities.map((capability) => (
              <li key={capability} className="flex items-center gap-2 text-xs text-[#aeb6c1]">
                <Check size={13} className="text-[#56c596]" aria-hidden="true" />
                {capability}
              </li>
            ))}
          </ul>
          <div className="mt-4 rounded-lg border border-[#2d333d] bg-[#181b21] p-3 text-[11px] leading-5 text-[#929ba9]">
            <span className="text-[#dce1e8]">许可摘要：</span>{model.policy}。成本与耗时均为 Estimate，提交前会再次确认。
          </div>
        </section>

        <div className="sticky bottom-0 -mx-5 mt-6 flex gap-2 border-t border-[#2b3039] bg-[#15171c] px-5 pb-1 pt-4 sm:-mx-6 sm:px-6">
          <button
            type="button"
            onClick={onSelect}
            disabled={!available}
            aria-pressed={selected}
            className={`focus-ring flex-1 rounded-lg border px-3 py-2.5 text-xs disabled:cursor-not-allowed disabled:opacity-50 ${selected ? 'border-[#4ee1ff] bg-[#172a30] text-[#4ee1ff]' : 'border-[#343a45] hover:bg-[#20242b]'}`}
          >
            {selected ? '已选为默认' : '设为默认'}
          </button>
          <button
            type="button"
            onClick={onUse}
            disabled={!available}
            className="focus-ring flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-[#4ee1ff] px-3 py-2.5 text-xs font-semibold text-[#071014] hover:bg-[#7ae9ff] disabled:cursor-not-allowed disabled:opacity-50"
          >
            用于当前项目
            <ArrowUpRight size={13} aria-hidden="true" />
          </button>
        </div>
      </aside>
    </div>
  )
}

export default function Models() {
  const router = useRouter()
  const { currentProject, hydrated } = useProjectStore()
  const { models, providers, loading, error: catalogError, refresh } = useModelCatalog()
  const [query, setQuery] = useState('')
  const [mediaFilter, setMediaFilter] = useState<MediaFilter>('all')
  const [qualityFilter, setQualityFilter] = useState('all')
  const [selectedModelId, setSelectedModelId] = useState('')
  const [detailModel, setDetailModel] = useState<ModelVersion | null>(null)
  const [notice, setNotice] = useState('')
  const [showProviders, setShowProviders] = useState(false)

  useEffect(() => {
    const stored = window.localStorage.getItem('flowos:selected-model')
    setSelectedModelId((current) => {
      if (current && models.some((model) => model.id === current)) return current
      if (stored && models.some((model) => model.id === stored)) return stored
      return models.find((model) => model.status === 'available')?.id ?? ''
    })
  }, [models])

  useEffect(() => {
    if (!notice) return
    const timer = window.setTimeout(() => setNotice(''), 3200)
    return () => window.clearTimeout(timer)
  }, [notice])

  const filteredModels = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase()
    return models.filter((model) => {
      const matchesSearch = !needle || [model.name, model.provider, model.reason, model.quality, ...model.capabilities]
        .some((value) => value.toLocaleLowerCase().includes(needle))
      const matchesMedia = mediaFilter === 'all' || model.media.includes(mediaFilter)
      const matchesQuality = qualityFilter === 'all' || model.quality === qualityFilter
      return matchesSearch && matchesMedia && matchesQuality
    })
  }, [mediaFilter, models, qualityFilter, query])

  const selectedModel = models.find((model) => model.id === selectedModelId)
  const availableCount = models.filter((model) => model.status === 'available').length
  const maintenanceCount = models.length - availableCount

  const selectModel = (model: ModelVersion) => {
    if (model.status !== 'available') {
      setNotice(`${model.name} 正在维护，无法选择。`)
      return
    }
    setSelectedModelId(model.id)
    window.localStorage.setItem('flowos:selected-model', model.id)
    if (currentProject) window.localStorage.setItem(`flowos:selected-model:${currentProject.id}`, model.id)
    setNotice(`已将 ${model.name} 设为默认模型。`)
  }

  const applyModelToCurrentProject = (model: ModelVersion) => {
    selectModel(model)
    if (model.status !== 'available') return
    if (!hydrated) {
      setNotice('项目数据仍在加载，请稍后重试。')
      return
    }
    if (!currentProject) {
      setNotice('先创建一个项目，再把模型用于生成。')
      router.push('/home')
      return
    }
    router.push(`/project/${currentProject.id}?mode=canvas&model=${encodeURIComponent(model.id)}`)
  }

  const clearFilters = () => {
    setQuery('')
    setMediaFilter('all')
    setQualityFilter('all')
  }

  return (
    <AppShell>
      <Topbar
        title="Models"
        actions={(
          <div className="flex items-center gap-2">
            <SearchBox
              placeholder="搜索模型或能力"
              value={query}
              onChange={setQuery}
              className="w-[48vw] max-w-[19rem] sm:w-72"
            />
            <button type="button" onClick={() => setShowProviders(true)} className="focus-ring flex h-10 shrink-0 items-center gap-1.5 rounded-lg border border-[#303641] bg-[#191c22] px-3 text-xs text-[#b1bac6] hover:border-[#46515f] hover:text-white" title="管理模型接入">
              <Settings2 size={15} aria-hidden="true" />
              <span className="hidden sm:inline">接入管理</span>
            </button>
          </div>
        )}
      />

      <div className="mx-auto max-w-[1280px] p-4 sm:p-6 lg:p-7">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="text-xs uppercase tracking-[.16em] text-[#4ee1ff]">Model catalog</div>
            <h1 className="mt-2 text-2xl font-semibold">模型广场</h1>
            <p className="mt-2 text-sm text-[#8f98a6]">已接入供应商的模型会自动同步到这里，并与项目画布共用。</p>
          </div>
          <div className="text-xs text-[#7f8897]">{providers.filter((provider) => provider.enabled).length} 个接入 · {availableCount} 可用{maintenanceCount > 0 ? ` · ${maintenanceCount} 维护中` : ''}</div>
        </div>

        {catalogError && (
          <div role="alert" className="mt-4 flex flex-col gap-2 rounded-lg border border-[#67404a] bg-[#2b1c21] px-3 py-2.5 text-xs text-[#f0a7b5] sm:flex-row sm:items-center sm:justify-between">
            <span>{catalogError}</span>
            <button type="button" onClick={() => void refresh()} className="focus-ring rounded-lg bg-[#3a252b] px-3 py-1.5 text-[11px] hover:bg-[#472c34]">重新加载</button>
          </div>
        )}

        <section aria-label="模型筛选" className="mt-5 flex flex-col gap-3 border-b border-[#292e38] pb-3 lg:flex-row lg:items-end lg:justify-between">
          <div className="scrollbar flex gap-2 overflow-x-auto" role="tablist" aria-label="媒体类型">
            {mediaFilters.map((filter) => (
              <button
                key={filter.id}
                type="button"
                role="tab"
                aria-selected={mediaFilter === filter.id}
                onClick={() => setMediaFilter(filter.id)}
                className={`focus-ring shrink-0 rounded-full border px-3.5 py-2 text-xs transition-colors ${mediaFilter === filter.id ? 'border-[#365f69] bg-[#26333a] text-[#4ee1ff]' : 'border-transparent bg-[#171a20] text-[#8d96a4] hover:border-[#303641] hover:text-white'}`}
              >
                {filter.label}
              </button>
            ))}
          </div>
          <label className="flex items-center gap-2 text-[11px] text-[#858f9e]">
            质量档
            <select value={qualityFilter} onChange={(event) => setQualityFilter(event.target.value)} className="focus-ring h-9 flex-1 rounded-lg border border-[#303540] bg-[#1b1e24] px-3 text-xs text-[#f5f7fa] transition-colors hover:border-[#46515f] sm:flex-none">
              <option value="all">全部</option>
              {Array.from(new Set(models.map((model) => model.quality))).map((quality) => <option key={quality} value={quality}>{quality}</option>)}
            </select>
          </label>
        </section>

        {selectedModel && (
          <div className="mt-3 flex flex-col gap-3 rounded-lg border border-[#28505a] bg-[#142126] p-3 sm:flex-row sm:items-center">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#20343a] text-[#4ee1ff]">
              <Check size={15} aria-hidden="true" />
            </span>
            <div className="min-w-0 flex-1">
              <div className="text-xs font-medium">当前默认 · {selectedModel.name}</div>
              <div className="mt-0.5 truncate text-[10px] text-[#83909d]">{selectedModel.cost} · {selectedModel.speed} · {selectedModel.policy}</div>
            </div>
            <button type="button" onClick={() => applyModelToCurrentProject(selectedModel)} className="focus-ring flex items-center justify-center gap-1.5 rounded-lg bg-[#4ee1ff] px-3 py-2 text-xs font-semibold text-[#071014] hover:bg-[#7ae9ff]">
              用于当前项目
              <ArrowUpRight size={13} aria-hidden="true" />
            </button>
          </div>
        )}

        <div className="mt-3 text-[11px] text-[#7f8998]" aria-live="polite">{filteredModels.length} 个匹配模型</div>

        {loading && !models.length ? (
          <section className="mt-3 flex min-h-72 flex-col items-center justify-center rounded-lg border border-dashed border-[#303641] px-5 text-center">
            <Settings2 size={22} className="animate-spin text-[#647080]" aria-hidden="true" />
            <h2 className="mt-3 text-sm font-medium">正在同步模型目录</h2>
            <p className="mt-1 text-xs text-[#7f8998]">读取已启用的供应商接入与上次同步结果。</p>
          </section>
        ) : filteredModels.length > 0 ? (
          <div className="mt-3 grid grid-cols-[repeat(auto-fill,minmax(min(100%,230px),280px))] gap-3">
            {filteredModels.map((model) => {
              const selected = model.id === selectedModelId
              const available = model.status === 'available'
              return (
                <article key={model.id} className={`surface group flex min-w-0 flex-col overflow-hidden shadow-[0_10px_28px_rgba(0,0,0,.12)] transition-[border-color,box-shadow,transform] duration-200 hover:-translate-y-0.5 hover:border-[#465464] hover:shadow-[0_16px_34px_rgba(0,0,0,.2)] ${selected ? 'border-[#4ee1ff] shadow-[0_0_0_1px_rgba(78,225,255,.12),0_14px_34px_rgba(0,0,0,.18)]' : ''}`}>
                  <button type="button" onClick={() => setDetailModel(model)} className="focus-ring relative block aspect-[16/6.5] w-full overflow-hidden bg-[#191c22] text-left" aria-label={`查看 ${model.name} 详情`}>
                    <PreviewImage src={modelPreview(model)} alt={`${model.name} 模型案例`} className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]" loading="lazy" />
                    <span className="absolute bottom-2 left-2 rounded-full bg-[#0a0c10]/85 px-2 py-1 text-[9px] text-[#e9eef4] backdrop-blur-sm">{model.resolution} · {model.duration}</span>
                  </button>
                  <div className="flex min-h-0 flex-1 flex-col p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h2 className="truncate text-sm font-medium">{model.name}</h2>
                      <div className="mt-0.5 truncate text-[10px] text-[#7f8897]">{model.provider} · v{model.version ?? '—'}</div>
                    </div>
                    <span className={`flex shrink-0 items-center gap-1 rounded-full px-2 py-1 text-[9px] ${available ? 'bg-[#1d4030] text-[#7ed5a8]' : 'bg-[#3a3027] text-[#d7ad83]'}`}>
                      {available ? <CheckCircle2 size={12} aria-hidden="true" /> : <Clock3 size={12} aria-hidden="true" />}
                      {available ? '可用' : '维护中'}
                    </span>
                  </div>

                  <div className="mt-3 flex flex-wrap gap-1">
                    {model.media.map((media) => (
                      <span key={media} className="flex items-center gap-1 rounded-full bg-[#20252d] px-2 py-1 text-[9px] text-[#aab2bf]">
                        <MediaIcon media={media} />
                        {mediaLabels[media]}
                      </span>
                    ))}
                  </div>

                  <p className="mt-3 min-h-8 line-clamp-2 text-[10px] leading-relaxed text-[#aab2bf]">{model.reason}</p>
                  <div className="mt-3 grid grid-cols-3 gap-1.5 rounded-lg bg-[#191c22] p-2 text-[9px]">
                    <span className="min-w-0 truncate rounded-md px-1" title={model.quality}><b className="block font-normal text-[#6f7886]">质量</b><span className="text-[#d7dde5]">{model.quality}</span></span>
                    <span className="min-w-0 truncate rounded-md px-1" title={model.speed}><b className="block font-normal text-[#6f7886]">速度</b><span className="text-[#d7dde5]">{model.speed.split('·')[0].trim()}</span></span>
                    <span className="min-w-0 truncate rounded-md px-1" title={model.cost}><b className="block font-normal text-[#6f7886]">成本</b><span className="text-[#d7dde5]">{model.cost.replace(' / frame', '')}</span></span>
                  </div>
                  <div className="mt-2 truncate text-[9px] text-[#7d8795]" title={`${model.resolution} · ${model.duration} · ${model.refs} · ${model.policy}`}>{model.resolution} · {model.duration} · {model.refs} · {model.policy}</div>

                  <div className="mt-auto grid grid-cols-2 gap-2 pt-3">
                    <button type="button" onClick={() => setDetailModel(model)} className="focus-ring rounded-lg border border-[#313742] px-2 py-2 text-[11px] transition-colors hover:border-[#46515f] hover:bg-[#20242b]">查看详情</button>
                    <button
                      type="button"
                      onClick={() => selectModel(model)}
                      disabled={!available}
                      aria-pressed={selected}
                      className={`focus-ring flex items-center justify-center gap-1.5 rounded-lg px-2 py-2 text-[11px] font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${selected ? 'bg-[#20343a] text-[#4ee1ff]' : 'bg-[#f5f7fa] text-[#111318] hover:bg-white'}`}
                    >
                      {selected ? <Check size={13} aria-hidden="true" /> : <Zap size={13} aria-hidden="true" />}
                      {selected ? '已选择' : '选择模型'}
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
            <h2 className="mt-3 text-sm font-medium">{models.length ? '没有匹配的模型' : '还没有可用模型'}</h2>
            <p className="mt-1 text-xs text-[#7f8998]">{models.length ? '尝试搜索能力名称，或清除媒体与质量筛选。' : '新增供应商接入并完成同步后，模型会自动显示在这里。'}</p>
            <button type="button" onClick={models.length ? clearFilters : () => setShowProviders(true)} className="focus-ring mt-4 rounded-lg bg-[#20252d] px-3 py-2 text-xs hover:bg-[#29303a]">{models.length ? '清除筛选' : '新增模型接入'}</button>
          </section>
        )}
      </div>

      {detailModel && (
        <ModelDetailsDialog
          model={detailModel}
          selected={detailModel.id === selectedModelId}
          onClose={() => setDetailModel(null)}
          onSelect={() => selectModel(detailModel)}
          onUse={() => applyModelToCurrentProject(detailModel)}
        />
      )}

      <ModelProviderManager open={showProviders} onClose={() => setShowProviders(false)} onCatalogChanged={refresh} />

      {notice && (
        <div role="status" aria-live="polite" className="fixed bottom-20 left-1/2 z-[60] w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 rounded-lg border border-[#3a414c] bg-[#1c2027] px-4 py-3 text-xs shadow-2xl md:bottom-6">
          {notice}
        </div>
      )}
    </AppShell>
  )
}
