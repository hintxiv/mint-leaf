import { describe, expect, it } from 'vitest'
import { graphemes, normalizeLabel, TextMeasurer, truncateLabel, wrapMeasuredText } from './textLayout'

const measurer: TextMeasurer = {
    measure(text) {
        const width = Array.from(text).reduce((sum, character) => sum + (/[MW]/.test(character) ? 12 : /[il]/.test(character) ? 3 : 7), 0)
        return {
            width,
            actualBoundingBoxAscent: 8,
            actualBoundingBoxDescent: 2,
            actualBoundingBoxLeft: 0,
            actualBoundingBoxRight: width,
        }
    },
}

describe('measured text layout', () => {
    it('wraps proportional text by measured width instead of character count', () => {
        expect(wrapMeasuredText('iiii WWWW tail', 30, '10px test', measurer)).toEqual(['iiii', 'WW', 'WW', 'tail'])
    })

    it('normalizes Unicode whitespace and omits empty labels', () => {
        expect(normalizeLabel('  one\t two\n\u2003three  ')).toBe('one two three')
        expect(wrapMeasuredText(' \n\t ', 100, '10px test', measurer)).toEqual([])
    })

    it('breaks oversized unspaced tokens at grapheme boundaries', () => {
        expect(wrapMeasuredText('MMMM', 25, '10px test', measurer)).toEqual(['MM', 'MM'])
    })

    it('counts combining marks and joined emoji as grapheme clusters', () => {
        expect(graphemes('e\u0301👩‍🚀')).toEqual(['e\u0301', '👩‍🚀'])
    })

    it('keeps 40 graphemes before the ellipsis', () => {
        const value = `${'a'.repeat(39)}e\u0301👩‍🚀z`
        expect(graphemes(truncateLabel(value))).toHaveLength(41)
        expect(truncateLabel(value)).toBe(`${'a'.repeat(39)}e\u0301…`)
        expect(truncateLabel('Grade 6 Gemdraught of Intelligence')).toBe('Grade 6 Gemdraught of Intelligence')
    })
})
