import { parseRotationRecord, type RotationRecord } from './rotationLibraryStore'

const TEXT_FORMAT = 'mint-leaf-rotation'
const TEXT_VERSION = 1 as const

export interface RotationRecordTextPayload {
    format: typeof TEXT_FORMAT
    version: typeof TEXT_VERSION
    record: RotationRecord
}

// Serialize a full rotation record for clipboard JSON.
export const rotationRecordToText = (record: RotationRecord): string =>
    JSON.stringify({
        format: TEXT_FORMAT,
        version: TEXT_VERSION,
        record,
    } satisfies RotationRecordTextPayload)

// Restore a rotation record from pasted text.
// On success, returns a record with a freshly minted id. Throws on failure.
export const textToRotationRecord = (text: string): RotationRecord => {
    let parsed: unknown
    try {
        parsed = JSON.parse(text)
    } catch {
        throw new Error('Rotation record text is not valid JSON')
    }

    if (!parsed || typeof parsed !== 'object') {
        throw new Error('Rotation record text must be a JSON object')
    }

    const payload = parsed as Record<string, unknown>
    if (payload['format'] !== TEXT_FORMAT) {
        throw new Error(`Unexpected rotation record format: ${String(payload['format'])}`)
    }
    if (payload['version'] !== TEXT_VERSION) {
        throw new Error(`Unsupported rotation record version: ${String(payload['version'])}`)
    }

    const record = parseRotationRecord(payload['record'], 'mint')
    if (!record) {
        throw new Error('Rotation record payload is invalid')
    }
    return record
}
