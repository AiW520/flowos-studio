import 'server-only'

import { createCipheriv, createHash, randomBytes, randomUUID } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { models as seedModels, type ModelCatalogItem } from '@/lib/data'
import type { ModelInput, ModelProvider, ProviderInput, RegistryPayload } from '@/lib/model-registry-types'

type StoredProvider = ModelProvider & { encryptedKey: string }
type StoredRegistry = Omit<RegistryPayload, 'providers'> & { providers: StoredProvider[] }

const dataDirectory = process.env.FLOWOS_DATA_DIR || join(process.cwd(), '.flowos-data')
const registryPath = join(dataDirectory, 'model-registry.json')
const allowedTypes = new Set(['图像', '视频', '文案', '音频'])
const allowedStatuses = new Set(['connected', 'attention', 'disabled'])

function now() {
  return new Date().toISOString()
}

function slug(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 42) || randomUUID().slice(0, 8)
}

function seedRegistry(): StoredRegistry {
  const timestamp = now()
  return {
    models: seedModels,
    providers: [
      { id: 'flow-labs', name: 'Flow Labs', baseUrl: '内置模型目录', keyHint: '无需密钥', encryptedKey: '', status: 'connected', modelCount: 2, updatedAt: timestamp },
      { id: 'tuzi-coding', name: 'Tuzi Coding API', baseUrl: 'https://api.tu-zi.com/coding', keyHint: process.env.TUZI_CODING_API_KEY ? '环境变量已配置' : '等待配置', encryptedKey: '', status: process.env.TUZI_CODING_API_KEY ? 'connected' : 'attention', modelCount: 0, updatedAt: timestamp },
    ],
    updatedAt: timestamp,
  }
}

function readRegistry(): StoredRegistry {
  mkdirSync(dataDirectory, { recursive: true })
  if (!existsSync(registryPath)) {
    const seeded = seedRegistry()
    writeRegistry(seeded)
    return seeded
  }
  try {
    const registry = JSON.parse(readFileSync(registryPath, 'utf8')) as StoredRegistry
    const tuzi = registry.providers.find((provider) => provider.id === 'tuzi-coding')
    if (tuzi) {
      const configured = Boolean(process.env.TUZI_CODING_API_KEY)
      const nextStatus = configured ? 'connected' : 'attention'
      const nextHint = configured ? '环境变量已配置' : '等待配置'
      if (tuzi.status !== nextStatus || tuzi.keyHint !== nextHint) {
        tuzi.status = nextStatus
        tuzi.keyHint = nextHint
        tuzi.updatedAt = now()
        registry.updatedAt = tuzi.updatedAt
        writeRegistry(registry)
      }
    }
    return registry
  } catch {
    const seeded = seedRegistry()
    writeRegistry(seeded)
    return seeded
  }
}

function writeRegistry(registry: StoredRegistry) {
  mkdirSync(dataDirectory, { recursive: true })
  const temporaryPath = `${registryPath}.${process.pid}.tmp`
  writeFileSync(temporaryPath, JSON.stringify(registry, null, 2), { encoding: 'utf8', mode: 0o600 })
  renameSync(temporaryPath, registryPath)
}

function publicRegistry(registry: StoredRegistry): RegistryPayload {
  return {
    models: registry.models,
    providers: registry.providers.map(toPublicProvider),
    updatedAt: registry.updatedAt,
  }
}

function toPublicProvider(provider: StoredProvider): ModelProvider {
  return {
    id: provider.id,
    name: provider.name,
    baseUrl: provider.baseUrl,
    keyHint: provider.keyHint,
    status: provider.status,
    modelCount: provider.modelCount,
    updatedAt: provider.updatedAt,
  }
}

function encryptionKey() {
  const secret = process.env.MODEL_REGISTRY_SECRET || 'flowos-local-development-only'
  return createHash('sha256').update(secret).digest()
}

function encryptSecret(value: string) {
  if (!value) return ''
  const iv = randomBytes(12)
  const cipher = createCipheriv('aes-256-gcm', encryptionKey(), iv)
  const encrypted = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()])
  return [iv.toString('base64url'), cipher.getAuthTag().toString('base64url'), encrypted.toString('base64url')].join('.')
}

function cleanText(value: unknown, label: string, maxLength: number) {
  const text = typeof value === 'string' ? value.trim() : ''
  if (!text || text.length > maxLength) throw new Error(`${label}不能为空，且不能超过 ${maxLength} 个字符。`)
  return text
}

function validateBaseUrl(value: unknown) {
  const text = cleanText(value, '接口地址', 240)
  if (text === '内置模型目录') return text
  let url: URL
  try { url = new URL(text) } catch { throw new Error('请输入完整的 HTTPS 接口地址。') }
  if (url.protocol !== 'https:') throw new Error('线上模型接口必须使用 HTTPS。')
  if (url.username || url.password) throw new Error('接口地址不能包含账号或密码。')
  url.hash = ''
  return url.toString().replace(/\/$/, '')
}

