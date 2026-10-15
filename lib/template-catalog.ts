import type { ProjectFormatId } from '@/components/NewProjectDialog'

export type TemplatePlatform = '小红书' | '抖音' | '电商' | '品牌营销' | '生活方式'

export interface CreationTemplate {
  id: string
  title: string
  platform: TemplatePlatform
  category: '内容种草' | '商品营销' | '品牌视觉' | '旅行生活'
  image: string
  aspectRatio: string
  outputCount: string
  delivery: string
  estimatedTime: string
  usageLabel: string
  projectType: ProjectFormatId
  initialBrief: string
  headline: string
  isPopular?: boolean
}

export const templatePlatforms: Array<'全部' | TemplatePlatform> = [
  '全部',
  '小红书',
  '抖音',
  '电商',
  '品牌营销',
  '生活方式',
]

export const creationTemplates: CreationTemplate[] = [
  {
    id: 'xiaohongshu-cover',
    title: '小红书爆款封面',
    platform: '小红书',
    category: '内容种草',
    image: 'portrait',
    aspectRatio: '3:4',
    outputCount: '6 张封面',
    delivery: '标题版式 + 配色方案',
    estimatedTime: '约 8 分钟',
    usageLabel: '已使用 2.4k 次',
    projectType: 'image-design',
    initialBrief: '制作一组小红书爆款封面，围绕核心卖点设计高对比标题、清晰主体和统一配色，输出 6 张 3:4 竖版封面。',
    headline: '高点击标题结构，适合单篇笔记快速起量',
    isPopular: true,
  },
  {
    id: 'xiaohongshu-note',
    title: '小红书种草笔记',
    platform: '小红书',
    category: '内容种草',
    image: 'character',
    aspectRatio: '3:4',
    outputCount: '9 张套图',
    delivery: '封面 + 卖点页 + 结尾页',
    estimatedTime: '约 12 分钟',
    usageLabel: '已使用 1.8k 次',
    projectType: 'social-kit',
    initialBrief: '策划一篇小红书种草笔记，面向年轻用户，包含吸睛封面、3 个核心卖点、真实使用场景和行动号召，输出 9 张 3:4 套图。',
    headline: '从封面到行动号召，一次完成完整笔记',
    isPopular: true,
  },
  {
    id: 'xiaohongshu-checkin',
    title: '小红书探店打卡',
    platform: '小红书',
    category: '旅行生活',
    image: 'interior',
    aspectRatio: '3:4',
    outputCount: '8 张套图',
    delivery: '门店氛围 + 菜品细节',
    estimatedTime: '约 10 分钟',
    usageLabel: '已使用 960 次',
    projectType: 'social-kit',
    initialBrief: '制作一组小红书探店打卡内容，突出门店氛围、招牌产品、价格信息和到店路线，保持自然生活方式摄影质感，输出 8 张 3:4 套图。',
    headline: '氛围感与实用信息兼顾，适合门店种草',
    isPopular: true,
  },
  {
    id: 'xiaohongshu-review',
    title: '小红书好物测评',
    platform: '小红书',
    category: '商品营销',
    image: 'mountain',
    aspectRatio: '3:4',
    outputCount: '7 张套图',
    delivery: '对比表 + 结论卡',
    estimatedTime: '约 11 分钟',
    usageLabel: '已使用 740 次',
    projectType: 'social-kit',
    initialBrief: '制作一组小红书好物测评套图，包含真实使用场景、关键参数、优缺点对比和适用人群结论，输出 7 张 3:4 竖版内容。',
    headline: '把参数、体验和购买建议讲清楚',
    isPopular: true,
  },
  {
    id: 'douyin-carousel',
    title: '抖音商品轮播图',
    platform: '抖音',
    category: '商品营销',
    image: 'neon',
    aspectRatio: '1:1',
    outputCount: '6 张轮播',
    delivery: '卖点首图 + 细节页',
    estimatedTime: '约 9 分钟',
    usageLabel: '已使用 1.2k 次',
    projectType: 'social-kit',
    initialBrief: '制作抖音商品轮播图，第一张突出核心卖点，后续展示产品细节、使用场景、规格和优惠信息，输出 6 张 1:1 方形图片。',
    headline: '适配短视频橱窗，连续展示产品卖点',
    isPopular: true,
  },
  {
    id: 'commerce-main-images',
    title: '电商主图套装',
    platform: '电商',
    category: '商品营销',
    image: 'fantasy',
    aspectRatio: '1:1',
    outputCount: '5 张主图',
    delivery: '白底主图 + 场景图',
    estimatedTime: '约 10 分钟',
    usageLabel: '已使用 2.1k 次',
    projectType: 'product-ad',
    initialBrief: '为电商商品制作主图套装，包含清晰白底首图、功能卖点、材质细节、使用场景和尺寸信息，统一商品比例与品牌色，输出 5 张 1:1 图片。',
    headline: '一套主图覆盖详情页前五屏',
    isPopular: true,
  },
  {
    id: 'brand-event-poster',
    title: '品牌活动海报',
    platform: '品牌营销',
    category: '品牌视觉',
    image: 'castle',
    aspectRatio: '4:5',
    outputCount: '4 张海报',
    delivery: '主视觉 + 信息版式',
    estimatedTime: '约 14 分钟',
    usageLabel: '已使用 680 次',
    projectType: 'image-design',
    initialBrief: '为品牌活动设计一组 4:5 海报，突出活动主题、日期、地点和报名入口，建立统一的紫夜幻想视觉语言，输出主视觉和信息版式两套方向。',
    headline: '活动信息清晰，保留品牌记忆点',
  },
  {
    id: 'travel-guide-longform',
    title: '旅行攻略长图',
    platform: '生活方式',
    category: '旅行生活',
    image: 'mountain',
    aspectRatio: '9:16',
    outputCount: '1 张长图',
    delivery: '路线 + 清单 + 提示',
    estimatedTime: '约 7 分钟',
    usageLabel: '已使用 520 次',
    projectType: 'social-kit',
    initialBrief: '制作一张 9:16 旅行攻略长图，按时间顺序整理路线、交通、餐厅、预算和避坑提示，使用清晰分区和旅行摄影风格，适合移动端阅读。',
    headline: '把路线和清单压缩进一张长图',
  },
]

export const popularTemplates = creationTemplates.filter((template) => template.isPopular)
