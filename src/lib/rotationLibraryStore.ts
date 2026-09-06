import type { Action, Status } from '../components/Canvas/types'
import { en } from '../messages/en'

const STORAGE_KEY = 'mint-leaf-rotations'
export const STORE_VERSION = 1 as const

export type LibraryMigration = (data: unknown) => unknown

// Schema changes: bump STORE_VERSION and set migrations[previousVersion] to a function
// that upgrades previousVersion -> previousVersion + 1.
// Example when moving to version 2: migrations[1] = (data) => { ...; return data }
const migrations: Record<number, LibraryMigration> = {}

export interface RotationRecord {
    id: string
    title: string
    // jobs Record key (e.g. DRK)
    job: string
    expansion: string
    patch: string
    level: number
    rowCount: number
    rowSpacing: number | null
    prepullRotation: Action[]
    rotation: Action[]
}

export interface RotationLibraryStore {
    version: typeof STORE_VERSION
    activeId: string
    records: RotationRecord[]
}

// Create an empty rotation record with a fresh id.
export const createEmptyRecord = (options?: {
    title?: string
    expansion?: string
}): RotationRecord => ({
    id: crypto.randomUUID(),
    title: options?.title ?? en.defaults.rotationTitle,
    job: 'DRK',
    expansion: options?.expansion ?? en.defaults.expansion,
    patch: '7.4',
    level: 100,
    rowCount: 1,
    rowSpacing: null,
    prepullRotation: [],
    rotation: [],
})

const createDefaultStore = (emptyOptions?: {
    title?: string
    expansion?: string
}): RotationLibraryStore => {
    const record = createEmptyRecord(emptyOptions)
    return {
        version: STORE_VERSION,
        activeId: record.id,
        records: [record],
    }
}

const isStatus = (value: unknown): value is Status => {
    if (!value || typeof value !== 'object') {
        return false
    }
    const status = value as Record<string, unknown>
    return (
        typeof status['id'] === 'string'
        && typeof status['name'] === 'string'
        && typeof status['imageSrc'] === 'string'
        && typeof status['color'] === 'string'
        && typeof status['applicationDelay'] === 'number'
        && typeof status['duration'] === 'number'
    )
}

const isAction = (value: unknown): value is Action => {
    if (!value || typeof value !== 'object') {
        return false
    }
    const action = value as Record<string, unknown>
    if (typeof action['id'] !== 'string' || typeof action['name'] !== 'string') {
        return false
    }
    if (typeof action['imageSrc'] !== 'string') {
        return false
    }
    if (typeof action['instanceId'] !== 'string' || action['instanceId'] === '') {
        return false
    }
    if (action['prepull'] !== undefined && typeof action['prepull'] !== 'number') {
        return false
    }
    if (action['statusApplied'] !== undefined && !isStatus(action['statusApplied'])) {
        return false
    }

    if (action['type'] === 'gcd') {
        if (action['recastTime'] !== undefined && typeof action['recastTime'] !== 'number') {
            return false
        }
        if (action['castTime'] !== undefined && typeof action['castTime'] !== 'number') {
            return false
        }
        return true
    }

    if (action['type'] === 'ogcd') {
        if (action['lateWeave'] !== undefined && typeof action['lateWeave'] !== 'boolean') {
            return false
        }
        return true
    }

    return false
}

const isActionArray = (value: unknown): value is Action[] =>
    Array.isArray(value) && value.every(isAction)

// Parse one rotation record from untrusted JSON.
// idMode 'required': keep the payload id (localStorage).
// idMode 'mint': ignore any payload id and assign a new one (clipboard import).
export const parseRotationRecord = (
    raw: unknown,
    idMode: 'required' | 'mint',
): RotationRecord | null => {
    if (!raw || typeof raw !== 'object') {
        return null
    }

    const record = raw as Record<string, unknown>
    const id = idMode === 'mint'
        ? crypto.randomUUID()
        : (typeof record['id'] === 'string' && record['id'] !== '' ? record['id'] : null)
    if (id === null) {
        return null
    }

    if (typeof record['title'] !== 'string') {
        return null
    }
    if (typeof record['job'] !== 'string') {
        return null
    }
    if (typeof record['expansion'] !== 'string') {
        return null
    }
    if (typeof record['patch'] !== 'string') {
        return null
    }
    if (typeof record['level'] !== 'number' || !Number.isFinite(record['level'])) {
        return null
    }
    if (typeof record['rowCount'] !== 'number' || !Number.isFinite(record['rowCount'])) {
        return null
    }
    if (record['rowSpacing'] !== null && typeof record['rowSpacing'] !== 'number') {
        return null
    }
    if (!isActionArray(record['prepullRotation']) || !isActionArray(record['rotation'])) {
        return null
    }

    return {
        id,
        title: record['title'],
        job: record['job'],
        expansion: record['expansion'],
        patch: record['patch'],
        level: record['level'],
        rowCount: record['rowCount'],
        rowSpacing: record['rowSpacing'] as number | null,
        prepullRotation: record['prepullRotation'],
        rotation: record['rotation'],
    }
}

// Validate localStorage JSON. Returns null when the payload is unusable.
const parseStore = (
    raw: unknown,
    expectedVersion: number = STORE_VERSION,
): RotationLibraryStore | null => {
    if (!raw || typeof raw !== 'object') {
        return null
    }

    const candidate = raw as Record<string, unknown>
    if (candidate['version'] !== expectedVersion) {
        return null
    }
    if (typeof candidate['activeId'] !== 'string' || candidate['activeId'] === '') {
        return null
    }
    if (!Array.isArray(candidate['records'])) {
        return null
    }

    const records: RotationRecord[] = []
    for (const item of candidate['records']) {
        const record = parseRotationRecord(item, 'required')
        if (!record) {
            return null
        }
        records.push(record)
    }

    if (records.length === 0) {
        return null
    }

    const activeId = candidate['activeId']
    if (!records.some((record) => record.id === activeId)) {
        return null
    }

    return {
        version: expectedVersion as typeof STORE_VERSION,
        activeId,
        records,
    }
}

