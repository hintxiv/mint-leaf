import { Bounds, LayoutViolation, LinePrimitive, RenderPlan, RenderPrimitive, TextBlock } from './types'

const isFiniteBounds = (bounds: Bounds): boolean =>
    [bounds.x, bounds.y, bounds.width, bounds.height].every(Number.isFinite) && bounds.width >= 0 && bounds.height >= 0

const expand = (bounds: Bounds, amount: number): Bounds => ({
    x: bounds.x - amount,
    y: bounds.y - amount,
    width: bounds.width + amount * 2,
    height: bounds.height + amount * 2,
})

const intersects = (a: Bounds, b: Bounds): boolean =>
    a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y

const related = (a: RenderPrimitive, b: RenderPrimitive): boolean => {
    if (a.ownerId && a.ownerId === b.ownerId) return true
    return Boolean(
        a.collisionExemptions?.some(exemption => exemption.withId === b.id)
        || b.collisionExemptions?.some(exemption => exemption.withId === a.id),
    )
}

const orientation = (a: { x: number; y: number }, b: { x: number; y: number }, c: { x: number; y: number }) =>
    (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x)

const onSegment = (
    start: { x: number; y: number },
    point: { x: number; y: number },
    end: { x: number; y: number },
) => point.x >= Math.min(start.x, end.x)
    && point.x <= Math.max(start.x, end.x)
    && point.y >= Math.min(start.y, end.y)
    && point.y <= Math.max(start.y, end.y)

const segmentIntersects = (
    a: { x: number; y: number },
    b: { x: number; y: number },
    c: { x: number; y: number },
    d: { x: number; y: number },
): boolean => {
    const o1 = orientation(a, b, c)
    const o2 = orientation(a, b, d)
    const o3 = orientation(c, d, a)
    const o4 = orientation(c, d, b)
    if (Math.sign(o1) !== Math.sign(o2) && Math.sign(o3) !== Math.sign(o4)) return true
    if (o1 === 0 && onSegment(a, c, b)) return true
    if (o2 === 0 && onSegment(a, d, b)) return true
    if (o3 === 0 && onSegment(c, a, d)) return true
    if (o4 === 0 && onSegment(c, b, d)) return true
    return false
}

const lineSegments = (line: LinePrimitive) => line.points.slice(1).map((point, index) => [line.points[index], point] as const)

const pointInBounds = (point: { x: number; y: number }, bounds: Bounds): boolean =>
    point.x >= bounds.x && point.x <= bounds.x + bounds.width
    && point.y >= bounds.y && point.y <= bounds.y + bounds.height

const segmentIntersectsBounds = (
    start: { x: number; y: number },
    end: { x: number; y: number },
    bounds: Bounds,
): boolean => {
    if (pointInBounds(start, bounds) || pointInBounds(end, bounds)) return true
    const topLeft = { x: bounds.x, y: bounds.y }
    const topRight = { x: bounds.x + bounds.width, y: bounds.y }
    const bottomRight = { x: bounds.x + bounds.width, y: bounds.y + bounds.height }
    const bottomLeft = { x: bounds.x, y: bounds.y + bounds.height }
    return segmentIntersects(start, end, topLeft, topRight)
        || segmentIntersects(start, end, topRight, bottomRight)
        || segmentIntersects(start, end, bottomRight, bottomLeft)
        || segmentIntersects(start, end, bottomLeft, topLeft)
}

const textCollision = (text: TextBlock, other: RenderPrimitive): boolean => {
    const textBounds = expand(text.bounds, text.clearance)
    if (other.kind !== 'line') return intersects(textBounds, other.bounds)
    return lineSegments(other).some(([start, end]) =>
        segmentIntersectsBounds(start, end, expand(textBounds, other.width / 2)),
    )
}

export const auditRenderPlan = (plan: RenderPlan): LayoutViolation[] => {
    const violations: LayoutViolation[] = []
    if (!Number.isFinite(plan.width) || !Number.isFinite(plan.height) || plan.width <= 0 || plan.height <= 0) {
        violations.push({
            code: 'invalid-measurement',
            primitiveId: 'canvas',
            message: 'Canvas dimensions are missing or non-finite.',
        })
    }

    plan.primitives.forEach(primitive => {
        const measurementValues = primitive.kind === 'text'
            ? primitive.lines.flatMap(item => [item.x, item.y, item.width, item.ascent, item.descent])
            : primitive.kind === 'line'
                ? primitive.points.flatMap(point => [point.x, point.y])
                : []
        if (!isFiniteBounds(primitive.bounds) || measurementValues.some(value => !Number.isFinite(value))) {
            violations.push({
                code: 'invalid-measurement',
                primitiveId: primitive.id,
                message: `${primitive.id} contains a missing or non-finite measurement.`,
            })
            return
        }
        if (
            primitive.bounds.x < 0
            || primitive.bounds.y < 0
            || primitive.bounds.x + primitive.bounds.width > plan.width
            || primitive.bounds.y + primitive.bounds.height > plan.height
        ) {
            violations.push({
                code: 'out-of-bounds',
                primitiveId: primitive.id,
                message: `${primitive.id} falls outside the ${plan.width}×${plan.height} canvas.`,
            })
        }
    })

    const collisionTargets = plan.primitives.filter(primitive => primitive.kind !== 'shape')
    plan.textBlocks.forEach(text => {
        collisionTargets.forEach(other => {
            if (text.id === other.id || related(text, other)) return
            if (textCollision(text, other)) {
                violations.push({
                    code: 'collision',
                    primitiveId: text.id,
                    otherPrimitiveId: other.id,
                    message: `${text.id} does not have its required clearance from ${other.id}.`,
                })
            }
        })
    })

    const leaders = plan.primitives.filter((primitive): primitive is LinePrimitive => primitive.kind === 'line' && primitive.role === 'leader')
    const lines = plan.primitives.filter((primitive): primitive is LinePrimitive => primitive.kind === 'line')
    leaders.forEach(leader => {
        lines.forEach(other => {
            if (leader.id === other.id || related(leader, other)) return
            const crossing = lineSegments(leader).some(([a, b]) =>
                lineSegments(other).some(([c, d]) => segmentIntersects(a, b, c, d)),
            )
            if (crossing) {
                violations.push({
                    code: 'leader-crossing',
                    primitiveId: leader.id,
                    otherPrimitiveId: other.id,
                    message: `${leader.id} crosses ${other.id}.`,
                })
            }
        })

        plan.primitives.forEach(other => {
            if (other.kind === 'shape' || other.kind === 'line' || related(leader, other)) return
            const targetBounds = other.kind === 'text' ? expand(other.bounds, other.clearance) : other.bounds
            if (lineSegments(leader).some(([start, end]) => segmentIntersectsBounds(start, end, targetBounds))) {
                violations.push({
                    code: 'leader-crossing',
                    primitiveId: leader.id,
                    otherPrimitiveId: other.id,
                    message: `${leader.id} crosses ${other.id}.`,
                })
            }
        })
    })

    // Each unordered text pair is otherwise reported twice.
    return violations.filter((violation, index, all) => {
        if (!violation.otherPrimitiveId) return true
        return all.findIndex(candidate =>
            candidate.code === violation.code
            && candidate.primitiveId === violation.otherPrimitiveId
            && candidate.otherPrimitiveId === violation.primitiveId,
        ) === -1 || index < all.findIndex(candidate =>
            candidate.code === violation.code
            && candidate.primitiveId === violation.otherPrimitiveId
            && candidate.otherPrimitiveId === violation.primitiveId,
        )
    })
}
