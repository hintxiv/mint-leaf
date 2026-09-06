export interface CatalogStatus {
    id: number
    icon: string
}

export interface AppliedStatus {
    statusId: number
    durationMs: number
    applicationDelayMs?: number
    defaultEnabled?: boolean
}

export interface CatalogAction {
    id: number
    kind?: 'gcd' | 'ogcd'
    baseCastTimeMs?: number
    gcdRecastOverrideMs?: number
    abilityCooldownMs?: number
    speedCategory?: 'skill' | 'spell' | 'fixed'
    statuses: AppliedStatus[]
}

export interface JobCatalog {
    revision: string
    job: string
    actions: CatalogAction[]
    roleActionIds: number[]
}
