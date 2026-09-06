import { describe, expect, it, vi } from 'vitest'
vi.mock('@/components/Canvas/styles', () => ({ styles: { colors: { background: '#121213' } } }))
const { getColor, loadRenderImages } = vi.hoisted(() => ({
    getColor: vi.fn(() => [40, 8, 8]),
    loadRenderImages: vi.fn(async (sources: string[]) => new Map(sources.map(source => [source, {}]))),
}))
vi.mock('colorthief', () => ({ default: class { getColor = getColor } }))
vi.mock('./iconImages', () => ({ loadRenderImages }))
import { automaticBuffColor, contrastRatio, FALLBACK_BUFF_COLOR, readableBuffColor, resolveBuffColors } from './buffColors'

describe('icon-derived buff colours', () => {
    it.each(['#280808', '#081828', '#182808', '#000000', '#121213'])('brightens %s to at least 3:1 contrast', color => {
        expect(contrastRatio(readableBuffColor(color), '#121213')).toBeGreaterThanOrEqual(3)
    })
    it('preserves readable colours and the hue of a dark red', () => {
        expect(readableBuffColor('#f0c674')).toBe('#f0c674')
        const adjusted = readableBuffColor('#280808')
        expect(adjusted.slice(3, 5)).toBe(adjusted.slice(5, 7))
        expect(parseInt(adjusted.slice(1, 3), 16)).toBeGreaterThan(parseInt(adjusted.slice(3, 5), 16))
    })
    it('shares extraction across simultaneous requests for the same icon', async () => {
        const before = getColor.mock.calls.length
        const results = await Promise.all([automaticBuffColor('/red.png'), automaticBuffColor('/red.png')])
        expect(results[0]).toBe(results[1])
        expect(getColor.mock.calls.length - before).toBe(1)
    })
    it('falls back on failure and permits a later retry', async () => {
        loadRenderImages.mockRejectedValueOnce(new Error('Unavailable'))
        expect(await automaticBuffColor('/retry.png')).toBe(FALLBACK_BUFF_COLOR)
        expect(await automaticBuffColor('/retry.png')).not.toBe(FALLBACK_BUFF_COLOR)
        expect(await automaticBuffColor('')).toBe(FALLBACK_BUFF_COLOR)
    })
    it('resolves only automatic enabled statuses without changing source actions', async () => {
        const statuses = ['auto', '#123456'].map((color, i) => ({ id: String(i), name: 'Buff', imageSrc: '/red.png', color, duration: 20, applicationDelay: 0 }))
        const actions = [{ id: '1', instanceId: '1', type: 'gcd' as const, name: 'Action', imageSrc: '', statusesApplied: [...statuses, { ...statuses[0], enabled: false }] }]
        const resolved = await resolveBuffColors(actions)
        expect(resolved[0].statusesApplied![0].color).not.toBe('auto')
        expect(resolved[0].statusesApplied![1].color).toBe('#123456')
        expect(resolved[0].statusesApplied![2].color).toBe('auto')
        expect(actions[0].statusesApplied[0].color).toBe('auto')
    })
})
