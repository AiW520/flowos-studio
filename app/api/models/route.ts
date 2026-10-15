import { getModelCatalog, syncStaleModelProviders } from '@/lib/model-registry.server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  await syncStaleModelProviders()
  return Response.json(getModelCatalog(), {
    headers: { 'Cache-Control': 'no-store' },
  })
}
