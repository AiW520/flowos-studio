'use client'

import { PreviewImage } from '@/components/PreviewImage'

import {
  type PointerEvent as ReactPointerEvent,
  type DragEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import {
  Bot,
  Crosshair,
  Eye,
  GitBranch,
  Grid2X2,
  Hand,
  Image as ImageIcon,
  Layers3,
  Map,
  MousePointer2,
  Plus,
  Redo2,
  Sparkles,
  Undo2,
  Workflow,
} from '@/components/icons'
import { Maximize2, Minus, Move, ZoomIn, ZoomOut } from 'lucide-react'
import type {
  RepositoryGenerationJob,
  RepositoryProject,
} from '@/lib/project-repository'
import type { Shot } from '@/lib/types'

export type CanvasWorkspaceMode = 'Agent' | 'Canvas' | 'Nodes' | 'Storyboard' | 'Timeline' | 'Review'

export interface CanvasWorkspaceProps {
  project: RepositoryProject
  selectedShotId?: string
  onSelectShot: (shotId: string) => void
  onOpenResult: (job: RepositoryGenerationJob) => void
  onGenerate: (shotId: string) => void
  onModeChange: (mode: CanvasWorkspaceMode) => void
  onOpenAgent: () => void
  onAddShot?: () => void
  onGenerateMany?: (shotIds: string[]) => void
  /** Optional persistence hook for dropping an entity from the asset shelf on a shot. */
  onBindEntity?: (shotId: string, entityId: string) => void
}

type CanvasPoint = { x: number; y: number }
type CanvasRect = CanvasPoint & { width: number; height: number }
type CanvasInteraction =
  | { type: 'pan'; pointerId: number; startClient: CanvasPoint; startPan: CanvasPoint }
  | { type: 'marquee'; pointerId: number; start: CanvasPoint; current: CanvasPoint }
  | null

type CanvasTool = 'select' | 'pan'

const CANVAS_WIDTH = 1040
const CANVAS_HEIGHT = 740
const CARD_WIDTH = 280
const CARD_HEIGHT = 282
const MIN_ZOOM = 0.35
const MAX_ZOOM = 1.35
const POSITION_STORAGE_PREFIX = 'flowos:canvas-positions:'

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}

function positionKey(projectId: string, shotId: string): string {
  return `${projectId}:${shotId}`
}

function defaultShotPosition(index: number): CanvasPoint {
  const column = index % 3
  const row = Math.floor(index / 3)
  return {
    x: 50 + column * 330,
    y: 70 + row * 330,
  }
}

function normaliseRect(start: CanvasPoint, current: CanvasPoint): CanvasRect {
  return {
    x: Math.min(start.x, current.x),
    y: Math.min(start.y, current.y),
    width: Math.abs(current.x - start.x),
    height: Math.abs(current.y - start.y),
  }
}

function intersects(first: CanvasRect, second: CanvasRect): boolean {
  return first.x < second.x + second.width
    && first.x + first.width > second.x
    && first.y < second.y + second.height
    && first.y + first.height > second.y
}

function formatZoom(zoom: number): string {
  return `${Math.round(zoom * 100)}%`
}

function shotLabel(shot: Shot): string {
  return `镜头 ${String(shot.number).padStart(2, '0')} · ${shot.title}`
}

function outputJobs(project: RepositoryProject, shotId: string): RepositoryGenerationJob[] {
  return project.jobs
    .filter((job) => job.shotId === shotId && job.status === 'succeeded' && job.output)
    .sort((first, second) => second.createdAt.localeCompare(first.createdAt))
}

