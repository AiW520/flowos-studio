import type { JobStatus, MediaType } from './types'

export type GenerationFailureCode =
  | 'provider_timeout'
  | 'moderation_blocked'
  | 'insufficient_credits'
  | 'invalid_reference'

export interface ProviderGenerationRequest {
  projectId: string
  branchId: string
  shotId: string
  prompt: string
  modelId: string
  modelName: string
  mediaType: MediaType
  seed: number
  attempt: number
  estimatedCredits: number
  previewUrl?: string
  forceFailure?: GenerationFailureCode
  parameters?: Record<string, string | number | boolean>
}

/** Serializable provider state. It may safely be persisted with its project. */
export interface ProviderJobHandle {
  id: string
  providerId: string
  requestHash: number
  submittedAtMs: number
  startsAtMs: number
  completesAtMs: number
  outcome: 'succeeded' | 'failed'
  failureCode?: GenerationFailureCode
}

export interface ProviderJobUpdate {
  status: Extract<JobStatus, 'queued' | 'running' | 'succeeded' | 'failed'>
  progress: number
  etaMs: number
  failureCode?: GenerationFailureCode
  error?: string
  output?: {
    mediaType: MediaType
    previewUrl?: string
    width?: number
    height?: number
    durationMs?: number
  }
}

export interface ProviderAdapter {
  readonly id: string
  readonly displayName: string
  submit(request: ProviderGenerationRequest, nowMs?: number): Promise<ProviderJobHandle>
  poll(handle: ProviderJobHandle, request: ProviderGenerationRequest, nowMs?: number): Promise<ProviderJobUpdate>
  cancel(handle: ProviderJobHandle): Promise<void>
}

export interface MockProviderOptions {
  id?: string
  displayName?: string
  queueDelayMs?: number
  minDurationMs?: number
  maxDurationMs?: number
  failureRate?: number
}

const failureMessages: Record<GenerationFailureCode, string> = {
  provider_timeout: 'provider timeout · 已自动退款',
  moderation_blocked: 'moderation blocked · 内容需要修改',
  insufficient_credits: 'insufficient credits · 请调整规格或充值',
  invalid_reference: 'invalid reference · 引用素材已失效',
}

export function getFailureMessage(code: GenerationFailureCode): string {
  return failureMessages[code]
}

/** Stable FNV-1a hash, used so the mock produces the same plan for the same request. */
export function stableHash(value: string): number {
  let hash = 0x811c9dc5
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index)
    hash = Math.imul(hash, 0x01000193)
  }
  return hash >>> 0
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

export class MockProviderAdapter implements ProviderAdapter {
  readonly id: string
  readonly displayName: string
  private readonly queueDelayMs: number
  private readonly minDurationMs: number
  private readonly durationRangeMs: number
  private readonly failureRate: number

  constructor(options: MockProviderOptions = {}) {
    this.id = options.id ?? 'flowos-mock'
    this.displayName = options.displayName ?? 'FlowOS deterministic mock'
    this.queueDelayMs = Math.max(0, options.queueDelayMs ?? 1_200)
    this.minDurationMs = Math.max(1_000, options.minDurationMs ?? 8_000)
    const maxDurationMs = Math.max(this.minDurationMs, options.maxDurationMs ?? 18_000)
    this.durationRangeMs = maxDurationMs - this.minDurationMs
    this.failureRate = clamp(options.failureRate ?? 0.16, 0, 1)
  }

  async submit(request: ProviderGenerationRequest, nowMs = Date.now()): Promise<ProviderJobHandle> {
    const requestHash = stableHash([
      request.projectId,
      request.branchId,
      request.shotId,
      request.modelId,
      request.prompt,
      request.seed,
      request.attempt,
    ].join(':'))
    const durationMs = this.minDurationMs + (this.durationRangeMs === 0 ? 0 : requestHash % (this.durationRangeMs + 1))
    // Automatic failures exercise the first-attempt UI; a retry succeeds unless callers
    // deliberately request another failure to test a persistent error state.
    const fails = Boolean(request.forceFailure)
      || (request.attempt === 1 && (requestHash % 10_000) / 10_000 < this.failureRate)
    const failureCodes: GenerationFailureCode[] = [
      'provider_timeout',
      'moderation_blocked',
      'insufficient_credits',
      'invalid_reference',
    ]
    const failureCode = request.forceFailure ?? (fails ? failureCodes[(requestHash >>> 8) % failureCodes.length] : undefined)

    return {
      id: `${this.id}-${requestHash.toString(36)}-${request.attempt}`,
      providerId: this.id,
      requestHash,
      submittedAtMs: nowMs,
      startsAtMs: nowMs + this.queueDelayMs,
      completesAtMs: nowMs + this.queueDelayMs + durationMs,
      outcome: failureCode ? 'failed' : 'succeeded',
      failureCode,
    }
  }

  async poll(
    handle: ProviderJobHandle,
    request: ProviderGenerationRequest,
    nowMs = Date.now(),
  ): Promise<ProviderJobUpdate> {
    if (nowMs < handle.startsAtMs) {
      return {
        status: 'queued',
        progress: 0,
        etaMs: handle.completesAtMs - nowMs,
      }
    }

    if (nowMs < handle.completesAtMs) {
      const runDuration = Math.max(1, handle.completesAtMs - handle.startsAtMs)
      const elapsed = nowMs - handle.startsAtMs
      return {
        status: 'running',
        progress: clamp(Math.floor((elapsed / runDuration) * 99) + 1, 1, 99),
        etaMs: handle.completesAtMs - nowMs,
      }
    }

    if (handle.outcome === 'failed') {
      const failureCode = handle.failureCode ?? 'provider_timeout'
      return {
        status: 'failed',
        progress: 100,
        etaMs: 0,
        failureCode,
        error: getFailureMessage(failureCode),
      }
    }

    return {
      status: 'succeeded',
      progress: 100,
      etaMs: 0,
      output: {
        mediaType: request.mediaType,
        previewUrl: request.previewUrl,
        width: request.mediaType === 'audio' ? undefined : 1920,
        height: request.mediaType === 'audio' ? undefined : 1080,
        durationMs: request.mediaType === 'video' || request.mediaType === 'audio' ? 5_000 : undefined,
      },
    }
  }

  async cancel(): Promise<void> {
    // The deterministic provider is stateless; cancellation is recorded by the repository.
  }
}

export class ProviderAdapterRegistry {
  private readonly adapters = new Map<string, ProviderAdapter>()

  constructor(adapters: ProviderAdapter[] = [new MockProviderAdapter()]) {
    adapters.forEach((adapter) => this.register(adapter))
  }

  register(adapter: ProviderAdapter): void {
    if (this.adapters.has(adapter.id)) {
      throw new Error(`Provider adapter already registered: ${adapter.id}`)
    }
    this.adapters.set(adapter.id, adapter)
  }

  get(id: string): ProviderAdapter {
    const adapter = this.adapters.get(id)
    if (!adapter) throw new Error(`Unknown provider adapter: ${id}`)
    return adapter
  }

  has(id: string): boolean {
    return this.adapters.has(id)
  }

  list(): readonly ProviderAdapter[] {
    return [...this.adapters.values()]
  }
}
