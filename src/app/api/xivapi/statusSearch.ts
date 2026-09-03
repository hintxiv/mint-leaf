"use client";

import { DataStatus } from './types'
import { buildStatusSearchQuery, xivapiSearch, convertIconPath, getObject } from './xivapi'

const defaultIcon = 'https://v2.xivapi.com/api/asset/ui/icon/000000/000405_hr1.tex?format=png'

export const searchForStatus = async (nameQuery: string): Promise<DataStatus[]> => {
    if (nameQuery === "") return [];

    const query = buildStatusSearchQuery(nameQuery);
    const { results } = await xivapiSearch(['Status'], query);

    return results.map(({ row_id, fields }) => ({
        id: row_id.toString(),
        name: fields.Name,
        icon: fields.Icon ? convertIconPath(fields.Icon.path_hr1) : null,
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

        const { fields } = await getObject('Status', parseInt(id));
        const icon = fields.Icon ? convertIconPath(fields.Icon.path_hr1) : null;
        const name = fields.Name;

        return { id, name, icon };
    } catch (e) {
        throw new Error(`No status with ID ${id} exists`);
    }
}
