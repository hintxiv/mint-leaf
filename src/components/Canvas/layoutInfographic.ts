import { calculateBuffLinePositions, calculateTimeline } from './calculateBuffLinePositions'
import { calculateIconPositions } from './calculateIconPositions'
import { scale, styles } from './styles'
import {
    Action,
    Bounds,
    CanvasIcon,
    ImagePrimitive,
    LinePrimitive,
    RenderPlan,
    RenderPrimitive,
    ShapePrimitive,
    TextBlock,
} from './types'
import {
    measureTextBlock,
    TextMeasurer,
    translateTextBlock,
    truncateLabel,
    wrapMeasuredText,
} from './textLayout'

const { colors, fonts, positions } = styles
const CLEARANCE = styles.textClearance
const HEADER_GAP = 24 * scale
const LABEL_GAP = 16 * scale
const LANE_GAP = 12 * scale
const CANVAS_PADDING = positions.rotationPadding
const LEADER_FADE_LENGTH = 8 * scale

export interface LayoutInfographicInput {
    prepullRotation: Action[]
    rotation: Action[]
    title: string
    jobName: string
    jobIcon: string
    level: number
    expansion: string
    patch: string
    useBalanceLogo: boolean
    pullLabel?: string
    levelPrefix?: string
    patchLabel?: string
}

interface PositionedActions {
    icons: CanvasIcon[]
    mainIcons: CanvasIcon[]
    primitives: RenderPrimitive[]
    width: number
}

const finiteBounds = (bounds: Bounds): Bounds => ({
    x: Number.isFinite(bounds.x) ? bounds.x : 0,
    y: Number.isFinite(bounds.y) ? bounds.y : 0,
    width: Number.isFinite(bounds.width) ? Math.max(0, bounds.width) : 0,
    height: Number.isFinite(bounds.height) ? Math.max(0, bounds.height) : 0,
})

const boundsFromPoints = (points: Array<{ x: number; y: number }>, width = 0): Bounds => {
    const half = width / 2
    const xs = points.map(point => point.x)
    const ys = points.map(point => point.y)
    return {
        x: Math.min(...xs) - half,
        y: Math.min(...ys) - half,
        width: Math.max(...xs) - Math.min(...xs) + width,
        height: Math.max(...ys) - Math.min(...ys) + width,
    }
}

const unionBounds = (items: Bounds[]): Bounds => {
    if (items.length === 0) return { x: 0, y: 0, width: 0, height: 0 }
    const left = Math.min(...items.map(item => item.x))
    const top = Math.min(...items.map(item => item.y))
    const right = Math.max(...items.map(item => item.x + item.width))
    const bottom = Math.max(...items.map(item => item.y + item.height))
    return { x: left, y: top, width: right - left, height: bottom - top }
}

const padded = (bounds: Bounds, amount = CLEARANCE): Bounds => ({
    x: bounds.x - amount,
    y: bounds.y - amount,
    width: bounds.width + amount * 2,
    height: bounds.height + amount * 2,
})

const intersects = (a: Bounds, b: Bounds): boolean =>
    a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y

const image = (
    id: string,
    source: string,
    bounds: Bounds,
    role: ImagePrimitive['role'],
    ownerId?: string,
): ImagePrimitive => ({ kind: 'image', id, source, bounds: finiteBounds(bounds), role, ownerId })

const line = (
    id: string,
    points: Array<{ x: number; y: number }>,
    color: string,
    width: number,
    role: LinePrimitive['role'],
    ownerId?: string,
    leaderFor?: string,
): LinePrimitive => ({
    kind: 'line',
    id,
    points,
    color,
    width,
    role,
    ownerId,
    leaderFor,
    bounds: boundsFromPoints(points, width),
})

