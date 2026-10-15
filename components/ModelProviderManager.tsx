'use client'

import { useCallback, useEffect, useState } from 'react'
import { CheckCircle2, Clock3, Plus, RotateCcw, Settings2, Trash2, X } from '@/components/icons'
import type { ModelProviderConnection } from '@/lib/model-registry-types'
import type { MediaType } from '@/lib/types'

interface ProviderListResponse {
  providers?: ModelProviderConnection[]
  provider?: ModelProviderConnection
  error?: string
}

interface ModelProviderManagerProps {
  open: boolean
  onClose: () => void
  onCatalogChanged: () => Promise<unknown> | void
}

const mediaOptions: Array<{ id: MediaType; label: string }> = [
  { id: 'image', label: '图片' },
  { id: 'video', label: '视频' },
  { id: 'audio', label: '音频' },
]

async function readResponse(response: Response): Promise<ProviderListResponse> {
  if (response.status === 204) return {}
  const payload = await response.json() as ProviderListResponse
  if (!response.ok) throw new Error(payload.error || '操作失败。')
  return payload
}

export function ModelProviderManager({ open, onClose, onCatalogChanged }: ModelProviderManagerProps) {
  const [providers, setProviders] = useState<ModelProviderConnection[]>([])
  const [loading, setLoading] = useState(false)
  const [busyId, setBusyId] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [confirmRemoveId, setConfirmRemoveId] = useState('')
  const [name, setName] = useState('兔子 API')
  const [baseUrl, setBaseUrl] = useState('https://api.tu-zi.com/coding')
  const [modelsPath, setModelsPath] = useState('v1/models')
  const [apiKeyEnv, setApiKeyEnv] = useState('TUZI_API_KEY')
  const [defaultMedia, setDefaultMedia] = useState<MediaType[]>(['image'])

  const loadProviders = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch('/api/model-providers', { cache: 'no-store' })
      const payload = await readResponse(response)
      setProviders(payload.providers ?? [])
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '接入列表加载失败。')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!open) return
    void loadProviders()
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', closeOnEscape)
    return () => window.removeEventListener('keydown', closeOnEscape)
  }, [loadProviders, onClose, open])

  if (!open) return null

  const mutate = async (id: string, request: () => Promise<Response>): Promise<boolean> => {
    setBusyId(id)
    setError(null)
    try {
      const response = await request()
      const payload = await readResponse(response)
      const syncError = payload.provider?.syncError
      await loadProviders()
      await onCatalogChanged()
      if (syncError) setError(syncError)
      return true
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '操作失败。')
      return false
    } finally {
      setBusyId('')
    }
  }

  const createProvider = async (event: React.FormEvent) => {
    event.preventDefault()
    const created = await mutate('new', () => fetch('/api/model-providers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, baseUrl, modelsPath, apiKeyEnv, defaultMedia }),
    }))
    if (created) setShowForm(false)
  }

  const toggleMedia = (media: MediaType) => {
    setDefaultMedia((current) => current.includes(media)
      ? current.filter((item) => item !== media)
      : [...current, media])
  }

  return (
    <div className="fixed inset-0 z-50">
      <button type="button" aria-label="关闭接入管理" onClick={onClose} className="absolute inset-0 cursor-default bg-black/70" />
      <aside role="dialog" aria-modal="true" aria-labelledby="provider-manager-title" className="absolute inset-x-0 bottom-0 max-h-[94vh] overflow-y-auto rounded-t-2xl border border-[#303641] bg-[#15171c] shadow-2xl sm:inset-y-0 sm:left-auto sm:w-full sm:max-w-xl sm:rounded-none sm:border-y-0 sm:border-r-0">
        <header className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-[#2a3039] bg-[#15171c]/95 p-5 backdrop-blur sm:p-6">
          <div>
            <div className="flex items-center gap-2 text-[10px] uppercase tracking-[.16em] text-[#4ee1ff]"><Settings2 size={13} aria-hidden="true" /> Provider registry</div>
            <h2 id="provider-manager-title" className="mt-2 text-xl font-semibold">模型接入管理</h2>
            <p className="mt-1 text-xs leading-5 text-[#858f9e]">启用的接入会自动同步模型，并显示在模型广场与项目画布。</p>
          </div>
          <button type="button" onClick={onClose} aria-label="关闭" className="focus-ring rounded-lg p-2 text-[#8e98a7] hover:bg-[#22262e] hover:text-white"><X size={18} aria-hidden="true" /></button>
        </header>

        <div className="p-5 sm:p-6">
          <div className="flex items-center justify-between gap-3">
            <div className="text-xs text-[#8c96a4]">{providers.filter((provider) => provider.enabled).length} 个已启用接入</div>
            <button type="button" onClick={() => setShowForm((current) => !current)} className="focus-ring flex items-center gap-1.5 rounded-lg bg-[#f4f6f8] px-3 py-2 text-xs font-medium text-[#111318] hover:bg-white">
              {showForm ? <X size={14} aria-hidden="true" /> : <Plus size={14} aria-hidden="true" />}
              {showForm ? '取消' : '新增接入'}
            </button>
          </div>

          {showForm && (
            <form onSubmit={createProvider} className="mt-4 border-y border-[#2b3039] py-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="text-[11px] text-[#8f98a6]">接入名称
                  <input required maxLength={80} value={name} onChange={(event) => setName(event.target.value)} className="focus-ring mt-1.5 h-10 w-full rounded-lg border border-[#303641] bg-[#1b1e24] px-3 text-xs text-white" />
                </label>
                <label className="text-[11px] text-[#8f98a6]">API Key 环境变量
                  <input value={apiKeyEnv} onChange={(event) => setApiKeyEnv(event.target.value.toUpperCase())} placeholder="TUZI_API_KEY" className="focus-ring mt-1.5 h-10 w-full rounded-lg border border-[#303641] bg-[#1b1e24] px-3 text-xs text-white" />
                </label>
                <label className="text-[11px] text-[#8f98a6] sm:col-span-2">接口地址
                  <input required type="url" value={baseUrl} onChange={(event) => setBaseUrl(event.target.value)} className="focus-ring mt-1.5 h-10 w-full rounded-lg border border-[#303641] bg-[#1b1e24] px-3 text-xs text-white" />
                </label>
                <label className="text-[11px] text-[#8f98a6] sm:col-span-2">模型列表路径
                  <input required value={modelsPath} onChange={(event) => setModelsPath(event.target.value)} placeholder="v1/models" className="focus-ring mt-1.5 h-10 w-full rounded-lg border border-[#303641] bg-[#1b1e24] px-3 text-xs text-white" />
                </label>
              </div>
              <fieldset className="mt-4">
                <legend className="text-[11px] text-[#8f98a6]">无法识别模型类型时，默认归类为</legend>
                <div className="mt-2 flex flex-wrap gap-2">
                  {mediaOptions.map((media) => (
                    <label key={media.id} className={`flex cursor-pointer items-center gap-2 rounded-full border px-3 py-2 text-xs ${defaultMedia.includes(media.id) ? 'border-[#3d6972] bg-[#22343a] text-[#65e7ff]' : 'border-[#303641] bg-[#1a1d23] text-[#929ba9]'}`}>
                      <input type="checkbox" checked={defaultMedia.includes(media.id)} onChange={() => toggleMedia(media.id)} className="accent-[#4ee1ff]" />
                      {media.label}
                    </label>
                  ))}
                </div>
              </fieldset>
              <div className="mt-4 flex flex-col gap-3 rounded-lg border border-[#303641] bg-[#191c22] p-3 text-[10px] leading-5 text-[#8993a1] sm:flex-row sm:items-center sm:justify-between">
                <span>密钥值只从服务端环境变量读取，不会保存到浏览器或模型注册表。</span>
                <button type="submit" disabled={busyId === 'new' || !defaultMedia.length} className="focus-ring shrink-0 rounded-lg bg-[#4ee1ff] px-3 py-2 text-xs font-semibold text-[#071014] disabled:opacity-50">{busyId === 'new' ? '正在连接…' : '连接并同步'}</button>
              </div>
            </form>
          )}

          {error && <div role="alert" className="mt-4 rounded-lg border border-[#67404a] bg-[#2b1c21] px-3 py-2.5 text-xs leading-5 text-[#f0a7b5]">{error}</div>}

          <div className="mt-5 space-y-2" aria-live="polite">
            {loading && !providers.length ? (
              <div className="py-10 text-center text-xs text-[#7d8795]">正在读取接入配置…</div>
            ) : providers.map((provider) => (
              <section key={provider.id} className="rounded-lg border border-[#303641] bg-[#191c22] p-3.5">
                <div className="flex items-start gap-3">
                  <span className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${provider.syncStatus === 'error' ? 'bg-[#362228] text-[#e99baa]' : 'bg-[#1c3529] text-[#72d29d]'}`}>
                    {provider.syncStatus === 'error' ? <Clock3 size={15} aria-hidden="true" /> : <CheckCircle2 size={15} aria-hidden="true" />}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-sm font-medium">{provider.name}</h3>
                      <span className="rounded-full bg-[#252a32] px-2 py-1 text-[9px] text-[#9ca5b2]">{provider.modelCount} 个模型</span>
                      {!provider.credentialConfigured && <span className="rounded-full bg-[#3a2d1f] px-2 py-1 text-[9px] text-[#efc17f]">缺少密钥</span>}
                    </div>
                    <div className="mt-1 truncate text-[10px] text-[#717c8b]" title={provider.baseUrl ?? '内置演示目录'}>{provider.baseUrl ?? '内置演示目录'}</div>
                    {provider.syncError && <p className="mt-2 text-[10px] leading-4 text-[#d79aa6]">{provider.syncError}</p>}
                  </div>
                  <label className="flex shrink-0 cursor-pointer items-center gap-2 text-[10px] text-[#8e98a6]">
                    <input
                      type="checkbox"
                      checked={provider.enabled}
                      disabled={busyId === provider.id}
                      onChange={() => void mutate(provider.id, () => fetch(`/api/model-providers/${encodeURIComponent(provider.id)}`, {
                        method: 'PATCH',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ enabled: !provider.enabled }),
                      }))}
                      className="h-4 w-4 accent-[#4ee1ff]"
                    />
                    启用
                  </label>
                </div>
                <div className="mt-3 flex items-center justify-between gap-3 border-t border-[#2b3039] pt-3">
                  <span className="truncate text-[9px] text-[#687280]">{provider.apiKeyEnv ? `密钥：${provider.apiKeyEnv}` : '无需密钥'}{provider.lastSyncAt ? ` · ${new Date(provider.lastSyncAt).toLocaleString('zh-CN')}` : ''}</span>
                  <div className="flex shrink-0 gap-1">
                    {provider.adapterType !== 'static' && (
                      <button type="button" title="立即同步" aria-label={`同步 ${provider.name}`} disabled={busyId === provider.id} onClick={() => void mutate(provider.id, () => fetch(`/api/model-providers/${encodeURIComponent(provider.id)}/sync`, { method: 'POST' }))} className="focus-ring rounded-lg p-2 text-[#9aa4b1] hover:bg-[#252a32] hover:text-white disabled:opacity-40"><RotateCcw size={14} aria-hidden="true" /></button>
                    )}
                    {provider.adapterType !== 'static' && <button
                      type="button"
                      aria-label={confirmRemoveId === provider.id ? `确认移除 ${provider.name}` : `移除 ${provider.name}`}
                      title={confirmRemoveId === provider.id ? '再次点击确认移除' : '移除接入'}
                      disabled={busyId === provider.id}
                      onClick={() => {
                        if (confirmRemoveId !== provider.id) {
                          setConfirmRemoveId(provider.id)
                          return
                        }
                        setConfirmRemoveId('')
                        void mutate(provider.id, () => fetch(`/api/model-providers/${encodeURIComponent(provider.id)}`, { method: 'DELETE' }))
                      }}
                      className={`focus-ring rounded-lg p-2 hover:bg-[#342027] ${confirmRemoveId === provider.id ? 'bg-[#45252d] text-[#f2a0b0]' : 'text-[#9aa4b1] hover:text-[#f2a0b0]'}`}
                    ><Trash2 size={14} aria-hidden="true" /></button>}
                  </div>
                </div>
              </section>
            ))}
          </div>
        </div>
      </aside>
    </div>
  )
}
