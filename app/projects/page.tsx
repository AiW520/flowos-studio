'use client'

import { PreviewImage } from '@/components/PreviewImage'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import { AppShell, SearchBox, Topbar } from '@/components/AppShell'
import { NewProjectDialog } from '@/components/NewProjectDialog'
import { Archive, Clapperboard, Folder, Plus, Trash2 } from '@/components/icons'
import { useProjectStore } from '@/lib/use-project-store'

type ProjectScope = 'all' | 'production' | 'draft' | 'archived' | 'trash'

const scopes: { id: ProjectScope; label: string; icon?: typeof Folder }[] = [
  { id: 'all', label: '全部项目', icon: Folder },
  { id: 'production', label: '制作中' },
  { id: 'draft', label: '待规划' },
  { id: 'archived', label: '归档', icon: Archive },
  { id: 'trash', label: '回收站', icon: Trash2 },
]

function totalDuration(shots: readonly { duration: string }[]) {
  return shots.reduce((sum, shot) => sum + (Number.parseFloat(shot.duration) || 0), 0)
}

function projectState(project: { status?: string; shots: readonly unknown[]; jobs: readonly { status: string }[] }) {
  if (project.status === 'archived') return { label: '已归档', className: 'bg-[#252a32] text-[#a0a9b6]' }
  if (project.status === 'trashed') return { label: '回收站', className: 'bg-[#33262a] text-[#d49aa4]' }
  if (project.jobs.some((job) => job.status === 'failed')) {
    return { label: '需要处理', className: 'bg-[#3b242b] text-[#f39aa8]' }
  }
  if (project.jobs.some((job) => job.status === 'running' || job.status === 'queued')) {
    return { label: '制作中', className: 'bg-[#18343b] text-[#75e2f6]' }
  }
  if (!project.shots.length) {
    return { label: '待规划', className: 'bg-[#292633] text-[#baaaff]' }
  }
  return { label: '可继续', className: 'bg-[#1d4030] text-[#7ed5a8]' }
}