const translatePrimitive = (primitive: RenderPrimitive, dx: number, dy: number): RenderPrimitive => {
    if (primitive.kind === 'text') return translateTextBlock(primitive, dx, dy)
    if (primitive.kind === 'line') {
        const points = primitive.points.map(point => ({ x: point.x + dx, y: point.y + dy }))
        return { ...primitive, points, bounds: boundsFromPoints(points, primitive.width) }
    }
    return { ...primitive, bounds: { ...primitive.bounds, x: primitive.bounds.x + dx, y: primitive.bounds.y + dy } }
}

const lineWidths = (lines: string[], font: string, measurer: TextMeasurer): number =>
    Math.max(0, ...lines.map(value => measurer.measure(value, font).width))

const actionLabelLines = (name: string, prepull: boolean, measurer: TextMeasurer): string[] =>
    wrapMeasuredText(
        truncateLabel(name),
        prepull ? styles.compactLabelWidth : styles.gcdLabelWidth,
        fonts.label,
        measurer,
    )

const positionPrepull = (actions: Action[], measurer: TextMeasurer): PositionedActions => {
    const primitives: RenderPrimitive[] = []
    const icons: CanvasIcon[] = []
    const mainIcons: CanvasIcon[] = []
    let x = 0

    actions.forEach((action, actionIndex) => {
        const calculated = calculateIconPositions([action])
        const wrapped = actionLabelLines(action.name, true, measurer)
        const time = action.prepull === undefined ? '' : String(action.prepull)
        const footprint = Math.max(
            calculated.width,
            lineWidths(wrapped, fonts.label, measurer) + CLEARANCE * 2,
            time ? measurer.measure(time, fonts.pullTime).width + CLEARANCE * 2 : 0,
        )
        const columnWidth = footprint + LABEL_GAP
        const offsetX = x + (columnWidth - calculated.width) / 2
        const ownerId = `prepull-${actionIndex}`

        calculated.icons.forEach((iconData, iconIndex) => {
            const translated = { ...iconData, x: iconData.x + offsetX }
            icons.push(translated)
            if (translated.type === 'gcd' || translated.type === 'ogcd') mainIcons.push(translated)
            primitives.push(image(
                `${ownerId}-image-${iconIndex}`,
                translated.imageSrc,
                { x: translated.x, y: translated.y, width: translated.width, height: translated.height },
                translated.type === 'gcd' || translated.type === 'ogcd' ? 'action-icon' : 'timeline',
                ownerId,
            ))
        })
        x += columnWidth
    })

    return { icons, mainIcons, primitives, width: x }
}

const positionRotation = (actions: Action[], startX: number): PositionedActions => {
    const calculated = calculateIconPositions(actions)
    const icons = calculated.icons.map(iconData => ({ ...iconData, x: iconData.x + startX }))
    const mainIcons = icons.filter((iconData): iconData is CanvasIcon => iconData.type === 'gcd' || iconData.type === 'ogcd')
    let mainIndex = 0
    const owners = icons.map(iconData => iconData.type === 'gcd' || iconData.type === 'ogcd'
        ? `rotation-${mainIndex++}`
        : undefined)
    icons.forEach((iconData, index) => {
        if (iconData.type === 'other' && iconData.imageSrc === '/icon_frame.png' && index > 0) {
            owners[index] = owners[index - 1]
        }
    })
    const primitives = icons.map((iconData, index) => {
        const isMain = iconData.type === 'gcd' || iconData.type === 'ogcd'
        return image(
            `rotation-image-${index}`,
            iconData.imageSrc,
            { x: iconData.x, y: iconData.y, width: iconData.width, height: iconData.height },
            isMain ? 'action-icon' : 'timeline',
            owners[index],
        )
    })
    return { icons, mainIcons, primitives, width: calculated.width }
}

const makeLabel = (
    id: string,
    ownerId: string,
    value: string,
    role: TextBlock['role'],
    font: string,
    color: string,
    x: number,
    top: number,
    lineHeight: number,
    maxWidth: number | undefined,
    measurer: TextMeasurer,
    truncate = false,
    align: CanvasTextAlign = 'center',
): TextBlock | null => {
    const normalized = truncate ? truncateLabel(value) : value.replace(/\s+/gu, ' ').trim()
    const lines = maxWidth === undefined
        ? (normalized ? [normalized] : [])
        : wrapMeasuredText(normalized, maxWidth, font, measurer)
    return measureTextBlock({
        id,
        ownerId,
        role,
        lines,
        font,
        color,
        x,
        top,
        lineHeight,
        clearance: CLEARANCE,
        align,
    }, measurer)
}

