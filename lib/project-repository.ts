import { models as defaultModels, project as demoProject } from './mock'
import type {
  GenerationJob,
  MediaType,
  ModelVersion,
  Project,
  Recipe,
  Shot,
  TimelineTrack,
} from './types'
import {
  MockProviderAdapter,
  ProviderAdapterRegistry,
  getFailureMessage,
  stableHash,
  type GenerationFailureCode,
  type ProviderGenerationRequest,
  type ProviderJobHandle,
  type ProviderJobUpdate,
} from './provider-adapter'

export const PROJECT_REPOSITORY_STORAGE_KEY = 'flowos:projects:v1'
const STORAGE_SCHEMA_VERSION = 1 as const

export interface StorageLike {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
  removeItem(key: string): void
}

export interface ProjectBranch {
  id: string
  name: string
  parentBranchId?: string
  sourceJobId?: string
  createdAt: string
}

export interface GeneratedOutput {
  id: string
  assetId: string
  projectId: string
  branchId: string
  shotId: string
  jobId: string
  mediaType: MediaType
  previewUrl?: string
  width?: number
  height?: number
  durationMs?: number
  createdAt: string
  recipe: Recipe & {
    modelVersion: string
    entityIds: string[]
    parameters: Record<string, string | number | boolean>
    parentResultId?: string
    credits: number
    elapsedMs: number
    aiDisclosure: boolean
  }
}

export interface RepositoryGenerationJob extends GenerationJob {
  shotId: string
  branchId: string
  providerId: string
  modelId: string
  prompt: string
  mediaType: MediaType
  seed: number
  attempt: number
  createdAt: string
  updatedAt: string
  startedAt?: string
  completedAt?: string
  failureCode?: GenerationFailureCode
  retryOf?: string
  parentResultId?: string
  request: ProviderGenerationRequest
  providerHandle: ProviderJobHandle
  output?: GeneratedOutput
}

export interface TimelineClip {
  id: string
  trackId: string
  sourceJobId: string
  outputId: string
  shotId: string
  name: string
  startMs: number
  durationMs: number
  trimStartMs: number
  trimEndMs: number
  createdAt: string
}

export interface ProjectLineageEntry {
  id: string
  relationship: 'branch' | 'remix'
  sourceProjectId: string
  sourceBranchId: string
  sourceJobId?: string
  sourceOutputId?: string
  createdAt: string
}

export interface RepositoryProject extends Omit<Project, 'jobs'> {
  jobs: RepositoryGenerationJob[]
  /** Project-level result index. Job.output remains the canonical write location. */
  outputs: GeneratedOutput[]
  branches: ProjectBranch[]
  activeBranchId: string
  timelineClips: TimelineClip[]
  lineage: ProjectLineageEntry[]
  createdAt: string
  updatedAtIso: string
}

export interface CreateProjectInput {
  name: string
  type: string
  outputLanguage?: Project['outputLanguage']
  id?: string
  entities?: Project['entities']
  shots?: Shot[]
  tracks?: TimelineTrack[]
  sourceProjectId?: string
}

export type ShotPatch = Partial<Omit<Shot, 'id' | 'number'>> & { number?: number }

export interface EnqueueGenerationInput {
  shotId: string
  prompt: string
  modelId: string
  modelName?: string
  mediaType?: MediaType
  providerId?: string
  seed?: number
  estimatedCredits?: number
  forceFailure?: GenerationFailureCode
  parentResultId?: string
  retryOf?: string
  attempt?: number
  parameters?: Record<string, string | number | boolean>
}

export interface AddToTimelineInput {
  jobId: string
  trackId?: string
  startMs?: number
  durationMs?: number
  name?: string
}

export interface MoveTimelineClipInput {
  clipId: string
  trackId?: string
  startMs: number
}

export interface TrimTimelineClipInput {
  clipId: string
  trimStartMs?: number
  trimEndMs?: number
}

export interface BranchInput {
  name?: string
  fromJobId?: string
  switchToBranch?: boolean
}

export interface RemixInput {
  name?: string
  fromJobId?: string
}

export interface ProjectRepositorySnapshot {
  projects: readonly RepositoryProject[]
  currentProjectId: string | null
  hydrated: boolean
  revision: number
  persistenceError: string | null
}

interface StoredRepositoryState {
  schemaVersion: typeof STORAGE_SCHEMA_VERSION
  projects: RepositoryProject[]
  currentProjectId: string | null
  sequence: number
}

export interface ProjectRepositoryOptions {
  storage?: StorageLike
  storageKey?: string
  providers?: ProviderAdapterRegistry
  models?: ModelVersion[]
  initialProjects?: Project[]
  now?: () => number
}

export type ProjectRepositoryListener = () => void

