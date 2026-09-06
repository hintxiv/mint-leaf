import { expect, it, vi } from 'vitest'
import type { Action } from '@/components/Canvas/types'
vi.mock('@/app/api', () => ({ getStatusByID: vi.fn() }))
import { getStatusByID } from '@/app/api'
import { applyStatusNames, loadStatusNames } from './statusNames'

it('keeps a status usable when its API name is unavailable', async () => {
    vi.mocked(getStatusByID).mockRejectedValueOnce(new Error('Offline'))
    expect(await loadStatusNames(['851'], 'ja')).toEqual({ '851': '851' })
    expect(getStatusByID).toHaveBeenCalledWith('851', 'ja')
})

it('fills pending names without overwriting settings or edits made during the request', () => {
    const status = { id: '851', name: '', imageSrc: '', color: '#123456', duration: 3, applicationDelay: 0.5, enabled: false }
    const action: Action = { id: '2876', instanceId: 'one', name: 'Reassemble', imageSrc: '', type: 'ogcd', statusesApplied: [status] }
    expect(applyStatusNames([action], { '851': 'API name' })[0].statusesApplied).toEqual([{ ...status, name: 'API name' }])
    const edited = { ...action, statusesApplied: [{ ...status, name: 'Edited name' }] }
    expect(applyStatusNames([edited], { '851': 'API name' })[0]).toBe(edited)
    const removed = { ...action, statusesApplied: [] }
    expect(applyStatusNames([removed], { '851': 'API name' })[0]).toBe(removed)
    expect(applyStatusNames([], { '851': 'API name' })).toEqual([])
})