interface ActionLabelResult {
    primitives: RenderPrimitive[]
    occupiedUpper: Bounds[]
    occupiedLower: Bounds[]
}

interface LeaderRequest {
    id: string
    ownerId: string
    leaderFor: string
    x: number
    startY: number
    endY: number
}

const fadedVerticalLeader = (request: LeaderRequest, textBlocks: TextBlock[]): LinePrimitive[] => {
    const top = Math.min(request.startY, request.endY)
    const bottom = Math.max(request.startY, request.endY)
    const halfLine = scale / 2
    const blocked = textBlocks
        .filter(block => block.ownerId !== request.ownerId)
        .map(block => padded(block.bounds, block.clearance))
        .filter(bounds =>
            request.x + halfLine > bounds.x
            && request.x - halfLine < bounds.x + bounds.width
            && bottom > bounds.y
            && top < bounds.y + bounds.height,
        )
        .map(bounds => ({
            top: Math.max(top, bounds.y),
            bottom: Math.min(bottom, bounds.y + bounds.height),
        }))
        .sort((a, b) => a.top - b.top)
        .reduce<Array<{ top: number; bottom: number }>>((merged, interval) => {
            const previous = merged.at(-1)
            if (previous && interval.top <= previous.bottom) {
                previous.bottom = Math.max(previous.bottom, interval.bottom)
            } else {
                merged.push({ ...interval })
            }
            return merged
        }, [])

    const visible: Array<{ top: number; bottom: number; fadeStart: boolean; fadeEnd: boolean }> = []
    let cursor = top
    blocked.forEach(interval => {
        const segmentBottom = interval.top - scale
        if (segmentBottom > cursor) {
            visible.push({ top: cursor, bottom: segmentBottom, fadeStart: cursor > top, fadeEnd: true })
        }
        cursor = Math.max(cursor, interval.bottom + scale)
    })
    if (cursor < bottom) {
        visible.push({ top: cursor, bottom, fadeStart: cursor > top, fadeEnd: false })
    }

    return visible.map((segment, index) => ({
        ...line(
            `${request.id}-${index}`,
            [{ x: request.x, y: segment.top }, { x: request.x, y: segment.bottom }],
            colors.line,
            scale,
            'leader',
            request.ownerId,
            request.leaderFor,
        ),
        fadeStart: segment.fadeStart,
        fadeEnd: segment.fadeEnd,
        fadeLength: LEADER_FADE_LENGTH,
    }))
}

