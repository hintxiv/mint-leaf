// Encode both fields together so URL/name hyphens, commas and brackets cannot become delimiters.
export const encodeCustomId = (icon: string, name: string): string =>
    `custom-v2:${encodeURIComponent(JSON.stringify([icon, name]))}`

export const decodeCustomId = (id: string): { name: string; icon: URL } => {
    if (id.startsWith('custom-v2:')) {
        const value: unknown = JSON.parse(decodeURIComponent(id.slice('custom-v2:'.length)))
        if (!Array.isArray(value) || value.length !== 2 || value.some(item => typeof item !== 'string')) throw new Error('Invalid custom identity')
        return { name: value[1], icon: new URL(value[0]) }
    }
    // Existing text used custom-<URL>-<name>; retain the historical split for old exports.
    const [, icon, name] = decodeURI(id).split('-')
    return { name, icon: new URL(icon) }
}
