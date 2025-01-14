"use client";

import ky from 'ky'

const MAX_SEARCH_RESULTS = 10

type XivapiSheet = 'Action' | 'Status' | 'Item'

interface XivapiSearchResponse {
    fields: any
    row_id: number
    score: number
    sheet: string
}

const xivapi = ky.create({
    prefixUrl: 'https://beta.xivapi.com/api/1',
})

export const xivapiSearch = async (
sheets: XivapiSheet[],
    query: string,
): Promise<{ results: XivapiSearchResponse[] }> =>
    xivapi.get('search', {
    searchParams: {
        query: query,
        sheets: sheets.join(','),
        limit: MAX_SEARCH_RESULTS,
    },
  }).json()

export const getObject = async (
    sheet: XivapiSheet,
    id: number,
): Promise<any> =>
    xivapi.get(`sheet/${sheet}/${id}`).json()

export const convertBetaIconPath = (path: string): URL => {
    const [_, pathWithoutSuffix] = path.split('ui/icon/')
    const [pathWithoutFileType] = pathWithoutSuffix.split('.tex')

    return new URL(`https://xivapi.com/i/${pathWithoutFileType}.png`)
}
