import { fileURLToPath } from 'node:url'
import { homedir } from 'node:os'

/** Small TOON object/list subset: all string values are JSON-quoted. */
export function emit(value, json = false) {
    if (json) return console.log(JSON.stringify(value, null, 2))
    const lines = []
    const visit = (object, depth = 0) => {
        const pad = '  '.repeat(depth)
        for (const [key, item] of Object.entries(object)) {
            if (Array.isArray(item)) {
                lines.push(`${pad}${key}[${item.length}]:`)
                for (const entry of item) {
                    if (entry && typeof entry === 'object') {
                        const start = lines.length
                        visit(entry, depth + 2)
                        if (lines.length === start) lines.push(`${pad}  - {}`)
                        else lines[start] = `${pad}  - ${lines[start].trimStart()}`
                    } else lines.push(`${pad}  - ${JSON.stringify(entry)}`)
                }
            } else if (item && typeof item === 'object') {
                lines.push(`${pad}${key}:`)
                visit(item, depth + 1)
            } else lines.push(`${pad}${key}: ${JSON.stringify(item)}`)
        }
    }
    visit(value)
    console.log(lines.join('\n'))
}

export function options(args, allowed) {
    const result = {}
    for (let i = 0; i < args.length; i++) {
        const arg = args[i]
        if (!allowed.includes(arg)) throw new Error(`Unknown option ${arg}; run with --help`)
        if (arg === '--help' || arg === '--json') result[arg.slice(2)] = true
        else {
            const next = args[++i]
            if (!next || next.startsWith('--')) throw new Error(`${arg} needs a value`)
            result[arg.slice(2)] = next
        }
    }
    return result
}

export function heading(url, description) {
    return { bin: fileURLToPath(url).replace(homedir(), '~'), description }
}

export function fail(error, json = false, code = 1) {
    emit({ error: error.message, help: 'Correct the reported input or prerequisite and rerun the same command.' }, json)
    process.exitCode = code
}
