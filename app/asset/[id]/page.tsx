'use client'

import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { FormEvent, useEffect, useMemo, useState } from 'react'
import { AppShell, Topbar } from '@/components/AppShell'
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Copy,
  Eye,
  GitBranch,
  Layers3,
  Link2,
  MessageCircle,
  Plus,
  Share2,
  Sparkles,
  Tag,
  Upload,
  Workflow,
} from '@/components/icons'
import {
  getProjectRepository,
  type GeneratedOutput,
  type RepositoryProject,
} from '@/lib/project-repository'
import type { Entity } from '@/lib/types'
import { useProjectStore } from '@/lib/use-project-store'

type AssetMatch = {
  project: RepositoryProject
  entity?: Entity
  output?: GeneratedOutput
}

type AssetComment = {
  id: string
  author: string
  initials: string
  body: string
  createdAt: string
}

const initialComments: AssetComment[] = [
  {
    id: 'demo-comment-1',
    author: 'Maya',
    initials: 'M',
    body: '瓶身材质和雨滴层次已确认，可以作为定稿参考。',
    createdAt: '2026-09-04T09:18:00.000Z',
  },
  {
    id: 'demo-comment-2',
    author: 'Lin',
    initials: 'L',
    body: '@Maya 收到，后续变体继续锁定环标位置。',
    createdAt: '2026-09-04T09:32:00.000Z',
  },
]

function findAsset(projects: readonly RepositoryProject[], assetId: string): AssetMatch | undefined {
  for (const project of projects) {
    const entity = project.entities.find((candidate) => candidate.id === assetId)
    if (entity) return { project, entity }

    const output = project.outputs.find((candidate) => (
      candidate.id === assetId
      || candidate.assetId === assetId
      || candidate.jobId === assetId
    ))
    if (output) return { project, output }
  }
  return undefined
}

