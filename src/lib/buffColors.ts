import type { Action } from '@/components/Canvas/types'
import { styles } from '@/components/Canvas/styles'
import { loadRenderImages } from './iconImages'

export const FALLBACK_BUFF_COLOR = '#74d6b4'
const MIN_CONTRAST = 3
const rgb = (hex: string): number[] => [1, 3, 5].map(offset => parseInt(hex.slice(offset, offset + 2), 16) / 255)
const hex = (channels: number[]): string => '#' + channels.map(channel => Math.round(channel * 255).toString(16).padStart(2, '0')).join('')
const luminance = (color: string): number => rgb(color)
    .map(channel => channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4)
    .reduce((sum, channel, index) => sum + channel * [0.2126, 0.7152, 0.0722][index], 0)

export const contrastRatio = (foreground: string, background: string): number => {
    const a = luminance(foreground)
    const b = luminance(background)
    return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05)
}

// Change HSL lightness only, retaining the source hue and saturation.
export const readableBuffColor = (color: string, background = styles.colors.background): string => {
    if (contrastRatio(color, background) >= MIN_CONTRAST) return color
    const channels = rgb(color)
    const lightness = (Math.max(...channels) + Math.min(...channels)) / 2
    const chroma = 1 - Math.abs(2 * lightness - 1)
    const atLightness = (value: number) => hex(channels.map(channel => {
        const ratio = chroma === 0 ? 0 : (1 - Math.abs(2 * value - 1)) / chroma
        return Math.min(1, Math.max(0, value + (channel - lightness) * ratio))
    }))
    let lower = lightness
    let upper = 1
    for (let i = 0; i < 24; i++) {
        const middle = (lower + upper) / 2
        if (contrastRatio(atLightness(middle), background) >= MIN_CONTRAST) upper = middle
        else lower = middle
    }
    return atLightness(upper)
}

const colors = new Map<string, Promise<string>>()
export const automaticBuffColor = (source: string): Promise<string> => {
    if (!source) return Promise.resolve(FALLBACK_BUFF_COLOR)
    let pending = colors.get(source)
    if (!pending) {
        pending = (async () => {
            const [images, { default: ColorThief }] = await Promise.all([
                loadRenderImages([source]), import('colorthief'),
            ])
            const dominant: number[] | null = new ColorThief().getColor(images.get(source)!, 1)
            return dominant ? readableBuffColor(hex(dominant.map(channel => channel / 255))) : FALLBACK_BUFF_COLOR
        })().catch(() => {
            colors.delete(source)
            return FALLBACK_BUFF_COLOR
        })
        colors.set(source, pending)
        if (colors.size > 256) colors.delete(colors.keys().next().value!)
    }
    return pending
}

export const resolveBuffColors = async (actions: Action[]): Promise<Action[]> => Promise.all(actions.map(async action => ({
    ...action,
    statusesApplied: await Promise.all((action.statusesApplied ?? []).map(async status =>
        status.color === 'auto' && status.enabled !== false
            ? { ...status, color: await automaticBuffColor(status.imageSrc) }
            : status,
    )),
})))
