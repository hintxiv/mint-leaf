'use client'

import { useCallback, useState } from 'react'
import { Canvas, CanvasRenderState } from '@/components/Canvas/Canvas'
import { Action, Status } from '@/components/Canvas/types'

const imageSrc = '/favicon.ico'
const buff: Status = {
    id: 'test-buff',
    name: 'Grade 6 Gemdraught of Intelligence',
    imageSrc: '/Balance_Logo-02.png',
    color: '#74d6b4',
    applicationDelay: 0.6,
    duration: 20,
}

const gcd = (id: string, name: string, extra: Partial<Action> = {}): Action => ({
    id,
    type: 'gcd',
    name,
    imageSrc,
    recastTime: 2.5,
    ...extra,
} as Action)

const ogcd = (id: string, name: string, extra: Partial<Action> = {}): Action => ({
    id,
    type: 'ogcd',
    name,
    imageSrc,
    ...extra,
} as Action)

const fixtures: Record<string, { prepullRotation: Action[]; rotation: Action[]; title?: string; expansion?: string; patch?: string; logo?: boolean }> = {
    empty: { prepullRotation: [], rotation: [] },
    ordinary: {
        prepullRotation: [ogcd('p1', 'Grade 6 Gemdraught of Intelligence', { prepull: -2 })],
        rotation: [gcd('g1', 'Hard Slash'), ogcd('o1', 'Edge of Shadow'), gcd('g2', 'Syphon Strike', { statusApplied: buff })],
    },
    reported: {
        prepullRotation: [
            ogcd('p1', 'Grade 6 Gemdraught of Intelligence', { prepull: -2 }),
            ogcd('p2', 'Extremely Long Prepull Ability With Several Words', { prepull: -2 }),
        ],
        rotation: [gcd('g1', 'Hard Slash')],
    },
    dense: {
        prepullRotation: [gcd('p0', 'Prepull Spell', { prepull: -4 }), ogcd('p1', 'First Preparation', { prepull: -2 }), ogcd('p2', 'Second Preparation', { prepull: -2 })],
        rotation: [
            gcd('g1', 'An Extremely Long Multiline Global Cooldown Name', { statusApplied: buff }),
            ogcd('o1', 'Wide Neighboring Weave Label'), ogcd('o2', 'Second Weave'), ogcd('o3', 'Hard Clip'),
            gcd('g2', 'Second Global', { castTime: 2.5 }), ogcd('o4', 'Late Weave', { lateWeave: true }),
            gcd('g3', 'Third Global', { statusApplied: { ...buff, id: 'buff-2', name: 'Short Buff', duration: 1 } }),
        ],
        logo: true,
    },
    'long-header': {
        prepullRotation: [],
        rotation: [gcd('g1', 'First Action'), gcd('g2', 'Last Action')],
        title: 'A lossless title that is intentionally extremely long and must grow the infographic canvas without being truncated or colliding',
        expansion: 'An equally lossless expansion name with abundant descriptive text',
        patch: 'A patch value that is also intentionally unlimited',
        logo: true,
    },
}

export const RenderHarness = ({ fixtureName }: { fixtureName: string }) => {
    const fixture = fixtures[fixtureName] ?? fixtures.ordinary
    const [state, setState] = useState<CanvasRenderState>({ status: 'loading', violations: [] })
    const onRenderStateChange = useCallback((next: CanvasRenderState) => setState(next), [])

    return (
        <main data-testid="render-harness" data-ready={state.status === 'ready'} data-fixture={fixtureName}>
            <Canvas
                screenWidth={1440}
                prepullRotation={fixture.prepullRotation}
                rotation={fixture.rotation}
                title={fixture.title ?? 'Measured Rotation'}
                jobName="Dark Knight"
                jobIcon="/job-icons/drk.svg"
                level={100}
                expansion={fixture.expansion ?? 'Dawntrail'}
                patch={fixture.patch ?? '7.4'}
                useBalanceLogo={fixture.logo ?? false}
                onRenderStateChange={onRenderStateChange}
            />
            <pre data-testid="layout-diagnostics">{JSON.stringify({ status: state.status, violations: state.violations, error: state.status === 'error' ? state.error : undefined })}</pre>
        </main>
    )
}
