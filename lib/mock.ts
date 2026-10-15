import type {
  Approval,
  Asset,
  Comment,
  License,
  Lineage,
  ModelVersion,
  Project,
  Recipe,
  Scene,
  Sequence,
  Skill,
  UsageLedger,
  User,
  WorkflowVersion,
  Workspace,
} from './types'
export const images = {
  hero:'https://images.unsplash.com/photo-1512568400610-62da28bc8a13?w=1200&q=80',
  rain:'https://images.unsplash.com/photo-1519681393784-d120267933ba?w=900&q=80',
  coffee:'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=900&q=80',
  person:'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=900&q=80',
  street:'https://images.unsplash.com/photo-1519608487953-e999c86e7455?w=900&q=80',
  package:'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=900&q=80',
}
export const models:ModelVersion[] = [
  {
    id:'m1',name:'Pulse Draft 2.1',provider:'Northstar',media:['image','video'],quality:'Draft',speed:'Fast · 18s',cost:'4 cr / frame',duration:'≤ 8s',resolution:'1080p',refs:'3 refs',policy:'Commercial use',status:'available',capabilities:['Text → Image','Image → Video','First frame'],reason:'快速验证构图和动作，适合低成本小样。',
    modelId:'pulse-draft',version:'2.1',providerAdapterId:'flowos-mock',licenseId:'license-commercial-remix',
    capabilityMatrix:{inputs:['text','image'],outputs:['image','video'],firstFrame:true,lastFrame:false,maxReferenceCount:3,nativeAudio:false,maxDurationSeconds:8,resolutions:['1024x1024','1920x1080'],commercialPolicy:'allowed',estimatedCostCredits:{min:4,max:8},estimatedLatencySeconds:{min:18,max:35}},
  },
  {
    id:'m2',name:'Cinematic Core 4',provider:'Mosaic Labs',media:['image','video','audio'],quality:'Balanced',speed:'Balanced · 46s',cost:'12 cr / frame',duration:'≤ 12s',resolution:'2K',refs:'6 refs',policy:'Commercial use',status:'available',capabilities:['Native audio','Last frame','Character lock'],reason:'角色一致性和电影光线的平衡选择。',
    modelId:'cinematic-core',version:'4.0',providerAdapterId:'flowos-mock',licenseId:'license-commercial-remix',
    capabilityMatrix:{inputs:['text','image','audio'],outputs:['image','video','audio'],firstFrame:true,lastFrame:true,maxReferenceCount:6,nativeAudio:true,maxDurationSeconds:12,resolutions:['1920x1080','2048x1152'],commercialPolicy:'allowed',estimatedCostCredits:{min:12,max:18},estimatedLatencySeconds:{min:46,max:80}},
  },
  {
    id:'m3',name:'Aperture Studio X',provider:'Aperture',media:['image','video'],quality:'Ultra',speed:'High quality · 2m',cost:'28 cr / frame',duration:'≤ 20s',resolution:'4K',refs:'10 refs',policy:'Enterprise safe',status:'available',capabilities:['Text accuracy','Multi-reference','4K output'],reason:'定稿与品牌交付，细节、文字和材质最稳定。',
    modelId:'aperture-studio',version:'10.0',providerAdapterId:'flowos-mock',licenseId:'license-commercial-remix',
    capabilityMatrix:{inputs:['text','image'],outputs:['image','video'],firstFrame:true,lastFrame:true,maxReferenceCount:10,nativeAudio:false,maxDurationSeconds:20,resolutions:['2048x1152','3840x2160'],commercialPolicy:'allowed',estimatedCostCredits:{min:28,max:42},estimatedLatencySeconds:{min:120,max:180}},
  },
]

export const users: User[] = [
  { id:'user-lin',name:'林澈',initials:'林',role:'Owner',email:'lin@flowos.local',status:'active' },
  { id:'user-maya',name:'Maya Chen',initials:'MC',role:'Creative director',email:'maya@flowos.local',status:'active' },
]

export const workspace: Workspace = {
  id:'workspace-rain-studio',name:'Rain Studio',plan:'Studio',credits:1240,ownerId:'user-lin',memberIds:users.map((user)=>user.id),currency:'CNY',createdAt:'2026-07-12T08:00:00.000Z',updatedAt:'2026-09-04T11:40:00.000Z',
}

