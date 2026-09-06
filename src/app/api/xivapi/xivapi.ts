"use client";

import ky from 'ky'
import { Locale } from '@/context/LanguageContext'

// Max rows returned by a single-page search
const MAX_SEARCH_RESULTS = 10

// Default per-request page size when following search cursors
const DEFAULT_SEARCH_PAGE_LIMIT = 100

// Fields requested when listing job actions
const JOB_ACTION_LIST_FIELDS = 'Name,Icon,ClassJobLevel,IsPlayerAction,IsRoleAction,ActionCategory,Recast100ms,Cast100ms'

type XivapiSheet = 'Action' | 'Status' | 'Item' | 'ClassJob'

interface XivapiSearchResponse {
    fields: any
    row_id: number
    score: number
    sheet: string
    transient?: {
        Description?: string
        // Colored rich text from XIVAPI SeString conversion
        'Description@as(html)'?: string
    }
}

interface XivapiSearchPage {
    results: XivapiSearchResponse[]
    next?: string
    version?: string
    schema?: string
}

const xivapi = ky.create({
    prefixUrl: 'https://v2.xivapi.com/api',
})

// Search XIVAPI sheets and return a single page of matches.
//
// Does not follow `next` cursors; results are capped by MAX_SEARCH_RESULTS.
export const xivapiSearch = async (
    sheets: XivapiSheet[],
    query: string,
    language: Locale,
    fields?: string,
): Promise<{ results: XivapiSearchResponse[] }> =>
    xivapi.get('search', {
        searchParams: {
            query,
            sheets: sheets.join(','),
            limit: MAX_SEARCH_RESULTS,
            ...(fields ? { fields } : {}),
            ...(language === 'ja' ? { language: 'ja' } : {}),
        },
    }).json()

// Search XIVAPI sheets and return every matching row.
//
// Follows `next` cursors until exhausted.
export const xivapiSearchAll = async (
    sheets: XivapiSheet[],
    query: string,
    language: Locale,
    options?: {
        limit?: number
        fields?: string
        // Comma-separated transient fields (e.g. Description)
        transient?: string
    },
): Promise<{
    results: XivapiSearchResponse[]
    version?: string
    schema?: string
}> => {
    const limit = options?.limit ?? DEFAULT_SEARCH_PAGE_LIMIT
    const fields = options?.fields
    const transient = options?.transient
    const allResults: XivapiSearchResponse[] = []
    let cursor: string | undefined
    let version: string | undefined
    let schema: string | undefined

    const presentationParams: Record<string, string | number> = {
        limit,
    }
    if (fields) {
        presentationParams.fields = fields
    }
    if (transient) {
        presentationParams.transient = transient
    }
    if (language === 'ja') {
        presentationParams.language = 'ja'
    }

    do {
        const searchParams: Record<string, string | number> = {
            ...presentationParams,
        }

        if (cursor) {
            searchParams.cursor = cursor
        } else {
            searchParams.query = query
            searchParams.sheets = sheets.join(',')
        }

        const page: XivapiSearchPage = await xivapi.get('search', { searchParams }).json()
        allResults.push(...page.results)

        if (page.version !== undefined) {
            version = page.version
        }
        if (page.schema !== undefined) {
            schema = page.schema
        }

        cursor = page.next
    } while (cursor)

    return { results: allResults, version, schema }
}

export const getObject = async (
    sheet: XivapiSheet,
    id: number,
    language: Locale,
): Promise<any> =>
    xivapi.get(`sheet/${sheet}/${id}`, {
        searchParams: { ...(language === 'ja' ? { language: 'ja' } : {}),
            ...(sheet === 'Action' ? { fields: 'Name,Icon,ActionCategory,Recast100ms,Cast100ms' } : {}) },
    }).json()

// Convert a game texture path (e.g. ui/icon/000000/000786_hr1.tex)
// to a v2 asset PNG URL so icon delivery stays on the same API host.
export const convertIconPath = (path: string): URL =>
    new URL(`https://v2.xivapi.com/api/asset/${path}?format=png`)

// Empty / unused Action and Status rows often use Icon id 405
// (ui/icon/000000/000405*.tex). Excluding it in the query reduces
// junk hits from the API.
const PLACEHOLDER_ICON_ID = 405

export const buildNameSearchQuery = (nameQuery: string, language: Locale): string => {
    const field = language === 'ja' ? 'Name@ja' : 'Name'
    return `${field}~"${nameQuery}"`
}

// Build an Action / Item name search query.
// Name~ (or Name@ja~) matches the entered text; -Icon excludes placeholder icons.
export const buildActionSearchQuery = (nameQuery: string, language: Locale): string =>
    `${buildNameSearchQuery(nameQuery, language)} -Icon=${PLACEHOLDER_ICON_ID}`

// Build a Status name search query.
export const buildStatusSearchQuery = (nameQuery: string, language: Locale): string =>
    `${buildNameSearchQuery(nameQuery, language)} -Icon=${PLACEHOLDER_ICON_ID}`

// ClassJobCategory row 1 is named "all classes".
// Occult Crescent shared actions (Dodge, etc.) use this category, so they match
// every +ClassJobCategory.{job}=true query even though they are not job skills.
const ALL_CLASSES_JOB_CATEGORY_ID = 1

// Query for PvE actions usable by a job, including hotbar replacements
// (Confiteor combo, ninjutsu, enchanted melee, etc.).
// ClassJobCategory includes role actions.
// ClassJobLevel>=1 drops Lv0 NPC/event junk.
// -ClassJobCategory=1 drops all classes shared content (see ALL_CLASSES_JOB_CATEGORY_ID).
export const buildJobActionListQuery = (jobAbbreviation: string): string =>
    `+ClassJobCategory.${jobAbbreviation}=true +IsPvP=false +ClassJobLevel>=1 -ClassJobCategory=${ALL_CLASSES_JOB_CATEGORY_ID}`

export { JOB_ACTION_LIST_FIELDS, PLACEHOLDER_ICON_ID }
