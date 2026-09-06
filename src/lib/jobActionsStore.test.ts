import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
    buildJobActionsCacheKey,
    getCachedJobActions,
    isCacheFresh,
    JOB_ACTIONS_CACHE_TTL_MS,
    setCachedJobActions,
    type JobActionsCacheEntry,
} from './jobActionsStore'
import type { JobListAction } from '@/app/api'

const sampleActions: JobListAction[] = [
    {
        id: '1',
        name: 'Hard Slash',
        icon: new URL('https://v2.xivapi.com/api/asset/ui/icon/000000/000001_hr1.tex?format=png'),
        isPlayerAction: true,
        description: 'Delivers an attack with a potency of 300.',
        classJobLevel: 1,
        isRoleAction: true, kind: 'gcd', baseGcdRecastMs: 2500, baseCastTimeMs: 0,
    },
    {
        id: '2',
        name: 'Blade of Faith',
        icon: new URL('https://v2.xivapi.com/api/asset/ui/icon/000000/000002_hr1.tex?format=png'),
        isPlayerAction: false,
        description: 'Delivers an attack to target.<br><span style="color:rgba(255,123,26,1);">Cannot be assigned to a hotbar.</span>',
        classJobLevel: 90,
    },
]

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

describe('job actions cache', () => {
    it('builds a key from abbreviation and locale', () => {
        expect(buildJobActionsCacheKey('DRK', 'en')).toBe('DRK:en')
        expect(buildJobActionsCacheKey('BLM', 'ja')).toBe('BLM:ja')
    })

    it('round-trips actions through localStorage', () => {
        setCachedJobActions('DRK', 'en', sampleActions, { version: '7.0', schema: 'ex1' })

        const cached = getCachedJobActions('DRK', 'en')
        expect(cached).not.toBeNull()
        expect(cached!.fresh).toBe(true)
        expect(cached!.entry.version).toBe('7.0')
        expect(cached!.entry.schema).toBe('ex1')
        expect(cached!.actions).toHaveLength(2)
        expect(cached!.actions[0].id).toBe('1')
        expect(cached!.actions[0].name).toBe('Hard Slash')
        expect(cached!.actions[0].isPlayerAction).toBe(true)
        expect(cached!.actions[0].description).toBe('Delivers an attack with a potency of 300.')
        expect(cached!.actions[0].classJobLevel).toBe(1)
        expect(cached!.actions[0]).toMatchObject({ isRoleAction: true, kind: 'gcd', baseGcdRecastMs: 2500, baseCastTimeMs: 0 })
        expect(cached!.actions[0].icon?.toString()).toBe(sampleActions[0].icon!.toString())
        expect(cached!.actions[1].isPlayerAction).toBe(false)
        expect(cached!.actions[1].classJobLevel).toBe(90)
        expect(cached!.actions[1].description).toContain('Cannot be assigned')
        expect(cached!.actions[1].description).toContain('<span')
    })

    it('marks entries outside the TTL as not fresh but still returns them', () => {
        setCachedJobActions('DRK', 'ja', sampleActions)

        const cached = getCachedJobActions('DRK', 'ja')
        expect(cached).not.toBeNull()

        const staleEntry: JobActionsCacheEntry = {
            ...cached!.entry,
            fetchedAt: Date.now() - JOB_ACTIONS_CACHE_TTL_MS - 1,
        }
        expect(isCacheFresh(staleEntry)).toBe(false)

        // Simulate an expired entry still present in storage
        localStorage.setItem(
            'mint-leaf-job-actions',
            JSON.stringify({ 'DRK:ja': staleEntry }),
        )

        const staleCached = getCachedJobActions('DRK', 'ja')
        expect(staleCached).not.toBeNull()
        expect(staleCached!.fresh).toBe(false)
        expect(staleCached!.actions).toHaveLength(2)
        expect(staleCached!.actions[0].name).toBe('Hard Slash')
    })

    it('ignores cache entries from an older format', () => {
        localStorage.setItem(
            'mint-leaf-job-actions',
            JSON.stringify({
                'DRK:en': {
                    fetchedAt: Date.now(),
                    format: 2,
                    actions: [{
                        id: '1',
                        name: 'Hard Slash',
                        iconUrl: null,
                        isPlayerAction: true,
                        description: null,
                        classJobLevel: 1,
                    }],
                },
            }),
        )

        expect(getCachedJobActions('DRK', 'en')).toBeNull()
    })

    it('returns null when no entry exists', () => {
        expect(getCachedJobActions('WHM', 'en')).toBeNull()
    })
})
