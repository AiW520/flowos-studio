import { createProvider } from '@/lib/model-registry.server'
import type { ProviderInput } from '@/lib/model-registry-types'

export async function POST(request: Request) {
  try {
    const provider = createProvider(await request.json() as ProviderInput)
    return Response.json({ provider }, { status: 201 })
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : '供应商创建失败。' }, { status: 400 })
  }
}
