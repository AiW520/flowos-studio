'use client'

import { PreviewImage } from '@/components/PreviewImage'

import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { useEffect, useMemo, useRef, useState } from 'react'
import { AlertTriangle, PanelLeft, Settings2 } from 'lucide-react'
import { AppShell } from '@/components/AppShell'
import { PROJECT_BRIEF_STORAGE_PREFIX } from '@/components/NewProjectDialog'
import { ThemeToggle } from '@/components/ThemeToggle'
import {
  ArrowLeft,
  Bot,
  Check,
  GitBranch,
  Layers3,
  Plus,
  Search,
  Sparkles,
} from '@/components/icons'
import {
  type RepositoryGenerationJob,
  type TimelineClip,
} from '@/lib/project-repository'
import { useModelCatalog } from '@/lib/use-model-catalog'
import { useProjectStore } from '@/lib/use-project-store'
import type { MediaType, ModelVersion, Shot } from '@/lib/types'
import {
  CanvasWorkspace,
  type CanvasWorkspaceMode,
} from '@/components/studio/CanvasWorkspace'
import {
  AgentWorkspace,
  NodesWorkspace,
  StoryboardWorkspace,
  type AgentBrief,
  type AgentShotDraft,
  type AgentShotPatch,
  type CreateSkillInput,
} from '@/components/studio/PlanningModes'
import {
  ReviewWorkspace,
  TimelineWorkspace,
  type ReviewAnnotation,
  type ReviewComment,
  type ReviewDecision,
} from '@/components/studio/DeliveryModes'
import { JobQueue } from '@/components/studio/JobQueue'
import {
  AgentDrawer,
  ExportModal,
  GenerationConfirmModal,
  ModelRouterDrawer,
  ResultDetailModal,
  useAccessibleDialog,
  type ExportRequest,
} from '@/components/studio/StudioDialogs'

type WorkbenchMode = CanvasWorkspaceMode
type ToastTone = 'default' | 'success' | 'warning' | 'error'

interface ToastMessage {
  message: string
  tone: ToastTone
}

interface PendingGeneration {
  shotIds: string[]
  prompts: Record<string, string>
  mediaType: MediaType
  source: 'agent' | 'canvas' | 'toolbar'
  resolve?: () => void
  reject?: (reason: Error) => void
}

interface ShotInspectorSettings {
  aspectRatio: string
  referenceWeight: number
  nativeAudio: boolean
}

const modes: WorkbenchMode[] = ['Agent', 'Canvas', 'Nodes', 'Storyboard', 'Timeline', 'Review']

function parseCredits(model?: ModelVersion | null): number {
  const parsed = Number(model?.cost.match(/\d+(?:\.\d+)?/)?.[0] ?? 0)
  return Number.isFinite(parsed) ? parsed : 0
}

function initialBrief(projectName: string, description?: string): AgentBrief {
  return {
    title: projectName,
    summary: description ?? '',
    audience: '独立创作者与夜间城市生活者',
    format: '16:9 · 1080p · 30 秒',
    tone: '克制、电影感、可信赖',
  }
}

function defaultPrompt(projectName: string, shot: Shot): string {
  const entities = shot.characters
    .split(' · ')
    .filter(Boolean)
    .map((name) => `@${name}`)
    .join(' ')
  return `${entities} ${shot.title}，${shot.framing}，${shot.move}，${shot.duration}。${projectName}，真实材质、连贯光线、专业广告镜头。 #雨幕蓝调 /generate`
}

function safeRead(key: string): string | null {
  if (typeof window === 'undefined') return null
  try {
    return window.localStorage.getItem(key)
  } catch {
    return null
  }
}

function safeWrite(key: string, value: string): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(key, value)
  } catch {
    // The repository remains usable when browser persistence is unavailable.
  }
}

function decodeRouteId(value?: string): string | undefined {
  if (!value) return value
  try {
    return decodeURIComponent(value)
  } catch {
    return value
  }
}

