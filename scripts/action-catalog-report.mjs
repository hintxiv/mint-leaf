import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { emit, fail, heading, options } from './action-catalog-cli.mjs'
import { validateCatalog, catalogFiles } from './action-catalog-validate.mjs'

let opts
try {
    opts = options(process.argv.slice(2), ['--base', '--dir', '--evidence', '--json', '--help'])
    if (opts.help) emit({ ...heading(import.meta.url, 'Report catalog coverage, changes, source revisions, and recorded checks.'), usage: 'node scripts/action-catalog-report.mjs [--base HEAD] [--dir src/data/actionCatalog] [--evidence evidence.json] [--json]', examples: ['node scripts/action-catalog-report.mjs --base origin/main', 'node scripts/action-catalog-report.mjs --base <starting-commit> --evidence /tmp/evidence.json --json'] }, opts.json)
    else {
        const directory = opts.dir ?? 'src/data/actionCatalog'
        const base = opts.base ?? 'HEAD'
        if (base.startsWith('-')) throw new Error('--base must be a revision, not an option')
        const git = (...args) => execFileSync('git', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim()
        const evidence = opts.evidence ? JSON.parse(readFileSync(opts.evidence, 'utf8')) : { complete: false, checks: [], gaps: ['No source verification/check evidence supplied'] }
        if (typeof evidence.complete !== 'boolean' || !Array.isArray(evidence.checks) || !Array.isArray(evidence.gaps)) throw new Error('Evidence requires complete:boolean, checks:array, and gaps:array')
        if (evidence.checks.some(check => typeof check.command !== 'string' || !Number.isInteger(check.exitCode))) throw new Error('Every check requires command:string and exitCode:integer')
        const validation = validateCatalog(resolve(directory))
        const files = catalogFiles(directory)
        const documents = files.map(file => ({ file, data: JSON.parse(readFileSync(resolve(directory, file), 'utf8')) }))
        const changes = []
        for (const { file, data } of documents) {
            let previous
            try { previous = JSON.parse(git('show', `${base}:${directory}/${file}`)) } catch { previous = null }
            if (JSON.stringify(previous) !== JSON.stringify(data)) {
                const fields = []
                for (const collection of ['actions', 'statuses']) {
                    const before = new Map((previous?.[collection] ?? []).map(item => [item.id, item]))
                    const after = new Map((data[collection] ?? []).map(item => [item.id, item]))
                    for (const id of new Set([...before.keys(), ...after.keys()])) {
                        const oldItem = before.get(id)
                        const newItem = after.get(id)
                        if (!oldItem || !newItem) fields.push({ collection, id, field: '*', before: oldItem ?? null, after: newItem ?? null })
                        else for (const key of new Set([...Object.keys(oldItem), ...Object.keys(newItem)])) if (JSON.stringify(oldItem[key]) !== JSON.stringify(newItem[key])) fields.push({ collection, id, field: key, before: oldItem[key] ?? null, after: newItem[key] ?? null })
                    }
                }
                changes.push({ file, change: previous ? 'modified' : 'added', fields })
            }
        }
        const changedPaths = git('diff', '--name-only', base, '--', directory).split('\n').filter(Boolean)
        for (const path of changedPaths) if (path.endsWith('.json') && !documents.some(doc => `${directory}/${doc.file}` === path)) changes.push({ file: path, change: 'deleted' })
        const requiredChecks = ['npm run test:unit', 'npm run test:browser', 'npm run lint', 'npm run build']
        const absent = requiredChecks.filter(command => !evidence.checks.some(check => check.command === command && check.exitCode === 0))
        const complete = evidence.complete && validation.valid && evidence.gaps.length === 0 && absent.length === 0 && evidence.checks.every(check => check.exitCode === 0)
        emit({ ...heading(import.meta.url, 'Report catalog coverage, changes, source revisions, and recorded checks.'), outcome: complete ? (changes.length ? 'complete' : 'no-change') : 'incomplete', branch: git('branch', '--show-current'), worktree: git('rev-parse', '--show-toplevel'), base: git('rev-parse', base), commit: git('rev-parse', 'HEAD'), changes, coverage: validation.jobs, sources: documents.flatMap(({ data }) => data.sources ?? []), validation: { valid: validation.valid, errors: validation.errors, unresolved: validation.warnings }, checks: evidence.checks, gaps: [...evidence.gaps, ...absent.map(command => `Missing passing evidence: ${command}`)] }, opts.json)
        if (!validation.valid) process.exitCode = 1
    }
} catch (error) { fail(new Error(error.status !== undefined ? 'Cannot inspect Git revisions; verify --base and run from repository root.' : error.message), opts?.json) }