const layoutActionLabels = (
    prepullActions: Action[],
    prepullMainIcons: CanvasIcon[],
    rotationActions: Action[],
    rotationMainIcons: CanvasIcon[],
    measurer: TextMeasurer,
): ActionLabelResult => {
    const primitives: RenderPrimitive[] = []
    const occupiedUpper: Bounds[] = []
    const occupiedLower: Bounds[] = []
    const upperTextBlocks: TextBlock[] = []
    const leaderRequests: LeaderRequest[] = []
    const prepullUpperBounds: Bounds[] = []
    let prepullTimesPlaced = false

    const placePrepullTimes = () => {
        if (prepullTimesPlaced) return
        prepullTimesPlaced = true
        const measuredTimes = prepullActions.map((action, index) => {
            if (action.prepull === undefined) return null
            const iconData = prepullMainIcons[index]
            if (!iconData) return null
            return makeLabel(
                `prepull-${index}-time`,
                `prepull-${index}`,
                String(action.prepull),
                'time',
                fonts.pullTime,
                colors.text,
                iconData.x + iconData.width / 2,
                0,
                24 * scale,
                undefined,
                measurer,
            )
        }).filter((block): block is TextBlock => block !== null)
        if (measuredTimes.length === 0) return

        const referenceTop = prepullUpperBounds.length > 0
            ? Math.min(...prepullUpperBounds.map(bounds => bounds.y))
            : Math.min(0, ...prepullMainIcons.map(iconData => iconData.y))
        const tallestTime = Math.max(...measuredTimes.map(block => block.bounds.height))
        const timeTop = referenceTop - LABEL_GAP - tallestTime
        measuredTimes.forEach(measured => {
            const block = translateTextBlock(measured, 0, timeTop - measured.bounds.y)
            primitives.push(block)
            occupiedUpper.push(padded(block.bounds))
            upperTextBlocks.push(block)
        })
    }

    const allActions = [
        ...prepullActions.map((action, index) => ({ action, iconData: prepullMainIcons[index], ownerId: `prepull-${index}`, prepull: true })),
        ...rotationActions.map((action, index) => ({ action, iconData: rotationMainIcons[index], ownerId: `rotation-${index}`, prepull: false })),
    ]
    let ogcdRun = 0
    let previousWasPrepull: boolean | undefined

    allActions.forEach(({ action, iconData, ownerId, prepull }) => {
        if (!iconData) return
        if (!prepull) placePrepullTimes()
        if (previousWasPrepull !== undefined && previousWasPrepull !== prepull) ogcdRun = 0
        previousWasPrepull = prepull
        const center = iconData.x + iconData.width / 2
        if (action.type === 'gcd') {
            ogcdRun = 0
            let top = iconData.y + iconData.height + positions.gcdLabelTopPadding
            let name = makeLabel(
                `${ownerId}-name`, ownerId, action.name, 'action', fonts.label, colors.text,
                center, top, styles.labelLineHeight,
                prepull ? styles.compactLabelWidth : styles.gcdLabelWidth,
                measurer, true,
            )
            if (!name) return

            let count: TextBlock | null = null
            const rotationIndex = prepull ? -1 : Number(ownerId.split('-')[1])
            const gcdCount = prepull
                ? undefined
                : rotationActions.slice(0, rotationIndex + 1).filter(item => item.type === 'gcd').length
            if (gcdCount !== undefined) {
                count = makeLabel(
                    `${ownerId}-count`, ownerId, String(gcdCount), 'count', fonts.label, colors.gcdCount,
                    center, name.bounds.y + name.bounds.height + LABEL_GAP,
                    styles.labelLineHeight, undefined, measurer,
                )
            }

            let group = unionBounds([name.bounds, ...(count ? [count.bounds] : [])])
            while (occupiedLower.some(existing => intersects(padded(group), existing))) {
                const collisions = occupiedLower.filter(existing => intersects(padded(group), existing))
                const nextTop = Math.max(...collisions.map(item => item.y + item.height)) + CLEARANCE
                const dy = nextTop - group.y
                name = translateTextBlock(name, 0, dy)
                if (count) count = translateTextBlock(count, 0, dy)
                group = unionBounds([name.bounds, ...(count ? [count.bounds] : [])])
            }
            primitives.push(name)
            if (count) primitives.push(count)
            occupiedLower.push(padded(group))
            return
        }

        ogcdRun += 1
        const baseBottom = iconData.y - positions.textBottomPadding
        if (prepull) {
            const provisional = makeLabel(
                `${ownerId}-name`, ownerId, action.name, 'action', fonts.label, colors.text,
                center, 0, styles.labelLineHeight, styles.compactLabelWidth, measurer, true,
            )
            if (!provisional) return
            const block = translateTextBlock(provisional, 0, baseBottom - provisional.bounds.height - provisional.bounds.y)
            primitives.push(block)
            const occupied = padded(block.bounds)
            occupiedUpper.push(occupied)
            prepullUpperBounds.push(occupied)
            upperTextBlocks.push(block)
            return
        }

        const preferredLane = ogcdRun % 2 === 0 ? 1 : 0
        let laneIndex = preferredLane
        let block: TextBlock | null = null

        while (laneIndex < preferredLane + allActions.length + 4) {
            const provisional = makeLabel(
                `${ownerId}-name`, ownerId, action.name, 'action', fonts.label, colors.text,
                center, 0, styles.labelLineHeight, styles.compactLabelWidth, measurer, true,
            )
            if (!provisional) return
            const laneOffset = laneIndex * (provisional.bounds.height + LANE_GAP)
            const top = baseBottom - laneOffset - provisional.bounds.height
            block = translateTextBlock(provisional, 0, top - provisional.bounds.y)

            const labelConflict = occupiedUpper.some(existing => intersects(padded(block!.bounds), existing))
            if (!labelConflict) break
            laneIndex += 1
            block = null
        }

        if (block) {
            primitives.push(block)
            upperTextBlocks.push(block)
            if (laneIndex > 0) {
                leaderRequests.push({
                    id: `${ownerId}-leader`,
                    ownerId,
                    leaderFor: block.id,
                    x: center,
                    startY: iconData.y - CLEARANCE,
                    endY: block.bounds.y + block.bounds.height + CLEARANCE / 2,
                })
            }
            occupiedUpper.push(padded(block.bounds))
        }
    })
    placePrepullTimes()
    leaderRequests.forEach(request => primitives.push(...fadedVerticalLeader(request, upperTextBlocks)))

    return { primitives, occupiedUpper, occupiedLower }
}

