import ast from './jobs/AST.json'
import blm from './jobs/BLM.json'
import blu from './jobs/BLU.json'
import brd from './jobs/BRD.json'
import dnc from './jobs/DNC.json'
import drg from './jobs/DRG.json'
import drk from './jobs/DRK.json'
import gnb from './jobs/GNB.json'
import mch from './jobs/MCH.json'
import mnk from './jobs/MNK.json'
import nin from './jobs/NIN.json'
import pct from './jobs/PCT.json'
import pld from './jobs/PLD.json'
import rdm from './jobs/RDM.json'
import rpr from './jobs/RPR.json'
import sam from './jobs/SAM.json'
import sch from './jobs/SCH.json'
import sge from './jobs/SGE.json'
import smn from './jobs/SMN.json'
import vpr from './jobs/VPR.json'
import war from './jobs/WAR.json'
import whm from './jobs/WHM.json'
import roles from './roles.json'
import statusData from './statuses.json'
import { CatalogAction, CatalogStatus, JobCatalog } from './types'

export const catalogs: Record<string, JobCatalog> = {
    AST: ast as JobCatalog,
    BLM: blm as JobCatalog,
    BLU: blu as JobCatalog,
    BRD: brd as JobCatalog,
    DNC: dnc as JobCatalog,
    DRG: drg as JobCatalog,
    DRK: drk as JobCatalog,
    GNB: gnb as JobCatalog,
    MCH: mch as JobCatalog,
    MNK: mnk as JobCatalog,
    NIN: nin as JobCatalog,
    PCT: pct as JobCatalog,
    PLD: pld as JobCatalog,
    RDM: rdm as JobCatalog,
    RPR: rpr as JobCatalog,
    SAM: sam as JobCatalog,
    SCH: sch as JobCatalog,
    SGE: sge as JobCatalog,
    SMN: smn as JobCatalog,
    VPR: vpr as JobCatalog,
    WAR: war as JobCatalog,
    WHM: whm as JobCatalog,
}
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
