"use client";

import XIVAPI, { XIVAPIOptions } from '@xivapi/js'
import { DataStatus } from './types'
import { Job } from '@/data/jobs'

const baseURL = 'https://xivapi.com'
const defaultIcon = 'https://xivapi.com/i/000000/000405_hr1.png'

const options: XIVAPIOptions = {
    language: "en"
}

const xiv = new XIVAPI(options)

export const searchForStatus = async (query: string, job: Job): Promise<DataStatus[]> => {
    const jobIDs = [job.id, ...(job.subIDs ?? [])].join(';');

    const { Results: jobResults } = await xiv.search(query, {
        // @ts-ignore (bad type definition in lib)
        indexes: ['Status'],
        filters: [`ClassJob.ID|=${jobIDs}`]
    });
    const { Results: otherResults } = await xiv.search(query, {
        // @ts-ignore (bad type definition in lib)
        indexes: ['Status'],
        filters: ['ClassJob.ID!!']
    });

    return [...(jobResults ?? []), ...(otherResults ?? [])]
        .map(({ ID, Icon, Name }) => ({
            id: ID.toString(),
            name: Name,
            icon: Icon ? new URL(baseURL + Icon.split('.png')[0] + '_hr1.png') : null,
        }))
        .filter(({ icon }) =>
            icon && icon.toString() !== defaultIcon
        );
}

export const getStatusByID = async (id: string): Promise<DataStatus> => {
    const { Icon, Name } = await xiv.data.get('status', id);
    return {
        id: id,
        name: Name,
        icon: Icon ? new URL(baseURL + Icon.split('.png')[0] + '_hr1.png') : null,
    };
}
