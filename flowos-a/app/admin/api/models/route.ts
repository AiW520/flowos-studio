import { createModel } from '@/lib/model-registry.server'
import type { ModelInput } from '@/lib/model-registry-types'

export async function POST(request: Request) {
  try {
    const model = createModel(await request.json() as ModelInput)
    return Response.json({ model }, { status: 201 })
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : '模型创建失败。' }, { status: 400 })
  }
}
