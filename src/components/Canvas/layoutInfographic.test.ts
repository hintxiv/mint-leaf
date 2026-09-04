import { beforeAll, describe, expect, it, vi } from 'vitest'
import { TextMeasurer } from './textLayout'
import { LinePrimitive } from './types'

vi.mock('../../lib/fonts', () => ({
    roboto: { style: { fontFamily: 'Roboto' } },
    kumbh: { style: { fontFamily: 'Kumbh Sans' } },
}))

const measurer: TextMeasurer = {
    measure(text, font) {
        const size = Number.parseFloat(font.match(/([\d.]+)px/)?.[1] ?? '16')
        const width = Array.from(text).reduce((sum, character) => sum + (/[MW]/.test(character) ? 0.8 : /[il]/.test(character) ? 0.25 : 0.52) * size, 0)
        return {
            width,
            actualBoundingBoxAscent: size * 0.76,
            actualBoundingBoxDescent: size * 0.2,
            actualBoundingBoxLeft: 0,
            actualBoundingBoxRight: width,
        }
    },
}

const baseInput = {
    prepullRotation: [],
    rotation: [],
    title: 'Title',
    jobName: 'Dark Knight',
    jobIcon: '/job-icons/drk.svg',
    level: 100,
    expansion: 'Dawntrail',
    patch: '7.4',
    useBalanceLogo: false,
}

