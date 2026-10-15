'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { LucideIcon } from 'lucide-react'
import {
  ArrowRight,
  Clapperboard,
  Grid2X2,
  Image,
  Package,
  Users,
  Workflow,
  X,
} from './icons'
import { useProjectStore } from '@/lib/use-project-store'
import type { ProjectLanguage } from '@/lib/types'

export type ProjectFormatId =
  | 'story-film'
  | 'product-ad'
  | 'character-series'
  | 'social-kit'
  | 'image-design'
  | 'custom-workflow'

export interface ProjectFormat {
  id: ProjectFormatId
  label: string
  description: string
  starter: string
  icon: LucideIcon
  color: string
}

export const projectFormats: ProjectFormat[] = [
  {
    id: 'story-film',
    label: '故事短片',
    description: '从故事目标到分镜、镜头与成片',
    starter: '未命名故事短片',
    icon: Clapperboard,
    color: '#4EE1FF',
  },
  {
    id: 'product-ad',
    label: '产品广告',
    description: '围绕卖点、产品资产与交付规格创作',
    starter: '未命名产品广告',
    icon: Package,
    color: '#77D7A8',
  },
  {
    id: 'character-series',
    label: '系列角色',
    description: '建立角色 Bible 与跨镜头一致性',
    starter: '未命名角色系列',
    icon: Users,
    color: '#A992FF',
  },
  {
    id: 'social-kit',
    label: '社媒套件',
    description: '一次规划多平台、多画幅内容',
    starter: '未命名社媒套件',
    icon: Grid2X2,
    color: '#F2C56B',
  },
  {
    id: 'image-design',
    label: '图像设计',
    description: '用于 KV、海报与静态视觉探索',
    starter: '未命名图像设计',
    icon: Image,
    color: '#F38CA2',
  },
  {
    id: 'custom-workflow',
    label: '自定义工作流',
    description: '从空白节点图搭建可复用方法',
    starter: '未命名工作流',
    icon: Workflow,
    color: '#8EA7FF',
  },
]

export const PROJECT_BRIEF_STORAGE_PREFIX = 'flowos:project-brief:'

export const projectLanguages: Array<{ id: ProjectLanguage; label: string }> = [
  { id: 'zh-CN', label: '简体中文' },
  { id: 'en-US', label: 'English' },
  { id: 'zh-TW', label: '繁體中文' },
  { id: 'ja-JP', label: '日本語' },
  { id: 'ko-KR', label: '한국어' },
]

function briefWithLanguage(brief: string, language: ProjectLanguage) {
  const label = projectLanguages.find((item) => item.id === language)?.label ?? '简体中文'
  const preference = `输出语言：${label}。`
  return brief.trim() ? `${preference}\n${brief.trim()}` : preference
}

export function rememberProjectBrief(projectId: string, brief: string) {
  if (typeof window === 'undefined' || !brief.trim()) return
  try {
    window.localStorage.setItem(`${PROJECT_BRIEF_STORAGE_PREFIX}${projectId}`, brief.trim())
  } catch {
    // Project creation should still succeed when browser storage is unavailable.
  }
}

export function projectWorkspaceHref(projectId: string, brief?: string) {
  const params = new URLSearchParams()
  if (brief?.trim()) params.set('brief', '1')
  const query = params.toString()
  return `/project/${encodeURIComponent(projectId)}${query ? `?${query}` : ''}`
}

interface NewProjectDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  initialType?: ProjectFormatId
  initialName?: string
  initialBrief?: string
  initialLanguage?: ProjectLanguage
}

