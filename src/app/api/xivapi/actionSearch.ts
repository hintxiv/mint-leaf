"use client";

import { DataAction } from './types'
import { buildActionSearchQuery, convertIconPath, getObject, xivapiSearch } from './xivapi'

const defaultIcon = 'https://v2.xivapi.com/api/asset/ui/icon/000000/000405_hr1.tex?format=png'

export const searchForAction = async (nameQuery: string): Promise<DataAction[]> => {
    if (nameQuery === "") return [];

    const query = buildActionSearchQuery(nameQuery);
    const { results } = await xivapiSearch(['Action', 'Item'], query);

    return results.map(({ row_id, fields, sheet }) => ({
        id: (sheet === 'Item' ? 'item-' : '') + row_id.toString(),
        name: fields.Name,
        icon: fields.Icon ? convertIconPath(fields.Icon.path_hr1) : null,
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
        const icon = fields.Icon ? convertIconPath(fields.Icon.path_hr1) : null;
        const name = fields.Name;

        return { id, name, icon };
    } catch (e) {
        throw new Error(`No action with ID ${id} exists`);
    }
}
