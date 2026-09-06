import type { DataAction } from '@/app/api'
import { getCachedJobActions } from './jobActionsStore'
import type { Locale } from '@/context/LanguageContext'
import type { Action, Status } from '@/components/Canvas/types'
import { catalogs, catalogStatuses, findCatalogAction, matchingGcdGroup } from '@/data/actionCatalog'
import { buffDetailsToStatus, getStoredCustomAction, getStoredCustomActions } from './customActionsStore'

export interface ActionOverrides {
    name?: string
    type?: 'gcd' | 'ogcd'
    recastTime?: number
    castTime?: number
    lateWeave?: boolean
    statusesApplied?: Status[]
}
export interface Preferences {
    version: 1
    actions: Record<string, ActionOverrides>
    sharedGcds: Record<string, number>
    recastGroups?: Record<string, string>
}
export type ActionEdit = 'edit' | 'share' | 'specific' | 'reset-recast' | 'reset'
export const PREFERENCES_KEY = 'mint-leaf-action-preferences-v1'
const emptyPreferences = (): Preferences => ({ version: 1, actions: {}, sharedGcds: {} })
const actionKey = (job: string, id: string) => `${job}:${id}`

export const readPreferences = (): Preferences => {
    try {
        const value = JSON.parse(localStorage.getItem(PREFERENCES_KEY) ?? 'null')
        if (value?.version === 1 && value.actions && value.sharedGcds) {
            // Merge legacy speed-category keys into base-recast groups without mount writes.
            for (const key of Object.keys(value.sharedGcds).sort()) {
                const group = key.split(':').slice(0, 2).join(':')
                if (group !== key) {
                    value.sharedGcds[group] ??= value.sharedGcds[key]
                    delete value.sharedGcds[key]
                }
            }
            return value
        }
    } catch { /* Storage is optional (SSR, private browsing, corrupt entries). */ }
    return emptyPreferences()
}
const writePreferences = (preferences: Preferences) => {
    try { localStorage.setItem(PREFERENCES_KEY, JSON.stringify(preferences)) } catch { /* Best effort. */ }
}

// Old entries were complete snapshots. Treat every saved field conservatively as explicit.
export const legacyOverrides = (id: string): ActionOverrides => {
    const saved = getStoredCustomAction(id)
    if (!saved) return {}
    const status = saved.appliesBuff ? buffDetailsToStatus(saved.buffDetails) : undefined
    return {
        type: saved.isGCD ? 'gcd' : 'ogcd',
        ...(saved.recastTime !== undefined ? { recastTime: saved.recastTime } : {}),
        ...(saved.castTime !== undefined ? { castTime: saved.castTime } : {}),
        ...(saved.lateWeave !== undefined ? { lateWeave: saved.lateWeave } : {}),
        statusesApplied: saved.statusesApplied ?? (status ? [{ ...status, enabled: true }] : []),
    }
}
const overridesFor = (preferences: Preferences, job: string, id: string): ActionOverrides =>
    preferences.actions[actionKey(job, id)] ?? legacyOverrides(id)

export const dataActionToDefaultAction = (
    data: DataAction,
    job = '',
    locale: Locale = 'en',
    preferences = readPreferences(),
): Action => {
    const definition = findCatalogAction(job, data.id)
    const catalog = catalogs[job]
    const overrides = overridesFor(preferences, job, data.id)
    const legacy = getStoredCustomAction(data.id)
    const timing = definition ?? data
    const group = matchingGcdGroup(job, timing)
    const statuses: Status[] = (definition?.statuses ?? []).flatMap(association => {
        const status = catalogStatuses.find(item => item.id === association.statusId)
        return status ? [{
            id: String(status.id), name: status.names[locale], imageSrc: status.icon,
            color: '#74d6b4', enabled: association.defaultEnabled ?? true,
            duration: association.durationMs / 1000,
            applicationDelay: (association.applicationDelayMs ?? 0) / 1000,
        }] : []
    })
    const common = {
        id: data.id,
        name: overrides.name ?? data.name ?? definition?.names[locale] ?? legacy?.name ?? '',
        imageSrc: data.icon?.toString() ?? legacy?.iconUrl ?? '',
        instanceId: crypto.randomUUID(),
        statusesApplied: structuredClone(overrides.statusesApplied ?? statuses).map(status => {
            const presentation = catalogStatuses.find(item => String(item.id) === status.id)
            return presentation ? { ...status, name: presentation.names[locale], imageSrc: presentation.icon } : status
        }),
        defaults: {
            job, catalogRevision: definition ? catalog?.revision : undefined, gcdGroup: group,
            originalName: data.name ?? definition?.names[locale] ?? legacy?.name ?? '',
            baseGcdRecastMs: timing.baseGcdRecastMs, baseCastTimeMs: timing.baseCastTimeMs,
            originalKind: timing.kind,
            recastSource: overrides.recastTime !== undefined ? 'action' as const : 'inherited' as const,
        },
    }
    if ((overrides.type ?? timing.kind ?? 'gcd') === 'ogcd') {
        return { ...common, type: 'ogcd', lateWeave: overrides.lateWeave ?? false }
    }
    return {
        ...common, type: 'gcd',
        recastTime: overrides.recastTime ?? (group ? preferences.sharedGcds[group] : undefined)
            ?? (timing.baseGcdRecastMs !== undefined ? timing.baseGcdRecastMs / 1000 : 2.5),
        castTime: overrides.castTime ?? (timing.baseCastTimeMs !== undefined ? timing.baseCastTimeMs / 1000 : 0),
    }
}

