export interface Source {
    id: string
    url: string
    revision: string
    verifiedAt: string
}

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
    gcdRecastOverrideReason?: string
    abilityCooldownMs?: number
    speedCategory?: 'skill' | 'spell' | 'fixed'
    statuses: AppliedStatus[]
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
    inventory: { id: number; disposition: 'configured' | 'unsupported'; reason?: string }[]
}
