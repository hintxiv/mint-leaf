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
    const entries = await Promise.all(Array.from(new Set(sources)).map(async source => {
        if (signal?.aborted) throw new DOMException('Render superseded', 'AbortError')
        let pending = imageCache.get(source)
        if (!pending) {
            pending = decodeImage(source)
            imageCache.set(source, pending)
            pending.catch(() => imageCache.delete(source))
            if (imageCache.size > 256) imageCache.delete(imageCache.keys().next().value!)
        }
        const loaded = await pending
        if (signal?.aborted) throw new DOMException('Render superseded', 'AbortError')
        return [source, loaded] as const
    }))
    return new Map(entries)
}

const imageCache = new Map<string, Promise<HTMLImageElement>>()

const decodeImage = async (source: string): Promise<HTMLImageElement> => {
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
    return loaded
}
