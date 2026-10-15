import { StudioScreen } from '@/components/screens/studio-screen'

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return <StudioScreen projectId={id} />
}
