'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  AlertTriangle,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  CircleStop,
  Clock3,
  ExternalLink,
  Film,
  ListRestart,
  LoaderCircle,
  PanelBottom,
  Plus,
  RotateCcw,
  X,
} from 'lucide-react'
import {
  generationFailureLabel,
  type RepositoryGenerationJob,
  type TimelineClip,
} from '@/lib/project-repository'
import type { JobStatus, TimelineTrack } from '@/lib/types'

export type JobQueueTab = 'queue' | 'timeline'

export interface JobQueueProps {
  jobs: readonly RepositoryGenerationJob[]
  timelineClips?: readonly TimelineClip[]
  tracks?: readonly TimelineTrack[]
  defaultTab?: JobQueueTab
  initiallyCollapsed?: boolean
  className?: string
  onCancel: (jobId: string) => void | Promise<void>
  onRetry: (jobId: string) => void | Promise<void>
  onOpenResult: (job: RepositoryGenerationJob) => void
  onAddToTimeline: (jobId: string) => void | Promise<void>
  onOpenTimeline?: () => void
}

type PendingAction = 'cancel' | 'retry' | 'timeline'

interface StatusPresentation {
  label: string
  dotClassName: string
  badgeClassName: string
  progressClassName: string
  icon: typeof Clock3
}

const STATUS_PRESENTATION: Record<JobStatus, StatusPresentation> = {
  queued: {
    label: '排队中',
    dotClassName: 'bg-[#7d8795]',
    badgeClassName: 'border-[#343a45] bg-[#20242b] text-[#b2bac6]',
    progressClassName: 'bg-[#7d8795]',
    icon: Clock3,
  },
  running: {
    label: '运行中',
    dotClassName: 'bg-[#4ee1ff]',
    badgeClassName: 'border-[#28515a] bg-[#17282d] text-[#7ceaff]',
    progressClassName: 'bg-[#4ee1ff]',
    icon: LoaderCircle,
  },
  succeeded: {
    label: '已完成',
    dotClassName: 'bg-[#56c596]',
    badgeClassName: 'border-[#2d5943] bg-[#19271f] text-[#8ad8ae]',
    progressClassName: 'bg-[#56c596]',
    icon: CheckCircle2,
  },
  failed: {
    label: '失败',
    dotClassName: 'bg-[#f06b7d]',
    badgeClassName: 'border-[#633641] bg-[#2c1d22] text-[#ff9aaa]',
    progressClassName: 'bg-[#f06b7d]',
    icon: AlertTriangle,
  },
  canceled: {
    label: '已取消',
    dotClassName: 'bg-[#697382]',
    badgeClassName: 'border-[#343a45] bg-[#1d2026] text-[var(--muted)]',
    progressClassName: 'bg-[#697382]',
    icon: CircleStop,
  },
}

function cx(...values: Array<string | false | null | undefined>): string {
  return values.filter(Boolean).join(' ')
}

function boundedProgress(progress: number): number {
  return Math.min(100, Math.max(0, Math.round(progress)))
}

function formatTime(milliseconds: number): string {
  const seconds = Math.max(0, Math.round(milliseconds / 1_000))
  const minutes = Math.floor(seconds / 60)
  const remainder = seconds % 60
  return `${String(minutes).padStart(2, '0')}:${String(remainder).padStart(2, '0')}`
}

function actionKey(jobId: string, action: PendingAction): string {
  return `${jobId}:${action}`
}

function StatusBadge({ status }: { status: JobStatus }) {
  const presentation = STATUS_PRESENTATION[status]
  const Icon = presentation.icon

  return (
    <span
      className={cx(
        'inline-flex h-6 shrink-0 items-center gap-1.5 rounded-md border px-2 text-[10px] font-medium',
        presentation.badgeClassName,
      )}
    >
      <Icon
        aria-hidden="true"
        className={cx('h-3 w-3', status === 'running' && 'animate-spin')}
      />
      {presentation.label}
    </span>
  )
}

