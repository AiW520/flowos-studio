import 'server-only'

import { randomUUID } from 'node:crypto'
import { mkdirSync } from 'node:fs'
import { isIP } from 'node:net'
import { join } from 'node:path'
import Database from 'better-sqlite3'
import { models as demoModels } from './mock'
import type {
  CreateModelProviderInput,
  ModelCatalogResponse,
  ModelProviderConnection,
} from './model-registry-types'
import type { MediaType, ModelVersion } from './types'

const DATA_DIRECTORY = join(process.cwd(), '.flowos')
const DATABASE_PATH = join(DATA_DIRECTORY, 'model-registry.sqlite')
const AUTO_SYNC_INTERVAL_MS = 15 * 60 * 1000
const SYNC_TIMEOUT_MS = 12_000
const MAX_MODELS_PER_PROVIDER = 1_000
const MAX_RESPONSE_BYTES = 5 * 1024 * 1024

interface ProviderRow {
  id: string
  name: string
  adapter_type: 'openai-compatible' | 'static'
  base_url: string | null
  models_path: string | null
  api_key_env: string | null
  enabled: number
  default_media_json: string
  last_sync_at: string | null
  sync_status: 'idle' | 'syncing' | 'ready' | 'error'
  sync_error: string | null
  created_at: string
  updated_at: string
  model_count?: number
}

interface ModelRow {
  payload_json: string
}

let database: Database.Database | null = null
const syncInFlight = new Map<string, Promise<ModelProviderConnection>>()

function now(): string {
  return new Date().toISOString()
}

