'use client'

import { Excalidraw, convertToExcalidrawElements } from '@excalidraw/excalidraw'
import type { AppState, BinaryFiles, ExcalidrawImperativeAPI, ExcalidrawInitialDataState } from '@excalidraw/excalidraw/types'
import type { OrderedExcalidrawElement } from '@excalidraw/excalidraw/element/types'
import '@excalidraw/excalidraw/index.css'

type ExcalidrawClientProps = {
  initialData?: ExcalidrawInitialDataState
  onChange: (elements: readonly OrderedExcalidrawElement[], appState: AppState, files: BinaryFiles) => void
  onApi: (api: ExcalidrawImperativeAPI) => void
  onZoomChange: (zoom: number) => void
}

export function ExcalidrawClient({ initialData, onChange, onApi, onZoomChange }: ExcalidrawClientProps) {
  return <Excalidraw
    name="FlowOS Infinite Canvas"
    langCode="zh-CN"
    theme="light"
    initialData={initialData ?? {
      elements: convertToExcalidrawElements([
        { type: 'rectangle', x: 80, y: 70, width: 260, height: 150, backgroundColor: '#e8f7f8', strokeColor: '#16a6b7' },
        { type: 'text', x: 105, y: 128, text: '城市生活方式品牌\n30 秒品牌短片', fontSize: 22, fontFamily: 1 },
        { type: 'rectangle', x: 455, y: 70, width: 260, height: 150, backgroundColor: '#f1efff', strokeColor: '#7067e8' },
        { type: 'text', x: 480, y: 128, text: '6 个叙事段落\n情绪 · 角色 · 节奏', fontSize: 22, fontFamily: 1 },
        { type: 'rectangle', x: 830, y: 70, width: 260, height: 150, backgroundColor: '#fff2ed', strokeColor: '#ef765f' },
        { type: 'text', x: 855, y: 128, text: '16:9 · 4K\n待审核', fontSize: 22, fontFamily: 1 },
        { type: 'line', x: 340, y: 145, points: [[0, 0], [115, 0]], strokeColor: '#16a6b7', strokeWidth: 2 },
        { type: 'line', x: 715, y: 145, points: [[0, 0], [115, 0]], strokeColor: '#16a6b7', strokeWidth: 2 },
        { type: 'text', x: 105, y: 315, text: '镜头与素材区域', fontSize: 26, fontFamily: 1, strokeColor: '#26343a' },
        { type: 'rectangle', x: 80, y: 365, width: 300, height: 175, backgroundColor: '#fffdf4', strokeColor: '#d9a441' },
        { type: 'text', x: 108, y: 422, text: '@女主角\n@城市晨光\n#电影感', fontSize: 21, fontFamily: 1 },
        { type: 'rectangle', x: 455, y: 365, width: 300, height: 175, backgroundColor: '#f4f7f7', strokeColor: '#7f9298' },
        { type: 'text', x: 483, y: 422, text: '01 清晨街角\n02 咖啡馆\n03 产品特写', fontSize: 21, fontFamily: 1 },
      ]),
      appState: { viewBackgroundColor: '#f4f7f7', currentItemFontFamily: 1 },
      files: {},
    }}
    UIOptions={{ canvasActions: { saveToActiveFile: false, loadScene: true, export: { saveFileToDisk: true } } }}
    onChange={onChange}
    excalidrawAPI={onApi}
    onScrollChange={(_, __, zoom) => onZoomChange(Math.round(zoom.value * 100))}
  />
}
