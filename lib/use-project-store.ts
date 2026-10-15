'use client'

import { useEffect, useMemo, useSyncExternalStore } from 'react'
import {
  getProjectRepository,
  type AddToTimelineInput,
  type BranchInput,
  type CreateProjectInput,
  type EnqueueGenerationInput,
  type MoveTimelineClipInput,
  type ProjectRepository,
  type RemixInput,
  type ShotPatch,
  type TrimTimelineClipInput,
} from './project-repository'

export function useProjectStore(projectId?: string, repository: ProjectRepository = getProjectRepository()) {
  const snapshot = useSyncExternalStore(repository.subscribe, repository.getSnapshot, repository.getSnapshot)

  useEffect(() => {
    repository.hydrate()
    return repository.startAutoTick()
  }, [repository])

  const actions = useMemo(() => ({
    setCurrentProject: (id: string) => repository.setCurrentProject(id),
    createProject: (input: CreateProjectInput) => repository.createProject(input),
    updateShot: (shotId: string, patch: ShotPatch) => {
      const id = projectId ?? snapshot.currentProjectId
      if (!id) throw new Error('No current project')
      return repository.updateShot(id, shotId, patch)
    },
    replaceShots: (shots: Parameters<ProjectRepository['replaceShots']>[1]) => {
      const id = projectId ?? snapshot.currentProjectId
      if (!id) throw new Error('No current project')
      return repository.replaceShots(id, shots)
    },
    upsertShot: (shot: Parameters<ProjectRepository['upsertShot']>[1]) => {
      const id = projectId ?? snapshot.currentProjectId
      if (!id) throw new Error('No current project')
      return repository.upsertShot(id, shot)
    },
    bindEntityToShot: (shotId: string, entityId: string) => {
      const id = projectId ?? snapshot.currentProjectId
      if (!id) throw new Error('No current project')
      return repository.bindEntityToShot(id, shotId, entityId)
    },
    enqueue: (input: EnqueueGenerationInput) => {
      const id = projectId ?? snapshot.currentProjectId
      if (!id) throw new Error('No current project')
      return repository.enqueue(id, input)
    },
    enqueueGeneration: (input: EnqueueGenerationInput) => {
      const id = projectId ?? snapshot.currentProjectId
      if (!id) throw new Error('No current project')
      return repository.enqueueGeneration(id, input)
    },
    tick: (nowMs?: number) => repository.tick(projectId, nowMs),
    cancel: (jobId: string) => {
      const id = projectId ?? snapshot.currentProjectId
      if (!id) throw new Error('No current project')
      return repository.cancel(id, jobId)
    },
    retry: (jobId: string) => {
      const id = projectId ?? snapshot.currentProjectId
      if (!id) throw new Error('No current project')
      return repository.retry(id, jobId)
    },
    addToTimeline: (input: AddToTimelineInput) => {
      const id = projectId ?? snapshot.currentProjectId
      if (!id) throw new Error('No current project')
      return repository.addToTimeline(id, input)
    },
    moveTimelineClip: (input: MoveTimelineClipInput) => {
      const id = projectId ?? snapshot.currentProjectId
      if (!id) throw new Error('No current project')
      return repository.moveTimelineClip(id, input)
    },
    trimTimelineClip: (input: TrimTimelineClipInput) => {
      const id = projectId ?? snapshot.currentProjectId
      if (!id) throw new Error('No current project')
      return repository.trimTimelineClip(id, input)
    },
    reorderTimelineTracks: (trackIds: string[]) => {
      const id = projectId ?? snapshot.currentProjectId
      if (!id) throw new Error('No current project')
      return repository.reorderTimelineTracks(id, trackIds)
    },
    branch: (input: BranchInput = {}) => {
      const id = projectId ?? snapshot.currentProjectId
      if (!id) throw new Error('No current project')
      return repository.branch(id, input)
    },
    branchProject: (input: BranchInput = {}) => {
      const id = projectId ?? snapshot.currentProjectId
      if (!id) throw new Error('No current project')
      return repository.branchProject(id, input)
    },
    remix: (input: RemixInput = {}) => {
      const id = projectId ?? snapshot.currentProjectId
      if (!id) throw new Error('No current project')
      return repository.remix(id, input)
    },
    reset: () => repository.reset(),
  }), [projectId, repository, snapshot.currentProjectId])

  const currentProject = snapshot.projects.find((project) => project.id === (projectId ?? snapshot.currentProjectId))

  return {
    ...snapshot,
    currentProject,
    project: currentProject,
    jobs: currentProject?.jobs ?? [],
    timeline: currentProject?.timelineClips ?? [],
    ...actions,
  }
}