const addHeader = (
    input: LayoutInfographicInput,
    width: number,
    measurer: TextMeasurer,
): { primitives: RenderPrimitive[]; bottom: number } => {
    const primitives: RenderPrimitive[] = []
    const levelPrefix = input.levelPrefix ?? 'LV.'
    const patchLabel = input.patchLabel ?? 'Patch'
    const titleX = positions.titleMarginLeft + positions.jobIconWidth + positions.jobIconPadding
    const title = makeLabel(
        'header-title', 'header', input.title, 'title', fonts.title, colors.title,
        titleX, positions.titleMarginTop, 56 * scale, undefined, measurer, false, 'left',
    )
    const subtitle = makeLabel(
        'header-subtitle', 'header-subtitle', `${input.jobName} ${levelPrefix}${input.level}`, 'subtitle',
        fonts.subtitle, colors.subtitle, titleX, positions.titleMarginTop + 64 * scale,
        38 * scale, undefined, measurer, false, 'left',
    )
    const metadata = makeLabel(
        'header-metadata', 'header-metadata', `${input.expansion} ${patchLabel} ${input.patch}`, 'metadata',
        fonts.subtitle, colors.subtitle, width - positions.titleMarginLeft,
        positions.titleMarginTop + 64 * scale, 38 * scale, undefined, measurer, false, 'right',
    )

    primitives.push(image(
        'job-icon', input.jobIcon,
        {
            x: positions.titleMarginLeft - positions.jobIconAdjustLeft,
            y: positions.titleMarginTop - positions.jobIconAdjustTop,
            width: positions.jobIconWidth,
            height: positions.jobIconWidth,
        },
        'job-icon', 'header',
    ))
    if (title) primitives.push(title)
    if (subtitle) primitives.push(subtitle)
    if (metadata) primitives.push(metadata)

    if (subtitle && metadata) {
        const lineY = subtitle.bounds.y + subtitle.bounds.height / 2
        const startX = subtitle.bounds.x + subtitle.bounds.width + positions.subtitleLinePadding
        const endX = metadata.bounds.x - positions.subtitleLinePadding
        if (endX > startX) {
            primitives.push(line('header-separator', [{ x: startX, y: lineY }, { x: endX, y: lineY }], colors.line, scale, 'separator'))
        }
    }

    if (input.useBalanceLogo) {
        const groupWidth = positions.balanceLogoWidth + positions.balanceLogoGap + positions.balanceLogotypeWidth
        const x = width - positions.titleMarginLeft - groupWidth
        const y = positions.titleMarginTop - positions.balanceLogoAdjustTop
        primitives.push(image('balance-logo', '/Balance_Logo-02.png', {
            x, y, width: positions.balanceLogoWidth, height: positions.balanceLogoHeight,
        }, 'branding', 'branding'))
        primitives.push(image('balance-logotype', '/Balance_Logotype-08.png', {
            x: x + positions.balanceLogoWidth + positions.balanceLogoGap,
            y: y + (positions.balanceLogoHeight - positions.balanceLogotypeHeight) / 2 - positions.balanceLogotypeAdjustTop,
            width: positions.balanceLogotypeWidth,
            height: positions.balanceLogotypeHeight,
        }, 'branding', 'branding'))
        const url = makeLabel(
            'balance-url', 'branding', 'www.thebalanceffxiv.com', 'branding', fonts.url, colors.url,
            x + positions.balanceLogoWidth + positions.balanceLogoGap + positions.balanceLogotypeWidth / 2,
            y + positions.balanceLogoHeight - positions.balanceUrlAdjustTop,
            24 * scale, undefined, measurer,
        )
        if (url) primitives.push(url)
    }

    const contentBounds = primitives.filter(item => item.kind !== 'line').map(item => item.bounds)
    return {
        primitives,
        bottom: Math.max(0, ...contentBounds.map(bounds => bounds.y + bounds.height)),
    }
}