// Run version upgrades until targetVersion. Returns null when the data cannot be migrated.
export const migrateLibraryData = (
    raw: unknown,
    options?: {
        targetVersion?: number
        migrations?: Record<number, LibraryMigration>
    },
): { data: unknown; migrated: boolean } | null => {
    if (!raw || typeof raw !== 'object') {
        return null
    }

    const candidate = raw as Record<string, unknown>
    if (typeof candidate['version'] !== 'number' || !Number.isFinite(candidate['version'])) {
        return null
    }

    const targetVersion = options?.targetVersion ?? STORE_VERSION
    const steps = options?.migrations ?? migrations
    let version = candidate['version']
    if (version > targetVersion) {
        return null
    }

    let data: unknown = raw
    let migrated = false
    while (version < targetVersion) {
        const step = steps[version]
        if (!step) {
            return null
        }
        data = step(data)
        version += 1
        migrated = true
        if (!data || typeof data !== 'object') {
            return null
        }
        const next = data as Record<string, unknown>
        next['version'] = version
        data = next
    }

    return { data, migrated }
}

export type LoadRotationLibraryOptions = {
    targetVersion?: number
    migrations?: Record<number, LibraryMigration>
}

// Load the rotation library from localStorage. Missing or invalid data becomes one empty record.
// Optional migrate options exist so tests can inject steps; production callers omit them.
export const loadRotationLibrary = (
    emptyOptions?: {
        title?: string
        expansion?: string
    },
    loadOptions?: LoadRotationLibraryOptions,
): RotationLibraryStore => {
    if (typeof window === 'undefined') {
        return createDefaultStore(emptyOptions)
    }

    const targetVersion = loadOptions?.targetVersion ?? STORE_VERSION

    try {
        const stored = localStorage.getItem(STORAGE_KEY)
        if (!stored) {
            const initial = createDefaultStore(emptyOptions)
            saveRotationLibrary(initial)
            return initial
        }

        const migrated = migrateLibraryData(JSON.parse(stored) as unknown, loadOptions)
        if (!migrated) {
            console.error('Invalid rotation library in local storage; recreating empty store')
            const initial = createDefaultStore(emptyOptions)
            saveRotationLibrary(initial)
            return initial
        }

        const parsed = parseStore(migrated.data, targetVersion)
        if (!parsed) {
            console.error('Invalid rotation library in local storage; recreating empty store')
            const initial = createDefaultStore(emptyOptions)
            saveRotationLibrary(initial)
            return initial
        }

        if (migrated.migrated) {
            saveRotationLibrary(parsed)
        }

        return parsed
    } catch (error) {
        console.error('Error retrieving rotation library from local storage:', error)
        const initial = createDefaultStore(emptyOptions)
        saveRotationLibrary(initial)
        return initial
    }
}

// Persist the rotation library to localStorage.
export const saveRotationLibrary = (store: RotationLibraryStore): void => {
    if (typeof window === 'undefined') {
        return
    }

    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(store))
    } catch (error) {
        console.error('Error saving rotation library to local storage:', error)
    }
}

// Return the active record, or the first record, or a newly created empty one.
export const getActiveRecord = (store: RotationLibraryStore): RotationRecord => {
    const active = store.records.find((record) => record.id === store.activeId)
    if (active) {
        return active
    }
    const first = store.records[0]
    if (first) {
        return first
    }
    return createEmptyRecord()
}

// Replace a record in place by id. Array order is preserved.
export const upsertRecord = (
    store: RotationLibraryStore,
    record: RotationRecord,
): RotationLibraryStore => {
    const index = store.records.findIndex((candidate) => candidate.id === record.id)
    if (index < 0) {
        return store
    }
    const records = [...store.records]
    records[index] = record
    return { ...store, records }
}

// Prepend a record and make it active.
export const prependRecord = (
    store: RotationLibraryStore,
    record: RotationRecord,
): RotationLibraryStore => ({
    version: STORE_VERSION,
    activeId: record.id,
    records: [record, ...store.records],
})

// Delete a record. If the active one is removed, activate the first remaining record or create an empty one.
export const deleteRecord = (
    store: RotationLibraryStore,
    recordId: string,
    emptyOptions?: { title?: string; expansion?: string },
): RotationLibraryStore => {
    const records = store.records.filter((record) => record.id !== recordId)
    if (records.length === 0) {
        const empty = createEmptyRecord(emptyOptions)
        return {
            version: STORE_VERSION,
            activeId: empty.id,
            records: [empty],
        }
    }

    const activeId =
        store.activeId === recordId
            ? (records[0]?.id ?? store.activeId)
            : store.activeId

    return {
        version: STORE_VERSION,
        activeId,
        records,
    }
}

// Apply a list reorder. activeId is unchanged.
export const reorderRecords = (
    store: RotationLibraryStore,
    fromIndex: number,
    toIndex: number,
): RotationLibraryStore => {
    if (
        fromIndex === toIndex
        || fromIndex < 0
        || toIndex < 0
        || fromIndex >= store.records.length
        || toIndex >= store.records.length
    ) {
        return store
    }

    const records = [...store.records]
    const [moved] = records.splice(fromIndex, 1)
    if (!moved) {
        return store
    }
    records.splice(toIndex, 0, moved)
    return { ...store, records }
}
