export type ProjectStatus = '制作中' | '待规划' | '可继续' | '已完成'

export type Project = {
  id: string
  name: string
  kind: string
  updated: string
  image: string
  status: ProjectStatus
  shots: number
  assets: number
  duration: string
}

export type ModelCatalogItem = {
  id: string
  name: string
  vendor: string
  type: '图像' | '视频' | '文案' | '音频'
  description: string
  quality: number
  latency: string
  cost: string
  license: string
  accent: string
  enabled: boolean
  featured: boolean
  updatedAt: string
}

export type AssetRecord = {
  id: string
  name: string
  type: '图像' | '视频' | '音频' | '设计' | '文档'
  size: string
  image?: string
  source?: string
  description?: string
}

export const media = [
  '/media/castle.webp',
  '/media/character.webp',
  '/media/fantasy.webp',
  '/media/interior.webp',
  '/media/mountain.webp',
  '/media/neon.webp',
  '/media/portrait.webp',
]

export const projects: Project[] = [
  { id: 'city-light', name: '城市里的小小光芒', kind: '品牌短片', updated: '8 分钟前', image: media[5], status: '制作中', shots: 6, assets: 9, duration: '30s' },
  { id: 'summer-drinks', name: '盛夏饮品视觉组', kind: '社媒套件', updated: '昨天', image: media[3], status: '可继续', shots: 8, assets: 14, duration: '12 张' },
  { id: 'mountain-story', name: '向山而行', kind: '故事短片', updated: '3 天前', image: media[4], status: '待规划', shots: 4, assets: 6, duration: '24s' },
  { id: 'portrait-series', name: '微光人物志', kind: '系列角色', updated: '5 天前', image: media[6], status: '已完成', shots: 12, assets: 18, duration: '24 张' },
  { id: 'castle-world', name: '云上城世界观', kind: '图像设计', updated: '1 周前', image: media[0], status: '可继续', shots: 5, assets: 11, duration: '8 张' },
  { id: 'neon-night', name: '雨夜霓虹', kind: '产品广告', updated: '2 周前', image: media[1], status: '已完成', shots: 6, assets: 7, duration: '20s' },
]

export const templates = [
  { title: '夏日新品社媒组', kind: '小红书', ratio: '3:4', count: '8 张', image: media[3], accent: 'mint' },
  { title: '户外品牌宣传片', kind: '视频', ratio: '16:9', count: '6 镜头', image: media[4], accent: 'sky' },
  { title: '电影感人物海报', kind: '海报', ratio: '4:5', count: '4 张', image: media[6], accent: 'lavender' },
  { title: '奇幻世界观套件', kind: '概念设计', ratio: '16:9', count: '10 张', image: media[0], accent: 'coral' },
]

export const discoverItems = [
  { id: 'cafe-discovery', title: '晨光咖啡角', author: 'FlowOS 精选', image: '/media/cafe-discovery.png', likes: '3.7k', category: '作品', tags: ['图像', '产品', '生活方式'] },
  { id: 'coast', title: '向夏天的世界', author: 'FlowOS 精选', image: media[2], likes: '4.1k', category: '作品', tags: ['图像', '写实', '场景'] },
  { id: 'portrait', title: '风的形状', author: 'Mori Studio', image: media[6], likes: '3.1k', category: '作品', tags: ['图像', '电影感', '人像'] },
  { id: 'interior', title: '空间与光', author: 'temu.design', image: media[3], likes: '1.3k', category: '素材', tags: ['图像', '极简', '产品'] },
  { id: 'mountain', title: '雪峰日出', author: 'Alpha Visual', image: media[4], likes: '1.9k', category: '创作配方', tags: ['图像', '写实', '场景'] },
  { id: 'neon', title: '雨夜城市', author: 'Zero Chen', image: media[5], likes: '2.4k', category: '创作配方', tags: ['视频', '电影感', '场景'] },
  { id: 'fantasy', title: '远方的城', author: 'Light Lab', image: media[0], likes: '2.8k', category: '社区', tags: ['图像', '插画', '品牌设计'] },
]

