import { getStatusByID } from '@/app/api'
import type { Action } from '@/components/Canvas/types'
import type { Locale } from '@/context/LanguageContext'

export const loadStatusNames = async (ids: string[], locale: Locale): Promise<Record<string, string>> =>
    Object.fromEntries(await Promise.all(ids.map(async id => {
        try {
            const status = await getStatusByID(id, locale)
            return [id, status.name || id]
        } catch {
            // Keep the status usable when its API presentation is unavailable.
            return [id, id]
        }
    })))

// Only fill pending names; preserve edits and never restore removed statuses/actions.
export const applyStatusNames = (actions: Action[], names: Record<string, string>): Action[] =>
    actions.map(action => action.statusesApplied?.some(status => !status.name && names[status.id])
        ? { ...action, statusesApplied: action.statusesApplied.map(status =>
            !status.name && names[status.id] ? { ...status, name: names[status.id] } : status) }
        : action)
