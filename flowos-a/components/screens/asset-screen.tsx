'use client'

import Image from 'next/image'
import Link from 'next/link'
import { FormEvent, useEffect, useMemo, useState } from 'react'
import { ArrowLeft, Check, Copy, Download, GitBranch, Heart, Layers3, Link2, MessageSquare, Plus, Send, Sparkles, Upload, Workflow } from 'lucide-react'
import { AppShell } from '@/components/app-shell'
import { copyText } from '@/lib/clipboard'
import { assetItems, discoverItems, type AssetRecord, shots } from '@/lib/data'
import { getLocalAsset } from '@/lib/local-assets'

export function AssetScreen({ assetId }: { assetId: string }) {
  const discovery = discoverItems.find((item) => item.id === assetId)
  const asset = useMemo(() => assetItems.find((item) => item.id === assetId) ?? (discovery ? { id: discovery.id, name: discovery.title, type: '图像' as const, size: '精选资源', image: discovery.image, source: discovery.author } : undefined), [assetId, discovery])
  const [localAsset, setLocalAsset] = useState<AssetRecord>()
  const [localFile, setLocalFile] = useState<File>()
  const localUrl = useMemo(() => localFile ? URL.createObjectURL(localFile) : '', [localFile])
  useEffect(() => { if (!asset && assetId.startsWith('local-')) getLocalAsset(assetId).then((value) => { if (value) { setLocalAsset(value.record); setLocalFile(value.file) } }).catch(() => undefined) }, [asset, assetId])
  useEffect(() => () => { if (localUrl) URL.revokeObjectURL(localUrl) }, [localUrl])
  const resolvedAsset = asset ?? localAsset
  const isShot = shots.some((shot) => shot.id === assetId)
  const initialIndex = Math.max(0, shots.findIndex((shot) => shot.id === assetId))
  const versions = [shots[initialIndex] ?? shots[2], shots[(initialIndex + 1) % shots.length], shots[(initialIndex + 2) % shots.length]]
  const [version, setVersion] = useState(0)
  const [published, setPublished] = useState(false)
  const [liked, setLiked] = useState(false)
  const [comment, setComment] = useState('')
  const [comments, setComments] = useState([{ author: '周宁', body: '构图很稳，建议保留这版作为主视觉。', time: '18 分钟前' }, { author: '林夏', body: '已整理示例素材与来源信息。', time: '刚刚' }])
  const [notice, setNotice] = useState('')
  const current = versions[version]
  const title = useMemo(() => resolvedAsset?.name ?? current.title.replace(/^[^·]+·\s*/, ''), [current, resolvedAsset])

  const act = (message: string) => { setNotice(message); window.setTimeout(() => setNotice(''), 2200) }
  const download = () => { const source = localUrl || resolvedAsset?.image || current.image; const anchor = document.createElement('a'); anchor.href = source; anchor.download = resolvedAsset?.name ?? `${title}.webp`; anchor.click(); act('已开始下载') }
  const submit = (event: FormEvent) => { event.preventDefault(); if (!comment.trim()) return; setComments((items) => [...items, { author: '林夏', body: comment.trim(), time: '刚刚' }]); setComment('') }

  return <AppShell><main className="page asset-page"><div className="asset-topbar"><div className="asset-breadcrumb"><Link href={isShot ? '/project/city-light' : '/assets'}><ArrowLeft size={15} />{isShot ? '返回项目' : '返回素材库'}</Link><span>/</span><span>资产详情</span></div><div className="asset-top-actions">{isShot ? <><button className="button secondary" onClick={() => act('已加入演示对比')}><Layers3 size={14} />对比</button><button className="button secondary" onClick={() => act('作品集预览不调用生成模型')}><Sparkles size={14} />再次生成</button><button className="button secondary" onClick={() => act('作品集预览暂不保存时间线变更')}><Plus size={14} />加入时间线</button><button className="button primary" onClick={() => { setPublished(true); act('仅预览发布状态，作品未公开') }}><Upload size={14} />预览发布</button></> : <button className="button primary" onClick={download}><Download size={14} />下载素材</button>}</div></div>
    <section className="asset-hero"><div className="asset-preview"><div className="media-box asset-main-image">{resolvedAsset?.type === '视频' && localUrl ? <video src={localUrl} controls style={{ width: '100%', height: '100%', objectFit: 'contain' }} /> : resolvedAsset?.type === '音频' && localUrl ? <audio src={localUrl} controls /> : resolvedAsset && !resolvedAsset.image && resolvedAsset.type !== '图像' ? <div className="asset-file-fallback"><Layers3 size={44} /><strong>{title}</strong><span>{resolvedAsset.type} · {resolvedAsset.size}</span></div> : resolvedAsset && !resolvedAsset.image && !localUrl ? <div className="asset-file-fallback"><Layers3 size={44} /><strong>{title}</strong><span>{resolvedAsset.type} · {resolvedAsset.size}</span></div> : <Image src={localUrl || resolvedAsset?.image || current.image} alt={title} fill priority sizes="(max-width: 900px) 100vw, 62vw" unoptimized={Boolean(localUrl)} />}<div className="image-actions"><button aria-label="收藏" className={liked ? 'active' : ''} onClick={() => setLiked(!liked)}><Heart size={17} fill={liked ? 'currentColor' : 'none'} /></button><button aria-label="下载" onClick={download}><Download size={17} /></button></div></div>{isShot && <div className="version-strip"><span>版本</span>{versions.map((item, index) => <button key={`${item.id}-${index}`} className={version === index ? 'active' : ''} onClick={() => setVersion(index)}><span className="mini-thumb large"><Image src={item.image} alt="" fill sizes="80px" /></span><b>v{versions.length - index}</b></button>)}</div>}</div>
      <aside className="asset-summary"><span className="eyebrow accent">{resolvedAsset?.source ?? 'DEMO ASSET · IMAGE'}</span><h1>{title}</h1><p>{resolvedAsset?.description ?? (isShot ? '来自“城市里的小小光芒”项目的示例结果，用于展示版本与配方界面。' : '此素材可在当前工作区查看和下载。')}</p>{isShot ? <><div className="tag-row"><span>电影感</span><span>自然光</span><span>品牌视觉</span></div><div className="asset-action-grid"><button className="button secondary" onClick={() => act('参考资产仅在此页面预览')}><Link2 size={15} />设为参考</button><button className="button secondary" onClick={() => act('作品集预览暂不保存分支')}><GitBranch size={15} />创建分支</button><button className="button secondary" onClick={() => act('作品集预览暂不创建 Remix 项目')}><Workflow size={15} />Remix</button><button className={published ? 'button success' : 'button primary'} onClick={() => { setPublished(!published); act('仅预览发布状态，作品未公开') }}><Upload size={15} />{published ? '预览中' : '预览发布'}</button></div><div className="safety-note"><Check size={15} /><span><strong>示例配方与许可信息</strong><small>真实商用授权需按素材来源另行核验。</small></span></div></> : <div className="tag-row"><span>{resolvedAsset?.type}</span><span>{resolvedAsset?.size}</span><span>{resolvedAsset?.source}</span></div>}</aside>
    </section>
    <section className="asset-detail-grid"><div className="asset-detail-main">{isShot ? <><article className="detail-card"><div className="detail-card-title"><Sparkles size={16} /><h2>提示词与参数（Recipe）</h2><button onClick={async () => act(await copyText(JSON.stringify({ model: current.model, seed: 240318, ratio: '16:9' })) ? '配方已复制' : '复制失败，请检查浏览器剪贴板权限')}><Copy size={13} />复制 JSON</button></div><div className="metadata-grid"><Meta label="模型版本" value={current.model} /><Meta label="随机种子" value="240318" /><Meta label="示例成本" value="28 cr" /><Meta label="示例耗时" value="32 秒" /></div><div className="prompt-block"><span>提示词</span><p>温暖克制的城市光线，人物在真实生活场景中发现灵感，专业品牌短片，细腻质感，电影级构图。</p></div><div className="parameter-row"><span>16:9</span><span>4K</span><span>reference 82%</span><span>motion 3</span></div></article><article className="detail-card"><div className="detail-card-title"><GitBranch size={16} /><h2>继承关系</h2><span>3 个关联节点</span></div><div className="lineage"><div><i>01</i><span><strong>项目母版</strong><small>城市里的小小光芒 · Main</small></span></div><b /><div><i>02</i><span><strong>镜头草案 v2</strong><small>Aperture Studio X · seed 240112</small></span></div><b /><div className="current"><i>03</i><span><strong>当前版本 v3</strong><small>调整光线与参考强度</small></span></div></div></article></> : <article className="detail-card"><div className="detail-card-title"><Layers3 size={16} /><h2>素材记录</h2></div><div className="metadata-grid"><Meta label="类型" value={resolvedAsset?.type ?? '图像'} /><Meta label="大小" value={resolvedAsset?.size ?? '-'} /><Meta label="来源" value={resolvedAsset?.source ?? '-'} /></div><div className="prompt-block"><span>说明</span><p>{resolvedAsset?.description ?? '此素材已添加到当前浏览器工作区，可用于创作参考。'}</p></div></article>}</div>
      <aside className="asset-side"><article className="detail-card"><div className="detail-card-title"><Layers3 size={16} /><h2>文件信息</h2><button onClick={() => act('文件信息已进入编辑状态')}>编辑</button></div><dl className="metadata-list"><dt>名称</dt><dd>{title}</dd><dt>资产 ID</dt><dd>{assetId}</dd>{isShot && <><dt>尺寸</dt><dd>3840 × 2160</dd></>}<dt>格式</dt><dd>{resolvedAsset?.name.split('.').pop()?.toUpperCase() ?? 'WEBP'}</dd><dt>来源</dt><dd>{resolvedAsset?.source ?? '演示素材'}</dd>{isShot && <><dt>许可</dt><dd>待核验</dd><dt>AI 标识</dt><dd>示例</dd></>}</dl></article>
        {isShot && <article className="detail-card license-card"><div className="detail-card-title"><Check size={16} /><h2>授权状态</h2><button onClick={() => act('示例素材没有可验证的授权记录')}>查看详情</button></div><div className="license-body"><strong>尚未核验商用授权</strong><small>商业用途请核验素材原始来源与许可。</small></div></article>}
        <article className="detail-card comments"><div className="detail-card-title"><MessageSquare size={16} /><h2>示例评论</h2><span>{comments.length}</span></div><div className="comment-list">{comments.map((item, index) => <div key={`${item.author}-${index}`}><span className="avatar">{item.author[0]}</span><p><strong>{item.author}<small>{item.time}</small></strong><span>{item.body}</span></p></div>)}</div><form onSubmit={submit}><textarea rows={3} value={comment} onChange={(event) => setComment(event.target.value)} placeholder="添加评论或 @ 协作者…" /><button className="button primary" type="submit" disabled={!comment.trim()}><Send size={14} />发送</button></form></article></aside></section>
    {notice && <div className="toast"><Check size={15} />{notice}</div>}
  </main></AppShell>
}

function Meta({ label, value }: { label: string; value: string }) {
  return <div><small>{label}</small><strong>{value}</strong></div>
}
