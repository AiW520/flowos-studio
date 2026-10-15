'use client'

import {
  ArrowRight,
  Bot,
  Check,
  CheckCircle2,
  Clock3,
  Coins,
  Download,
  GitBranch,
  GitCompareArrows,
  Image as ImageIcon,
  Layers3,
  Link2,
  ListRestart,
  LoaderCircle,
  MessageCircle,
  MonitorUp,
  PackageCheck,
  Plus,
  Radio,
  RotateCcw,
  Send,
  ShieldCheck,
  Sparkles,
  Upload,
  WandSparkles,
  X,
  Zap,
} from 'lucide-react'
import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from 'react'
import type { FormEvent, ReactNode } from 'react'
import type {
  ProjectLineageEntry,
  RepositoryGenerationJob,
} from '@/lib/project-repository'
import type { MediaType, ModelVersion, Shot } from '@/lib/types'

const primaryButton =
  'focus-ring inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-[#4ee1ff] px-4 text-xs font-semibold text-[#071014] transition hover:bg-[#84ebff] disabled:cursor-not-allowed disabled:opacity-45'
const secondaryButton =
  'focus-ring inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-[#343945] bg-[#20232a] px-4 text-xs font-medium text-[#d9dee7] transition hover:border-[#4a5160] hover:bg-[#262a32] disabled:cursor-not-allowed disabled:opacity-45'
const iconButton =
  'focus-ring inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-[#9aa3b2] transition hover:bg-[#252932] hover:text-white'
const inputClass =
  'focus-ring w-full rounded-lg border border-[#303540] bg-[#101217] px-3 text-xs text-[#f5f7fa] placeholder:text-[#687180] hover:border-[#424957] focus:border-[#4ee1ff] focus:outline-none'

type AsyncAction = () => void | Promise<void>

interface DialogFrameProps {
  open: boolean
  onClose: () => void
  title: string
  description?: string
  eyebrow?: string
  children: ReactNode
  footer?: ReactNode
  widthClass?: string
  variant?: 'modal' | 'drawer' | 'agent'
}

export function useAccessibleDialog(open: boolean, onClose: () => void) {
  const dialogRef = useRef<HTMLDivElement>(null)
  const closeRef = useRef(onClose)

  useEffect(() => {
    closeRef.current = onClose
  }, [onClose])

  useEffect(() => {
    if (!open) return

    const previousFocus = document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    const frame = window.requestAnimationFrame(() => {
      const initial = dialogRef.current?.querySelector<HTMLElement>('[data-autofocus]')
      initial?.focus()
      if (!initial) dialogRef.current?.focus()
    })

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        closeRef.current()
        return
      }
      if (event.key !== 'Tab' || !dialogRef.current) return

      const focusable = Array.from(dialogRef.current.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])',
      )).filter((element) => element.getClientRects().length > 0 && element.getAttribute('aria-hidden') !== 'true')

      if (focusable.length === 0) {
        event.preventDefault()
        dialogRef.current.focus()
        return
      }

      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && (document.activeElement === last || document.activeElement === dialogRef.current)) {
        event.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', onKeyDown)
    return () => {
      window.cancelAnimationFrame(frame)
      document.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = previousOverflow
      previousFocus?.focus()
    }
  }, [open])

  return dialogRef
}

