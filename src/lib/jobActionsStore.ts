import { JobListAction } from '@/app/api'
import { Locale } from '@/context/LanguageContext'

const JOB_ACTIONS_KEY = 'mint-leaf-job-actions'

// Version of the job-actions localStorage entry shape / semantics.
// Changing this value forces a refresh: mismatched cache entries are ignored
// and the list is fetched again.
export const JOB_ACTIONS_CACHE_FORMAT = 4

// Cache TTL (7 days). After a patch, use manual reload.
export const JOB_ACTIONS_CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000

interface StoredJobAction extends Omit<JobListAction, 'icon'> {
    iconUrl: string | null
}

export interface JobActionsCacheEntry {
    fetchedAt: number
    // Local cache layout version; see JOB_ACTIONS_CACHE_FORMAT
    format?: number
    version?: string
    schema?: string
    actions: StoredJobAction[]
}

interface JobActionsStore {
    [cacheKey: string]: JobActionsCacheEntry
}

// Build a cache key from job abbreviation and locale.
// Locale is included because action names are language-dependent.
export const buildJobActionsCacheKey = (jobAbbreviation: string, locale: Locale): string =>
    `${jobAbbreviation}:${locale}`

const readStore = (): JobActionsStore => {
    if (typeof window === 'undefined') {
        return {}
    }

    try {
        const stored = localStorage.getItem(JOB_ACTIONS_KEY)
        if (!stored) {
            return {}
        }
        return JSON.parse(stored) as JobActionsStore
    } catch (error) {
        console.error('Error retrieving job actions from local storage:', error)
        return {}
    }
}

const writeStore = (store: JobActionsStore): void => {
    if (typeof window === 'undefined') {
        return
    }

    try {
        localStorage.setItem(JOB_ACTIONS_KEY, JSON.stringify(store))
    } catch (error) {
        console.error('Error saving job actions to local storage:', error)
    }
}

const toJobListActions = (actions: StoredJobAction[]): JobListAction[] =>
    actions.map(({ iconUrl, ...action }) => ({
        ...action,
        icon: iconUrl ? new URL(iconUrl) : null,
    }))

const toStoredActions = (actions: JobListAction[]): StoredJobAction[] =>
    actions.map(({ icon, ...action }) => ({
        ...action,
        iconUrl: icon ? icon.toString() : null,
    }))

// Whether a cache entry is still within the TTL.
export const isCacheFresh = (
    entry: JobActionsCacheEntry,
    now: number = Date.now(),
): boolean => now - entry.fetchedAt < JOB_ACTIONS_CACHE_TTL_MS

// Read the cache entry for the given job and locale.
// Returns null when missing or when the entry format is outdated.
// Expired entries are still returned for display.
export const getCachedJobActions = (
    jobAbbreviation: string,
    locale: Locale,
): { actions: JobListAction[]; entry: JobActionsCacheEntry; fresh: boolean } | null => {
    const key = buildJobActionsCacheKey(jobAbbreviation, locale)
    const entry = readStore()[key]
    if (!entry) {
        return null
    }
    if (entry.format !== JOB_ACTIONS_CACHE_FORMAT) {
        return null
    }

    return {
        actions: toJobListActions(entry.actions),
        entry,
        fresh: isCacheFresh(entry),
    }
}

// Overwrite the cache entry for the given job and locale.
export const setCachedJobActions = (
    jobAbbreviation: string,
    locale: Locale,
    actions: JobListAction[],
    meta?: { version?: string; schema?: string },
): void => {
    const key = buildJobActionsCacheKey(jobAbbreviation, locale)
    const store = readStore()
    const entry: JobActionsCacheEntry = {
        fetchedAt: Date.now(),
        format: JOB_ACTIONS_CACHE_FORMAT,
        actions: toStoredActions(actions),
    }
    if (meta?.version !== undefined) {
        entry.version = meta.version
    }
    if (meta?.schema !== undefined) {
        entry.schema = meta.schema
    }
    store[key] = entry
    writeStore(store)
}