function ProgressBar({ job }: { job: RepositoryGenerationJob }) {
  const progress = boundedProgress(job.progress)
  const presentation = STATUS_PRESENTATION[job.status]

  return (
    <div className="flex min-w-0 items-center gap-2">
      <div
        aria-label={`${job.shot} progress`}
        aria-valuemax={100}
        aria-valuemin={0}
        aria-valuenow={progress}
        className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-[#2a2f38]"
        role="progressbar"
      >
        <div
          className={cx('h-full rounded-full transition-[width] duration-300', presentation.progressClassName)}
          style={{ width: `${progress}%` }}
        />
      </div>
      <span className="w-9 shrink-0 text-right text-[10px] tabular-nums text-[#9aa3b2]">
        {progress}%
      </span>
    </div>
  )
}

interface JobActionsProps {
  job: RepositoryGenerationJob
  isOnTimeline: boolean
  pending: ReadonlySet<string>
  onCancel: (jobId: string) => void
  onRetry: (jobId: string) => void
  onOpenResult: (job: RepositoryGenerationJob) => void
  onAddToTimeline: (jobId: string) => void
}

function JobActions({
  job,
  isOnTimeline,
  pending,
  onCancel,
  onRetry,
  onOpenResult,
  onAddToTimeline,
}: JobActionsProps) {
  const cancelPending = pending.has(actionKey(job.id, 'cancel'))
  const retryPending = pending.has(actionKey(job.id, 'retry'))
  const timelinePending = pending.has(actionKey(job.id, 'timeline'))

  if (job.status === 'queued' || job.status === 'running') {
    return (
      <button
        aria-label={`取消：${job.shot}`}
        className="focus-ring inline-flex h-8 shrink-0 items-center gap-1.5 rounded-md border border-[#3a404b] px-2.5 text-[10px] text-[#c0c7d1] hover:border-[#59616e] hover:bg-[#252a32] disabled:cursor-wait disabled:opacity-60"
        disabled={cancelPending}
        onClick={() => onCancel(job.id)}
        type="button"
      >
        {cancelPending ? <LoaderCircle aria-hidden="true" className="h-3.5 w-3.5 animate-spin" /> : <X aria-hidden="true" className="h-3.5 w-3.5" />}
        取消
      </button>
    )
  }

  if (job.status === 'failed') {
    return (
      <button
        aria-label={`重试：${job.shot}`}
        className="focus-ring inline-flex h-8 shrink-0 items-center gap-1.5 rounded-md border border-[#315561] bg-[#192a2f] px-2.5 text-[10px] font-medium text-[#69e7ff] hover:border-[#4ee1ff] hover:bg-[#1d3339] disabled:cursor-wait disabled:opacity-60"
        disabled={retryPending}
        onClick={() => onRetry(job.id)}
        type="button"
      >
        {retryPending ? <LoaderCircle aria-hidden="true" className="h-3.5 w-3.5 animate-spin" /> : <RotateCcw aria-hidden="true" className="h-3.5 w-3.5" />}
        重试
      </button>
    )
  }

  if (job.status === 'succeeded') {
    const resultUnavailable = !job.output

    return (
      <div className="flex shrink-0 items-center gap-1.5">
        <button
          aria-label={`查看结果：${job.shot}`}
          className="focus-ring inline-flex h-8 items-center gap-1.5 rounded-md border border-[#3a404b] px-2.5 text-[10px] text-[#d4dae2] hover:border-[#59616e] hover:bg-[#252a32] disabled:cursor-not-allowed disabled:opacity-45"
          disabled={resultUnavailable}
          onClick={() => onOpenResult(job)}
          title={resultUnavailable ? 'Result metadata is unavailable' : undefined}
          type="button"
        >
          <ExternalLink aria-hidden="true" className="h-3.5 w-3.5" />
          查看结果
        </button>
        <button
          aria-label={isOnTimeline ? `${job.shot} is already on the timeline` : `Add ${job.shot} to timeline`}
          className={cx(
            'focus-ring inline-flex h-8 items-center gap-1.5 rounded-md border px-2.5 text-[10px] font-medium disabled:cursor-not-allowed',
            isOnTimeline
              ? 'border-[#2d5943] bg-[#19271f] text-[#8ad8ae] disabled:opacity-100'
              : 'border-[#315561] bg-[#192a2f] text-[#69e7ff] hover:border-[#4ee1ff] hover:bg-[#1d3339] disabled:opacity-60',
          )}
          disabled={isOnTimeline || timelinePending || resultUnavailable}
          onClick={() => onAddToTimeline(job.id)}
          type="button"
        >
          {timelinePending ? (
            <LoaderCircle aria-hidden="true" className="h-3.5 w-3.5 animate-spin" />
          ) : isOnTimeline ? (
            <Check aria-hidden="true" className="h-3.5 w-3.5" />
          ) : (
            <Plus aria-hidden="true" className="h-3.5 w-3.5" />
          )}
          {isOnTimeline ? '已加入时间线' : '加入时间线'}
        </button>
      </div>
    )
  }

  return <span className="text-[10px] text-[var(--muted)]">暂无操作</span>
}

interface JobItemProps extends Omit<JobActionsProps, 'pending'> {
  pending: ReadonlySet<string>
  actionError?: string
}

function JobItem(props: JobItemProps) {
  const { job, actionError } = props
  const failureReason = job.error ?? generationFailureLabel(job.failureCode)

  return (
    <li className="border-b border-[#22262e] last:border-b-0">
      <div className="job-row-desktop min-h-[60px] grid-cols-[minmax(110px,1fr)_minmax(85px,.7fr)_90px_minmax(70px,.7fr)_65px_auto] items-center gap-2 px-3 py-2">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className={cx('h-1.5 w-1.5 shrink-0 rounded-full', STATUS_PRESENTATION[job.status].dotClassName)} />
          <div className="min-w-0">
            <p className="truncate text-[11px] font-medium text-[#edf0f4]" title={job.shot}>{job.shot}</p>
            <p className="mt-0.5 truncate text-[10px] text-[var(--muted)]">Attempt {job.attempt} · Seed {job.seed}</p>
          </div>
        </div>
        <div className="min-w-0">
          <p className="truncate text-[10px] text-[#b7bec9]" title={job.model}>{job.model}</p>
          <p className="mt-0.5 truncate text-[10px] text-[var(--muted)]">{job.mediaType} · {job.providerId}</p>
        </div>
        <StatusBadge status={job.status} />
        <ProgressBar job={job} />
        <div className="text-right text-[10px] text-[#9aa3b2]">
          <p className="truncate"><Clock3 aria-hidden="true" className="mr-1 inline h-3 w-3" />{job.eta}</p>
          <p className="mt-1 tabular-nums text-[var(--muted)]">{job.credits} credits</p>
        </div>
        <div className="flex min-w-0 justify-end">
          <JobActions {...props} />
        </div>
      </div>

      <div className="job-row-mobile space-y-3 px-3 py-3">
        <div className="flex min-w-0 items-start gap-2.5">
          <span className={cx('mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full', STATUS_PRESENTATION[job.status].dotClassName)} />
          <div className="min-w-0 flex-1">
            <p className="break-words text-[11px] font-medium text-[#edf0f4]">{job.shot}</p>
            <p className="mt-1 break-words text-[10px] text-[var(--muted)]">{job.model} · {job.mediaType}</p>
          </div>
          <StatusBadge status={job.status} />
        </div>
        <ProgressBar job={job} />
        <div className="flex flex-wrap items-center justify-between gap-2 text-[10px] text-[var(--muted)]">
          <span><Clock3 aria-hidden="true" className="mr-1 inline h-3 w-3" />{job.eta}</span>
          <span className="tabular-nums">{job.credits} credits</span>
        </div>
        <div className="overflow-x-auto scrollbar pb-0.5">
          <JobActions {...props} />
        </div>
      </div>

      {(failureReason || actionError) && (
        <div
          aria-live="polite"
          className={cx(
            'mx-3 mb-3 flex min-w-0 items-start gap-2 rounded-md border px-3 py-2 text-[10px] md:mx-4 md:mt-[-2px]',
            actionError
              ? 'border-[#5e3941] bg-[#2b1d21] text-[#f3a2af]'
              : 'border-[#543943] bg-[#281d21] text-[#eaa0ad]',
          )}
          role={actionError ? 'alert' : undefined}
        >
          <AlertTriangle aria-hidden="true" className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span className="min-w-0 break-words">{actionError ?? failureReason}</span>
        </div>
      )}
    </li>
  )
}

interface TimelineListProps {
  clips: readonly TimelineClip[]
  tracks: readonly TimelineTrack[]
  onOpenTimeline?: () => void
}

function TimelineList({ clips, tracks, onOpenTimeline }: TimelineListProps) {
  const trackById = useMemo(() => new Map(tracks.map((track) => [track.id, track])), [tracks])

  if (clips.length === 0) {
    return (
      <div className="flex min-h-32 flex-col items-center justify-center px-4 py-6 text-center">
        <Film aria-hidden="true" className="h-5 w-5 text-[var(--muted)]" />
        <p className="mt-2 text-[11px] font-medium text-[#c7cdd6]">时间线为空</p>
          <p className="mt-1 max-w-sm text-[10px] leading-relaxed text-[var(--muted)]">
          将已完成的结果加入时间线，开始组装成片。
        </p>
      </div>
    )
  }

  return (
    <div className="min-w-0">
      <ul aria-label="Timeline clips" className="max-h-52 overflow-y-auto scrollbar">
        {clips.map((clip) => {
          const track = trackById.get(clip.trackId)
          return (
            <li
              className="grid min-w-0 grid-cols-[4px_minmax(0,1fr)_auto] items-center gap-3 border-b border-[#22262e] px-4 py-2.5 last:border-b-0"
              key={clip.id}
            >
              <span
                aria-hidden="true"
                className="h-8 rounded-full"
                style={{ backgroundColor: track?.color ?? '#4ee1ff' }}
              />
              <div className="min-w-0">
                <p className="truncate text-[11px] font-medium text-[#e8ebf0]">{clip.name}</p>
                <p className="mt-0.5 truncate text-[10px] text-[var(--muted)]">
                  {track?.name ?? clip.trackId} · {formatTime(clip.startMs)}–{formatTime(clip.startMs + clip.durationMs)}
                </p>
              </div>
              <span className="text-[10px] tabular-nums text-[#9aa3b2]">{(clip.durationMs / 1_000).toFixed(1)}s</span>
            </li>
          )
        })}
      </ul>
      {onOpenTimeline && (
        <div className="flex justify-end border-t border-[#252a32] px-3 py-2">
          <button
            className="focus-ring inline-flex h-8 items-center gap-1.5 rounded-md border border-[#3a404b] px-2.5 text-[10px] text-[#d4dae2] hover:border-[#59616e] hover:bg-[#252a32]"
            onClick={onOpenTimeline}
            type="button"
          >
            <Film aria-hidden="true" className="h-3.5 w-3.5" />
            打开时间线
          </button>
        </div>
      )}
    </div>
  )
}

export function JobQueue({
  jobs,
  timelineClips = [],
  tracks = [],
  defaultTab = 'queue',
  initiallyCollapsed = false,
  className,
  onCancel,
  onRetry,
  onOpenResult,
  onAddToTimeline,
  onOpenTimeline,
}: JobQueueProps) {
  const [activeTab, setActiveTab] = useState<JobQueueTab>(defaultTab)
  const [collapsed, setCollapsed] = useState(initiallyCollapsed)
  useEffect(() => { if (window.matchMedia('(max-width: 767px)').matches) setCollapsed(true) }, [])
  const [pending, setPending] = useState<Set<string>>(() => new Set())
  const [actionErrors, setActionErrors] = useState<Record<string, string>>({})

  const activeCount = jobs.filter((job) => job.status === 'queued' || job.status === 'running').length
  const timelineJobIds = useMemo(
    () => new Set(timelineClips.map((clip) => clip.sourceJobId)),
    [timelineClips],
  )

  const runAction = async (
    jobId: string,
    action: PendingAction,
    callback: (id: string) => void | Promise<void>,
  ) => {
    const key = actionKey(jobId, action)
    setPending((current) => new Set(current).add(key))
    setActionErrors((current) => {
      const next = { ...current }
      delete next[jobId]
      return next
    })

    try {
      await callback(jobId)
    } catch (error) {
      setActionErrors((current) => ({
        ...current,
        [jobId]: error instanceof Error ? error.message : 'The action could not be completed.',
      }))
    } finally {
      setPending((current) => {
        const next = new Set(current)
        next.delete(key)
        return next
      })
    }
  }

  const selectTab = (tab: JobQueueTab) => {
    setActiveTab(tab)
    setCollapsed(false)
  }

  return (
    <section
      aria-label="生成任务与时间线"
      className={cx(
        'job-queue w-full min-w-0 shrink-0 overflow-hidden border-t border-[#252832] bg-[#111318]',
        className,
      )}
    >
      <div className="flex h-10 min-w-0 items-center border-b border-[#252832] px-2 sm:px-4">
        <div aria-label="Bottom panel" className="flex min-w-0 items-center gap-1" role="tablist">
          <button
            aria-controls={!collapsed && activeTab === 'queue' ? 'flowos-job-queue-panel' : undefined}
            aria-selected={activeTab === 'queue'}
            className={cx(
              'focus-ring inline-flex h-8 shrink-0 items-center gap-1.5 rounded-md px-2.5 text-[11px] font-medium',
              activeTab === 'queue' ? 'bg-[#20252d] text-[#f5f7fa]' : 'text-[var(--muted)] hover:text-[#d8dde5]',
            )}
            onClick={() => selectTab('queue')}
            role="tab"
            type="button"
          >
            <ListRestart aria-hidden="true" className="h-3.5 w-3.5" />
            生成队列
            <span className={cx(
              'inline-flex min-w-5 items-center justify-center rounded-full px-1.5 py-0.5 text-[9px] tabular-nums',
              activeCount > 0 ? 'bg-[#244049] text-[#65e7ff]' : 'bg-[#2b3038] text-[var(--muted)]',
            )}>
              {activeCount}
            </span>
          </button>
          <button
            aria-controls={!collapsed && activeTab === 'timeline' ? 'flowos-timeline-summary-panel' : undefined}
            aria-selected={activeTab === 'timeline'}
            className={cx(
              'focus-ring inline-flex h-8 shrink-0 items-center gap-1.5 rounded-md px-2.5 text-[11px] font-medium',
              activeTab === 'timeline' ? 'bg-[#20252d] text-[#f5f7fa]' : 'text-[var(--muted)] hover:text-[#d8dde5]',
            )}
            onClick={() => selectTab('timeline')}
            role="tab"
            type="button"
          >
            <Film aria-hidden="true" className="h-3.5 w-3.5" />
            时间线
            <span className="text-[9px] tabular-nums text-[var(--muted)]">{timelineClips.length}</span>
          </button>
        </div>
        <div className="ml-auto flex shrink-0 items-center gap-1">
          {!collapsed && activeTab === 'queue' && jobs.length > 0 && (
            <span className="hidden text-[10px] text-[var(--muted)] sm:block">
              共 {jobs.length} 项
            </span>
          )}
          <button
            aria-expanded={!collapsed}
            aria-label={collapsed ? '展开任务面板' : '收起任务面板'}
            className="focus-ring inline-flex h-8 w-8 items-center justify-center rounded-md text-[var(--muted)] hover:bg-[#20252d] hover:text-[#e3e7ed]"
            onClick={() => setCollapsed((value) => !value)}
            title={collapsed ? '展开面板' : '收起面板'}
            type="button"
          >
            {collapsed ? <ChevronUp aria-hidden="true" className="h-4 w-4" /> : <ChevronDown aria-hidden="true" className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {!collapsed && activeTab === 'queue' && (
        <div id="flowos-job-queue-panel" role="tabpanel">
          {jobs.length === 0 ? (
            <div className="flex min-h-32 flex-col items-center justify-center px-4 py-6 text-center">
              <PanelBottom aria-hidden="true" className="h-5 w-5 text-[var(--muted)]" />
              <p className="mt-2 text-[11px] font-medium text-[#c7cdd6]">暂无生成任务</p>
              <p className="mt-1 max-w-sm text-[10px] leading-relaxed text-[var(--muted)]">
                
              </p>
            </div>
          ) : (
            <ul aria-label="Generation jobs" className="max-h-56 min-w-0 overflow-y-auto scrollbar">
              {jobs.map((job) => (
                <JobItem
                  actionError={actionErrors[job.id]}
                  isOnTimeline={timelineJobIds.has(job.id)}
                  job={job}
                  key={job.id}
                  onAddToTimeline={(jobId) => void runAction(jobId, 'timeline', onAddToTimeline)}
                  onCancel={(jobId) => void runAction(jobId, 'cancel', onCancel)}
                  onOpenResult={onOpenResult}
                  onRetry={(jobId) => void runAction(jobId, 'retry', onRetry)}
                  pending={pending}
                />
              ))}
            </ul>
          )}
        </div>
      )}

      {!collapsed && activeTab === 'timeline' && (
        <div id="flowos-timeline-summary-panel" role="tabpanel">
          <TimelineList clips={timelineClips} onOpenTimeline={onOpenTimeline} tracks={tracks} />
        </div>
      )}
    </section>
  )
}
