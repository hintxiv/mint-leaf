"use client";

import ky from 'ky'

const MAX_SEARCH_RESULTS = 10

type XivapiSheet = 'Action' | 'Status' | 'Item' | 'ClassJob'

interface XivapiSearchResponse {
    fields: any
    row_id: number
    score: number
    sheet: string
}

/**
 * XIVAPI v2 client.
 * version / schema are not pinned (always latest) to prioritize new content support.
 * See https://v2.xivapi.com/docs/guides/pinning/ for pinning guidance.
 */
const xivapi = ky.create({
    prefixUrl: 'https://v2.xivapi.com/api',
})

export const xivapiSearch = async (
    sheets: XivapiSheet[],
    query: string,
): Promise<{ results: XivapiSearchResponse[] }> =>
    xivapi.get('search', {
        searchParams: {
            query,
            sheets: sheets.join(','),
            limit: MAX_SEARCH_RESULTS,
        },
    }).json()

export const getObject = async (
    sheet: XivapiSheet,
    id: number,
): Promise<any> =>
    xivapi.get(`sheet/${sheet}/${id}`).json()

/**
 * Convert a game texture path (e.g. ui/icon/000000/000786_hr1.tex)
 * to a CORS-enabled v2 asset PNG URL.
 * The legacy xivapi.com/i CDN lacks Access-Control-Allow-Origin,
 * which causes SecurityError on canvas toDataURL after drawing.
 */
export const convertIconPath = (path: string): URL =>
    new URL(`https://v2.xivapi.com/api/asset/${path}?format=png`)

const PLACEHOLDER_ICON_ID = 405

export const buildActionSearchQuery = (nameQuery: string): string =>
    `Name~"${nameQuery}" -Icon=${PLACEHOLDER_ICON_ID}`

export const buildStatusSearchQuery = (nameQuery: string): string =>
    `Name~"${nameQuery}" -Icon=${PLACEHOLDER_ICON_ID}`
