export interface DataAction {
    id: string
    name: string | null
    icon: URL | null
    kind?: 'gcd' | 'ogcd'
    baseGcdRecastMs?: number
    baseCastTimeMs?: number
}

export interface DataStatus {
    id: string
    name: string | null
    icon: URL | null
}

// XIVAPI expresses timing in tenths of a second. Catalog mechanics exceptions are resolved separately.
export const actionTimingFromFields = (fields: {
    ActionCategory?: { row_id?: number }
    Recast100ms?: number
    Cast100ms?: number
}): Pick<DataAction, 'kind' | 'baseGcdRecastMs' | 'baseCastTimeMs'> => {
    const category = fields.ActionCategory?.row_id
    if (category === undefined) return {}
    const kind = category === 2 || category === 3 ? 'gcd' : 'ogcd'
    return {
        kind,
        ...(kind === 'gcd' && typeof fields.Recast100ms === 'number' ? { baseGcdRecastMs: fields.Recast100ms * 100 } : {}),
        ...(kind === 'gcd' && typeof fields.Cast100ms === 'number' ? { baseCastTimeMs: fields.Cast100ms * 100 } : {}),
    }
}
