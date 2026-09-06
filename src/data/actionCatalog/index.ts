import mch from './jobs/MCH.json'
import roles from './roles.json'
import statusData from './statuses.json'
import { CatalogAction, CatalogStatus, JobCatalog } from './types'

export const catalogs: Record<string, JobCatalog> = { MCH: mch as JobCatalog }
export const catalogStatuses = statusData.statuses as CatalogStatus[]

export const findCatalogAction = (job: string, id: string): CatalogAction | undefined => {
    // Custom IDs and noncanonical numeric IDs never participate in catalog matching.
    if (!/^[1-9]\d*$/.test(id)) return undefined
    const catalog = catalogs[job]
    if (!catalog) return undefined
    return catalog.actions.find(action => String(action.id) === id)
        ?? (catalog.roleActionIds.includes(Number(id))
            ? (roles.actions as CatalogAction[]).find(action => String(action.id) === id)
            : undefined)
}

export const matchingGcdGroup = (job: string, action?: { kind?: string; baseGcdRecastMs?: number }): string | undefined =>
    action?.kind === 'gcd' && action.baseGcdRecastMs !== undefined
        ? `${job}:${action.baseGcdRecastMs}`
        : undefined
