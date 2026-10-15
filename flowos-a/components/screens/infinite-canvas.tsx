'use client'

import dynamic from 'next/dynamic'
import { useCallback, useEffect, useImperativeHandle, useRef, useState, forwardRef } from 'react'
import type { AppState, BinaryFiles, ExcalidrawImperativeAPI, ExcalidrawInitialDataState } from '@excalidraw/excalidraw/types'
import type { OrderedExcalidrawElement } from '@excalidraw/excalidraw/element/types'

const ExcalidrawClient = dynamic(() => import('./excalidraw-client').then((module) => module.ExcalidrawClient), { ssr: false })

type SavedCanvas = ExcalidrawInitialDataState & {
  elements: readonly OrderedExcalidrawElement[]
}

export type InfiniteCanvasHandle = {
  undo: () => boolean
  redo: () => boolean
  zoomIn: () => void
  zoomOut: () => void
  fitView: () => void
  select: () => void
}

export const InfiniteCanvas = forwardRef<InfiniteCanvasHandle, { projectId: string; onZoomChange: (zoom: number) => void; onNotify: (message: string) => void }>(function InfiniteCanvas({ projectId, onZoomChange, onNotify }, ref) {
  const storageKey = `flowos-a:infinite-canvas:${projectId}`
  const apiRef = useRef<ExcalidrawImperativeAPI | null>(null)
  const [initialData, setInitialData] = useState<SavedCanvas | undefined>()
  const [ready, setReady] = useState(false)
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const pendingRef = useRef<string | null>(null)

  useEffect(() => {
    try {
      const stored = localStorage.getItem(storageKey)
      if (stored) setInitialData(JSON.parse(stored) as SavedCanvas)
    } catch { onNotify('无限画布数据无法读取，已恢复默认布局') }
    setReady(true)
  }, [onNotify, storageKey])

  useEffect(() => () => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    if (pendingRef.current) {
      try { localStorage.setItem(storageKey, pendingRef.current) } catch { /* Browser storage may be full. */ }
    }
  }, [storageKey])

  const save = useCallback((elements: readonly OrderedExcalidrawElement[], appState: AppState, files: BinaryFiles) => {
    pendingRef.current = JSON.stringify({ elements, appState: { viewBackgroundColor: appState.viewBackgroundColor, scrollX: appState.scrollX, scrollY: appState.scrollY, zoom: appState.zoom }, files })
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    saveTimerRef.current = setTimeout(() => {
      try { localStorage.setItem(storageKey, pendingRef.current ?? '') }
      catch { onNotify('本地存储空间不足，请从画布菜单导出作品备份') }
      pendingRef.current = null
    }, 280)
  }, [onNotify, storageKey])

  useImperativeHandle(ref, () => ({
    undo: () => { document.dispatchEvent(new KeyboardEvent('keydown', { key: 'z', code: 'KeyZ', ctrlKey: true, bubbles: true })); return true },
    redo: () => { document.dispatchEvent(new KeyboardEvent('keydown', { key: 'y', code: 'KeyY', ctrlKey: true, bubbles: true })); return true },
    zoomIn: () => { const api = apiRef.current; if (!api) return; const current = api.getAppState().zoom.value; api.updateScene({ appState: { zoom: { value: Math.min(2.4, current + 0.1) as AppState['zoom']['value'] } } }) },
    zoomOut: () => { const api = apiRef.current; if (!api) return; const current = api.getAppState().zoom.value; api.updateScene({ appState: { zoom: { value: Math.max(0.25, current - 0.1) as AppState['zoom']['value'] } } }) },
    fitView: () => { const api = apiRef.current; if (!api) return; api.scrollToContent(api.getSceneElements(), { fitToViewport: true, viewportZoomFactor: 0.82 }) },
    select: () => apiRef.current?.setActiveTool({ type: 'selection' }),
  }), [])

  if (!ready) return <div className="infinite-canvas-loading">正在加载画布…</div>
  return <div className="infinite-canvas" data-testid="infinite-canvas"><ExcalidrawClient initialData={initialData} onApi={(api) => { apiRef.current = api }} onChange={save} onZoomChange={onZoomChange} /></div>
})
