'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import { ArrowRight, Clapperboard, FileImage, LayoutGrid, Sparkles, UsersRound, Workflow, X } from 'lucide-react'

const types = [
  { id: 'story', label: '故事短片', detail: '从故事目标到分镜、镜头与成片', icon: Clapperboard },
  { id: 'ad', label: '产品广告', detail: '围绕卖点、资产与交付规格创作', icon: Sparkles },
  { id: 'character', label: '系列角色', detail: '建立角色设定与跨镜头一致性', icon: UsersRound },
  { id: 'social', label: '社媒套件', detail: '一次规划多平台、多画幅内容', icon: LayoutGrid },
  { id: 'image', label: '图像设计', detail: '用于海报、KV 与静态视觉探索', icon: FileImage },
  { id: 'custom', label: '自定义工作流', detail: '从空白节点图搭建可复用方法', icon: Workflow },
]

export function NewProjectDialog({ open, onClose, initialBrief = '' }: { open: boolean; onClose: () => void; initialBrief?: string }) {
  const router = useRouter()
  const dialogRef = useRef<HTMLDivElement>(null)
  const [name, setName] = useState('未命名创作')
  const [brief, setBrief] = useState(initialBrief)
  const [type, setType] = useState('story')

  useEffect(() => {
    if (!open) return
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKeyDown)
    requestAnimationFrame(() => dialogRef.current?.focus())
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [open, onClose])

  if (!open) return null

  const create = () => {
    const slug = name.trim().toLowerCase().replace(/[^a-z0-9\u4e00-\u9fa5]+/g, '-').replace(/^-|-$/g, '') || 'new-project'
    sessionStorage.setItem('flowos-a:new-project', JSON.stringify({ name: name.trim(), brief: brief.trim(), type }))
    onClose()
    router.push(`/project/${encodeURIComponent(slug)}`)
  }

  return (
    <div className="dialog-layer" role="presentation" onMouseDown={(event) => { if (event.currentTarget === event.target) onClose() }}>
      <div ref={dialogRef} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby="new-project-title" className="dialog">
        <div className="dialog-header"><div><span className="eyebrow accent">NEW PROJECT</span><h2 id="new-project-title">把一个想法变成可执行项目</h2></div><button type="button" className="icon-button" aria-label="关闭" onClick={onClose}><X size={18} /></button></div>
        <div className="dialog-body">
          <label className="field"><span>项目名称</span><input value={name} onChange={(event) => setName(event.target.value)} maxLength={60} /></label>
          <label className="field"><span>创作描述</span><textarea value={brief} onChange={(event) => setBrief(event.target.value)} rows={3} placeholder="描述受众、目标、情绪和交付内容…" maxLength={1000} /></label>
          <fieldset className="project-type-grid"><legend>选择创作类型</legend>{types.map(({ id, label, detail, icon: Icon }) => <button key={id} type="button" className={type === id ? 'project-type selected' : 'project-type'} onClick={() => setType(id)}><Icon size={18} /><span><strong>{label}</strong><small>{detail}</small></span></button>)}</fieldset>
        </div>
        <div className="dialog-footer"><button type="button" className="button secondary" onClick={onClose}>取消</button><button type="button" className="button primary" onClick={create}>创建项目<ArrowRight size={16} /></button></div>
      </div>
    </div>
  )
}
