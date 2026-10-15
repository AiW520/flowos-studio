'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  ArrowRight,
  Bot,
  Check,
  Clock3,
  Sparkles,
  WandSparkles,
  Workflow,
} from '@/components/icons'
import type { RepositoryProject, ShotPatch } from '@/lib/project-repository'
import type { ModelVersion, Shot } from '@/lib/types'

const focusRing =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4ee1ff] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0d0f13]'
const fieldClass =
  `w-full min-w-0 rounded-lg border border-[#343945] bg-[#111318] px-3 py-2 text-xs text-[#f5f7fa] placeholder:text-[var(--muted)] ${focusRing}`

export interface AgentBrief {
  title: string
  summary: string
  audience: string
  format: string
  tone: string
}

export interface AgentShotDraft extends Shot {
  accepted: boolean
}

export type AgentShotPatch = Partial<
  Omit<AgentShotDraft, 'id' | 'number' | 'accepted'>
>

export interface AgentWorkspaceProps {
  project: RepositoryProject
  goal: string
  brief: AgentBrief
  drafts: readonly AgentShotDraft[]
  models: readonly ModelVersion[]
  selectedModelId?: string
  isPlanning?: boolean
  isGenerating?: boolean
  onGoalChange: (value: string) => void
  onBriefChange: (brief: AgentBrief) => void
  onPlanShots: (shots: AgentShotDraft[]) => void | Promise<void>
  onUpdateDraft: (shotId: string, patch: AgentShotPatch) => void
  onAcceptDraft: (shotId: string, accepted: boolean) => void
  onSelectModel?: (modelId: string) => void
  onGenerate: (shots: AgentShotDraft[]) => void | Promise<void>
}

export interface CreateSkillInput {
  name: string
  projectId: string
  shotId: string
  prompt: string
  modelId: string
}

export interface NodesWorkspaceProps {
  project: RepositoryProject
  selectedShotId: string
  prompt: string
  models: readonly ModelVersion[]
  selectedModelId: string
  onSelectShot: (shotId: string) => void
  onPromptChange: (value: string) => void
  onSelectModel: (modelId: string) => void
  onCreateSkill: (input: CreateSkillInput) => void | Promise<void>
}

export interface StoryboardWorkspaceProps {
  project: RepositoryProject
  selectedShotId: string
  onSelectShot: (shotId: string) => void
  onUpdateShot: (shotId: string, patch: ShotPatch) => void
}

const EMPTY_BRIEF: AgentBrief = {
  title: '',
  summary: '',
  audience: '',
  format: '16:9 · 1080p · 30 秒',
  tone: '',
}

function entityName(project: RepositoryProject, kind: string, fallback: string): string {
  return project.entities.find((entity) => entity.kind === kind)?.name ?? fallback
}

function entityImage(project: RepositoryProject, kind: string): string {
  return project.entities.find((entity) => entity.kind === kind)?.image ?? ''
}

/** Creates the deterministic six-shot first pass used by the Agent mode. */
export function buildAgentShotPlan(
  project: RepositoryProject,
  goal: string,
  brief: AgentBrief = EMPTY_BRIEF,
): AgentShotDraft[] {
  const product = entityName(project, 'product', '核心产品')
  const character = entityName(project, 'character', '主角')
  const location = entityName(project, 'location', '核心场景')
  const voice = entityName(project, 'voice', '品牌声音')
  const summary = brief.summary.trim() || goal.trim()
  const existing = project.shots.slice(0, 6)
  const templates: Array<Omit<Shot, 'id' | 'number'>> = [
    {
      title: `${product}质感开场`,
      duration: '3s',
      framing: 'ECU',
      move: '微距缓推',
      characters: product,
      dialogue: '',
      sound: '环境声渐入 · 低频触感',
      image: entityImage(project, 'product'),
      version: 'draft',
    },
    {
      title: `${location}建立镜头`,
      duration: '4s',
      framing: 'Wide',
      move: '横移建立空间',
      characters: character,
      dialogue: '',
      sound: '空间环境声 · 动作提示音',
      image: entityImage(project, 'location'),
      version: 'draft',
    },
    {
      title: `${character}取出${product}`,
      duration: '5s',
      framing: 'MS',
      move: '手持跟拍',
      characters: `${character} · ${product}`,
      dialogue: summary ? summary.slice(0, 42) : '把此刻，留给真正重要的感受。',
      sound: `${voice}进入`,
      image: entityImage(project, 'character'),
      version: 'draft',
    },
    {
      title: `${product}使用细节`,
      duration: '6s',
      framing: 'CU',
      move: '俯拍下摇',
      characters: product,
      dialogue: '',
      sound: '产品拟音 · 节奏抬升',
      image: entityImage(project, 'product'),
      version: 'draft',
    },
    {
      title: `${character}体验时刻`,
      duration: '7s',
      framing: 'MCU',
      move: '环绕 90°',
      characters: character,
      dialogue: '',
      sound: '呼吸细节 · 环境声渐远',
      image: entityImage(project, 'character'),
      version: 'draft',
    },
    {
      title: `${product}品牌收束`,
      duration: '5s',
      framing: 'Packshot',
      move: '锁定机位',
      characters: product,
      dialogue: brief.title.trim() || project.name,
      sound: `${voice} · 品牌尾音`,
      image: entityImage(project, 'product'),
      version: 'draft',
    },
  ]

  return templates.map((template, index) => {
    const source = existing[index]
    return {
      ...template,
      ...source,
      id: source?.id ?? `agent-shot-${index + 1}`,
      number: index + 1,
      image: source?.image || template.image,
      version: source?.version || template.version,
      accepted: false,
    }
  })
}

