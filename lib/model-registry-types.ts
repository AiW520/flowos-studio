import type { MediaType, ModelVersion } from './types'

export type ModelProviderAdapterType = 'openai-compatible' | 'static'
export type ModelProviderSyncStatus = 'idle' | 'syncing' | 'ready' | 'error'

export interface ModelProviderConnection {
  id: string
  name: string
  adapterType: ModelProviderAdapterType
  baseUrl: string | null
  modelsPath: string | null
  apiKeyEnv: string | null
  credentialConfigured: boolean
  enabled: boolean
  defaultMedia: MediaType[]
  modelCount: number
  lastSyncAt: string | null
  syncStatus: ModelProviderSyncStatus
  syncError: string | null
  createdAt: string
  updatedAt: string
}

export interface ModelCatalogResponse {
  models: ModelVersion[]
  providers: ModelProviderConnection[]
  refreshedAt: string
}

export interface CreateModelProviderInput {
  name: string
  baseUrl: string
  modelsPath?: string
  apiKeyEnv?: string
  defaultMedia: MediaType[]
}
