'use client'

import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react'
import {
  addEdge,
  applyEdgeChanges,
  applyNodeChanges,
  Background,
  BackgroundVariant,
  Controls,
  Handle,
  MarkerType,
  MiniMap,
  Panel,
  Position,
  ReactFlow,
  type Connection,
  type Edge,
  type EdgeChange,
  type Node,
  type NodeChange,
  type NodeProps,
  type ReactFlowInstance,
  type Viewport,
} from '@xyflow/react'
import { Copy, Plus, Save, Trash2 } from 'lucide-react'

type WorkflowNodeData = { label: string; detail: string; kind: 'input' | 'process' | 'output' | 'asset' }
type WorkflowNode = Node<WorkflowNodeData, 'workflow'>
type Snapshot = { nodes: WorkflowNode[]; edges: Edge[] }

function WorkflowCardNode({ data, selected }: NodeProps<WorkflowNode>) {
  return <div className={`workflow-node-card kind-${data.kind} ${selected ? 'selected' : ''}`}>{data.kind !== 'input' && <Handle type="target" position={Position.Left} />}<span>{data.kind === 'input' ? '输入' : data.kind === 'output' ? '输出' : data.kind === 'asset' ? '素材' : '处理'}</span><strong>{data.label}</strong><small>{data.detail}</small>{data.kind !== 'output' && <Handle type="source" position={Position.Right} />}</div>
}

const nodeTypes = { workflow: WorkflowCardNode }

export type WorkflowCanvasHandle = {
  undo: () => boolean
  redo: () => boolean
  zoomIn: () => void
  zoomOut: () => void
  fitView: () => void
}

const initialNodes: WorkflowNode[] = [
  { id: 'brief', type: 'workflow', position: { x: 40, y: 170 }, data: { label: '项目 Brief', detail: '品牌短片 · 30 秒', kind: 'input' } },
  { id: 'script', type: 'workflow', position: { x: 285, y: 170 }, data: { label: '脚本拆解', detail: '6 个叙事段落', kind: 'process' } },
  { id: 'character', type: 'workflow', position: { x: 540, y: 70 }, data: { label: '角色一致性', detail: '1 个锁定实体', kind: 'process' } },
  { id: 'shots', type: 'workflow', position: { x: 540, y: 270 }, data: { label: '分镜生成', detail: '6 个镜头', kind: 'process' } },
  { id: 'output', type: 'workflow', position: { x: 790, y: 170 }, data: { label: '成片输出', detail: '16:9 · 4K', kind: 'output' } },
]

const initialEdges: Edge[] = [
  { id: 'brief-script', source: 'brief', target: 'script' },
  { id: 'script-character', source: 'script', target: 'character' },
  { id: 'script-shots', source: 'script', target: 'shots' },
  { id: 'character-output', source: 'character', target: 'output' },
  { id: 'shots-output', source: 'shots', target: 'output' },
].map((edge) => ({ ...edge, type: 'smoothstep', markerEnd: { type: MarkerType.ArrowClosed }, style: { stroke: '#16b8c8', strokeWidth: 2 } }))

