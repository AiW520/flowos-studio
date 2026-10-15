import type { ModelCatalogItem } from '@/lib/data'

export type ProviderStatus = 'connected' | 'attention' | 'disabled'

export type ModelProvider = {
  id: string
  name: string
  baseUrl: string
  keyHint: string
  status: ProviderStatus
  modelCount: number
  updatedAt: string
}

export type RegistryPayload = {
  models: ModelCatalogItem[]
  providers: ModelProvider[]
  updatedAt: string
}

export type ModelInput = Omit<ModelCatalogItem, 'id' | 'updatedAt'> & { id?: string }

export type ProviderInput = {
  id?: string
  name: string
  baseUrl: string
  apiKey?: string
  status?: ProviderStatus
}