export default function ProjectWorkbenchPage() {
  const params = useParams<{ id: string | string[] }>()
  const router = useRouter()
  const projectId = decodeRouteId(Array.isArray(params.id) ? params.id[0] : params.id)
  const store = useProjectStore(projectId)
  const { models: modelCatalog, loading: modelsLoading, error: modelsError } = useModelCatalog()
  const project = store.currentProject
  const initializedProjectId = useRef<string | null>(null)
  const pendingGenerationRef = useRef<PendingGeneration | null>(null)

  const [mode, setMode] = useState<WorkbenchMode>('Canvas')
  const [selectedShotId, setSelectedShotId] = useState<string | null>(null)
  const [selectedModelId, setSelectedModelId] = useState('')
  const [promptByShotId, setPromptByShotId] = useState<Record<string, string>>({})
  const [referenceResultByShotId, setReferenceResultByShotId] = useState<Record<string, string>>({})
  const [goal, setGoal] = useState('')
  const [brief, setBrief] = useState<AgentBrief>(() => initialBrief('', ''))
  const [drafts, setDrafts] = useState<AgentShotDraft[]>([])
  const [pendingGeneration, setPendingGeneration] = useState<PendingGeneration | null>(null)
  const [resultJobId, setResultJobId] = useState<string | null>(null)
  const [showResult, setShowResult] = useState(false)
  const [showModelRouter, setShowModelRouter] = useState(false)
  const [showExport, setShowExport] = useState(false)
  const [showAgentDrawer, setShowAgentDrawer] = useState(false)
  const [showMobileAssets, setShowMobileAssets] = useState(false)
  const [showMobileInspector, setShowMobileInspector] = useState(false)
  const [assetSearch, setAssetSearch] = useState('')
  const [assetKind, setAssetKind] = useState<'all' | 'character' | 'product' | 'location' | 'style' | 'voice'>('all')
  const [toast, setToast] = useState<ToastMessage | null>(null)
  const [offline, setOffline] = useState(false)
    const [settings, setSettings] = useState<ShotInspectorSettings>({
    aspectRatio: '16:9',
    referenceWeight: 82,
    nativeAudio: true,
  })

  const selectedModel = useMemo(
    () => modelCatalog.find((model) => model.id === selectedModelId) ?? modelCatalog[0] ?? null,
    [modelCatalog, selectedModelId],
  )
  const selectedShot = useMemo(
    () => project?.shots.find((shot) => shot.id === selectedShotId) ?? project?.shots[0] ?? null,
    [project?.shots, selectedShotId],
  )
  const selectedPrompt = selectedShot
    ? promptByShotId[selectedShot.id] ?? selectedShot.prompt ?? defaultPrompt(project?.name ?? '', selectedShot)
    : ''
  const resultJob = useMemo(
    () => project?.jobs.find((job) => job.id === resultJobId) ?? null,
    [project?.jobs, resultJobId],
  )

  useEffect(() => {
    if (!project || modelsLoading || initializedProjectId.current === project.id) return
    initializedProjectId.current = project.id
    const storedBrief = safeRead(`${PROJECT_BRIEF_STORAGE_PREFIX}${project.id}`)
    const storedModel = safeRead(`flowos:selected-model:${project.id}`) ?? safeRead('flowos:selected-model')
    const nextBrief = initialBrief(project.name, storedBrief ?? project.description)
    const nextPrompts = Object.fromEntries(
      project.shots.map((shot) => [shot.id, shot.prompt ?? defaultPrompt(project.name, shot)]),
    )

    setGoal(storedBrief ?? project.description ?? `为「${project.name}」创建可交付的创作方案。`)
    setBrief(nextBrief)
    setPromptByShotId(nextPrompts)
    setDrafts(project.shots.length === 6 ? project.shots.map((shot) => ({ ...shot, accepted: true })) : [])
    setSelectedShotId(project.shots[0]?.id ?? null)
    setSelectedModelId(
      modelCatalog.some((model) => model.id === storedModel)
        ? storedModel as string
        : project.defaultModelVersionId ?? modelCatalog[0]?.id ?? '',
    )
    setMode(project.shots.length ? 'Canvas' : 'Agent')
  }, [modelCatalog, modelsLoading, project])

  useEffect(() => {
    if (modelsLoading || !modelCatalog.length) return
    if (modelCatalog.some((model) => model.id === selectedModelId)) return
    setSelectedModelId(modelCatalog.find((model) => model.status === 'available')?.id ?? modelCatalog[0].id)
  }, [modelCatalog, modelsLoading, selectedModelId])

  useEffect(() => {
    if (!project) return
    if (store.currentProjectId !== project.id) store.setCurrentProject(project.id)
  }, [project, store])

  useEffect(() => {
    if (!project) return
    if (selectedShotId && project.shots.some((shot) => shot.id === selectedShotId)) return
    setSelectedShotId(project.shots[0]?.id ?? null)
  }, [project, selectedShotId])

  useEffect(() => {
    const syncOnlineState = () => setOffline(typeof navigator !== 'undefined' ? !navigator.onLine : false)
    syncOnlineState()
    window.addEventListener('online', syncOnlineState)
    window.addEventListener('offline', syncOnlineState)
    return () => {
      window.removeEventListener('online', syncOnlineState)
      window.removeEventListener('offline', syncOnlineState)
    }
  }, [])

  useEffect(() => {
    if (!toast) return
    const timeout = window.setTimeout(() => setToast(null), 3600)
    return () => window.clearTimeout(timeout)
  }, [toast])

  const notify = (message: string, tone: ToastTone = 'default') => setToast({ message, tone })

  const selectShot = (shotId: string) => {
    setSelectedShotId(shotId)
    setShowMobileInspector(false)
  }

  const addCanvasShot = () => {
    if (!project) return
    const number = project.shots.length + 1
    const shot: Shot = {
      id: `shot-${Date.now()}`,
      number,
      title: `新镜头 ${String(number).padStart(2, '0')}`,
      duration: '5s',
      framing: 'MS',
      move: '静止',
      characters: '',
      dialogue: '',
      sound: '',
      image: '',
      version: 'v01',
      prompt: `为${project.name}设计第 ${number} 个镜头`,
    }
    store.upsertShot(shot)
    selectShot(shot.id)
    notify(`镜头 ${String(number).padStart(2, '0')} 已添加到画布。`, 'success')
  }

  const updatePrompt = (shotId: string, prompt: string) => {
    setPromptByShotId((current) => ({ ...current, [shotId]: prompt }))
    store.updateShot(shotId, { prompt })
  }

  const appendPromptToken = (token: string) => {
    if (!selectedShot) return
    const next = `${selectedPrompt}${selectedPrompt.trim() ? ' ' : ''}${token}`
    updatePrompt(selectedShot.id, next)
    notify(`已加入 ${token}`, 'success')
  }

  const chooseModel = (model: ModelVersion) => {
    setSelectedModelId(model.id)
    safeWrite('flowos:selected-model', model.id)
    if (project) safeWrite(`flowos:selected-model:${project.id}`, model.id)
    setShowModelRouter(false)
    notify(`模型路由已更新为 ${model.name}`, 'success')
  }

  const requestGeneration = (
    shotIds: readonly string[],
    source: PendingGeneration['source'] = 'toolbar',
    resolve?: () => void,
    reject?: (reason: Error) => void,
  ) => {
    if (!project || !selectedModel) return
    if (selectedModel.status !== 'available') {
      notify('所选模型正在维护，请在模型路由中选择可用模型。', 'warning')
      reject?.(new Error('所选模型正在维护'))
      return
    }
    const validShotIds = [...new Set(shotIds)].filter((shotId) => project.shots.some((shot) => shot.id === shotId))
    if (!validShotIds.length) {
      notify('请先创建或选择至少一个镜头。', 'warning')
      reject?.(new Error('没有可生成的镜头'))
      return
    }
    const prompts = Object.fromEntries(validShotIds.map((shotId) => {
      const shot = project.shots.find((candidate) => candidate.id === shotId) as Shot
      return [shotId, promptByShotId[shotId] ?? shot.prompt ?? defaultPrompt(project.name, shot)]
    }))
    const next: PendingGeneration = { shotIds: validShotIds, prompts, mediaType: 'video', source, resolve, reject }
    pendingGenerationRef.current = next
    setPendingGeneration(next)
  }

  const requestAgentGeneration = (acceptedDrafts: AgentShotDraft[]) => new Promise<void>((resolve, reject) => {
    requestGeneration(acceptedDrafts.filter((draft) => draft.accepted).map((draft) => draft.id), 'agent', resolve, reject)
  })

  const closeGenerationConfirm = () => {
    const current = pendingGenerationRef.current
    pendingGenerationRef.current = null
    setPendingGeneration(null)
    if (current?.source === 'agent') current.reject?.(new Error('已取消生成确认'))
  }

  const confirmGeneration = async () => {
    const current = pendingGenerationRef.current
    if (!current || !project || !selectedModel) return
    try {
      for (const shotId of current.shotIds) {
        const prompt = current.prompts[shotId]
        const referenceResultId = referenceResultByShotId[shotId]
          ?? project.shots.find((shot) => shot.id === shotId)?.selectedAssetVersionId
        store.updateShot(shotId, { prompt })
        await store.enqueueGeneration({
          shotId,
          prompt,
          modelId: selectedModel.id,
          modelName: selectedModel.name,
          mediaType: current.mediaType,
          estimatedCredits: parseCredits(selectedModel),
          parentResultId: referenceResultId,
          parameters: { aspectRatio: settings.aspectRatio, referenceWeight: settings.referenceWeight, nativeAudio: settings.nativeAudio },
        })
      }
      pendingGenerationRef.current = null
      setPendingGeneration(null)
      current.resolve?.()
      notify(`${current.shotIds.length} 个镜头已加入模拟队列。`, 'success')
      if (current.source === 'agent') setMode('Canvas')
    } catch (error) {
      current.reject?.(error instanceof Error ? error : new Error('任务提交失败'))
      throw error
    }
  }

  const updateDraft = (shotId: string, patch: AgentShotPatch) => {
    setDrafts((current) => current.map((draft) => draft.id === shotId ? { ...draft, ...patch } : draft))
    store.updateShot(shotId, patch)
    if (typeof patch.prompt === 'string') setPromptByShotId((current) => ({ ...current, [shotId]: patch.prompt as string }))
  }

  const planShots = (nextDrafts: AgentShotDraft[]) => {
    const shots = nextDrafts.map((draft) => {
      const shot: Shot = {
        id: draft.id,
        number: draft.number,
        title: draft.title,
        duration: draft.duration,
        framing: draft.framing,
        move: draft.move,
        characters: draft.characters,
        dialogue: draft.dialogue,
        sound: draft.sound,
        warning: draft.warning,
        image: draft.image,
        version: draft.version,
        sequenceId: draft.sequenceId,
        sceneId: draft.sceneId,
        prompt: draft.prompt,
        entityIds: draft.entityIds,
        selectedAssetVersionId: draft.selectedAssetVersionId,
        versionIds: draft.versionIds,
        continuityNotes: draft.continuityNotes,
        createdAt: draft.createdAt,
        updatedAt: draft.updatedAt,
      }
      return shot
    })
    store.replaceShots(shots)
    setDrafts(nextDrafts)
    setPromptByShotId((current) => ({
      ...current,
      ...Object.fromEntries(shots.map((shot) => [shot.id, shot.prompt ?? defaultPrompt(project?.name ?? '', shot)])),
    }))
    setSelectedShotId(shots[0]?.id ?? null)
    notify('6 个镜头已同步至 Canvas、Nodes、Storyboard 与 Timeline。', 'success')
  }

  const bindEntityToShot = (shotId: string, entityId: string) => {
    store.bindEntityToShot(shotId, entityId)
    const entity = project?.entities.find((candidate) => candidate.id === entityId)
    if (entity) appendPromptForShot(shotId, `@${entity.name}`)
  }

  const appendPromptForShot = (shotId: string, token: string) => {
    if (!project) return
    const shot = project.shots.find((candidate) => candidate.id === shotId)
    if (!shot) return
    const current = promptByShotId[shotId] ?? shot.prompt ?? defaultPrompt(project.name, shot)
    if (current.includes(token)) return
    updatePrompt(shotId, `${current}${current.trim() ? ' ' : ''}${token}`)
  }

  const openResult = (job: RepositoryGenerationJob) => {
    setResultJobId(job.id)
    setShowResult(true)
  }

  const openResultById = (jobId: string) => {
    const job = project?.jobs.find((candidate) => candidate.id === jobId)
    if (job) openResult(job)
  }

  const addToTimeline = async (jobId: string) => {
    store.addToTimeline({ jobId })
    notify('结果已加入 Video 轨道。', 'success')
  }

  const syncTimelineClips = (nextClips: TimelineClip[]) => {
    if (!project) return
    const previous = project.timelineClips
    queueMicrotask(() => {
      for (const next of nextClips) {
        const current = previous.find((clip) => clip.id === next.id)
        if (!current) continue
        if (current.trackId !== next.trackId || current.startMs !== next.startMs) {
          store.moveTimelineClip({ clipId: next.id, trackId: next.trackId, startMs: next.startMs })
        }
        if (current.trimStartMs !== next.trimStartMs || current.trimEndMs !== next.trimEndMs) {
          store.trimTimelineClip({
            clipId: next.id,
            trimStartMs: next.trimStartMs,
            trimEndMs: next.trimEndMs,
          })
        }
      }
    })
  }

  const queueExport = async (request: ExportRequest) => {
    if (!project || !selectedModel || !selectedShot) throw new Error('请先选择镜头和模型。')
    safeWrite(`flowos:export:${project.id}`, JSON.stringify({ ...request, queuedAt: new Date().toISOString() }))
    await store.enqueueGeneration({
      shotId: selectedShot.id,
      prompt: `[Export] ${project.name} · ${request.spec.label} · ${request.spec.resolution} · ${request.format}`,
      modelId: selectedModel.id,
      modelName: selectedModel.name,
      mediaType: 'video',
      estimatedCredits: 18,
    })
    notify(`${request.spec.label} 已进入导出队列。`, 'success')
  }

  const handleAgentInstruction = async (instruction: string) => {
    if (!project) return
    setGoal(instruction)
    safeWrite(`${PROJECT_BRIEF_STORAGE_PREFIX}${project.id}`, instruction)
    if (/一致性|连续性/.test(instruction)) {
      for (const shot of project.shots) {
        store.updateShot(shot.id, {
          warning: shot.warning ? `${shot.warning} · Agent 已标记复核` : 'Agent 建议在生成前复核实体锁定特征',
        })
      }
    }
    if (/成本|低/.test(instruction)) {
      const fastModel = modelCatalog.find((model) => model.status === 'available' && model.quality === 'Draft')
        ?? modelCatalog.find((model) => model.status === 'available')
        ?? selectedModel
      if (fastModel) chooseModel(fastModel)
    }
    notify('Agent 指令已同步到当前项目。', 'success')
  }

  const createSkill = async (input: CreateSkillInput) => {
    const key = `flowos:skills:${input.projectId}`
    const existing = JSON.parse(safeRead(key) ?? '[]') as Array<CreateSkillInput & { createdAt: string }>
    safeWrite(key, JSON.stringify([...existing, { ...input, createdAt: new Date().toISOString() }]))
    notify(`Skill「${input.name}」已保存。`, 'success')
  }

  const persistReview = (kind: string, value: unknown) => {
    if (!project || !selectedShot) return
    const key = `flowos:review:${project.id}:${selectedShot.id}:${kind}`
    safeWrite(key, JSON.stringify(value))
  }

  if (!store.hydrated) {
    return <WorkbenchLoading />
  }

  if (!project) {
    return <MissingProject projectId={projectId} />
  }

  const estimatedBatchCredits = parseCredits(selectedModel) * (pendingGeneration?.shotIds.length ?? 1)

  return (
    <AppShell compact>
      <div className="relative flex h-[100dvh] min-h-[420px] max-w-full flex-col overflow-hidden bg-[#0b0c0f]">
        <WorkbenchHeader
          projectName={project.name}
          activeBranch={project.branches.find((branch) => branch.id === project.activeBranchId)?.name ?? 'Main'}
          activeMode={mode}
          canGenerate={Boolean(selectedShot && selectedModel?.status === 'available')}
          onBack={() => router.push('/home')}
          onModeChange={setMode}
          onNewBranch={() => {
            const branch = store.branch({ name: `Branch ${project.branches.length + 1}` })
            notify(`已创建并切换到 ${branch.name}。`, 'success')
          }}
          onGenerate={() => selectedShot && requestGeneration([selectedShot.id], 'toolbar')}
          onOpenAssets={() => setShowMobileAssets(true)}
          onOpenInspector={() => setShowMobileInspector(true)}
        />

        {store.persistenceError && <p role="alert" className="shrink-0 border-b border-[#754452] bg-[#2c1d22] px-4 py-2 text-xs text-[#f2a7b3]">本地保存不可用，刷新后本次修改可能丢失。</p>}
        {modelsError && <p role="alert" className="shrink-0 border-b border-[#754452] bg-[#2c1d22] px-4 py-2 text-xs text-[#f2a7b3]">模型目录不可用：{modelsError}</p>}
        {offline && (
          <div role="status" className="flex shrink-0 items-center gap-2 border-b border-[#735d2f] bg-[#2d2618] px-3 py-2 text-[11px] text-[#f3d082] sm:px-4">
            <AlertTriangle size={14} aria-hidden="true" />
            当前离线：你仍可查看和编辑本地项目，模拟队列将在恢复网络后继续刷新。
          </div>
        )}

        <div className="flex min-h-0 flex-1 overflow-hidden">
          <AssetShelf
            project={project}
            search={assetSearch}
            kind={assetKind}
            selectedShotId={selectedShot?.id}
            onSearchChange={setAssetSearch}
            onKindChange={setAssetKind}
            onBind={(entityId) => {
              if (!selectedShot) {
                notify('先选择一个镜头，再绑定资产。', 'warning')
                return
              }
              bindEntityToShot(selectedShot.id, entityId)
              notify('资产已作为引用绑定到所选镜头。', 'success')
            }}
            className="hidden w-[248px] shrink-0 lg:flex"
          />

          <div className="flex min-w-0 flex-1 flex-col overflow-hidden bg-[#0d0f13]">

            <section className="flex min-h-0 flex-1 flex-col overflow-hidden">
              {mode === 'Agent' && (
                <AgentWorkspace
                  project={project}
                  goal={goal}
                  brief={brief}
                  drafts={drafts}
                  models={modelCatalog}
                  selectedModelId={selectedModelId}
                  onGoalChange={setGoal}
                  onBriefChange={setBrief}
                  onPlanShots={planShots}
                  onUpdateDraft={updateDraft}
                  onAcceptDraft={(shotId, accepted) => setDrafts((current) => current.map((draft) => draft.id === shotId ? { ...draft, accepted } : draft))}
                  onSelectModel={setSelectedModelId}
                  onGenerate={requestAgentGeneration}
                />
              )}
              {mode === 'Canvas' && (
                <CanvasWorkspace
                  project={project}
                  selectedShotId={selectedShot?.id}
                  onSelectShot={selectShot}
                  onOpenResult={openResult}
                  onGenerate={(shotId) => requestGeneration([shotId], 'canvas')}
                  onModeChange={setMode}
                  onOpenAgent={() => setShowAgentDrawer(true)}
                  onAddShot={addCanvasShot}
                  onGenerateMany={(shotIds) => requestGeneration(shotIds, 'canvas')}
                  onBindEntity={bindEntityToShot}
                />
              )}
              {mode === 'Nodes' && selectedShot && (
                <NodesWorkspace
                  project={project}
                  selectedShotId={selectedShot.id}
                  prompt={selectedPrompt}
                  models={modelCatalog}
                  selectedModelId={selectedModelId}
                  onSelectShot={selectShot}
                  onPromptChange={(prompt) => updatePrompt(selectedShot.id, prompt)}
                  onSelectModel={setSelectedModelId}
                  onCreateSkill={createSkill}
                />
              )}
              {mode === 'Storyboard' && selectedShot && (
                <StoryboardWorkspace
                  project={project}
                  selectedShotId={selectedShot.id}
                  onSelectShot={selectShot}
                  onUpdateShot={store.updateShot}
                />
              )}
              {mode === 'Timeline' && (
                <TimelineWorkspace
                  project={project}
                  onExport={() => setShowExport(true)}
                  onOpenResult={openResultById}
                  onClipsChange={syncTimelineClips}
                />
              )}
              {mode === 'Review' && selectedShot && (
                <ReviewWorkspace
                  shot={selectedShot}
                  onDecisionChange={(decision: ReviewDecision) => {
                    persistReview('decision', decision)
                    notify(decision === 'approved' ? '当前版本已批准。' : '当前版本已标记为需要修改。', decision === 'approved' ? 'success' : 'warning')
                  }}
                  onCommentAdd={(comment: ReviewComment) => {
                    persistReview(`comment:${comment.id}`, comment)
                    notify('批注已保存到本地评审记录。', 'success')
                  }}
                  onAnnotationAdd={(annotation: ReviewAnnotation) => persistReview(`annotation:${annotation.id}`, annotation)}
                />
              )}
              {!selectedShot && mode !== 'Agent' && mode !== 'Timeline' && (
                <EmptyWorkspace onOpenAgent={() => setMode('Agent')} />
              )}
            </section>

            <JobQueue
              jobs={project.jobs}
              timelineClips={project.timelineClips}
              tracks={project.tracks}
              initiallyCollapsed
              onCancel={async (jobId) => { await store.cancel(jobId) }}
              onRetry={async (jobId) => { await store.retry(jobId) }}
              onOpenResult={openResult}
              onAddToTimeline={addToTimeline}
              onOpenTimeline={() => setMode('Timeline')}
            />
          </div>

          {selectedShot && (
            <ShotInspector
              projectName={project.name}
              shot={selectedShot}
              prompt={selectedPrompt}
              model={selectedModel}
              entities={project.entities}
              settings={settings}
              onPromptChange={(prompt) => updatePrompt(selectedShot.id, prompt)}
              onAddToken={appendPromptToken}
              onOpenModelRouter={() => setShowModelRouter(true)}
              onSettingsChange={setSettings}
              onGenerate={() => requestGeneration([selectedShot.id], 'toolbar')}
              className="hidden w-[320px] shrink-0 xl:flex"
            />
          )}
        </div>


        {showMobileAssets && (
          <MobilePanel title="资产架" onClose={() => setShowMobileAssets(false)}>
            <AssetShelf
              project={project}
              search={assetSearch}
              kind={assetKind}
              selectedShotId={selectedShot?.id}
              onSearchChange={setAssetSearch}
              onKindChange={setAssetKind}
              onBind={(entityId) => {
                if (selectedShot) bindEntityToShot(selectedShot.id, entityId)
                else notify('先选择一个镜头，再绑定资产。', 'warning')
              }}
              className="flex h-full w-full"
            />
          </MobilePanel>
        )}

        {showMobileInspector && selectedShot && (
          <MobilePanel title={`镜头 ${String(selectedShot.number).padStart(2, '0')} 检查器`} onClose={() => setShowMobileInspector(false)}>
            <ShotInspector
              projectName={project.name}
              shot={selectedShot}
              prompt={selectedPrompt}
              model={selectedModel}
              entities={project.entities}
              settings={settings}
              onPromptChange={(prompt) => updatePrompt(selectedShot.id, prompt)}
              onAddToken={appendPromptToken}
              onOpenModelRouter={() => { setShowMobileInspector(false); setShowModelRouter(true) }}
              onSettingsChange={setSettings}
              onGenerate={() => { setShowMobileInspector(false); requestGeneration([selectedShot.id], 'toolbar') }}
              className="flex h-full w-full"
            />
          </MobilePanel>
        )}

        <GenerationConfirmModal
          open={Boolean(pendingGeneration)}
          onClose={closeGenerationConfirm}
          onConfirm={confirmGeneration}
          model={selectedModel}
          shot={pendingGeneration ? project.shots.find((shot) => shot.id === pendingGeneration.shotIds[0]) ?? null : null}
          prompt={pendingGeneration ? pendingGeneration.prompts[pendingGeneration.shotIds[0]] : undefined}
          mediaType={pendingGeneration?.mediaType}
          estimate={{
            credits: estimatedBatchCredits,
            currency: `¥${(estimatedBatchCredits * 0.22).toFixed(2)}`,
            timeRange: pendingGeneration && pendingGeneration.shotIds.length > 1 ? `约 ${pendingGeneration.shotIds.length * 25}–${pendingGeneration.shotIds.length * 55} 秒` : selectedModel?.speed,
            outputSpec: `${pendingGeneration?.shotIds.length ?? 1} 个镜头 · 视频 · ${selectedModel?.resolution ?? '1080p'}`,
            license: selectedModel?.policy,
          }}
        />

        <ModelRouterDrawer
          open={showModelRouter}
          onClose={() => setShowModelRouter(false)}
          models={modelCatalog}
          selectedModelId={selectedModelId}
          onSelect={(model) => chooseModel(model)}
        />

        <ResultDetailModal
          open={showResult}
          onClose={() => setShowResult(false)}
          job={resultJob}
          lineage={project.lineage}
          onCompare={(job) => {
            selectShot(job.shotId)
            setMode('Review')
            setShowResult(false)
          }}
          onBranch={(job) => {
            const branch = store.branch({ fromJobId: job.id })
            notify(`已从结果创建 ${branch.name}。`, 'success')
          }}
          onRemix={(job) => {
            const remix = store.remix({ fromJobId: job.id })
            setShowResult(false)
            router.push(`/project/${encodeURIComponent(remix.id)}`)
          }}
          onUseAsReference={(job) => {
            if (!job.output) return
            store.updateShot(selectedShot?.id ?? job.shotId, { selectedAssetVersionId: job.output.id })
            setReferenceResultByShotId((current) => ({ ...current, [selectedShot?.id ?? job.shotId]: job.output!.id }))
            notify('已将结果设为下一次生成的父引用。', 'success')
          }}
          onAddToTimeline={(job) => addToTimeline(job.id)}
          onPublish={(job) => {
            safeWrite(`flowos:published:${project.id}:${job.id}`, new Date().toISOString())
            notify('结果已标记为公开发布，保留 Recipe 与 AI 标识。', 'success')
          }}
        />

        <ExportModal open={showExport} onClose={() => setShowExport(false)} onQueue={queueExport} />

        <AgentDrawer
          open={showAgentDrawer}
          onClose={() => setShowAgentDrawer(false)}
          selectionLabel={selectedShot ? `镜头 ${String(selectedShot.number).padStart(2, '0')} · ${selectedShot.title}` : project.name}
          onSubmit={handleAgentInstruction}
          onSuggestedAction={(suggestion) => handleAgentInstruction(suggestion.prompt)}
        />

        {toast && <Toast message={toast.message} tone={toast.tone} />}
      </div>
    </AppShell>
  )
}