export const WorkflowCanvas = forwardRef<WorkflowCanvasHandle, { projectId: string; onZoomChange: (zoom: number) => void; onNotify: (message: string) => void }>(function WorkflowCanvas({ projectId, onZoomChange, onNotify }, ref) {
  const storageKey = `flowos-a:workflow:${projectId}`
  const [nodes, setNodes] = useState<WorkflowNode[]>(initialNodes)
  const [edges, setEdges] = useState<Edge[]>(initialEdges)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [draftLabel, setDraftLabel] = useState('')
  const [draftDetail, setDraftDetail] = useState('')
  const [hydrated, setHydrated] = useState(false)
  const [historyVersion, setHistoryVersion] = useState(0)
  const nodesRef = useRef(nodes)
  const edgesRef = useRef(edges)
  const pastRef = useRef<Snapshot[]>([])
  const futureRef = useRef<Snapshot[]>([])
  const viewportRef = useRef<Viewport>({ x: 0, y: 0, zoom: 0.78 })
  const flowRef = useRef<ReactFlowInstance<WorkflowNode, Edge> | null>(null)

  useEffect(() => { nodesRef.current = nodes }, [nodes])
  useEffect(() => { edgesRef.current = edges }, [edges])

  useEffect(() => {
    const restore = window.setTimeout(() => {
      try {
        const stored = localStorage.getItem(storageKey)
        if (stored) {
          const parsed = JSON.parse(stored) as Snapshot & { viewport?: Viewport }
          if (Array.isArray(parsed.nodes) && Array.isArray(parsed.edges)) {
            setNodes(parsed.nodes)
            setEdges(parsed.edges)
            nodesRef.current = parsed.nodes
            edgesRef.current = parsed.edges
            if (parsed.viewport) {
              viewportRef.current = parsed.viewport
              void flowRef.current?.setViewport(parsed.viewport)
            }
          }
        }
      } catch { onNotify('本地画布数据无法读取，已恢复默认流程') }
      setHydrated(true)
    }, 0)
    return () => window.clearTimeout(restore)
  }, [storageKey, onNotify])

  useEffect(() => {
    if (!hydrated) return
    const save = window.setTimeout(() => {
      localStorage.setItem(storageKey, JSON.stringify({ nodes, edges, viewport: viewportRef.current }))
    }, 180)
    return () => window.clearTimeout(save)
  }, [edges, hydrated, nodes, storageKey])

  const checkpoint = useCallback(() => {
    pastRef.current = [...pastRef.current.slice(-39), structuredClone({ nodes: nodesRef.current, edges: edgesRef.current })]
    futureRef.current = []
    setHistoryVersion((value) => value + 1)
  }, [])

  const restore = useCallback((snapshot: Snapshot) => {
    setNodes(snapshot.nodes)
    setEdges(snapshot.edges)
    nodesRef.current = snapshot.nodes
    edgesRef.current = snapshot.edges
    setSelectedId(null)
  }, [])

  const undo = useCallback(() => {
    const previous = pastRef.current.at(-1)
    if (!previous) return false
    futureRef.current = [structuredClone({ nodes: nodesRef.current, edges: edgesRef.current }), ...futureRef.current.slice(0, 39)]
    pastRef.current = pastRef.current.slice(0, -1)
    restore(previous)
    setHistoryVersion((value) => value + 1)
    return true
  }, [restore])

  const redo = useCallback(() => {
    const next = futureRef.current[0]
    if (!next) return false
    pastRef.current = [...pastRef.current.slice(-39), structuredClone({ nodes: nodesRef.current, edges: edgesRef.current })]
    futureRef.current = futureRef.current.slice(1)
    restore(next)
    setHistoryVersion((value) => value + 1)
    return true
  }, [restore])

  useImperativeHandle(ref, () => ({
    undo,
    redo,
    zoomIn: () => void flowRef.current?.zoomIn({ duration: 180 }),
    zoomOut: () => void flowRef.current?.zoomOut({ duration: 180 }),
    fitView: () => void flowRef.current?.fitView({ padding: 0.18, duration: 240 }),
  }), [redo, undo])

  const onNodesChange = useCallback((changes: NodeChange<WorkflowNode>[]) => {
    if (changes.some((change) => change.type === 'remove')) checkpoint()
    setNodes((items) => applyNodeChanges(changes, items))
  }, [checkpoint])

  const onEdgesChange = useCallback((changes: EdgeChange<Edge>[]) => {
    if (changes.some((change) => change.type === 'remove')) checkpoint()
    setEdges((items) => applyEdgeChanges(changes, items))
  }, [checkpoint])

  const onConnect = useCallback((connection: Connection) => {
    checkpoint()
    setEdges((items) => addEdge({ ...connection, type: 'smoothstep', markerEnd: { type: MarkerType.ArrowClosed }, style: { stroke: '#16b8c8', strokeWidth: 2 } }, items))
    onNotify('节点连接已创建')
  }, [checkpoint, onNotify])

  const addNode = useCallback((label = '新处理节点', detail = '点击编辑节点参数', kind: WorkflowNodeData['kind'] = 'process', position?: { x: number; y: number }) => {
    checkpoint()
    const id = `node-${Date.now()}`
    const next: WorkflowNode = { id, type: 'workflow', position: position ?? { x: 350 + nodesRef.current.length * 12, y: 130 + nodesRef.current.length * 18 }, data: { label, detail, kind } }
    setNodes((items) => [...items, next])
    setSelectedId(id)
    setDraftLabel(label)
    setDraftDetail(detail)
    onNotify(`${label}已加入画布`)
  }, [checkpoint, onNotify])

  const removeSelected = useCallback(() => {
    if (!selectedId) return
    checkpoint()
    setNodes((items) => items.filter((node) => node.id !== selectedId))
    setEdges((items) => items.filter((edge) => edge.source !== selectedId && edge.target !== selectedId))
    setSelectedId(null)
    onNotify('节点已删除')
  }, [checkpoint, onNotify, selectedId])

  const duplicateSelected = useCallback(() => {
    const source = nodesRef.current.find((node) => node.id === selectedId)
    if (!source) return
    addNode(`${source.data.label} 副本`, source.data.detail, source.data.kind, { x: source.position.x + 40, y: source.position.y + 40 })
  }, [addNode, selectedId])

  const saveNode = useCallback(() => {
    if (!selectedId || !draftLabel.trim()) return
    checkpoint()
    setNodes((items) => items.map((node) => node.id === selectedId ? { ...node, data: { ...node.data, label: draftLabel.trim(), detail: draftDetail.trim() || '未填写说明' } } : node))
    onNotify('节点参数已保存')
  }, [checkpoint, draftDetail, draftLabel, onNotify, selectedId])

  const selected = nodes.find((node) => node.id === selectedId)

  return <div className="node-view react-flow-canvas" onDragOver={(event) => { event.preventDefault(); event.dataTransfer.dropEffect = 'copy' }} onDrop={(event) => {
    event.preventDefault()
    const raw = event.dataTransfer.getData('application/flowos-asset')
    if (!raw || !flowRef.current) return
    try {
      const asset = JSON.parse(raw) as { name: string; meta: string }
      addNode(asset.name, asset.meta, 'asset', flowRef.current.screenToFlowPosition({ x: event.clientX, y: event.clientY }))
    } catch { onNotify('无法读取拖入的素材') }
  }}>
    <ReactFlow<WorkflowNode, Edge>
      style={{ position: 'absolute', inset: 0, height: 'auto' }}
      nodes={nodes}
      edges={edges}
      nodeTypes={nodeTypes}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      onConnect={onConnect}
      onNodeDragStart={checkpoint}
      onNodeClick={(_, node) => { setSelectedId(node.id); setDraftLabel(node.data.label); setDraftDetail(node.data.detail) }}
      onPaneClick={() => setSelectedId(null)}
      onInit={(instance) => {
        flowRef.current = instance
        window.requestAnimationFrame(() => {
          if (window.innerWidth <= 760) void instance.setViewport({ x: 18, y: 48, zoom: 0.72 })
          else void instance.fitView({ padding: 0.18 })
        })
      }}
      onMoveEnd={(_, viewport) => { viewportRef.current = viewport; onZoomChange(Math.round(viewport.zoom * 100)) }}
      fitViewOptions={{ padding: 0.18 }}
      minZoom={0.35}
      maxZoom={1.8}
      snapToGrid
      snapGrid={[16, 16]}
      deleteKeyCode={null}
      selectionOnDrag
      panOnDrag={[1, 2]}
      defaultEdgeOptions={{ type: 'smoothstep' }}
    >
      <Background variant={BackgroundVariant.Dots} gap={16} size={1.2} color="#cbd8da" />
      <MiniMap pannable zoomable nodeColor={(node) => node.data.kind === 'output' ? '#ff7063' : node.data.kind === 'asset' ? '#7067e8' : '#16b8c8'} />
      <Controls showInteractive={false} />
      <Panel position="top-left" className="flow-actions"><button onClick={() => addNode()}><Plus size={14} />添加节点</button><span>{nodes.length} 个节点 · {edges.length} 条连接</span></Panel>
      {selected && <Panel position="top-right" className="node-editor"><div><strong>编辑节点</strong><button aria-label="复制选中节点" onClick={duplicateSelected}><Copy size={14} /></button><button aria-label="删除选中节点" onClick={removeSelected}><Trash2 size={14} /></button></div><label><span>名称</span><input value={draftLabel} onChange={(event) => setDraftLabel(event.target.value)} /></label><label><span>说明</span><textarea rows={2} value={draftDetail} onChange={(event) => setDraftDetail(event.target.value)} /></label><button className="save-node" onClick={saveNode}><Save size={14} />保存节点</button></Panel>}
    </ReactFlow>
    <span className="history-state" data-version={historyVersion} />
  </div>
})
