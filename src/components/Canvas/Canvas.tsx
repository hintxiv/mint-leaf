import React, { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react'
import { CompressOutlined, ExpandOutlined } from '@ant-design/icons'
import styled from 'styled-components'
import { useTranslation } from '@/context/LanguageContext'
import { auditRenderPlan } from './auditRenderPlan'
import { layoutInfographic } from './layoutInfographic'
import { CanvasTextMeasurer } from './textLayout'
import { loadRenderImages, paintRenderPlan } from './paintRenderPlan'
import { Action, LayoutViolation } from './types'
import { styles } from './styles'

const Viewport = styled.div`
    position: relative;
    width: 100%;
    height: 100%;
    min-height: 0;
`

const CanvasContainer = styled.div<{ $overflow: boolean; $contain: boolean }>`
    display: flex;
    width: 100%;
    height: 100%;
    overflow-x: ${({ $contain, $overflow }) => ($contain ? 'hidden' : ($overflow ? 'auto' : 'hidden'))};
    overflow-y: hidden;
    flex-grow: 0;
    flex-shrink: 1;
    justify-content: ${({ $contain, $overflow }) => ($contain || !$overflow ? 'center' : 'flex-start')};
    align-items: center;
    background-color: #22242b;
`

const BorderedCanvas = styled.canvas`
    border-left: 1px solid white;
    border-right: 1px solid white;
    flex-shrink: 0;
`

const ZoomControls = styled.div`
    position: absolute;
    top: 12px;
    right: 12px;
    z-index: 2;
    display: none;
    flex-direction: row;
    gap: 8px;

    ${Viewport}:hover & {
        display: flex;
    }
`

const ZoomButton = styled.button<{ $active: boolean }>`
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 36px;
    height: 36px;
    padding: 0;
    border: 1px solid ${({ $active }) => ($active ? '#aaf0d1' : '#555')};
    border-radius: 4px;
    background: ${({ $active }) => ($active ? '#2a3a34' : '#1a1c24')};
    color: ${({ $active }) => ($active ? '#aaf0d1' : '#e1e4e6')};
    cursor: pointer;
    font-size: 18px;
    line-height: 1;

    &:hover {
        border-color: #aaf0d1;
        color: #aaf0d1;
    }
`

export type CanvasRenderState =
    | { status: 'loading'; violations: LayoutViolation[] }
    | { status: 'ready'; violations: LayoutViolation[] }
    | { status: 'error'; violations: LayoutViolation[]; error: string }

interface CanvasProps {
    prepullRotation: Action[]
    rotation: Action[]
    title: string
    jobName: string
    jobIcon: string
    level: number
    expansion: string
    patch: string
    useBalanceLogo: boolean
    rowCount?: number
    rowSpacing?: number | null
    // When false, show the bitmap at 1:1 (no CSS fit). Used by the render harness.
    enableDisplayFit?: boolean
    onRenderStateChange?: (state: CanvasRenderState) => void
}

const waitForFonts = async (): Promise<void> => {
    if (!document.fonts) return
    await Promise.all([
        document.fonts.load(styles.fonts.label),
        document.fonts.load(styles.fonts.pullTime),
        document.fonts.load(styles.fonts.pullLabel),
        document.fonts.load(styles.fonts.title),
        document.fonts.load(styles.fonts.subtitle),
        document.fonts.load(styles.fonts.url),
        document.fonts.ready,
    ])
}

const Canvas = forwardRef<HTMLCanvasElement, CanvasProps>((props, ref) => {
    const {
        prepullRotation,
        rotation,
        title,
        jobName,
        jobIcon,
        level,
        expansion,
        patch,
        useBalanceLogo,
        rowCount = 1,
        rowSpacing = null,
        enableDisplayFit = true,
        onRenderStateChange,
    } = props
    const { t } = useTranslation()
    const pullLabel = t('canvas.pull')
    const levelPrefix = t('canvas.levelPrefix')
    const patchLabel = t('canvas.patch')
    const innerRef = useRef<HTMLCanvasElement>(null)
    const viewportRef = useRef<HTMLDivElement>(null)
    const generation = useRef(0)
    const [naturalSize, setNaturalSize] = useState<{ width: number; height: number }>({
        width: styles.widthInitial,
        height: styles.height,
    })
    const [renderStatus, setRenderStatus] = useState<CanvasRenderState['status']>('loading')
    const [renderError, setRenderError] = useState('')
    // false = scale to pane height (default); true = fit the whole canvas in the pane
    const [fitToWindow, setFitToWindow] = useState(false)
    const [viewportSize, setViewportSize] = useState({ width: 0, height: 0 })

    useImperativeHandle(ref, () => innerRef.current!, [])

    useEffect(() => {
        if (!enableDisplayFit) return
        const element = viewportRef.current
        if (!element) return

        const updateSize = () => {
            setViewportSize({
                width: element.clientWidth,
                height: element.clientHeight,
            })
        }
        updateSize()

        const observer = new ResizeObserver(updateSize)
        observer.observe(element)
        return () => observer.disconnect()
    }, [enableDisplayFit])

    useEffect(() => {
        const canvas = innerRef.current
        if (!canvas) return
        const currentGeneration = ++generation.current
        const abortController = new AbortController()
        const loadingState: CanvasRenderState = { status: 'loading', violations: [] }
        setRenderStatus('loading')
        setRenderError('')
        onRenderStateChange?.(loadingState)

        const render = async () => {
            await waitForFonts()
            if (abortController.signal.aborted || currentGeneration !== generation.current) return
            const context = canvas.getContext('2d')
            if (!context) throw new Error('Canvas 2D rendering is unavailable.')

            const measurer = new CanvasTextMeasurer(context)
            const layoutInput = {
                prepullRotation,
                rotation,
                title,
                jobName,
                jobIcon,
                level,
                expansion,
                patch,
                useBalanceLogo,
                pullLabel,
                levelPrefix,
                patchLabel,
                rowCount,
                rowSpacing,
            }

            const plan = layoutInfographic(layoutInput, measurer)
            const violations = auditRenderPlan(plan)
            const images = await loadRenderImages(plan.requiredImages, abortController.signal)
            if (abortController.signal.aborted || currentGeneration !== generation.current) return

            // Paint the audited geometry directly; CSS scales display only.
            canvas.width = plan.width
            canvas.height = plan.height
            paintRenderPlan(canvas.getContext('2d')!, plan, images)
            setNaturalSize({ width: plan.width, height: plan.height })
            const readyState = { status: 'ready', violations } as const
            setRenderStatus('ready')
            onRenderStateChange?.(readyState)
        }

        render().catch(error => {
            if (abortController.signal.aborted || currentGeneration !== generation.current) return
            const message = error instanceof Error ? error.message : 'The infographic could not be rendered.'
            const errorState: CanvasRenderState = { status: 'error', violations: [], error: message }
            setRenderStatus('error')
            setRenderError(message)
            onRenderStateChange?.(errorState)
        })

        return () => abortController.abort()
    }, [
        prepullRotation,
        rotation,
        title,
        jobName,
        jobIcon,
        level,
        expansion,
        patch,
        useBalanceLogo,
        rowCount,
        rowSpacing,
        onRenderStateChange,
        pullLabel,
        levelPrefix,
        patchLabel,
    ])

    const displayScale = (() => {
        if (!enableDisplayFit) return 1
        if (viewportSize.width <= 0 || viewportSize.height <= 0 || naturalSize.height <= 0) {
            return 1
        }
        if (fitToWindow) {
            return Math.min(
                viewportSize.width / naturalSize.width,
                viewportSize.height / naturalSize.height,
            )
        }
        return viewportSize.height / naturalSize.height
    })()
    const displayWidth = naturalSize.width * displayScale
    const displayHeight = naturalSize.height * displayScale
    // Without fit, keep intrinsic bitmap size (no CSS width/height) so screenshots stay 1:1.
    const displayStyle = enableDisplayFit
        ? { width: displayWidth, height: displayHeight }
        : undefined
    const overflowsHorizontally = enableDisplayFit
        ? displayWidth > viewportSize.width + 1
        : true

    return (
        <Viewport ref={viewportRef}>
            <CanvasContainer $overflow={overflowsHorizontally} $contain={enableDisplayFit && fitToWindow}>
                <BorderedCanvas
                    ref={innerRef}
                    width={styles.widthInitial}
                    height={styles.height}
                    style={displayStyle}
                    data-render-state={renderStatus}
                    data-render-error={renderError || undefined}
                />
            </CanvasContainer>
            {enableDisplayFit && (
                <ZoomControls>
                    <ZoomButton
                        type="button"
                        $active={fitToWindow}
                        aria-label={t('canvas.fitToWindow')}
                        title={t('canvas.fitToWindow')}
                        onClick={() => setFitToWindow(true)}
                    >
                        <CompressOutlined />
                    </ZoomButton>
                    <ZoomButton
                        type="button"
                        $active={!fitToWindow}
                        aria-label={t('canvas.fitToHeight')}
                        title={t('canvas.fitToHeight')}
                        onClick={() => setFitToWindow(false)}
                    >
                        <ExpandOutlined />
                    </ZoomButton>
                </ZoomControls>
            )}
        </Viewport>
    )
})

Canvas.displayName = 'Canvas'

export { Canvas }