const requiredHeaderWidth = (input: LayoutInfographicInput, measurer: TextMeasurer): number => {
    const titleX = positions.titleMarginLeft + positions.jobIconWidth + positions.jobIconPadding
    const levelPrefix = input.levelPrefix ?? 'LV.'
    const patchLabel = input.patchLabel ?? 'Patch'
    const titleWidth = measurer.measure(input.title.replace(/\s+/gu, ' ').trim(), fonts.title).width
    const subtitleWidth = measurer.measure(`${input.jobName} ${levelPrefix}${input.level}`, fonts.subtitle).width
    const metadataWidth = measurer.measure(`${input.expansion} ${patchLabel} ${input.patch}`, fonts.subtitle).width
    const brandingWidth = input.useBalanceLogo
        ? positions.balanceLogoWidth + positions.balanceLogoGap + positions.balanceLogotypeWidth
        : 0
    const titleRequirement = titleX + titleWidth + (brandingWidth ? HEADER_GAP + brandingWidth : 0) + positions.titleMarginLeft
    const metadataRequirement = titleX + subtitleWidth + HEADER_GAP + metadataWidth + positions.titleMarginLeft
    return Math.max(titleRequirement, metadataRequirement)
}

const addBuffs = (
    rotationIcons: CanvasIcon[],
    prepullIcons: CanvasIcon[],
    pullX: number,
    rotationEnd: number,
    baseY: number,
    measurer: TextMeasurer,
): { primitives: RenderPrimitive[]; bottom: number } => {
    if (rotationIcons.length === 0) return { primitives: [], bottom: 0 }
    const timeline = calculateTimeline(prepullIcons, rotationIcons, rotationEnd, pullX)
    const refs = { current: [] as Array<HTMLImageElement | null> }
    const buffs = calculateBuffLinePositions(rotationIcons, timeline, refs, rotationEnd)
        .map((buff, index) => ({ ...buff, sourceIndex: index }))
        .sort((a, b) => a.endX - b.endX)
    const bins: Array<{ end: number; buffs: typeof buffs }> = []

    buffs.forEach(buff => {
        const endpoint = Math.min(buff.endX, rotationEnd)
        const target = bins.find(bin => bin.end + CLEARANCE < buff.startX)
        if (target) {
            target.buffs.push(buff)
            target.end = endpoint
        } else {
            bins.push({ end: endpoint, buffs: [buff] })
        }
    })

    const primitives: RenderPrimitive[] = []
    bins.forEach((bin, row) => {
        const y = baseY + row * positions.buffLineHeight
        bin.buffs.forEach(buff => {
            const ownerId = `buff-${buff.sourceIndex}`
            const endpoint = Math.min(buff.endX, rotationEnd)
            const labelValue = truncateLabel(buff.status.name)
            const labelWidth = measurer.measure(labelValue, fonts.label).width
            const iconX = buff.startX + positions.buffLineTextLeft
            const labelX = iconX + positions.buffLineIconWidth + positions.buffLineTextPadding
            const labelFootprint = positions.buffLineTextLeft + positions.buffLineIconWidth + labelWidth + positions.buffLineTextPadding * 2
            const canFitLabel = Boolean(labelValue) && buff.startX + labelFootprint + CLEARANCE < endpoint
            const strokeWidth = 2 * scale

            if (canFitLabel) {
                const iconY = y - positions.buffLineIconHeight / 2
                primitives.push(image(`${ownerId}-icon`, buff.status.imageSrc, {
                    x: iconX,
                    y: iconY,
                    width: positions.buffLineIconWidth,
                    height: positions.buffLineIconHeight,
                }, 'buff-icon', ownerId))
                const labelBlock = makeLabel(
                    `${ownerId}-label`, ownerId, labelValue, 'buff', fonts.label, colors.text,
                    labelX, y - measurer.measure(labelValue, fonts.label).actualBoundingBoxAscent,
                    styles.labelLineHeight, undefined, measurer, false, 'left',
                )
                if (labelBlock) primitives.push(labelBlock)
                primitives.push(line(`${ownerId}-before`, [
                    { x: buff.startX, y },
                    { x: iconX - positions.buffLineTextPadding, y },
                ], buff.status.color, strokeWidth, 'buff', ownerId))
                primitives.push(line(`${ownerId}-after`, [
                    { x: labelX + labelWidth + positions.buffLineTextPadding, y },
                    { x: endpoint, y },
                ], buff.status.color, strokeWidth, 'buff', ownerId))
            } else {
                primitives.push(line(`${ownerId}-body`, [{ x: buff.startX, y }, { x: endpoint, y }], buff.status.color, strokeWidth, 'buff', ownerId))
            }

            const connectorTop = baseY - positions.buffLineHeight - CLEARANCE
            primitives.push(line(`${ownerId}-start`, [{ x: buff.startX, y: connectorTop }, { x: buff.startX, y }], buff.status.color, strokeWidth, 'buff', ownerId))
            if (buff.endX > rotationEnd) {
                primitives.push(line(`${ownerId}-arrow`, [
                    { x: endpoint + positions.buffLineArrowPadding, y: y - positions.buffLineArrowLength / 2 },
                    { x: endpoint + positions.buffLineArrowPadding + positions.buffLineArrowLength, y },
                    { x: endpoint + positions.buffLineArrowPadding, y: y + positions.buffLineArrowLength / 2 },
                ], buff.status.color, strokeWidth, 'buff', ownerId))
            } else {
                primitives.push(line(`${ownerId}-end`, [
                    { x: endpoint, y },
                    { x: endpoint, y: y - positions.buffLineHeight / 3 },
                ], buff.status.color, strokeWidth, 'buff', ownerId))
            }
        })
    })

    return {
        primitives,
        bottom: bins.length === 0 ? 0 : baseY + (bins.length - 1) * positions.buffLineHeight + positions.buffLineIconHeight / 2,
    }
}

