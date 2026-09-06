import { readdirSync, readFileSync } from 'node:fs'
import { resolve, join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { emit, fail, heading, options } from './action-catalog-cli.mjs'

export function catalogFiles(directory, prefix = '') {
    return readdirSync(resolve(directory, prefix), { withFileTypes: true }).flatMap(entry => entry.isDirectory() ? catalogFiles(directory, join(prefix, entry.name)) : entry.name.endsWith('.json') ? [join(prefix, entry.name)] : []).sort()
}

export function validateCatalog(directory) {
    const errors = []
    const documents = catalogFiles(directory).map(name => {
        try { return { file: name, data: JSON.parse(readFileSync(resolve(directory, name), 'utf8')) } }
        catch { errors.push(`${name}: invalid JSON`); return { file: name, data: {} } }
    })
    const sources = new Map()
    const statuses = new Map()
    const actions = new Map()
    const check = (condition, message) => { if (!condition) errors.push(message) }
    const nonempty = value => typeof value === 'string' && value.trim().length > 0
    const positiveId = value => Number.isSafeInteger(value) && value > 0
    const date = value => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value
    const url = value => { try { return ['https:', 'http:'].includes(new URL(value).protocol) } catch { return false } }
    const list = (value, label) => { check(Array.isArray(value), `${label}: expected array`); return Array.isArray(value) ? value : [] }
    const checkFields = (value, label) => {
        if (!value || typeof value !== 'object') return
        for (const [key, child] of Object.entries(value)) {
            check(!['names', 'notes', 'unresolved', 'sourceIds', 'conditions', 'statusCoverage'].includes(key), `${label}.${key}: field does not belong in the catalog`)
            checkFields(child, `${label}.${key}`)
        }
    }
    for (const { file, data } of documents) checkFields(data, file)
    for (const { file, data } of documents) {
        for (const source of list(data.sources, `${file}.sources`)) {
            const label = `${file} source ${source.id}`
            check(nonempty(source.id), `${label}: missing source ID`)
            check(!sources.has(source.id), `${label}: duplicate source ID`)
            check(url(source.url), `${label}: invalid source URL`)
            check(nonempty(source.revision), `${label}: missing pinned revision/version`)
            check(date(source.verifiedAt), `${label}: invalid verification date`)
            sources.set(source.id, source)
        }
    }
    for (const { file, data } of documents) {
        for (const status of data.statuses ? list(data.statuses, `${file}.statuses`) : []) {
            const label = `${file} status ${status.id}`
            check(positiveId(status.id), `${label}: invalid game ID`)
            check(!statuses.has(status.id), `${label}: duplicate status ID`)
            check(nonempty(status.icon) && (status.icon.startsWith('/') || url(status.icon)), `${label}: invalid icon reference`)
            statuses.set(status.id, status)
        }
    }
    const timeKeys = ['baseCastTimeMs', 'gcdRecastOverrideMs', 'abilityCooldownMs', 'durationMs', 'applicationDelayMs']
    const timings = (item, label) => {
        for (const key of timeKeys) if (key in item) check(typeof item[key] === 'number' && Number.isFinite(item[key]) && item[key] >= 0, `${label}.${key}: expected finite nonnegative milliseconds`)
        for (const key of Object.keys(item)) if (/(castTime|recast|cooldown|duration|delay)/i.test(key) && !timeKeys.includes(key) && key !== 'gcdRecastOverrideReason') check(false, `${label}.${key}: timing field must use a known explicit millisecond unit`)
    }
    for (const { file, data } of documents) {
        for (const action of data.actions ? list(data.actions, `${file}.actions`) : []) {
            const label = `${file} action ${action.id}`
            check(positiveId(action.id), `${label}: invalid game ID`)
            check(!actions.has(action.id), `${label}: duplicate action ID; reuse roleActionIds for shared actions`)
            timings(action, label)
            check(action.kind === undefined || ['gcd', 'ogcd'].includes(action.kind), `${label}: invalid kind`)
            check(action.speedCategory === undefined || ['skill', 'spell', 'fixed'].includes(action.speedCategory), `${label}: invalid speed category`)
            check(action.gcdRecastOverrideMs === undefined || (action.kind === 'gcd' && nonempty(action.gcdRecastOverrideReason)), `${label}: GCD recast override requires gcd classification and an explanation`)
            check(action.gcdRecastOverrideReason === undefined || action.gcdRecastOverrideMs !== undefined, `${label}: recast explanation requires an override`)
            const seen = new Set()
            for (const status of list(action.statuses, `${label}.statuses`)) {
                check(statuses.has(status.statusId), `${label}: unknown status ${status.statusId}`)
                check(!seen.has(status.statusId), `${label}: duplicate status association ${status.statusId}`)
                seen.add(status.statusId)
                timings(status, `${label} status ${status.statusId}`)
                check(status.durationMs !== undefined, `${label} status ${status.statusId}: durationMs required`)
                check(status.defaultEnabled === undefined || typeof status.defaultEnabled === 'boolean', `${label}: invalid defaultEnabled`)
            }
            actions.set(action.id, action)
        }
    }
    const jobs = []
    for (const { file, data } of documents.filter(({ data }) => data.job)) {
        check(data.schemaVersion === 1, `${file}: unsupported schemaVersion`)
        check(nonempty(data.revision) && nonempty(data.patch), `${file}: missing catalog revision/patch`)
        check(Number.isSafeInteger(data.level) && data.level > 0, `${file}: invalid max level`)
        check(date(data.verifiedAt), `${file}: invalid verification date`)
        const roles = list(data.roleActionIds, `${file}.roleActionIds`)
        check(new Set(roles).size === roles.length, `${file}: duplicate role action ID`)
        for (const id of roles) check(actions.has(id), `${file}: unknown role action ${id}`)
        const configured = new Set([...(data.actions ?? []).map(action => action.id), ...roles])
        const inventory = list(data.inventory, `${file}.inventory`)
        const seen = new Set()
        for (const entry of inventory) {
            const label = `${file} inventory ${entry.id}`
            check(positiveId(entry.id), `${label}: invalid game ID`)
            check(!seen.has(entry.id), `${label}: duplicate inventory ID`)
            seen.add(entry.id)
            check(['configured', 'unsupported'].includes(entry.disposition), `${label}: invalid disposition`)
            if (entry.disposition === 'configured') check(configured.has(entry.id), `${label}: configured action missing definition`)
            if (entry.disposition === 'unsupported') check(nonempty(entry.reason), `${label}: unsupported action requires explanation`)
        }
        for (const id of configured) check(seen.has(id), `${file}: action ${id} missing from inventory`)
        check(inventory.length > 0, `${file}: empty inventory`)
        jobs.push({ job: data.job, actions: configured.size, inventory: inventory.length, unsupported: inventory.filter(entry => entry.disposition === 'unsupported').length })
    }
    check(jobs.length > 0, 'No job catalogs found')
    return { valid: errors.length === 0, jobs, sources: sources.size, statuses: statuses.size, errors }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
    let opts
    try {
        opts = options(process.argv.slice(2), ['--dir', '--json', '--help'])
        if (opts.help) emit({ ...heading(import.meta.url, 'Validate action catalog structure, provenance, and inventory coverage.'), usage: 'node scripts/action-catalog-validate.mjs [--dir src/data/actionCatalog] [--json]', examples: ['node scripts/action-catalog-validate.mjs', 'node scripts/action-catalog-validate.mjs --dir /tmp/catalog --json'] }, opts.json)
        else {
            const result = validateCatalog(resolve(opts.dir ?? 'src/data/actionCatalog'))
            emit({ ...heading(import.meta.url, 'Validate action catalog structure, provenance, and inventory coverage.'), ...result }, opts.json)
            if (!result.valid) process.exitCode = 1
        }
    } catch (error) { fail(error, opts?.json) }
}