function WorkbenchHeader({
  projectName,
  activeBranch,
  activeMode,
  canGenerate,
  onBack,
  onModeChange,
  onNewBranch,
  onGenerate,
  onOpenAssets,
  onOpenInspector,
}: {
  projectName: string
  activeBranch: string
  activeMode: WorkbenchMode
  canGenerate: boolean
  onBack: () => void
  onModeChange: (mode: WorkbenchMode) => void
  onNewBranch: () => void
  onGenerate: () => void
  onOpenAssets: () => void
  onOpenInspector: () => void
}) {
  return (
    <header className="workbench-header" aria-label="项目工具栏">
      <button type="button" onClick={onBack} className="focus-ring grid h-10 w-10 shrink-0 place-items-center rounded-md text-[var(--muted)]" aria-label="返回项目首页" title="返回项目首页"><ArrowLeft size={18} /></button>
      <div className="min-w-0 flex-1 xl:max-w-[200px]">
        <div className="text-[11px] text-[var(--muted)]">FlowOS / 项目</div>
        <h1 className="truncate text-sm font-semibold" title={projectName}>{projectName}</h1>
      </div>
      <button type="button" onClick={onNewBranch} className="focus-ring hidden h-10 items-center gap-2 rounded-md border border-[var(--line)] px-3 text-xs lg:flex" title="从当前状态创建分支"><GitBranch size={15} />{activeBranch}<Plus size={13} /></button>
      <nav aria-label="工作台模式" className="workbench-modes scrollbar">
        <div>{modes.map((mode) => <button key={mode} type="button" onClick={() => onModeChange(mode)} aria-current={activeMode === mode ? 'page' : undefined} className="focus-ring text-xs">
          {{ Agent: '创意规划', Canvas: '画布', Nodes: '节点', Storyboard: '分镜', Timeline: '时间线', Review: '评审' }[mode]}
        </button>)}</div>
      </nav>
      <div className="ml-auto flex shrink-0 items-center gap-1">
        <ThemeToggle />
        <button type="button" onClick={onOpenAssets} className="focus-ring grid h-10 w-10 place-items-center rounded-md text-[var(--muted)] lg:hidden" aria-label="打开资产架" title="资产架"><PanelLeft size={18} /></button>
        <button type="button" onClick={onOpenInspector} className="focus-ring grid h-10 w-10 place-items-center rounded-md text-[var(--muted)] xl:hidden" aria-label="打开镜头检查器" title="镜头参数"><Settings2 size={18} /></button>
        <button type="button" disabled={!canGenerate} onClick={onGenerate} className="focus-ring inline-flex h-10 items-center gap-2 rounded-md bg-[var(--cyan)] px-3 text-xs font-semibold text-[var(--on-accent)] disabled:opacity-45" aria-label="生成" title="生成所选镜头"><Sparkles size={16} /><span className="hidden sm:inline">生成</span></button>
      </div>
    </header>
  )
}

