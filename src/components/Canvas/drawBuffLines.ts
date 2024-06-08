import { drawImageFromHTML } from './drawImage'
import { scale, styles } from './styles'
import { CanvasBuffLine } from './types'

const { positions, fonts, colors } = styles

const drawBuffLine = (
    context: CanvasRenderingContext2D,
    line: CanvasBuffLine,
    y: number,
    depth: number,
    rotationEnd: number,
) => {
    const buff = line.status
    context.fillStyle = colors.text
    context.font = fonts.label
    context.textAlign = "left"
    context.textBaseline = "middle"

    const labelWidth = context.measureText(buff.name).width
    const endpoint = Math.min(line.endX, rotationEnd)
    const buffLabelWidth = positions.buffLineTextLeft + positions.buffLineIconWidth + labelWidth + 2 * positions.buffLineTextPadding
    const finalBuffLabelWidth = line.startX + buffLabelWidth < endpoint
        ? buffLabelWidth
        : 0

    if (finalBuffLabelWidth > 0) {
        // Draw buff icon
        drawImageFromHTML(
            context,
            line.icon,
            line.startX + positions.buffLineTextLeft,
            y - positions.buffLineIconHeight / 2,
            positions.buffLineIconWidth,
            positions.buffLineIconHeight,
        )

        // Draw buff label
        context.fillText(
            buff.name,
            line.startX + positions.buffLineTextLeft + positions.buffLineIconWidth + positions.buffLineTextPadding,
            y,
        )
    }

    context.strokeStyle = buff.color
    context.lineWidth = 2 * scale

    // Draw horizontal line
    if (finalBuffLabelWidth > 0) {
        context.beginPath()
        context.moveTo(line.startX, y)
        context.lineTo(line.startX + positions.buffLineTextLeft - positions.buffLineTextPadding, y)
        context.stroke()
        context.beginPath()
        context.moveTo(line.startX + positions.buffLineTextLeft + positions.buffLineIconWidth + labelWidth + 2 * positions.buffLineTextPadding, y)
        context.lineTo(endpoint, y)
        context.stroke()
    } else {
        context.beginPath()
        context.moveTo(line.startX, y)
        context.lineTo(endpoint, y)
        context.stroke()
    }

    // Draw vertical start line
    context.beginPath()
    context.moveTo(line.startX, y - (depth + 1) * positions.buffLineHeight)
    context.lineTo(line.startX, y)
    context.stroke()

    if (line.endX > rotationEnd) {
        // Draw arrow indicating open-ended buff
        context.beginPath()
        context.moveTo(endpoint + positions.buffLineArrowPadding, y - positions.buffLineArrowLength / 2)
        context.lineTo(endpoint + positions.buffLineArrowPadding + positions.buffLineArrowLength, y)
        context.lineTo(endpoint + positions.buffLineArrowPadding, y + positions.buffLineArrowLength / 2)
        context.strokeStyle = buff.color
        context.stroke()
    } else {
        context.beginPath()
        context.moveTo(line.endX, y)
        context.lineTo(line.endX, y - positions.buffLineHeight / 3)
        context.stroke()
    }
}

// Returns the height of the buff lines
export const drawBuffLines = (
    context: CanvasRenderingContext2D,
    buffs: CanvasBuffLine[],
    midLine: number,
    rotationEnd: number,
): number => {
    const bins: Array<{ buffs: CanvasBuffLine[], maxEndpoint: number }> = []
    const buffsSortedByEndpoint = buffs.sort((a, b) => (a.endX) - (b.endX))

    // Sort buff lines into bins (one for each height) based on their start and end points
    buffsSortedByEndpoint.forEach(buff => {
        const bin = bins
            .sort((a, b) => b.buffs[0].startX - a.buffs[0].startX)
            .find(bin => bin.maxEndpoint < buff.startX)
        if (bin) {
            bin.buffs.push(buff)
            bin.maxEndpoint = buff.endX
        } else {
            bins.push({ buffs: [buff], maxEndpoint: buff.endX })
        }
    })

    // Draw buff lines sorted by their start point
    bins
        .sort((a, b) => b.buffs[0].startX - a.buffs[0].startX)
        .forEach((bin, index) => {
            bin.buffs.forEach(buff => {
                drawBuffLine(context, buff, midLine + index * positions.buffLineHeight, index, rotationEnd)
            })
        })

    return bins.length * positions.buffLineHeight
}