function validateModel(input: ModelInput): Omit<ModelCatalogItem, 'id' | 'updatedAt'> {
  const type = input.type
  if (!allowedTypes.has(type)) throw new Error('模型类型不受支持。')
  const quality = Number(input.quality)
  if (!Number.isFinite(quality) || quality < 0 || quality > 100) throw new Error('质量评分必须在 0 到 100 之间。')
  const accent = /^#[0-9a-f]{6}$/i.test(input.accent) ? input.accent : '#16b8c8'
  return {
    name: cleanText(input.name, '模型名称', 80),
    vendor: cleanText(input.vendor, '供应商', 80),
    type,
    description: cleanText(input.description, '模型介绍', 300),
    quality,
    latency: cleanText(input.latency, '平均时延', 30),
    cost: cleanText(input.cost, '调用成本', 30),
    license: cleanText(input.license, '许可说明', 40),
    accent,
    enabled: Boolean(input.enabled),
    featured: Boolean(input.featured),
  }
}

export function getPublicModels() {
  return readRegistry().models.filter((model) => model.enabled)
}

export function getAdminRegistry() {
  return publicRegistry(readRegistry())
}

export function createModel(input: ModelInput) {
  const registry = readRegistry()
  const model = validateModel(input)
  if (registry.models.some((item) => item.name.toLowerCase() === model.name.toLowerCase())) throw new Error('模型名称已存在。')
  const idBase = slug(input.id || model.name)
  const id = registry.models.some((item) => item.id === idBase) ? `${idBase}-${randomUUID().slice(0, 6)}` : idBase
  const created: ModelCatalogItem = { id, ...model, updatedAt: now() }
  registry.models.unshift(created)
  registry.updatedAt = created.updatedAt
  writeRegistry(registry)
  return created
}

export function updateModel(id: string, input: ModelInput) {
  const registry = readRegistry()
  const index = registry.models.findIndex((model) => model.id === id)
  if (index < 0) throw new Error('模型不存在。')
  const model = validateModel(input)
  if (registry.models.some((item, itemIndex) => itemIndex !== index && item.name.toLowerCase() === model.name.toLowerCase())) throw new Error('模型名称已存在。')
  const updated: ModelCatalogItem = { id, ...model, updatedAt: now() }
  registry.models[index] = updated
  registry.updatedAt = updated.updatedAt
  writeRegistry(registry)
  return updated
}

export function deleteModel(id: string) {
  const registry = readRegistry()
  const nextModels = registry.models.filter((model) => model.id !== id)
  if (nextModels.length === registry.models.length) throw new Error('模型不存在。')
  registry.models = nextModels
  registry.updatedAt = now()
  writeRegistry(registry)
}

export function createProvider(input: ProviderInput) {
  const registry = readRegistry()
  const name = cleanText(input.name, '供应商名称', 80)
  const baseUrl = validateBaseUrl(input.baseUrl)
  const apiKey = cleanText(input.apiKey, 'API Key', 500)
  if (registry.providers.some((provider) => provider.name.toLowerCase() === name.toLowerCase())) throw new Error('供应商名称已存在。')
  const timestamp = now()
  const provider: StoredProvider = {
    id: `${slug(name)}-${randomUUID().slice(0, 6)}`,
    name,
    baseUrl,
    keyHint: `已保存 ····${apiKey.slice(-4)}`,
    encryptedKey: encryptSecret(apiKey),
    status: 'connected',
    modelCount: 0,
    updatedAt: timestamp,
  }
  registry.providers.unshift(provider)
  registry.updatedAt = timestamp
  writeRegistry(registry)
  return toPublicProvider(provider)
}

export function updateProvider(id: string, input: ProviderInput) {
  const registry = readRegistry()
  const index = registry.providers.findIndex((provider) => provider.id === id)
  if (index < 0) throw new Error('供应商不存在。')
  const current = registry.providers[index]
  const apiKey = typeof input.apiKey === 'string' ? input.apiKey.trim() : ''
  const status = input.status && allowedStatuses.has(input.status) ? input.status : current.status
  const updated: StoredProvider = {
    ...current,
    name: cleanText(input.name, '供应商名称', 80),
    baseUrl: validateBaseUrl(input.baseUrl),
    status,
    updatedAt: now(),
    ...(apiKey ? { encryptedKey: encryptSecret(apiKey), keyHint: `已保存 ····${apiKey.slice(-4)}` } : {}),
  }
  registry.providers[index] = updated
  registry.updatedAt = updated.updatedAt
  writeRegistry(registry)
  return toPublicProvider(updated)
}

export function deleteProvider(id: string) {
  const registry = readRegistry()
  const provider = registry.providers.find((item) => item.id === id)
  if (!provider) throw new Error('供应商不存在。')
  if (provider.baseUrl === '内置模型目录') throw new Error('内置供应商不能删除。')
  registry.providers = registry.providers.filter((item) => item.id !== id)
  registry.updatedAt = now()
  writeRegistry(registry)
}
