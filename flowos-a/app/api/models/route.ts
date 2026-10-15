import { getPublicModels } from '@/lib/model-registry.server'

export const dynamic = 'force-dynamic'

export async function GET() {
  return Response.json({ models: getPublicModels() }, { headers: { 'Cache-Control': 'no-store' } })
}