export const layoutInfographic = (input: LayoutInfographicInput, measurer: TextMeasurer): RenderPlan => {
    const prepull = positionPrepull(input.prepullRotation, measurer)
    const prepullStart = CANVAS_PADDING
    prepull.icons = prepull.icons.map(iconData => ({ ...iconData, x: iconData.x + prepullStart }))
    prepull.mainIcons = prepull.mainIcons.map(iconData => ({ ...iconData, x: iconData.x + prepullStart }))
    prepull.primitives = prepull.primitives.map(primitive => translatePrimitive(primitive, prepullStart, 0))

    const hasPullLine = input.prepullRotation.length > 0 && input.rotation.length > 0
    const pullLineX = prepullStart + prepull.width
    const rotationStart = input.prepullRotation.length > 0
        ? prepullStart + prepull.width + positions.prepullPadding * 2.5
        : CANVAS_PADDING
    const rotation = positionRotation(input.rotation, rotationStart)
    const rotationEnd = Math.max(rotationStart + rotation.width, pullLineX)

    const contentWidth = Math.max(rotationEnd + CANVAS_PADDING, styles.widthInitial)
    const width = Math.ceil(Math.max(contentWidth, requiredHeaderWidth(input, measurer)))
    const header = addHeader(input, width, measurer)
    const labels = layoutActionLabels(
        input.prepullRotation,
        prepull.mainIcons,
        input.rotation,
        rotation.mainIcons,
        measurer,
    )

    const relativePrimitives: RenderPrimitive[] = [
        ...prepull.primitives,
        ...rotation.primitives,
        ...labels.primitives,
    ]
    if (hasPullLine) {
        const translatedPullLabel = input.pullLabel ?? 'Pull'
        relativePrimitives.push(line('pull-line', [
            { x: pullLineX + positions.prepullPadding, y: positions.pullLineHeightBelow },
            { x: pullLineX + positions.prepullPadding, y: -positions.pullLineHeightAbove },
        ], colors.line, scale, 'pull', 'pull'))
        const pullBlock = makeLabel(
            'pull-label', 'pull', translatedPullLabel, 'pull', fonts.pullLabel, colors.text,
            pullLineX + positions.prepullPadding,
            -positions.pullLineHeightAbove - positions.textBottomPadding - measurer.measure(translatedPullLabel, fonts.pullLabel).actualBoundingBoxAscent,
            36 * scale, undefined, measurer,
        )
        if (pullBlock) relativePrimitives.push(pullBlock)
    }

    const actionTop = Math.min(0, ...relativePrimitives.map(primitive => primitive.bounds.y - CLEARANCE))
    const timelineY = Math.max(
        styles.height / 2 + positions.midlineAdjustBottom,
        header.bottom + HEADER_GAP - actionTop,
    )
    const actionPrimitives = relativePrimitives.map(primitive => translatePrimitive(primitive, 0, timelineY))
    const shiftedPrepullIcons = prepull.icons.map(iconData => ({ ...iconData, y: iconData.y + timelineY }))
    const shiftedRotationIcons = rotation.icons.map(iconData => ({ ...iconData, y: iconData.y + timelineY }))
    const actionBottom = Math.max(timelineY, ...actionPrimitives.map(primitive => primitive.bounds.y + primitive.bounds.height))
    const buffBase = Math.max(
        styles.height - positions.midlineAdjustBottom / 2,
        actionBottom + positions.buffLineHeight + CLEARANCE,
    )
    const pullX = hasPullLine ? pullLineX + positions.prepullPadding : rotationStart
    const buffs = addBuffs(shiftedRotationIcons, shiftedPrepullIcons, pullX, rotationEnd, buffBase, measurer)
    const height = Math.ceil(Math.max(
        styles.height,
        buffs.bottom + CANVAS_PADDING,
        actionBottom + CANVAS_PADDING,
    ))

    const background: ShapePrimitive = {
        kind: 'shape',
        id: 'background',
        role: 'background',
        color: colors.background,
        radius: positions.canvasCornerRadius,
        bounds: { x: 0, y: 0, width, height },
    }
    const primitives: RenderPrimitive[] = [background, ...header.primitives, ...actionPrimitives, ...buffs.primitives]
    return {
        width,
        height,
        primitives,
        textBlocks: primitives.filter((primitive): primitive is TextBlock => primitive.kind === 'text'),
        requiredImages: Array.from(new Set(
            primitives.filter((primitive): primitive is ImagePrimitive => primitive.kind === 'image').map(primitive => primitive.source),
        )),
    }
}