export const isSharingRecast = (action: Action): boolean =>
    action.type === 'gcd' && !!action.defaults?.gcdGroup && action.defaults.recastSource === 'inherited'

export const applySharedRecast = (actions: Action[], group: string, value: number): Action[] =>
    actions.map(action => action.type === 'gcd' && action.defaults?.gcdGroup === group
        ? { ...action, recastTime: value, defaults: { ...action.defaults, recastSource: 'inherited' } } : action)

// Called only from explicit editor events. Prepull and occurrence identities are never defaults.
export const saveActionEdit = (previous: Action, next: Action, job: string, locale: Locale, edit: ActionEdit = 'edit') => {
    const preferences = readPreferences()
    const scope = previous.defaults?.job || job
    const key = actionKey(scope, next.id)
    const overrides = { ...overridesFor(preferences, scope, next.id) }
    const group = previous.defaults?.gcdGroup ?? matchingGcdGroup(scope, findCatalogAction(scope, next.id))
    let shared: { group: string; value: number } | undefined
    const identity = { id: next.id, name: next.defaults?.originalName ?? findCatalogAction(scope, next.id)?.names[locale] ?? next.name,
        kind: next.defaults?.originalKind, baseGcdRecastMs: next.defaults?.baseGcdRecastMs, baseCastTimeMs: next.defaults?.baseCastTimeMs, icon: next.imageSrc ? new URL(next.imageSrc, 'http://localhost') : null }
    if (edit === 'reset' || edit === 'reset-recast') {
        if (edit === 'reset') {
            preferences.actions[key] = {}
            // An empty entry masks legacy settings; custom identities remain encoded in their IDs.
        } else {
            delete overrides.recastTime
            preferences.actions[key] = overrides
        }
        const inherited = dataActionToDefaultAction(identity, scope, locale, preferences)
        next = edit === 'reset' ? { ...inherited, instanceId: next.instanceId, prepull: next.prepull }
            : next.type === 'gcd' && inherited.type === 'gcd'
                ? { ...next, recastTime: inherited.recastTime, defaults: inherited.defaults }
                : next
    } else {
        for (const field of ['name', 'type', 'castTime', 'lateWeave', 'statusesApplied'] as const) {
            const before = previous[field as keyof Action]
            const after = next[field as keyof Action]
            if (JSON.stringify(before) !== JSON.stringify(after)) {
                Object.assign(overrides, { [field]: after })
            }
        }
        if (next.type === 'gcd') {
            const value = next.recastTime ?? 2.5
            if (edit === 'share' && group) {
                delete overrides.recastTime
                next = { ...next, defaults: { ...next.defaults, job: scope, gcdGroup: group, recastSource: 'inherited' } }
                shared = { group, value }
            } else if (edit === 'specific' || previous.type !== 'gcd' || previous.recastTime !== next.recastTime) {
                if (previous.type === 'gcd' && edit !== 'specific' && isSharingRecast(next) && group) {
                    shared = { group, value }
                } else {
                    overrides.recastTime = value
                    next = { ...next, defaults: { ...next.defaults, job: scope, gcdGroup: group, recastSource: 'action' } }
                }
            }
        }
        preferences.actions[key] = overrides
    }
    if (group) preferences.recastGroups = { ...preferences.recastGroups, [key]: group }
    if (shared) {
        preferences.sharedGcds[shared.group] = shared.value
        const cachedActions = getCachedJobActions(scope, locale)?.actions ?? []
        const groupFor = (id: string) => matchingGcdGroup(scope,
            findCatalogAction(scope, id) ?? cachedActions.find(action => action.id === id))
        // Preserve other legacy fields, while removing recast exceptions in the shared group.
        for (const id of Object.keys(getStoredCustomActions())) {
            const savedKey = actionKey(scope, id)
            if (!preferences.actions[savedKey] && groupFor(id) === shared.group) {
                preferences.actions[savedKey] = legacyOverrides(id)
            }
        }
        for (const [savedKey, saved] of Object.entries(preferences.actions)) {
            const [savedJob, savedId] = savedKey.split(':')
            const savedGroup = preferences.recastGroups?.[savedKey] ?? (savedJob === scope ? groupFor(savedId) : matchingGcdGroup(savedJob, findCatalogAction(savedJob, savedId)))
            if (savedGroup === shared.group) delete saved.recastTime
        }
    }
    writePreferences(preferences)
    return { action: next, shared }
}