function AssetShelf({
  project,
  search,
  kind,
  selectedShotId,
  onSearchChange,
  onKindChange,
  onBind,
  className,
}: {
  project: NonNullable<ReturnType<typeof useProjectStore>['currentProject']>
  search: string
  kind: 'all' | 'character' | 'product' | 'location' | 'style' | 'voice'
  selectedShotId?: string
  onSearchChange: (value: string) => void
  onKindChange: (value: 'all' | 'character' | 'product' | 'location' | 'style' | 'voice') => void
  onBind: (entityId: string) => void
  className?: string
}) {
  const entities = project.entities.filter((entity) => {
    const matchesKind = kind === 'all' || entity.kind === kind
    const query = search.trim().toLowerCase()
    const matchesSearch = !query || `${entity.name} ${entity.description} ${entity.tags.join(' ')}`.toLowerCase().includes(query)
    return matchesKind && matchesSearch
  })
  const labels: Array<{ id: typeof kind; label: string }> = [
    { id: 'all', label: '全部' }, { id: 'character', label: '角色' }, { id: 'product', label: '产品' },
    { id: 'location', label: '场景' }, { id: 'style', label: '风格' }, { id: 'voice', label: '声音' },
  ]

  return (
    <aside className={`min-h-0 flex-col overflow-hidden border-r border-[#252832] bg-[#111318] ${className ?? ''}`} aria-label="资产架">
      <div className="flex shrink-0 items-center justify-between px-3 pb-2 pt-3">
        <div>
            <div className="text-xs font-medium text-[#eef2f6]">资产架</div>
          <div className="mt-0.5 text-[10px] text-[var(--muted)]">{selectedShotId ? '拖入或点击绑定到所选镜头' : '先在工作区选择镜头'}</div>
        </div>
        <span className="rounded bg-[#20252d] px-1.5 py-0.5 text-[10px] text-[var(--muted)]">{project.entities.length}</span>
      </div>
      <div className="shrink-0 px-3 pb-2">
        <label className="flex h-8 items-center gap-2 rounded-md border border-[#2c313b] bg-[#191c22] px-2 text-[var(--muted)]">
          <Search size={13} aria-hidden="true" />
          <span className="sr-only">搜索资产</span>
          <input value={search} onChange={(event) => onSearchChange(event.target.value)} placeholder="搜索资产" className="min-w-0 flex-1 bg-transparent text-[11px] text-white outline-none placeholder:text-[var(--muted)]" />
        </label>
      </div>
      <div className="flex shrink-0 gap-1 overflow-x-auto px-3 pb-2 scrollbar">
        {labels.map((label) => (
          <button key={label.id} type="button" onClick={() => onKindChange(label.id)} aria-pressed={kind === label.id} className={`focus-ring shrink-0 rounded px-1.5 py-1 text-[10px] ${kind === label.id ? 'bg-[#20333a] text-[#6feaff]' : 'bg-[#1a1d23] text-[var(--muted)] hover:text-white'}`}>{label.label}</button>
        ))}
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-3 scrollbar">
        {entities.map((entity) => (
          <button
            key={entity.id}
            type="button"
            draggable
            onDragStart={(event) => {
              event.dataTransfer.setData('application/x-flowos-entity-id', entity.id)
              event.dataTransfer.setData('text/plain', `entity:${entity.id}`)
              event.dataTransfer.effectAllowed = 'link'
            }}
            onClick={() => onBind(entity.id)}
            className="focus-ring mt-1 flex w-full min-w-0 items-center gap-2 rounded-lg p-2 text-left hover:bg-[#1b1f26]"
            title={`拖动或点击绑定 ${entity.name}`}
          >
            <div className="h-9 w-9 shrink-0 overflow-hidden rounded-md bg-[#222731]" style={{ boxShadow: `inset 2px 0 ${entity.color}` }}>
              {entity.image ? <PreviewImage src={entity.image} alt="" className="h-full w-full object-cover" /> : <Layers3 size={15} className="m-3 text-[var(--muted)]" aria-hidden="true" />}
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-[11px] font-medium text-[#e6ebf1]">{entity.name}</div>
              <div className="mt-0.5 truncate text-[10px] text-[var(--muted)]">{entity.kind} · v1</div>
            </div>
            <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: entity.color }} aria-hidden="true" />
          </button>
        ))}
        {!entities.length && <div className="px-3 py-10 text-center text-[11px] text-[var(--muted)]">没有匹配的资产</div>}
      </div>
    </aside>
  )
}

