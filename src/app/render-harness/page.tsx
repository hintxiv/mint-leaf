import { notFound } from 'next/navigation'
import { Providers } from '@/components/Providers'
import { RenderHarness } from './RenderHarness'

export const dynamic = 'force-dynamic'

export default function RenderHarnessPage({ searchParams }: { searchParams: { fixture?: string } }) {
    if (process.env.RENDER_TEST_HARNESS !== 'true') notFound()
    return (
        <Providers>
            <RenderHarness fixtureName={searchParams.fixture ?? 'ordinary'} />
        </Providers>
    )
}
