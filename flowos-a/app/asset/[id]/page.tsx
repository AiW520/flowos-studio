import { AssetScreen } from '@/components/screens/asset-screen'

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return <AssetScreen assetId={id} />
}
