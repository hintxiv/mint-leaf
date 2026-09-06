import { getActionByID, getStatusByID } from '@/app/api'
import { Locale } from '@/context/LanguageContext'
import { Action, Status } from '../components/Canvas/types'
import { catalogStatuses } from '@/data/actionCatalog'

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value))
const number = (value: string | undefined, max: number, min = 0): number => {
    if (!value || !/^-?(?:\d+(?:\.\d*)?|\.\d+)$/.test(value) || !Number.isFinite(Number(value))) throw new Error('Invalid timing')
    return clamp(Number(value), min, max)
}

export const rotationToText = (rotation: Action[]): string => rotation.map(action => {
    const prefix = action.prepull !== undefined ? `${action.prepull} ` : ''
    const timing = action.type === 'gcd'
        ? `GCD ${action.recastTime ?? 2.5} ${action.castTime ?? 0}`
        : `oGCD ${action.lateWeave ? 'lateWeave' : 'normal'}`
    const statuses = (action.statusesApplied ?? []).map(status =>
        ` [${status.id} ${status.applicationDelay} ${status.duration} ${status.color}${status.enabled === false ? ' disabled' : ''}]`,
    ).join('')
    return `${prefix}${action.id} ${timing}${statuses}`
}).join('\n')

const parseStatus = async (section: string, language: Locale): Promise<Status> => {
    const tokens = section.trim().split(/[ ,]+/)
    if (tokens.length !== 4 && tokens.length !== 5) throw new Error('Invalid status')
    const [id, delay, duration, color, marker] = tokens
    if ((marker !== undefined && marker !== 'disabled') || !/^#[\da-f]{6}$/i.test(color)) throw new Error('Invalid status settings')
    const applicationDelay = number(delay, 30)
    const durationSeconds = number(duration, 999)
    const bundled = catalogStatuses.find(status => String(status.id) === id)
    const data = bundled ? { name: bundled.names[language], icon: bundled.icon } : await getStatusByID(id, language)
    return { id, name: data.name ?? '', imageSrc: data.icon?.toString() ?? '', color,
        applicationDelay, duration: durationSeconds, enabled: marker !== 'disabled' }
}

const parseLine = async (line: string, language: Locale): Promise<Action> => {
    const start = line.indexOf('[')
    const actionSection = (start < 0 ? line : line.slice(0, start)).trim()
    const statusSection = start < 0 ? '' : line.slice(start)
    // Validate the entire suffix before resolving identities. Stray brackets/text are errors.
    if (!/^(?:\s*\[[^\[\]]+\]\s*)*$/.test(statusSection) || /[\[\]]/.test(actionSection)) throw new Error('Malformed statuses')
    const tokens = actionSection.split(/[ ,]+/)
    let prepull: number | undefined
    if (tokens[0]?.startsWith('-') || (tokens[0] === '0' && tokens[2] && ['GCD', 'oGCD'].includes(tokens[2]))) {
        prepull = number(tokens.shift(), 0, -60)
    }
    const [id, type, timing, cast] = tokens
    if (!id || (type !== 'GCD' && type !== 'oGCD')) throw new Error('Invalid action')
    if (type === 'GCD' ? tokens.length !== 4 : tokens.length !== 3 || !['normal', 'lateWeave'].includes(timing)) throw new Error('Invalid action fields')
    const recastTime = type === 'GCD' ? number(timing, 30) : undefined
    const castTime = type === 'GCD' ? number(cast, 30) : undefined
    const statusesApplied = await Promise.all(Array.from(statusSection.matchAll(/\[([^\[\]]+)\]/g)).map(match => parseStatus(match[1], language)))
    const data = await getActionByID(id, language)
    const base = { id, name: data.name ?? '', imageSrc: data.icon?.toString() ?? '', instanceId: crypto.randomUUID(), prepull, statusesApplied,
        defaults: { job: '', recastSource: 'import' as const } }
    return type === 'GCD' ? { ...base, type: 'gcd', recastTime, castTime }
        : { ...base, type: 'ogcd', lateWeave: timing === 'lateWeave' }
}

export const textToRotation = async (text: string, language: Locale): Promise<Action[] | false> => {
    try { return await Promise.all(text.trim().split('\n').map(line => parseLine(line, language))) }
    catch { return false }
}
