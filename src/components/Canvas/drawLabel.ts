import { scale, styles } from './styles'
import { CanvasGCD, CanvasoGCD } from './types'

const { maxCharsPerLine, maxCharsPerLineGCD, positions, fonts, colors } = styles

export const drawLabel = (
    label: string,
    x: number,
    y: number,
    context: CanvasRenderingContext2D,
    lineLength: number = maxCharsPerLine,
    textGrowDirection = 'up',
) => {
    const nameWords = (label ?? '').split(' ')
    let lines = nameWords.reduce((lines: string[], word) => {
        const lastLine = lines[lines.length - 1]
        if (lines.length > 0 && lastLine.length + word.length < lineLength) {
            lines[lines.length - 1] = `${lastLine} ${word}`
        } else {
            lines.push(word)
        }
        return lines
    }, [])

    context.textAlign = "center"
    context.textBaseline = "bottom"

    if (textGrowDirection === 'up') {
        lines = lines.reverse()
    }

    lines.forEach((word, index) => {
        context.fillText(word, x, y - (index * positions.textBottomPadding) * (textGrowDirection === 'up' ? 1 : -1))
    })
}

export const drawGCDLabel = (
    context: CanvasRenderingContext2D,
    x: number,
    y: number,
    icon: CanvasGCD,
    gcdCount?: number,
    prepull?: boolean,
) => {
    context.fillStyle = colors.text
    context.font = fonts.label
    context.textAlign = "center"
    context.textBaseline = "bottom"

    const lineLength = prepull ? maxCharsPerLine : maxCharsPerLineGCD

    drawLabel(icon.name, x + icon.width / 2, y + icon.height + positions.gcdLabelTopPadding, context, lineLength, 'down')

    if (gcdCount === undefined) return

    context.fillStyle = colors.gcdCount
    context.fillText(
        (gcdCount ?? 0).toString(),
        x + icon.width / 2,
        y + icon.height + positions.gcdLabelTopPadding + positions.gcdCountLabelTopPadding)
}

export const drawOGCDLabel = (
    context: CanvasRenderingContext2D,
    x: number,
    y: number,
    icon: CanvasoGCD,
) => {
    context.fillStyle = colors.text
    context.font = fonts.label
    context.textAlign = "center"

    if (icon.weavePosition && icon.weavePosition % 2 === 0) {
        drawLabel(icon.name, x + icon.width / 2, y - positions.textBottomPadding * 2 - positions.ogcdSeparatorLineHeight, context)

        context.beginPath()
        context.moveTo(x + icon.width / 2, y - positions.textBottomPadding)
        context.lineTo(x + icon.width / 2, y - positions.textBottomPadding - positions.ogcdSeparatorLineHeight)
        context.strokeStyle = colors.line
        context.lineWidth = scale
        context.stroke()

        return
    }

    drawLabel(icon.name, x + icon.width / 2, y - positions.textBottomPadding, context)
}
