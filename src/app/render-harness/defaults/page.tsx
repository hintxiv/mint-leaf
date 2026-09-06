import { notFound } from 'next/navigation'
import { Providers } from '@/components/Providers'
import { DefaultsHarness } from '../DefaultsHarness'

export const dynamic = 'force-dynamic'

export default function DefaultsHarnessPage() {
    if (process.env.RENDER_TEST_HARNESS !== 'true') notFound()
    return <Providers><DefaultsHarness /></Providers>
}