function clone<T>(value: T): T {
  if (typeof structuredClone === 'function') return structuredClone(value)
  return JSON.parse(JSON.stringify(value)) as T
}

function iso(nowMs: number): string {
  return new Date(nowMs).toISOString()
}

function formatEta(etaMs: number): string {
  if (etaMs <= 0) return '完成'
  if (etaMs < 1_000) return '不到 1 秒'
  return `约 ${Math.ceil(etaMs / 1_000)} 秒`
}

function slugify(value: string): string {
  const slug = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fff]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48)
  return slug || 'untitled-project'
}

function parseDurationMs(duration: string): number {
  const seconds = Number.parseFloat(duration)
  return Number.isFinite(seconds) && seconds > 0 ? seconds * 1_000 : 5_000
}

function defaultTracks(): TimelineTrack[] {
  return [
    { id: 'video', type: 'video', name: 'Video · 主画面', color: '#4EE1FF', clips: 0 },
    { id: 'dialogue', type: 'dialogue', name: 'Dialogue · 对白', color: '#7C5CFF', clips: 0 },
    { id: 'music', type: 'music', name: 'Music · 音乐', color: '#F29E4C', clips: 0 },
    { id: 'sfx', type: 'sfx', name: 'SFX · 音效', color: '#56C596', clips: 0 },
    { id: 'captions', type: 'captions', name: 'Captions · 字幕', color: '#E8D44D', clips: 0 },
  ]
}

function trackTypeForMedia(mediaType: MediaType): TimelineTrack['type'] {
  return mediaType === 'audio' ? 'dialogue' : 'video'
}

function isStoredState(value: unknown): value is StoredRepositoryState {
  if (!value || typeof value !== 'object') return false
  const candidate = value as Partial<StoredRepositoryState>
  return candidate.schemaVersion === STORAGE_SCHEMA_VERSION
    && Array.isArray(candidate.projects)
    && typeof candidate.sequence === 'number'
    && (candidate.currentProjectId === null || typeof candidate.currentProjectId === 'string')
}

function findShot(project: RepositoryProject, shotId: string): Shot {
  const shot = project.shots.find((candidate) => candidate.id === shotId)
  if (!shot) throw new Error(`Shot not found: ${shotId}`)
  return shot
}

function collectOutputs(jobs: readonly RepositoryGenerationJob[]): GeneratedOutput[] {
  return jobs
    .flatMap((job) => job.output ? [job.output] : [])
    .sort((first, second) => second.createdAt.localeCompare(first.createdAt))
}

function fallbackProviderHandle(job: GenerationJob, projectId: string, nowMs: number): ProviderJobHandle {
  const hash = stableHash(`${projectId}:${job.id}:${job.shot}:${job.model}`)
  const durationMs = 12_000
  const progress = Math.max(0, Math.min(100, job.progress))
  const submittedAtMs = nowMs - Math.floor((progress / 100) * durationMs)
  const statusOutcome = job.status === 'failed' ? 'failed' : 'succeeded'
  return {
    id: `legacy-${hash.toString(36)}`,
    providerId: 'flowos-mock',
    requestHash: hash,
    submittedAtMs,
    startsAtMs: submittedAtMs + 800,
    completesAtMs: submittedAtMs + durationMs,
    outcome: statusOutcome,
    failureCode: job.status === 'failed' ? 'provider_timeout' : undefined,
  }
}

function isRepositoryJob(job: GenerationJob): job is RepositoryGenerationJob {
  const candidate = job as Partial<RepositoryGenerationJob>
  return Boolean(candidate.request && candidate.providerHandle && candidate.shotId && candidate.branchId)
}

