'use client'

import { useEffect, useMemo, useRef, useState, type MouseEvent } from 'react'
import {
  AlignStartVertical,
  AtSign,
  Captions,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Download,
  Eye,
  GitCompareArrows,
  MessageCircle,
  Music2,
  Pause,
  Play,
  Scissors,
  Send,
  Video,
  Volume2,
  XCircle,
} from 'lucide-react'
import type { RepositoryProject, TimelineClip } from '@/lib/project-repository'
import type { Shot, TimelineTrack } from '@/lib/types'

const TRACK_LABEL_WIDTH = 132
const MOVE_STEP_MS = 500
const TRIM_STEP_MS = 250
const MIN_CLIP_MS = 250

type TrackType = TimelineTrack['type']

const REQUIRED_TRACKS: ReadonlyArray<Pick<TimelineTrack, 'type' | 'name' | 'color'>> = [
  { type: 'video', name: 'Video · 主画面', color: '#4EE1FF' },
  { type: 'dialogue', name: 'Dialogue · 对白', color: '#7C5CFF' },
  { type: 'music', name: 'Music · 音乐', color: '#F29E4C' },
  { type: 'sfx', name: 'SFX · 音效', color: '#56C596' },
  { type: 'captions', name: 'Captions · 字幕', color: '#E8D44D' },
]

const TRACK_ICONS: Record<TrackType, typeof Video> = {
  video: Video,
  dialogue: Volume2,
  music: Music2,
  sfx: Volume2,
  captions: Captions,
}

function joinClasses(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(' ')
}

function parseDurationMs(value: string) {
  const seconds = Number.parseFloat(value)
  return Number.isFinite(seconds) && seconds > 0 ? seconds * 1_000 : 5_000
}

function formatClock(milliseconds: number, includeFrames = false) {
  const safeMilliseconds = Math.max(0, milliseconds)
  const totalSeconds = Math.floor(safeMilliseconds / 1_000)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  const frames = Math.floor(((safeMilliseconds % 1_000) / 1_000) * 24)
  const base = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
  return includeFrames ? `${base}:${String(frames).padStart(2, '0')}` : base
}

function normalizeTracks(project: RepositoryProject): TimelineTrack[] {
  return REQUIRED_TRACKS.map((fallback) => {
    const existing = project.tracks.find((track) => track.type === fallback.type)
    return existing ?? {
      id: `flowos-${fallback.type}`,
      type: fallback.type,
      name: fallback.name,
      color: fallback.color,
      clips: 0,
    }
  })
}

export interface TimelineWorkspaceProps {
  project: RepositoryProject
  onExport: () => void
  onOpenResult?: (jobId: string) => void
  onClipsChange?: (clips: TimelineClip[]) => void
}

