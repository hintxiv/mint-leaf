import { beforeAll, describe, expect, it, vi } from 'vitest'
import { TextMeasurer } from './textLayout'
import { Action, ImagePrimitive, LinePrimitive, RenderPlan } from './types'
import { calculateIconPositions } from './calculateIconPositions'
import { calculateTimeline } from './calculateBuffLinePositions'

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

    const action = (id: string, type: Action['type'] = 'gcd', extra: Partial<Action> = {}): Action => ({
        id, instanceId: id, type, name: `Action ${id}`, imageSrc: '/favicon.ico', ...extra,
    } as Action)
    const actionIcons = (plan: RenderPlan) => plan.primitives.filter((primitive): primitive is ImagePrimitive =>
        primitive.kind === 'image' && primitive.role === 'action-icon' && Boolean(primitive.ownerId?.startsWith('rotation-')),
    )

    it('keeps all GCD decorations and weaves on their row and retains global numbering', () => {
        const rotation = [
            action('lead', 'ogcd'),
            action('g1', 'gcd', { name: 'An Extremely Long Multiline Global Cooldown Name' }),
            action('w1', 'ogcd'), action('w2', 'ogcd'), action('clip', 'ogcd'),
            action('g2', 'gcd', { castTime: 2.5 }), action('late', 'ogcd', { lateWeave: true }),
            action('g3'),
        ]
        const input = { ...baseInput, rotation, prepullRotation: [action('prep', 'ogcd', { prepull: -2 })] }
        const single = layoutInfographic(input, measurer)
        const plan = layoutInfographic({ ...input, rowCount: 3, rowSpacing: 0 }, measurer)
        const icons = actionIcons(plan)
        const original = actionIcons(single)
        expect(icons).toHaveLength(rotation.length)
        expect(new Set(plan.primitives.map(primitive => primitive.id)).size).toBe(plan.primitives.length)
        expect(plan.primitives.filter(primitive => primitive.kind === 'image' && primitive.role === 'timeline')).toHaveLength(
            single.primitives.filter(primitive => primitive.kind === 'image' && primitive.role === 'timeline').length,
        )
        const shift = (index: number) => icons[index].bounds.y - original[index].bounds.y
        expect([0, 1, 2, 3, 4].map(shift)).toEqual(Array(5).fill(shift(1)))
        expect(shift(5)).toBe(shift(6))
        expect(shift(5)).toBeGreaterThan(shift(1))
        expect(shift(7)).toBeGreaterThan(shift(5))
        expect(plan.textBlocks.filter(block => block.role === 'count').map(block => block.lines[0].text)).toEqual(['1', '2', '3'])
        expect(plan.primitives.filter(primitive => primitive.id === 'pull-line')).toHaveLength(1)
        expect(auditRenderPlan(plan)).toEqual([])
    })

    it('adds exactly the requested empty gap without changing row contents or widths', () => {
        const input = { ...baseInput, rotation: [action('g1'), action('g2'), action('g3')], rowCount: 3 }
        const zero = layoutInfographic({ ...input, rowSpacing: 0 }, measurer)
        const custom = layoutInfographic({ ...input, rowSpacing: 400 }, measurer)
        const defaults = layoutInfographic(input, measurer)
        expect(custom.width).toBe(zero.width)
        expect(custom.height - zero.height).toBe(800)
        expect(defaults.height - zero.height).toBe(256)
        actionIcons(custom).forEach((icon, index) => expect(icon.bounds.y - actionIcons(zero)[index].bounds.y).toBe(index * 400))
        expect(auditRenderPlan(zero)).toEqual([])
    })

    it('carries buffs across rows, repeats fitting labels, and keeps true start/end markers', () => {
        const status = { id: 'buff', name: 'Buff', imageSrc: '/favicon.ico', color: '#74d6b4', applicationDelay: 0, duration: 100 }
        const plan = layoutInfographic({
            ...baseInput,
            rotation: [action('g1', 'gcd', { statusApplied: status }), ...Array.from({ length: 5 }, (_, index) => action(`g${index + 2}`))],
            rowCount: 3,
        }, measurer)
        const ids = plan.primitives.map(primitive => primitive.id)
        expect(ids.filter(id => id.startsWith('buff-') && id.endsWith('-start'))).toHaveLength(1)
        expect(ids.filter(id => id.endsWith('-continue-before'))).toHaveLength(2)
        expect(ids.filter(id => id.startsWith('buff-') && id.endsWith('-arrow'))).toHaveLength(2)
        expect(ids.filter(id => id.startsWith('buff-') && id.endsWith('-end'))).toHaveLength(1)
        expect(plan.textBlocks.filter(block => block.role === 'buff')).toHaveLength(3)
        expect(auditRenderPlan(plan)).toEqual([])
    })

    it('does not restart delayed buffs on earlier rows or leave a segment at an exact boundary', () => {
        const status = { id: 'buff', name: 'Buff', imageSrc: '/favicon.ico', color: '#74d6b4', applicationDelay: 5, duration: 0.1 }
        const plan = layoutInfographic({
            ...baseInput, rowCount: 4,
            rotation: [action('g1', 'gcd', { statusApplied: status }), action('g2'), action('g3'), action('g4')],
        }, measurer)
        const buffs = plan.primitives.filter(primitive => primitive.ownerId?.startsWith('buff-'))
        expect(buffs.length).toBeGreaterThan(0)
        expect(buffs.every(primitive => primitive.ownerId === 'buff-0-row-2')).toBe(true)
        const boundaryRotation = [action('g1'), action('g2'), action('g3')]
        const positioned = calculateIconPositions(boundaryRotation)
        const timeline = calculateTimeline([], positioned.icons, positioned.width, 0)
        const boundary = positioned.icons.filter(icon => icon.type === 'gcd')[1].x
        const before = timeline.filter(point => point.x <= boundary).at(-1)!
        const after = timeline.find(point => point.x > boundary)!
        const beforeTime = before.time + (before.addedWeaveTime ?? 0)
        const afterTime = after.time + (after.addedWeaveTime ?? 0)
        const duration = beforeTime + (afterTime - beforeTime) * (boundary - before.x) / (after.x - before.x)
        boundaryRotation[0].statusApplied = { ...status, applicationDelay: 0, duration }
        const boundaryPlan = layoutInfographic({
            ...baseInput, rowCount: 3,
            rotation: boundaryRotation,
        }, measurer)
        expect(boundaryPlan.primitives.filter(primitive => primitive.ownerId?.startsWith('buff-')).every(primitive => primitive.ownerId === 'buff-0-row-0')).toBe(true)
        expect(auditRenderPlan(plan)).toEqual([])
    })

    it.each([8, 30])('keeps nested buff lanes consistent without crossing connectors (inner duration %s)', (innerDuration) => {
        const status = { id: 'outer', name: 'Outer Buff', imageSrc: '/favicon.ico', color: '#74d6b4', applicationDelay: 0, duration: 30 }
        const input = { ...baseInput, rotation: [
            action('g1', 'gcd', { statusApplied: status }),
            action('g2', 'gcd', { statusApplied: { ...status, id: 'inner', name: 'Inner Buff', duration: innerDuration } }),
            action('g3'), action('g4'), action('g5'), action('g6'),
        ] }
        const single = layoutInfographic(input, measurer)
        const plan = layoutInfographic({ ...input, rowCount: 2 }, measurer)
        const horizontalLines = (source: RenderPlan) => source.primitives.filter((primitive): primitive is LinePrimitive =>
            primitive.kind === 'line' && primitive.role === 'buff' && primitive.points.length === 2 && primitive.points[0].y === primitive.points[1].y,
        )
        const laneY = (source: RenderPlan, ownerId: string) => horizontalLines(source).find(primitive => primitive.ownerId === ownerId)!.points[0].y
        expect(laneY(single, 'buff-0')).toBeGreaterThan(laneY(single, 'buff-1'))
        for (const row of [0, 3]) {
            expect(laneY(plan, `buff-0-row-${row}`)).toBeGreaterThan(laneY(plan, `buff-1-row-${row}`))
        }
        const starts = plan.primitives.filter((primitive): primitive is LinePrimitive => primitive.kind === 'line' && primitive.role === 'buff' && primitive.id.endsWith('-start'))
        starts.forEach(start => horizontalLines(plan).filter(line => line.ownerId !== start.ownerId).forEach(line => {
            const x = start.points[0].x
            const y = line.points[0].y
            const crosses = x > line.points[0].x && x < line.points[1].x
                && y > Math.min(...start.points.map(point => point.y)) && y < Math.max(...start.points.map(point => point.y))
            expect(crosses).toBe(false)
        }))
        expect(auditRenderPlan(plan)).toEqual([])
    })

    it('limits rows to available GCD groups and preserves single-row edge cases', () => {
        for (const input of [baseInput, { ...baseInput, prepullRotation: [action('p', 'ogcd', { prepull: -2 })] }, { ...baseInput, rotation: [action('o', 'ogcd')] }]) {
            expect(layoutInfographic({ ...input, rowCount: 10 }, measurer)).toEqual(layoutInfographic(input, measurer))
        }
        const plan = layoutInfographic({ ...baseInput, rotation: [action('g1'), action('g2')], rowCount: 10 }, measurer)
        expect(new Set(actionIcons(plan).map(icon => icon.bounds.y)).size).toBe(2)
        expect(auditRenderPlan(plan)).toEqual([])
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
            rotation: [{ id: 'g1', instanceId: 'instance-g1', type: 'gcd', name: 'A Very Long Global Cooldown Name Which Wraps', imageSrc: '/favicon.ico' }],
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
                { id: 'o1', instanceId: 'instance-o1', type: 'ogcd', name: 'First weave with words', imageSrc: '/favicon.ico' },
                { id: 'o2', instanceId: 'instance-o2', type: 'ogcd', name: 'Second weave with words', imageSrc: '/favicon.ico' },
                { id: 'o3', instanceId: 'instance-o3', type: 'ogcd', name: 'Third weave with words', imageSrc: '/favicon.ico' },
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
                { id: 'p1', instanceId: 'instance-p1', type: 'ogcd', name: 'Grade 6 Gemdraught of Intelligence', imageSrc: '/favicon.ico', prepull: -2 },
                { id: 'p2', instanceId: 'instance-p2', type: 'ogcd', name: 'Second prepull action', imageSrc: '/favicon.ico', prepull: -2 },
            ],
            rotation: [{ id: 'g1', instanceId: 'instance-g1', type: 'gcd', name: 'First GCD', imageSrc: '/favicon.ico' }],
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
                instanceId: 'instance-p1-buff',
                type: 'ogcd',
                name: 'Prepull Buff Action',
                imageSrc: '/favicon.ico',
                prepull: -2,
                statusApplied: status,
            }],
            rotation: [{ id: 'g1', instanceId: 'instance-g1', type: 'gcd', name: 'First GCD', imageSrc: '/favicon.ico' }],
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
                instanceId: 'instance-p1-prepull-only',
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
