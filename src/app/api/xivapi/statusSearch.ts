"use client";

import { DataStatus } from './types'
import { xivapiSearch, convertBetaIconPath, getObject } from './xivapi'

const defaultIcon = 'https://xivapi.com/i/000000/000405_hr1.png'

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

        const { fields } = await getObject('Status', parseInt(id));
        const icon = fields.Icon ? convertBetaIconPath(fields.Icon.path_hr1) : null;
        const name = fields.Name;

        return { id, name, icon };
    } catch (e) {
        throw new Error(`No status with ID ${id} exists`);
    }
}
