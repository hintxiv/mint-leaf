import { notFound } from 'next/navigation'
import { RenderHarness } from './RenderHarness'

export const dynamic = 'force-dynamic'

export default function RenderHarnessPage({ searchParams }: { searchParams: { fixture?: string } }) {
    if (process.env.RENDER_TEST_HARNESS !== 'true') notFound()
    return <RenderHarness fixtureName={searchParams.fixture ?? 'ordinary'} />
}
