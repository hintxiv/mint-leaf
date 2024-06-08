"use client";

import XIVAPI, { XIVAPIOptions } from '@xivapi/js'
import { DataAction } from './types'
import { Job } from '@/data/jobs'

const baseURL = 'https://xivapi.com'
const defaultIcon = 'https://xivapi.com/i/000000/000405_hr1.png'

const options: XIVAPIOptions = {
    language: "en"
}

const xiv = new XIVAPI(options)

export const searchForAction = async (query: string, job: Job): Promise<DataAction[]> => {
    const jobIDs = [job.id, ...(job.subIDs ?? [])].join(';');

    const { Results: jobResults } = await xiv.search(query, {
        // @ts-ignore (bad type definition in lib)
        indexes: ['Action'],
        filters: [`ClassJob.ID|=${jobIDs}`]
    });
    const { Results: otherResults } = await xiv.search(query, {
        // @ts-ignore (bad type definition in lib)
        indexes: ['Action'],
        filters: ['ClassJob.ID!!']
    });
    // @ts-ignore (bad type definition in lib)
    const { Results: itemResults } = await xiv.search(query, { indexes: ['Item'] });
    const adjustedItemResults = (itemResults ?? []).map(({ ID, Icon, Name }) => ({
        ID: `item-${ID}`,
        Icon,
        Name,
    }));

    return [...(jobResults ?? []), ...(otherResults ?? []), ...adjustedItemResults]
        .map(({ ID, Icon, Name }) => ({
            id: ID.toString(),
            name: Name,
            icon: Icon ? new URL(baseURL + Icon.split('.png')[0] + '_hr1.png') : null,
        }))
        .filter(({ icon }) =>
            icon && icon.toString() !== defaultIcon
        );
}

export const getActionByID = async (id: string): Promise<DataAction> => {
    try {
        const isItem = id.startsWith('item-');

        if (isItem) {
            const itemID = id.replace('item-', '');
            const { Icon, Name } = await xiv.data.get('item', itemID);
            return {
                id: itemID,
                name: Name,
                icon: Icon ? new URL(baseURL + Icon.split('.png')[0] + '_hr1.png') : null,
            };
        }

        const { Icon, Name } = await xiv.data.get('action', id);

        return {
            id: id,
            name: Name,
            icon: Icon ? new URL(baseURL + Icon.split('.png')[0] + '_hr1.png') : null,
        };
    } catch (e) {
        console.log(e);
        throw new Error(`No action with ID ${id} exists`);
    }
}
