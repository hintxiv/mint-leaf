import { Status } from '@/components/Canvas/types';

const CUSTOM_ACTIONS_KEY = 'mint-leaf-custom-actions';

export interface StoredCustomAction {
    id: string;
    name: string;
    iconUrl: string;
    recastTime?: number;
    castTime?: number;
    isGCD: boolean;
    lateWeave?: boolean;
    appliesBuff: boolean;
    statusesApplied?: Status[];
    buffDetails?: {
        id: string;
        name: string;
        iconUrl: string;
        duration: number;
        applicationDelay: number;
        color: string;
    };
}

interface CustomActionsStore {
    [actionId: string]: StoredCustomAction;
}

/**
 * Retrieves all stored custom actions from local storage
 */
export const getStoredCustomActions = (): CustomActionsStore => {
    if (typeof window === 'undefined') {
        return {};
    }

    try {
        const stored = localStorage.getItem(CUSTOM_ACTIONS_KEY);
        if (!stored) {
            return {};
        }
        return JSON.parse(stored);
    } catch (error) {
        console.error('Error retrieving custom actions from local storage:', error);
        return {};
    }
};

/**
 * Retrieves a specific custom action by ID from local storage
 */
export const getStoredCustomAction = (actionId: string): StoredCustomAction | null => {
    const allActions = getStoredCustomActions();
    return allActions[actionId] || null;
};

/**
 * Saves a custom action to local storage
 */
export const saveCustomAction = (action: StoredCustomAction): void => {
    if (typeof window === 'undefined') {
        return;
    }

    try {
        const allActions = getStoredCustomActions();
        allActions[action.id] = action;
        localStorage.setItem(CUSTOM_ACTIONS_KEY, JSON.stringify(allActions));
    } catch (error) {
        console.error('Error saving custom action to local storage:', error);
    }
};

/**
 * Removes a custom action from local storage
 */
export const removeCustomAction = (actionId: string): void => {
    if (typeof window === 'undefined') {
        return;
    }

    try {
        const allActions = getStoredCustomActions();
        delete allActions[actionId];
        localStorage.setItem(CUSTOM_ACTIONS_KEY, JSON.stringify(allActions));
    } catch (error) {
        console.error('Error removing custom action from local storage:', error);
    }
};

/**
 * Clears all custom actions from local storage
 */
export const clearAllCustomActions = (): void => {
    if (typeof window === 'undefined') {
        return;
    }

    try {
        localStorage.removeItem(CUSTOM_ACTIONS_KEY);
    } catch (error) {
        console.error('Error clearing custom actions from local storage:', error);
    }
};

/**
 * Converts a Status object to the stored buff details format
 */
export const statusToBuffDetails = (status: Status) => {
    return {
        id: status.id,
        name: status.name,
        iconUrl: status.imageSrc,
        duration: status.duration,
        applicationDelay: status.applicationDelay,
        color: status.color,
    };
};

/**
 * Converts stored buff details to a Status object
 */
export const buffDetailsToStatus = (buffDetails: StoredCustomAction['buffDetails']): Status | undefined => {
    if (!buffDetails) {
        return undefined;
    }

    return {
        id: buffDetails.id,
        name: buffDetails.name,
        imageSrc: buffDetails.iconUrl,
        duration: buffDetails.duration,
        applicationDelay: buffDetails.applicationDelay,
        color: buffDetails.color,
    };
};
