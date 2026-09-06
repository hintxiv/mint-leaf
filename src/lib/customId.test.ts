import { expect, it } from 'vitest'
import { encodeCustomId, decodeCustomId } from './customId'
it('roundtrips custom names and icon URLs containing text-format delimiters', () => {
    const icon = 'https://example.test/my-icons/test.png?x=a,b&y=[2]'
    const name = 'My buff - [one, two] 日本語'
    const id = encodeCustomId(icon, name)
    expect(id).not.toMatch(/[\[\], ]/)
    expect(decodeCustomId(id)).toEqual({ icon: new URL(icon), name })
    expect(decodeCustomId(encodeURI('custom-https://example.test/icon.png-Old Buff'))).toEqual({ icon: new URL('https://example.test/icon.png'), name: 'Old Buff' })
})
