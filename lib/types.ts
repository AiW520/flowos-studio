export type EntityKind = 'character' | 'product' | 'location' | 'style' | 'voice'
export type MediaType = 'image' | 'video' | 'audio'
export type CapabilityMediaType = 'text' | MediaType
export type JobStatus = 'queued' | 'running' | 'succeeded' | 'failed' | 'canceled'
export type GenerationFailureCode =
  | 'provider_timeout'
  | 'moderation_blocked'
  | 'insufficient_credits'
  | 'invalid_reference'
export type ModelAvailabilityStatus = 'available' | 'maintenance'
export type TimelineTrackType = 'video' | 'dialogue' | 'music' | 'sfx' | 'captions'
export type ProjectStatus = 'draft' | 'active' | 'review' | 'completed' | 'archived' | 'trashed'
export type ProjectLanguage = 'zh-CN' | 'en-US' | 'zh-TW' | 'ja-JP' | 'ko-KR'
export type ApprovalStatus = 'pending' | 'needs_changes' | 'approved'
export type ISODateString = string
export type Identifier = string
export type JsonPrimitive = string | number | boolean | null
export type JsonValue = JsonPrimitive | JsonValue[] | { [key: string]: JsonValue }

export interface User {
  id: Identifier
  name: string
  initials: string
  role: string
  email?: string
  avatarUrl?: string
  status?: 'active' | 'invited' | 'disabled'
}

export interface Workspace {
  id: Identifier
  name: string
  plan: string
  credits: number
  ownerId?: Identifier
  memberIds?: Identifier[]
  currency?: string
  createdAt?: ISODateString
  updatedAt?: ISODateString
}

export interface EntityReferenceView {
  assetId: Identifier
  label: string
  angle?: 'front' | 'back' | 'left' | 'right' | 'three-quarter' | 'detail' | 'custom'
  weight?: number
}

export interface EntityBase {
  id: Identifier
  kind: EntityKind
  name: string
  description: string
  color: string
  tags: string[]
  image: string
  locked?: string[]
  workspaceId?: Identifier
  referenceAssetIds?: Identifier[]
  angleReferences?: EntityReferenceView[]
  outfits?: string[]
  expressions?: string[]
  voiceEntityId?: Identifier
  lockedFeatures?: string[]
  prohibitedChanges?: string[]
  metadata?: Record<string, JsonValue>
  createdAt?: ISODateString
  updatedAt?: ISODateString
}

/** Character entities carry a complete reusable identity contract. */
export interface CharacterEntity extends EntityBase {
  kind: 'character'
  angleReferences?: EntityReferenceView[]
  outfits?: string[]
  expressions?: string[]
  lockedFeatures?: string[]
  prohibitedChanges?: string[]
}

export interface NonCharacterEntity extends EntityBase {
  kind: Exclude<EntityKind, 'character'>
}

export type Entity = CharacterEntity | NonCharacterEntity

export type AssetKind = EntityKind | 'output' | 'reference'

export interface AssetVersion {
  id: Identifier
  assetId: Identifier
  version: number
  mediaType: MediaType
  uri: string
  thumbnailUri?: string
  width?: number
  height?: number
  durationMs?: number
  recipeId?: Identifier
  parentVersionId?: Identifier
  createdBy?: Identifier
  createdAt: ISODateString
}

export interface Asset {
  id: Identifier
  name: string
  kind: AssetKind
  image: string
  version: number
  entityId?: Identifier
  projectId?: Identifier
  mediaType?: MediaType
  versions?: AssetVersion[]
  currentVersionId?: Identifier
  licenseId?: Identifier
  tags?: string[]
  metadata?: Record<string, JsonValue>
  archivedAt?: ISODateString
  createdAt?: ISODateString
  updatedAt?: ISODateString
}

export type CommercialPolicy = 'allowed' | 'restricted' | 'prohibited' | 'unknown'

export interface ModelCapabilityMatrix {
  inputs: CapabilityMediaType[]
  outputs: MediaType[]
  firstFrame: boolean
  lastFrame: boolean
  maxReferenceCount: number
  nativeAudio: boolean
  maxDurationSeconds: number
  resolutions: string[]
  commercialPolicy: CommercialPolicy
  estimatedCostCredits: { min: number; max: number }
  estimatedLatencySeconds: { min: number; max: number }
}

