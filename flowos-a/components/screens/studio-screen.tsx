'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  ArrowLeft,
  Boxes,
  Check,
  ChevronDown,
  Compass,
  Download,
  Expand,
  Film,
  FolderKanban,
  Images,
  MessageSquare,
  MoreHorizontal,
  MousePointer2,
  Play,
  Plus,
  Redo2,
  Sparkles,
  Undo2,
  WandSparkles,
  ZoomIn,
  ZoomOut,
} from 'lucide-react'
import { copyText } from '@/lib/clipboard'
import { assetItems, projects, shots } from '@/lib/data'
import { listLocalAssets } from '@/lib/local-assets'
import { WorkflowCanvas, type WorkflowCanvasHandle } from '@/components/screens/workflow-canvas'
import { InfiniteCanvas, type InfiniteCanvasHandle } from '@/components/screens/infinite-canvas'

const modes = ['画布', '节点', '分镜', '时间线', '评审']

export function StudioScreen({ projectId }: { projectId: string }) {
  useEffect(() => {
    document.documentElement.dataset.flowosHydrated = 'true'
    return () => { delete document.documentElement.dataset.flowosHydrated }
  }, [])
  const fallback = projects[0]
  const knownProject = projects.find((item) => item.id === projectId)
  const [projectName, setProjectName] = useState(knownProject?.name ?? fallback.name)
  const [brief, setBrief] = useState('为城市生活方式品牌制作一支温暖、克制、有电影感的 30 秒短片。')
  const [mode, setMode] = useState('画布')
  const [selectedId, setSelectedId] = useState('03')
  const [zoom, setZoom] = useState(78)
  const [queue, setQueue] = useState([{ id: '03', status: '演示进度', progress: 68 }, { id: '05', status: '演示排队', progress: 0 }])
  const [notice, setNotice] = useState('')
  const [assetType, setAssetType] = useState('全部')
  const [selectedAsset, setSelectedAsset] = useState('女主角参考.png')
  const [assetAdded, setAssetAdded] = useState(false)
  const [uploadedAssets, setUploadedAssets] = useState<Array<readonly [string, string, string, string]>>([])
  const [activeTool, setActiveTool] = useState('选择')
  const [queueOpen, setQueueOpen] = useState(true)
  const [inspectorTab, setInspectorTab] = useState('镜头设置')
  const [canvasFocus, setCanvasFocus] = useState(false)
  const [moreOpen, setMoreOpen] = useState(false)
  const [routeModel, setRouteModel] = useState('Cinematic Core 4')
  const workflowCanvasRef = useRef<WorkflowCanvasHandle>(null)
  const infiniteCanvasRef = useRef<InfiniteCanvasHandle>(null)

  useEffect(() => {
    const restore = window.setTimeout(() => {
      try {
        const stored = sessionStorage.getItem('flowos-a:new-project')
        const params = new URLSearchParams(window.location.search)
        if (!knownProject && stored) {
          const parsed = JSON.parse(stored) as { name?: string; brief?: string }
          if (parsed.name) setProjectName(parsed.name)
          if (parsed.brief) setBrief(parsed.brief)
        }
        const briefParam = params.get('brief')
        const template = params.get('template')
        const discover = params.get('discover')
        const kind = params.get('kind')
        if (briefParam) setBrief(briefParam)
        if (template) { setProjectName(template); setBrief(`使用模板「${template}」开始创作，保留画幅、模型路由与交付预设。`) }
        if (discover) { setProjectName(`发现 · ${discover}`); setBrief(`基于发现资源「${discover}」继续创作，保留原始视觉配方。`) }
        if (kind) { setProjectName(kind); setBrief(`创建一个${kind}项目，补充目标、受众与交付规格。`) }
      } catch { /* session data is optional */ }
    }, 0)
    return () => window.clearTimeout(restore)
  }, [knownProject])

  useEffect(() => { listLocalAssets().then((items) => setUploadedAssets(items.map((item) => [item.name, `${item.type} · ${item.size}`, item.type === '音频' ? 'audio' : 'file', item.type]))).catch(() => undefined) }, [])

  const selected = useMemo(() => shots.find((shot) => shot.id === selectedId) ?? shots[0], [selectedId])
  const assets = useMemo(() => [
    ...assetItems.filter((item) => ['城市晨光.jpg', '女主角参考.png', '产品特写.png', '品牌 LOGO.svg'].includes(item.name)).map((item) => [item.name, `${item.type} · ${item.size}`, item.image ?? item.type.toLowerCase(), item.type] as const),
    ['咖啡馆场景.jpg', '图像 · 6 MB', '/media/interior.webp', '图像'] as const,
    ['城市氛围.mp3', '音频 · 1.2 MB', 'audio', '音频'] as const,
    ...uploadedAssets,
    ...(assetAdded ? [['新建素材.png', '图像 · 本地草稿', '/media/product-closeup.png', '图像'] as const] : []),
  ], [assetAdded, uploadedAssets])
  const visibleAssets = assets.filter((asset) => assetType === '全部' || asset[3] === assetType)
  const notify = useCallback((message: string) => { setNotice(message); window.setTimeout(() => setNotice(''), 2400) }, [])
  const generate = () => {
    setQueue((items) => [{ id: selected.id, status: '演示任务', progress: 12 }, ...items.filter((item) => item.id !== selected.id)])
    notify(`镜头 ${selected.id} 已加入演示队列，不会调用模型`)
  }

  const canvasUndo = () => { if (mode === '节点') { if (!workflowCanvasRef.current?.undo()) notify('没有可撤销的画布操作') } else if (mode === '画布') { infiniteCanvasRef.current?.undo(); notify('已撤销上一步操作') } }
  const canvasRedo = () => { if (mode === '节点') { if (!workflowCanvasRef.current?.redo()) notify('没有可重做的画布操作') } else if (mode === '画布') { infiniteCanvasRef.current?.redo(); notify('已重做上一步操作') } }
  const canvasZoomIn = () => { if (mode === '节点') workflowCanvasRef.current?.zoomIn(); else if (mode === '画布') infiniteCanvasRef.current?.zoomIn(); else setZoom(Math.min(120, zoom + 10)) }
  const canvasZoomOut = () => { if (mode === '节点') workflowCanvasRef.current?.zoomOut(); else if (mode === '画布') infiniteCanvasRef.current?.zoomOut(); else setZoom(Math.max(40, zoom - 10)) }
  const canvasFitView = () => { if (mode === '节点') workflowCanvasRef.current?.fitView(); else if (mode === '画布') infiniteCanvasRef.current?.fitView(); else setZoom(78) }

  return <div className="studio-standalone"><nav className="studio-global-nav"><Link className="brand" href="/home"><span className="brand-mark"><Sparkles size={17} /></span><strong>FlowOS</strong><small>为创作者，让好创意发生</small><span className="preview-badge" title="这是用于展示前端能力的作品集预览">作品集预览</span></Link><div><Link href="/projects"><FolderKanban size={15} />项目</Link><Link className="active" href="/create"><MousePointer2 size={15} />创作</Link><Link href="/assets"><Images size={15} />素材</Link><Link href="/models"><Boxes size={15} />模型</Link><Link href="/community"><Compass size={15} />社区</Link></div><Link className="studio-user" href="/creator"><span className="avatar">林</span><span><strong>林夏</strong><small>独立创作者</small></span></Link></nav><main className={`studio-page ${canvasFocus ? 'canvas-focus-mode' : ''}`}>
    <header className="studio-header"><div className="studio-title"><Link href="/projects" aria-label="返回项目"><ArrowLeft size={18} /></Link><span><small>项目 / 品牌短片</small><strong>{projectName}</strong></span></div><nav className="studio-modes" aria-label="制作模式">{modes.map((item) => <button key={item} className={mode === item ? 'active' : ''} onClick={() => setMode(item)}>{item}</button>)}</nav><div className="studio-actions"><button className="button secondary" onClick={() => setMode('评审')}><Play size={15} />预览</button><button className="button primary" onClick={() => notify('作品集预览暂不提供成片导出')}><Download size={15} />导出成片</button><button className="icon-button" aria-label="更多项目操作" aria-expanded={moreOpen} onClick={() => setMoreOpen(!moreOpen)}><MoreHorizontal size={18} /></button>{moreOpen && <div className="studio-more-menu"><button onClick={() => notify('作品集预览暂不支持复制项目')}>创建副本</button><button onClick={() => notify('作品集预览暂不支持归档项目')}>归档项目</button><button onClick={async () => notify(await copyText(`${window.location.origin}/project/${projectId}`) ? '分享链接已复制' : '复制失败，请检查浏览器剪贴板权限')}>复制分享链接</button></div>}</div></header>

    <div className="studio-grid">
      <aside className="asset-rail"><div className="rail-title"><div><strong>项目资产</strong><small>拖入画布或绑定镜头</small></div><button className="icon-button" aria-label="添加资产" onClick={() => { setAssetAdded(true); notify('已创建本地素材草稿') }}><Plus size={16} /></button></div><div className="tabs compact">{['全部','图像','视频','音频'].map((item) => <button key={item} className={assetType === item ? 'active' : ''} onClick={() => setAssetType(item)}>{item}</button>)}</div><div className="asset-list">{visibleAssets.map(([name, meta, image], index) => <button key={name} draggable onDragStart={(event) => { event.dataTransfer.setData('application/flowos-asset', JSON.stringify({ name, meta })); event.dataTransfer.effectAllowed = 'copy' }} className={`asset-item ${selectedAsset === name ? 'selected' : ''}`} onClick={() => { setSelectedAsset(name); notify(`${name} 已选中`) }}>{image === 'audio' ? <span className="asset-placeholder audio">♪</span> : image.startsWith('/') ? <span className="mini-thumb"><Image src={image} alt="" fill sizes="44px" /></span> : <span className="asset-placeholder">{image === 'logo' ? 'L' : 'F'}</span>}<span><strong>{name}</strong><small>{meta}</small></span><em>{index + 1}</em></button>)}</div></aside>

      <section className="canvas-area"><div className="canvas-toolbar"><div><span className="eyebrow accent">{mode.toUpperCase()} / MAIN</span><strong>{mode === '画布' ? '自由画布 · 本地自动保存' : mode === '节点' ? '可编辑流程画布 · 自动保存' : `${shots.length} 个镜头 · 3 个可用结果`}</strong></div><div className="canvas-tools"><button title="选择工具" className={activeTool === '选择' ? 'active' : ''} onClick={() => { setActiveTool('选择'); if (mode === '画布') infiniteCanvasRef.current?.select() }}><MousePointer2 size={16} /></button><button title="撤销" onClick={canvasUndo}><Undo2 size={16} /></button><button title="重做" onClick={canvasRedo}><Redo2 size={16} /></button><span /><button title="缩小" onClick={canvasZoomOut}><ZoomOut size={15} /></button><b>{zoom}%</b><button title="放大" onClick={canvasZoomIn}><ZoomIn size={15} /></button><button title="适应画布" onClick={canvasFitView}><Expand size={15} /></button><button title="聚焦画布" className={canvasFocus ? 'active' : ''} onClick={() => setCanvasFocus(!canvasFocus)}><Expand size={15} /></button></div></div>
        {mode === '画布' ? <InfiniteCanvas ref={infiniteCanvasRef} projectId={projectId} onZoomChange={setZoom} onNotify={notify} /> : mode === '节点' ? <WorkflowCanvas ref={workflowCanvasRef} projectId={projectId} onZoomChange={setZoom} onNotify={notify} /> : mode === '时间线' ? <TimelineView /> : mode === '评审' ? <ReviewView /> : <div className="shot-board storyboard-mode" style={{ '--board-scale': zoom / 100 } as React.CSSProperties}>{shots.map((shot, index) => <div key={shot.id} className={selectedId === shot.id ? 'shot-card selected' : 'shot-card'} role="button" tabIndex={0} onClick={() => setSelectedId(shot.id)} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') setSelectedId(shot.id) }}><div className="shot-image"><Image src={shot.image} alt="" fill sizes="280px" /><span>{shot.id}</span><em>{shot.duration}</em></div><div className="shot-info"><strong>{shot.title}</strong><p>{index % 2 ? '人物向前走，光线自然流动。' : '温暖的城市氛围，建立故事情绪。'}</p><div><span>{shot.model}</span><Link href={`/asset/${shot.id}`}>Recipe</Link></div></div></div>)}</div>}
        <div className={`queue-drawer ${queueOpen ? '' : 'collapsed'}`}><div className="queue-title"><span><WandSparkles size={15} />演示队列 <b>{queue.length}</b></span><button aria-label={queueOpen ? '收起生成队列' : '展开生成队列'} onClick={() => setQueueOpen(!queueOpen)}><ChevronDown size={15} /></button></div>{queueOpen && queue.map((item) => <div className="studio-job" key={item.id}><span className="mini-thumb"><Image src={shots.find((shot) => shot.id === item.id)?.image ?? shots[0].image} alt="" fill sizes="40px" /></span><strong>镜头 {item.id} · {shots.find((shot) => shot.id === item.id)?.title}</strong><span>{item.status}</span><i><u style={{ width: `${item.progress}%` }} /></i><button aria-label={`取消镜头 ${item.id} 任务`} onClick={() => { setQueue((items) => items.filter((entry) => entry.id !== item.id)); notify(`镜头 ${item.id} 演示任务已移除`) }}><MoreHorizontal size={15} /></button></div>)}</div>
      </section>

      <aside className="inspector"><div className="inspector-tabs">{['镜头设置','项目设置','风格参考'].map((item) => <button key={item} className={inspectorTab === item ? 'active' : ''} onClick={() => setInspectorTab(item)}>{item}</button>)}</div>{inspectorTab === '镜头设置' ? <><div className="selected-shot"><span className="mini-thumb large"><Image src={selected.image} alt="" fill sizes="64px" /></span><span><strong>{selected.id}　{selected.title}</strong><small>{selected.duration} · {routeModel}</small></span></div><label className="field"><span>提示词</span><textarea value={brief} onChange={(event) => setBrief(event.target.value)} rows={6} /></label><div className="tag-row"><span>@女主角</span><span>@城市晨光</span><span>#电影感</span></div><section className="inspector-section"><div className="section-heading"><h2>模型路由</h2><button onClick={() => setRouteModel((model) => model === 'Cinematic Core 4' ? 'Aperture Studio X' : model === 'Aperture Studio X' ? 'Portrait Detail 3' : 'Cinematic Core 4')}>更改</button></div><button className="model-route" onClick={() => setRouteModel((model) => model === 'Cinematic Core 4' ? 'Aperture Studio X' : model === 'Aperture Studio X' ? 'Portrait Detail 3' : 'Cinematic Core 4')}><span className="model-badge">A</span><span><strong>{routeModel}</strong><small>演示模型路由 · 不调用供应商</small></span><ChevronDown size={15} /></button></section><section className="inspector-section"><h2>输出设置</h2><div className="settings-grid"><label><span>画幅</span><select defaultValue="16:9"><option>16:9</option><option>9:16</option><option>1:1</option></select></label><label><span>时长</span><select defaultValue={selected.duration}><option>{selected.duration}</option><option>5s</option><option>8s</option></select></label><label><span>运镜</span><select><option>微推</option><option>固定</option><option>环绕</option></select></label><label><span>清晰度</span><select><option>4K</option><option>1080p</option></select></label></div><label className="range-control"><span>参考强度 <b>82%</b></span><input type="range" defaultValue="82" /></label></section><div className="safety-note"><Check size={15} /><span><strong>作品集预览</strong><small>参数与队列为交互演示，不产生真实费用。</small></span></div><button className="button primary wide generate-button" onClick={generate}><Sparkles size={16} />生成此镜头 · 演示</button></> : inspectorTab === '项目设置' ? <div className="inspector-alt"><h2>项目设置</h2><label className="field"><span>项目名称</span><input value={projectName} onChange={(event) => setProjectName(event.target.value)} /></label><label className="field"><span>默认画幅</span><select defaultValue="16:9"><option>16:9</option><option>9:16</option><option>1:1</option></select></label><label className="field"><span>输出语言</span><select defaultValue="简体中文"><option>简体中文</option><option>English</option></select></label><button className="button primary wide" onClick={() => notify('项目设置已保存')}>保存项目设置</button></div> : <div className="inspector-alt"><h2>风格参考</h2><p>当前绑定 2 个参考资产，点击切换主要风格来源。</p>{assets.filter((asset) => asset[3] === '图像').slice(0, 3).map(([name, , image]) => <button key={name} className={`reference-option ${selectedAsset === name ? 'active' : ''}`} onClick={() => setSelectedAsset(name)}>{image.startsWith('/') ? <span className="mini-thumb"><Image src={image} alt="" fill sizes="48px" /></span> : <span className="asset-placeholder">F</span>}<span><strong>{name}</strong><small>{selectedAsset === name ? '主要参考' : '设为主要参考'}</small></span></button>)}<button className="button secondary wide" onClick={() => { setAssetAdded(true); notify('已添加一个风格参考草稿') }}><Plus size={14} />添加风格参考</button></div>}</aside>
    </div>
    {notice && <div className="toast"><Check size={15} />{notice}</div>}
  </main></div>
}

function TimelineView() {
  return <div className="timeline-view"><div className="timeline-ruler">{['00:00','00:05','00:10','00:15','00:20','00:25','00:30'].map((time) => <span key={time}>{time}</span>)}</div><div className="timeline-track"><strong><Film size={14} />视频</strong><div>{shots.map((shot) => <span key={shot.id} style={{ flex: Number.parseInt(shot.duration) }}><Image src={shot.image} alt="" fill sizes="130px" /><b>{shot.id}</b></span>)}</div></div><div className="timeline-track audio-track"><strong>♪ 音频</strong><div className="waveform">|||| |||||| | ||||| || ||||||| |||| |||||| |||</div></div></div>
}

function ReviewView() {
  const [playing, setPlaying] = useState(false)
  return <div className="review-view"><div className="review-media"><Image src="/media/neon.webp" alt="" fill sizes="800px" /><button aria-label={playing ? '暂停预览' : '播放预览'} onClick={() => setPlaying(!playing)}>{playing ? <span className="pause-icon">Ⅱ</span> : <Play size={28} fill="currentColor" />}</button>{playing && <span className="playing-label">正在预览 · 00:08 / 00:30</span>}</div><div className="review-comments"><h2><MessageSquare size={16} />审核意见</h2><div><span className="avatar">周</span><p><strong>周宁</strong><small>00:12 · 建议这里的转场再放慢一点，让产品出现得更自然。</small></p></div><div><span className="avatar">林</span><p><strong>林夏</strong><small>已调整节奏，并补了一版更柔和的环境音。</small></p></div></div></div>
}