describe('infographic layout plan', () => {
    let layoutInfographic: typeof import('./layoutInfographic').layoutInfographic
    let auditRenderPlan: typeof import('./auditRenderPlan').auditRenderPlan

    beforeAll(async () => {
        layoutInfographic = (await import('./layoutInfographic')).layoutInfographic
        auditRenderPlan = (await import('./auditRenderPlan')).auditRenderPlan
    })

    it('retains minimum dimensions and expands for lossless headers', () => {
        const ordinary = layoutInfographic(baseInput, measurer)
        const longTitle = `Lossless ${'wide header '.repeat(60)}`
        const longExpansion = `Expansion ${'without truncation '.repeat(20)}`
        const longPatch = `Patch ${'metadata '.repeat(20)}`
        const expanded = layoutInfographic({
            ...baseInput,
            title: longTitle,
            expansion: longExpansion,
            patch: longPatch,
        }, measurer)
        expect(ordinary.width).toBeGreaterThanOrEqual(5000)
        expect(ordinary.height).toBeGreaterThanOrEqual(2200)
        expect(expanded.width).toBeGreaterThan(ordinary.width)
        expect(expanded.textBlocks.find(block => block.id === 'header-title')?.lines[0].text).toBe(longTitle.trim())
        expect(expanded.textBlocks.find(block => block.id === 'header-metadata')?.lines[0].text)
            .toBe(`${longExpansion} Patch ${longPatch}`.replace(/\s+/gu, ' ').trim())
    })

    it('keeps multiline GCD names and their counts in the same owner group', () => {
        const plan = layoutInfographic({
            ...baseInput,
            rotation: [{ id: 'g1', type: 'gcd', name: 'A Very Long Global Cooldown Name Which Wraps', imageSrc: '/favicon.ico' }],
        }, measurer)
        const name = plan.textBlocks.find(block => block.id === 'rotation-0-name')
        const count = plan.textBlocks.find(block => block.id === 'rotation-0-count')
        expect(name?.lines.length).toBeGreaterThan(1)
        expect(count?.ownerId).toBe(name?.ownerId)
        expect(count!.bounds.y).toBeGreaterThan(name!.bounds.y + name!.bounds.height)
    })

    it('adds outward lanes and connectors for consecutive oGCD labels', () => {
        const plan = layoutInfographic({
            ...baseInput,
            rotation: [
                { id: 'o1', type: 'ogcd', name: 'First weave with words', imageSrc: '/favicon.ico' },
                { id: 'o2', type: 'ogcd', name: 'Second weave with words', imageSrc: '/favicon.ico' },
                { id: 'o3', type: 'ogcd', name: 'Third weave with words', imageSrc: '/favicon.ico' },
            ],
        }, measurer)
        const leaders = plan.primitives.filter((primitive): primitive is LinePrimitive =>
            primitive.kind === 'line' && primitive.role === 'leader',
        )
        expect(leaders.length).toBeGreaterThan(0)
        expect(leaders.every(leader => leader.points.every(point => point.x === leader.points[0].x))).toBe(true)
        expect(leaders.some(leader => leader.fadeStart || leader.fadeEnd)).toBe(true)
        expect(plan.textBlocks.filter(block => block.role === 'action')).toHaveLength(3)
    })

    it('produces finite in-bounds primitives', () => {
        const plan = layoutInfographic({
            ...baseInput,
            prepullRotation: [
                { id: 'p1', type: 'ogcd', name: 'Grade 6 Gemdraught of Intelligence', imageSrc: '/favicon.ico', prepull: -2 },
                { id: 'p2', type: 'ogcd', name: 'Second prepull action', imageSrc: '/favicon.ico', prepull: -2 },
            ],
            rotation: [{ id: 'g1', type: 'gcd', name: 'First GCD', imageSrc: '/favicon.ico' }],
        }, measurer)
        expect(auditRenderPlan(plan).filter(item => item.code === 'invalid-measurement' || item.code === 'out-of-bounds')).toEqual([])
        expect(plan.primitives.filter(primitive =>
            primitive.kind === 'line'
            && primitive.role === 'leader'
            && primitive.ownerId?.startsWith('prepull-'),
        )).toEqual([])
        const prepullNames = plan.textBlocks.filter(block => block.role === 'action' && block.ownerId?.startsWith('prepull-'))
        const prepullTimes = plan.textBlocks.filter(block => block.role === 'time')
        expect(Math.max(...prepullTimes.map(block => block.bounds.y + block.bounds.height)))
            .toBeLessThan(Math.min(...prepullNames.map(block => block.bounds.y)))
    })

    it('renders buffs applied before pull from their prepull timestamp', () => {
        const status = {
            id: 'prepull-buff',
            name: 'Prepull Buff',
            imageSrc: '/favicon.ico',
            color: '#74d6b4',
            applicationDelay: 1,
            duration: 20,
        }
        const plan = layoutInfographic({
            ...baseInput,
            prepullRotation: [{
                id: 'p1',
                type: 'ogcd',
                name: 'Prepull Buff Action',
                imageSrc: '/favicon.ico',
                prepull: -2,
                statusApplied: status,
            }],
            rotation: [{ id: 'g1', type: 'gcd', name: 'First GCD', imageSrc: '/favicon.ico' }],
        }, measurer)
        const prepullIcon = plan.primitives.find(primitive => primitive.id === 'prepull-0-image-0')
        const pullLine = plan.primitives.find((primitive): primitive is LinePrimitive => primitive.id === 'pull-line')
        const buffStart = plan.primitives.find((primitive): primitive is LinePrimitive => primitive.id === 'buff-0-start')

        expect(prepullIcon).toBeDefined()
        expect(pullLine).toBeDefined()
        expect(buffStart).toBeDefined()
        expect(buffStart!.points[0].x).toBeCloseTo((prepullIcon!.bounds.x + pullLine!.points[0].x) / 2)
        expect(plan.primitives.some(primitive => primitive.kind === 'image' && primitive.role === 'buff-icon')).toBe(true)
        expect(auditRenderPlan(plan).filter(item => item.code === 'invalid-measurement' || item.code === 'out-of-bounds')).toEqual([])
    })

    it('renders buff lines for prepull-only rotations', () => {
        const plan = layoutInfographic({
            ...baseInput,
            prepullRotation: [{
                id: 'p1',
                type: 'ogcd',
                name: 'Prepull Buff Action',
                imageSrc: '/favicon.ico',
                prepull: -5,
                statusApplied: {
                    id: 'prepull-only-buff',
                    name: 'Prepull-only Buff',
                    imageSrc: '/favicon.ico',
                    color: '#74d6b4',
                    applicationDelay: 0,
                    duration: 20,
                },
            }],
        }, measurer)

        expect(plan.primitives.some(primitive => primitive.kind === 'line' && primitive.role === 'buff')).toBe(true)
        expect(auditRenderPlan(plan).filter(item => item.code === 'invalid-measurement' || item.code === 'out-of-bounds')).toEqual([])
    })
})
