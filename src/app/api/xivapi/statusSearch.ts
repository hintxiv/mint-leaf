"use client";

import XIVAPI, { XIVAPIOptions } from '@xivapi/js'
import { DataStatus } from './types'
import { xivapiSearch, convertBetaIconPath } from './xivapi'

const baseURL = 'https://xivapi.com'
const defaultIcon = 'https://xivapi.com/i/000000/000405_hr1.png'

const options: XIVAPIOptions = {
    language: "en"
}

const xiv = new XIVAPI(options)

export const searchForStatus = async (nameQuery: string): Promise<DataStatus[]> => {
    if (nameQuery === "") return [];

    const query = `Name~\"${nameQuery}\"`;
    const { results } = await xivapiSearch(['Status'], query);

    return results.map(({ row_id, fields }) => ({
        id: row_id.toString(),
        name: fields.Name,
        icon: fields.Icon ? convertBetaIconPath(fields.Icon.path_hr1) : null,
    })).filter(({ icon }) =>
        icon && icon.toString() !== defaultIcon
    );
}

export const getStatusByID = async (id: string): Promise<DataStatus> => {
    try {
        const isCustom = id.startsWith('custom-');

        if (isCustom) {
            const [_, icon, name] = decodeURI(id).split('-');
            return {
                id: id,
                name: name,
                icon: new URL(icon),
            };
        }

        const { Icon, Name } = await xiv.data.get('status', id);

        return {
            id: id,
            name: Name,
            icon: Icon ? new URL(baseURL + Icon.split('.png')[0] + '_hr1.png') : null,
        };
    } catch (e) {
        throw new Error(`No status with ID ${id} exists`);
    }
}