export interface ModelVersion {
  id: Identifier
  name: string
  provider: string
  media: MediaType[]
  quality: string
  speed: string
  cost: string
  duration: string
  resolution: string
  refs: string
  policy: string
  status: ModelAvailabilityStatus
  capabilities: string[]
  reason: string
  modelId?: Identifier
  version?: string
  providerAdapterId?: Identifier
  /** Structured model contract; legacy catalog entries may expose display fields only. */
  capabilityMatrix?: ModelCapabilityMatrix
  licenseId?: Identifier
  deprecatedAt?: ISODateString
  createdAt?: ISODateString
  updatedAt?: ISODateString
}

export interface WorkflowPort {
  id: Identifier
  name: string
  valueType: CapabilityMediaType | 'entity' | 'number' | 'boolean' | 'string' | 'json'
  required: boolean
  defaultValue?: JsonValue
}

export interface WorkflowStep {
  id: Identifier
  kind: 'input' | 'prompt' | 'entity_reference' | 'model_router' | 'generate' | 'quality_check' | 'output' | 'tool'
  name: string
  config: Record<string, JsonValue>
  dependsOn: Identifier[]
}

export interface WorkflowVersion {
  id: Identifier
  workflowId: Identifier
  version: string
  name: string
  description: string
  inputs: WorkflowPort[]
  outputs: WorkflowPort[]
  steps: WorkflowStep[]
  compatibleModelIds: Identifier[]
  priceCredits: number
  completionRate: number
  status: 'draft' | 'published' | 'deprecated'
  createdBy: Identifier
  createdAt: ISODateString
  licenseId?: Identifier
  changelog?: string
  publishedAt?: ISODateString
}

export interface Skill {
  id: Identifier
  workspaceId?: Identifier
  name: string
  description: string
  currentVersionId: Identifier
  versionIds: Identifier[]
  category: string
  tags: string[]
  visibility: 'private' | 'workspace' | 'public'
  priceCredits: number
  usageCount: number
  completionRate: number
  createdBy: Identifier
  createdAt: ISODateString
  updatedAt: ISODateString
}

export interface License {
  id: Identifier
  name: string
  summary: string
  commercialUse: boolean
  attributionRequired: boolean
  derivativesAllowed: boolean
  redistributionAllowed: boolean
  modelTrainingAllowed: boolean
  aiDisclosureRequired: boolean
  territory?: string
  expiresAt?: ISODateString
  policyUrl?: string
}

export interface Recipe {
  id: Identifier
  title: string
  model: string
  prompt: string
  seed: number
  cost: string
  duration: string
  license: string
  parent?: string
  modelVersionId?: Identifier
  negativePrompt?: string
  referenceEntityIds?: Identifier[]
  referenceAssetIds?: Identifier[]
  parameters?: Record<string, JsonValue>
  parentResultId?: Identifier
  costCredits?: number
  elapsedMs?: number
  licenseId?: Identifier
  aiDisclosure?: boolean
  createdAt?: ISODateString
}

export interface GenerationJob {
  id: Identifier
  shot: string
  model: string
  status: JobStatus
  progress: number
  eta: string
  credits: number
  error?: string
  projectId?: Identifier
  branchId?: Identifier
  shotId?: Identifier
  prompt?: string
  mediaType?: MediaType
  seed?: number
  providerId?: Identifier
  modelVersionId?: Identifier
  providerAdapterId?: Identifier
  recipeId?: Identifier
  outputAssetId?: Identifier
  attempt?: number
  retryOfJobId?: Identifier
  retryOf?: Identifier
  parentResultId?: Identifier
  failureCode?: GenerationFailureCode
  queuedAt?: ISODateString
  startedAt?: ISODateString
  completedAt?: ISODateString
  createdAt?: ISODateString
  updatedAt?: ISODateString
}

export interface Shot {
  id: Identifier
  number: number
  title: string
  duration: string
  framing: string
  move: string
  characters: string
  dialogue: string
  sound: string
  warning?: string
  image: string
  version: string
  sequenceId?: Identifier
  sceneId?: Identifier
  prompt?: string
  entityIds?: Identifier[]
  selectedAssetVersionId?: Identifier
  versionIds?: Identifier[]
  continuityNotes?: string[]
  createdAt?: ISODateString
  updatedAt?: ISODateString
}

