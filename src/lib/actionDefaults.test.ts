import { beforeEach, describe, expect, it, vi } from 'vitest'
import { dataActionToDefaultAction, applySharedRecast, saveActionEdit, readPreferences, PREFERENCES_KEY } from './actionDefaults'
import { applyStatusNames, loadStatusNames } from './statusNames'
vi.mock('@/app/api', () => ({ getStatusByID: vi.fn(async (id: string, locale: string) => ({ id, name: `${locale} status ${id}` })) }))
import { catalogs } from '@/data/actionCatalog'
import { setCachedJobActions, getCachedJobActions } from './jobActionsStore'
import type { Action } from '@/components/Canvas/types'

const data = (id = '7411') => ({ id, name: 'Cached name', icon: new URL('https://example.test/action.png'), kind: 'gcd' as const, baseGcdRecastMs: 2500, baseCastTimeMs: 0 })
const add = (id = '7411', job = 'MCH') => dataActionToDefaultAction(data(id), job)
beforeEach(() => {
    const storage = new Map<string, string>()
    vi.stubGlobal('window', {})
    vi.stubGlobal('localStorage', {
        getItem: (key: string) => storage.get(key) ?? null,
        setItem: (key: string, value: string) => storage.set(key, value),
        removeItem: (key: string) => storage.delete(key),
    })
})

describe('action defaults and explicit preferences', () => {
    it('prefills by ID without writing settings; preserves zero and casts with synthetic metadata', () => {
        const synthetic = { id: 999999, kind: 'gcd' as const,
            baseCastTimeMs: 1800, gcdRecastOverrideMs: 0, gcdRecastOverrideReason: 'Synthetic zero', speedCategory: 'spell' as const,
            statuses: [] }
        catalogs.MCH.actions.push(synthetic)
        try {
            expect(add('999999')).toMatchObject({ type: 'gcd', recastTime: 0, castTime: 1.8 })
            expect(localStorage.getItem(PREFERENCES_KEY)).toBeNull()
            expect(add('custom-999999')).toMatchObject({ type: 'gcd', recastTime: 2.5, castTime: 0 })
            delete (synthetic as { gcdRecastOverrideMs?: number }).gcdRecastOverrideMs
            expect(add('999999').defaults?.gcdGroup).toBe('MCH:2500')
        } finally { catalogs.MCH.actions.pop() }
    })

    it('uses catalog configuration even with cached old list presentation', () => {
        setCachedJobActions('MCH', 'en', [{ ...data(), description: null, classJobLevel: 54, isPlayerAction: true }])
        const cached = getCachedJobActions('MCH', 'en')!.actions[0]
        expect(dataActionToDefaultAction(cached, 'MCH')).toMatchObject({ type: 'gcd', recastTime: 2.5 })
        const definition = catalogs.MCH.actions.find(action => action.id === 7411)!
        const old = definition.baseCastTimeMs
        const occurrence = dataActionToDefaultAction(cached, 'MCH')
        try {
            definition.baseCastTimeMs = 1500
            expect(dataActionToDefaultAction(cached, 'MCH')).toMatchObject({ castTime: 1.5 })
            expect(occurrence).toMatchObject({ castTime: 0 })
        } finally { definition.baseCastTimeMs = old }
    })

    it('shares 2.50 to 2.45 across existing prepull/rotation and future additions, including previously specific and imported values', () => {
        const selected = add()
        if (selected.type !== 'gcd') throw new Error('Expected GCD')
        const prepull = [{ ...add('7412'), prepull: -5 }]
        const special = add('16497') // Auto Crossbow
        const imported: Action = { ...add(), defaults: { job: 'MCH', gcdGroup: selected.defaults?.gcdGroup, recastSource: 'import' } }
        const explicit = saveActionEdit(add(), { ...add(), recastTime: 2.3 } as Action, 'MCH', 'en', 'specific').action
        const result = saveActionEdit(selected, { ...selected, recastTime: 2.45 }, 'MCH', 'en')
        expect(result.shared).toBeDefined()
        expect(applySharedRecast(prepull, result.shared!.group, 2.45)[0]).toMatchObject({ recastTime: 2.45 })
        const updated = applySharedRecast([selected, special, imported, explicit, add('7411', 'DRK')], result.shared!.group, 2.45)
        expect(updated[0]).toMatchObject({ recastTime: 2.45, castTime: 0 })
        expect(updated[1]).toEqual(special)
        expect(updated[2]).toMatchObject({ recastTime: 2.45, defaults: { recastSource: 'inherited' } })
        expect(updated[3]).toMatchObject({ recastTime: 2.45, defaults: { recastSource: 'inherited' } })
        expect(updated[4]).toEqual(addWithoutIdentity('7411', 'DRK', updated[4]))
        expect(add('7412')).toMatchObject({ recastTime: 2.45 })
        expect(add()).toMatchObject({ recastTime: 2.45 })
    })

    it('uses API base recasts except for documented mechanics and never treats an ability cooldown as a GCD', () => {
        const make = (id: string, baseGcdRecastMs?: number, kind: 'gcd' | 'ogcd' = 'gcd') =>
            dataActionToDefaultAction({ ...data(id), kind, baseGcdRecastMs }, 'MCH')
        expect(make('7411', 2400)).toMatchObject({ recastTime: 2.4, defaults: { gcdGroup: 'MCH:2400' } })
        expect(make('7411', 0)).toMatchObject({ recastTime: 0 })
        expect(make('7411')).toMatchObject({ recastTime: 2.5, defaults: { gcdGroup: undefined } })
        expect(make('16497', 2500)).toMatchObject({ recastTime: 1.5, defaults: { gcdGroup: 'MCH:1500' } })
        expect(make('16498', 20000)).toMatchObject({ recastTime: 2.5, defaults: { gcdGroup: 'MCH:2500' } })
        expect(make('7418', undefined, 'ogcd')).toMatchObject({ type: 'gcd', recastTime: 2.5, defaults: { gcdGroup: undefined } })
    })

    it('turns sharing off, saves only edited fields, and resets recast to inherited', () => {
        const first = add()
        const specific = saveActionEdit(first, first, 'MCH', 'en', 'specific').action
        expect(specific.defaults?.recastSource).toBe('action')
        const edited = saveActionEdit(specific, { ...specific, castTime: 1.2 } as Action, 'MCH', 'en').action
        expect(readPreferences().actions['MCH:7411']).toEqual({ recastTime: 2.5, castTime: 1.2 })
        const reset = saveActionEdit(edited, edited, 'MCH', 'en', 'reset-recast').action
        expect(reset).toMatchObject({ castTime: 1.2, defaults: { recastSource: 'inherited' } })
        expect(readPreferences().actions['MCH:7411']).toEqual({ castTime: 1.2 })
        saveActionEdit(reset, reset, 'MCH', 'en', 'reset')
        expect(add()).toMatchObject({ recastTime: 2.5, castTime: 0 })
    })

    it('does not broadcast timing resets caused by an explicit action-type change', () => {
        const original = add()
        const ogcd = saveActionEdit(original, { ...original, type: 'ogcd' }, 'MCH', 'en').action
        const result = saveActionEdit(ogcd, { ...ogcd, type: 'gcd', recastTime: 2.5, castTime: 0 }, 'MCH', 'en')
        expect(result.shared).toBeUndefined()
        expect(readPreferences().sharedGcds).toEqual({})
        expect(result.action.defaults?.recastSource).toBe('action')
    })

    it('preserves legacy complete snapshots and migrates a single buff, until explicit reset', () => {
        localStorage.setItem('mint-leaf-custom-actions', JSON.stringify({ '7411': {
            id: '7411', name: 'old', iconUrl: '', isGCD: true, recastTime: 0, castTime: 0, appliesBuff: true,
            buffDetails: { id: '9', name: 'old buff', iconUrl: '', duration: 7, applicationDelay: 0, color: '#123456' },
        } }))
        const action = add()
        expect(action).toMatchObject({ recastTime: 0, statusesApplied: [{ id: '9', enabled: true, color: '#123456' }] })
        saveActionEdit(action, action, 'MCH', 'en', 'reset')
        expect(add()).toMatchObject({ recastTime: 2.5, statusesApplied: [] })
    })

    it('localizes future status presentation without losing edited colors or timings', async () => {
        const first = applyStatusNames([add('2876')], await loadStatusNames(['851'], 'en'))[0]
        const status = { ...first.statusesApplied![0], color: '#abcdef', duration: 3, enabled: false }
        saveActionEdit(first, { ...first, statusesApplied: [status] }, 'MCH', 'en')
        const japanese = applyStatusNames([dataActionToDefaultAction(data('2876'), 'MCH', 'ja')], await loadStatusNames(['851'], 'ja'))[0]
        expect(japanese.statusesApplied![0]).toMatchObject({ name: 'ja status 851', color: '#abcdef', duration: 3, enabled: false })
        expect(first.statusesApplied![0].name).toBe('en status 851')
    })

    it('keeps independent toggles and edited status settings on future additions', () => {
        const first = add('2876')
        const statuses = [{ id: 'custom-buff', name: 'Custom', imageSrc: '', color: '#abcdef', duration: 0, applicationDelay: 0, enabled: false },
            { id: 'custom-other', name: 'Other', imageSrc: '', color: '#123456', duration: 13, applicationDelay: 0.7, enabled: true }]
        saveActionEdit(first, { ...first, statusesApplied: statuses }, 'MCH', 'en')
        expect(add('2876').statusesApplied).toEqual(statuses)
        expect(readPreferences().actions['MCH:2876']).toEqual({ statusesApplied: statuses })
    })
})

