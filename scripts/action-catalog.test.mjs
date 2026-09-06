import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { resolve, join } from 'node:path'
import { execFileSync } from 'node:child_process'
import { validateCatalog } from './action-catalog-validate.mjs'

const scripts = resolve('scripts')
const write = (file, data) => writeFileSync(file, JSON.stringify(data, null, 2))
function fixture() {
    const dir = mkdtempSync(join(tmpdir(), 'catalog-validator-'))
    mkdirSync(join(dir, 'jobs'))
    const job = {
        schemaVersion: 1, revision: 'fixture1', job: 'MCH', level: 100, patch: 'fixture', verifiedAt: '2026-09-05',
        sources: [{ id: 'fixture', url: 'https://example.com/fixture', revision: 'fixture-commit', verifiedAt: '2026-09-05' }],
        roleActionIds: [2], inventory: [{ id: 1, disposition: 'configured' }, { id: 2, disposition: 'configured' }],
        actions: [{ id: 1, kind: 'gcd', baseCastTimeMs: 0, gcdRecastOverrideMs: 2500, gcdRecastOverrideReason: 'Fixture exception', abilityCooldownMs: 20000, speedCategory: 'skill', statuses: [{ statusId: 3, durationMs: 0, applicationDelayMs: 0, defaultEnabled: false }] }],
    }
    const roles = { sources: [], actions: [{ id: 2, kind: 'ogcd', baseCastTimeMs: 0, abilityCooldownMs: 0, statuses: [] }] }
    const statuses = { sources: [], statuses: [{ id: 3, icon: '/icons/3.png' }] }
    const save = () => { write(join(dir, 'jobs/MCH.json'), job); write(join(dir, 'roles.json'), roles); write(join(dir, 'statuses.json'), statuses) }
    save()
    return { dir, job, roles, statuses, save }
}

test('validates shared definitions, genuine zero timings and empty status lists', () => {
    const { dir } = fixture()
    const result = validateCatalog(dir)
    assert.deepEqual(result.errors, [])
    assert.deepEqual(result.jobs, [{ job: 'MCH', actions: 2, inventory: 2, unsupported: 0 }])
})

test('rejects presentation and research fields in catalog data', () => {
    const f = fixture()
    f.job.actions[0].statuses[0].conditions = 'Research commentary'
    f.job.actions[0].statusCoverage = 'verified'
    f.job.actions[0].notes = 'Research commentary'
    f.job.actions[0].unresolved = []
    f.statuses.statuses[0].names = { en: 'Status' }
    f.job.inventory[0].sourceIds = ['fixture']
    f.save()
    const result = validateCatalog(f.dir)
    assert.equal(result.valid, false)
    for (const key of ['notes', 'unresolved', 'names', 'sourceIds', 'conditions', 'statusCoverage']) {
        assert(result.errors.some(error => error.includes(`.${key}: field does not belong`)))
    }
})

test('rejects duplicate IDs, broken status references, and incomplete inventory', () => {
    const f = fixture()
    f.job.actions.push({ ...f.job.actions[0] })
    f.job.actions[0].statuses[0].statusId = 99
    f.job.inventory.pop()
    f.save()
    const result = validateCatalog(f.dir)
    assert.equal(result.valid, false)
    for (const fragment of ['duplicate action ID', 'unknown status 99', 'missing from inventory']) assert(result.errors.some(error => error.includes(fragment)), fragment)
})

test('rejects invalid units and invalid dates', () => {
    const f = fixture()
    f.job.actions[0].baseCastTimeMs = -1
    f.job.actions[0].recast = 2.5
    f.job.verifiedAt = '2026-99-99'
    f.save()
    const result = validateCatalog(f.dir)
    assert.equal(result.valid, false)
    for (const fragment of ['finite nonnegative', 'explicit millisecond', 'invalid verification date']) assert(result.errors.some(error => error.includes(fragment)), fragment)
})

test('recast exceptions require explanations and redundant base recast fields are rejected', () => {
    const f = fixture()
    delete f.job.actions[0].gcdRecastOverrideReason
    write(join(f.dir, 'jobs/MCH.json'), f.job)
    assert.equal(validateCatalog(f.dir).valid, false)
    delete f.job.actions[0].gcdRecastOverrideMs
    f.job.actions[0].baseGcdRecastMs = 2500
    write(join(f.dir, 'jobs/MCH.json'), f.job)
    assert.equal(validateCatalog(f.dir).valid, false)
})

