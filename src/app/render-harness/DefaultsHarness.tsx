'use client'

import { useState } from 'react'
import { catalogs } from '@/data/actionCatalog'
import { dataActionToDefaultAction } from '@/lib/actionDefaults'
import { SequenceDetail } from '@/components/Editor/SequenceDetail'
import { jobs } from '@/data/jobs'
import { Canvas } from '@/components/Canvas/Canvas'

// Synthetic nonzero cast fixture, accessible only through the gated render-harness route.
export const DefaultsHarness = () => {
    const [action, setAction] = useState(() => {
        const definition = { id: 999999, names: { en: 'Synthetic spell', ja: 'テスト魔法' }, kind: 'gcd' as const,
            baseCastTimeMs: 1800, baseGcdRecastMs: 2500, speedCategory: 'spell' as const,
            statusCoverage: 'verified' as const, statuses: [], sourceIds: [], unresolved: [] }
        catalogs.MCH.actions.push(definition)
        try {
            return dataActionToDefaultAction({ id: '999999', name: 'Synthetic spell', icon: new URL('https://v2.xivapi.com/api/asset/test.png') }, 'MCH')
        } finally { catalogs.MCH.actions.pop() }
    })
    return <div style={{ display: 'flex', height: 800 }}>
        <div style={{ width: 300, padding: 12 }}>
            <SequenceDetail job={jobs.MCH} action={action} list="rotation" index={0} onChange={(_, __, next) => setAction(next)} />
        </div>
        <Canvas rotation={[action]} prepullRotation={[]} title="Synthetic cast defaults" jobName="Machinist" jobIcon="/job-icons/mch.svg" level={100} expansion="Fixture" patch="Fixture" useBalanceLogo={false} />
    </div>
}