function normalizeProject(source: Project | RepositoryProject, nowMs: number): RepositoryProject {
  const project = clone(source) as Project
  const existing = source as Partial<RepositoryProject>
  const mainBranch: ProjectBranch = {
    id: 'main',
    name: 'Main',
    createdAt: iso(nowMs),
  }
  const activeBranchId = existing.activeBranchId ?? 'main'
  const branches = existing.branches?.length ? clone(existing.branches) : [mainBranch]
  const jobs = project.jobs.map((job): RepositoryGenerationJob => {
    if (isRepositoryJob(job)) return job
    const shot = project.shots.find((candidate) => job.shot.includes(candidate.title)) ?? project.shots[0]
    const model = defaultModels.find((candidate) => candidate.name === job.model) ?? defaultModels[0]
    const handle = fallbackProviderHandle(job, project.id, nowMs)
    const request: ProviderGenerationRequest = {
      projectId: project.id,
      branchId: activeBranchId,
      shotId: shot?.id ?? 'unknown-shot',
      prompt: shot?.title ?? job.shot,
      modelId: model?.id ?? 'mock-model',
      modelName: job.model,
      mediaType: 'video',
      seed: handle.requestHash,
      attempt: 1,
      estimatedCredits: job.credits,
      previewUrl: shot?.image,
    }
    const timestamp = iso(nowMs)
    const normalized: RepositoryGenerationJob = {
      ...job,
      shotId: request.shotId,
      branchId: activeBranchId,
      providerId: handle.providerId,
      modelId: request.modelId,
      prompt: request.prompt,
      mediaType: request.mediaType,
      seed: request.seed,
      attempt: 1,
      createdAt: timestamp,
      updatedAt: timestamp,
      request,
      providerHandle: handle,
      failureCode: job.status === 'failed' ? 'provider_timeout' : undefined,
    }
    if (job.status === 'succeeded') normalized.output = createOutput({
      id: project.id,
      entities: project.entities,
      activeBranchId,
    }, normalized, {
      status: 'succeeded',
      progress: 100,
      etaMs: 0,
      output: { mediaType: 'video', previewUrl: shot?.image, width: 1920, height: 1080, durationMs: parseDurationMs(shot?.duration ?? '5s') },
    }, nowMs)
    return normalized
  })

  return {
    ...project,
    jobs,
    outputs: collectOutputs(jobs),
    branches,
    activeBranchId,
    timelineClips: clone(existing.timelineClips ?? []),
    lineage: clone(existing.lineage ?? []),
    createdAt: existing.createdAt ?? iso(nowMs),
    updatedAtIso: existing.updatedAtIso ?? iso(nowMs),
  }
}

function createOutput(
  project: Pick<RepositoryProject, 'id' | 'activeBranchId' | 'entities'>,
  job: RepositoryGenerationJob,
  update: ProviderJobUpdate,
  nowMs: number,
): GeneratedOutput {
  const output = update.output ?? { mediaType: job.mediaType }
  const outputId = `output-${job.id}`
  return {
    id: outputId,
    assetId: `asset-${job.id}`,
    projectId: project.id,
    branchId: job.branchId || project.activeBranchId,
    shotId: job.shotId,
    jobId: job.id,
    mediaType: output.mediaType,
    previewUrl: output.previewUrl,
    width: output.width,
    height: output.height,
    durationMs: output.durationMs,
    createdAt: iso(nowMs),
    recipe: {
      id: `recipe-${job.id}`,
      title: `${job.shot} · ${job.model}`,
      model: job.model,
      modelVersion: job.modelId,
      prompt: job.prompt,
      seed: job.seed,
      entityIds: project.entities.map((entity) => entity.id),
      parameters: { mediaType: job.mediaType, attempt: job.attempt, ...(job.request.parameters ?? {}) },
      parent: job.parentResultId,
      parentResultId: job.parentResultId,
      cost: `${job.credits} cr`,
      credits: job.credits,
      duration: formatEta(job.providerHandle.completesAtMs - job.providerHandle.submittedAtMs),
      elapsedMs: job.providerHandle.completesAtMs - job.providerHandle.submittedAtMs,
      license: 'Commercial safe',
      aiDisclosure: true,
    },
  }
}

export class ProjectRepository {
  private readonly storageKey: string
  private storage?: StorageLike
  private readonly providers: ProviderAdapterRegistry
  private readonly models: ModelVersion[]
  private readonly now: () => number
  private listeners = new Set<ProjectRepositoryListener>()
  private sequence = 1
  private tickInFlight: Promise<ProjectRepositorySnapshot> | null = null
  private timer: ReturnType<typeof setInterval> | null = null
  private timerConsumers = 0
  private snapshot: ProjectRepositorySnapshot

  constructor(options: ProjectRepositoryOptions = {}) {
    this.storage = options.storage
    this.storageKey = options.storageKey ?? PROJECT_REPOSITORY_STORAGE_KEY
    this.providers = options.providers ?? new ProviderAdapterRegistry([new MockProviderAdapter()])
    this.models = clone(options.models ?? defaultModels)
    this.now = options.now ?? (() => Date.now())
    const nowMs = this.now()
    const initialProjects = options.initialProjects ?? [demoProject]
    const projects = initialProjects.map((project) => normalizeProject(project, nowMs))
    this.snapshot = {
      projects,
      currentProjectId: projects[0]?.id ?? null,
      hydrated: false,
      revision: 0,
      persistenceError: null,
    }
  }

  getSnapshot = (): ProjectRepositorySnapshot => this.snapshot

