import React, { useRef, useEffect, useMemo, forwardRef, useImperativeHandle, useState } from 'react'
import { Action, CanvasGCD, CanvasoGCD } from './types'
import { calculateIconPositions } from './calculateIconPositions'
import styled from 'styled-components'
import { default as NextImage } from 'next/image'
import { drawImageFromHTML, drawImageFromSource } from './drawImage'
import { calculateBuffLinePositions, calculateTimeline } from './calculateBuffLinePositions'
import { scale, styles } from './styles'
import { drawLabel, drawGCDLabel, drawOGCDLabel } from './drawLabel'
import { drawBuffLines } from './drawBuffLines'

const { height, widthInitial, positions, fonts, colors } = styles

const CanvasContainer = styled.div<{ $overflow?: boolean }>`
    display: flex;
    width: 100%;
    height: 100%;
    overflow-x: scroll;
    flex-grow: 0;
    flex-shrink: 1;
    justify-content: ${props => props.$overflow ? 'flex-start' : 'center'};
    background-color: #22242b;
`

const BorderedCanvas = styled.canvas`
    border-left: 1px solid white;
    border-right: 1px solid white;
`

const drawPrepullTime = (
    context: CanvasRenderingContext2D,
    x: number,
    midLine: number,
    icon: CanvasGCD | CanvasoGCD,
) => {
    if (!icon.prepull) return

    context.fillStyle = colors.text
    context.font = fonts.pullTime
    context.textAlign = "center"

    drawLabel(icon.prepull.toString(), x + icon.width / 2, midLine - positions.pullLineHeightAbove - positions.textBottomPadding - positions.pullTimeAdjustTop, context)
}

const drawPrepullLine = (
    context: CanvasRenderingContext2D,
    x: number,
    midLine: number,
) => {
    context.beginPath()
    context.moveTo(x + positions.prepullPadding, midLine + positions.pullLineHeightBelow)
    context.lineTo(x + positions.prepullPadding, midLine - positions.pullLineHeightAbove)
    context.strokeStyle = colors.line
    context.lineWidth = scale
    context.stroke()
    context.fillStyle = colors.text
    context.font = fonts.pullLabel
    context.textAlign = "center"
    context.textBaseline = "bottom"
    context.fillText("Pull", x + positions.prepullPadding, midLine - positions.pullLineHeightAbove - positions.textBottomPadding)
}

const drawBalanceLogo = (
    context: CanvasRenderingContext2D,
    x: number,
    y: number,
) => {
    // Draw the Balance logo
    drawImageFromSource(context, '/Balance_Logo-02.png', x, y, positions.balanceLogoWidth, positions.balanceLogoHeight)
    
    // Draw the balance logotype
    drawImageFromSource(context, '/Balance_Logotype-08.png', x + positions.balanceLogoWidth + positions.balanceLogoGap, y + (positions.balanceLogoHeight - positions.balanceLogotypeHeight) / 2 - positions.balanceLogotypeAdjustTop, positions.balanceLogotypeWidth, positions.balanceLogotypeHeight)

    // Draw "thebalanceffxiv.com" url below the logotype image with matching width
    context.fillStyle = colors.url
    context.font = fonts.url
    context.textAlign = "center"
    context.textBaseline = "top"
    context.fillText("www.thebalanceffxiv.com", x + positions.balanceLogoWidth / 2 + positions.balanceLogoWidth + positions.balanceLogoGap, y + positions.balanceLogoHeight - positions.balanceUrlAdjustTop)
}

interface CanvasProps {
    screenWidth: number
    prepullRotation: Action[]
    rotation: Action[]
    title: string
    jobName: string
    jobIcon: string
    level: number
    expansion: string
    patch: string
    useBalanceLogo: boolean
};

