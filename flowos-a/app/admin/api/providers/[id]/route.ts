import { deleteProvider, updateProvider } from '@/lib/model-registry.server'
import type { ProviderInput } from '@/lib/model-registry-types'

export async function PATCH(request: Request, context: RouteContext<'/admin/api/providers/[id]'>) {
  try {
    const { id } = await context.params
    return Response.json({ provider: updateProvider(id, await request.json() as ProviderInput) })
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : '供应商更新失败。' }, { status: 400 })
  }
}

export async function DELETE(_request: Request, context: RouteContext<'/admin/api/providers/[id]'>) {
  try {
    const { id } = await context.params
    deleteProvider(id)
    return new Response(null, { status: 204 })
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : '供应商删除失败。' }, { status: 400 })
  }
}
