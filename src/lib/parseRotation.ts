import { getActionByID, getStatusByID } from '@/app/api'
import { Action, GCD, Status, oGCD } from '../components/Canvas/types'

export const rotationToText = (rotation: Action[]): string => {
    return rotation.reduce((text: string, action: Action) => {
        const textSoFar = `${text ? text + '\n' : ''}${action.prepull ? action.prepull + ' ' : ''}${action.id} ${action.type === 'gcd' ? 'GCD' : 'oGCD'} ${action.type === 'gcd' ? (action.recastTime ?? 0) + ' ' : ''}${action.type === 'gcd' ? (action.castTime ?? 0) : ''}${action.type === 'ogcd' ? (action.lateWeave ? 'lateWeave' : 'normal') : ''}`
        
        if (action.statusApplied) {
            return `${textSoFar} [${action.statusApplied.id} ${action.statusApplied.applicationDelay} ${action.statusApplied.duration} ${action.statusApplied.color}]`;
        }
        
        return textSoFar;
    }, '');
}

const parseActionLine = async (line: string): Promise<Action | null> => {
    try {
        const tokens = line.split(/[ ,]+/);

        if (tokens.length < 3) return null;

        const prepull = parseFloat(tokens[0]) < 0 ? tokens[0] : undefined;

        if (prepull) {
            tokens.shift();
        }

        const [id, type] = tokens;

        // Has errors if the action doesn't exist
        const action = await getActionByID(id);
        const actionIconSrc = action.icon ? action.icon.toString() : '';

        switch (type) {
            case 'GCD':
                const [recastTime, castTime] = tokens.slice(2);
                return {
                    type: 'gcd',
                    id: id,
                    name: action.name,
                    imageSrc: actionIconSrc,
                    prepull: prepull ? parseFloat(prepull) : undefined,
                    recastTime: recastTime ? parseFloat(recastTime) : undefined,
                    castTime: castTime ? parseFloat(castTime) : undefined,
                } as GCD;
            case 'oGCD':
                const [lateWeave] = tokens.slice(2);
                return {
                    type: 'ogcd',
                    id: id,
                    name: action.name,
                    imageSrc: actionIconSrc,
                    prepull: prepull ? parseFloat(prepull) : undefined,
                    lateWeave: lateWeave === 'lateWeave' ? true : false,
                } as oGCD;
            default:
                throw new Error("Invalid action type");
            }
    } catch (e) {
        return null;
    }
}

const parseStatusLine = async (line: string): Promise<Status | null> => {
    try {
        const tokens = line.split(/[ ,]+/);

        if (tokens.length < 4) return null;

        const [id, applicationDelay, duration, color] = tokens;

        // Has errors if the status doesn't exist
        const status = await getStatusByID(id);
        const statusIconSrc = status.icon ? status.icon.toString() : '';

        return {
            id: id,
            name: status.name,
            imageSrc: statusIconSrc,
            color: color,
            applicationDelay: parseFloat(applicationDelay),
            duration: parseFloat(duration),
        } as Status;
    } catch (e) {
        return null;
    }
}

const parseRotationLine = async (line: string): Promise<Action | null> => {
    try {
        const sections = line.split('[');
        let statusApplied: Status | null = null;

        if (sections.length > 1) {
            const statusSection = sections[1].split(']')[0];
            statusApplied = await parseStatusLine(statusSection);
        }

        const action = await parseActionLine(sections[0]);
        if (action === null) return null;

        if (statusApplied) {
            action.statusApplied = statusApplied;
        }

        return action;
    } catch (e) {
        return null;
    }
}

export const textToRotation = async (text: string): Promise<Action[] | false> => {
    return Promise.all(text.split('\n').map(parseRotationLine))
        .then(actions => {
            if (actions.includes(null)) {
                return false;
            }

            return actions as Action[];
        })
}
