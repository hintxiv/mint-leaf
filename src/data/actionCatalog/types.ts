export interface Source {
    id: string
    url: string
    revision: string
    verifiedAt: string
}

export interface CatalogStatus {
    id: number
    names: { en: string; ja: string }
    icon: string
    sourceIds: string[]
}

export interface AppliedStatus {
    statusId: number
    durationMs: number
    applicationDelayMs?: number
    defaultEnabled?: boolean
    conditions: string
}

export interface CatalogAction {
    id: number
    names: { en: string; ja: string }
    kind?: 'gcd' | 'ogcd'
    baseCastTimeMs?: number
    baseGcdRecastMs?: number
    abilityCooldownMs?: number
    speedCategory?: 'skill' | 'spell' | 'fixed'
    statusCoverage: 'verified' | 'unknown'
    statuses: AppliedStatus[]
    sourceIds: string[]
    unresolved: string[]
    notes?: string
    unsupported?: string
}

export interface JobCatalog {
    schemaVersion: number
    revision: string
    job: string
    level: number
    patch: string
    verifiedAt: string
    sources: Source[]
    actions: CatalogAction[]
    roleActionIds: number[]
    inventory: { id: number; disposition: 'configured' | 'unsupported'; sourceIds: string[]; reason?: string }[]
}