export default function Projects() {
  const { projects, hydrated, persistenceError } = useProjectStore()
  const [scope, setScope] = useState<ProjectScope>('all')
  const [query, setQuery] = useState('')
  const [showNewProject, setShowNewProject] = useState(false)

  const visibleProjects = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase('zh-CN')
    return [...projects]
      .filter((project) => {
        if (scope === 'archived' && project.status !== 'archived') return false
        if (scope === 'trash' && project.status !== 'trashed') return false
        if (scope === 'all' && (project.status === 'archived' || project.status === 'trashed')) return false
        if (scope === 'production' && (
          project.status === 'archived'
          || project.status === 'trashed'
          || !project.jobs.some((job) => job.status === 'queued' || job.status === 'running')
        )) return false
        if (scope === 'draft' && (
          project.status === 'archived'
          || project.status === 'trashed'
          || (project.status !== 'draft' && project.shots.length > 0)
        )) return false
        return !normalizedQuery
          || project.name.toLocaleLowerCase('zh-CN').includes(normalizedQuery)
          || project.type.toLocaleLowerCase('zh-CN').includes(normalizedQuery)
      })
      .sort((a, b) => b.updatedAtIso.localeCompare(a.updatedAtIso))
  }, [projects, query, scope])

  return (
    <AppShell>
      <Topbar
        title="Projects"
        actions={(
          <>
            <SearchBox
              placeholder="搜索项目"
              value={query}
              onChange={setQuery}
              className="hidden sm:flex"
            />
            <button
              type="button"
              onClick={() => setShowNewProject(true)}
              className="focus-ring inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lg bg-[#4ee1ff] px-2.5 text-xs font-semibold text-[#071014] sm:px-3"
            >
              <Plus size={14} aria-hidden="true" />
              <span className="hidden sm:inline">New project</span>
            </button>
          </>
        )}
      />

      <div className="mx-auto max-w-[1200px] p-4 sm:p-6 lg:p-8">
        <div className="sm:hidden">
          <SearchBox placeholder="搜索项目" value={query} onChange={setQuery} className="max-w-none" />
        </div>

        <div className="mt-4 flex items-end justify-between gap-4 sm:mt-0">
          <div>
            <div className="text-xs uppercase tracking-[.14em] text-[#4ee1ff]">Workspace library</div>
            <h1 className="mt-2 text-2xl font-semibold">项目</h1>
            <p className="mt-2 text-sm text-[#8f98a6]">从 Brief、资产与镜头状态继续工作。</p>
          </div>
          <div className="shrink-0 text-xs text-[#7d8795]">{projects.length} 个项目</div>
        </div>

        {persistenceError && (
          <div role="status" className="mt-5 rounded-lg border border-[#754452] bg-[#2c1d22] px-4 py-3 text-xs text-[#f2a7b3]">
            本地项目暂时无法保存：{persistenceError}
          </div>
        )}

        <div className="mt-7 flex gap-1 overflow-x-auto border-b border-[#292e38] pb-2 scrollbar" role="tablist" aria-label="项目状态">
          {scopes.map((item) => {
            const Icon = item.icon
            return (
              <button
                key={item.id}
                type="button"
                role="tab"
                aria-selected={scope === item.id}
                onClick={() => setScope(item.id)}
                className={`focus-ring inline-flex h-8 shrink-0 items-center gap-1.5 rounded-md px-3 text-xs ${
                  scope === item.id ? 'bg-[#26333a] text-[#4ee1ff]' : 'text-[#858f9e] hover:bg-[#181b21] hover:text-white'
                }`}
              >
                {Icon && <Icon size={13} aria-hidden="true" />}
                {item.label}
                {item.id === 'all' && <span className="text-[10px] text-[#7f8997]">{projects.length}</span>}
              </button>
            )
          })}
        </div>

        {!hydrated ? (
          <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[0, 1, 2].map((item) => <div key={item} className="h-64 animate-pulse rounded-xl bg-[#15171c]" />)}
          </div>
        ) : visibleProjects.length ? (
          <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {visibleProjects.map((project) => {
              const preview = project.entities[0]?.image ?? project.shots[0]?.image
              const state = projectState(project)
              const duration = totalDuration(project.shots)
              return (
                <Link
                  key={project.id}
                  href={`/project/${project.id}`}
                  className="surface focus-ring group min-w-0 overflow-hidden transition-colors hover:border-[#46505d]"
                >
                  <div className="aspect-[16/9] w-full overflow-hidden bg-[#1b1f26]">
                    {preview ? (
                      <PreviewImage src={preview} alt="" className="h-full w-full object-cover transition-transform group-hover:scale-[1.02]" />
                    ) : (
                      <div className="flex h-full items-center justify-center bg-[linear-gradient(135deg,#19252b,#22202d)] text-[#61707d]">
                        <Clapperboard size={28} aria-hidden="true" />
                      </div>
                    )}
                  </div>
                  <div className="p-4">
                    <div className="flex min-w-0 items-center gap-2">
                      <div className="truncate font-medium">{project.name}</div>
                      <span className={`ml-auto shrink-0 rounded px-2 py-1 text-[10px] ${state.className}`}>{state.label}</span>
                    </div>
                    <div className="mt-2 truncate text-xs text-[#7d8795]">
                      {project.type} · {project.shots.length ? `${project.shots.length} 镜头` : '空白 Brief'} · 更新于 {project.updated}
                    </div>
                    <div className="mt-3 flex items-center gap-1.5 text-[10px] text-[#8d97a5]">
                      <span className="rounded bg-[#20252d] px-2 py-1">{duration ? `${duration}s` : '未定时长'}</span>
                      <span className="rounded bg-[#20252d] px-2 py-1">{project.entities.length} 资产</span>
                      <span className="ml-auto">{project.jobs.length} tasks</span>
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        ) : (
          <div className="mt-5 flex min-h-[300px] flex-col items-center justify-center rounded-xl border border-dashed border-[#303641] bg-[#111318] px-6 text-center">
            <Folder size={24} className="text-[#596573]" aria-hidden="true" />
            <h2 className="mt-4 text-sm font-medium">
              {query ? '没有匹配的项目' : scope === 'archived' ? '归档为空' : scope === 'trash' ? '回收站为空' : '这里还没有项目'}
            </h2>
            <p className="mt-2 max-w-sm text-xs leading-5 text-[#737d8b]">
              {query ? '调整关键词，或清除搜索后查看全部项目。' : '创建项目后，Agent、镜头、资产和生成队列会保存在同一个工作区。'}
            </p>
            {query ? (
              <button
                type="button"
                onClick={() => setQuery('')}
                className="focus-ring mt-4 h-9 rounded-lg bg-[#222730] px-4 text-xs hover:bg-[#2b313b]"
              >
                清除搜索
              </button>
            ) : (scope === 'all' || scope === 'production' || scope === 'draft') && (
              <button
                type="button"
                onClick={() => setShowNewProject(true)}
                className="focus-ring mt-4 inline-flex h-9 items-center gap-2 rounded-lg bg-[#4ee1ff] px-4 text-xs font-semibold text-[#071014]"
              >
                <Plus size={14} aria-hidden="true" /> 新建项目
              </button>
            )}
          </div>
        )}
      </div>

      {showNewProject && <NewProjectDialog open onOpenChange={setShowNewProject} />}
    </AppShell>
  )
}
