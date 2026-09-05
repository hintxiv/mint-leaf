import { notFound } from 'next/navigation'
import { Providers } from '@/components/Providers'
import { RenderHarness } from './RenderHarness'

export const dynamic = 'force-dynamic'

export default function RenderHarnessPage({ searchParams }: { searchParams: { fixture?: string; rows?: string; spacing?: string; controls?: string } }) {
    if (process.env.RENDER_TEST_HARNESS !== 'true') notFound()
    return (
        <Providers>
            <RenderHarness
                fixtureName={searchParams.fixture ?? 'ordinary'}
                initialRowCount={Number(searchParams.rows) || 1}
                initialRowSpacing={searchParams.spacing === undefined ? null : Number(searchParams.spacing)}
                showControls={searchParams.controls === 'true'}
            />
        </Providers>
    )
}