function getDatabase(): Database.Database {
  if (database) return database
  mkdirSync(DATA_DIRECTORY, { recursive: true })
  database = new Database(DATABASE_PATH)
  database.exec(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;
    CREATE TABLE IF NOT EXISTS model_providers (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      adapter_type TEXT NOT NULL,
      base_url TEXT,
      models_path TEXT,
      api_key_env TEXT,
      enabled INTEGER NOT NULL DEFAULT 1,
      default_media_json TEXT NOT NULL,
      last_sync_at TEXT,
      sync_status TEXT NOT NULL DEFAULT 'idle',
      sync_error TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS registered_models (
      id TEXT PRIMARY KEY,
      provider_id TEXT NOT NULL REFERENCES model_providers(id) ON DELETE CASCADE,
      external_model_id TEXT NOT NULL,
      payload_json TEXT NOT NULL,
      last_seen_at TEXT NOT NULL,
      UNIQUE(provider_id, external_model_id)
    );
    CREATE INDEX IF NOT EXISTS registered_models_provider_idx
      ON registered_models(provider_id);
  `)
  seedDemoProvider(database)
  return database
}

function seedDemoProvider(db: Database.Database): void {
  const existing = db.prepare('SELECT id FROM model_providers WHERE id = ?').get('flowos-demo')
  if (existing) return
  const timestamp = now()
  db.prepare(`
    INSERT INTO model_providers (
      id, name, adapter_type, base_url, models_path, api_key_env, enabled,
      default_media_json, last_sync_at, sync_status, sync_error, created_at, updated_at
    ) VALUES (?, ?, 'static', NULL, NULL, NULL, 1, ?, ?, 'ready', NULL, ?, ?)
  `).run('flowos-demo', 'FlowOS 演示接入', JSON.stringify(['image', 'video', 'audio']), timestamp, timestamp, timestamp)

  const insert = db.prepare(`
    INSERT INTO registered_models (id, provider_id, external_model_id, payload_json, last_seen_at)
    VALUES (?, 'flowos-demo', ?, ?, ?)
  `)
  for (const model of demoModels) {
    insert.run(model.id, model.modelId ?? model.id, JSON.stringify(model), timestamp)
  }
}

function parseMedia(value: string): MediaType[] {
  try {
    const parsed = JSON.parse(value)
    if (!Array.isArray(parsed)) return ['image']
    return parsed.filter((item): item is MediaType => item === 'image' || item === 'video' || item === 'audio')
  } catch {
    return ['image']
  }
}

function toPublicProvider(row: ProviderRow): ModelProviderConnection {
  const apiKeyEnv = row.api_key_env
  return {
    id: row.id,
    name: row.name,
    adapterType: row.adapter_type,
    baseUrl: row.base_url,
    modelsPath: row.models_path,
    apiKeyEnv,
    credentialConfigured: !apiKeyEnv || Boolean(process.env[apiKeyEnv]),
    enabled: Boolean(row.enabled),
    defaultMedia: parseMedia(row.default_media_json),
    modelCount: Number(row.model_count ?? 0),
    lastSyncAt: row.last_sync_at,
    syncStatus: row.sync_status,
    syncError: row.sync_error,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function providerRows(): ProviderRow[] {
  return getDatabase().prepare(`
    SELECT p.*, COUNT(m.id) AS model_count
    FROM model_providers p
    LEFT JOIN registered_models m ON m.provider_id = p.id
    GROUP BY p.id
    ORDER BY p.created_at ASC
  `).all() as unknown as ProviderRow[]
}

export function listModelProviders(): ModelProviderConnection[] {
  return providerRows().map(toPublicProvider)
}

export function getModelCatalog(): ModelCatalogResponse {
  const rows = getDatabase().prepare(`
    SELECT m.payload_json
    FROM registered_models m
    JOIN model_providers p ON p.id = m.provider_id
    WHERE p.enabled = 1
    ORDER BY p.created_at ASC, m.external_model_id ASC
  `).all() as unknown as ModelRow[]
  const models = rows.flatMap((row) => {
    try {
      return [JSON.parse(row.payload_json) as ModelVersion]
    } catch {
      return []
    }
  })
  return { models, providers: listModelProviders(), refreshedAt: now() }
}

function validateBaseUrl(value: string): string {
  let url: URL
  try {
    url = new URL(value)
  } catch {
    throw new Error('请输入完整的模型接口地址。')
  }
  if (url.username || url.password) throw new Error('接口地址不能包含账号或密码。')
  const loopback = url.hostname === 'localhost' || url.hostname === '127.0.0.1' || url.hostname === '[::1]'
  if (url.protocol !== 'https:' && !(url.protocol === 'http:' && loopback)) {
    throw new Error('模型接口必须使用 HTTPS；本机 localhost 接口可以使用 HTTP。')
  }
  if (isIP(url.hostname) && !loopback) throw new Error('不允许连接非本机的裸 IP 地址。')
  url.hash = ''
  url.search = ''
  return url.toString().replace(/\/$/, '')
}

function validateModelsPath(value?: string): string {
  const path = (value?.trim() || 'v1/models').replace(/^\/+/, '')
  if (!path || path.includes('..') || /[?#]/.test(path)) throw new Error('模型列表路径格式不正确。')
  return path
}

function validateApiKeyEnv(value?: string): string | null {
  const name = value?.trim() || ''
  if (!name) return null
  if (!/^[A-Z][A-Z0-9_]{1,79}$/.test(name)) throw new Error('密钥环境变量需使用大写字母、数字和下划线。')
  if (name.startsWith('NEXT_PUBLIC_')) throw new Error('密钥不能使用 NEXT_PUBLIC_ 前缀。')
  return name
}

function validateMedia(media: MediaType[]): MediaType[] {
  const unique = [...new Set(media.filter((item) => item === 'image' || item === 'video' || item === 'audio'))]
  if (!unique.length) throw new Error('至少选择一种默认媒体能力。')
  return unique
}

function slug(value: string): string {
  return value.toLocaleLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 36) || 'provider'
}

export function createModelProvider(input: CreateModelProviderInput): ModelProviderConnection {
  const name = input.name.trim()
  if (!name || name.length > 80) throw new Error('接入名称需为 1 至 80 个字符。')
  const timestamp = now()
  const id = `${slug(name)}-${randomUUID().slice(0, 8)}`
  getDatabase().prepare(`
    INSERT INTO model_providers (
      id, name, adapter_type, base_url, models_path, api_key_env, enabled,
      default_media_json, last_sync_at, sync_status, sync_error, created_at, updated_at
    ) VALUES (?, ?, 'openai-compatible', ?, ?, ?, 1, ?, NULL, 'idle', NULL, ?, ?)
  `).run(
    id,
    name,
    validateBaseUrl(input.baseUrl),
    validateModelsPath(input.modelsPath),
    validateApiKeyEnv(input.apiKeyEnv),
    JSON.stringify(validateMedia(input.defaultMedia)),
    timestamp,
    timestamp,
  )
  return listModelProviders().find((provider) => provider.id === id) as ModelProviderConnection
}

export function updateModelProvider(id: string, patch: { enabled?: boolean }): ModelProviderConnection {
  const db = getDatabase()
  const existing = db.prepare('SELECT id FROM model_providers WHERE id = ?').get(id)
  if (!existing) throw new Error('接入不存在。')
  if (typeof patch.enabled === 'boolean') {
    db.prepare('UPDATE model_providers SET enabled = ?, updated_at = ? WHERE id = ?')
      .run(patch.enabled ? 1 : 0, now(), id)
  }
  return listModelProviders().find((provider) => provider.id === id) as ModelProviderConnection
}

export function deleteModelProvider(id: string): void {
  const db = getDatabase()
  const provider = db.prepare('SELECT adapter_type FROM model_providers WHERE id = ?').get(id) as { adapter_type?: string } | undefined
  if (provider?.adapter_type === 'static') throw new Error('内置演示接入只能停用，不能移除。')
  const result = db.prepare('DELETE FROM model_providers WHERE id = ?').run(id)
  if (!result.changes) throw new Error('接入不存在。')
}

function arrayOfStrings(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : []
}

function inferMedia(model: Record<string, unknown>, defaults: MediaType[]): MediaType[] {
  const id = String(model.id ?? model.name ?? '').toLocaleLowerCase()
  const explicit = [
    ...arrayOfStrings(model.modalities),
    ...arrayOfStrings(model.output_modalities),
    ...arrayOfStrings(model.capabilities),
  ].join(' ').toLocaleLowerCase()
  const searchable = `${id} ${explicit}`
  const inferred: MediaType[] = []
  if (/image|dall|flux|sdxl|stable.diffusion|midjourney|imagen/.test(searchable)) inferred.push('image')
  if (/video|sora|veo|kling|runway|wan[\d.-]/.test(searchable)) inferred.push('video')
  if (/audio|speech|voice|tts|whisper|music|realtime/.test(searchable)) inferred.push('audio')
  return inferred.length ? [...new Set(inferred)] : defaults
}

function displayName(id: string): string {
  return id.split(/[\/_-]+/).filter(Boolean).map((part) => {
    if (/^\d/.test(part) || part.length <= 3) return part.toUpperCase()
    return `${part[0].toUpperCase()}${part.slice(1)}`
  }).join(' ')
}

function normalizeModel(
  raw: Record<string, unknown>,
  provider: ProviderRow,
  media: MediaType[],
): ModelVersion | null {
  const externalId = typeof raw.id === 'string' ? raw.id.trim() : ''
  if (!externalId || externalId.length > 240) return null
  const searchable = externalId.toLocaleLowerCase()
  const quality = /ultra|pro|max|4k/.test(searchable) ? 'Ultra' : /mini|flash|turbo|draft/.test(searchable) ? 'Draft' : 'Balanced'
  const capabilities = [...new Set([
    ...arrayOfStrings(raw.capabilities),
    ...arrayOfStrings(raw.output_modalities),
  ])].slice(0, 8)
  return {
    id: `${provider.id}:${externalId}`,
    name: typeof raw.display_name === 'string' ? raw.display_name : displayName(externalId),
    provider: provider.name,
    media,
    quality,
    speed: quality === 'Draft' ? 'Fast' : quality === 'Ultra' ? 'High quality' : 'Balanced',
    cost: '按供应商计费',
    duration: media.includes('video') ? '按模型限制' : '—',
    resolution: media.some((item) => item === 'image' || item === 'video') ? '供应商默认' : '—',
    refs: '按模型限制',
    policy: '遵循供应商条款',
    status: 'available',
    capabilities: capabilities.length ? capabilities : ['供应商已接入', 'API 可调用'],
    reason: `由 ${provider.name} 自动同步的可用模型。`,
    modelId: externalId,
    version: typeof raw.version === 'string' ? raw.version : undefined,
    providerAdapterId: provider.id,
    updatedAt: now(),
  }
}

function extractModelRecords(payload: unknown): Record<string, unknown>[] {
  const source = Array.isArray(payload)
    ? payload
    : payload && typeof payload === 'object' && Array.isArray((payload as { data?: unknown }).data)
      ? (payload as { data: unknown[] }).data
      : payload && typeof payload === 'object' && Array.isArray((payload as { models?: unknown }).models)
        ? (payload as { models: unknown[] }).models
        : []
  return source.filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === 'object').slice(0, MAX_MODELS_PER_PROVIDER)
}

async function performSync(id: string): Promise<ModelProviderConnection> {
  const db = getDatabase()
  const provider = db.prepare('SELECT * FROM model_providers WHERE id = ?').get(id) as unknown as ProviderRow | undefined
  if (!provider) throw new Error('接入不存在。')
  if (provider.adapter_type === 'static') return toPublicProvider({ ...provider, model_count: demoModels.length })

  const attemptedAt = now()
  db.prepare("UPDATE model_providers SET sync_status = 'syncing', sync_error = NULL, updated_at = ? WHERE id = ?")
    .run(attemptedAt, id)

  try {
    const apiKey = provider.api_key_env ? process.env[provider.api_key_env] : undefined
    if (provider.api_key_env && !apiKey) throw new Error(`服务端未配置环境变量 ${provider.api_key_env}。`)
    const endpoint = new URL(provider.models_path ?? 'v1/models', `${provider.base_url}/`).toString()
    const response = await fetch(endpoint, {
      cache: 'no-store',
      headers: apiKey ? { Authorization: `Bearer ${apiKey}`, Accept: 'application/json' } : { Accept: 'application/json' },
      signal: AbortSignal.timeout(SYNC_TIMEOUT_MS),
    })
    if (!response.ok) throw new Error(`模型接口返回 HTTP ${response.status}。`)
    const contentLength = Number(response.headers.get('content-length') ?? 0)
    if (contentLength > MAX_RESPONSE_BYTES) throw new Error('模型列表响应过大。')
    const responseText = await response.text()
    if (Buffer.byteLength(responseText, 'utf8') > MAX_RESPONSE_BYTES) throw new Error('模型列表响应过大。')
    const records = extractModelRecords(JSON.parse(responseText))
    if (!records.length) throw new Error('模型接口没有返回可识别的模型。')

    const defaultMedia = parseMedia(provider.default_media_json)
    const normalized = records.flatMap((record) => {
      const model = normalizeModel(record, provider, inferMedia(record, defaultMedia))
      return model ? [model] : []
    })
    if (!normalized.length) throw new Error('模型接口没有返回有效的模型 ID。')

    db.exec('BEGIN IMMEDIATE')
    try {
      const upsert = db.prepare(`
        INSERT INTO registered_models (id, provider_id, external_model_id, payload_json, last_seen_at)
        VALUES (?, ?, ?, ?, ?)
        ON CONFLICT(provider_id, external_model_id) DO UPDATE SET
          id = excluded.id,
          payload_json = excluded.payload_json,
          last_seen_at = excluded.last_seen_at
      `)
      for (const model of normalized) {
        upsert.run(model.id, id, model.modelId ?? model.id, JSON.stringify(model), attemptedAt)
      }
      db.prepare('DELETE FROM registered_models WHERE provider_id = ? AND last_seen_at <> ?').run(id, attemptedAt)
      db.prepare("UPDATE model_providers SET last_sync_at = ?, sync_status = 'ready', sync_error = NULL, updated_at = ? WHERE id = ?")
        .run(attemptedAt, attemptedAt, id)
      db.exec('COMMIT')
    } catch (error) {
      db.exec('ROLLBACK')
      throw error
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : '模型同步失败。'
    db.prepare("UPDATE model_providers SET last_sync_at = ?, sync_status = 'error', sync_error = ?, updated_at = ? WHERE id = ?")
      .run(attemptedAt, message.slice(0, 500), attemptedAt, id)
  }

  return listModelProviders().find((providerItem) => providerItem.id === id) as ModelProviderConnection
}

export function syncModelProvider(id: string): Promise<ModelProviderConnection> {
  const current = syncInFlight.get(id)
  if (current) return current
  const task = performSync(id).finally(() => syncInFlight.delete(id))
  syncInFlight.set(id, task)
  return task
}

export async function syncStaleModelProviders(): Promise<void> {
  const cutoff = Date.now() - AUTO_SYNC_INTERVAL_MS
  const stale = providerRows().filter((provider) => provider.enabled && provider.adapter_type !== 'static' && (
    !provider.last_sync_at || Date.parse(provider.last_sync_at) < cutoff
  ))
  await Promise.allSettled(stale.map((provider) => syncModelProvider(provider.id)))
}
