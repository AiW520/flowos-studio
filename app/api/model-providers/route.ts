import { createModelProvider, listModelProviders, syncModelProvider } from '@/lib/model-registry.server'
import type { CreateModelProviderInput } from '@/lib/model-registry-types'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function sameOrigin(request: Request): boolean {
  const origin = request.headers.get('origin')
  return !origin || origin === new URL(request.url).origin
}

export async function GET() {
  return Response.json({ providers: listModelProviders() }, { headers: { 'Cache-Control': 'no-store' } })
}

export async function POST(request: Request) {
  if (!sameOrigin(request)) return Response.json({ error: '请求来源无效。' }, { status: 403 })
  if (Number(request.headers.get('content-length') ?? 0) > 32_768) {
    return Response.json({ error: '请求内容过大。' }, { status: 413 })
  }
  try {
    const input = await request.json() as CreateModelProviderInput
    const provider = createModelProvider(input)
    const synced = await syncModelProvider(provider.id)
    return Response.json({ provider: synced }, { status: 201 })
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : '创建接入失败。' }, { status: 400 })
  }
}