function ShotInspector({
  projectName,
  shot,
  prompt,
  model,
  entities,
  settings,
  onPromptChange,
  onAddToken,
  onOpenModelRouter,
  onSettingsChange,
  onGenerate,
  className,
}: {
  projectName: string
  shot: Shot
  prompt: string
  model: ModelVersion | null
  entities: Array<{ id: string; name: string; kind: string }>
  settings: ShotInspectorSettings
  onPromptChange: (value: string) => void
  onAddToken: (token: string) => void
  onOpenModelRouter: () => void
  onSettingsChange: (settings: ShotInspectorSettings) => void
  onGenerate: () => void
  className?: string
}) {
  const tokenEntities = entities.filter((entity) => ['character', 'product', 'location'].includes(entity.kind)).slice(0, 4)
  return (
    <aside className={`min-h-0 flex-col overflow-hidden border-l border-[#252832] bg-[#111318] ${className ?? ''}`} aria-label="镜头检查器">
      <div className="flex shrink-0 items-center justify-between border-b border-[#252832] px-4 py-3">
        <div className="min-w-0">
          <div className="text-[10px] uppercase tracking-[0.14em] text-[var(--muted)]">检查器</div>
          <div className="mt-0.5 truncate text-xs font-medium">Shot {String(shot.number).padStart(2, '0')} · {shot.title}</div>
        </div>
        <span className="rounded bg-[#20252d] px-1.5 py-1 text-[10px] text-[#aeb7c3]">{shot.version}</span>
      </div>
      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4 scrollbar">
        <section>
          <div className="flex items-center justify-between">
            <label htmlFor={`prompt-${shot.id}`} className="text-[10px] font-medium uppercase tracking-[0.14em] text-[var(--muted)]">提示词编辑</label>
            <span className="text-[10px] text-[var(--muted)]">@角色 #风格 /工具</span>
          </div>
          <textarea id={`prompt-${shot.id}`} value={prompt} onChange={(event) => onPromptChange(event.target.value)} rows={6} className="focus-ring mt-2 w-full resize-y rounded-lg border border-[#303641] bg-[#191c22] p-2.5 text-[11px] leading-5 text-[#dce2e9] placeholder:text-[var(--muted)]" aria-label={`镜头 ${shot.number} 提示词`} />
          <div className="mt-2 flex flex-wrap gap-1.5">
            {tokenEntities.map((entity) => <button key={entity.id} type="button" onClick={() => onAddToken(`@${entity.name}`)} className="focus-ring rounded border border-[#304c55] bg-[#172a30] px-1.5 py-1 text-[10px] text-[#7be9ff] hover:bg-[#203c45]">@{entity.name}</button>)}
            <button type="button" onClick={() => onAddToken('#雨幕蓝调')} className="focus-ring rounded border border-[#493b70] bg-[#241d36] px-1.5 py-1 text-[10px] text-[#b6a6ff] hover:bg-[#30264a]">#雨幕蓝调</button>
            <button type="button" onClick={() => onAddToken('/refine')} className="focus-ring rounded border border-[#3b414d] bg-[#20242b] px-1.5 py-1 text-[10px] text-[#afb8c5] hover:bg-[#292f39]">/refine</button>
          </div>
        </section>

        <section>
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-medium uppercase tracking-[0.14em] text-[var(--muted)]">Model route</span>
            <button type="button" onClick={onOpenModelRouter} className="focus-ring rounded px-1.5 py-1 text-[10px] text-[#58e4ff] hover:bg-[#1a3037]">更改</button>
          </div>
          <button type="button" onClick={onOpenModelRouter} className="focus-ring mt-2 w-full rounded-lg border border-[#303641] bg-[#191c22] p-3 text-left hover:border-[#4d5968]">
            <div className="flex items-center justify-between gap-2"><span className="truncate text-xs text-[#e7ecf2]">{model?.name ?? '选择模型'}</span><span className={model?.status === 'maintenance' ? 'text-[10px] text-[#f5c36c]' : 'text-[10px] text-[#84dca9]'}>{model?.status === 'maintenance' ? '维护中' : model?.quality}</span></div>
            <div className="mt-1.5 flex flex-wrap gap-x-2 text-[10px] text-[var(--muted)]"><span>{model?.cost}</span><span>{model?.speed}</span><span>{model?.resolution}</span></div>
            <p className="mt-2 text-[10px] leading-4 text-[var(--muted)]">{model?.reason}</p>
          </button>
        </section>

        <section className="grid grid-cols-2 gap-2">
          <InspectorField label="画幅"><select aria-label="画幅" value={settings.aspectRatio} onChange={(event) => onSettingsChange({ ...settings, aspectRatio: event.target.value })} className="focus-ring w-full bg-transparent text-xs outline-none"><option>16:9</option><option>9:16</option><option>1:1</option><option>2.39:1</option></select></InspectorField>
          <InspectorField label="时长"><span>{shot.duration}</span></InspectorField>
          <InspectorField label="景别"><span>{shot.framing}</span></InspectorField>
          <InspectorField label="运镜"><span>{shot.move}</span></InspectorField>
        </section>

        <section className="rounded-lg border border-[#2c343f] bg-[#171a20] p-3">
          <div className="flex items-center justify-between text-[10px] font-medium uppercase tracking-[0.12em] text-[var(--muted)]"><span>Reference weight</span><span className="text-[#65e7ff]">{settings.referenceWeight}%</span></div>
          <input type="range" min="0" max="100" value={settings.referenceWeight} onChange={(event) => onSettingsChange({ ...settings, referenceWeight: Number(event.target.value) })} className="mt-2 w-full accent-[#4ee1ff]" aria-label="引用素材权重" />
          <label className="mt-2 flex cursor-pointer items-center justify-between text-[11px] text-[#b6bec9]"><span>Native audio</span><input type="checkbox" checked={settings.nativeAudio} onChange={(event) => onSettingsChange({ ...settings, nativeAudio: event.target.checked })} className="h-4 w-4 accent-[#4ee1ff]" /></label>
        </section>

        <section className="rounded-lg border border-[#28533f] bg-[#14231d] p-3">
          <div className="flex items-center gap-2 text-xs font-medium text-[#8ce0b1]"><Check size={14} aria-hidden="true" />{model?.policy ?? 'Commercial safe'}</div>
          <p className="mt-1.5 text-[10px] leading-4 text-[var(--muted)]">{projectName} 的结果会保留 Recipe、许可、seed 和 AI 标识。</p>
        </section>
      </div>
      <div className="shrink-0 border-t border-[#252832] p-3">
        <button type="button" onClick={onGenerate} disabled={model?.status !== 'available'} className="focus-ring flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-[#4ee1ff] text-xs font-semibold text-[#071014] hover:bg-[#88edff] disabled:cursor-not-allowed disabled:opacity-45"><Sparkles size={15} aria-hidden="true" />生成此镜头 · Estimate {parseCredits(model)} cr</button>
      </div>
    </aside>
  )
}

