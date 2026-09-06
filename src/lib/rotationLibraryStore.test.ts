import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
    createEmptyRecord,
    deleteRecord,
    getActiveRecord,
    loadRotationLibrary,
    migrateLibraryData,
    prependRecord,
    reorderRecords,
    saveRotationLibrary,
    upsertRecord,
    type LibraryMigration,
    type RotationLibraryStore,
    type RotationRecord,
} from './rotationLibraryStore'

const STORAGE_KEY = 'mint-leaf-rotations'

// Same pattern as jobActionsStore.test.ts for the node test environment
const createMemoryStorage = (): Storage => {
    const map = new Map<string, string>()
    return {
        get length() {
            return map.size
        },
        clear() {
            map.clear()
        },
        getItem(key: string) {
            return map.has(key) ? map.get(key)! : null
        },
        key(index: number) {
            return Array.from(map.keys())[index] ?? null
        },
        removeItem(key: string) {
            map.delete(key)
        },
        setItem(key: string, value: string) {
            map.set(key, value)
        },
    }
}

beforeEach(() => {
    vi.stubGlobal('localStorage', createMemoryStorage())
    vi.stubGlobal('window', globalThis)
})

const sampleRecord = (overrides?: Partial<RotationRecord>): RotationRecord => ({
    id: crypto.randomUUID(),
    title: 'Sample',
    job: 'DRK',
    expansion: 'Dawntrail',
    patch: '7.4',
    level: 100,
    rowCount: 1,
    rowSpacing: null,
    prepullRotation: [],
    rotation: [],
    ...overrides,
})

