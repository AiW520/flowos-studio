import { getAdminRegistry } from '@/lib/model-registry.server'

export const dynamic = 'force-dynamic'

export async function GET() {
  return Response.json(getAdminRegistry(), { headers: { 'Cache-Control': 'no-store' } })
}