function DialogFrame({
  open,
  onClose,
  title,
  description,
  eyebrow,
  children,
  footer,
  widthClass = 'max-w-2xl',
  variant = 'modal',
}: DialogFrameProps) {
  const titleId = useId()
  const descriptionId = useId()
  const dialogRef = useAccessibleDialog(open, onClose)

  if (!open) return null

  const isDrawer = variant === 'drawer'
  const isAgent = variant === 'agent'
  const positionClass = isDrawer
    ? `absolute inset-y-0 right-0 flex h-full w-full ${widthClass} flex-col border-l border-[#303540] bg-[#15171c] shadow-2xl`
    : isAgent
      ? `absolute inset-x-0 bottom-0 flex max-h-[min(82vh,720px)] w-full flex-col rounded-t-2xl border border-[#303540] bg-[#171a20] shadow-2xl sm:inset-x-auto sm:bottom-5 sm:right-5 sm:w-[min(430px,calc(100vw-40px))] sm:rounded-xl`
      : `relative flex max-h-[calc(100dvh-24px)] w-full ${widthClass} flex-col overflow-hidden rounded-xl border border-[#303540] bg-[#171a20] shadow-2xl sm:max-h-[calc(100dvh-48px)]`

  return (
    <div
      className={`fixed inset-0 z-[80] bg-black/70 ${isDrawer || isAgent ? '' : 'flex items-center justify-center p-3 sm:p-6'}`}
      onMouseDown={(event) => {
        if (event.currentTarget === event.target) onClose()
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descriptionId : undefined}
        tabIndex={-1}
        className={positionClass}
      >
        <header className="flex shrink-0 items-start gap-4 border-b border-[#292d36] px-4 py-4 sm:px-5">
          <div className="min-w-0 flex-1">
            {eyebrow ? (
              <div className="mb-1 text-[10px] font-medium uppercase tracking-[0.16em] text-[#788291]">
                {eyebrow}
              </div>
            ) : null}
            <h2 id={titleId} className="text-base font-semibold text-[#f5f7fa]">
              {title}
            </h2>
            {description ? (
              <p id={descriptionId} className="mt-1 max-w-xl text-xs leading-5 text-[#929baa]">
                {description}
              </p>
            ) : null}
          </div>
          <button type="button" onClick={onClose} className={iconButton} aria-label={`关闭${title}`}>
            <X size={17} aria-hidden="true" />
          </button>
        </header>
        <div className="scrollbar min-h-0 flex-1 overflow-y-auto">{children}</div>
        {footer ? (
          <footer className="shrink-0 border-t border-[#292d36] bg-[#14161b] px-4 py-3 sm:px-5">
            {footer}
          </footer>
        ) : null}
      </div>
    </div>
  )
}

function InlineError({ message }: { message: string | null }) {
  if (!message) return null
  return (
    <div role="alert" className="rounded-lg border border-[#6b3440] bg-[#2b181d] px-3 py-2 text-xs text-[#ffacb8]">
      {message}
    </div>
  )
}

function toMessage(error: unknown): string {
  return error instanceof Error ? error.message : '操作未完成，请重试。'
}

function parseCredits(cost?: string): number {
  const parsed = Number.parseFloat(cost ?? '')
  return Number.isFinite(parsed) ? parsed : 0
}

function mediaLabel(media: MediaType | undefined): string {
  if (media === 'image') return '图片'
  if (media === 'audio') return '音频'
  return '视频'
}

export interface GenerationEstimate {
  credits: number
  currency: string
  timeRange: string
  outputSpec: string
  license: string
  dataNotice: string
}

export interface GenerationConfirmModalProps {
  open: boolean
  onClose: () => void
  onConfirm: AsyncAction
  model: ModelVersion | null
  shot?: Shot | null
  prompt?: string
  mediaType?: MediaType
  estimate?: Partial<GenerationEstimate>
}

export function GenerationConfirmModal({
  open,
  onClose,
  onConfirm,
  model,
  shot,
  prompt,
  mediaType = 'video',
  estimate,
}: GenerationConfirmModalProps) {
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const credits = estimate?.credits ?? parseCredits(model?.cost)
  const resolvedEstimate: GenerationEstimate = {
    credits,
    currency: estimate?.currency ?? `¥${(credits * 0.22).toFixed(2)}`,
    timeRange: estimate?.timeRange ?? model?.speed ?? '约 30–60 秒',
    outputSpec: estimate?.outputSpec
      ?? `${mediaLabel(mediaType)} · ${model?.resolution ?? '1080p'}${shot?.duration ? ` · ${shot.duration}` : ''}`,
    license: estimate?.license ?? model?.policy ?? '生成前检查许可',
    dataNotice: estimate?.dataNotice
      ?? '本原型仅运行可预测的本地模拟任务；提示词与引用素材不会发送给真实模型供应商。',
  }

  useEffect(() => {
    if (open) setError(null)
  }, [open])

  const submit = async () => {
    if (!model || model.status !== 'available' || submitting) return
    setSubmitting(true)
    setError(null)
    try {
      await onConfirm()
      onClose()
    } catch (nextError) {
      setError(toMessage(nextError))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <DialogFrame
      open={open}
      onClose={onClose}
      eyebrow="Generation check"
      title="确认提交生成任务"
      description="费用、耗时与许可均为 Estimate。提交后可以在 Job Queue 中取消或重试。"
      widthClass="max-w-xl"
      footer={(
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between">
          <span className="text-[11px] text-[#778190]">Estimate · 不会调用真实生成 API</span>
          <div className="flex gap-2">
            <button type="button" onClick={onClose} className={secondaryButton} disabled={submitting}>
              返回调整
            </button>
            <button
              type="button"
              onClick={() => void submit()}
              className={primaryButton}
              disabled={!model || model.status !== 'available' || submitting}
              data-autofocus
            >
              {submitting ? <LoaderCircle size={15} className="animate-spin" aria-hidden="true" /> : <Sparkles size={15} aria-hidden="true" />}
              {submitting ? '正在提交' : `确认生成 · ${resolvedEstimate.credits} cr`}
            </button>
          </div>
        </div>
      )}
    >
      <div className="space-y-5 p-4 sm:p-5">
        <InlineError message={error} />

        <section aria-label="任务摘要" className="rounded-lg border border-[#2d323c] bg-[#111318] p-4">
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#1d3339] text-[#4ee1ff]">
              <WandSparkles size={17} aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <div className="text-xs font-medium text-white">
                {shot ? `镜头 ${String(shot.number).padStart(2, '0')} · ${shot.title}` : '当前创作任务'}
              </div>
              <div className="mt-1 text-[11px] text-[#828c9a]">
                {model ? `${model.name} · ${model.quality}` : '尚未选择模型'}
              </div>
            </div>
          </div>
          {prompt ? (
            <p className="mt-3 line-clamp-3 rounded-md bg-[#191c22] px-3 py-2 text-[11px] leading-5 text-[#aab2bf]">
              {prompt}
            </p>
          ) : null}
        </section>

        <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-[#2d323c] bg-[#2d323c] sm:grid-cols-4">
          {[
            { icon: Coins, label: '预计积分', value: `${resolvedEstimate.credits} cr` },
            { icon: PackageCheck, label: '估算金额', value: resolvedEstimate.currency },
            { icon: Clock3, label: '预计耗时', value: resolvedEstimate.timeRange },
            { icon: MonitorUp, label: '输出规格', value: resolvedEstimate.outputSpec },
          ].map(({ icon: Icon, label, value }) => (
            <div key={label} className="min-w-0 bg-[#171a20] p-3">
              <dt className="flex items-center gap-1.5 text-[10px] text-[#747e8d]">
                <Icon size={12} aria-hidden="true" /> {label}
              </dt>
              <dd className="mt-2 break-words text-xs font-medium text-[#e9edf3]">{value}</dd>
            </div>
          ))}
        </dl>

        <section className="rounded-lg border border-[#28533f] bg-[#14231d] p-3" aria-label="许可与数据说明">
          <div className="flex items-center gap-2 text-xs font-medium text-[#83d9aa]">
            <ShieldCheck size={15} aria-hidden="true" />
            {resolvedEstimate.license}
          </div>
          <p className="mt-2 text-[11px] leading-5 text-[#8fb4a1]">{resolvedEstimate.dataNotice}</p>
        </section>
      </div>
    </DialogFrame>
  )
}

export type ModelRoutingStrategy = 'fast' | 'balanced' | 'quality' | 'commercial'

const strategies: Array<{
  id: ModelRoutingStrategy
  label: string
  detail: string
  icon: typeof Zap
}> = [
  { id: 'fast', label: '快速草稿', detail: '先验证构图和动作', icon: Zap },
  { id: 'balanced', label: '平衡', detail: '质量、成本与速度兼顾', icon: Radio },
  { id: 'quality', label: '最佳质量', detail: '优先细节与一致性', icon: Sparkles },
  { id: 'commercial', label: '商业安全优先', detail: '优先许可与品牌交付', icon: ShieldCheck },
]

function routingScore(model: ModelVersion, strategy: ModelRoutingStrategy): number {
  const searchable = `${model.quality} ${model.speed} ${model.policy} ${model.resolution}`.toLowerCase()
  let score = model.status === 'available' ? 10 : -100
  if (strategy === 'fast') {
    if (/draft|fast|快速/.test(searchable)) score += 20
    score -= parseCredits(model.cost) / 10
  }
  if (strategy === 'balanced' && /balanced|平衡/.test(searchable)) score += 22
  if (strategy === 'quality') {
    if (/ultra|best|4k|最高/.test(searchable)) score += 24
    score += parseCredits(model.cost) / 10
  }
  if (strategy === 'commercial') {
    if (/enterprise|commercial|商业/.test(searchable)) score += 22
    if (/safe|安全/.test(searchable)) score += 8
  }
  return score
}

export interface ModelRouterDrawerProps {
  open: boolean
  onClose: () => void
  models: readonly ModelVersion[]
  selectedModelId?: string
  initialStrategy?: ModelRoutingStrategy
  onSelect: (model: ModelVersion, strategy: ModelRoutingStrategy) => void
}

export function ModelRouterDrawer({
  open,
  onClose,
  models,
  selectedModelId,
  initialStrategy = 'balanced',
  onSelect,
}: ModelRouterDrawerProps) {
  const [strategy, setStrategy] = useState<ModelRoutingStrategy>(initialStrategy)
  const [candidateId, setCandidateId] = useState(selectedModelId ?? '')

  useEffect(() => {
    if (!open) return
    setStrategy(initialStrategy)
    setCandidateId(selectedModelId ?? '')
  }, [initialStrategy, open, selectedModelId])

  const recommended = useMemo(
    () => [...models]
      .sort((left, right) => routingScore(right, strategy) - routingScore(left, strategy))
      .slice(0, 3),
    [models, strategy],
  )
  const candidate = recommended.find((model) => model.id === candidateId)
    ?? models.find((model) => model.id === candidateId)

  return (
    <DialogFrame
      open={open}
      onClose={onClose}
      variant="drawer"
      widthClass="max-w-[520px]"
      eyebrow="Model router"
      title="选择生成路线"
      description="策略只决定推荐排序；模型能力、成本与预计耗时会在选择前完整展示。"
      footer={(
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0 text-[11px] text-[#7f8897]">
            {candidate ? `${candidate.name} · ${candidate.cost}` : '请选择一个可用模型'}
          </div>
          <button
            type="button"
            className={primaryButton}
            disabled={!candidate || candidate.status !== 'available'}
            onClick={() => {
              if (!candidate || candidate.status !== 'available') return
              onSelect(candidate, strategy)
              onClose()
            }}
          >
            使用此路线 <ArrowRight size={14} aria-hidden="true" />
          </button>
        </div>
      )}
    >
      <div className="space-y-6 p-4 sm:p-5">
        <fieldset>
          <legend className="mb-2 text-[10px] font-medium uppercase tracking-[0.16em] text-[#778190]">
            路由策略
          </legend>
          <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="模型路由策略">
            {strategies.map(({ id, label, detail, icon: Icon }, index) => {
              const active = strategy === id
              return (
                <button
                  key={id}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  onClick={() => setStrategy(id)}
                  data-autofocus={index === 0 ? '' : undefined}
                  className={`focus-ring min-h-[78px] rounded-lg border p-3 text-left transition ${active
                    ? 'border-[#4ee1ff] bg-[#17262b]'
                    : 'border-[#303540] bg-[#1a1d23] hover:border-[#454c59]'}`}
                >
                  <div className={`flex items-center gap-2 text-xs font-medium ${active ? 'text-[#7cecff]' : 'text-[#e1e5eb]'}`}>
                    <Icon size={14} aria-hidden="true" /> {label}
                  </div>
                  <div className="mt-2 text-[10px] leading-4 text-[#7f8997]">{detail}</div>
                </button>
              )
            })}
          </div>
        </fieldset>

        <section aria-labelledby="recommended-models-heading">
          <div className="mb-2 flex items-center justify-between">
            <h3 id="recommended-models-heading" className="text-[10px] font-medium uppercase tracking-[0.16em] text-[#778190]">
              推荐模型 · {recommended.length}
            </h3>
            <span className="text-[10px] text-[#687180]">Estimate</span>
          </div>
          {recommended.length ? (
            <div className="space-y-2">
              {recommended.map((model, index) => {
                const active = candidateId === model.id
                const unavailable = model.status !== 'available'
                return (
                  <button
                    key={model.id}
                    type="button"
                    onClick={() => !unavailable && setCandidateId(model.id)}
                    aria-pressed={active}
                    disabled={unavailable}
                    className={`focus-ring w-full rounded-lg border p-4 text-left transition disabled:cursor-not-allowed disabled:opacity-55 ${active
                      ? 'border-[#4ee1ff] bg-[#162329]'
                      : 'border-[#303540] bg-[#181b21] hover:border-[#48505e]'}`}
                  >
                    <div className="flex items-start gap-3">
                      <span className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-[10px] ${active
                        ? 'border-[#4ee1ff] bg-[#4ee1ff] text-[#071014]'
                        : 'border-[#4b5260] text-[#7c8593]'}`}>
                        {active ? <Check size={12} aria-hidden="true" /> : index + 1}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div>
                            <span className="text-xs font-semibold text-white">{model.name}</span>
                            <span className="ml-2 text-[10px] text-[#707a89]">{model.provider}</span>
                          </div>
                          <span className={`rounded px-1.5 py-0.5 text-[10px] ${unavailable
                            ? 'bg-[#382a1e] text-[#efbd7a]'
                            : 'bg-[#173225] text-[#74d69e]'}`}>
                            {unavailable ? '维护中' : model.quality}
                          </span>
                        </div>
                        <p className="mt-2 text-[11px] leading-5 text-[#a3acb9]">{model.reason}</p>
                        <div className="mt-3 grid grid-cols-2 gap-1 text-[10px] text-[#8992a0] sm:grid-cols-4">
                          <span>{model.cost}</span>
                          <span>{model.speed}</span>
                          <span>{model.resolution}</span>
                          <span>{model.duration}</span>
                        </div>
                        <div className="mt-2 flex flex-wrap gap-1">
                          {[...model.media.map(mediaLabel), ...model.capabilities, model.refs].map((capability) => (
                            <span key={capability} className="rounded bg-[#23272f] px-1.5 py-1 text-[9px] text-[#9099a7]">
                              {capability}
                            </span>
                          ))}
                        </div>
                        <div className="mt-3 flex items-center gap-1.5 border-t border-[#292e37] pt-2 text-[10px] text-[#82cfa4]">
                          <ShieldCheck size={12} aria-hidden="true" /> {model.policy}
                        </div>
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          ) : (
            <div className="rounded-lg border border-dashed border-[#3a404c] px-4 py-8 text-center text-xs text-[#818a98]">
              当前没有兼容模型。
            </div>
          )}
        </section>
      </div>
    </DialogFrame>
  )
}

type ResultTab = 'preview' | 'recipe' | 'lineage'
type ResultActionName = 'compare' | 'branch' | 'remix' | 'reference' | 'timeline' | 'publish'
type ResultAction = (job: RepositoryGenerationJob) => void | Promise<void>

export interface ResultDetailModalProps {
  open: boolean
  onClose: () => void
  job: RepositoryGenerationJob | null
  lineage?: readonly ProjectLineageEntry[]
  onCompare: ResultAction
  onBranch: ResultAction
  onRemix: ResultAction
  onUseAsReference: ResultAction
  onAddToTimeline: ResultAction
  onPublish: ResultAction
}

export function ResultDetailModal({
  open,
  onClose,
  job,
  lineage = [],
  onCompare,
  onBranch,
  onRemix,
  onUseAsReference,
  onAddToTimeline,
  onPublish,
}: ResultDetailModalProps) {
  const [tab, setTab] = useState<ResultTab>('preview')
  const [busy, setBusy] = useState<ResultActionName | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setTab('preview')
    setBusy(null)
    setMessage(null)
    setError(null)
  }, [job?.id, open])

  const run = async (name: ResultActionName, action: ResultAction, success: string) => {
    if (!job || busy) return
    setBusy(name)
    setMessage(null)
    setError(null)
    try {
      await action(job)
      setMessage(success)
    } catch (nextError) {
      setError(toMessage(nextError))
    } finally {
      setBusy(null)
    }
  }

  const output = job?.output
  const recipe = output?.recipe
  const available = job?.status === 'succeeded' && Boolean(output)
  const actionItems: Array<{
    id: ResultActionName
    label: string
    icon: typeof GitBranch
    action: ResultAction
    success: string
    primary?: boolean
  }> = [
    { id: 'compare', label: 'Compare', icon: GitCompareArrows, action: onCompare, success: '已打开版本对比。' },
    { id: 'branch', label: 'Branch', icon: GitBranch, action: onBranch, success: '已从此结果创建分支。' },
    { id: 'remix', label: 'Remix', icon: RotateCcw, action: onRemix, success: '已创建可编辑 Remix。' },
    { id: 'reference', label: 'Use as reference', icon: Link2, action: onUseAsReference, success: '已加入引用素材。' },
    { id: 'timeline', label: 'Add to timeline', icon: Plus, action: onAddToTimeline, success: '已加入时间线。', primary: true },
    { id: 'publish', label: 'Publish', icon: Upload, action: onPublish, success: '已提交发布。' },
  ]

  return (
    <DialogFrame
      open={open}
      onClose={onClose}
      widthClass="max-w-4xl"
      eyebrow="Generated result"
      title={job?.shot ?? '结果详情'}
      description={job ? `${job.model} · ${mediaLabel(job.mediaType)} · ${job.credits} credits` : '选择一个生成结果查看详情。'}
      footer={(
        <div className="space-y-2">
          <div aria-live="polite" className="min-h-4 text-[11px] text-[#7ed5a8]">
            {message}
          </div>
          <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:justify-end">
            {actionItems.map(({ id, label, icon: Icon, action, success, primary }) => (
              <button
                key={id}
                type="button"
                disabled={!available || Boolean(busy)}
                onClick={() => void run(id, action, success)}
                className={primary ? primaryButton : secondaryButton}
              >
                {busy === id ? <LoaderCircle size={14} className="animate-spin" aria-hidden="true" /> : <Icon size={14} aria-hidden="true" />}
                {label}
              </button>
            ))}
          </div>
        </div>
      )}
    >
      <div className="flex min-h-[460px] flex-col">
        <div className="flex shrink-0 gap-1 overflow-x-auto border-b border-[#292d36] px-4 pt-2 sm:px-5" role="tablist" aria-label="结果详情视图">
          {([
            ['preview', 'Preview', ImageIcon],
            ['recipe', 'Recipe', ListRestart],
            ['lineage', 'Lineage', GitBranch],
          ] as const).map(([id, label, Icon]) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={tab === id}
              aria-controls={`result-panel-${id}`}
              onClick={() => setTab(id)}
              data-autofocus={id === 'preview' ? '' : undefined}
              className={`focus-ring flex min-h-10 shrink-0 items-center gap-2 border-b-2 px-3 text-xs ${tab === id
                ? 'border-[#4ee1ff] text-[#72e9ff]'
                : 'border-transparent text-[#87909e] hover:text-white'}`}
            >
              <Icon size={14} aria-hidden="true" /> {label}
            </button>
          ))}
        </div>

        {error ? (
          <div className="px-4 pt-3 sm:px-5">
            <InlineError message={error} />
          </div>
        ) : null}

        {tab === 'preview' ? (
          <section id="result-panel-preview" role="tabpanel" className="grid flex-1 gap-0 md:grid-cols-[minmax(0,1.45fr)_minmax(260px,.55fr)]">
            <div className="flex min-h-[280px] items-center justify-center bg-[#090a0d] p-4 sm:p-6">
              {output?.previewUrl ? (
                <img
                  src={output.previewUrl}
                  alt={`${job?.shot ?? '生成结果'}预览`}
                  className="max-h-[480px] w-full rounded-lg object-contain"
                />
              ) : (
                <div className="flex flex-col items-center gap-3 text-[#717a89]">
                  <ImageIcon size={30} aria-hidden="true" />
                  <span className="text-xs">暂无可预览输出</span>
                </div>
              )}
            </div>
            <dl className="grid content-start grid-cols-2 gap-px bg-[#2b3039] md:grid-cols-1">
              {[
                ['状态', job?.status ?? '—'],
                ['媒体', mediaLabel(job?.mediaType)],
                ['尺寸', output?.width && output?.height ? `${output.width} × ${output.height}` : '—'],
                ['时长', output?.durationMs ? `${(output.durationMs / 1000).toFixed(1)}s` : '—'],
                ['Seed', recipe?.seed?.toString() ?? '—'],
                ['成本', recipe?.cost ?? `${job?.credits ?? 0} cr`],
                ['耗时', recipe?.duration ?? '—'],
                ['AI 标识', recipe?.aiDisclosure ? '已启用' : '—'],
              ].map(([label, value]) => (
                <div key={label} className="min-w-0 bg-[#171a20] px-4 py-3">
                  <dt className="text-[10px] text-[#737d8b]">{label}</dt>
                  <dd className="mt-1 truncate text-xs text-[#e3e7ed]">{value}</dd>
                </div>
              ))}
            </dl>
          </section>
        ) : null}

        {tab === 'recipe' ? (
          <section id="result-panel-recipe" role="tabpanel" className="space-y-5 p-4 sm:p-5">
            {recipe ? (
              <>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  {[
                    ['模型版本', recipe.modelVersion],
                    ['Seed', String(recipe.seed)],
                    ['积分 / 耗时', `${recipe.credits} cr · ${recipe.duration}`],
                    ['许可', recipe.license],
                  ].map(([label, value]) => (
                    <div key={label} className="rounded-lg border border-[#2d323c] bg-[#14171c] p-3">
                      <div className="text-[10px] text-[#737d8b]">{label}</div>
                      <div className="mt-1 break-words text-xs text-[#e6eaf0]">{value}</div>
                    </div>
                  ))}
                </div>
                <div>
                  <h3 className="text-[10px] font-medium uppercase tracking-[0.16em] text-[#778190]">Prompt</h3>
                  <p className="mt-2 whitespace-pre-wrap rounded-lg border border-[#2d323c] bg-[#101217] p-4 text-xs leading-6 text-[#bac1cb]">
                    {recipe.prompt}
                  </p>
                </div>
                <div className="grid gap-5 sm:grid-cols-2">
                  <div>
                    <h3 className="text-[10px] font-medium uppercase tracking-[0.16em] text-[#778190]">引用实体</h3>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {recipe.entityIds.length ? recipe.entityIds.map((entityId) => (
                        <span key={entityId} className="rounded bg-[#20252d] px-2 py-1 text-[10px] text-[#a5aeba]">@{entityId}</span>
                      )) : <span className="text-xs text-[#697281]">无</span>}
                    </div>
                  </div>
                  <div>
                    <h3 className="text-[10px] font-medium uppercase tracking-[0.16em] text-[#778190]">参数</h3>
                    <dl className="mt-2 space-y-1.5">
                      {Object.entries(recipe.parameters).map(([key, value]) => (
                        <div key={key} className="flex justify-between gap-4 text-[11px]">
                          <dt className="text-[#7e8795]">{key}</dt>
                          <dd className="text-right text-[#c7cdd6]">{String(value)}</dd>
                        </div>
                      ))}
                    </dl>
                  </div>
                </div>
                <div className="flex items-center gap-2 rounded-lg border border-[#28533f] bg-[#14231d] px-3 py-2 text-[11px] text-[#83d9aa]">
                  <ShieldCheck size={14} aria-hidden="true" />
                  {recipe.aiDisclosure ? 'AI 内容标识已写入 Recipe' : '尚未写入 AI 内容标识'}
                </div>
              </>
            ) : (
              <div className="py-16 text-center text-xs text-[#798391]">结果完成后会自动生成可复现 Recipe。</div>
            )}
          </section>
        ) : null}

        {tab === 'lineage' ? (
          <section id="result-panel-lineage" role="tabpanel" className="p-4 sm:p-5">
            <div className="border-l border-[#3a414d] pl-5">
              {recipe?.parentResultId || recipe?.parent ? (
                <div className="relative mb-5 rounded-lg border border-[#303540] bg-[#171a20] p-4">
                  <span className="absolute -left-[26px] top-5 h-2.5 w-2.5 rounded-full border-2 border-[#15171c] bg-[#7c5cff]" />
                  <div className="text-[10px] uppercase tracking-[0.12em] text-[#8d7cff]">Parent result</div>
                  <div className="mt-1 text-xs text-[#dfe3e9]">{recipe.parentResultId ?? recipe.parent}</div>
                </div>
              ) : null}
              {lineage.map((entry) => (
                <div key={entry.id} className="relative mb-5 rounded-lg border border-[#303540] bg-[#171a20] p-4">
                  <span className="absolute -left-[26px] top-5 h-2.5 w-2.5 rounded-full border-2 border-[#15171c] bg-[#4ee1ff]" />
                  <div className="text-[10px] uppercase tracking-[0.12em] text-[#6fdff5]">{entry.relationship}</div>
                  <div className="mt-1 text-xs text-[#dfe3e9]">项目 {entry.sourceProjectId} · 分支 {entry.sourceBranchId}</div>
                  <div className="mt-2 text-[10px] text-[#747e8d]">
                    {entry.sourceOutputId ? `结果 ${entry.sourceOutputId} · ` : ''}{new Date(entry.createdAt).toLocaleString('zh-CN')}
                  </div>
                </div>
              ))}
              <div className="relative rounded-lg border border-[#285565] bg-[#142229] p-4">
                <span className="absolute -left-[26px] top-5 h-2.5 w-2.5 rounded-full border-2 border-[#15171c] bg-[#4ee1ff]" />
                <div className="text-[10px] uppercase tracking-[0.12em] text-[#6fe5fa]">Current result</div>
                <div className="mt-1 text-xs font-medium text-white">{output?.id ?? job?.id ?? '未生成'}</div>
                <div className="mt-2 text-[10px] text-[#7f8997]">Branch {job?.branchId ?? 'main'} · Attempt {job?.attempt ?? 1}</div>
              </div>
            </div>
          </section>
        ) : null}
      </div>
    </DialogFrame>
  )
}

export interface ExportSpec {
  id: string
  label: string
  aspectRatio: string
  resolution: string
}

export interface ExportRequest {
  spec: ExportSpec
  format: 'mp4-h264' | 'mov-prores' | 'webm-vp9'
  includeCaptions: boolean
  includeAudio: boolean
  embedAiMetadata: boolean
}

const defaultExportSpecs: ExportSpec[] = [
  { id: 'landscape', label: '横版交付', aspectRatio: '16:9', resolution: '1920 × 1080' },
  { id: 'vertical', label: '竖版社媒', aspectRatio: '9:16', resolution: '1080 × 1920' },
  { id: 'square', label: '方形动态', aspectRatio: '1:1', resolution: '1080 × 1080' },
  { id: 'cinema', label: '电影宽幅', aspectRatio: '2.39:1', resolution: '3840 × 1608' },
]

export interface ExportModalProps {
  open: boolean
  onClose: () => void
  onQueue: (request: ExportRequest) => void | Promise<void>
  specs?: readonly ExportSpec[]
  estimatedCredits?: number
}

export function ExportModal({
  open,
  onClose,
  onQueue,
  specs = defaultExportSpecs,
  estimatedCredits = 18,
}: ExportModalProps) {
  const [specId, setSpecId] = useState(specs[0]?.id ?? '')
  const [format, setFormat] = useState<ExportRequest['format']>('mp4-h264')
  const [captions, setCaptions] = useState(true)
  const [audio, setAudio] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [queued, setQueued] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setQueued(false)
    setError(null)
    setSpecId((current) => specs.some((spec) => spec.id === current) ? current : (specs[0]?.id ?? ''))
  }, [open, specs])

  const selectedSpec = specs.find((spec) => spec.id === specId)
  const queueExport = async () => {
    if (!selectedSpec || submitting) return
    setSubmitting(true)
    setError(null)
    try {
      await onQueue({
        spec: selectedSpec,
        format,
        includeCaptions: captions,
        includeAudio: audio,
        embedAiMetadata: true,
      })
      setQueued(true)
    } catch (nextError) {
      setError(toMessage(nextError))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <DialogFrame
      open={open}
      onClose={onClose}
      eyebrow="Delivery"
      title={queued ? '导出任务已加入队列' : '导出当前时间线'}
      description={queued
        ? '你可以关闭此窗口，导出会继续在本地模拟队列中运行。'
        : '选择交付规格与封装格式。导出不会更改原始时间线。'}
      widthClass="max-w-2xl"
      footer={queued ? (
        <div className="flex items-center justify-between gap-3">
          <div aria-live="polite" className="flex items-center gap-2 text-xs text-[#80d8a8]">
            <CheckCircle2 size={15} aria-hidden="true" /> Export queued
          </div>
          <button type="button" onClick={onClose} className={primaryButton} data-autofocus>完成</button>
        </div>
      ) : (
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between">
          <span className="text-[11px] text-[#778190]">Estimate · {estimatedCredits} cr</span>
          <div className="flex gap-2">
            <button type="button" onClick={onClose} className={secondaryButton} disabled={submitting}>取消</button>
            <button
              type="button"
              onClick={() => void queueExport()}
              className={primaryButton}
              disabled={!selectedSpec || submitting}
            >
              {submitting ? <LoaderCircle size={15} className="animate-spin" aria-hidden="true" /> : <Download size={15} aria-hidden="true" />}
              {submitting ? '正在排队' : `加入导出队列 · ${estimatedCredits} cr`}
            </button>
          </div>
        </div>
      )}
    >
      {queued ? (
        <div className="p-5 sm:p-6">
          <div className="rounded-lg border border-[#28533f] bg-[#14231d] p-5">
            <div className="flex items-start gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#21513a] text-[#8ae0b0]">
                <Check size={17} aria-hidden="true" />
              </div>
              <div>
                <div className="text-sm font-medium text-white">{selectedSpec?.label}</div>
                <div className="mt-1 text-xs text-[#91bba4]">
                  {selectedSpec?.aspectRatio} · {selectedSpec?.resolution} · {format.toUpperCase()}
                </div>
                <div className="mt-3 text-[11px] leading-5 text-[#81a993]">
                  AI 标识与商业许可元数据将写入交付文件。完成后会显示在 Job Queue。
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-5 p-4 sm:p-5">
          <InlineError message={error} />
          <fieldset>
            <legend className="mb-2 text-[10px] font-medium uppercase tracking-[0.16em] text-[#778190]">交付规格</legend>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4" role="radiogroup" aria-label="导出规格">
              {specs.map((spec, index) => {
                const active = spec.id === specId
                return (
                  <button
                    key={spec.id}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    onClick={() => setSpecId(spec.id)}
                    data-autofocus={index === 0 ? '' : undefined}
                    className={`focus-ring min-w-0 rounded-lg border p-3 text-left transition ${active
                      ? 'border-[#4ee1ff] bg-[#17262b]'
                      : 'border-[#303540] bg-[#191c22] hover:border-[#48505e]'}`}
                  >
                    <div className="mb-3 flex aspect-video items-center justify-center rounded bg-[#0f1116]">
                      <span
                        className={`block border ${active ? 'border-[#4ee1ff] bg-[#4ee1ff]/10' : 'border-[#4a5260] bg-[#242832]'}`}
                        style={{
                          aspectRatio: spec.aspectRatio.replace(':', '/'),
                          height: spec.aspectRatio === '9:16' ? '34px' : '24px',
                          maxWidth: '70%',
                        }}
                      />
                    </div>
                    <div className="truncate text-[11px] font-medium text-[#e5e9ef]">{spec.label}</div>
                    <div className="mt-1 text-[9px] leading-4 text-[#7c8695]">{spec.aspectRatio} · {spec.resolution}</div>
                  </button>
                )
              })}
            </div>
          </fieldset>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="mb-2 block text-[10px] font-medium uppercase tracking-[0.16em] text-[#778190]">文件格式</span>
              <select
                value={format}
                onChange={(event) => setFormat(event.target.value as ExportRequest['format'])}
                className={`${inputClass} h-10`}
              >
                <option value="mp4-h264">MP4 · H.264</option>
                <option value="mov-prores">MOV · ProRes 422</option>
                <option value="webm-vp9">WebM · VP9</option>
              </select>
            </label>
            <div>
              <span className="mb-2 block text-[10px] font-medium uppercase tracking-[0.16em] text-[#778190]">包含内容</span>
              <div className="flex h-10 items-center gap-4 rounded-lg border border-[#303540] bg-[#101217] px-3">
                <label className="flex cursor-pointer items-center gap-2 text-[11px] text-[#b3bbc6]">
                  <input type="checkbox" checked={audio} onChange={(event) => setAudio(event.target.checked)} className="accent-[#4ee1ff]" /> 音频混音
                </label>
                <label className="flex cursor-pointer items-center gap-2 text-[11px] text-[#b3bbc6]">
                  <input type="checkbox" checked={captions} onChange={(event) => setCaptions(event.target.checked)} className="accent-[#4ee1ff]" /> 字幕
                </label>
              </div>
            </div>
          </div>

          <div className="flex items-start gap-2 rounded-lg border border-[#28533f] bg-[#14231d] px-3 py-3 text-[11px] leading-5 text-[#86caa3]">
            <ShieldCheck size={15} className="mt-0.5 shrink-0" aria-hidden="true" />
            <span>AI disclosure 与商业许可元数据始终随文件导出，避免交付链路丢失来源信息。</span>
          </div>
        </div>
      )}
    </DialogFrame>
  )
}

export interface AgentSuggestion {
  id: string
  label: string
  prompt: string
}

const defaultAgentSuggestions: AgentSuggestion[] = [
  { id: 'continuity', label: '修复角色连续性', prompt: '检查全部镜头中的角色与产品一致性，并提出可直接执行的修改。' },
  { id: 'grade', label: '统一雨夜色调', prompt: '统一六个镜头的雨夜冷蓝环境光与暖色实用光。' },
  { id: 'route', label: '降低本轮成本', prompt: '保持交付质量，重新规划成本更低的模型路线。' },
]

export interface AgentDrawerProps {
  open: boolean
  onClose: () => void
  onSubmit: (prompt: string) => void | Promise<void>
  onSuggestedAction?: (suggestion: AgentSuggestion) => void | Promise<void>
  suggestions?: readonly AgentSuggestion[]
  context?: string
  selectionLabel?: string
}

export function AgentDrawer({
  open,
  onClose,
  onSubmit,
  onSuggestedAction,
  suggestions = defaultAgentSuggestions,
  context = '我已读取当前项目、分支和所选对象。可以直接描述修改目标，我会把建议同步到 Agent、Canvas、Nodes 与 Storyboard。',
  selectionLabel = '当前项目',
}: AgentDrawerProps) {
  const [prompt, setPrompt] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setMessage(null)
    setError(null)
  }, [open])

  const sendPrompt = async (value: string) => {
    const trimmed = value.trim()
    if (!trimmed || submitting) return
    setSubmitting(true)
    setMessage(null)
    setError(null)
    try {
      await onSubmit(trimmed)
      setPrompt('')
      setMessage('Agent 已接收请求，并同步到当前项目。')
    } catch (nextError) {
      setError(toMessage(nextError))
    } finally {
      setSubmitting(false)
    }
  }

  const selectSuggestion = async (suggestion: AgentSuggestion) => {
    if (submitting) return
    setSubmitting(true)
    setMessage(null)
    setError(null)
    try {
      if (onSuggestedAction) await onSuggestedAction(suggestion)
      else await onSubmit(suggestion.prompt)
      setMessage(`已执行：${suggestion.label}`)
    } catch (nextError) {
      setError(toMessage(nextError))
    } finally {
      setSubmitting(false)
    }
  }

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    void sendPrompt(prompt)
  }

  return (
    <DialogFrame
      open={open}
      onClose={onClose}
      variant="agent"
      eyebrow="Project-aware Agent"
      title="创意导演"
      description={`上下文：${selectionLabel}`}
      footer={(
        <form onSubmit={submit} className="flex items-end gap-2">
          <label className="min-w-0 flex-1">
            <span className="sr-only">向 Agent 描述修改</span>
            <textarea
              value={prompt}
              onChange={(event) => setPrompt(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && !event.shiftKey) {
                  event.preventDefault()
                  void sendPrompt(prompt)
                }
              }}
              placeholder="描述修改，支持 @实体、#风格、/工具…"
              rows={2}
              className={`${inputClass} min-h-[52px] resize-none py-2.5 leading-5`}
              data-autofocus
            />
          </label>
          <button
            type="submit"
            disabled={!prompt.trim() || submitting}
            className="focus-ring inline-flex h-[52px] w-11 shrink-0 items-center justify-center rounded-lg bg-[#4ee1ff] text-[#071014] transition hover:bg-[#83ebff] disabled:cursor-not-allowed disabled:opacity-45"
            aria-label="发送给 Agent"
          >
            {submitting ? <LoaderCircle size={16} className="animate-spin" aria-hidden="true" /> : <Send size={16} aria-hidden="true" />}
          </button>
        </form>
      )}
    >
      <div className="space-y-4 p-4">
        <div className="flex items-start gap-3 rounded-lg border border-[#2e3540] bg-[#1c2027] p-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#17313a] text-[#4ee1ff]">
            <Bot size={16} aria-hidden="true" />
          </div>
          <p className="text-xs leading-5 text-[#b4bcc7]">{context}</p>
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between">
            <span className="text-[10px] font-medium uppercase tracking-[0.15em] text-[#778190]">建议操作</span>
            <span className="text-[10px] text-[#687180]">基于当前选择</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {suggestions.map((suggestion) => (
              <button
                key={suggestion.id}
                type="button"
                onClick={() => void selectSuggestion(suggestion)}
                disabled={submitting}
                className="focus-ring inline-flex min-h-9 items-center gap-2 rounded-lg border border-[#343945] bg-[#20242b] px-3 text-[11px] text-[#bec5cf] transition hover:border-[#4ee1ff] hover:text-[#71e8ff] disabled:opacity-45"
              >
                <WandSparkles size={13} aria-hidden="true" /> {suggestion.label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 rounded-lg border border-[#2d323c] bg-[#111318] p-3 text-center">
          <div>
            <Layers3 size={14} className="mx-auto text-[#7c5cff]" aria-hidden="true" />
            <div className="mt-1 text-[9px] text-[#7f8997]">共享项目数据</div>
          </div>
          <div>
            <MessageCircle size={14} className="mx-auto text-[#4ee1ff]" aria-hidden="true" />
            <div className="mt-1 text-[9px] text-[#7f8997]">保留修改意图</div>
          </div>
          <div>
            <GitBranch size={14} className="mx-auto text-[#56c596]" aria-hidden="true" />
            <div className="mt-1 text-[9px] text-[#7f8997]">结果可追溯</div>
          </div>
        </div>

        <div aria-live="polite" className="min-h-5 text-[11px] text-[#7ed5a8]">{message}</div>
        <InlineError message={error} />
      </div>
    </DialogFrame>
  )
}