const Canvas = forwardRef<HTMLCanvasElement, CanvasProps>((
    {
        screenWidth,
        prepullRotation,
        rotation,
        title,
        jobName,
        jobIcon,
        level,
        expansion,
        patch,
        useBalanceLogo,
    },
    ref,
) => {
    const innerRef = useRef<HTMLCanvasElement>(null)
    useImperativeHandle(ref, () => innerRef.current!, [])
    const prepullIconRefs = useRef<Array<HTMLImageElement | null>>([])
    const rotationIconRefs = useRef<Array<HTMLImageElement | null>>([])
    const prepullStatusIconRefs = useRef<Array<HTMLImageElement | null>>([])
    const statusIconRefs = useRef<Array<HTMLImageElement | null>>([])
    const [canvasWidth, setCanvasWidth] = useState(0)
    const [buffLineHeight, setBuffLineHeight] = useState(0)

    useEffect(() => {
        const observer = new ResizeObserver(() => {
            setCanvasWidth(innerRef.current?.scrollWidth ?? 0)
        })
        observer.observe(innerRef.current!)
        return () => observer.disconnect()
    }, [])

    const midLine = height / 2 + positions.midlineAdjustBottom
    const startPoint = 0

    const { icons: prepullIcons, width: prepullWidth } = useMemo(() => {
        const { icons, width } = calculateIconPositions(prepullRotation)
        return {
            icons: icons.map(icon => ({
                ...icon,
                x: icon.x + startPoint + positions.rotationPadding,
                y: icon.y + midLine,
            })),
            width,
        }
    }, [midLine, prepullRotation])

    const { icons: rotationIcons, width: rotationWidth } = useMemo(() => {
        const { icons, width } = calculateIconPositions(rotation)
        return {
            icons: icons.map(icon => ({
                ...icon,
                x: icon.x + startPoint + (prepullWidth > 0 ? prepullWidth + positions.prepullPadding * 2 : 0) + positions.rotationPadding,
                y: icon.y + midLine,
            })),
            width,
        }
    }, [midLine, prepullWidth, rotation])

    const statusIcons = useMemo(() =>
        rotationIcons.map(icon => icon.type === 'gcd' || icon.type === 'ogcd' ? (icon.statusApplied ?? null) : null),
        [rotationIcons]
    )

    const prepullStatusIcons = useMemo(() =>
        prepullIcons.map(icon => icon.type === 'gcd' || icon.type === 'ogcd' ? (icon.statusApplied ?? null) : null),
        [prepullIcons]
    )

    const calculatedWidth = rotationWidth + (
        prepullRotation.length > 0
            ? prepullWidth + (rotation.length > 0 ? positions.prepullPadding * 2 : 0)
            : 0
    )
    const width = Math.max(calculatedWidth + positions.rotationPadding * 2, widthInitial)

    useEffect(() => {
        const canvas = innerRef.current
        if (!canvas) return

        const context = canvas.getContext('2d')
        if (!context) return

        console.log('drawing...')

        // Clear canvas
        context.clearRect(0, 0, width, height + buffLineHeight)
        context.textBaseline = "bottom"
        context.textAlign = "center"
        context.scale(1, 1)

        // Draw background
        context.fillStyle = colors.background
        context.roundRect(0, 0, width, height + buffLineHeight, positions.canvasCornerRadius)
        context.fill()

        // Draw job icon
        drawImageFromSource(
            context,
            jobIcon,
            positions.titleMarginLeft - positions.jobIconAdjustLeft,
            positions.titleMarginTop - positions.jobIconAdjustTop,
            positions.jobIconWidth,
            positions.jobIconWidth,
        )

        // Draw title
        context.fillStyle = colors.title
        context.font = fonts.title
        context.textAlign = "left"
        context.textBaseline = "top"
        context.fillText(title, positions.titleMarginLeft + positions.jobIconWidth + positions.jobIconPadding, positions.titleMarginTop)

        // Draw subtitle
        context.fillStyle = colors.subtitle
        context.font = fonts.subtitle
        context.textAlign = "left"
        context.textBaseline = "top"
        const subtitle = `${jobName} LV.${level}`
        const subtitleWidth = context.measureText(subtitle).width
        const subtitleHeight = context.measureText(subtitle).actualBoundingBoxAscent - context.measureText(subtitle).actualBoundingBoxDescent
        context.fillText(subtitle, positions.titleMarginLeft + positions.jobIconWidth + positions.jobIconPadding, positions.titleMarginTop + 64 * scale)

        const expansionPatch = `${expansion} Patch ${patch}`
        const expansionPatchWidth = context.measureText(expansionPatch).width
        context.textAlign = "right"
    
        context.fillText(expansionPatch, width - positions.titleMarginLeft, positions.titleMarginTop + 64 * scale)

        context.beginPath()
        context.moveTo(positions.titleMarginLeft + positions.jobIconWidth + positions.jobIconPadding + subtitleWidth + positions.subtitleLinePadding, positions.titleMarginTop + 64 * scale - subtitleHeight / 2 - 2)
        context.lineTo(width - positions.titleMarginLeft - expansionPatchWidth - positions.subtitleLinePadding, positions.titleMarginTop + 64 * scale - subtitleHeight / 2 - 2)
        context.strokeStyle = colors.line
        context.lineWidth = scale
        context.stroke()

        // Draw balance logo
        if (useBalanceLogo) {
            drawBalanceLogo(context, width - positions.titleMarginLeft - positions.balanceLogoWidth - positions.balanceLogotypeWidth - positions.balanceLogoGap, positions.titleMarginTop - positions.balanceLogoAdjustTop)
        }

        // Draw prepull actions
        prepullIcons.forEach((icon, index) => {
            const image = prepullIconRefs.current[index]
            drawImageFromHTML(context, image, icon.x, icon.y, icon.width, icon.height)

            switch (icon.type) {
                case 'gcd':
                    drawGCDLabel(context, icon.x, icon.y, icon, undefined, true)
                    drawPrepullTime(context, icon.x, midLine, icon)
                    break
                case 'ogcd':
                    drawOGCDLabel(context, icon.x, icon.y, icon)
                    drawPrepullTime(context, icon.x, midLine, icon)
                    break
            }
        })

        // Draw pull line
        if (prepullRotation.length > 0 && rotation.length > 0) {
            drawPrepullLine(context, startPoint + prepullWidth + positions.rotationPadding, midLine)
        }

        // Draw rotation
        let gcdCount = 1

        rotationIcons.forEach((icon, index) => {
            const image = rotationIconRefs.current[index]
            drawImageFromHTML(context, image, icon.x, icon.y, icon.width, icon.height)

            // TODO make functions for everything below
            switch (icon.type) {
                case 'gcd':
                    drawGCDLabel(context, icon.x, icon.y, icon, gcdCount)
                    gcdCount++
                    break
                case 'ogcd':
                    drawOGCDLabel(context, icon.x, icon.y, icon)
                    break
            }
        })

        // Draw buff lines
        const pullX = prepullRotation.length > 0 && rotation.length > 0
            ? startPoint + prepullWidth + positions.rotationPadding + positions.prepullPadding
            : undefined

        const timeline = calculateTimeline(prepullIcons,  rotationIcons, width, pullX)
        const buffLines = calculateBuffLinePositions(rotationIcons, timeline, statusIconRefs, width)
        const addedHeight = drawBuffLines(context, buffLines, height - positions.midlineAdjustBottom / 2, width - positions.rotationPadding)
        setBuffLineHeight(addedHeight)
    }, [width, prepullIcons, rotationIcons, midLine, startPoint, prepullRotation.length, rotation.length, prepullWidth, screenWidth, jobIcon, title, jobName, level, expansion, patch, canvasWidth, buffLineHeight, useBalanceLogo])

    return (
        <CanvasContainer $overflow={canvasWidth > screenWidth}>
            <BorderedCanvas
                ref={innerRef}
                width={width}
                height={height + buffLineHeight}
            />
            {
                prepullIcons.map((icon, index) => (
                    <NextImage
                        key={index}
                        ref={ref => prepullIconRefs.current[index] = ref}
                        src={icon.imageSrc}
                        alt={''}
                        style={{ display: 'none' }}
                        width={icon.width}
                        height={icon.height}
                        priority={true}
                    />
                ))
            }
            {
                prepullStatusIcons.map((icon, index) => icon ?
                    <NextImage
                        key={index}
                        ref={ref => prepullStatusIconRefs.current[index] = ref}
                        src={icon.imageSrc}
                        alt={''}
                        style={{ display: 'none' }}
                        width={positions.buffLineIconWidth}
                        height={positions.buffLineIconHeight}
                        priority={true}
                    />
                    : null
                )
            }
            {
                rotationIcons.map((icon, index) => (
                    <NextImage
                        key={index}
                        ref={ref => rotationIconRefs.current[index] = ref}
                        src={icon.imageSrc}
                        alt={''}
                        style={{ display: 'none' }}
                        width={icon.width}
                        height={icon.height}
                        priority={true}
                    />
                ))
            }
            {
                statusIcons.map((icon, index) => icon ?
                    <NextImage
                        key={index}
                        ref={ref => statusIconRefs.current[index] = ref}
                        src={icon.imageSrc}
                        alt={''}
                        style={{ display: 'none' }}
                        width={positions.buffLineIconWidth}
                        height={positions.buffLineIconHeight}
                        priority={true}
                    />
                    : null
                )
            }
        </CanvasContainer>
    )
})

Canvas.displayName = 'Canvas'

export { Canvas }
