import { deleteModel, updateModel } from '@/lib/model-registry.server'
import type { ModelInput } from '@/lib/model-registry-types'

export async function PATCH(request: Request, context: RouteContext<'/admin/api/models/[id]'>) {
  try {
    const { id } = await context.params
    return Response.json({ model: updateModel(id, await request.json() as ModelInput) })
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : '模型更新失败。' }, { status: 400 })
  }
}

export async function DELETE(_request: Request, context: RouteContext<'/admin/api/models/[id]'>) {
  try {
    const { id } = await context.params
    deleteModel(id)
    return new Response(null, { status: 204 })
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : '模型删除失败。' }, { status: 400 })
  }
}
