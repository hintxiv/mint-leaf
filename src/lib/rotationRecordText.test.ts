import { describe, expect, it } from 'vitest'
import type { RotationRecord } from './rotationLibraryStore'
import { rotationRecordToText, textToRotationRecord } from './rotationRecordText'

const sampleRecord = (): RotationRecord => ({
    id: 'original-id',
    title: 'Opener',
    job: 'DRK',
    expansion: 'Dawntrail',
    patch: '7.4',
    level: 100,
    rowCount: 2,
    rowSpacing: null,
    prepullRotation: [
        {
            type: 'ogcd',
            id: '7390',
            instanceId: 'instance-7390',
            name: 'The Blackest Night',
            imageSrc: 'https://example.com/tbn.png',
            prepull: -5,
            lateWeave: false,
        },
    ],
    rotation: [
        {
            type: 'gcd',
            id: '3617',
            instanceId: 'instance-3617',
            name: 'Hard Slash',
            imageSrc: 'https://example.com/hs.png',
            recastTime: 2.5,
            castTime: 0,
            statusApplied: {
                id: '742',
                name: 'Blood Weapon',
                imageSrc: 'https://example.com/bw.png',
                color: '#ff0000',
                applicationDelay: 0.5,
                duration: 15,
            },
        },
    ],
})

describe('rotationRecordText', () => {
    it('round-trips metadata and sequences and mints a new id', () => {
        const source = sampleRecord()
        const text = rotationRecordToText(source)
        expect(text.includes('\n')).toBe(false)
        const imported = textToRotationRecord(text)

        expect(imported.id).not.toBe(source.id)
        expect(imported.title).toBe('Opener')
        expect(imported.job).toBe('DRK')
        expect(imported.expansion).toBe('Dawntrail')
        expect(imported.patch).toBe('7.4')
        expect(imported.level).toBe(100)
        expect(imported.rowCount).toBe(2)
        expect(imported.rowSpacing).toBeNull()
        expect(imported.prepullRotation).toHaveLength(1)
        expect(imported.prepullRotation[0]?.id).toBe('7390')
        expect(imported.rotation).toHaveLength(1)
        expect(imported.rotation[0]?.type).toBe('gcd')
        if (imported.rotation[0]?.type === 'gcd') {
            expect(imported.rotation[0].statusApplied?.id).toBe('742')
        }
    })

    it('rejects an unexpected format', () => {
        expect(() =>
            textToRotationRecord(JSON.stringify({
                format: 'other',
                version: 1,
                record: sampleRecord(),
            })),
        ).toThrow(/Unexpected rotation record format/)
    })

    it('rejects an unsupported version', () => {
        expect(() =>
            textToRotationRecord(JSON.stringify({
                format: 'mint-leaf-rotation',
                version: 2,
                record: sampleRecord(),
            })),
        ).toThrow(/Unsupported rotation record version/)
    })

    it('rejects invalid JSON', () => {
        expect(() => textToRotationRecord('not json')).toThrow(/not valid JSON/)
    })

    it('rejects an invalid action array', () => {
        const bad = {
            format: 'mint-leaf-rotation',
            version: 1,
            record: {
                ...sampleRecord(),
                rotation: [{ id: '1', name: 'Broken' }],
            },
        }
        expect(() => textToRotationRecord(JSON.stringify(bad))).toThrow(
            /Rotation record payload is invalid/,
        )
    })
})