export function TimelineWorkspace({
  project,
  onExport,
  onOpenResult,
  onClipsChange,
}: TimelineWorkspaceProps) {
  const [clips, setClips] = useState<TimelineClip[]>(() => [...project.timelineClips])
  const [selectedClipId, setSelectedClipId] = useState<string | null>(project.timelineClips[0]?.id ?? null)
  const [currentTimeMs, setCurrentTimeMs] = useState(0)
  const currentTimeRef = useRef(0)
  const [playing, setPlaying] = useState(false)
  const playbackStartedAt = useRef<{ wallTime: number; timelineTime: number } | null>(null)

  useEffect(() => {
    setClips([...project.timelineClips])
    setSelectedClipId((current) => {
      if (current && project.timelineClips.some((clip) => clip.id === current)) return current
      return project.timelineClips[0]?.id ?? null
    })
  }, [project.id, project.timelineClips])

  const tracks = useMemo(() => normalizeTracks(project), [project])
  const projectDurationMs = useMemo(
    () => project.shots.reduce((duration, shot) => duration + parseDurationMs(shot.duration), 0),
    [project.shots],
  )
  const contentEndMs = clips.reduce(
    (end, clip) => Math.max(end, clip.startMs + Math.max(clip.trimEndMs, clip.durationMs)),
    0,
  )
  const totalMs = Math.max(30_000, projectDurationMs, Math.ceil(contentEndMs / 5_000) * 5_000)
  const selectedClip = clips.find((clip) => clip.id === selectedClipId)

  useEffect(() => {
    if (!playing) {
      playbackStartedAt.current = null
      return
    }

    playbackStartedAt.current = { wallTime: performance.now(), timelineTime: currentTimeRef.current }
    const timer = window.setInterval(() => {
      const started = playbackStartedAt.current
      if (!started) return
      const next = started.timelineTime + performance.now() - started.wallTime
      if (next >= totalMs) {
        currentTimeRef.current = totalMs
        setCurrentTimeMs(totalMs)
        setPlaying(false)
        return
      }
      currentTimeRef.current = next
      setCurrentTimeMs(next)
    }, 100)

    return () => window.clearInterval(timer)
  }, [playing, totalMs])

  const commitClips = (update: (current: TimelineClip[]) => TimelineClip[]) => {
    setClips((current) => {
      const next = update(current)
      onClipsChange?.(next)
      return next
    })
  }

  const updateSelectedClip = (update: (clip: TimelineClip) => TimelineClip) => {
    if (!selectedClipId) return
    commitClips((current) => current.map((clip) => clip.id === selectedClipId ? update(clip) : clip))
  }

  const moveSelectedClip = (deltaMs: number) => {
    updateSelectedClip((clip) => ({ ...clip, startMs: Math.max(0, clip.startMs + deltaMs) }))
  }

  const trimSelectedClip = (edge: 'start' | 'end', deltaMs: number) => {
    updateSelectedClip((clip) => {
      if (edge === 'start') {
        return {
          ...clip,
          trimStartMs: Math.max(0, Math.min(clip.trimEndMs - MIN_CLIP_MS, clip.trimStartMs + deltaMs)),
        }
      }
      return {
        ...clip,
        trimEndMs: Math.min(
          clip.durationMs,
          Math.max(clip.trimStartMs + MIN_CLIP_MS, clip.trimEndMs + deltaMs),
        ),
      }
    })
  }

  const togglePlayback = () => {
    if (currentTimeRef.current >= totalMs) {
      currentTimeRef.current = 0
      setCurrentTimeMs(0)
    }
    setPlaying((current) => !current)
  }

  const rulerTicks = Array.from({ length: Math.floor(totalMs / 5_000) + 1 }, (_, index) => index * 5_000)

  return (
    <section className="flex min-h-0 flex-1 flex-col overflow-hidden bg-[#0d0f13]" aria-label="时间线工作区">
      <div className="flex shrink-0 flex-wrap items-center gap-3 border-b border-[#252832] px-3 py-3 sm:px-5">
        <div className="min-w-0">
          <div className="text-[10px] uppercase tracking-[.18em] text-[#697282]">Timeline · Main cut</div>
          <h2 className="mt-1 truncate text-sm font-medium sm:text-base">{project.name}</h2>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <button
            type="button"
            onClick={togglePlayback}
            className="focus-ring inline-flex h-9 w-9 items-center justify-center rounded-md border border-[#303641] bg-[#191c22] text-[#dce2ea] hover:bg-[#232831]"
            aria-label={playing ? '暂停播放' : '播放时间线'}
            title={playing ? '暂停' : '播放'}
          >
            {playing ? <Pause size={15} /> : <Play size={15} />}
          </button>
          <output className="min-w-[74px] font-mono text-xs tabular-nums text-[#b6bfca]" aria-live="off">
            {formatClock(currentTimeMs, true)}
          </output>
          <button
            type="button"
            onClick={onExport}
            className="focus-ring inline-flex h-9 items-center gap-2 rounded-md bg-[#4ee1ff] px-3 text-xs font-semibold text-[#071014] hover:bg-[#88ecff]"
          >
            <Download size={14} />
            导出
          </button>
        </div>
      </div>

      <div className="shrink-0 border-b border-[#252832] bg-[#111318] px-3 py-2 sm:px-5">
        <div className="flex min-h-9 items-center gap-1 overflow-x-auto scrollbar" role="toolbar" aria-label="所选片段工具">
          <button
            type="button"
            disabled={!selectedClip || selectedClip.startMs <= 0}
            onClick={() => moveSelectedClip(-MOVE_STEP_MS)}
            className="focus-ring inline-flex h-8 shrink-0 items-center gap-1 rounded-md px-2 text-[11px] text-[#aab3bf] hover:bg-[#242932] disabled:cursor-not-allowed disabled:opacity-35"
            title="向前移动 0.5 秒"
          >
            <ChevronLeft size={14} />前移
          </button>
          <button
            type="button"
            disabled={!selectedClip}
            onClick={() => moveSelectedClip(MOVE_STEP_MS)}
            className="focus-ring inline-flex h-8 shrink-0 items-center gap-1 rounded-md px-2 text-[11px] text-[#aab3bf] hover:bg-[#242932] disabled:cursor-not-allowed disabled:opacity-35"
            title="向后移动 0.5 秒"
          >
            后移<ChevronRight size={14} />
          </button>
          <span className="mx-1 h-5 w-px shrink-0 bg-[#303641]" aria-hidden="true" />
          <Scissors size={13} className="ml-1 shrink-0 text-[#727c8b]" aria-hidden="true" />
          <span className="shrink-0 text-[10px] text-[#727c8b]">入点</span>
          <button
            type="button"
            disabled={!selectedClip || selectedClip.trimStartMs <= 0}
            onClick={() => trimSelectedClip('start', -TRIM_STEP_MS)}
            className="focus-ring h-7 w-7 shrink-0 rounded text-[#aab3bf] hover:bg-[#242932] disabled:cursor-not-allowed disabled:opacity-35"
            aria-label="向左扩展入点 0.25 秒"
            title="扩展入点"
          >
            −
          </button>
          <button
            type="button"
            disabled={!selectedClip || selectedClip.trimEndMs - selectedClip.trimStartMs <= MIN_CLIP_MS}
            onClick={() => trimSelectedClip('start', TRIM_STEP_MS)}
            className="focus-ring h-7 w-7 shrink-0 rounded text-[#aab3bf] hover:bg-[#242932] disabled:cursor-not-allowed disabled:opacity-35"
            aria-label="向右裁剪入点 0.25 秒"
            title="裁剪入点"
          >
            +
          </button>
          <span className="ml-1 shrink-0 text-[10px] text-[#727c8b]">出点</span>
          <button
            type="button"
            disabled={!selectedClip || selectedClip.trimEndMs - selectedClip.trimStartMs <= MIN_CLIP_MS}
            onClick={() => trimSelectedClip('end', -TRIM_STEP_MS)}
            className="focus-ring h-7 w-7 shrink-0 rounded text-[#aab3bf] hover:bg-[#242932] disabled:cursor-not-allowed disabled:opacity-35"
            aria-label="向左裁剪出点 0.25 秒"
            title="裁剪出点"
          >
            −
          </button>
          <button
            type="button"
            disabled={!selectedClip || selectedClip.trimEndMs >= selectedClip.durationMs}
            onClick={() => trimSelectedClip('end', TRIM_STEP_MS)}
            className="focus-ring h-7 w-7 shrink-0 rounded text-[#aab3bf] hover:bg-[#242932] disabled:cursor-not-allowed disabled:opacity-35"
            aria-label="向右扩展出点 0.25 秒"
            title="扩展出点"
          >
            +
          </button>
          {selectedClip && (
            <span className="ml-2 shrink-0 text-[10px] tabular-nums text-[#858f9d]">
              {formatClock(selectedClip.trimStartMs, true)} – {formatClock(selectedClip.trimEndMs, true)}
            </span>
          )}
          {selectedClip && onOpenResult && (
            <button
              type="button"
              onClick={() => onOpenResult(selectedClip.sourceJobId)}
              className="focus-ring ml-auto inline-flex h-8 shrink-0 items-center gap-1.5 rounded-md px-2 text-[11px] text-[#4ee1ff] hover:bg-[#1b2a30]"
            >
              <Eye size={13} />结果详情
            </button>
          )}
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-auto scrollbar p-3 sm:p-5">
        <div className="min-w-[860px] overflow-hidden rounded-lg border border-[#2a2e38] bg-[#121419]">
          <div
            className="relative grid"
            style={{ gridTemplateColumns: `${TRACK_LABEL_WIDTH}px minmax(720px, 1fr)` }}
          >
            <div className="flex h-9 items-center border-b border-r border-[#292e37] bg-[#15181e] px-3 text-[10px] text-[#707988]">
              5 tracks
            </div>
            <div className="relative h-9 border-b border-[#292e37] bg-[#15181e]">
              {rulerTicks.map((time, index) => (
                <div
                  key={time}
                  className="absolute inset-y-0 border-l border-[#343a45]"
                  style={{ left: `${(time / totalMs) * 100}%` }}
                >
                  <span className={joinClasses(
                    'absolute top-2 whitespace-nowrap font-mono text-[9px] text-[#737d8b]',
                    index === rulerTicks.length - 1 ? '-translate-x-full pr-1' : 'pl-1',
                  )}>
                    {formatClock(time)}
                  </span>
                </div>
              ))}
            </div>

            {tracks.map((track) => {
              const Icon = TRACK_ICONS[track.type]
              const trackClips = clips.filter((clip) => clip.trackId === track.id)
              return (
                <div key={`${track.id}-row`} className="contents">
                  <div className="flex h-16 items-center gap-2 border-b border-r border-[#252a32] bg-[#14171c] px-3">
                    <Icon size={14} style={{ color: track.color }} aria-hidden="true" />
                    <div className="min-w-0">
                      <div className="truncate text-[10px] text-[#a9b2be]">{track.name}</div>
                      <div className="mt-0.5 text-[9px] text-[#626c7b]">{trackClips.length} clips</div>
                    </div>
                  </div>
                  <div
                    className="relative h-16 border-b border-[#252a32] bg-[#101217]"
                    aria-label={`${track.name}轨道`}
                  >
                    {rulerTicks.map((time) => (
                      <span
                        key={time}
                        className="pointer-events-none absolute inset-y-0 border-l border-[#20242c]"
                        style={{ left: `${(time / totalMs) * 100}%` }}
                        aria-hidden="true"
                      />
                    ))}
                    {trackClips.map((clip) => {
                      const visibleStart = clip.startMs + clip.trimStartMs
                      const visibleDuration = Math.max(MIN_CLIP_MS, clip.trimEndMs - clip.trimStartMs)
                      const isSelected = clip.id === selectedClipId
                      return (
                        <button
                          key={clip.id}
                          type="button"
                          onClick={() => {
                            setSelectedClipId(clip.id)
                            const nextTime = Math.min(totalMs, visibleStart)
                            currentTimeRef.current = nextTime
                            setCurrentTimeMs(nextTime)
                          }}
                          className={joinClasses(
                            'focus-ring group absolute top-3 h-10 overflow-hidden rounded-[5px] border text-left shadow-sm',
                            isSelected && 'z-10 ring-2 ring-[#f5f7fa] ring-offset-1 ring-offset-[#101217]',
                          )}
                          style={{
                            left: `${(visibleStart / totalMs) * 100}%`,
                            width: `${Math.max(0.8, (visibleDuration / totalMs) * 100)}%`,
                            borderColor: `${track.color}aa`,
                            backgroundColor: `${track.color}24`,
                          }}
                          aria-pressed={isSelected}
                          title={`${clip.name} · ${formatClock(visibleDuration, true)}`}
                        >
                          <span
                            className="absolute inset-y-0 left-0 w-1 opacity-90"
                            style={{ backgroundColor: track.color }}
                            aria-hidden="true"
                          />
                          <span className="block truncate px-2 pt-1 text-[10px] font-medium text-[#e8edf3]">{clip.name}</span>
                          <span className="block truncate px-2 text-[9px] tabular-nums text-[#9ea8b5]">
                            {formatClock(visibleDuration, true)}
                          </span>
                          <span
                            className="absolute inset-y-1 right-1 w-px bg-white/30 opacity-0 group-hover:opacity-100"
                            aria-hidden="true"
                          />
                        </button>
                      )
                    })}
                    {trackClips.length === 0 && (
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] text-[#434b58]">Empty</span>
                    )}
                  </div>
                </div>
              )
            })}

            <div
              className="pointer-events-none absolute bottom-0 top-0 z-20"
              style={{ left: TRACK_LABEL_WIDTH, right: 0 }}
              aria-hidden="true"
            >
              <div
                className="absolute bottom-0 top-0 w-px bg-[#f5f7fa]/80"
                style={{ left: `${(currentTimeMs / totalMs) * 100}%` }}
              >
                <span className="absolute -left-1.5 top-0 h-0 w-0 border-x-[6px] border-t-[7px] border-x-transparent border-t-[#f5f7fa]" />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex h-9 shrink-0 items-center gap-3 border-t border-[#252832] bg-[#111318] px-3 text-[10px] text-[#737d8b] sm:px-5">
        <span>{clips.length} clips</span>
        <span>{formatClock(totalMs)} duration</span>
        {selectedClip && <span className="ml-auto max-w-[45%] truncate text-[#aab3bf]">{selectedClip.name}</span>}
      </div>
    </section>
  )
}

export type ReviewDecision = 'pending' | 'needs_changes' | 'approved'

export interface ReviewAnnotation {
  id: string
  x: number
  y: number
  number: number
}

export interface ReviewComment {
  id: string
  author: string
  initials: string
  text: string
  timestampMs: number
  annotationId?: string
  createdAt: string
}

export interface ReviewWorkspaceProps {
  shot: Shot
  onDecisionChange?: (decision: ReviewDecision) => void
  onCommentAdd?: (comment: ReviewComment) => void
  onAnnotationAdd?: (annotation: ReviewAnnotation) => void
}

function previousVersion(version: string) {
  const match = version.match(/^(.*?)(\d+)$/)
  if (!match) return 'Previous'
  const prefix = match[1]
  const value = Math.max(1, Number.parseInt(match[2], 10) - 1)
  return `${prefix}${String(value).padStart(match[2].length, '0')}`
}

function initialComments(shot: Shot): ReviewComment[] {
  return [
    {
      id: `${shot.id}-comment-1`,
      author: 'Maya',
      initials: 'M',
      text: shot.warning ?? '高光层次很好，请保留这个版本的产品轮廓。',
      timestampMs: Math.min(4_000, parseDurationMs(shot.duration)),
      annotationId: `${shot.id}-annotation-1`,
      createdAt: '12 分钟前',
    },
  ]
}

export function ReviewWorkspace({
  shot,
  onDecisionChange,
  onCommentAdd,
  onAnnotationAdd,
}: ReviewWorkspaceProps) {
  const durationMs = parseDurationMs(shot.duration)
  const [decision, setDecision] = useState<ReviewDecision>('pending')
  const [compareVersions, setCompareVersions] = useState(false)
  const [annotationMode, setAnnotationMode] = useState(false)
  const [annotations, setAnnotations] = useState<ReviewAnnotation[]>([
    { id: `${shot.id}-annotation-1`, x: 44, y: 38, number: 1 },
  ])
  const [selectedAnnotationId, setSelectedAnnotationId] = useState<string | undefined>(`${shot.id}-annotation-1`)
  const [comments, setComments] = useState<ReviewComment[]>(() => initialComments(shot))
  const [timestampMs, setTimestampMs] = useState(Math.min(4_000, durationMs))
  const [commentText, setCommentText] = useState('')
  const [feedback, setFeedback] = useState('')

  useEffect(() => {
    setDecision('pending')
    setCompareVersions(false)
    setAnnotationMode(false)
    setAnnotations([{ id: `${shot.id}-annotation-1`, x: 44, y: 38, number: 1 }])
    setSelectedAnnotationId(`${shot.id}-annotation-1`)
    setComments(initialComments(shot))
    setTimestampMs(Math.min(4_000, parseDurationMs(shot.duration)))
    setCommentText('')
    setFeedback('')
  }, [shot])

  const setReviewDecision = (next: ReviewDecision) => {
    setDecision(next)
    setFeedback(next === 'approved' ? '当前版本已批准' : '已标记为需要修改')
    onDecisionChange?.(next)
  }

  const addAnnotation = (event: MouseEvent<HTMLButtonElement>) => {
    if (!annotationMode) return
    const bounds = event.currentTarget.getBoundingClientRect()
    const annotation: ReviewAnnotation = {
      id: `${shot.id}-annotation-${Date.now()}`,
      x: Math.max(2, Math.min(98, ((event.clientX - bounds.left) / bounds.width) * 100)),
      y: Math.max(3, Math.min(97, ((event.clientY - bounds.top) / bounds.height) * 100)),
      number: annotations.length + 1,
    }
    setAnnotations((current) => [...current, annotation])
    setSelectedAnnotationId(annotation.id)
    setAnnotationMode(false)
    setFeedback(`已添加画面标记 ${annotation.number}`)
    onAnnotationAdd?.(annotation)
  }

  const insertMention = (member: string) => {
    setCommentText((current) => `${current}${current && !current.endsWith(' ') ? ' ' : ''}@${member} `)
  }

  const submitComment = () => {
    const text = commentText.trim()
    if (!text) return
    const comment: ReviewComment = {
      id: `${shot.id}-comment-${Date.now()}`,
      author: 'Lin',
      initials: 'L',
      text,
      timestampMs,
      annotationId: selectedAnnotationId,
      createdAt: '刚刚',
    }
    setComments((current) => [...current, comment])
    setCommentText('')
    setFeedback(`批注已添加至 ${formatClock(timestampMs, true)}`)
    onCommentAdd?.(comment)
  }

  const reviewFrame = (label: string, muted = false) => (
    <div className="relative min-w-0 overflow-hidden rounded-lg border border-[#2a2e38] bg-[#0b0c0f]">
      <div className="absolute left-2 top-2 z-10 rounded bg-[#090a0d]/85 px-2 py-1 text-[9px] font-medium text-[#e9eef4]">
        {label}
      </div>
      <button
        type="button"
        onClick={addAnnotation}
        className={joinClasses(
          'focus-ring relative block w-full overflow-hidden text-left',
          annotationMode && 'cursor-crosshair ring-1 ring-inset ring-[#4ee1ff]',
        )}
        aria-label={annotationMode ? `在 ${label} 画面添加批注` : `${label} 审核画面`}
      >
        {shot.image ? (
          <img
            src={shot.image}
            alt={`${shot.title} ${label}`}
            className={joinClasses('aspect-video w-full object-cover', muted && 'grayscale-[30%] brightness-75')}
          />
        ) : (
          <span className="grid aspect-video w-full place-items-center bg-[#1d222a] text-xs text-[#84909e]">
            等待镜头预览
          </span>
        )}
        {!muted && annotations.map((annotation) => (
          <span
            key={annotation.id}
            className={joinClasses(
              'absolute flex h-6 w-6 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 text-[10px] font-semibold shadow-lg',
              selectedAnnotationId === annotation.id
                ? 'border-[#f5f7fa] bg-[#4ee1ff] text-[#071014]'
                : 'border-[#4ee1ff] bg-[#0b0c0f]/90 text-[#dffbff]',
            )}
            style={{ left: `${annotation.x}%`, top: `${annotation.y}%` }}
            aria-hidden="true"
          >
            {annotation.number}
          </span>
        ))}
      </button>
      {!muted && annotations.map((annotation) => (
        <button
          key={`${annotation.id}-hit-target`}
          type="button"
          onClick={() => setSelectedAnnotationId(annotation.id)}
          className="focus-ring absolute z-20 h-8 w-8 -translate-x-1/2 -translate-y-1/2 rounded-full"
          style={{ left: `${annotation.x}%`, top: `${annotation.y}%` }}
          aria-label={`选择画面标记 ${annotation.number}`}
          aria-pressed={selectedAnnotationId === annotation.id}
        />
      ))}
    </div>
  )

  return (
    <section className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden bg-[#0d0f13] p-3 scrollbar sm:p-5" aria-label="审核工作区">
      <div className="mx-auto flex w-full max-w-[1320px] flex-col gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="min-w-0">
            <div className="text-[10px] uppercase tracking-[.18em] text-[#697282]">Review · Shot {String(shot.number).padStart(2, '0')}</div>
            <h2 className="mt-1 truncate text-sm font-medium sm:text-base">{shot.title} · {shot.version}</h2>
          </div>
          <div className="ml-auto flex flex-wrap items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setCompareVersions((current) => !current)}
              aria-pressed={compareVersions}
              className={joinClasses(
                'focus-ring inline-flex h-9 items-center gap-2 rounded-md border px-3 text-xs',
                compareVersions
                  ? 'border-[#4ee1ff] bg-[#17272d] text-[#bff7ff]'
                  : 'border-[#303641] bg-[#191c22] text-[#aab3bf] hover:bg-[#232831]',
              )}
            >
              <GitCompareArrows size={14} />版本对比
            </button>
            <button
              type="button"
              onClick={() => setReviewDecision('needs_changes')}
              aria-pressed={decision === 'needs_changes'}
              className={joinClasses(
                'focus-ring inline-flex h-9 items-center gap-1.5 rounded-md border px-3 text-xs',
                decision === 'needs_changes'
                  ? 'border-[#f06b7d] bg-[#4d292f] text-[#ffd4da]'
                  : 'border-[#4d3036] bg-[#271a1e] text-[#f09aaa] hover:bg-[#362126]',
              )}
            >
              <XCircle size={14} />Needs changes
            </button>
            <button
              type="button"
              onClick={() => setReviewDecision('approved')}
              aria-pressed={decision === 'approved'}
              className={joinClasses(
                'focus-ring inline-flex h-9 items-center gap-1.5 rounded-md border px-3 text-xs',
                decision === 'approved'
                  ? 'border-[#56c596] bg-[#1d4030] text-[#d7ffea]'
                  : 'border-[#285740] bg-[#17271f] text-[#7ed5a8] hover:bg-[#1c3328]',
              )}
            >
              <Check size={14} />Approved
            </button>
          </div>
        </div>

        <div className="grid min-w-0 gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
          <div className="min-w-0 space-y-3">
            <div className={joinClasses('grid min-w-0 gap-2', compareVersions && 'md:grid-cols-2')}>
              {compareVersions && reviewFrame(previousVersion(shot.version), true)}
              {reviewFrame(shot.version)}
            </div>

            <div className="rounded-lg border border-[#2a2e38] bg-[#15171c] px-3 py-3">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setAnnotationMode((current) => !current)}
                  aria-pressed={annotationMode}
                  className={joinClasses(
                    'focus-ring inline-flex h-8 shrink-0 items-center gap-1.5 rounded-md px-2 text-[11px]',
                    annotationMode ? 'bg-[#1b343b] text-[#8deeff]' : 'bg-[#20242b] text-[#aab3bf] hover:bg-[#292e37]',
                  )}
                >
                  <AlignStartVertical size={13} />画面批注
                </button>
                <span className="font-mono text-[10px] tabular-nums text-[#aab3bf]">{formatClock(timestampMs, true)}</span>
                <input
                  type="range"
                  min={0}
                  max={durationMs}
                  step={100}
                  value={timestampMs}
                  onChange={(event) => setTimestampMs(Number(event.target.value))}
                  className="min-w-0 flex-1 accent-[#4ee1ff]"
                  aria-label="审核时间点"
                />
                <span className="font-mono text-[10px] text-[#6f7886]">{formatClock(durationMs, true)}</span>
              </div>
            </div>
          </div>

          <aside className="flex min-h-[360px] min-w-0 flex-col overflow-hidden rounded-lg border border-[#2a2e38] bg-[#15171c]" aria-label="审核评论">
            <div className="flex h-11 shrink-0 items-center gap-2 border-b border-[#2a2e38] px-3">
              <MessageCircle size={14} className="text-[#4ee1ff]" />
              <span className="text-xs font-medium">Comments</span>
              <span className="rounded bg-[#242932] px-1.5 py-0.5 text-[9px] text-[#9aa3b2]">{comments.length}</span>
              <span className="ml-auto text-[10px] text-[#778190]">
                {decision === 'approved' ? 'Approved' : decision === 'needs_changes' ? 'Needs changes' : 'Pending'}
              </span>
            </div>

            <div className="max-h-[420px] min-h-0 flex-1 space-y-2 overflow-y-auto p-3 scrollbar" aria-live="polite">
              {comments.map((comment) => {
                const linkedAnnotation = annotations.find((annotation) => annotation.id === comment.annotationId)
                return (
                  <article key={comment.id} className="rounded-md border border-[#282d36] bg-[#1b1f26] p-3">
                    <div className="flex items-center gap-2">
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#7c5cff] text-[9px] text-white">
                        {comment.initials}
                      </span>
                      <span className="text-[11px] font-medium">{comment.author}</span>
                      <button
                        type="button"
                        onClick={() => setTimestampMs(comment.timestampMs)}
                        className="focus-ring rounded px-1 text-[9px] font-mono text-[#4ee1ff] hover:bg-[#243139]"
                        title="跳到此时间点"
                      >
                        {formatClock(comment.timestampMs, true)}
                      </button>
                      {linkedAnnotation && (
                        <button
                          type="button"
                          onClick={() => setSelectedAnnotationId(linkedAnnotation.id)}
                          className="focus-ring flex h-5 w-5 items-center justify-center rounded-full border border-[#4ee1ff] text-[9px] text-[#bff7ff]"
                          aria-label={`选择画面标记 ${linkedAnnotation.number}`}
                        >
                          {linkedAnnotation.number}
                        </button>
                      )}
                      <span className="ml-auto text-[9px] text-[#626c7b]">{comment.createdAt}</span>
                    </div>
                    <p className="mt-2 break-words text-[11px] leading-relaxed text-[#b2bac5]">{comment.text}</p>
                  </article>
                )
              })}
            </div>

            <form
              className="shrink-0 border-t border-[#2a2e38] p-3"
              onSubmit={(event) => {
                event.preventDefault()
                submitComment()
              }}
            >
              <div className="mb-2 flex items-center gap-1 overflow-x-auto scrollbar">
                <AtSign size={12} className="mr-1 shrink-0 text-[#6f7886]" aria-hidden="true" />
                {['Maya', 'Lin', 'Iris'].map((member) => (
                  <button
                    key={member}
                    type="button"
                    onClick={() => insertMention(member)}
                    className="focus-ring shrink-0 rounded bg-[#222730] px-2 py-1 text-[9px] text-[#9ca6b3] hover:bg-[#2a303a] hover:text-white"
                  >
                    @{member}
                  </button>
                ))}
              </div>
              <div className="flex items-end gap-2">
                <textarea
                  value={commentText}
                  onChange={(event) => setCommentText(event.target.value)}
                  rows={2}
                  placeholder="在当前时间点添加批注…"
                  aria-label="审核批注"
                  className="focus-ring min-w-0 flex-1 resize-none rounded-md border border-[#303641] bg-[#111318] px-3 py-2 text-[11px] leading-relaxed text-[#f5f7fa] outline-none placeholder:text-[#596270]"
                />
                <button
                  type="submit"
                  disabled={!commentText.trim()}
                  className="focus-ring flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-[#4ee1ff] text-[#071014] hover:bg-[#88ecff] disabled:cursor-not-allowed disabled:opacity-35"
                  aria-label="发送批注"
                  title="发送批注"
                >
                  <Send size={14} />
                </button>
              </div>
            </form>
          </aside>
        </div>

        <div className="flex min-h-9 items-center gap-2 rounded-md border border-[#292e37] bg-[#12151a] px-3 text-[10px] text-[#7e8795]" aria-live="polite">
          {decision === 'approved' ? (
            <CheckCircle2 size={13} className="shrink-0 text-[#56c596]" />
          ) : (
            <MessageCircle size={13} className="shrink-0 text-[#7d8795]" />
          )}
          <span className="truncate">{feedback || `${annotations.length} 个画面标记 · ${comments.length} 条批注`}</span>
        </div>
      </div>
    </section>
  )
}
