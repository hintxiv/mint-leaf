"use client";

import { Locale } from '@/context/LanguageContext'
import { DataAction, actionTimingFromFields } from './types'
import {
    buildJobActionListQuery,
    convertIconPath,
    JOB_ACTION_LIST_FIELDS,
    PLACEHOLDER_ICON_ID,
    xivapiSearchAll,
} from './xivapi'

const defaultIcon = 'https://v2.xivapi.com/api/asset/ui/icon/000000/000405_hr1.tex?format=png'

export interface JobListAction extends DataAction {
    // False for hotbar-replacement skills that still appear in job rotations
    isPlayerAction: boolean
    // Colored HTML from XIVAPI transient Description@as(html)
    description: string | null
    // Palette order: job before role, descending level, then localized name
    classJobLevel: number
    isRoleAction?: boolean
}

export interface JobActionFetchResult {
    actions: JobListAction[]
    // Game version from the XIVAPI response when present
    version?: string
    // Schema id from the XIVAPI response when present
    schema?: string
}

// Load PvE actions for the selected job from XIVAPI.
export const fetchJobActions = async (
    jobAbbreviation: string,
    language: Locale,
): Promise<JobActionFetchResult> => {
    const query = buildJobActionListQuery(jobAbbreviation)
    const { results, version, schema } = await xivapiSearchAll(
        ['Action'],
        query,
        language,
        { fields: JOB_ACTION_LIST_FIELDS, transient: 'Description@as(html)' },
    )

    const actions: JobListAction[] = []

    for (const { row_id, fields, transient } of results) {
        // Icon may be an object or a numeric id
        const iconId =
            typeof fields.Icon === 'number'
                ? fields.Icon
                : fields.Icon?.id
        if (iconId === PLACEHOLDER_ICON_ID) {
            continue
        }

        const iconPath = fields.Icon?.path_hr1
        const icon = iconPath ? convertIconPath(iconPath) : null
        if (!icon || icon.toString() === defaultIcon) {
            continue
        }

        const descriptionHtml = transient?.['Description@as(html)']
        const description =
            typeof descriptionHtml === 'string' && descriptionHtml.length > 0
                ? descriptionHtml
                : null

        actions.push({
            id: row_id.toString(),
            ...actionTimingFromFields(fields),
            isRoleAction: fields.IsRoleAction === true,
            name: fields.Name ?? null,
            icon,
            isPlayerAction: fields.IsPlayerAction === true,
            description,
            classJobLevel: typeof fields.ClassJobLevel === 'number' ? fields.ClassJobLevel : 0,
        })
    }

    return { actions: sortJobActions(actions, language), version, schema }
}

export const sortJobActions = (actions: JobListAction[], language: Locale): JobListAction[] =>
    [...actions].sort((a, b) => Number(!!a.isRoleAction) - Number(!!b.isRoleAction)
        || b.classJobLevel - a.classJobLevel
        || (a.name ?? '').localeCompare(b.name ?? '', language)
        || a.id.localeCompare(b.id, 'en', { numeric: true }))