export function AgentWorkspace({
  project,
  goal,
  brief,
  drafts,
  models,
  selectedModelId,
  isPlanning = false,
  isGenerating = false,
  onGoalChange,
  onBriefChange,
  onPlanShots,
  onUpdateDraft,
  onAcceptDraft,
  onSelectModel,
  onGenerate,
}: AgentWorkspaceProps) {
  const [editingShotId, setEditingShotId] = useState<string | null>(null)
  const [localPlanning, setLocalPlanning] = useState(false)
  const [localGenerating, setLocalGenerating] = useState(false)
  const [notice, setNotice] = useState('')
  const visibleDrafts = drafts.slice(0, 6)
  const hasExactPlan = drafts.length === 6
  const acceptedCount = hasExactPlan
    ? visibleDrafts.filter((shot) => shot.accepted).length
    : 0
  const canGenerate = hasExactPlan && acceptedCount === 6 && !isGenerating && !localGenerating
  const selectedModel = models.find((model) => model.id === selectedModelId) ?? models[0]

  async function planShots() {
    if (!goal.trim() && !brief.summary.trim()) {
      setNotice('请先填写创作目标或 Brief。')
      return
    }
    setLocalPlanning(true)
    setNotice('')
    try {
      await onPlanShots(buildAgentShotPlan(project, goal, brief))
      setNotice('六镜头计划已生成，等待逐项确认。')
    } catch (error) {
      setNotice(error instanceof Error ? error.message : '计划生成失败，请重试。')
    } finally {
      setLocalPlanning(false)
    }
  }

  async function generateFirstPass() {
    if (!canGenerate) return
    setLocalGenerating(true)
    setNotice('')
    try {
      await onGenerate([...visibleDrafts])
      setNotice('六个镜头已提交到生成队列。')
    } catch (error) {
      setNotice(error instanceof Error ? error.message : '提交失败，请重试。')
    } finally {
      setLocalGenerating(false)
    }
  }

  return (
    <section
      aria-labelledby="agent-workspace-title"
      className="h-full min-h-0 overflow-y-auto bg-[#0d0f13] px-4 py-5 sm:px-6 lg:px-8"
    >
      <div className="mx-auto max-w-5xl">
        <div className="flex flex-col gap-4 border-b border-[#292d36] pb-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="flex items-center gap-2 text-xs font-medium text-[#4ee1ff]">
              <Bot aria-hidden="true" size={16} />
              Creative Agent
            </div>
            <h2 id="agent-workspace-title" className="mt-2 text-lg font-semibold text-[#f5f7fa]">
              从目标到可执行分镜
            </h2>
            <p className="mt-1 text-xs text-[#a3acb9]">
              {project.name} · {project.activeBranchId}
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs text-[#a3acb9]">
            <span className="rounded-md border border-[#343945] bg-[#171a20] px-2.5 py-1.5">
              {acceptedCount}/6 已确认
            </span>
            {selectedModel && (
              <span className="max-w-[200px] truncate rounded-md border border-[#343945] bg-[#171a20] px-2.5 py-1.5">
                {selectedModel.name}
              </span>
            )}
          </div>
        </div>

        <div className="grid gap-4 py-5 lg:grid-cols-[minmax(0,1.25fr)_minmax(260px,.75fr)]">
          <div className="rounded-xl border border-[#303540] bg-[#15171c] p-4">
            <label htmlFor="agent-goal" className="text-xs font-medium text-[#f5f7fa]">
              创作目标
            </label>
            <textarea
              id="agent-goal"
              value={goal}
              onChange={(event) => onGoalChange(event.target.value)}
              rows={3}
              placeholder="例如：为新品制作一支克制、电影感的 30 秒广告。"
              className={`${fieldClass} mt-2 resize-y leading-5`}
            />

            <div className="mt-4 flex items-center justify-between gap-3">
              <label htmlFor="agent-brief-summary" className="text-xs font-medium text-[#f5f7fa]">
                Brief
              </label>
              <span className="text-[11px] text-[var(--muted)]">可直接编辑</span>
            </div>
            <input
              aria-label="Brief 标题"
              value={brief.title}
              onChange={(event) => onBriefChange({ ...brief, title: event.target.value })}
              placeholder="项目标题"
              className={`${fieldClass} mt-2 font-medium`}
            />
            <textarea
              id="agent-brief-summary"
              value={brief.summary}
              onChange={(event) => onBriefChange({ ...brief, summary: event.target.value })}
              rows={4}
              placeholder="核心叙事、产品卖点与必须出现的画面。"
              className={`${fieldClass} mt-2 resize-y leading-5`}
            />
          </div>

          <div className="rounded-xl border border-[#303540] bg-[#15171c] p-4">
            <div className="grid gap-3">
              <BriefField
                label="受众"
                value={brief.audience}
                placeholder="品牌内容受众"
                onChange={(value) => onBriefChange({ ...brief, audience: value })}
              />
              <BriefField
                label="交付规格"
                value={brief.format}
                placeholder="16:9 · 1080p · 30 秒"
                onChange={(value) => onBriefChange({ ...brief, format: value })}
              />
              <BriefField
                label="语气"
                value={brief.tone}
                placeholder="克制 · 电影感"
                onChange={(value) => onBriefChange({ ...brief, tone: value })}
              />
              {models.length > 0 && onSelectModel && (
                <label className="grid gap-1.5 text-[11px] text-[#aab3bf]">
                  模型路由
                  <select
                    aria-label="模型路由"
                    value={selectedModel?.id ?? ''}
                    onChange={(event) => onSelectModel(event.target.value)}
                    className={fieldClass}
                  >
                    {models.map((model) => (
                      <option key={model.id} value={model.id}>
                        {model.name} · {model.cost} · {model.speed}
                      </option>
                    ))}
                  </select>
                </label>
              )}
            </div>
            <button
              type="button"
              onClick={() => void planShots()}
              disabled={isPlanning || localPlanning}
              className={`${focusRing} mt-4 inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-lg bg-[#252b34] px-3 py-2 text-xs font-semibold text-[#e9edf2] hover:bg-[#303741] disabled:cursor-not-allowed disabled:opacity-55`}
            >
              <WandSparkles aria-hidden="true" size={15} />
              {isPlanning || localPlanning ? '正在规划…' : '生成 6 镜头计划'}
            </button>
          </div>
        </div>

        <div className="flex items-end justify-between gap-4 pb-3">
          <div>
            <h3 className="text-sm font-semibold text-[#f5f7fa]">镜头计划</h3>
            <p className="mt-1 text-[11px] text-[#9ea7b5]">逐项编辑并确认后提交首轮生成</p>
          </div>
          {hasExactPlan && (
            <span className="text-[11px] text-[#9ea7b5]">
              总时长 {formatTotalDuration(visibleDrafts)}
            </span>
          )}
        </div>

        {!hasExactPlan ? (
          <div className="rounded-xl border border-dashed border-[#3a404b] bg-[#13151a] px-5 py-10 text-center">
            <Sparkles aria-hidden="true" className="mx-auto text-[#4ee1ff]" size={20} />
            <p className="mt-3 text-sm text-[#dce1e8]">等待六镜头计划</p>
            <p className="mt-1 text-xs text-[var(--muted)]">当前草案 {drafts.length} 项</p>
          </div>
        ) : (
          <ol className="grid gap-3 lg:grid-cols-2">
            {visibleDrafts.map((shot) => {
              const editing = editingShotId === shot.id
              return (
                <li
                  key={shot.id}
                  className={`rounded-xl border p-4 ${
                    shot.accepted
                      ? 'border-[#2c6b5a] bg-[#14201d]'
                      : 'border-[#303540] bg-[#15171c]'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-[#242932] text-[11px] font-semibold text-[#cdd4dd]">
                      {String(shot.number).padStart(2, '0')}
                    </span>
                    <div className="min-w-0 flex-1">
                      {editing ? (
                        <input
                          aria-label={`镜头 ${shot.number} 标题`}
                          value={shot.title}
                          onChange={(event) => onUpdateDraft(shot.id, { title: event.target.value })}
                          className={fieldClass}
                        />
                      ) : (
                        <p className="truncate text-sm font-medium text-[#f5f7fa]">{shot.title}</p>
                      )}
                      <div className="mt-1 flex flex-wrap gap-x-2 gap-y-1 text-[11px] text-[#a1abb8]">
                        <span>{shot.duration}</span>
                        <span aria-hidden="true">·</span>
                        <span>{shot.framing}</span>
                        <span aria-hidden="true">·</span>
                        <span>{shot.move}</span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setEditingShotId(editing ? null : shot.id)}
                      aria-expanded={editing}
                      className={`${focusRing} shrink-0 rounded-md px-2 py-1 text-[11px] text-[#73e8ff] hover:bg-[#223039]`}
                    >
                      {editing ? '完成' : '编辑'}
                    </button>
                  </div>

                  {editing ? (
                    <div className="mt-3 grid grid-cols-2 gap-2">
                      <DraftField
                        label="时长"
                        value={shot.duration}
                        onChange={(value) => onUpdateDraft(shot.id, { duration: value })}
                      />
                      <DraftField
                        label="景别"
                        value={shot.framing}
                        onChange={(value) => onUpdateDraft(shot.id, { framing: value })}
                      />
                      <DraftField
                        label="运镜"
                        value={shot.move}
                        onChange={(value) => onUpdateDraft(shot.id, { move: value })}
                      />
                      <DraftField
                        label="角色 / 产品"
                        value={shot.characters}
                        onChange={(value) => onUpdateDraft(shot.id, { characters: value })}
                      />
                      <div className="col-span-2">
                        <DraftField
                          label="对白"
                          value={shot.dialogue}
                          onChange={(value) => onUpdateDraft(shot.id, { dialogue: value })}
                        />
                      </div>
                      <div className="col-span-2">
                        <DraftField
                          label="声音"
                          value={shot.sound}
                          onChange={(value) => onUpdateDraft(shot.id, { sound: value })}
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="mt-3 space-y-1 text-[11px] leading-5 text-[#aab3bf]">
                      <p className="truncate">{shot.characters}</p>
                      <p className="truncate text-[var(--muted)]">{shot.dialogue || shot.sound}</p>
                    </div>
                  )}

                  <div className="mt-3 flex items-center justify-between border-t border-[#2b3039] pt-3">
                    <span className="text-[10px] text-[var(--muted)]">{shot.version}</span>
                    <button
                      type="button"
                      onClick={() => onAcceptDraft(shot.id, !shot.accepted)}
                      aria-pressed={shot.accepted}
                      className={`${focusRing} inline-flex min-h-8 items-center gap-1.5 rounded-md px-2.5 py-1.5 text-[11px] font-medium ${
                        shot.accepted
                          ? 'bg-[#235141] text-[#91e2bd]'
                          : 'bg-[#252a33] text-[#d7dde5] hover:bg-[#303640]'
                      }`}
                    >
                      <Check aria-hidden="true" size={13} />
                      {shot.accepted ? '已确认' : '确认镜头'}
                    </button>
                  </div>
                </li>
              )
            })}
          </ol>
        )}

        <div className="sticky bottom-0 mt-5 flex flex-col gap-3 border-t border-[#303540] bg-[#0d0f13]/95 py-4 backdrop-blur-sm sm:flex-row sm:items-center">
          <div className="min-w-0 flex-1" aria-live="polite">
            <p className="truncate text-xs text-[#b7c0cb]">
              {notice || (canGenerate ? '六个镜头已就绪' : `还需确认 ${Math.max(0, 6 - acceptedCount)} 个镜头`)}
            </p>
            {selectedModel && (
              <p className="mt-1 truncate text-[10px] text-[var(--muted)]">
                Estimate · {selectedModel.cost} · {selectedModel.speed} · {selectedModel.policy}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={() => void generateFirstPass()}
            disabled={!canGenerate}
            className={`${focusRing} inline-flex min-h-10 shrink-0 items-center justify-center gap-2 rounded-lg bg-[#4ee1ff] px-4 py-2 text-xs font-semibold text-[#071014] hover:bg-[#8beeff] disabled:cursor-not-allowed disabled:bg-[#293038] disabled:text-[var(--muted)]`}
          >
            <Sparkles aria-hidden="true" size={15} />
            {isGenerating || localGenerating ? '正在提交…' : '生成六镜头首轮'}
          </button>
        </div>
      </div>
    </section>
  )
}

export function NodesWorkspace({
  project,
  selectedShotId,
  prompt,
  models,
  selectedModelId,
  onSelectShot,
  onPromptChange,
  onSelectModel,
  onCreateSkill,
}: NodesWorkspaceProps) {
  const shot = project.shots.find((candidate) => candidate.id === selectedShotId) ?? project.shots[0]
  const model = models.find((candidate) => candidate.id === selectedModelId) ?? models[0]
  const latestJob = shot
    ? project.jobs.find((job) => job.shotId === shot.id)
    : undefined
  const references = useMemo(() => {
    if (!shot) return []
    const directlyNamed = project.entities.filter((entity) => shot.characters.includes(entity.name))
    const contextual = project.entities.filter((entity) =>
      entity.kind === 'location' || entity.kind === 'style',
    )
    return Array.from(new Map([...directlyNamed, ...contextual].map((entity) => [entity.id, entity])).values())
  }, [project.entities, shot])
  const [skillName, setSkillName] = useState(() =>
    shot ? `${shot.title} · Production Skill` : 'Production Skill',
  )
  const [skillStatus, setSkillStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [skillMessage, setSkillMessage] = useState('')

  useEffect(() => {
    if (shot) {
      setSkillName(`${shot.title} · Production Skill`)
      setSkillStatus('idle')
      setSkillMessage('')
    }
  }, [shot])

  if (!shot) {
    return (
      <section className="grid h-full place-items-center bg-[#0d0f13] p-6" aria-label="Nodes 工作区">
        <div className="text-center">
          <Workflow aria-hidden="true" className="mx-auto text-[var(--muted)]" size={22} />
          <p className="mt-3 text-sm text-[#dce1e8]">项目中还没有镜头</p>
        </div>
      </section>
    )
  }

  async function createSkill() {
    if (!skillName.trim() || !model) {
      setSkillStatus('error')
      setSkillMessage('请填写 Skill 名称并选择可用模型。')
      return
    }
    setSkillStatus('saving')
    setSkillMessage('')
    try {
      await onCreateSkill({
        name: skillName.trim(),
        projectId: project.id,
        shotId: shot.id,
        prompt,
        modelId: model.id,
      })
      setSkillStatus('saved')
      setSkillMessage('Skill 已保存，可在 Workflows 中复用。')
    } catch (error) {
      setSkillStatus('error')
      setSkillMessage(error instanceof Error ? error.message : 'Skill 保存失败，请重试。')
    }
  }

  const nodes = [
    {
      id: 'input',
      label: 'Input',
      accent: '#3a8fb7',
      body: (
        <select
          aria-label="节点镜头输入"
          value={shot.id}
          onChange={(event) => onSelectShot(event.target.value)}
          className={`${fieldClass} mt-2`}
        >
          {project.shots.map((candidate) => (
            <option key={candidate.id} value={candidate.id}>
              {String(candidate.number).padStart(2, '0')} · {candidate.title}
            </option>
          ))}
        </select>
      ),
    },
    {
      id: 'prompt',
      label: 'Prompt',
      accent: '#7c5cff',
      wide: true,
      body: (
        <textarea
          aria-label="Prompt 节点内容"
          value={prompt}
          onChange={(event) => onPromptChange(event.target.value)}
          rows={5}
          className={`${fieldClass} mt-2 resize-none leading-5`}
        />
      ),
    },
    {
      id: 'references',
      label: 'Entity Reference',
      accent: '#4ee1ff',
      body: (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {references.length > 0 ? references.slice(0, 4).map((entity) => (
            <span key={entity.id} className="rounded bg-[#222832] px-2 py-1 text-[10px] text-[#cbd3dc]">
              @{entity.name}
            </span>
          )) : (
            <span className="text-[11px] text-[var(--muted)]">无绑定实体</span>
          )}
        </div>
      ),
    },
    {
      id: 'router',
      label: 'Model Router',
      accent: '#f29e4c',
      body: (
        <div className="mt-2">
          <select
            aria-label="节点模型路由"
            value={model?.id ?? ''}
            onChange={(event) => onSelectModel(event.target.value)}
            className={fieldClass}
          >
            {models.map((candidate) => (
              <option key={candidate.id} value={candidate.id} disabled={candidate.status === 'maintenance'}>
                {candidate.name}{candidate.status === 'maintenance' ? ' · 维护中' : ''}
              </option>
            ))}
          </select>
          <p className="mt-2 text-[10px] leading-4 text-[var(--muted)]">
            {model ? `${model.quality} · ${model.cost} · ${model.speed}` : '没有可用模型'}
          </p>
        </div>
      ),
    },
    {
      id: 'generate',
      label: 'Generate',
      accent: '#56c596',
      body: (
        <div className="mt-2 space-y-1 text-[11px] text-[#c5cdd7]">
          <p>Video · {shot.duration}</p>
          <p className="text-[var(--muted)]">{model?.resolution ?? 'Auto'} · {shot.version}</p>
        </div>
      ),
    },
    {
      id: 'quality',
      label: 'Quality Check',
      accent: '#e8d44d',
      body: (
        <div className="mt-2 space-y-1 text-[11px] text-[#c5cdd7]">
          <p>Continuity · Entity lock</p>
          <p className={shot.warning ? 'text-[#f3c877]' : 'text-[#82d9ae]'}>
            {shot.warning ? '1 项待处理' : '检查通过'}
          </p>
        </div>
      ),
    },
    {
      id: 'output',
      label: 'Output',
      accent: '#4ee1ff',
      body: (
        <div className="mt-2 space-y-1 text-[11px] text-[#c5cdd7]">
          <p>Shot {String(shot.number).padStart(2, '0')} · {shot.version}</p>
          <p className="text-[var(--muted)]">{latestJob ? `${latestJob.status} · ${latestJob.progress}%` : '等待生成'}</p>
        </div>
      ),
    },
  ]

  return (
    <section
      aria-labelledby="nodes-workspace-title"
      className="h-full min-h-0 overflow-y-auto bg-[#0d0f13] px-4 py-5 sm:px-6 lg:px-8"
    >
      <div className="mx-auto max-w-[1500px]">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="flex items-center gap-2 text-xs font-medium text-[#4ee1ff]">
              <Workflow aria-hidden="true" size={16} />
              Nodes · Shot {String(shot.number).padStart(2, '0')}
            </div>
            <h2 id="nodes-workspace-title" className="mt-2 text-lg font-semibold text-[#f5f7fa]">
              {shot.title}
            </h2>
          </div>
          <div className="flex items-center gap-2 text-[11px] text-[#a3acb9]">
            <Clock3 aria-hidden="true" size={13} />
            {shot.duration} · {shot.framing} · {shot.move}
          </div>
        </div>

        <div className="mt-6 overflow-x-visible lg:overflow-x-auto lg:pb-3">
          <ol className="flex flex-col items-stretch gap-2 lg:min-w-[1240px] lg:flex-row lg:items-center lg:gap-2">
            {nodes.map((node, index) => (
              <li key={node.id} className="contents">
                <article
                  className={`min-h-[126px] rounded-xl border border-[#343945] border-t-2 bg-[#16191f] p-3 ${
                    node.wide ? 'lg:w-[210px]' : 'lg:w-[150px]'
                  } lg:shrink-0`}
                  style={{ borderTopColor: node.accent }}
                >
                  <p className="text-[10px] font-semibold uppercase text-[#9ca6b4]">{node.label}</p>
                  {node.body}
                </article>
                {index < nodes.length - 1 && (
                  <ArrowRight
                    aria-hidden="true"
                    size={16}
                    className="mx-auto rotate-90 shrink-0 text-[var(--muted)] lg:mx-0 lg:rotate-0"
                  />
                )}
              </li>
            ))}
          </ol>
        </div>

        <div className="mt-6 grid gap-4 rounded-xl border border-[#303540] bg-[#15171c] p-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
          <label className="grid min-w-0 gap-1.5 text-[11px] text-[#aab3bf]">
            Skill 名称
            <input
              value={skillName}
              onChange={(event) => {
                setSkillName(event.target.value)
                if (skillStatus !== 'idle') setSkillStatus('idle')
              }}
              className={fieldClass}
            />
          </label>
          <button
            type="button"
            onClick={() => void createSkill()}
            disabled={skillStatus === 'saving'}
            className={`${focusRing} inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-[#4ee1ff] px-4 py-2 text-xs font-semibold text-[#071014] hover:bg-[#8beeff] disabled:cursor-not-allowed disabled:opacity-55`}
          >
            {skillStatus === 'saved' ? <Check aria-hidden="true" size={15} /> : <Workflow aria-hidden="true" size={15} />}
            {skillStatus === 'saving' ? '正在保存…' : skillStatus === 'saved' ? '已创建 Skill' : '创建 Skill'}
          </button>
          <p
            aria-live="polite"
            className={`min-h-4 text-[11px] lg:col-span-2 ${
              skillStatus === 'error' ? 'text-[#ff9aaa]' : 'text-[#91ddb9]'
            }`}
          >
            {skillMessage}
          </p>
        </div>
      </div>
    </section>
  )
}

export function StoryboardWorkspace({
  project,
  selectedShotId,
  onSelectShot,
  onUpdateShot,
}: StoryboardWorkspaceProps) {
  const totalDuration = formatTotalDuration(project.shots)
  const warningCount = project.shots.filter((shot) => Boolean(shot.warning)).length
  const continuityScore = Math.max(0, 100 - warningCount * 6)

  return (
    <section
      aria-labelledby="storyboard-workspace-title"
      className="h-full min-h-0 overflow-y-auto bg-[#0d0f13] px-3 py-5 sm:px-6"
    >
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-col gap-3 border-b border-[#292d36] pb-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-medium text-[#4ee1ff]">Storyboard</p>
            <h2 id="storyboard-workspace-title" className="mt-2 text-lg font-semibold text-[#f5f7fa]">
              {project.shots.length} 个镜头 · {totalDuration}
            </h2>
          </div>
          <p className="text-xs text-[#a3acb9]">
            连续性 <span className={warningCount > 0 ? 'text-[#f3c877]' : 'text-[#82d9ae]'}>{continuityScore}%</span>
          </p>
        </div>

        {project.shots.length === 0 ? (
          <div className="mt-5 rounded-xl border border-dashed border-[#3a404b] bg-[#13151a] px-5 py-10 text-center">
            <Bot aria-hidden="true" className="mx-auto text-[var(--muted)]" size={22} />
            <p className="mt-3 text-sm text-[#dce1e8]">还没有分镜</p>
          </div>
        ) : (
          <ol className="mt-5 space-y-3">
            {project.shots.map((shot) => {
              const selected = selectedShotId === shot.id
              return (
                <li key={shot.id}>
                  <article
                    className={`grid min-w-0 gap-3 rounded-xl border p-3 sm:grid-cols-[36px_128px_minmax(0,.85fr)_minmax(0,1.15fr)] sm:items-start lg:grid-cols-[36px_144px_minmax(180px,.75fr)_minmax(260px,1.25fr)_auto] ${
                      selected
                        ? 'border-[#4ee1ff] bg-[#152128]'
                        : 'border-[#303540] bg-[#15171c]'
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => onSelectShot(shot.id)}
                      aria-pressed={selected}
                      aria-label={`选择镜头 ${shot.number}：${shot.title}`}
                      className={`${focusRing} flex h-9 w-9 items-center justify-center rounded-lg bg-[#252a33] text-[11px] font-semibold text-[#d8dee6]`}
                    >
                      {String(shot.number).padStart(2, '0')}
                    </button>

                    <button
                      type="button"
                      onClick={() => onSelectShot(shot.id)}
                      aria-label={`预览并选择镜头 ${shot.number}`}
                      className={`${focusRing} relative block aspect-video w-full overflow-hidden rounded-lg bg-[#242932] sm:aspect-[16/10]`}
                    >
                      {shot.image ? (
                        <img src={shot.image} alt={`${shot.title} 预览`} className="h-full w-full object-cover" />
                      ) : (
                        <span className="grid h-full place-items-center text-[10px] text-[var(--muted)]">No preview</span>
                      )}
                      <span className="absolute bottom-1.5 right-1.5 rounded bg-[#0b0c0f]/85 px-1.5 py-0.5 text-[10px] text-[#f5f7fa]">
                        {shot.version}
                      </span>
                    </button>

                    <div className="grid min-w-0 gap-2">
                      <label className="grid gap-1 text-[10px] text-[#9ea8b6]">
                        镜头标题
                        <input
                          value={shot.title}
                          onFocus={() => onSelectShot(shot.id)}
                          onChange={(event) => onUpdateShot(shot.id, { title: event.target.value })}
                          className={fieldClass}
                        />
                      </label>
                      <div className="grid grid-cols-[90px_minmax(0,1fr)] gap-2">
                        <label className="grid gap-1 text-[10px] text-[#9ea8b6]">
                          时长
                          <input
                            value={shot.duration}
                            onFocus={() => onSelectShot(shot.id)}
                            onChange={(event) => onUpdateShot(shot.id, { duration: event.target.value })}
                            inputMode="decimal"
                            aria-label={`镜头 ${shot.number} 时长`}
                            className={fieldClass}
                          />
                        </label>
                        <div className="min-w-0 pt-[18px] text-[11px] leading-5 text-[#aab3bf]">
                          <p className="truncate">{shot.framing} · {shot.move}</p>
                          <p className="truncate text-[var(--muted)]">{shot.characters || '未绑定角色或产品'}</p>
                        </div>
                      </div>
                    </div>

                    <div className="grid min-w-0 gap-2">
                      <label className="grid gap-1 text-[10px] text-[#9ea8b6]">
                        对白 / 旁白
                        <textarea
                          value={shot.dialogue}
                          onFocus={() => onSelectShot(shot.id)}
                          onChange={(event) => onUpdateShot(shot.id, { dialogue: event.target.value })}
                          rows={2}
                          placeholder="无对白"
                          className={`${fieldClass} resize-y leading-5`}
                        />
                      </label>
                      <div className="flex min-w-0 items-center gap-2 text-[11px] text-[#aab3bf]">
                        <span className="shrink-0 text-[var(--muted)]">声音</span>
                        <span className="truncate">{shot.sound || '未设置'}</span>
                      </div>
                    </div>

                    <div className="flex min-w-0 items-start justify-between gap-2 sm:col-span-4 lg:col-span-1 lg:block lg:w-32">
                      <div className="text-[10px] leading-5 text-[#9ca6b4]">
                        <p>{shot.framing}</p>
                        <p>{shot.move}</p>
                      </div>
                      {shot.warning ? (
                        <p className="max-w-[240px] rounded-md bg-[#4a371d] px-2 py-1.5 text-[10px] leading-4 text-[#ffd08a] lg:mt-2">
                          {shot.warning}
                        </p>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[10px] text-[#82d9ae] lg:mt-2">
                          <Check aria-hidden="true" size={12} /> 连续性通过
                        </span>
                      )}
                    </div>
                  </article>
                </li>
              )
            })}
          </ol>
        )}
      </div>
    </section>
  )
}

function BriefField({
  label,
  value,
  placeholder,
  onChange,
}: {
  label: string
  value: string
  placeholder: string
  onChange: (value: string) => void
}) {
  return (
    <label className="grid gap-1.5 text-[11px] text-[#aab3bf]">
      {label}
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className={fieldClass}
      />
    </label>
  )
}

function DraftField({
  label,
  value,
  onChange,
}: {
  label: string
  value: string
  onChange: (value: string) => void
}) {
  return (
    <label className="grid gap-1 text-[10px] text-[#9ea8b6]">
      {label}
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={fieldClass}
      />
    </label>
  )
}

function formatTotalDuration(shots: readonly Pick<Shot, 'duration'>[]): string {
  const seconds = shots.reduce((total, shot) => {
    const parsed = Number.parseFloat(shot.duration)
    return total + (Number.isFinite(parsed) ? parsed : 0)
  }, 0)
  return `${Number.isInteger(seconds) ? seconds : seconds.toFixed(1)} 秒`
}
