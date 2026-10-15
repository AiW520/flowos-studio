import { deleteModelProvider, updateModelProvider } from '@/lib/model-registry.server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function sameOrigin(request: Request): boolean {
  const origin = request.headers.get('origin')
  return !origin || origin === new URL(request.url).origin
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  if (!sameOrigin(request)) return Response.json({ error: '请求来源无效。' }, { status: 403 })
  try {
    const { id } = await context.params
    const patch = await request.json() as { enabled?: boolean }
    return Response.json({ provider: updateModelProvider(id, patch) })
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : '更新接入失败。' }, { status: 400 })
  }
}

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  if (!sameOrigin(request)) return Response.json({ error: '请求来源无效。' }, { status: 403 })
  try {
    const { id } = await context.params
    deleteModelProvider(id)
    return new Response(null, { status: 204 })
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : '移除接入失败。' }, { status: 400 })
  }
}
