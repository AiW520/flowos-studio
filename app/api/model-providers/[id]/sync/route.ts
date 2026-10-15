import { syncModelProvider } from '@/lib/model-registry.server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const origin = request.headers.get('origin')
  if (origin && origin !== new URL(request.url).origin) {
    return Response.json({ error: '请求来源无效。' }, { status: 403 })
  }
  try {
    const { id } = await context.params
    return Response.json({ provider: await syncModelProvider(id) })
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : '同步模型失败。' }, { status: 400 })
  }
}