export function CanvasWorkspace({
  project,
  selectedShotId,
  onSelectShot,
  onOpenResult,
  onGenerate,
  onModeChange,
  onOpenAgent,
  onAddShot,
  onGenerateMany,
  onBindEntity,
}: CanvasWorkspaceProps) {
  const viewportRef = useRef<HTMLDivElement>(null)
  const interactionRef = useRef<CanvasInteraction>(null)
  const shotDragRef = useRef<{
    pointerId: number
    shotId: string
    startClient: CanvasPoint
    startPosition: CanvasPoint
    startPositions: Record<string, CanvasPoint>
  } | null>(null)
  const hasFittedRef = useRef(false)
  const [zoom, setZoom] = useState(0.62)
  const [pan, setPan] = useState<CanvasPoint>({ x: 72, y: 42 })
  const [viewportSize, setViewportSize] = useState({ width: 0, height: 0 })
  const [positions, setPositions] = useState<Record<string, CanvasPoint>>({})
  const [undoStack, setUndoStack] = useState<Record<string, CanvasPoint>[]>([])
  const [redoStack, setRedoStack] = useState<Record<string, CanvasPoint>[]>([])
  const [marquee, setMarquee] = useState<CanvasRect | null>(null)
  const [multiSelection, setMultiSelection] = useState<Set<string>>(new Set())
  const [draggingShotId, setDraggingShotId] = useState<string | null>(null)
  const [dropTargetId, setDropTargetId] = useState<string | null>(null)
  const [boundEntities, setBoundEntities] = useState<Record<string, string[]>>({})
  const [notice, setNotice] = useState<string | null>(null)
  const [canvasTool, setCanvasTool] = useState<CanvasTool>('select')
  const hydratedPositionsProjectRef = useRef<string | null>(null)
  const [positionsReadyProject, setPositionsReadyProject] = useState<string | null>(null)
  const previousShotCountRef = useRef(project.shots.length)
  const canvasHeight = Math.max(CANVAS_HEIGHT, Math.ceil(project.shots.length / 3) * 330 + 80)

  const getPosition = useCallback((shot: Shot, index: number): CanvasPoint => {
    return positions[positionKey(project.id, shot.id)] ?? defaultShotPosition(index)
  }, [positions, project.id])

  // New project shots get deterministic positions; existing adjustments survive repository updates.
  useEffect(() => {
    if (hydratedPositionsProjectRef.current !== project.id) {
      hydratedPositionsProjectRef.current = project.id
      try {
        const stored = window.localStorage.getItem(`${POSITION_STORAGE_PREFIX}${project.id}`)
        if (stored) {
          const parsed = JSON.parse(stored) as Record<string, CanvasPoint>
          if (parsed && typeof parsed === 'object') setPositions((current) => ({ ...parsed, ...current }))
        }
      } catch {
        // Layout persistence is best effort and must not block the canvas.
      }
      setPositionsReadyProject(project.id)
      setUndoStack([])
      setRedoStack([])
    }
    setPositions((current) => {
      let changed = false
      const next = { ...current }
      project.shots.forEach((shot, index) => {
        const key = positionKey(project.id, shot.id)
        if (!next[key]) {
          next[key] = defaultShotPosition(index)
          changed = true
        }
      })
      return changed ? next : current
    })
    setBoundEntities((current) => {
      const next: Record<string, string[]> = {}
      project.shots.forEach((shot) => {
        const persisted = shot.entityIds ?? project.entities
          .filter((entity) => shot.characters.split(' · ').includes(entity.name))
          .map((entity) => entity.id)
        next[shot.id] = [...new Set([...(current[shot.id] ?? []), ...persisted])]
      })
      return next
    })
  }, [project.entities, project.id, project.shots])

  useEffect(() => {
    if (positionsReadyProject !== project.id || typeof window === 'undefined') return
    try {
      window.localStorage.setItem(`${POSITION_STORAGE_PREFIX}${project.id}`, JSON.stringify(positions))
    } catch {
      // Layout persistence is best effort and must not block the canvas.
    }
  }, [positions, positionsReadyProject, project.id])

  const fitCanvas = useCallback((announce = false) => {
    const viewport = viewportRef.current
    if (!viewport) return
    const bounds = viewport.getBoundingClientRect()
    const nextZoom = clamp(
      Math.min((bounds.width - 56) / CANVAS_WIDTH, (bounds.height - 56) / canvasHeight),
      MIN_ZOOM,
      0.84,
    )
    setZoom(nextZoom)
    setPan({
      x: Math.max(20, (bounds.width - CANVAS_WIDTH * nextZoom) / 2),
      y: Math.max(20, (bounds.height - canvasHeight * nextZoom) / 2),
    })
    if (announce) setNotice(`画布已适配到 ${formatZoom(nextZoom)}`)
  }, [canvasHeight, setPan, setZoom])

  useEffect(() => {
    const viewport = viewportRef.current
    if (!viewport) return
    const resizeObserver = new ResizeObserver(() => {
      setViewportSize({ width: viewport.clientWidth, height: viewport.clientHeight })
      if (viewport.clientWidth > 0 && viewport.clientHeight > 0 && !hasFittedRef.current) {
        hasFittedRef.current = true
        fitCanvas()
      }
    })
    resizeObserver.observe(viewport)
    return () => resizeObserver.disconnect()
  }, [fitCanvas, project.id])

  const worldPoint = useCallback((clientX: number, clientY: number): CanvasPoint => {
    const bounds = viewportRef.current?.getBoundingClientRect()
    if (!bounds) return { x: 0, y: 0 }
    return {
      x: (clientX - bounds.left - pan.x) / zoom,
      y: (clientY - bounds.top - pan.y) / zoom,
    }
  }, [pan, zoom])

  const zoomBy = useCallback((delta: number) => {
    setZoom((current) => clamp(Number((current + delta).toFixed(2)), MIN_ZOOM, MAX_ZOOM))
  }, [])

  const resetLayout = useCallback(() => {
    const next = { ...positions }
    project.shots.forEach((shot, index) => {
      next[positionKey(project.id, shot.id)] = defaultShotPosition(index)
    })
    setUndoStack((current) => [...current.slice(-19), positions])
    setRedoStack([])
    setPositions(next)
    setMultiSelection(new Set())
    setNotice('镜头已恢复为故事节拍布局')
  }, [positions, project.id, project.shots])

  const undoLayout = useCallback(() => {
    const previous = undoStack.at(-1)
    if (!previous) return
    setUndoStack((current) => current.slice(0, -1))
    setRedoStack((current) => [...current.slice(-19), positions])
    setPositions(previous)
    setNotice('已撤销画布布局调整')
  }, [positions, undoStack])

  const redoLayout = useCallback(() => {
    const next = redoStack.at(-1)
    if (!next) return
    setRedoStack((current) => current.slice(0, -1))
    setUndoStack((current) => [...current.slice(-19), positions])
    setPositions(next)
    setNotice('已重做画布布局调整')
  }, [positions, redoStack])

  const focusSelectedShot = useCallback(() => {
    const index = project.shots.findIndex((shot) => shot.id === selectedShotId)
    const viewport = viewportRef.current
    if (index < 0 || !viewport) {
      setNotice('请先选择一个镜头')
      return
    }
    const point = getPosition(project.shots[index], index)
    const nextZoom = Math.max(zoom, 0.82)
    setZoom(nextZoom)
    setPan({
      x: viewport.clientWidth / 2 - (point.x + CARD_WIDTH / 2) * nextZoom,
      y: viewport.clientHeight / 2 - (point.y + CARD_HEIGHT / 2) * nextZoom,
    })
    setNotice(`已聚焦${shotLabel(project.shots[index])}`)
  }, [getPosition, project.shots, selectedShotId, setPan, setZoom, zoom])

  useEffect(() => {
    if (project.shots.length > previousShotCountRef.current) {
      const index = project.shots.length - 1
      const point = getPosition(project.shots[index], index)
      const viewport = viewportRef.current
      if (viewport) {
        const nextZoom = Math.max(zoom, 0.72)
        setZoom(nextZoom)
        setPan({
          x: viewport.clientWidth / 2 - (point.x + CARD_WIDTH / 2) * nextZoom,
          y: viewport.clientHeight / 2 - (point.y + CARD_HEIGHT / 2) * nextZoom,
        })
      }
    }
    previousShotCountRef.current = project.shots.length
  }, [getPosition, project.shots, setPan, setZoom, zoom])

  useEffect(() => {
    const handleShortcut = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null
      if (target?.closest('input, textarea, select, [contenteditable="true"]')) return
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'z') {
        event.preventDefault()
        if (event.shiftKey) redoLayout()
        else undoLayout()
      } else if (event.key.toLowerCase() === 'v') setCanvasTool('select')
      else if (event.key.toLowerCase() === 'h') setCanvasTool('pan')
      else if (event.key.toLowerCase() === 'f') focusSelectedShot()
      else if (event.key === 'Escape') setMultiSelection(new Set())
    }
    document.addEventListener('keydown', handleShortcut)
    return () => document.removeEventListener('keydown', handleShortcut)
  }, [focusSelectedShot, redoLayout, undoLayout])

  useEffect(() => {
    if (!notice) return
    const timeout = window.setTimeout(() => setNotice(null), 2600)
    return () => window.clearTimeout(timeout)
  }, [notice])

  const handleCanvasPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    const target = event.target as HTMLElement
    if (event.button !== 0 || target.closest('article, button, input, textarea, select, a')) return
    event.currentTarget.setPointerCapture(event.pointerId)
    if (canvasTool === 'select') {
      const start = worldPoint(event.clientX, event.clientY)
      interactionRef.current = { type: 'marquee', pointerId: event.pointerId, start, current: start }
      setMarquee({ ...start, width: 0, height: 0 })
      return
    }
    interactionRef.current = {
      type: 'pan',
      pointerId: event.pointerId,
      startClient: { x: event.clientX, y: event.clientY },
      startPan: pan,
    }
  }

  const handleCanvasPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const interaction = interactionRef.current
    if (!interaction || interaction.pointerId !== event.pointerId) return
    if (interaction.type === 'pan') {
      setPan({
        x: interaction.startPan.x + event.clientX - interaction.startClient.x,
        y: interaction.startPan.y + event.clientY - interaction.startClient.y,
      })
      return
    }
    const current = worldPoint(event.clientX, event.clientY)
    interactionRef.current = { ...interaction, current }
    const nextRect = normaliseRect(interaction.start, current)
    setMarquee(nextRect)
    const selected = project.shots
      .filter((shot, index) => intersects(nextRect, {
        ...getPosition(shot, index),
        width: CARD_WIDTH,
        height: CARD_HEIGHT,
      }))
      .map((shot) => shot.id)
    setMultiSelection(new Set(selected))
  }

  const endCanvasInteraction = (event: ReactPointerEvent<HTMLDivElement>) => {
    const interaction = interactionRef.current
    if (!interaction || interaction.pointerId !== event.pointerId) return
    interactionRef.current = null
    setMarquee(null)
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId)
  }

  const handleCanvasWheel = (event: React.WheelEvent<HTMLDivElement>) => {
    event.preventDefault()
    if (event.ctrlKey || event.metaKey) {
      zoomBy(event.deltaY < 0 ? 0.08 : -0.08)
      return
    }
    setPan((current) => ({ x: current.x - event.deltaX, y: current.y - event.deltaY }))
  }

  const beginShotDrag = (event: ReactPointerEvent<HTMLButtonElement>, shot: Shot, index: number) => {
    if (event.button !== 0) return
    event.preventDefault()
    event.stopPropagation()
    event.currentTarget.setPointerCapture(event.pointerId)
    shotDragRef.current = {
      pointerId: event.pointerId,
      shotId: shot.id,
      startClient: { x: event.clientX, y: event.clientY },
      startPosition: getPosition(shot, index),
      startPositions: positions,
    }
    setDraggingShotId(shot.id)
  }

  const moveShot = (event: ReactPointerEvent<HTMLButtonElement>) => {
    const drag = shotDragRef.current
    if (!drag || drag.pointerId !== event.pointerId) return
    const rawX = clamp(drag.startPosition.x + (event.clientX - drag.startClient.x) / zoom, 24, CANVAS_WIDTH - CARD_WIDTH - 24)
    const rawY = clamp(drag.startPosition.y + (event.clientY - drag.startClient.y) / zoom, 62, canvasHeight - CARD_HEIGHT - 30)
    const nextPosition = { x: Math.round(rawX / 12) * 12, y: Math.round(rawY / 12) * 12 }
    setPositions((current) => ({
      ...current,
      [positionKey(project.id, drag.shotId)]: nextPosition,
    }))
  }

  const endShotDrag = (event: ReactPointerEvent<HTMLButtonElement>) => {
    const drag = shotDragRef.current
    if (!drag || drag.pointerId !== event.pointerId) return
    const current = positions[positionKey(project.id, drag.shotId)]
    if (current && (current.x !== drag.startPosition.x || current.y !== drag.startPosition.y)) {
      setUndoStack((stack) => [...stack.slice(-19), drag.startPositions])
      setRedoStack([])
    }
    shotDragRef.current = null
    setDraggingShotId(null)
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId)
  }

  const handleShotDrop = (event: DragEvent<HTMLElement>, shot: Shot) => {
    event.preventDefault()
    event.stopPropagation()
    setDropTargetId(null)
    const entityId = event.dataTransfer.getData('application/x-flowos-entity-id')
      || event.dataTransfer.getData('text/x-flowos-entity-id')
      || event.dataTransfer.getData('text/plain').replace(/^entity:/, '')
    const entity = project.entities.find((candidate) => candidate.id === entityId)
    if (!entity) {
      setNotice('未识别该资产，请从资产架重新拖入')
      return
    }
    setBoundEntities((current) => ({
      ...current,
      [shot.id]: [...new Set([...(current[shot.id] ?? []), entity.id])],
    }))
    onBindEntity?.(shot.id, entity.id)
    setNotice(`已将「${entity.name}」绑定到${shotLabel(shot)}`)
    onSelectShot(shot.id)
  }

  const groupFrames = useMemo(() => {
    const groups = [
      { label: 'ACT 01 · 设定与质感', shots: project.shots.slice(0, 3), tone: '#4EE1FF' },
      { label: 'ACT 02 · 仪式与收束', shots: project.shots.slice(3), tone: '#7C5CFF' },
    ].filter((group) => group.shots.length > 0)

    return groups.map((group) => {
      const bounds = group.shots.map((shot) => {
        const index = project.shots.findIndex((candidate) => candidate.id === shot.id)
        return getPosition(shot, index)
      })
      const minX = Math.min(...bounds.map((point) => point.x))
      const minY = Math.min(...bounds.map((point) => point.y))
      const maxX = Math.max(...bounds.map((point) => point.x + CARD_WIDTH))
      const maxY = Math.max(...bounds.map((point) => point.y + CARD_HEIGHT))
      return {
        ...group,
        x: minX - 28,
        y: minY - 54,
        width: maxX - minX + 56,
        height: maxY - minY + 82,
      }
    })
  }, [getPosition, project.shots])

  const allSuccessfulOutputs = useMemo(
    () => project.jobs.filter((job) => job.status === 'succeeded' && job.output),
    [project.jobs],
  )

  return (
    <section className="relative flex h-full min-h-0 flex-1 flex-col overflow-hidden bg-[#0d0f13]" aria-label="创作画布">
      <header className="relative z-20 hidden shrink-0 md:flex flex-wrap items-center gap-2 border-b border-[#252832] bg-[#111318] px-3 py-2 sm:px-4">
        <div className="mr-auto min-w-0">
          <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.16em] text-[var(--muted)]">
            <Layers3 size={13} aria-hidden="true" />
            Canvas / {project.branches.find((branch) => branch.id === project.activeBranchId)?.name ?? 'Main'}
          </div>
          <div className="mt-0.5 truncate text-xs font-medium text-[#e9edf2]">
            {project.shots.length} 个镜头 · {allSuccessfulOutputs.length} 个可用结果
          </div>
        </div>

        <div className="flex items-center gap-1 rounded-lg border border-[#2c323d] bg-[#181b21] p-1" aria-label="画布缩放">
          <button
            type="button"
            onClick={() => zoomBy(-0.1)}
            className="focus-ring grid h-7 w-7 place-items-center rounded text-[#a8b1be] hover:bg-[#292f39] hover:text-white disabled:opacity-40"
            aria-label="缩小画布"
            disabled={zoom <= MIN_ZOOM}
          >
            <ZoomOut size={14} aria-hidden="true" />
          </button>
          <span className="min-w-10 text-center text-[10px] tabular-nums text-[#aeb7c4]" aria-live="polite">{formatZoom(zoom)}</span>
          <button
            type="button"
            onClick={() => zoomBy(0.1)}
            className="focus-ring grid h-7 w-7 place-items-center rounded text-[#a8b1be] hover:bg-[#292f39] hover:text-white disabled:opacity-40"
            aria-label="放大画布"
            disabled={zoom >= MAX_ZOOM}
          >
            <ZoomIn size={14} aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={() => fitCanvas(true)}
            className="focus-ring grid h-7 w-7 place-items-center rounded text-[#a8b1be] hover:bg-[#292f39] hover:text-white"
            aria-label="适配画布"
            title="适配画布"
          >
            <Maximize2 size={14} aria-hidden="true" />
          </button>
        </div>

        <button
          type="button"
          onClick={resetLayout}
          className="focus-ring hidden h-9 items-center gap-1.5 rounded-lg border border-[#2d333e] bg-[#1a1d23] px-2.5 text-[11px] text-[#abb5c3] hover:border-[#45515e] hover:text-white sm:flex"
          title="恢复默认布局"
        >
          <Grid2X2 size={14} aria-hidden="true" />
          整理
        </button>
        <button
          type="button"
          onClick={() => onModeChange('Storyboard')}
          className="focus-ring hidden h-9 items-center gap-1.5 rounded-lg border border-[#2d333e] bg-[#1a1d23] px-2.5 text-[11px] text-[#abb5c3] hover:border-[#45515e] hover:text-white md:flex"
        >
          <ImageIcon size={14} aria-hidden="true" />
          分镜
        </button>
        <button
          type="button"
          onClick={onOpenAgent}
          className="focus-ring inline-flex h-9 items-center gap-1.5 rounded-lg bg-[#24343a] px-2.5 text-[11px] font-medium text-[#65e6ff] hover:bg-[#2b424a]"
        >
          <Bot size={14} aria-hidden="true" />
          <span className="hidden sm:inline">询问 Agent</span>
        </button>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto p-4 md:hidden" aria-label="移动端镜头列表">
        <div className="mb-4 flex items-center justify-between"><h2 className="text-sm font-medium">{project.shots.length} 个镜头</h2><button type="button" onClick={onOpenAgent} className="focus-ring grid h-10 w-10 place-items-center rounded-md border border-[var(--line)]" aria-label="询问创意助手" title="创意助手"><Bot size={18} /></button></div>
        <div className="grid gap-4 sm:grid-cols-2">
          {project.shots.map((shot) => {
            const latest = outputJobs(project, shot.id)[0]
            const preview = latest?.output?.previewUrl ?? shot.image
            return <article key={shot.id} className={`overflow-hidden rounded-lg border bg-[var(--surface)] ${selectedShotId === shot.id ? 'border-[var(--cyan)]' : 'border-[var(--line)]'}`}>
              <button type="button" onClick={() => onSelectShot(shot.id)} aria-label={`选择镜头 ${shot.number}：${shot.title}`} aria-pressed={selectedShotId === shot.id} className="focus-ring block w-full text-left">
                <div className="aspect-video bg-[var(--surface2)]">{preview && <PreviewImage src={preview} alt={shot.title} className="h-full w-full object-cover" loading="lazy" />}</div>
                <div className="p-3"><h3 className="text-sm font-medium">{shotLabel(shot)}</h3><p className="mt-1 text-xs text-[var(--muted)]">{shot.duration} · {shot.framing} · {shot.version}</p></div>
              </button>
              <div className="flex justify-end gap-2 border-t border-[var(--line)] px-3 py-2">
                {latest && <button type="button" onClick={() => onOpenResult(latest)} className="focus-ring h-10 rounded-md px-3 text-xs text-[var(--cyan)]">查看结果</button>}
                <button type="button" onClick={() => { onSelectShot(shot.id); onGenerate(shot.id) }} className="focus-ring inline-flex h-10 items-center gap-2 rounded-md bg-[var(--selection)] px-3 text-xs text-[var(--cyan)]"><Sparkles size={14} />生成</button>
              </div>
            </article>
          })}
        </div>
      </div>
      <div
        ref={viewportRef}
        className={`relative hidden min-h-0 flex-1 overflow-hidden bg-[#0b0c0f] select-none md:block ${canvasTool === 'pan' ? 'cursor-grab' : 'cursor-default'}`}
        style={{ touchAction: 'none' }}
        onPointerDown={handleCanvasPointerDown}
        onPointerMove={handleCanvasPointerMove}
        onPointerUp={endCanvasInteraction}
        onPointerCancel={endCanvasInteraction}
        onWheel={handleCanvasWheel}
        aria-label="无限画布。选择工具拖动可框选，平移工具拖动可移动画布。"
      >
        <div className="absolute left-3 top-3 z-20 flex flex-col gap-1 rounded-lg border border-[#2b333e] bg-[#11151b]/95 p-1 shadow-[0_14px_36px_rgba(0,0,0,.32)] backdrop-blur" aria-label="画布工具">
          <button
            type="button"
            onClick={() => setCanvasTool('select')}
            className={`focus-ring grid h-8 w-8 place-items-center rounded-md ${canvasTool === 'select' ? 'bg-[#24434b] text-[#65e6ff]' : 'text-[#8f9aa8] hover:bg-[#232a33] hover:text-white'}`}
            aria-label="选择工具"
            aria-pressed={canvasTool === 'select'}
            title="选择 / 框选"
          >
            <MousePointer2 size={15} aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={() => setCanvasTool('pan')}
            className={`focus-ring grid h-8 w-8 place-items-center rounded-md ${canvasTool === 'pan' ? 'bg-[#24434b] text-[#65e6ff]' : 'text-[#8f9aa8] hover:bg-[#232a33] hover:text-white'}`}
            aria-label="平移工具"
            aria-pressed={canvasTool === 'pan'}
            title="平移画布"
          >
            <Hand size={15} aria-hidden="true" />
          </button>
          <span className="mx-1 h-px bg-[#2b333e]" aria-hidden="true" />
          <button
            type="button"
            onClick={resetLayout}
            className="focus-ring grid h-8 w-8 place-items-center rounded-md text-[#8f9aa8] hover:bg-[#232a33] hover:text-white"
            aria-label="整理镜头"
            title="整理镜头"
          >
            <Grid2X2 size={15} aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={undoLayout}
            disabled={!undoStack.length}
            className="focus-ring grid h-8 w-8 place-items-center rounded-md text-[#8f9aa8] hover:bg-[#232a33] hover:text-white disabled:cursor-not-allowed disabled:opacity-35"
            aria-label="撤销布局"
            title={undoStack.length ? '撤销布局 (Ctrl/Cmd + Z)' : '暂无可撤销的布局调整'}
          >
            <Undo2 size={15} aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={redoLayout}
            disabled={!redoStack.length}
            className="focus-ring grid h-8 w-8 place-items-center rounded-md text-[#8f9aa8] hover:bg-[#232a33] hover:text-white disabled:cursor-not-allowed disabled:opacity-35"
            aria-label="重做布局"
            title={redoStack.length ? '重做布局 (Ctrl/Cmd + Shift + Z)' : '暂无可重做的布局调整'}
          >
            <Redo2 size={15} aria-hidden="true" />
          </button>
          <span className="mx-1 h-px bg-[#2b333e]" aria-hidden="true" />
          <button
            type="button"
            onClick={focusSelectedShot}
            className="focus-ring grid h-8 w-8 place-items-center rounded-md text-[#8f9aa8] hover:bg-[#232a33] hover:text-white"
            aria-label="聚焦所选镜头"
            title="聚焦所选镜头 (F)"
          >
            <Crosshair size={15} aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={onOpenAgent}
            className="focus-ring grid h-8 w-8 place-items-center rounded-md text-[#8f9aa8] hover:bg-[#232a33] hover:text-[#65e6ff]"
            aria-label="询问创意助手"
            title="询问 Agent"
          >
            <Sparkles size={15} aria-hidden="true" />
          </button>
        </div>

        <div
          className="absolute left-0 top-0 origin-top-left"
          style={{
            width: CANVAS_WIDTH,
            height: canvasHeight,
            transform: `translate3d(${pan.x}px, ${pan.y}px, 0) scale(${zoom})`,
            backgroundColor: '#101217',
            backgroundImage: 'radial-gradient(circle, rgba(86, 96, 112, .52) 1px, transparent 1.2px)',
            backgroundSize: '24px 24px',
          }}
        >
          <div className="absolute left-7 top-6 flex items-center gap-2 text-[11px] text-[var(--muted)]">
            <MousePointer2 size={14} aria-hidden="true" />
            <span>V 选择框选 · H 平移画布 · F 聚焦 · Ctrl + 滚轮缩放</span>
          </div>

          {groupFrames.map((group) => (
            <div
              key={group.label}
              className="absolute rounded-lg border border-dashed"
              style={{
                left: group.x,
                top: group.y,
                width: group.width,
                height: group.height,
                borderColor: `${group.tone}55`,
                backgroundColor: `${group.tone}08`,
              }}
              aria-hidden="true"
            >
              <span
                className="absolute -top-5 left-0 rounded px-1.5 py-0.5 text-[10px] tracking-[0.12em]"
                style={{ color: group.tone, backgroundColor: '#101217' }}
              >
                {group.label}
              </span>
            </div>
          ))}

          <svg className="pointer-events-none absolute inset-0 h-full w-full overflow-visible" viewBox={`0 0 ${CANVAS_WIDTH} ${canvasHeight}`} aria-hidden="true">
            <defs>
              <marker id="flowos-canvas-arrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
                <path d="M0,0 L0,6 L6,3 z" fill="#4ee1ff" opacity=".65" />
              </marker>
            </defs>
            {project.shots.slice(0, -1).map((shot, index) => {
              const current = getPosition(shot, index)
              const next = getPosition(project.shots[index + 1], index + 1)
              const fromX = current.x + CARD_WIDTH
              const fromY = current.y + CARD_HEIGHT / 2
              const toX = next.x
              const toY = next.y + CARD_HEIGHT / 2
              const control = Math.max(72, Math.abs(toX - fromX) * 0.42)
              return (
                <path
                  key={`${shot.id}-${project.shots[index + 1].id}`}
                  d={`M ${fromX} ${fromY} C ${fromX + control} ${fromY}, ${toX - control} ${toY}, ${toX} ${toY}`}
                  fill="none"
                  stroke="#4ee1ff"
                  strokeDasharray="7 8"
                  strokeOpacity=".5"
                  strokeWidth="1.5"
                  markerEnd="url(#flowos-canvas-arrow)"
                />
              )
            })}
          </svg>

          {project.shots.map((shot, index) => {
            const position = getPosition(shot, index)
            const successfulJobs = outputJobs(project, shot.id)
            const latest = successfulJobs[0]
            const preview = latest?.output?.previewUrl ?? shot.image
            const isSelected = selectedShotId === shot.id || multiSelection.has(shot.id)
            const droppedEntities = (boundEntities[shot.id] ?? [])
              .map((entityId) => project.entities.find((entity) => entity.id === entityId))
              .filter((entity): entity is NonNullable<typeof entity> => Boolean(entity))

            return (
              <article
                key={shot.id}
                tabIndex={0}
                aria-label={`${shotLabel(shot)}，${successfulJobs.length} 个生成结果`}
                onClick={() => {
                  setMultiSelection(new Set([shot.id]))
                  onSelectShot(shot.id)
                }}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault()
                    setMultiSelection(new Set([shot.id]))
                    onSelectShot(shot.id)
                  }
                }}
                onDragOver={(event) => {
                  event.preventDefault()
                  event.dataTransfer.dropEffect = 'link'
                  setDropTargetId(shot.id)
                }}
                onDragLeave={(event) => {
                  if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setDropTargetId(null)
                }}
                onDrop={(event) => handleShotDrop(event, shot)}
                className={`absolute overflow-hidden rounded-lg border bg-[var(--surface)] text-left shadow-[0_14px_38px_rgba(0,0,0,.24)] outline-none transition-[border-color,box-shadow,transform] focus-visible:ring-2 focus-visible:ring-[#4ee1ff] ${
                  isSelected ? 'border-[#4ee1ff] ring-1 ring-[#4ee1ff]/45' : 'border-[#323843] hover:border-[#66717f]'
                } ${draggingShotId === shot.id ? 'z-20 cursor-grabbing shadow-[0_24px_60px_rgba(0,0,0,.5)]' : 'z-10'} ${
                  dropTargetId === shot.id ? 'border-[#65e6ff] bg-[#18252a]' : ''
                } ${isSelected ? 'scale-[1.012]' : ''}`}
                style={{ left: position.x, top: position.y, width: CARD_WIDTH, minHeight: CARD_HEIGHT }}
              >
                <div className="relative aspect-[16/8.4] overflow-hidden border-b border-[#2c323c] bg-[#20242b]">
                  {preview ? (
                    <PreviewImage src={preview} alt={`${shot.title} 的预览`} className="h-full w-full object-cover" draggable={false} />
                  ) : (
                    <div className="grid h-full place-items-center bg-[linear-gradient(135deg,#1b2028,#242a34)] text-center">
                      <div>
                        <ImageIcon className="mx-auto text-[var(--muted)]" size={22} aria-hidden="true" />
                        <span className="mt-2 block text-[10px] text-[var(--muted)]">等待首轮生成</span>
                      </div>
                    </div>
                  )}
                  <div className="absolute inset-x-0 top-0 flex items-center justify-between p-2">
                    <span className="rounded bg-[#0a0c10]/85 px-1.5 py-1 text-[10px] font-medium text-[#f2f5f7]">
                      {String(shot.number).padStart(2, '0')}
                    </span>
                    <span className="rounded bg-[#0a0c10]/85 px-1.5 py-1 text-[10px] tabular-nums text-[#c8d0dc]">{shot.duration}</span>
                  </div>
                  {shot.warning && (
                    <span className="absolute bottom-2 left-2 right-2 truncate rounded bg-[#3f301b]/95 px-2 py-1 text-[10px] text-[#ffd581]" title={shot.warning}>
                      连续性 · {shot.warning}
                    </span>
                  )}
                  {dropTargetId === shot.id && (
                    <div className="absolute inset-0 grid place-items-center bg-[#0a1820]/82 text-center text-xs font-medium text-[#65e6ff]">
                      松开以绑定引用素材
                    </div>
                  )}
                </div>

                <div className="p-3">
                  <div className="flex min-w-0 items-start gap-2">
                    <button
                      type="button"
                      onPointerDown={(event) => beginShotDrag(event, shot, index)}
                      onPointerMove={moveShot}
                      onPointerUp={endShotDrag}
                      onPointerCancel={endShotDrag}
                      onClick={(event) => event.stopPropagation()}
                      className="focus-ring mt-0.5 grid h-5 w-5 shrink-0 cursor-grab place-items-center rounded text-[var(--muted)] hover:bg-[#292f39] hover:text-white active:cursor-grabbing"
                      aria-label={`拖动 ${shotLabel(shot)}`}
                      title="拖动镜头"
                    >
                      <Move size={13} aria-hidden="true" />
                    </button>
                    <div className="min-w-0 flex-1">
                      <h3 className="truncate text-xs font-semibold text-[#edf1f5]">{shot.title}</h3>
                      <p className="mt-1 truncate text-[10px] text-[var(--muted)]">{shot.framing} · {shot.move}</p>
                    </div>
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation()
                        if (latest) onOpenResult(latest)
                        else onGenerate(shot.id)
                      }}
                      className={`focus-ring grid h-6 w-6 shrink-0 place-items-center rounded ${latest ? 'text-[#9ba6b4] hover:bg-[#292f39] hover:text-white' : 'bg-[#24343a] text-[#65e6ff] hover:bg-[#2b424a]'}`}
                      aria-label={latest ? `打开 ${shot.title} 的最新结果` : `生成 ${shot.title}`}
                      title={latest ? '打开最新结果' : '生成镜头'}
                    >
                      {latest ? <Eye size={14} aria-hidden="true" /> : <Sparkles size={13} aria-hidden="true" />}
                    </button>
                  </div>

                  <div className="mt-2 flex min-h-5 flex-wrap gap-1">
                    {droppedEntities.slice(0, 2).map((entity) => (
                      <span key={entity.id} className="max-w-full truncate rounded border border-[#36515c] bg-[#192b31] px-1.5 py-0.5 text-[9px] text-[#8beafd]" title={`${entity.name} 已绑定`}>
                        @{entity.name} 已绑定
                      </span>
                    ))}
                    {droppedEntities.length > 2 && (
                      <span className="rounded border border-[#36515c] bg-[#192b31] px-1.5 py-0.5 text-[9px] text-[#8beafd]">+{droppedEntities.length - 2}</span>
                    )}
                    {!droppedEntities.length && <span className="text-[10px] text-[var(--muted)]">拖入资产以绑定参考</span>}
                  </div>

                  <div className="mt-3 flex items-center justify-between border-t border-[#292f38] pt-2.5">
                    <div className="flex min-w-0 items-center gap-1.5">
                      <span className="rounded bg-[#232833] px-1.5 py-0.5 text-[10px] text-[#b8c2d0]">{shot.version}</span>
                      {successfulJobs.length > 0 && (
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation()
                            onOpenResult(successfulJobs[0])
                          }}
                          className="focus-ring flex min-w-0 items-center gap-1 rounded px-1 py-0.5 text-[10px] text-[#65e6ff] hover:bg-[#1c3037]"
                          aria-label={`查看 ${successfulJobs.length} 个结果版本`}
                          title="查看结果版本"
                        >
                          <Layers3 size={12} aria-hidden="true" />
                          <span>{successfulJobs.length} 个结果</span>
                        </button>
                      )}
                    </div>
                    {latest ? (
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation()
                          onOpenResult(latest)
                        }}
                        className="focus-ring rounded px-1.5 py-1 text-[10px] text-[#d9e0e8] hover:bg-[#2a303a]"
                      >
                        Recipe
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation()
                          onGenerate(shot.id)
                        }}
                        className="focus-ring flex items-center gap-1 rounded bg-[#24343a] px-1.5 py-1 text-[10px] font-medium text-[#65e6ff] hover:bg-[#2b424a]"
                      >
                        <Sparkles size={11} aria-hidden="true" />
                        生成
                      </button>
                    )}
                  </div>
                </div>
              </article>
            )
          })}

        </div>

        <button
          type="button"
          onClick={onAddShot ?? onOpenAgent}
          className="focus-ring absolute bottom-[52px] left-3 z-20 inline-flex h-8 items-center gap-1.5 rounded-lg border border-dashed border-[#465667] bg-[#11151b]/95 px-2.5 text-[10px] text-[#9faab8] shadow-lg backdrop-blur hover:border-[#65e6ff] hover:text-[#65e6ff]"
        >
          <Plus size={13} aria-hidden="true" />
          添加镜头
        </button>

        <button
          type="button"
          className="absolute bottom-[52px] right-3 hidden w-[156px] rounded-lg border border-[#2b333e] bg-[#11151b]/95 p-2 text-left shadow-[0_14px_36px_rgba(0,0,0,.32)] backdrop-blur lg:block"
          aria-label="画布缩略地图，点击定位"
          title="点击缩略地图定位"
          onPointerDown={(event) => event.stopPropagation()}
          onClick={(event) => {
            const bounds = event.currentTarget.getBoundingClientRect()
            const targetX = ((event.clientX - bounds.left) / bounds.width) * CANVAS_WIDTH
            const targetY = ((event.clientY - bounds.top) / bounds.height) * canvasHeight
            const viewport = viewportRef.current?.getBoundingClientRect()
            if (!viewport) return
            setPan({ x: viewport.width / 2 - targetX * zoom, y: viewport.height / 2 - targetY * zoom })
          }}
        >
          <div className="mb-1.5 flex items-center gap-1.5 text-[9px] uppercase tracking-[0.12em] text-[#aeb8c5]"><Map size={11} aria-hidden="true" /> 画布导航</div>
          <div className="relative h-[92px] overflow-hidden rounded border border-[#29313b] bg-[#0b0f14]" style={{ backgroundImage: 'linear-gradient(rgba(91, 106, 122, .12) 1px, transparent 1px), linear-gradient(90deg, rgba(91, 106, 122, .12) 1px, transparent 1px)', backgroundSize: '12px 12px' }}>
            {project.shots.map((shot, index) => {
              const point = getPosition(shot, index)
              const active = selectedShotId === shot.id || multiSelection.has(shot.id)
              return <span key={shot.id} className={`absolute h-2.5 w-4 rounded-[2px] border ${active ? 'border-[#65e6ff] bg-[#4ee1ff]' : 'border-[#596577] bg-[#303a49]'}`} style={{ left: `${(point.x / CANVAS_WIDTH) * 100}%`, top: `${(point.y / canvasHeight) * 100}%` }} aria-hidden="true" />
            })}
            {viewportSize.width > 0 && viewportSize.height > 0 && (
              <span
                className="absolute border border-[#65e6ff]/70 bg-[#4ee1ff]/10"
                style={{
                  left: `${clamp((-pan.x / zoom / CANVAS_WIDTH) * 100, 0, 100)}%`,
                  top: `${clamp((-pan.y / zoom / canvasHeight) * 100, 0, 100)}%`,
                  width: `${clamp((viewportSize.width / zoom / CANVAS_WIDTH) * 100, 4, 100)}%`,
                  height: `${clamp((viewportSize.height / zoom / canvasHeight) * 100, 4, 100)}%`,
                }}
                aria-hidden="true"
              />
            )}
          </div>
        </button>

        {marquee && (
          <div
            className="pointer-events-none absolute border border-[#65e6ff] bg-[#4ee1ff]/10"
            style={{
              left: pan.x + marquee.x * zoom,
              top: pan.y + marquee.y * zoom,
              width: marquee.width * zoom,
              height: marquee.height * zoom,
            }}
            aria-hidden="true"
          />
        )}

        <div className="absolute bottom-3 left-3 flex items-center gap-2 rounded-lg border border-[#29303a] bg-[#13161c]/95 px-2.5 py-1.5 text-[10px] text-[var(--muted)] shadow-lg">
          <Move size={12} aria-hidden="true" />
          <span>{multiSelection.size > 1 ? `已选 ${multiSelection.size} 个镜头` : '空间画布'}</span>
          {multiSelection.size > 1 && onGenerateMany && (
            <button type="button" onClick={() => onGenerateMany([...multiSelection])} className="focus-ring ml-1 inline-flex h-6 items-center gap-1 rounded bg-[#24434b] px-2 font-medium text-[#65e6ff] hover:bg-[#2b515b]">
              <Sparkles size={11} aria-hidden="true" />批量生成
            </button>
          )}
        </div>

        <div className="absolute bottom-3 right-3 flex items-center gap-1 rounded-lg border border-[#29303a] bg-[#13161c]/95 p-1 shadow-lg">
          <button type="button" onClick={() => zoomBy(-0.1)} className="focus-ring grid h-7 w-7 place-items-center rounded text-[#9aa5b3] hover:bg-[#292f39]" aria-label="缩小画布">
            <Minus size={14} aria-hidden="true" />
          </button>
          <button type="button" onClick={() => fitCanvas(true)} className="focus-ring grid h-7 w-7 place-items-center rounded text-[#9aa5b3] hover:bg-[#292f39]" aria-label="适配画布">
            <Maximize2 size={14} aria-hidden="true" />
          </button>
          <button type="button" onClick={() => zoomBy(0.1)} className="focus-ring grid h-7 w-7 place-items-center rounded text-[#9aa5b3] hover:bg-[#292f39]" aria-label="放大画布">
            <Plus size={14} aria-hidden="true" />
          </button>
        </div>
      </div>

      <footer className="relative z-20 hidden shrink-0 md:flex items-center gap-2 border-t border-[#252832] bg-[#111318] px-3 py-2 sm:px-4">
        <button
          type="button"
          onClick={() => onModeChange('Nodes')}
          className="focus-ring flex h-8 items-center gap-1.5 rounded-lg border border-[#2c333e] bg-[#191c22] px-2.5 text-[11px] text-[#abb5c3] hover:border-[#526170] hover:text-white"
        >
          <Workflow size={14} aria-hidden="true" />
          <span className="hidden sm:inline">展开为节点</span>
          <span className="sm:hidden">节点</span>
        </button>
        <button
          type="button"
          onClick={() => onModeChange('Timeline')}
          className="focus-ring flex h-8 items-center gap-1.5 rounded-lg border border-[#2c333e] bg-[#191c22] px-2.5 text-[11px] text-[#abb5c3] hover:border-[#526170] hover:text-white"
        >
          <GitBranch size={14} aria-hidden="true" />
          <span className="hidden sm:inline">时间线</span>
          <span className="sm:hidden">时间</span>
        </button>
        <span className="ml-auto hidden text-[10px] text-[var(--muted)] md:inline">拖动镜头卡的移动手柄以调整故事节拍</span>
      </footer>

      {notice && (
        <div role="status" className="pointer-events-none absolute left-1/2 top-16 z-30 max-w-[calc(100%-32px)] -translate-x-1/2 rounded-lg bg-[#e9fbff] px-3 py-2 text-center text-[11px] font-medium text-[#081014] shadow-xl">
          {notice}
        </div>
      )}
    </section>
  )
}
