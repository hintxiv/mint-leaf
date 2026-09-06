import { execFileSync } from 'node:child_process'
import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { randomBytes } from 'node:crypto'
import { emit, fail, heading, options } from './action-catalog-cli.mjs'

let opts
try {
    opts = options(process.argv.slice(2), ['--job', '--remote', '--remote-url', '--json', '--help'])
    const info = heading(import.meta.url, 'Create an isolated catalog refresh branch from the fetched default branch.')
    if (opts.help) emit({ ...info, usage: 'node scripts/action-catalog-worktree.mjs --job MCH [--remote origin] [--remote-url https://host/repo.git] [--json]', examples: ['node scripts/action-catalog-worktree.mjs --job MCH', 'node scripts/action-catalog-worktree.mjs --job MCH --remote fixture --json'] }, opts.json)
    else if (!opts.job) emit({ ...info, status: 'No worktree created; --job is required.', help: 'node scripts/action-catalog-worktree.mjs --job <JOB>' }, opts.json)
    else {
        if (!/^[A-Z]{2,4}$/.test(opts.job)) throw new Error('--job must be an uppercase job abbreviation')
        const remote = opts.remote ?? 'origin'
        if (!/^[a-zA-Z0-9][a-zA-Z0-9._-]*$/.test(remote)) throw new Error('--remote must be a configured remote name')
        const git = (...args) => execFileSync('git', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], env: { ...process.env, GIT_TERMINAL_PROMPT: '0' }, timeout: 120000 }).trim()
        if (opts['remote-url'] && !/^https:\/\//.test(opts['remote-url'])) throw new Error('--remote-url must use HTTPS')
        const source = opts['remote-url'] ?? remote
        const original = git('rev-parse', '--show-toplevel')
        const dirtyBefore = git('status', '--porcelain=v1')
        const remoteHead = git('ls-remote', '--symref', source, 'HEAD').match(/^ref: refs\/heads\/(.+)\tHEAD$/m)?.[1]
        if (!remoteHead) throw new Error(`Cannot discover ${remote}'s default branch; configure the remote HEAD and retry`)
        git('fetch', '--no-tags', source, `+refs/heads/${remoteHead}:refs/remotes/${remote}/${remoteHead}`)
        const base = git('rev-parse', `refs/remotes/${remote}/${remoteHead}`)
        const branch = `refresh/${opts.job.toLowerCase()}-${new Date().toISOString().replace(/[-:.TZ]/g, '')}-${randomBytes(4).toString('hex')}`
        const worktree = join(mkdtempSync(join(tmpdir(), 'mint-leaf-refresh-')), opts.job.toLowerCase())
        git('worktree', 'add', '-b', branch, worktree, base)
        emit({ ...info, status: 'created', job: opts.job, branch, worktree, base, defaultBranch: `${remote}/${remoteHead}`, original, originalDirty: dirtyBefore.length > 0, help: `Continue inside ${worktree}; inspect repository instructions before changing data.` }, opts.json)
    }
} catch (error) {
    const wrapped = error.status !== undefined ? new Error(`Git prerequisite failed: ${error.stderr?.toString().trim() || error.message}`) : error
    fail(wrapped, opts?.json)
}
