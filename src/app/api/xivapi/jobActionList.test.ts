import { describe, expect, it } from 'vitest'
import { sortJobActions, JobListAction } from './jobActionList'
import { actionTimingFromFields } from './types'

const action = (id: string, name: string, classJobLevel: number, isRoleAction = false): JobListAction => ({
    id, name, classJobLevel, isRoleAction, icon: null, isPlayerAction: true, description: null,
})

describe('job library metadata', () => {
    it('sorts job skills first, then descending level, localized name, and stable ID', () => {
        const actions = [action('1', 'Role', 100, true), action('2', 'Low', 1), action('4', 'Zulu', 90), action('3', 'Alpha', 90)]
        expect(sortJobActions(actions, 'en').map(action => action.id)).toEqual(['3', '4', '2', '1'])
        expect(actions[0].id).toBe('1')
    })
    it('uses raw API timing for spells and weaponskills without grouping abilities', () => {
        expect(actionTimingFromFields({ ActionCategory: { row_id: 2 }, Recast100ms: 25, Cast100ms: 15 }))
            .toEqual({ kind: 'gcd', baseGcdRecastMs: 2500, baseCastTimeMs: 1500 })
        expect(actionTimingFromFields({ ActionCategory: { row_id: 3 }, Recast100ms: 15 }))
            .toEqual({ kind: 'gcd', baseGcdRecastMs: 1500 })
        expect(actionTimingFromFields({ ActionCategory: { row_id: 4 }, Recast100ms: 600 })).toEqual({ kind: 'ogcd' })
        expect(actionTimingFromFields({})).toEqual({})
    })
})