describe('rotationLibraryStore', () => {
    it('initializes with one empty record and writes it to localStorage', () => {
        const loaded = loadRotationLibrary()
        expect(loaded.version).toBe(1)
        expect(loaded.records).toHaveLength(1)
        expect(loaded.activeId).toBe(loaded.records[0]?.id)
        expect(localStorage.getItem(STORAGE_KEY)).not.toBeNull()
    })

    it('round-trips a saved store through localStorage', () => {
        const first = sampleRecord({ title: 'First' })
        const second = sampleRecord({ title: 'Second', job: 'BLM' })
        const store: RotationLibraryStore = {
            version: 1,
            activeId: second.id,
            records: [first, second],
        }
        saveRotationLibrary(store)

        const loaded = loadRotationLibrary()
        expect(loaded.activeId).toBe(second.id)
        expect(loaded.records).toHaveLength(2)
        expect(loaded.records[1]?.title).toBe('Second')
        expect(loaded.records[1]?.job).toBe('BLM')
    })

    it('recreates an empty store when JSON is corrupt', () => {
        localStorage.setItem(STORAGE_KEY, '{not-json')
        const loaded = loadRotationLibrary()
        expect(loaded.records).toHaveLength(1)
        expect(loaded.activeId).toBe(loaded.records[0]?.id)
    })

    it('recreates an empty store when the version is newer than STORE_VERSION', () => {
        localStorage.setItem(
            STORAGE_KEY,
            JSON.stringify({ version: 99, activeId: 'x', records: [] }),
        )
        const loaded = loadRotationLibrary()
        expect(loaded.version).toBe(1)
        expect(loaded.records).toHaveLength(1)
    })

    it('recreates an empty store when version is missing', () => {
        const record = sampleRecord()
        localStorage.setItem(
            STORAGE_KEY,
            JSON.stringify({ activeId: record.id, records: [record] }),
        )
        const loaded = loadRotationLibrary()
        expect(loaded.version).toBe(1)
        expect(loaded.records).toHaveLength(1)
        expect(loaded.activeId).toBe(loaded.records[0]?.id)
    })

    it('migrateLibraryData upgrades through injected steps and sets version', () => {
        const record = sampleRecord({ title: 'Legacy' })
        const steps: Record<number, LibraryMigration> = {
            1: (data) => {
                if (!data || typeof data !== 'object') {
                    return data
                }
                const current = data as Record<string, unknown>
                return {
                    ...current,
                    notes: 'added-in-v2',
                }
            },
        }

        const result = migrateLibraryData(
            { version: 1, activeId: record.id, records: [record] },
            { targetVersion: 2, migrations: steps },
        )

        expect(result).not.toBeNull()
        expect(result?.migrated).toBe(true)
        const data = result?.data as Record<string, unknown>
        expect(data['version']).toBe(2)
        expect(data['notes']).toBe('added-in-v2')
        expect(data['activeId']).toBe(record.id)
    })

    it('migrateLibraryData returns migrated false when already at target version', () => {
        const record = sampleRecord()
        const result = migrateLibraryData(
            { version: 1, activeId: record.id, records: [record] },
        )
        expect(result).not.toBeNull()
        expect(result?.migrated).toBe(false)
        expect((result?.data as Record<string, unknown>)['version']).toBe(1)
    })

    it('migrateLibraryData rejects versions above the target', () => {
        expect(migrateLibraryData({ version: 99, activeId: 'x', records: [] })).toBeNull()
    })

    it('migrateLibraryData returns null when a required step is missing', () => {
        const record = sampleRecord()
        expect(
            migrateLibraryData(
                { version: 0, activeId: record.id, records: [record] },
                { targetVersion: 1, migrations: {} },
            ),
        ).toBeNull()
    })

    it('loadRotationLibrary migrates old data and writes the current version back', () => {
        const record = sampleRecord({ title: 'FromV0' })
        localStorage.setItem(
            STORAGE_KEY,
            JSON.stringify({
                version: 0,
                activeId: record.id,
                records: [record],
            }),
        )

        const loaded = loadRotationLibrary(undefined, {
            migrations: {
                0: (data) => data,
            },
        })

        expect(loaded.version).toBe(1)
        expect(loaded.records).toHaveLength(1)
        expect(loaded.records[0]?.id).toBe(record.id)
        expect(loaded.records[0]?.title).toBe('FromV0')
        expect(loaded.activeId).toBe(record.id)

        const written = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null') as {
            version: number
            records: RotationRecord[]
        }
        expect(written.version).toBe(1)
        expect(written.records[0]?.title).toBe('FromV0')
    })

    it('loadRotationLibrary recreates an empty store when a migration step is missing', () => {
        const record = sampleRecord({ title: 'Stuck' })
        localStorage.setItem(
            STORAGE_KEY,
            JSON.stringify({
                version: 0,
                activeId: record.id,
                records: [record],
            }),
        )

        const loaded = loadRotationLibrary()
        expect(loaded.version).toBe(1)
        expect(loaded.records).toHaveLength(1)
        expect(loaded.records[0]?.id).not.toBe(record.id)
    })

    it('loadRotationLibrary does not write back when already at STORE_VERSION', () => {
        const record = sampleRecord()
        saveRotationLibrary({
            version: 1,
            activeId: record.id,
            records: [record],
        })
        const before = localStorage.getItem(STORAGE_KEY)
        const setItemSpy = vi.spyOn(localStorage, 'setItem')
        setItemSpy.mockClear()

        const loaded = loadRotationLibrary()
        expect(loaded.activeId).toBe(record.id)
        expect(setItemSpy).not.toHaveBeenCalled()
        expect(localStorage.getItem(STORAGE_KEY)).toBe(before)
    })

    it('recreates an empty store when activeId is missing from records', () => {
        const record = sampleRecord()
        localStorage.setItem(
            STORAGE_KEY,
            JSON.stringify({ version: 1, activeId: 'missing', records: [record] }),
        )
        const loaded = loadRotationLibrary()
        expect(loaded.records).toHaveLength(1)
        expect(loaded.activeId).toBe(loaded.records[0]?.id)
    })

    it('upsertRecord updates contents without changing list order', () => {
        const first = sampleRecord({ title: 'A' })
        const second = sampleRecord({ title: 'B' })
        const store: RotationLibraryStore = {
            version: 1,
            activeId: first.id,
            records: [first, second],
        }
        const updated = upsertRecord(store, { ...first, title: 'A2', patch: '7.5' })
        expect(updated.records[0]?.id).toBe(first.id)
        expect(updated.records[0]?.title).toBe('A2')
        expect(updated.records[0]?.patch).toBe('7.5')
        expect(updated.records[1]?.id).toBe(second.id)
    })

    it('prependRecord inserts at the front and switches activeId', () => {
        const existing = sampleRecord({ title: 'Old' })
        const store: RotationLibraryStore = {
            version: 1,
            activeId: existing.id,
            records: [existing],
        }
        const created = createEmptyRecord({ title: 'New', expansion: 'Dawntrail' })
        const next = prependRecord(store, created)
        expect(next.activeId).toBe(created.id)
        expect(next.records[0]?.id).toBe(created.id)
        expect(next.records).toHaveLength(2)
    })

    it('deleteRecord activates the first remaining record when active is removed', () => {
        const first = sampleRecord({ title: 'A' })
        const second = sampleRecord({ title: 'B' })
        const store: RotationLibraryStore = {
            version: 1,
            activeId: first.id,
            records: [first, second],
        }
        const next = deleteRecord(store, first.id)
        expect(next.records).toHaveLength(1)
        expect(next.activeId).toBe(second.id)
        expect(getActiveRecord(next).title).toBe('B')
    })

    it('deleteRecord creates an empty record when the last entry is removed', () => {
        const only = sampleRecord({ title: 'Only' })
        const store: RotationLibraryStore = {
            version: 1,
            activeId: only.id,
            records: [only],
        }
        const next = deleteRecord(store, only.id, {
            title: 'Title',
            expansion: 'Dawntrail',
        })
        expect(next.records).toHaveLength(1)
        expect(next.records[0]?.id).not.toBe(only.id)
        expect(next.records[0]?.title).toBe('Title')
        expect(next.records[0]?.expansion).toBe('Dawntrail')
    })

    it('reorderRecords reorders without changing activeId', () => {
        const a = sampleRecord({ title: 'A' })
        const b = sampleRecord({ title: 'B' })
        const c = sampleRecord({ title: 'C' })
        const store: RotationLibraryStore = {
            version: 1,
            activeId: b.id,
            records: [a, b, c],
        }
        const next = reorderRecords(store, 0, 2)
        expect(next.activeId).toBe(b.id)
        expect(next.records.map((record) => record.title)).toEqual(['B', 'C', 'A'])
    })

    it('keeps the other record after edit, switch, and reload', () => {
        const first = loadRotationLibrary()
        const active = getActiveRecord(first)
        const edited = upsertRecord(first, {
            ...active,
            title: 'Opener A',
            rotation: [
                {
                    type: 'gcd',
                    id: '1',
                    instanceId: 'instance-1',
                    name: 'Hard Slash',
                    imageSrc: '/x.png',
                    recastTime: 2.5,
                    castTime: 0,
                },
            ],
        })
        saveRotationLibrary(edited)

        const created = createEmptyRecord({ title: 'Opener B', expansion: 'Dawntrail' })
        saveRotationLibrary(prependRecord(edited, created))

        const reloaded = loadRotationLibrary()
        expect(reloaded.activeId).toBe(created.id)
        expect(reloaded.records).toHaveLength(2)
        expect(getActiveRecord(reloaded).title).toBe('Opener B')
        const other = reloaded.records.find((record) => record.id !== reloaded.activeId)
        expect(other?.title).toBe('Opener A')
        expect(other?.rotation).toHaveLength(1)
        expect(other?.rotation[0]?.instanceId).toBe('instance-1')
    })
})