function formatDate(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  const pad = (part: number) => String(part).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`
}

function formatDuration(milliseconds?: number): string {
  if (!milliseconds) return 'Still image'
  return `${(milliseconds / 1_000).toFixed(milliseconds % 1_000 === 0 ? 0 : 1)}s`
}

function safeComments(value: string | null): AssetComment[] | undefined {
  if (!value) return undefined
  try {
    const parsed: unknown = JSON.parse(value)
    if (!Array.isArray(parsed)) return undefined
    const comments = parsed.filter((item): item is AssetComment => {
      if (!item || typeof item !== 'object') return false
      const candidate = item as Partial<AssetComment>
      return typeof candidate.id === 'string'
        && typeof candidate.author === 'string'
        && typeof candidate.initials === 'string'
        && typeof candidate.body === 'string'
        && typeof candidate.createdAt === 'string'
    })
    return comments
  } catch {
    return undefined
  }
}

function labelForEntity(kind: Entity['kind']): string {
  const labels: Record<Entity['kind'], string> = {
    character: 'Character entity',
    product: 'Product entity',
    location: 'Location entity',
    style: 'Style entity',
    voice: 'Voice entity',
  }
  return labels[kind]
}

export default function AssetPage() {
  const params = useParams<{ id: string | string[] }>()
  const router = useRouter()
  const routeId = Array.isArray(params.id) ? params.id[0] : params.id
  const { projects, hydrated } = useProjectStore()
  const repository = getProjectRepository()
  const match = useMemo(() => findAsset(projects, routeId), [projects, routeId])

  const versions = useMemo(() => {
    if (!match) return []
    const candidates = match.entity
      ? match.project.outputs.filter((output) => output.recipe.entityIds.includes(match.entity!.id))
      : match.project.outputs.filter((output) => output.shotId === match.output?.shotId)
    return [...candidates].sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  }, [match])

  const masterVersionId = match?.entity ? `entity:${match.entity.id}` : undefined
  const [selectedVersionId, setSelectedVersionId] = useState<string>('')
  const [notice, setNotice] = useState<{ tone: 'success' | 'error'; text: string } | null>(null)
  const [busyAction, setBusyAction] = useState<string | null>(null)
  const [commentBody, setCommentBody] = useState('')
  const [comments, setComments] = useState<AssetComment[]>(initialComments)
  const [commentsStorageId, setCommentsStorageId] = useState<string | null>(null)
  const [published, setPublished] = useState(false)

  useEffect(() => {
    setSelectedVersionId(masterVersionId ?? match?.output?.id ?? '')
  }, [masterVersionId, match?.output?.id, routeId])

  useEffect(() => {
    if (!routeId) return
    setCommentsStorageId(null)
    const stored = safeComments(window.localStorage.getItem(`flowos:asset-comments:${routeId}`))
    setComments(stored ?? initialComments)
    setPublished(window.localStorage.getItem(`flowos:asset-published:${routeId}`) === 'true')
    setCommentsStorageId(routeId)
  }, [routeId])

  useEffect(() => {
    if (!routeId || commentsStorageId !== routeId) return
    window.localStorage.setItem(`flowos:asset-comments:${routeId}`, JSON.stringify(comments))
  }, [comments, commentsStorageId, routeId])

  useEffect(() => {
    if (!notice) return
    const timer = window.setTimeout(() => setNotice(null), 3_200)
    return () => window.clearTimeout(timer)
  }, [notice])

  const selectedOutput = selectedVersionId === masterVersionId
    ? undefined
    : versions.find((output) => output.id === selectedVersionId)
      ?? match?.output
      ?? versions[0]
  const selectedShot = match?.project.shots.find((shot) => shot.id === selectedOutput?.shotId)
  const sourceJob = match?.project.jobs.find((job) => job.id === selectedOutput?.jobId)
  const recipe = selectedOutput?.recipe
  const assetName = match?.entity?.name
    ?? selectedShot?.title
    ?? recipe?.title
    ?? 'Generated asset'
  const previewUrl = selectedVersionId === masterVersionId
    ? match?.entity?.image
    : selectedOutput?.previewUrl ?? selectedShot?.image ?? match?.entity?.image

  const notify = (text: string, tone: 'success' | 'error' = 'success') => setNotice({ tone, text })

  const useAsReference = () => {
    if (!match) return
    const reference = {
      assetId: selectedOutput?.assetId ?? match.entity?.id ?? routeId,
      outputId: selectedOutput?.id,
      entityId: match.entity?.id,
      projectId: match.project.id,
      name: assetName,
      selectedAt: new Date().toISOString(),
    }
    window.localStorage.setItem(`flowos:selected-reference:${match.project.id}`, JSON.stringify(reference))
    notify(`“${assetName}”已设为下次生成的参考素材`)
  }

  const createVariant = async () => {
    if (!match) return
    const shot = selectedShot ?? match.project.shots[0]
    if (!shot) {
      notify('当前项目还没有镜头，无法创建变体。', 'error')
      return
    }
    const fallbackJob = match.project.jobs.find((job) => job.modelId)
    const modelId = recipe?.modelVersion ?? sourceJob?.modelId ?? fallbackJob?.modelId
    if (!modelId) {
      notify('没有可用的模型路由，请先在工作台选择模型。', 'error')
      return
    }

    setBusyAction('variant')
    try {
      const job = await repository.enqueueGeneration(match.project.id, {
        shotId: shot.id,
        prompt: recipe?.prompt ?? `@${match.entity?.name ?? assetName}，${shot.title} 的可控变体`,
        modelId,
        mediaType: selectedOutput?.mediaType ?? 'image',
        estimatedCredits: recipe?.credits ?? sourceJob?.credits,
        parentResultId: selectedOutput?.id,
      })
      notify(`变体任务 ${job.id} 已进入生成队列`)
    } catch (error) {
      notify(error instanceof Error ? error.message : '无法创建变体', 'error')
    } finally {
      setBusyAction(null)
    }
  }

  const createBranch = () => {
    if (!match) return
    setBusyAction('branch')
    try {
      const branch = repository.branch(match.project.id, {
        name: `${assetName} · Variant branch`,
        fromJobId: selectedOutput?.jobId,
      })
      notify(`已创建并切换到分支 “${branch.name}”`)
    } catch (error) {
      notify(error instanceof Error ? error.message : '无法创建分支', 'error')
    } finally {
      setBusyAction(null)
    }
  }

  const remix = () => {
    if (!match) return
    setBusyAction('remix')
    try {
      const remixed = repository.remix(match.project.id, {
        name: `${assetName} · Remix`,
        fromJobId: selectedOutput?.jobId,
      })
      router.push(`/project/${remixed.id}`)
    } catch (error) {
      notify(error instanceof Error ? error.message : '无法创建 Remix', 'error')
      setBusyAction(null)
    }
  }

  const addToTimeline = () => {
    if (!match || !selectedOutput) return
    setBusyAction('timeline')
    try {
      const clip = repository.addToTimeline(match.project.id, { jobId: selectedOutput.jobId })
      notify(`已将 “${clip.name}” 加入 ${match.project.tracks.find((track) => track.id === clip.trackId)?.name ?? '时间线'}`)
    } catch (error) {
      notify(error instanceof Error ? error.message : '无法加入时间线', 'error')
    } finally {
      setBusyAction(null)
    }
  }

  const togglePublish = () => {
    if (!match) return
    const next = !published
    setPublished(next)
    window.localStorage.setItem(`flowos:asset-published:${routeId}`, String(next))
    notify(next ? '资产已发布到 Creator Library' : '资产已从 Creator Library 下架')
  }

  const copyRecipe = async () => {
    if (!recipe) return
    try {
      await navigator.clipboard.writeText(JSON.stringify(recipe, null, 2))
      notify('Recipe JSON 已复制')
    } catch {
      notify('浏览器未授予剪贴板权限', 'error')
    }
  }

  const submitComment = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const body = commentBody.trim()
    if (!body) return
    setComments((current) => [
      ...current,
      {
        id: `comment-${Date.now()}`,
        author: 'Lin Chen',
        initials: 'L',
        body,
        createdAt: new Date().toISOString(),
      },
    ])
    setCommentBody('')
    notify('评论已添加')
  }

  if (!hydrated) return <AssetLoading />

  if (!match) {
    return (
      <AppShell>
        <Topbar title="Asset not found" />
        <div className="mx-auto flex min-h-[65vh] max-w-xl items-center justify-center p-6 text-center">
          <div>
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl border border-[#303642] bg-[#171a20] text-[#778190]">
              <Eye size={20} aria-hidden="true" />
            </div>
            <h1 className="mt-4 text-lg font-semibold">找不到这个资产</h1>
            <p className="mt-2 text-sm leading-6 text-[#8f98a6]">该资产可能已被删除，或当前本地工作区尚未同步它。</p>
            <Link href="/projects" className="focus-ring mt-5 inline-flex h-9 items-center gap-2 rounded-lg bg-[#4ee1ff] px-4 text-xs font-semibold text-[#071014]">
              <ChevronLeft size={14} aria-hidden="true" /> 返回项目
            </Link>
          </div>
        </div>
      </AppShell>
    )
  }

  const { project, entity } = match
  const usedInShots = entity
    ? project.shots.filter((shot) => shot.characters.includes(entity.name))
    : project.shots.filter((shot) => shot.id === selectedOutput?.shotId)
  const lineage = project.lineage.filter((entry) => (
    !selectedOutput
    || !entry.sourceOutputId
    || entry.sourceOutputId === selectedOutput.id
    || entry.sourceJobId === selectedOutput.jobId
  ))

  return (
    <AppShell>
      <Topbar
        title="Asset detail"
        actions={(
          <>
            <button
              type="button"
              onClick={useAsReference}
              className="focus-ring hidden h-9 items-center gap-1.5 rounded-lg border border-[#303641] bg-[#20252d] px-3 text-xs hover:bg-[#282e37] sm:flex"
            >
              <Link2 size={14} aria-hidden="true" /> Use as reference
            </button>
            <button
              type="button"
              onClick={() => void createVariant()}
              disabled={busyAction !== null}
              className="focus-ring flex h-9 items-center gap-1.5 rounded-lg bg-[#4ee1ff] px-3 text-xs font-semibold text-[#071014] disabled:cursor-wait disabled:opacity-60"
            >
              <Sparkles size={14} aria-hidden="true" />
              <span className="hidden sm:inline">{busyAction === 'variant' ? 'Submitting…' : 'Create variant'}</span>
              <span className="sm:hidden">Variant</span>
            </button>
          </>
        )}
      />

      <div className="mx-auto max-w-[1240px] px-4 py-5 sm:px-6 lg:px-8 lg:py-8">
        <nav aria-label="Breadcrumb" className="mb-5 flex min-w-0 items-center gap-1.5 text-[11px] text-[#778190]">
          <Link href="/projects" className="focus-ring rounded hover:text-white">Projects</Link>
          <ChevronRight size={12} aria-hidden="true" />
          <Link href={`/project/${project.id}`} className="focus-ring max-w-[42vw] truncate rounded hover:text-white">{project.name}</Link>
          <ChevronRight size={12} aria-hidden="true" />
          <span className="truncate text-[#c1c7d0]">{assetName}</span>
        </nav>

        <section className="grid min-w-0 gap-6 lg:grid-cols-[minmax(0,1.18fr)_minmax(330px,.82fr)] lg:gap-8">
          <div className="min-w-0">
            <div className="relative overflow-hidden rounded-xl border border-[#2a2e38] bg-[#101216]">
              {previewUrl ? (
                <img src={previewUrl} alt={`${assetName} preview`} className="aspect-[4/3] w-full object-cover" />
              ) : (
                <div className="flex aspect-[4/3] items-center justify-center text-xs text-[#6f7886]">Preview unavailable</div>
              )}
              <div className="absolute left-3 top-3 flex items-center gap-2">
                <span className="rounded-md bg-[#0b0c0f]/85 px-2 py-1 text-[10px] text-[#dce2e9] backdrop-blur">
                  {selectedVersionId === masterVersionId ? 'Entity master' : `Generated · ${selectedOutput?.mediaType ?? 'asset'}`}
                </span>
                {published && (
                  <span className="rounded-md border border-[#2e5b41] bg-[#15261e]/90 px-2 py-1 text-[10px] text-[#7ed5a8]">Published</span>
                )}
              </div>
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2 text-[11px] text-[#7f8897]">
              <span>{selectedVersionId === masterVersionId ? 'Master v1' : `Result v${Math.max(1, versions.length - versions.findIndex((item) => item.id === selectedOutput?.id))}`}</span>
              <span aria-hidden="true">·</span>
              <span>{usedInShots.length} shot{usedInShots.length === 1 ? '' : 's'}</span>
              <span aria-hidden="true">·</span>
              <span>{project.branches.find((branch) => branch.id === (selectedOutput?.branchId ?? project.activeBranchId))?.name ?? 'Main'}</span>
              <Link href={`/project/${project.id}`} className="focus-ring ml-auto rounded text-[#4ee1ff] hover:text-white">Open in workspace</Link>
            </div>

            <div className="mt-6">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-medium">Versions</h2>
                <span className="text-[10px] text-[#707988]">{versions.length + (entity ? 1 : 0)} available</span>
              </div>
              <div className="scrollbar mt-3 flex gap-3 overflow-x-auto pb-2" role="list" aria-label="Asset versions">
                {entity && (
                  <button
                    type="button"
                    aria-pressed={selectedVersionId === masterVersionId}
                    onClick={() => setSelectedVersionId(masterVersionId!)}
                    className={`focus-ring w-32 shrink-0 overflow-hidden rounded-lg border text-left ${selectedVersionId === masterVersionId ? 'border-[#4ee1ff] bg-[#202a31]' : 'border-[#2a2e38] bg-[#15171c]'}`}
                  >
                    <img src={entity.image} alt="Entity master version" className="aspect-video w-full object-cover" />
                    <div className="p-2 text-[10px]"><div className="text-[#dfe3e9]">Master v1</div><div className="mt-0.5 text-[#747e8c]">Locked entity</div></div>
                  </button>
                )}
                {versions.map((output, index) => {
                  const shot = project.shots.find((candidate) => candidate.id === output.shotId)
                  const active = selectedOutput?.id === output.id && selectedVersionId !== masterVersionId
                  return (
                    <button
                      key={output.id}
                      type="button"
                      aria-pressed={active}
                      onClick={() => setSelectedVersionId(output.id)}
                      className={`focus-ring w-32 shrink-0 overflow-hidden rounded-lg border text-left ${active ? 'border-[#4ee1ff] bg-[#202a31]' : 'border-[#2a2e38] bg-[#15171c]'}`}
                    >
                      {output.previewUrl || shot?.image ? (
                        <img src={output.previewUrl ?? shot?.image} alt="" className="aspect-video w-full object-cover" />
                      ) : <div className="aspect-video bg-[#1d2128]" />}
                      <div className="p-2 text-[10px]"><div className="truncate text-[#dfe3e9]">Result v{versions.length - index}</div><div className="mt-0.5 truncate text-[#747e8c]">{output.recipe.model}</div></div>
                    </button>
                  )
                })}
                {!entity && versions.length === 0 && (
                  <div className="rounded-lg border border-dashed border-[#303642] px-4 py-6 text-xs text-[#747e8c]">No generated versions yet</div>
                )}
              </div>
            </div>
          </div>

          <aside className="min-w-0">
            <div className="text-[10px] uppercase tracking-[.16em] text-[#4ee1ff]">
              {entity ? labelForEntity(entity.kind) : `${selectedOutput?.mediaType ?? 'Generated'} output`}
            </div>
            <h1 className="mt-2 text-2xl font-semibold leading-tight">{assetName}</h1>
            <p className="mt-2 text-sm leading-6 text-[#929baa]">
              {entity?.description ?? selectedShot?.title ?? 'A traceable generated result from this project.'}
            </p>

            <div className="mt-4 flex flex-wrap gap-2">
              {(entity?.tags ?? [selectedOutput?.mediaType ?? 'output', selectedShot?.framing ?? 'generated']).map((tag) => (
                <span key={tag} className="inline-flex items-center gap-1 rounded-md bg-[#20252d] px-2 py-1 text-[10px] text-[#aab2bf]">
                  <Tag size={10} aria-hidden="true" /> {tag}
                </span>
              ))}
            </div>

            <div className="mt-6 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-2">
              <ActionButton icon={Link2} label="Use as reference" onClick={useAsReference} />
              <ActionButton icon={GitBranch} label="Branch" onClick={createBranch} busy={busyAction === 'branch'} />
              <ActionButton icon={Workflow} label="Remix project" onClick={remix} busy={busyAction === 'remix'} />
              <ActionButton icon={Upload} label={published ? 'Unpublish' : 'Publish'} onClick={togglePublish} active={published} />
              {selectedOutput && (
                <ActionButton icon={Layers3} label="Add to timeline" onClick={addToTimeline} busy={busyAction === 'timeline'} />
              )}
              <Link
                href={`/project/${project.id}`}
                className="focus-ring flex h-10 items-center justify-center gap-2 rounded-lg border border-[#303641] bg-[#1b1f26] px-3 text-xs hover:bg-[#252a32]"
              >
                <Eye size={14} aria-hidden="true" /> Open project
              </Link>
            </div>

            <div className="surface mt-5 p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="text-xs font-medium">License & disclosure</div>
                <Check size={14} className="text-[#7ed5a8]" aria-hidden="true" />
              </div>
              <div className="mt-2 text-[11px] leading-5 text-[#7ed5a8]">{recipe?.license ?? 'Commercial safe'} · AI disclosure attached</div>
              <div className="mt-1 text-[10px] leading-4 text-[#758091]">生成记录保留模型版本、成本和父结果，发布时继续携带来源信息。</div>
            </div>
          </aside>
        </section>

        <section className="mt-8 grid min-w-0 gap-5 xl:grid-cols-[1.2fr_.8fr]">
          <div className="min-w-0 space-y-5">
            <article id="recipe" className="surface scroll-mt-20 overflow-hidden">
              <div className="flex items-center gap-2 border-b border-[#282d36] px-4 py-3 sm:px-5">
                <Sparkles size={14} className="text-[#4ee1ff]" aria-hidden="true" />
                <h2 className="text-sm font-medium">Recipe</h2>
                {recipe && <span className="ml-auto truncate text-[10px] text-[#747e8c]">{recipe.id}</span>}
              </div>
              {recipe ? (
                <div className="p-4 sm:p-5">
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    <Metadata label="Model version" value={recipe.modelVersion} />
                    <Metadata label="Seed" value={String(recipe.seed)} />
                    <Metadata label="Cost" value={`${recipe.credits} cr`} />
                    <Metadata label="Elapsed" value={recipe.duration} />
                  </div>
                  <div className="mt-5">
                    <div className="flex items-center justify-between">
                      <h3 className="text-[10px] uppercase tracking-[.14em] text-[#707988]">Prompt</h3>
                      <button type="button" onClick={() => void copyRecipe()} className="focus-ring flex items-center gap-1 rounded text-[10px] text-[#4ee1ff] hover:text-white">
                        <Copy size={11} aria-hidden="true" /> Copy JSON
                      </button>
                    </div>
                    <p className="mt-2 rounded-lg border border-[#2a2e38] bg-[#111318] p-3 text-xs leading-6 text-[#c2c8d1]">{recipe.prompt}</p>
                  </div>
                  <div className="mt-5 grid gap-5 md:grid-cols-2">
                    <div>
                      <h3 className="text-[10px] uppercase tracking-[.14em] text-[#707988]">Entity references</h3>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {recipe.entityIds.length ? recipe.entityIds.map((entityId) => {
                          const reference = project.entities.find((candidate) => candidate.id === entityId)
                          return (
                            <Link key={entityId} href={`/asset/${entityId}`} className="focus-ring rounded-md border border-[#303641] bg-[#1b1f26] px-2 py-1.5 text-[10px] text-[#aab2bf] hover:border-[#4ee1ff] hover:text-white">
                              @{reference?.name ?? entityId}
                            </Link>
                          )
                        }) : <span className="text-xs text-[#707988]">No bound references</span>}
                      </div>
                    </div>
                    <div>
                      <h3 className="text-[10px] uppercase tracking-[.14em] text-[#707988]">Parameters</h3>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {Object.entries(recipe.parameters).map(([key, value]) => (
                          <span key={key} className="rounded-md bg-[#20252d] px-2 py-1.5 text-[10px] text-[#aab2bf]">{key}: {String(value)}</span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-8 text-center text-xs leading-5 text-[#747e8c]">实体母版没有独立 Recipe。创建首个变体后，这里会显示完整的可复现参数。</div>
              )}
            </article>

            <article id="lineage" className="surface scroll-mt-20 overflow-hidden">
              <div className="flex items-center gap-2 border-b border-[#282d36] px-4 py-3 sm:px-5">
                <GitBranch size={14} className="text-[#7c5cff]" aria-hidden="true" />
                <h2 className="text-sm font-medium">Lineage</h2>
                <span className="ml-auto text-[10px] text-[#747e8c]">{lineage.length + (recipe?.parentResultId || recipe?.parent ? 1 : 0)} inherited links</span>
              </div>
              <div className="p-4 sm:p-5">
                <div className="relative space-y-3 before:absolute before:bottom-5 before:left-[15px] before:top-5 before:w-px before:bg-[#333946]">
                  {lineage.map((entry) => (
                    <div key={entry.id} className="relative flex items-start gap-3">
                      <div className="z-[1] mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[#3a4050] bg-[#171a20]">
                        {entry.relationship === 'remix' ? <Workflow size={13} className="text-[#7c5cff]" aria-hidden="true" /> : <GitBranch size={13} className="text-[#4ee1ff]" aria-hidden="true" />}
                      </div>
                      <div className="min-w-0 flex-1 rounded-lg border border-[#292e38] bg-[#121419] p-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-xs font-medium capitalize">{entry.relationship}</span>
                          <span className="rounded bg-[#252a32] px-1.5 py-0.5 text-[9px] text-[#8993a2]">{entry.sourceBranchId}</span>
                          <span className="ml-auto text-[9px] text-[#687281]">{formatDate(entry.createdAt)}</span>
                        </div>
                        <div className="mt-1 truncate text-[10px] text-[#7f8998]">Source project · {entry.sourceProjectId}</div>
                        {entry.sourceOutputId && (
                          <Link href={`/asset/${entry.sourceOutputId}`} className="focus-ring mt-2 inline-flex items-center gap-1 rounded text-[10px] text-[#4ee1ff]">
                            Open source result <ChevronRight size={11} aria-hidden="true" />
                          </Link>
                        )}
                      </div>
                    </div>
                  ))}

                  {(recipe?.parentResultId || recipe?.parent) && (
                    <div className="relative flex items-start gap-3">
                      <div className="z-[1] mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[#3a4050] bg-[#171a20]">
                        <Link2 size={13} className="text-[#f2b86b]" aria-hidden="true" />
                      </div>
                      <div className="min-w-0 flex-1 rounded-lg border border-[#292e38] bg-[#121419] p-3">
                        <div className="text-xs font-medium">Parent result</div>
                        <div className="mt-1 break-all text-[10px] text-[#7f8998]">{recipe.parentResultId ?? recipe.parent}</div>
                      </div>
                    </div>
                  )}

                  <div className="relative flex items-start gap-3">
                    <div className="z-[1] mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[#2f6872] bg-[#163039]">
                      <Check size={13} className="text-[#4ee1ff]" aria-hidden="true" />
                    </div>
                    <div className="min-w-0 flex-1 rounded-lg border border-[#2b3e45] bg-[#142126] p-3">
                      <div className="text-xs font-medium text-[#dffaff]">Current asset</div>
                      <div className="mt-1 truncate text-[10px] text-[#7f99a0]">{selectedOutput?.id ?? entity?.id} · {project.name}</div>
                    </div>
                  </div>
                </div>
              </div>
            </article>
          </div>

          <div className="min-w-0 space-y-5">
            <article className="surface overflow-hidden">
              <div className="flex items-center gap-2 border-b border-[#282d36] px-4 py-3">
                <Layers3 size={14} className="text-[#4ee1ff]" aria-hidden="true" />
                <h2 className="text-sm font-medium">Metadata</h2>
              </div>
              <dl className="divide-y divide-[#242932] px-4">
                <MetadataRow label="Asset ID" value={selectedOutput?.assetId ?? entity?.id ?? routeId} />
                <MetadataRow label="Project" value={project.name} />
                <MetadataRow label="Type" value={entity?.kind ?? selectedOutput?.mediaType ?? 'output'} />
                <MetadataRow label="Dimensions" value={selectedOutput?.width && selectedOutput.height ? `${selectedOutput.width} × ${selectedOutput.height}` : 'Source master'} />
                <MetadataRow label="Duration" value={formatDuration(selectedOutput?.durationMs)} />
                <MetadataRow label="Branch" value={project.branches.find((branch) => branch.id === (selectedOutput?.branchId ?? project.activeBranchId))?.name ?? project.activeBranchId} />
                <MetadataRow label="Created" value={selectedOutput ? formatDate(selectedOutput.createdAt) : formatDate(project.createdAt)} />
                <MetadataRow label="AI disclosure" value={recipe?.aiDisclosure === false ? 'Not attached' : 'Attached'} good={recipe?.aiDisclosure !== false} />
              </dl>
              {entity?.locked?.length ? (
                <div className="border-t border-[#282d36] p-4">
                  <div className="text-[10px] uppercase tracking-[.14em] text-[#707988]">Locked features</div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {entity.locked.map((item) => <span key={item} className="rounded bg-[#2b2630] px-2 py-1 text-[10px] text-[#d9afd9]">{item}</span>)}
                  </div>
                </div>
              ) : null}
            </article>

            <article className="surface overflow-hidden">
              <div className="flex items-center gap-2 border-b border-[#282d36] px-4 py-3">
                <MessageCircle size={14} className="text-[#7c5cff]" aria-hidden="true" />
                <h2 className="text-sm font-medium">Comments</h2>
                <span className="ml-auto rounded bg-[#242932] px-1.5 py-0.5 text-[9px] text-[#9aa3b2]">{comments.length}</span>
              </div>
              <div className="scrollbar max-h-[360px] space-y-3 overflow-y-auto p-4">
                {comments.map((comment) => (
                  <div key={comment.id} className="rounded-lg border border-[#292e38] bg-[#121419] p-3">
                    <div className="flex items-center gap-2">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#30284b] text-[9px] text-[#d8ceff]">{comment.initials}</span>
                      <span className="text-[11px] font-medium">{comment.author}</span>
                      <span className="ml-auto text-[9px] text-[#687281]">{formatDate(comment.createdAt)}</span>
                    </div>
                    <p className="mt-2 break-words text-[11px] leading-5 text-[#aab2bf]">{comment.body}</p>
                  </div>
                ))}
                {!comments.length && <div className="py-8 text-center text-xs text-[#747e8c]">No comments yet</div>}
              </div>
              <form onSubmit={submitComment} className="border-t border-[#282d36] p-3">
                <label htmlFor="asset-comment" className="sr-only">Add a comment</label>
                <textarea
                  id="asset-comment"
                  rows={3}
                  value={commentBody}
                  onChange={(event) => setCommentBody(event.target.value)}
                  placeholder="Add a comment or @mention a collaborator…"
                  className="focus-ring w-full resize-none rounded-lg border border-[#2d333e] bg-[#111318] p-3 text-xs leading-5 text-white outline-none placeholder:text-[#65707e]"
                />
                <div className="mt-2 flex items-center justify-between gap-3">
                  <span className="flex items-center gap-1 text-[9px] text-[#687281]"><Clock3 size={10} aria-hidden="true" /> Saved locally</span>
                  <button
                    type="submit"
                    disabled={!commentBody.trim()}
                    className="focus-ring inline-flex h-8 items-center gap-1.5 rounded-md bg-[#4ee1ff] px-3 text-[10px] font-semibold text-[#071014] disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <Plus size={12} aria-hidden="true" /> Add comment
                  </button>
                </div>
              </form>
            </article>
          </div>
        </section>
      </div>

      {notice && (
        <div
          role="status"
          aria-live="polite"
          className={`fixed bottom-20 left-1/2 z-50 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 rounded-lg border px-4 py-3 text-xs shadow-2xl md:bottom-6 ${notice.tone === 'error' ? 'border-[#713d49] bg-[#351c23] text-[#ffb4c0]' : 'border-[#306471] bg-[#15323a] text-[#c9f8ff]'}`}
        >
          <div className="flex items-center gap-2">
            {notice.tone === 'error' ? <Share2 size={14} aria-hidden="true" /> : <Check size={14} aria-hidden="true" />}
            <span>{notice.text}</span>
          </div>
        </div>
      )}
    </AppShell>
  )
}

function ActionButton({
  icon: Icon,
  label,
  onClick,
  busy = false,
  active = false,
}: {
  icon: typeof Link2
  label: string
  onClick: () => void
  busy?: boolean
  active?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={busy}
      aria-pressed={active || undefined}
      className={`focus-ring flex h-10 min-w-0 items-center justify-center gap-2 rounded-lg border px-3 text-xs disabled:cursor-wait disabled:opacity-60 ${active ? 'border-[#2e6b4b] bg-[#183326] text-[#88dfad]' : 'border-[#303641] bg-[#1b1f26] hover:bg-[#252a32]'}`}
    >
      <Icon size={14} className="shrink-0" aria-hidden="true" />
      <span className="truncate">{busy ? 'Working…' : label}</span>
    </button>
  )
}

function Metadata({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-[#292e38] bg-[#111318] p-3">
      <div className="text-[9px] uppercase tracking-[.12em] text-[#687281]">{label}</div>
      <div className="mt-1 truncate text-[11px] text-[#d7dce3]" title={value}>{value}</div>
    </div>
  )
}

function MetadataRow({ label, value, good = false }: { label: string; value: string; good?: boolean }) {
  return (
    <div className="grid grid-cols-[100px_minmax(0,1fr)] gap-3 py-3 text-[11px]">
      <dt className="text-[#747e8c]">{label}</dt>
      <dd className={`min-w-0 break-words text-right ${good ? 'text-[#7ed5a8]' : 'text-[#c0c6cf]'}`}>{value}</dd>
    </div>
  )
}

function AssetLoading() {
  return (
    <AppShell>
      <Topbar title="Asset detail" />
      <div className="mx-auto max-w-[1240px] animate-pulse px-4 py-6 sm:px-6 lg:px-8">
        <div className="h-3 w-56 rounded bg-[#20242b]" />
        <div className="mt-6 grid gap-7 lg:grid-cols-[1.18fr_.82fr]">
          <div className="aspect-[4/3] rounded-xl bg-[#171a20]" />
          <div>
            <div className="h-3 w-28 rounded bg-[#20242b]" />
            <div className="mt-4 h-7 w-64 max-w-full rounded bg-[#20242b]" />
            <div className="mt-4 h-16 rounded bg-[#171a20]" />
            <div className="mt-7 grid grid-cols-2 gap-2"><div className="h-10 rounded bg-[#171a20]" /><div className="h-10 rounded bg-[#171a20]" /></div>
          </div>
        </div>
      </div>
    </AppShell>
  )
}
