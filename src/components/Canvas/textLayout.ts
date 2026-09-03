import { Bounds, MeasuredTextLine, TextBlock, TextRole } from './types'

export interface TextMeasurement {
    width: number
    actualBoundingBoxAscent: number
    actualBoundingBoxDescent: number
    actualBoundingBoxLeft: number
    actualBoundingBoxRight: number
}

export interface TextMeasurer {
    measure(text: string, font: string): TextMeasurement
}

export class CanvasTextMeasurer implements TextMeasurer {
    constructor(private readonly context: CanvasRenderingContext2D) {}

    measure(text: string, font: string): TextMeasurement {
        this.context.font = font
        const metrics = this.context.measureText(text)
        const fallbackSize = Number.parseFloat(font.match(/([\d.]+)px/)?.[1] ?? '16')
        const ascent = metrics.actualBoundingBoxAscent || fallbackSize * 0.8
        const descent = metrics.actualBoundingBoxDescent || fallbackSize * 0.2
        return {
            width: metrics.width,
            actualBoundingBoxAscent: ascent,
            actualBoundingBoxDescent: descent,
            actualBoundingBoxLeft: Number.isFinite(metrics.actualBoundingBoxLeft) ? metrics.actualBoundingBoxLeft : 0,
            actualBoundingBoxRight: Number.isFinite(metrics.actualBoundingBoxRight) ? metrics.actualBoundingBoxRight : metrics.width,
        }
    }
}

const segmenter = (granularity: 'grapheme' | 'word') =>
    typeof Intl !== 'undefined' && 'Segmenter' in Intl
        ? new Intl.Segmenter(undefined, { granularity })
        : undefined

export const graphemes = (value: string): string[] => {
    const iterator = segmenter('grapheme')?.segment(value)
    if (iterator) return Array.from(iterator, part => part.segment)

    // Keep combining marks and joined emoji attached in older engines.
    return Array.from(value).reduce<string[]>((parts, character) => {
        if (parts.length > 0 && (/\p{Mark}/u.test(character) || character === '\u200d')) {
            parts[parts.length - 1] += character
        } else if (parts.at(-1)?.endsWith('\u200d')) {
            parts[parts.length - 1] += character
        } else {
            parts.push(character)
        }
        return parts
    }, [])
}

export const normalizeLabel = (value: string | null | undefined): string =>
    (value ?? '').replace(/\s+/gu, ' ').trim()

export const truncateLabel = (value: string | null | undefined, limit = 40): string => {
    const normalized = normalizeLabel(value)
    const parts = graphemes(normalized)
    return parts.length > limit ? `${parts.slice(0, limit).join('')}…` : normalized
}

const breakToken = (token: string, maxWidth: number, font: string, measurer: TextMeasurer): string[] => {
    const result: string[] = []
    let line = ''
    for (const part of graphemes(token)) {
        const candidate = line + part
        if (line && measurer.measure(candidate, font).width > maxWidth) {
            result.push(line)
            line = part
        } else {
            line = candidate
        }
    }
    if (line) result.push(line)
    return result
}

export const wrapMeasuredText = (
    value: string | null | undefined,
    maxWidth: number,
    font: string,
    measurer: TextMeasurer,
): string[] => {
    const normalized = normalizeLabel(value)
    if (!normalized) return []

    const lines: string[] = []
    let current = ''
    for (const word of normalized.split(' ')) {
        const pieces = measurer.measure(word, font).width > maxWidth
            ? breakToken(word, maxWidth, font, measurer)
            : [word]

        for (const piece of pieces) {
            const candidate = current ? `${current} ${piece}` : piece
            if (current && measurer.measure(candidate, font).width > maxWidth) {
                lines.push(current)
                current = piece
            } else {
                current = candidate
            }
        }
    }
    if (current) lines.push(current)
    return lines
}

const union = (bounds: Bounds[]): Bounds => {
    if (bounds.length === 0) return { x: 0, y: 0, width: 0, height: 0 }
    const left = Math.min(...bounds.map(item => item.x))
    const top = Math.min(...bounds.map(item => item.y))
    const right = Math.max(...bounds.map(item => item.x + item.width))
    const bottom = Math.max(...bounds.map(item => item.y + item.height))
    return { x: left, y: top, width: right - left, height: bottom - top }
}

export interface TextBlockOptions {
    id: string
    ownerId?: string
    role: TextRole
    lines: string[]
    font: string
    color: string
    x: number
    top: number
    lineHeight: number
    clearance: number
    align?: CanvasTextAlign
}

export const measureTextBlock = (options: TextBlockOptions, measurer: TextMeasurer): TextBlock | null => {
    if (options.lines.length === 0) return null
    const align = options.align ?? 'center'
    const measuredLines: MeasuredTextLine[] = options.lines.map((text, index) => {
        const metrics = measurer.measure(text, options.font)
        const baselineY = options.top + metrics.actualBoundingBoxAscent + index * options.lineHeight
        const anchorX = options.x
        let left = anchorX - metrics.actualBoundingBoxLeft
        if (align === 'center') left = anchorX - (metrics.actualBoundingBoxLeft + metrics.actualBoundingBoxRight) / 2
        if (align === 'right' || align === 'end') left = anchorX - metrics.actualBoundingBoxRight
        const bounds = {
            x: left,
            y: baselineY - metrics.actualBoundingBoxAscent,
            width: metrics.actualBoundingBoxLeft + metrics.actualBoundingBoxRight,
            height: metrics.actualBoundingBoxAscent + metrics.actualBoundingBoxDescent,
        }
        return {
            text,
            x: anchorX,
            y: baselineY,
            width: metrics.width,
            ascent: metrics.actualBoundingBoxAscent,
            descent: metrics.actualBoundingBoxDescent,
            bounds,
        }
    })

    return {
        kind: 'text',
        id: options.id,
        ownerId: options.ownerId,
        role: options.role,
        font: options.font,
        color: options.color,
        align,
        baseline: 'alphabetic',
        lineHeight: options.lineHeight,
        lines: measuredLines,
        bounds: union(measuredLines.map(line => line.bounds)),
        clearance: options.clearance,
    }
}

export const translateTextBlock = (block: TextBlock, dx: number, dy: number): TextBlock => ({
    ...block,
    bounds: { ...block.bounds, x: block.bounds.x + dx, y: block.bounds.y + dy },
    lines: block.lines.map(line => ({
        ...line,
        x: line.x + dx,
        y: line.y + dy,
        bounds: { ...line.bounds, x: line.bounds.x + dx, y: line.bounds.y + dy },
    })),
})