export function NewProjectDialog({
  open,
  onOpenChange,
  initialType = 'story-film',
  initialName = '',
  initialBrief = '',
  initialLanguage = 'zh-CN',
}: NewProjectDialogProps) {
  const router = useRouter()
  const { createProject } = useProjectStore()
  const dialogRef = useRef<HTMLDivElement>(null)
  const nameRef = useRef<HTMLInputElement>(null)
  const returnFocusRef = useRef<HTMLElement | null>(null)
  const [formatId, setFormatId] = useState<ProjectFormatId>(initialType)
  const [name, setName] = useState(initialName)
  const [brief, setBrief] = useState(initialBrief)
  const [language, setLanguage] = useState<ProjectLanguage>(initialLanguage)
  const [submitting, setSubmitting] = useState(false)

  const format = useMemo(
    () => projectFormats.find((candidate) => candidate.id === formatId) ?? projectFormats[0],
    [formatId],
  )

  useEffect(() => {
    if (!open) return
    returnFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null
    setFormatId(initialType)
    setName(initialName)
    setBrief(initialBrief)
    setLanguage(initialLanguage)
    setSubmitting(false)
    const frame = window.requestAnimationFrame(() => nameRef.current?.focus())

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        onOpenChange(false)
        return
      }
      if (event.key !== 'Tab' || !dialogRef.current) return
      const focusable = Array.from(
        dialogRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), input:not([disabled]), textarea:not([disabled]), [href], [tabindex]:not([tabindex="-1"])',
        ),
      )
      if (!focusable.length) return
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => {
      window.cancelAnimationFrame(frame)
      document.removeEventListener('keydown', handleKeyDown)
      returnFocusRef.current?.focus()
    }
  }, [initialBrief, initialLanguage, initialName, initialType, onOpenChange, open])

  if (!open) return null

  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (submitting) return
    setSubmitting(true)
    const project = createProject({
      name: name.trim() || format.starter,
      type: format.label,
      outputLanguage: language,
    })
    const projectBrief = briefWithLanguage(brief, language)
    rememberProjectBrief(project.id, projectBrief)
    onOpenChange(false)
    router.push(projectWorkspaceHref(project.id, projectBrief))
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center bg-black/70 p-0 sm:items-center sm:p-6"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onOpenChange(false)
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="new-project-title"
        aria-describedby="new-project-description"
        className="max-h-[92dvh] w-full overflow-y-auto rounded-t-2xl border border-[#303641] bg-[#111318] shadow-2xl sm:max-w-[760px] sm:rounded-2xl"
      >
        <div className="sticky top-0 z-10 flex items-start border-b border-[#292e38] bg-[#111318] px-5 py-4 sm:px-6">
          <div>
            <h2 id="new-project-title" className="text-base font-semibold">新建项目</h2>
            <p id="new-project-description" className="mt-1 text-xs text-[#8d97a6]">
              选择一个起点，项目中的 Agent、画布与时间线将共用同一份数据。
            </p>
          </div>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="focus-ring ml-auto rounded-lg p-2 text-[#8791a0] hover:bg-[#20242b] hover:text-white"
            aria-label="关闭新建项目对话框"
          >
            <X size={17} />
          </button>
        </div>

        <form onSubmit={submit}>
          <div className="p-5 sm:p-6">
            <fieldset>
              <legend className="text-[11px] font-medium uppercase text-[#7e8897]">项目类型</legend>
              <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
                {projectFormats.map((candidate) => {
                  const Icon = candidate.icon
                  const selected = candidate.id === formatId
                  return (
                    <button
                      key={candidate.id}
                      type="button"
                      onClick={() => setFormatId(candidate.id)}
                      aria-pressed={selected}
                      className={`focus-ring min-h-[116px] rounded-xl border p-3 text-left transition-colors ${
                        selected
                          ? 'border-[#4ee1ff] bg-[#17262b]'
                          : 'border-[#2a2f38] bg-[#171a20] hover:border-[#444b58]'
                      }`}
                    >
                      <span
                        className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#232831]"
                        style={{ color: candidate.color }}
                      >
                        <Icon size={17} aria-hidden="true" />
                      </span>
                      <span className="mt-3 block text-xs font-medium text-[#f5f7fa]">{candidate.label}</span>
                      <span className="mt-1 block text-[10px] leading-4 text-[#818b9a]">{candidate.description}</span>
                    </button>
                  )
                })}
              </div>
            </fieldset>

            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <label className="block">
                <span className="text-[11px] font-medium text-[#9099a8]">项目名称</span>
                <input
                  ref={nameRef}
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  maxLength={80}
                  placeholder={format.starter}
                  className="focus-ring mt-2 h-10 w-full rounded-lg border border-[#303641] bg-[#191c22] px-3 text-xs text-white placeholder:text-[#68717f]"
                />
              </label>
              <label className="block">
                <span className="text-[11px] font-medium text-[#9099a8]">输出语言</span>
                <select
                  value={language}
                  onChange={(event) => setLanguage(event.target.value as ProjectLanguage)}
                  aria-label="输出语言"
                  className="focus-ring mt-2 h-10 w-full rounded-lg border border-[#303641] bg-[#191c22] px-3 text-xs text-white"
                >
                  {projectLanguages.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
                </select>
              </label>
              <label className="block sm:col-span-2">
                <span className="text-[11px] font-medium text-[#9099a8]">Brief（可选）</span>
                <textarea
                  value={brief}
                  onChange={(event) => setBrief(event.target.value)}
                  maxLength={800}
                  rows={4}
                  placeholder="描述受众、目标、时长、情绪与交付规格…"
                  className="focus-ring mt-2 w-full resize-none rounded-lg border border-[#303641] bg-[#191c22] p-3 text-xs leading-5 text-white placeholder:text-[#68717f]"
                />
              </label>
              <div className="rounded-lg border border-[#273740] bg-[#142027] px-3 py-2 text-[10px] leading-4 text-[#9fc4cc] sm:col-span-2">
                创建后进入 Agent 模式。你可以先确认资产清单和六镜头方案，再提交模拟生成任务。
              </div>
            </div>
          </div>

          <div className="sticky bottom-0 flex items-center justify-end gap-2 border-t border-[#292e38] bg-[#111318] px-5 py-4 sm:px-6">
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="focus-ring h-9 rounded-lg px-4 text-xs text-[#a3acb9] hover:bg-[#20242b]"
            >
              取消
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="focus-ring inline-flex h-9 min-w-[112px] items-center justify-center gap-2 rounded-lg bg-[#4ee1ff] px-4 text-xs font-semibold text-[#071014] disabled:cursor-wait disabled:opacity-60"
            >
              {submitting ? '正在创建…' : '创建并规划'}
              {!submitting && <ArrowRight size={14} aria-hidden="true" />}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