export const models: ModelCatalogItem[] = [
  { id: 'aperture-studio-x', name: 'Aperture Studio X', vendor: 'Flow Labs', type: '图像', description: '自然写实的高质量图像生成，适合品牌视觉、人物与生活方式内容。', quality: 96, latency: '32s', cost: '28 cr', license: '商用安全', accent: '#16b8c8', enabled: true, featured: true, updatedAt: '2026-09-18T08:00:00.000Z' },
  { id: 'cinematic-core-4', name: 'Cinematic Core 4', vendor: 'Motion AI', type: '视频', description: '为短片和广告优化的电影感视频模型，支持稳定的镜头运动与节奏。', quality: 92, latency: '2m', cost: '72 cr', license: '商用安全', accent: '#ff6f61', enabled: true, featured: true, updatedAt: '2026-09-17T10:30:00.000Z' },
  { id: 'portrait-detail-3', name: 'Portrait Detail 3', vendor: 'Luma Works', type: '图像', description: '专注人像细节与肤质表现，适合角色设定、肖像和情绪化画面。', quality: 94, latency: '41s', cost: '24 cr', license: '需署名', accent: '#7067e8', enabled: true, featured: false, updatedAt: '2026-09-16T06:20:00.000Z' },
  { id: 'script-craft', name: 'Script Craft', vendor: 'Studio Text', type: '文案', description: '将品牌 brief 转化为清晰、有节奏的脚本、标题和社媒文案。', quality: 89, latency: '4s', cost: '4 cr', license: '商用安全', accent: '#58ae88', enabled: true, featured: false, updatedAt: '2026-09-15T02:15:00.000Z' },
  { id: 'atmos-audio', name: 'Atmos Audio', vendor: 'Wave Lab', type: '音频', description: '生成氛围音乐与声音设计，为视频项目补足情绪和空间感。', quality: 88, latency: '18s', cost: '16 cr', license: '商用安全', accent: '#df9d37', enabled: true, featured: false, updatedAt: '2026-09-14T12:10:00.000Z' },
]

export const workflows = [
  { id: 'brand-film', name: '品牌短片全流程', category: '视频', description: '从 Brief、脚本、分镜到成片的一站式生产链。', steps: 8, success: '96%', image: media[5] },
  { id: 'social-kit', name: '社媒视觉套件', category: '图像', description: '一次生成同一视觉语言下的多平台内容。', steps: 6, success: '98%', image: media[3] },
  { id: 'character', name: '角色一致性生成', category: '角色', description: '锁定人物特征并扩展动作、场景与服装。', steps: 7, success: '93%', image: media[6] },
  { id: 'storyboard', name: '脚本转动态分镜', category: '分镜', description: '把文本脚本拆解成可编辑的镜头与节奏。', steps: 9, success: '91%', image: media[4] },
]

export const shots = [
  { id: '01', title: '远景 · 城市苏醒', duration: '3s', image: media[4], model: 'Aperture Studio X' },
  { id: '02', title: '中景 · 主角出场', duration: '5s', image: media[6], model: 'Portrait Detail 3' },
  { id: '03', title: '特写 · 发现灵感', duration: '4s', image: media[3], model: 'Cinematic Core 4' },
  { id: '04', title: '中景 · 创作时刻', duration: '6s', image: media[1], model: 'Aperture Studio X' },
  { id: '05', title: '特写 · 产品呈现', duration: '5s', image: media[0], model: 'Cinematic Core 4' },
  { id: '06', title: '远景 · 城市与人', duration: '7s', image: media[5], model: 'Aperture Studio X' },
]

export const assetItems: AssetRecord[] = [
  { id: 'asset-coast-afternoon', name: '海边的午后.png', type: '图像', size: '12.4 MB', image: media[2], source: '素材库' },
  { id: 'asset-city-morning', name: '城市晨光.jpg', type: '图像', size: '4.2 MB', image: media[3], source: '城市里的小小光芒' },
  { id: 'asset-lead-reference', name: '女主角参考.png', type: '图像', size: '3.1 MB', image: media[6], source: '城市里的小小光芒' },
  { id: 'asset-mountain-film', name: '山间品牌片.mp4', type: '视频', size: '38.6 MB', image: media[4], source: '向山而行' },
  { id: 'asset-neon-atmosphere', name: '雨夜氛围.mp4', type: '视频', size: '42.1 MB', image: media[5], source: '城市里的小小光芒' },
  { id: 'asset-street-audio', name: '环境声_街道.mp3', type: '音频', size: '1.2 MB', source: '城市里的小小光芒' },
  { id: 'asset-brand-mark', name: '品牌 LOGO.svg', type: '设计', size: '0.3 MB', source: '品牌库' },
  { id: 'asset-world-guide', name: '城市世界观.pdf', type: '文档', size: '1.6 MB', source: '云上城世界观' },
  { id: 'asset-product-closeup', name: '产品特写.png', type: '图像', size: '2.8 MB', image: '/media/product-closeup.png', source: 'AI 生成', description: '城市晨光背景下的青绿色产品特写。' },
  { id: 'asset-cafe-discovery', name: '晨光咖啡角.png', type: '图像', size: '1.9 MB', image: '/media/cafe-discovery.png', source: 'AI 生成', description: '适合产品与生活方式内容的晨光咖啡场景。' },
]
