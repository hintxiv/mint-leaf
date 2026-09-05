import { Action } from './types'

// Leading oGCDs belong to the first GCD. Only subsequent GCDs can start rows.
export const rotationGroupStarts = (actions: Action[]): number[] => {
    const starts = [0]
    let seenGcd = false
    actions.forEach((action, index) => {
        if (action.type !== 'gcd') return
        if (seenGcd) starts.push(index)
        seenGcd = true
    })
    return starts
}

export const normalizeRowCount = (value: number, maximum: number): number =>
    Number.isFinite(value) ? Math.min(Math.max(1, maximum), Math.max(1, Math.floor(value))) : 1

// Ordered linear partition: minimize the widest row, then squared deviation
// from the ideal width. Ascending boundaries give deterministic earlier ties.
export const partitionRows = (
    groupCount: number,
    requestedRows: number,
    measureWidth: (start: number, end: number) => number,
): Array<{ start: number; end: number }> => {
    const count = normalizeRowCount(requestedRows, groupCount)
    if (count === 1) return [{ start: 0, end: groupCount }]
    if (count === groupCount) return Array.from({ length: count }, (_, start) => ({ start, end: start + 1 }))
    const widths = new Map<string, number>()
    const width = (start: number, end: number) => {
        const key = `${start}:${end}`
        if (!widths.has(key)) widths.set(key, measureWidth(start, end))
        return widths.get(key)!
    }
    const widest = Array.from({ length: count + 1 }, () => Array(groupCount + 1).fill(Infinity) as number[])
    widest[0][0] = 0
    for (let rows = 1; rows <= count; rows++) {
        for (let end = rows; end <= groupCount; end++) {
            for (let start = rows - 1; start < end; start++) {
                if (!Number.isFinite(widest[rows - 1][start])) continue
                widest[rows][end] = Math.min(widest[rows][end], Math.max(widest[rows - 1][start], width(start, end)))
            }
        }
    }
    const limit = widest[count][groupCount]
    const target = width(0, groupCount) / count
    const costs = Array.from({ length: count + 1 }, () => Array(groupCount + 1).fill(Infinity) as number[])
    const paths = Array.from({ length: count + 1 }, () => Array.from({ length: groupCount + 1 }, () => [] as number[]))
    costs[0][0] = 0
    for (let rows = 1; rows <= count; rows++) {
        for (let end = rows; end <= groupCount; end++) {
            for (let start = rows - 1; start < end; start++) {
                if (!Number.isFinite(costs[rows - 1][start]) || width(start, end) > limit) continue
                const cost = costs[rows - 1][start] + (width(start, end) - target) ** 2
                const path = [...paths[rows - 1][start], end]
                const previous = paths[rows][end]
                const firstDifference = path.findIndex((boundary, index) => boundary !== previous[index])
                if (cost < costs[rows][end] || (cost === costs[rows][end] && firstDifference >= 0 && path[firstDifference] < previous[firstDifference])) {
                    costs[rows][end] = cost
                    paths[rows][end] = path
                }
            }
        }
    }
    return paths[count][groupCount].map((end, index, ends) => ({ start: index === 0 ? 0 : ends[index - 1], end }))
}
