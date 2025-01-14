"use client";

import { DataAction } from './types'
import { convertBetaIconPath, getObject, xivapiSearch } from './xivapi'

const defaultIcon = 'https://xivapi.com/i/000000/000405_hr1.png'

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
        const parsedId = parseInt(id.replace('item-', ''))

        const { fields } = await getObject(isItem ? 'Item' : 'Action', parsedId);
        const icon = fields.Icon ? convertBetaIconPath(fields.Icon.path_hr1) : null;
        const name = fields.Name;

        return { id, name, icon };
    } catch (e) {
        throw new Error(`No action with ID ${id} exists`);
    }
}