export interface Scene {
  id: Identifier
  sequenceId: Identifier
  number: number
  name: string
  description: string
  locationEntityId?: Identifier
  shotIds: Identifier[]
  durationMs: number
  createdAt: ISODateString
  updatedAt: ISODateString
}

export interface Sequence {
  id: Identifier
  projectId: Identifier
  name: string
  description?: string
  sceneIds: Identifier[]
  shotIds: Identifier[]
  timelineTrackIds: Identifier[]
  durationMs: number
  frameRate: number
  aspectRatio: string
  createdAt: ISODateString
  updatedAt: ISODateString
}

export interface TimelineClipRecord {
  id: Identifier
  trackId: Identifier
  sourceJobId: Identifier
  outputId: Identifier
  shotId: Identifier
  name: string
  startMs: number
  durationMs: number
  trimStartMs: number
  trimEndMs: number
  createdAt: ISODateString
}

export interface TimelineTrack {
  id: Identifier
  type: TimelineTrackType
  name: string
  color: string
  clips: number
  sequenceId?: Identifier
  muted?: boolean
  locked?: boolean
  items?: TimelineClipRecord[]
}

export interface Branch {
  id: Identifier
  name: string
  parentBranchId?: Identifier
  sourceJobId?: Identifier
  createdAt: ISODateString
  projectId?: Identifier
  description?: string
  createdBy?: Identifier
  headVersion?: number
  status?: 'active' | 'merged' | 'archived'
}

export interface Lineage {
  id: Identifier
  relationship: 'branch' | 'remix' | 'reference' | 'variation' | 'edit'
  sourceProjectId: Identifier
  sourceBranchId: Identifier
  createdAt: ISODateString
  sourceJobId?: Identifier
  sourceOutputId?: Identifier
  targetProjectId?: Identifier
  targetAssetId?: Identifier
  parentAssetId?: Identifier
  parentRecipeId?: Identifier
}

export interface CommentAnchor {
  kind: 'frame' | 'timecode' | 'asset' | 'shot'
  x?: number
  y?: number
  timeMs?: number
  shotId?: Identifier
}

export interface Comment {
  id: Identifier
  projectId: Identifier
  targetId: Identifier
  targetType: 'asset' | 'shot' | 'sequence' | 'timeline' | 'generation'
  authorId: Identifier
  body: string
  mentions: Identifier[]
  anchor?: CommentAnchor
  parentCommentId?: Identifier
  resolvedAt?: ISODateString
  createdAt: ISODateString
  updatedAt: ISODateString
}

export interface Approval {
  id: Identifier
  projectId: Identifier
  targetId: Identifier
  targetType: 'asset' | 'shot' | 'sequence' | 'export'
  versionId?: Identifier
  status: ApprovalStatus
  reviewerId: Identifier
  commentId?: Identifier
  decidedAt?: ISODateString
  createdAt: ISODateString
}

export interface UsageLedger {
  id: Identifier
  workspaceId: Identifier
  projectId?: Identifier
  userId: Identifier
  jobId?: Identifier
  modelVersionId?: Identifier
  providerAdapterId?: Identifier
  kind: 'generation_estimate' | 'generation_charge' | 'refund' | 'export' | 'credit_adjustment'
  units: number
  credits: number
  amount?: number
  currency?: string
  metadata?: Record<string, JsonValue>
  recordedAt: ISODateString
}

export interface Project {
  id: Identifier
  name: string
  type: string
  outputLanguage?: ProjectLanguage
  updated: string
  shots: Shot[]
  entities: Entity[]
  jobs: GenerationJob[]
  tracks: TimelineTrack[]
  workspaceId?: Identifier
  description?: string
  status?: ProjectStatus
  branches?: Branch[]
  activeBranchId?: Identifier
  assets?: Asset[]
  sequences?: Sequence[]
  scenes?: Scene[]
  recipes?: Recipe[]
  lineage?: Lineage[]
  comments?: Comment[]
  approvals?: Approval[]
  usageLedger?: UsageLedger[]
  defaultModelVersionId?: Identifier
  createdBy?: Identifier
  createdAt?: ISODateString
  updatedAtIso?: ISODateString
}