function InspectorField({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="min-w-0 rounded-lg border border-[#2d333d] bg-[#191c22] p-2"><div className="text-[9px] text-[var(--muted)]">{label}</div><div className="mt-1 truncate text-[11px] text-[#d7dde5]">{children}</div></div>
}

function MobilePanel({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  const dialogRef = useAccessibleDialog(true, onClose)
  return (
    <div className="fixed inset-0 z-40 bg-black/60 xl:hidden" role="presentation" onMouseDown={onClose}>
      <div ref={dialogRef} tabIndex={-1} role="dialog" aria-modal="true" aria-label={title} onMouseDown={(event) => event.stopPropagation()} className="absolute bottom-0 right-0 top-0 flex w-full max-w-[390px] flex-col border-l border-[#303641] bg-[#111318] shadow-2xl">
        <header className="flex h-14 shrink-0 items-center justify-between border-b border-[#252832] px-4"><span className="text-sm font-medium">{title}</span><button type="button" onClick={onClose} className="focus-ring rounded-md px-2 py-1 text-xs text-[var(--muted)] hover:bg-[#20252d]">关闭</button></header>
        <div className="min-h-0 flex-1 overflow-hidden">{children}</div>
      </div>
    </div>
  )
}

function Toast({ message, tone }: ToastMessage) {
  const color = tone === 'error' ? 'border-[#7a3343] bg-[#3a1b25] text-[#ffb0bd]' : tone === 'warning' ? 'border-[#755b29] bg-[#332914] text-[#f7d385]' : tone === 'success' ? 'border-[#285a42] bg-[#142b20] text-[#9be3ba]' : 'border-[#285766] bg-[#14272e] text-[#a5eefc]'
  return <div role="status" className={`fixed bottom-20 left-1/2 z-50 max-w-[calc(100%-32px)] -translate-x-1/2 rounded-lg border px-3 py-2 text-center text-[11px] shadow-2xl ${color}`}>{message}</div>
}

function WorkbenchLoading() {
  return <AppShell compact><div className="flex h-[100dvh] flex-col bg-[#0b0c0f]" aria-busy="true" aria-label="正在加载项目工作台"><div className="h-14 animate-pulse border-b border-[#252832] bg-[#111318]" /><div className="flex min-h-0 flex-1"><div className="hidden w-[248px] border-r border-[#252832] bg-[#111318] lg:block" /><div className="flex-1 p-5"><div className="h-7 w-48 animate-pulse rounded bg-[#20242b]" /><div className="mt-5 grid grid-cols-2 gap-4 lg:grid-cols-3">{Array.from({ length: 6 }, (_, index) => <div key={index} className="aspect-[4/3] animate-pulse rounded-xl bg-[#191c22]" />)}</div></div><div className="hidden w-[320px] border-l border-[#252832] bg-[#111318] xl:block" /></div></div></AppShell>
}

function MissingProject({ projectId }: { projectId?: string }) {
  return <AppShell compact><main className="grid min-h-[100dvh] place-items-center bg-[#0b0c0f] p-5"><section className="max-w-md rounded-xl border border-[#303641] bg-[#15171c] p-6 text-center"><AlertTriangle className="mx-auto text-[#f4c46d]" size={24} aria-hidden="true" /><h1 className="mt-3 text-base font-semibold">找不到这个项目</h1><p className="mt-2 text-xs leading-5 text-[var(--muted)]">项目 ID「{projectId ?? 'unknown'}」不存在、已被归档，或当前没有访问权限。</p><Link href="/projects" className="focus-ring mt-5 inline-flex rounded-lg bg-[#4ee1ff] px-3 py-2 text-xs font-semibold text-[#071014]">返回项目列表</Link></section></main></AppShell>
}

function EmptyWorkspace({ onOpenAgent }: { onOpenAgent: () => void }) {
  return <div className="grid h-full place-items-center p-6"><div className="max-w-sm text-center"><Bot className="mx-auto text-[var(--muted)]" size={24} aria-hidden="true" /><h2 className="mt-3 text-sm font-medium">从 Agent 创建第一个镜头</h2><p className="mt-2 text-xs leading-5 text-[var(--muted)]">Agent 会将你的目标拆成 Brief、实体清单、六个镜头和模型路由建议。</p><button type="button" onClick={onOpenAgent} className="focus-ring mt-4 inline-flex items-center gap-2 rounded-lg bg-[#4ee1ff] px-3 py-2 text-xs font-semibold text-[#071014]"><Bot size={14} aria-hidden="true" />打开 Agent</button></div></div>
}