export const licenses: License[] = [
  { id:'license-commercial-remix',name:'Commercial Remix',summary:'允许商业交付与派生创作，公开发布时需保留 AI 标识。',commercialUse:true,attributionRequired:false,derivativesAllowed:true,redistributionAllowed:true,modelTrainingAllowed:false,aiDisclosureRequired:true },
  { id:'license-internal-review',name:'Internal Review',summary:'仅限当前工作区评审，不允许公开再分发。',commercialUse:false,attributionRequired:false,derivativesAllowed:true,redistributionAllowed:false,modelTrainingAllowed:false,aiDisclosureRequired:true },
]

export const sequences: Sequence[] = [
  { id:'sequence-main',projectId:'rain-coffee',name:'30 秒主版',description:'16:9 品牌广告主序列',sceneIds:['scene-street','scene-cafe'],shotIds:['s1','s2','s3','s4','s5','s6'],timelineTrackIds:['t1','t2','t3','t4','t5'],durationMs:30000,frameRate:24,aspectRatio:'16:9',createdAt:'2026-09-01T02:00:00.000Z',updatedAt:'2026-09-04T11:40:00.000Z' },
]

export const scenes: Scene[] = [
  { id:'scene-street',sequenceId:'sequence-main',number:1,name:'雨夜街角',description:'从雨幕中的产品特写进入亮灯的街角门店。',locationEntityId:'e3',shotIds:['s1','s2'],durationMs:7000,createdAt:'2026-09-01T02:00:00.000Z',updatedAt:'2026-09-04T11:40:00.000Z' },
  { id:'scene-cafe',sequenceId:'sequence-main',number:2,name:'夜航片刻',description:'人物取出、饮用产品，最终回到品牌包装。',locationEntityId:'e3',shotIds:['s3','s4','s5','s6'],durationMs:23000,createdAt:'2026-09-01T02:00:00.000Z',updatedAt:'2026-09-04T11:40:00.000Z' },
]

export const workflowVersions: WorkflowVersion[] = [
  {
    id:'workflow-rain-product-v3.2',workflowId:'workflow-rain-product',version:'3.2',name:'Rainy product insert',description:'锁定包装结构并依次完成雨幕、灯光、运镜与质量检查。',
    inputs:[{id:'input-product',name:'产品实体',valueType:'entity',required:true},{id:'input-brief',name:'氛围 Brief',valueType:'string',required:true}],
    outputs:[{id:'output-video',name:'商品视频',valueType:'video',required:true}],
    steps:[
      {id:'step-input',kind:'input',name:'读取产品与 Brief',config:{},dependsOn:[]},
      {id:'step-reference',kind:'entity_reference',name:'锁定包装结构',config:{minimumWeight:0.8},dependsOn:['step-input']},
      {id:'step-router',kind:'model_router',name:'平衡路由',config:{strategy:'balanced'},dependsOn:['step-reference']},
      {id:'step-generate',kind:'generate',name:'生成主镜头',config:{durationSeconds:6},dependsOn:['step-router']},
      {id:'step-qc',kind:'quality_check',name:'包装一致性检查',config:{threshold:0.9},dependsOn:['step-generate']},
      {id:'step-output',kind:'output',name:'交付视频',config:{aspectRatio:'16:9'},dependsOn:['step-qc']},
    ],
    compatibleModelIds:['m1','m2','m3'],priceCredits:0,completionRate:0.94,status:'published',createdBy:'user-lin',licenseId:'license-commercial-remix',changelog:'改善雨幕边缘和包装文字质量检查。',createdAt:'2026-08-10T03:00:00.000Z',publishedAt:'2026-08-28T03:00:00.000Z',
  },
]

export const skills: Skill[] = [
  { id:'skill-character-continuity',workspaceId:workspace.id,name:'Character continuity pack',description:'从角色 Bible 提取锁定特征，并在每个镜头后执行一致性检查。',currentVersionId:'skill-character-continuity-v2.6',versionIds:['skill-character-continuity-v2.5','skill-character-continuity-v2.6'],category:'Continuity',tags:['character','quality-check'],visibility:'public',priceCredits:12,usageCount:322,completionRate:0.88,createdBy:'user-maya',createdAt:'2026-07-18T03:00:00.000Z',updatedAt:'2026-08-17T03:00:00.000Z' },
]

