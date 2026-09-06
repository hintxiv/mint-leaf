import { describe, expect, it, vi } from 'vitest'
vi.mock('@/app/api', () => ({
    getActionByID: vi.fn(async (id: string) => ({ id, name: `Action ${id}`, icon: new URL('https://example.test/action.png') })),
    getStatusByID: vi.fn(async (id: string) => ({ id, name: `Status ${id}`, icon: new URL('https://example.test/status.png') })),
}))
import { getStatusByID } from '@/app/api'
import { textToRotation, rotationToText } from './parseRotation'

describe('rotation text snapshots', () => {
    it('resolves catalog status names through the API in the requested language', async () => {
        const parsed = await textToRotation('2876 oGCD normal [851 0 5 #123456]', 'ja')
        expect(getStatusByID).toHaveBeenCalledWith('851', 'ja')
        expect(parsed && parsed[0].statusesApplied?.[0].name).toBe('Status 851')
    })
    it.each(['1 GCD 2.45 0', '-5 1 oGCD normal [9 0 20 #123456]', '1 GCD 0 1.8 [9 0 0 #abcdef disabled] [10 0.7 13 #123456]', '0 1 oGCD lateWeave', '1 GCD 2.5 0 [9 0 20 auto] [10 0 5 auto disabled]'])('roundtrips %s', async text => {
        const parsed = await textToRotation(text, 'en')
        expect(parsed).not.toBe(false)
        if (!parsed) return
        expect(rotationToText(parsed)).toBe(text)
        expect(parsed[0].defaults?.recastSource).toBe('import')
    })
    it.each([
        '1 GCD NaN 0', '1 GCD 2oops 0', '1 GCD 2.5 0 [9 0 20 #123456',
        '1 GCD 2.5 0 [9 0 20 #123456] garbage', '1 GCD 2.5 0 []',
        '1 GCD 2.5 0 [9 0 20 #123456] [10 nope 20 #123456]',
        '1 GCD 2.5 0 [9 0 20 #123456 enabled]', '1 GCD 2.5 0 [9 0 20 red]',
        '1 GCD 2.5 0 ]', '1 GCD 2.5 0 [[9 0 20 #123456]]', '1 oGCD unknown',
    ])('rejects malformed input: %s', async text => expect(await textToRotation(text, 'en')).toBe(false))
})
