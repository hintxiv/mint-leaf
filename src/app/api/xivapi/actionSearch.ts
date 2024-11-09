"use client";

import XIVAPI, { XIVAPIOptions } from '@xivapi/js'
import { DataAction } from './types'
import { convertBetaIconPath, xivapiSearch } from './xivapi'

const baseURL = 'https://xivapi.com'
const defaultIcon = 'https://xivapi.com/i/000000/000405_hr1.png'

const options: XIVAPIOptions = {
    language: "en"
}

const xiv = new XIVAPI(options)

export const searchForAction = async (nameQuery: string): Promise<DataAction[]> => {
    if (nameQuery === "") return [];

    const query = `Name~\"${nameQuery}\"`;
    const { results } = await xivapiSearch(['Action', 'Item'], query);

    return results.map(({ row_id, fields }) => ({
        id: row_id.toString(),
        name: fields.Name,
        icon: fields.Icon ? convertBetaIconPath(fields.Icon.path_hr1) : null,
    })).filter(({ icon }) =>
        icon && icon.toString() !== defaultIcon
    );
}

export const getActionByID = async (id: string): Promise<DataAction> => {
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
        throw new Error(`No action with ID ${id} exists`);
    }
}
