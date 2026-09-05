import { describe, expect, it } from 'vitest'
import { normalizeRowCount, partitionRows, rotationGroupStarts } from './rotationRows'
import { Action } from './types'

const actions = (types: Action['type'][]): Action[] => types.map((type, index) => ({
    type, id: String(index), instanceId: String(index), name: String(index), imageSrc: '',
}))

describe('rotation rows', () => {
    it('allows breaks only before subsequent GCDs, including leading and trailing weaves', () => {
        expect(rotationGroupStarts(actions(['ogcd', 'gcd', 'ogcd', 'ogcd', 'gcd', 'ogcd', 'gcd', 'ogcd'])))
            .toEqual([0, 4, 6])
        expect(rotationGroupStarts(actions(['ogcd', 'ogcd']))).toEqual([0])
        expect(rotationGroupStarts([])).toEqual([0])
    })

    it('normalizes invalid and excessive counts without creating empty rows', () => {
        expect([NaN, Infinity, -2, 0, 1, 2.5, 10].map(value => normalizeRowCount(value, 3)))
            .toEqual([1, 1, 1, 1, 1, 2, 3])
    })

    it('balances width instead of group count and uses earlier boundaries for ties', () => {
        const widths = [300, 100, 100, 100]
        expect(partitionRows(4, 2, (start, end) => widths.slice(start, end).reduce((sum, width) => sum + width, 0)))
            .toEqual([{ start: 0, end: 1 }, { start: 1, end: 4 }])
        expect(partitionRows(5, 2, (start, end) => (end - start) * 100))
            .toEqual([{ start: 0, end: 2 }, { start: 2, end: 5 }])
    })

    it('matches exhaustive partitions for variable candidate footprints', () => {
        const groupCount = 7
        const rowCount = 3
        const sizes = [410, 120, 310, 260, 100, 510, 180]
        const width = (start: number, end: number) => sizes.slice(start, end).reduce((sum, size) => sum + size, 0)
            + (start === 0 ? 390 : 0) + (end % 2 ? 70 : 0)
        const target = width(0, groupCount) / rowCount
        const candidates: Array<{ ends: number[]; widest: number; deviation: number }> = []
        for (let first = 1; first < groupCount - 1; first++) {
            for (let second = first + 1; second < groupCount; second++) {
                const widths = [width(0, first), width(first, second), width(second, groupCount)]
                candidates.push({ ends: [first, second, groupCount], widest: Math.max(...widths), deviation: widths.reduce((sum, value) => sum + (value - target) ** 2, 0) })
            }
        }
        candidates.sort((a, b) => a.widest - b.widest || a.deviation - b.deviation || a.ends[0] - b.ends[0] || a.ends[1] - b.ends[1])
        expect(partitionRows(groupCount, rowCount, width).map(row => row.end)).toEqual(candidates[0].ends)
    })
})