  subscribe = (listener: ProjectRepositoryListener): (() => void) => {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  hydrate(): ProjectRepositorySnapshot {
    if (this.snapshot.hydrated) return this.snapshot
    let persistenceError: string | null = null
    try {
      if (!this.storage && typeof window !== 'undefined') this.storage = window.localStorage
    } catch (error) {
      persistenceError = error instanceof Error ? error.message : 'Browser storage is unavailable'
    }
    if (this.storage) {
      try {
        const serialized = this.storage.getItem(this.storageKey)
        if (serialized) {
          const parsed: unknown = JSON.parse(serialized)
          if (!isStoredState(parsed)) throw new Error('Unsupported or invalid repository schema')
          const nowMs = this.now()
          this.sequence = Math.max(1, parsed.sequence)
          this.snapshot = {
            projects: parsed.projects.map((project) => normalizeProject(project, nowMs)),
            currentProjectId: parsed.currentProjectId,
            hydrated: true,
            revision: this.snapshot.revision + 1,
            persistenceError: null,
          }
          this.emit()
          return this.snapshot
        }
      } catch (error) {
        persistenceError = error instanceof Error ? error.message : 'Unable to read local project data'
      }
    }

    this.snapshot = {
      ...this.snapshot,
      hydrated: true,
      revision: this.snapshot.revision + 1,
      persistenceError,
    }
    this.persist()
    this.emit()
    return this.snapshot
  }

  listProjects(): readonly RepositoryProject[] {
    this.hydrate()
    return this.snapshot.projects
  }

  currentProject(projectId?: string): RepositoryProject | undefined {
    this.hydrate()
    const id = projectId ?? this.snapshot.currentProjectId
    return id ? this.snapshot.projects.find((project) => project.id === id) : undefined
  }

  setCurrentProject(projectId: string): RepositoryProject {
    this.hydrate()
    const project = this.requireProject(projectId)
    this.commit(this.snapshot.projects, projectId)
    return project
  }

  createProject(input: CreateProjectInput): RepositoryProject {
    this.hydrate()
    const nowMs = this.now()
    const baseId = input.id ? slugify(input.id) : slugify(input.name)
    let id = baseId
    while (this.snapshot.projects.some((project) => project.id === id)) id = `${baseId}-${this.nextSequence()}`
    const timestamp = iso(nowMs)
    const project: RepositoryProject = {
      id,
      name: input.name.trim() || '未命名项目',
      type: input.type.trim() || '自定义工作流',
      outputLanguage: input.outputLanguage,
      updated: '刚刚',
      entities: clone(input.entities ?? []),
      shots: clone(input.shots ?? []),
      jobs: [],
      outputs: [],
      tracks: clone(input.tracks ?? defaultTracks()),
      branches: [{ id: 'main', name: 'Main', createdAt: timestamp }],
      activeBranchId: 'main',
      timelineClips: [],
      lineage: input.sourceProjectId ? [{
        id: `lineage-${this.nextSequence()}`,
        relationship: 'remix',
        sourceProjectId: input.sourceProjectId,
        sourceBranchId: 'main',
        createdAt: timestamp,
      }] : [],
      createdAt: timestamp,
      updatedAtIso: timestamp,
    }
    this.commit([...this.snapshot.projects, project], project.id)
    return project
  }

  updateShot(projectId: string, shotId: string, patch: ShotPatch): Shot {
    this.hydrate()
    const project = this.requireProject(projectId)
    findShot(project, shotId)
    let updatedShot: Shot | undefined
    const projects = this.snapshot.projects.map((candidate) => candidate.id !== projectId ? candidate : {
      ...candidate,
      shots: candidate.shots.map((shot) => {
        if (shot.id !== shotId) return shot
        updatedShot = { ...shot, ...clone(patch), id: shot.id }
        return updatedShot
      }),
    })
    this.commit(this.touch(projects, projectId))
    return updatedShot as Shot
  }

  /** Atomically replaces the storyboard, used when Agent accepts its six-shot plan. */
  replaceShots(projectId: string, shots: readonly Shot[]): RepositoryProject {
    this.hydrate()
    const project = this.requireProject(projectId)
    const seenIds = new Set<string>()
    const normalized = shots.map((shot, index) => {
      const id = shot.id.trim() || `shot-${this.nextSequence()}`
      if (seenIds.has(id)) throw new Error(`Duplicate shot id: ${id}`)
      seenIds.add(id)
      return { ...clone(shot), id, number: shot.number || index + 1 }
    })
    const retainedJobs = project.jobs.filter((job) => normalized.some((shot) => shot.id === job.shotId))
    const next = {
      ...project,
      shots: normalized,
      jobs: retainedJobs,
      timelineClips: project.timelineClips.filter((clip) => normalized.some((shot) => shot.id === clip.shotId)),
    }
    this.replaceProject(next)
    return this.requireProject(projectId)
  }

  upsertShot(projectId: string, shot: Shot): Shot {
    this.hydrate()
    const project = this.requireProject(projectId)
    const current = project.shots.find((candidate) => candidate.id === shot.id)
    if (current) return this.updateShot(projectId, shot.id, shot)
    const nextShot = { ...clone(shot), number: shot.number || project.shots.length + 1 }
    this.replaceProject({ ...project, shots: [...project.shots, nextShot] })
    return nextShot
  }

  bindEntityToShot(projectId: string, shotId: string, entityId: string): Shot {
    this.hydrate()
    const project = this.requireProject(projectId)
    const entity = project.entities.find((candidate) => candidate.id === entityId)
    if (!entity) throw new Error(`Entity not found: ${entityId}`)
    const shot = findShot(project, shotId)
    const bound = shot.characters.split(' · ').filter(Boolean)
    if (!bound.includes(entity.name)) bound.push(entity.name)
    return this.updateShot(projectId, shotId, {
      characters: bound.join(' · '),
      entityIds: [...new Set([...(shot.entityIds ?? []), entity.id])],
    })
  }

  async enqueue(projectId: string, input: EnqueueGenerationInput): Promise<RepositoryGenerationJob> {
    this.hydrate()
    const project = this.requireProject(projectId)
    const shot = findShot(project, input.shotId)
    const model = this.models.find((candidate) => candidate.id === input.modelId)
    const providerId = input.providerId ?? 'flowos-mock'
    const adapter = this.providers.get(providerId)
    const attempt = Math.max(1, input.attempt ?? 1)
    const jobId = `job-${this.nextSequence()}`
    const seed = input.seed ?? stableHash(`${projectId}:${project.activeBranchId}:${shot.id}:${input.prompt}:${jobId}`)
    const estimatedCredits = input.estimatedCredits ?? this.parseCredits(model?.cost)
    const request: ProviderGenerationRequest = {
      projectId,
      branchId: project.activeBranchId,
      shotId: shot.id,
      prompt: input.prompt.trim() || shot.title,
      modelId: input.modelId,
      modelName: model?.name ?? input.modelName ?? input.modelId,
      mediaType: input.mediaType ?? 'video',
      seed,
      attempt,
      estimatedCredits,
      previewUrl: shot.image,
      forceFailure: input.forceFailure,
      parameters: input.parameters,
    }
    const nowMs = this.now()
    const handle = await adapter.submit(request, nowMs)
    const timestamp = iso(nowMs)
    const job: RepositoryGenerationJob = {
      id: jobId,
      shot: `镜头 ${String(shot.number).padStart(2, '0')} · ${shot.title}`,
      shotId: shot.id,
      branchId: project.activeBranchId,
      model: request.modelName,
      modelId: request.modelId,
      providerId: adapter.id,
      prompt: request.prompt,
      mediaType: request.mediaType,
      seed,
      attempt,
      status: 'queued',
      progress: 0,
      eta: formatEta(handle.completesAtMs - nowMs),
      credits: estimatedCredits,
      createdAt: timestamp,
      updatedAt: timestamp,
      retryOf: input.retryOf,
      parentResultId: input.parentResultId,
      request,
      providerHandle: handle,
    }
    const latest = this.requireProject(projectId)
    this.replaceProject({ ...latest, jobs: [job, ...latest.jobs] })
    return job
  }

  enqueueGeneration(projectId: string, input: EnqueueGenerationInput): Promise<RepositoryGenerationJob> {
    return this.enqueue(projectId, input)
  }

  async cancel(projectId: string, jobId: string): Promise<RepositoryGenerationJob> {
    this.hydrate()
    const project = this.requireProject(projectId)
    const job = this.requireJob(project, jobId)
    if (job.status !== 'queued' && job.status !== 'running') return job
    await this.providers.get(job.providerId).cancel(job.providerHandle)
    const timestamp = iso(this.now())
    let canceled: RepositoryGenerationJob | undefined
    const jobs = this.requireProject(projectId).jobs.map((candidate) => {
      if (candidate.id !== jobId) return candidate
      canceled = { ...candidate, status: 'canceled', eta: '已取消', updatedAt: timestamp, completedAt: timestamp }
      return canceled
    })
    this.replaceProject({ ...this.requireProject(projectId), jobs })
    return canceled as RepositoryGenerationJob
  }

  async retry(projectId: string, jobId: string): Promise<RepositoryGenerationJob> {
    this.hydrate()
    const project = this.requireProject(projectId)
    const job = this.requireJob(project, jobId)
    if (job.status !== 'failed' && job.status !== 'canceled') {
      throw new Error('Only failed or canceled jobs can be retried')
    }
    return this.enqueue(projectId, {
      shotId: job.shotId,
      prompt: job.prompt,
      modelId: job.modelId,
      mediaType: job.mediaType,
      providerId: job.providerId,
      seed: job.seed,
      estimatedCredits: job.credits,
      parentResultId: job.parentResultId,
      retryOf: job.id,
      attempt: job.attempt + 1,
    })
  }

  async tick(projectId?: string, nowMs = this.now()): Promise<ProjectRepositorySnapshot> {
    this.hydrate()
    if (this.tickInFlight) return this.tickInFlight
    this.tickInFlight = this.performTick(projectId, nowMs).finally(() => {
      this.tickInFlight = null
    })
    return this.tickInFlight
  }

  addToTimeline(projectId: string, input: AddToTimelineInput): TimelineClip {
    this.hydrate()
    const project = this.requireProject(projectId)
    const job = this.requireJob(project, input.jobId)
    if (job.status !== 'succeeded' || !job.output) throw new Error('Only successful outputs can be added to the timeline')
    const preferredType = trackTypeForMedia(job.mediaType)
    const track = input.trackId
      ? project.tracks.find((candidate) => candidate.id === input.trackId)
      : project.tracks.find((candidate) => candidate.type === preferredType)
    if (!track) throw new Error(`Compatible timeline track not found for ${job.mediaType}`)
    if (project.timelineClips.some((clip) => clip.sourceJobId === job.id && clip.trackId === track.id)) {
      throw new Error('This output is already on the selected timeline track')
    }
    const shot = findShot(project, job.shotId)
    const existing = project.timelineClips.filter((clip) => clip.trackId === track.id)
    const defaultStartMs = existing.reduce((end, clip) => Math.max(end, clip.startMs + clip.durationMs), 0)
    const durationMs = Math.max(250, input.durationMs ?? job.output.durationMs ?? parseDurationMs(shot.duration))
    const clip: TimelineClip = {
      id: `clip-${this.nextSequence()}`,
      trackId: track.id,
      sourceJobId: job.id,
      outputId: job.output.id,
      shotId: shot.id,
      name: input.name?.trim() || shot.title,
      startMs: Math.max(0, input.startMs ?? defaultStartMs),
      durationMs,
      trimStartMs: 0,
      trimEndMs: durationMs,
      createdAt: iso(this.now()),
    }
    this.replaceProject({
      ...project,
      tracks: project.tracks.map((candidate) => candidate.id === track.id ? { ...candidate, clips: candidate.clips + 1 } : candidate),
      timelineClips: [...project.timelineClips, clip],
    })
    return clip
  }

  getOutput(projectId: string, outputId: string): GeneratedOutput | undefined {
    this.hydrate()
    return this.requireProject(projectId).outputs.find((output) => output.id === outputId)
  }

  getRecipe(projectId: string, outputId: string): GeneratedOutput['recipe'] | undefined {
    return this.getOutput(projectId, outputId)?.recipe
  }

  getLineage(projectId: string): readonly ProjectLineageEntry[] {
    this.hydrate()
    return this.requireProject(projectId).lineage
  }

  moveTimelineClip(projectId: string, input: MoveTimelineClipInput): TimelineClip {
    this.hydrate()
    const project = this.requireProject(projectId)
    const existing = project.timelineClips.find((clip) => clip.id === input.clipId)
    if (!existing) throw new Error(`Timeline clip not found: ${input.clipId}`)
    const trackId = input.trackId ?? existing.trackId
    if (!project.tracks.some((track) => track.id === trackId)) throw new Error(`Timeline track not found: ${trackId}`)
    const moved = {
      ...existing,
      trackId,
      startMs: Math.max(0, Math.round(input.startMs)),
    }
    const tracks = project.tracks.map((track) => {
      if (track.id === existing.trackId && existing.trackId !== trackId) return { ...track, clips: Math.max(0, track.clips - 1) }
      if (track.id === trackId && existing.trackId !== trackId) return { ...track, clips: track.clips + 1 }
      return track
    })
    this.replaceProject({
      ...project,
      tracks,
      timelineClips: project.timelineClips.map((clip) => clip.id === existing.id ? moved : clip),
    })
    return moved
  }

  trimTimelineClip(projectId: string, input: TrimTimelineClipInput): TimelineClip {
    this.hydrate()
    const project = this.requireProject(projectId)
    const existing = project.timelineClips.find((clip) => clip.id === input.clipId)
    if (!existing) throw new Error(`Timeline clip not found: ${input.clipId}`)
    const trimStartMs = Math.max(0, Math.round(input.trimStartMs ?? existing.trimStartMs))
    const trimEndMs = Math.min(existing.durationMs, Math.round(input.trimEndMs ?? existing.trimEndMs))
    if (trimEndMs <= trimStartMs) throw new Error('Clip trim end must be after its trim start')
    const trimmed = { ...existing, trimStartMs, trimEndMs }
    this.replaceProject({
      ...project,
      timelineClips: project.timelineClips.map((clip) => clip.id === existing.id ? trimmed : clip),
    })
    return trimmed
  }

  reorderTimelineTracks(projectId: string, trackIds: readonly string[]): TimelineTrack[] {
    this.hydrate()
    const project = this.requireProject(projectId)
    if (trackIds.length !== project.tracks.length || new Set(trackIds).size !== trackIds.length) {
      throw new Error('Track order must contain each project track exactly once')
    }
    const byId = new Map(project.tracks.map((track) => [track.id, track]))
    const tracks = trackIds.map((trackId) => {
      const track = byId.get(trackId)
      if (!track) throw new Error(`Timeline track not found: ${trackId}`)
      return track
    })
    this.replaceProject({ ...project, tracks })
    return tracks
  }

  branch(projectId: string, input: BranchInput = {}): ProjectBranch {
    this.hydrate()
    const project = this.requireProject(projectId)
    if (input.fromJobId) this.requireSuccessfulJob(project, input.fromJobId)
    const branch: ProjectBranch = {
      id: `branch-${this.nextSequence()}`,
      name: input.name?.trim() || `Branch ${project.branches.length + 1}`,
      parentBranchId: project.activeBranchId,
      sourceJobId: input.fromJobId,
      createdAt: iso(this.now()),
    }
    const lineage: ProjectLineageEntry = {
      id: `lineage-${this.nextSequence()}`,
      relationship: 'branch',
      sourceProjectId: project.id,
      sourceBranchId: project.activeBranchId,
      sourceJobId: input.fromJobId,
      sourceOutputId: input.fromJobId ? this.requireSuccessfulJob(project, input.fromJobId).output?.id : undefined,
      createdAt: branch.createdAt,
    }
    this.replaceProject({
      ...project,
      branches: [...project.branches, branch],
      activeBranchId: input.switchToBranch === false ? project.activeBranchId : branch.id,
      lineage: [...project.lineage, lineage],
    })
    return branch
  }

  branchProject(projectId: string, input: BranchInput = {}): ProjectBranch {
    return this.branch(projectId, input)
  }

  remix(projectId: string, input: RemixInput = {}): RepositoryProject {
    this.hydrate()
    const source = this.requireProject(projectId)
    const sourceJob = input.fromJobId ? this.requireSuccessfulJob(source, input.fromJobId) : undefined
    const remix = this.createProject({
      name: input.name?.trim() || `${source.name} · Remix`,
      type: source.type,
      outputLanguage: source.outputLanguage,
      entities: clone(source.entities),
      shots: clone(source.shots),
      tracks: clone(source.tracks.map((track) => ({ ...track, clips: 0 }))),
      sourceProjectId: source.id,
    })
    const lineage: ProjectLineageEntry = {
      id: `lineage-${this.nextSequence()}`,
      relationship: 'remix',
      sourceProjectId: source.id,
      sourceBranchId: source.activeBranchId,
      sourceJobId: sourceJob?.id,
      sourceOutputId: sourceJob?.output?.id,
      createdAt: iso(this.now()),
    }
    const updated = { ...remix, lineage: [lineage] }
    this.replaceProject(updated)
    return updated
  }

  reset(): ProjectRepositorySnapshot {
    const nowMs = this.now()
    const projects = [normalizeProject(demoProject, nowMs)]
    this.sequence = 1
    try {
      this.storage?.removeItem(this.storageKey)
    } catch {
      // A blocked storage backend should not prevent resetting in-memory state.
    }
    this.snapshot = {
      projects,
      currentProjectId: projects[0].id,
      hydrated: true,
      revision: this.snapshot.revision + 1,
      persistenceError: null,
    }
    this.persist()
    this.emit()
    return this.snapshot
  }

  startAutoTick(intervalMs = 750): () => void {
    this.timerConsumers += 1
    if (!this.timer && typeof window !== 'undefined') {
      this.timer = setInterval(() => { void this.tick() }, Math.max(250, intervalMs))
    }
    return () => {
      this.timerConsumers = Math.max(0, this.timerConsumers - 1)
      if (this.timerConsumers === 0 && this.timer) {
        clearInterval(this.timer)
        this.timer = null
      }
    }
  }

  private async performTick(projectId: string | undefined, nowMs: number): Promise<ProjectRepositorySnapshot> {
    const targets = this.snapshot.projects.flatMap((project) => {
      if (projectId && project.id !== projectId) return []
      return project.jobs
        .filter((job) => job.status === 'queued' || job.status === 'running')
        .map((job) => ({ projectId: project.id, job }))
    })
    if (!targets.length) return this.snapshot

    const updates = await Promise.all(targets.map(async ({ projectId: id, job }) => ({
      projectId: id,
      jobId: job.id,
      update: await this.providers.get(job.providerId).poll(job.providerHandle, job.request, nowMs),
    })))
    const byJob = new Map(updates.map((entry) => [`${entry.projectId}:${entry.jobId}`, entry.update]))
    let changed = false
    const projects = this.snapshot.projects.map((project) => {
      const jobs = project.jobs.map((job) => {
        if (job.status !== 'queued' && job.status !== 'running') return job
        const update = byJob.get(`${project.id}:${job.id}`)
        if (!update) return job
        changed = changed || update.status !== job.status || update.progress !== job.progress
        const timestamp = iso(nowMs)
        const next: RepositoryGenerationJob = {
          ...job,
          status: update.status,
          progress: update.progress,
          eta: update.status === 'failed' ? '已停止' : formatEta(update.etaMs),
          error: update.error,
          failureCode: update.failureCode,
          updatedAt: timestamp,
          startedAt: update.status !== 'queued' ? (job.startedAt ?? timestamp) : job.startedAt,
          completedAt: update.status === 'succeeded' || update.status === 'failed' ? timestamp : undefined,
        }
        if (update.status === 'succeeded' && !next.output) next.output = createOutput(project, next, update, nowMs)
        return next
      })
      return jobs === project.jobs ? project : { ...project, jobs, outputs: collectOutputs(jobs) }
    })
    if (changed) this.commit(this.touch(projects, projectId))
    return this.snapshot
  }

  private parseCredits(cost?: string): number {
    const parsed = Number.parseFloat(cost ?? '')
    return Number.isFinite(parsed) ? parsed : 0
  }

  private requireProject(projectId: string): RepositoryProject {
    const project = this.snapshot.projects.find((candidate) => candidate.id === projectId)
    if (!project) throw new Error(`Project not found: ${projectId}`)
    return project
  }

  private requireJob(project: RepositoryProject, jobId: string): RepositoryGenerationJob {
    const job = project.jobs.find((candidate) => candidate.id === jobId)
    if (!job) throw new Error(`Generation job not found: ${jobId}`)
    return job
  }

  private requireSuccessfulJob(project: RepositoryProject, jobId: string): RepositoryGenerationJob {
    const job = this.requireJob(project, jobId)
    if (job.status !== 'succeeded' || !job.output) throw new Error('The selected result is not available')
    return job
  }

  private nextSequence(): number {
    const value = this.sequence
    this.sequence += 1
    return value
  }

  private touch(projects: readonly RepositoryProject[], projectId?: string): RepositoryProject[] {
    if (!projectId) return projects.map((project) => ({ ...project, updated: '刚刚', updatedAtIso: iso(this.now()) }))
    return projects.map((project) => project.id === projectId
      ? { ...project, updated: '刚刚', updatedAtIso: iso(this.now()) }
      : project)
  }

  private replaceProject(project: RepositoryProject): void {
    const normalized = { ...project, outputs: collectOutputs(project.jobs) }
    this.commit(this.touch(this.snapshot.projects.map((candidate) => candidate.id === project.id ? normalized : candidate), project.id))
  }

  private commit(projects: readonly RepositoryProject[], currentProjectId = this.snapshot.currentProjectId): void {
    this.snapshot = {
      ...this.snapshot,
      projects: [...projects],
      currentProjectId,
      revision: this.snapshot.revision + 1,
      persistenceError: null,
    }
    this.persist()
    this.emit()
  }

  private persist(): void {
    if (!this.storage) return
    try {
      const stored: StoredRepositoryState = {
        schemaVersion: STORAGE_SCHEMA_VERSION,
        projects: [...this.snapshot.projects],
        currentProjectId: this.snapshot.currentProjectId,
        sequence: this.sequence,
      }
      this.storage.setItem(this.storageKey, JSON.stringify(stored))
    } catch (error) {
      this.snapshot = {
        ...this.snapshot,
        persistenceError: error instanceof Error ? error.message : 'Unable to persist local project data',
      }
    }
  }

  private emit(): void {
    this.listeners.forEach((listener) => listener())
  }
}

let singleton: ProjectRepository | undefined

export function createProjectRepository(options?: ProjectRepositoryOptions): ProjectRepository {
  return new ProjectRepository(options)
}

export function getProjectRepository(): ProjectRepository {
  singleton ??= createProjectRepository()
  return singleton
}

export function generationFailureLabel(code?: GenerationFailureCode): string | undefined {
  return code ? getFailureMessage(code) : undefined
}