export const recipes: Recipe[] = [
  { id:'r1',title:'雨幕中的冷萃瓶',model:'Aperture Studio X v10.0',modelVersionId:'m3',prompt:'@夜航冷萃瓶 on a rain-soaked windowsill, cyan rim light, restrained 35mm grain',seed:4839201,referenceEntityIds:['e1','e3','e4'],parameters:{aspectRatio:'16:9',durationSeconds:5,referenceWeight:0.82},cost:'28 cr',costCredits:28,duration:'1m 42s',elapsedMs:102000,license:'Commercial Remix',licenseId:'license-commercial-remix',parent:'社区 Recipe · Rainy Product Study',parentResultId:'community-result-rain-product-v2',aiDisclosure:true,createdAt:'2026-09-03T09:20:00.000Z' },
]

export const lineage: Lineage[] = [
  { id:'lineage-community-remix',relationship:'remix',sourceProjectId:'community-rain-product-study',sourceBranchId:'published-v2',sourceOutputId:'community-result-rain-product-v2',targetProjectId:'rain-coffee',parentRecipeId:'community-recipe-rain-product-v2',createdAt:'2026-09-01T02:00:00.000Z' },
]

export const comments: Comment[] = [
  { id:'comment-logo',projectId:'rain-coffee',targetId:'s3',targetType:'shot',authorId:'user-maya',body:'@林澈 请把瓶身环标恢复到角色 Bible 的锁定位置。',mentions:['user-lin'],anchor:{kind:'frame',x:0.64,y:0.42,shotId:'s3'},createdAt:'2026-09-04T09:18:00.000Z',updatedAt:'2026-09-04T09:18:00.000Z' },
]

export const approvals: Approval[] = [
  { id:'approval-main-v4',projectId:'rain-coffee',targetId:'sequence-main',targetType:'sequence',versionId:'v04',status:'needs_changes',reviewerId:'user-maya',commentId:'comment-logo',decidedAt:'2026-09-04T09:18:00.000Z',createdAt:'2026-09-04T09:10:00.000Z' },
]

export const usageLedger: UsageLedger[] = [
  { id:'usage-j3',workspaceId:workspace.id,projectId:'rain-coffee',userId:'user-lin',jobId:'j3',modelVersionId:'m3',providerAdapterId:'flowos-mock',kind:'generation_charge',units:1,credits:28,amount:8.4,currency:'CNY',metadata:{outputSpec:'3840x2160'},recordedAt:'2026-09-04T08:42:00.000Z' },
  { id:'usage-j4-refund',workspaceId:workspace.id,projectId:'rain-coffee',userId:'user-lin',jobId:'j4',modelVersionId:'m2',providerAdapterId:'flowos-mock',kind:'refund',units:1,credits:-12,amount:-3.6,currency:'CNY',metadata:{reason:'provider_timeout'},recordedAt:'2026-09-04T08:48:00.000Z' },
]