function addWithoutIdentity(id: string, job: string, original: Action) {
    return { ...dataActionToDefaultAction(data(id), job), instanceId: original.instanceId }
}

it('shares uncataloged API actions by base recast and restores original names', () => {
    const make = (id: string, baseGcdRecastMs = 2500) => dataActionToDefaultAction({ ...data(id), kind: 'gcd', baseGcdRecastMs }, 'WHM')
    const first = make('100001')
    const second = make('100002')
    const specific = saveActionEdit(second, { ...second, recastTime: 2.2 } as Action, 'WHM', 'en', 'specific').action
    const renamed = saveActionEdit(first, { ...first, name: 'My spell' }, 'WHM', 'en').action
    expect(make('100001').name).toBe('My spell')
    const shared = saveActionEdit(renamed, { ...renamed, recastTime: 2.4 } as Action, 'WHM', 'en')
    expect(applySharedRecast([specific], shared.shared!.group, 2.4)[0]).toMatchObject({ recastTime: 2.4 })
    expect(make('100002')).toMatchObject({ recastTime: 2.4 })
    expect(make('100003', 1500)).toMatchObject({ recastTime: 1.5 })
    expect(saveActionEdit(renamed, renamed, 'WHM', 'en', 'reset').action.name).toBe('Cached name')
})

it('reads legacy speed groups without writes and combines equal base recasts', () => {
    localStorage.setItem(PREFERENCES_KEY, JSON.stringify({ version: 1, actions: {}, sharedGcds: { 'MCH:2500:skill': 2.4 } }))
    expect(add()).toMatchObject({ recastTime: 2.4, defaults: { gcdGroup: 'MCH:2500' } })
    expect(localStorage.getItem(PREFERENCES_KEY)).toContain('MCH:2500:skill')
})