test('unsupported inventory requires a reason', () => {
    const f = fixture()
    f.job.actions[0].statuses = []
    f.job.inventory.push({ id: 4, disposition: 'unsupported', reason: 'Pet schedule requires simulation' })
    f.save()
    assert.equal(validateCatalog(f.dir).valid, true)
    delete f.job.inventory[2].reason
    f.save()
    assert.equal(validateCatalog(f.dir).valid, false)
})

function git(cwd, ...args) {
    return execFileSync('git', args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim()
}
function repoFixture() {
    const root = mkdtempSync(join(tmpdir(), 'catalog-worktree-test-'))
    const origin = join(root, 'origin.git')
    const repo = join(root, 'checkout')
    git(root, 'init', '--bare', origin)
    git(origin, 'symbolic-ref', 'HEAD', 'refs/heads/main')
    git(root, 'clone', origin, repo)
    git(repo, 'symbolic-ref', 'HEAD', 'refs/heads/main')
    git(repo, 'config', 'user.email', 'fixture@example.com')
    git(repo, 'config', 'user.name', 'Fixture')
    writeFileSync(join(repo, 'tracked.txt'), 'original\n')
    git(repo, 'add', 'tracked.txt')
    git(repo, 'commit', '-m', 'Fixture baseline')
    git(repo, 'push', 'origin', 'main')
    return { root, origin, repo, base: git(repo, 'rev-parse', 'HEAD') }
}

test('worktree helper fetches default branch and preserves dirty tracked and untracked files', () => {
    const f = repoFixture()
    writeFileSync(join(f.repo, 'tracked.txt'), 'private unrelated modification\n')
    writeFileSync(join(f.repo, 'draft.txt'), 'untracked draft\n')
    const before = git(f.repo, 'status', '--porcelain')
    const run = () => JSON.parse(execFileSync('node', [join(scripts, 'action-catalog-worktree.mjs'), '--job', 'MCH', '--json'], { cwd: f.repo, encoding: 'utf8' }))
    const first = run()
    const second = run()
    assert.equal(first.base, f.base)
    assert.notEqual(first.branch, second.branch)
    assert.equal(git(first.worktree, 'rev-parse', 'HEAD'), f.base)
    assert.equal(git(first.worktree, 'status', '--porcelain'), '')
    assert.equal(git(f.repo, 'status', '--porcelain'), before)
    assert.equal(readFileSync(join(f.repo, 'tracked.txt'), 'utf8'), 'private unrelated modification\n')
    assert.equal(readFileSync(join(f.repo, 'draft.txt'), 'utf8'), 'untracked draft\n')
})

test('report does not claim complete without actual recorded checks or with missing evidence', () => {
    const f = repoFixture()
    const catalog = fixture()
    mkdirSync(join(f.repo, 'src/data/actionCatalog/jobs'), { recursive: true })
    for (const file of ['roles.json', 'statuses.json', 'jobs/MCH.json']) writeFileSync(join(f.repo, 'src/data/actionCatalog', file), readFileSync(join(catalog.dir, file)))
    git(f.repo, 'add', 'src')
    git(f.repo, 'commit', '-m', 'Add fixture catalog')
    const base = git(f.repo, 'rev-parse', 'HEAD')
    const evidenceFile = join(f.root, 'evidence.json')
    const run = () => JSON.parse(execFileSync('node', [join(scripts, 'action-catalog-report.mjs'), '--base', base, '--evidence', evidenceFile, '--json'], { cwd: f.repo, encoding: 'utf8' }))
    write(evidenceFile, { complete: true, checks: [], gaps: [] })
    assert.equal(run().outcome, 'incomplete')
    const checks = ['npm run test:unit', 'npm run test:browser', 'npm run lint', 'npm run build'].map(command => ({ command, exitCode: 0 }))
    write(evidenceFile, { complete: true, checks, gaps: [] })
    assert.equal(run().outcome, 'no-change')
    const data = JSON.parse(readFileSync(join(f.repo, 'src/data/actionCatalog/jobs/MCH.json')))
    data.actions[0].gcdRecastOverrideMs = 2450
    write(join(f.repo, 'src/data/actionCatalog/jobs/MCH.json'), data)
    assert.equal(run().changes[0].fields[0].field, 'gcdRecastOverrideMs')
    write(evidenceFile, { complete: false, checks, gaps: ['XIVAPI status unavailable; old identity preserved'] })
    assert.equal(run().outcome, 'incomplete')
    assert.equal(run().sources.length, 1)
})