export const project:Project = {
  id:'rain-coffee', name:'雨夜咖啡新品 30 秒广告', type:'产品广告', updated:'刚刚',workspaceId:workspace.id,description:'为夜航冷萃制作一支从雨夜产品特写到人物饮用及品牌结尾的 30 秒广告。',status:'active',createdBy:'user-lin',createdAt:'2026-09-01T02:00:00.000Z',updatedAtIso:'2026-09-04T11:40:00.000Z',activeBranchId:'main',defaultModelVersionId:'m2',
  branches:[{id:'main',name:'Main',projectId:'rain-coffee',createdBy:'user-lin',headVersion:4,status:'active',createdAt:'2026-09-01T02:00:00.000Z'}],
  sequences,scenes,recipes,lineage,comments,approvals,usageLedger,
  entities:[
    {id:'e1',kind:'product',name:'夜航冷萃瓶',description:'磨砂黑瓶身，青色环标，银色瓶盖',color:'#4EE1FF',tags:['产品','品牌锁定'],image:images.package,locked:['瓶身比例','环标位置']},
    {id:'e2',kind:'character',name:'林澈 · 夜班店员',description:'短发，深色围裙，温和克制的表情',color:'#7C5CFF',tags:['角色','一致性'],image:images.person,locked:['发型','围裙徽章'],referenceAssetIds:['character-lin-front','character-lin-side','character-lin-back'],angleReferences:[{assetId:'character-lin-front',label:'正面标准照',angle:'front',weight:1},{assetId:'character-lin-side',label:'右侧 3/4',angle:'three-quarter',weight:0.9},{assetId:'character-lin-back',label:'背面服装',angle:'back',weight:0.75}],outfits:['深色围裙 + 黑色针织衫','深灰防雨外套'],expressions:['平静','轻微疲惫','放松微笑'],voiceEntityId:'e5',lockedFeatures:['短发轮廓','左眉尾浅痣','围裙青色徽章'],prohibitedChanges:['不可改变年龄感','不可替换围裙徽章','不可增加首饰']},
    {id:'e3',kind:'location',name:'雨夜街角',description:'湿润柏油、暖色橱窗、蓝紫色雨幕',color:'#3A8FB7',tags:['场景','世界观'],image:images.street},
    {id:'e4',kind:'style',name:'雨幕蓝调',description:'冷蓝环境光 + 暖橙实用光，35mm 胶片颗粒',color:'#F29E4C',tags:['风格','色板'],image:images.rain},
    {id:'e5',kind:'voice',name:'夜航品牌声',description:'低沉、近距离、轻微磁带颗粒',color:'#E8D44D',tags:['声音','品牌'],image:images.coffee},
  ],
  shots:[
    {id:'s1',number:1,title:'雨滴落在瓶身',duration:'3s',framing:'ECU',move:'微推',characters:'夜航冷萃瓶',dialogue:'',sound:'雨声 · 低频氛围',image:images.package,version:'v03'},
    {id:'s2',number:2,title:'街角亮灯',duration:'4s',framing:'Wide',move:'横移',characters:'林澈',dialogue:'',sound:'脚步 · 门铃',image:images.street,version:'v02'},
    {id:'s3',number:3,title:'取出冷萃',duration:'5s',framing:'MS',move:'手持跟拍',characters:'林澈 · 夜航冷萃瓶',dialogue:'今晚，也给自己留一点时间。',sound:'品牌声进入',image:images.person,version:'v04',warning:'瓶身 Logo 在 v03 中偏移 4px'},
    {id:'s4',number:4,title:'冰块与咖啡',duration:'6s',framing:'CU',move:'俯拍下摇',characters:'夜航冷萃瓶',dialogue:'',sound:'冰块碰撞 · 颗粒音',image:images.coffee,version:'v02'},
    {id:'s5',number:5,title:'第一口',duration:'7s',framing:'MCU',move:'环绕 90°',characters:'林澈',dialogue:'',sound:'呼吸 · 雨声变远',image:images.person,version:'v01'},
    {id:'s6',number:6,title:'品牌收束',duration:'5s',framing:'Packshot',move:'静止',characters:'夜航冷萃瓶',dialogue:'夜航，慢一点也没关系。',sound:'品牌声 · 余韵',image:images.package,version:'v01'},
  ],
  jobs:[
    {id:'j1',shot:'镜头 03 · 取出冷萃',model:'Cinematic Core 4',status:'running',progress:62,eta:'约 24 秒',credits:12},
    {id:'j2',shot:'镜头 05 · 第一口',model:'Pulse Draft 2.1',status:'queued',progress:0,eta:'排队中',credits:4},
    {id:'j3',shot:'镜头 01 · 雨滴落在瓶身',model:'Aperture Studio X',status:'succeeded',progress:100,eta:'完成',credits:28},
    {id:'j4',shot:'镜头 02 · 街角亮灯',model:'Cinematic Core 4',status:'failed',progress:38,eta:'已停止',credits:0,error:'provider timeout · 已自动退款'},
    {id:'j5',shot:'镜头 04 · 冰块与咖啡',model:'Pulse Draft 2.1',status:'succeeded',progress:100,eta:'完成',credits:4},
    {id:'j6',shot:'片尾品牌声',model:'Cinematic Core 4',status:'queued',progress:0,eta:'排队中',credits:12},
    {id:'j7',shot:'镜头 03 · 角色一致性检查',model:'Cinematic Core 4',status:'succeeded',progress:100,eta:'完成',credits:12},
    {id:'j8',shot:'镜头 06 · 品牌收束',model:'Aperture Studio X',status:'canceled',progress:14,eta:'已取消',credits:0},
  ],
  tracks:[{id:'t1',type:'video',name:'Video · 主画面',color:'#4EE1FF',clips:6},{id:'t2',type:'dialogue',name:'Dialogue · 对白',color:'#7C5CFF',clips:3},{id:'t3',type:'music',name:'Music · 夜行采样',color:'#F29E4C',clips:1},{id:'t4',type:'sfx',name:'SFX · 雨声与冰块',color:'#56C596',clips:4},{id:'t5',type:'captions',name:'Captions · 中文字幕',color:'#E8D44D',clips:6}],
}
export const assets:Asset[] = project.entities.map(e=>({id:e.id,name:e.name,kind:e.kind,image:e.image,version:1,entityId:e.id}))
