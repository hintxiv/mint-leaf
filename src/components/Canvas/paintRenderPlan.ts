import { RenderPlan } from './types'

export type DecodedImages = ReadonlyMap<string, CanvasImageSource>

const transparentVersion = (color: string): string =>
    /^#[0-9a-f]{6}$/i.test(color) ? `${color}00` : 'transparent'

const loadableSource = (source: string): string => {
    // Proxy remote icons through Next's same-origin image optimizer. Besides
    // deterministic decoding, this keeps exported canvases origin-clean even
    // when a third-party image host does not emit CORS headers.
    if (/^https?:\/\//i.test(source)) {
        return `/_next/image?url=${encodeURIComponent(source)}&w=640&q=90`
    }
    return source
}

export const loadRenderImages = async (sources: string[], signal?: AbortSignal): Promise<Map<string, HTMLImageElement>> => {
    const entries = await Promise.all(sources.map(async source => {
        if (signal?.aborted) throw new DOMException('Render superseded', 'AbortError')
        const loaded = new Image()
        loaded.crossOrigin = 'anonymous'
        const loadResult = new Promise<void>((resolve, reject) => {
            loaded.addEventListener('load', () => resolve(), { once: true })
            loaded.addEventListener('error', () => reject(new Error(`Unable to load image: ${source}`)), { once: true })
        })
        loaded.src = loadableSource(source)
        await loadResult
        try {
            await loaded.decode()
        } catch {
            // A completed load is drawable even where decode() is unsupported.
        }
        if (signal?.aborted) throw new DOMException('Render superseded', 'AbortError')
        return [source, loaded] as const
    }))
    return new Map(entries)
}

export const paintRenderPlan = (
    context: CanvasRenderingContext2D,
    plan: RenderPlan,
    images: DecodedImages,
): void => {
    context.save()
    context.clearRect(0, 0, plan.width, plan.height)

    plan.primitives.forEach(primitive => {
        switch (primitive.kind) {
            case 'shape':
                context.beginPath()
                context.fillStyle = primitive.color
                context.roundRect(
                    primitive.bounds.x,
                    primitive.bounds.y,
                    primitive.bounds.width,
                    primitive.bounds.height,
                    primitive.radius ?? 0,
                )
                context.fill()
                break
            case 'image': {
                const loaded = images.get(primitive.source)
                if (!loaded) throw new Error(`Render image was not preloaded: ${primitive.source}`)
                context.drawImage(
                    loaded,
                    primitive.bounds.x,
                    primitive.bounds.y,
                    primitive.bounds.width,
                    primitive.bounds.height,
                )
                break
            }
            case 'line':
                if (primitive.points.length < 2) break
                context.beginPath()
                context.moveTo(primitive.points[0].x, primitive.points[0].y)
                primitive.points.slice(1).forEach(point => context.lineTo(point.x, point.y))
                if (primitive.fadeStart || primitive.fadeEnd) {
                    const first = primitive.points[0]
                    const last = primitive.points.at(-1)!
                    const length = Math.hypot(last.x - first.x, last.y - first.y)
                    const fadeFraction = Math.min(0.49, (primitive.fadeLength ?? 8) / Math.max(length, 1))
                    const gradient = context.createLinearGradient(first.x, first.y, last.x, last.y)
                    gradient.addColorStop(0, primitive.fadeStart ? transparentVersion(primitive.color) : primitive.color)
                    if (primitive.fadeStart) gradient.addColorStop(fadeFraction, primitive.color)
                    if (primitive.fadeEnd) gradient.addColorStop(1 - fadeFraction, primitive.color)
                    gradient.addColorStop(1, primitive.fadeEnd ? transparentVersion(primitive.color) : primitive.color)
                    context.strokeStyle = gradient
                } else {
                    context.strokeStyle = primitive.color
                }
                context.lineWidth = primitive.width
                context.stroke()
                break
            case 'text':
                context.font = primitive.font
                context.fillStyle = primitive.color
                context.textAlign = primitive.align
                context.textBaseline = primitive.baseline
                primitive.lines.forEach(textLine => context.fillText(textLine.text, textLine.x, textLine.y))
                break
        }
    })
    context.restore()
}
