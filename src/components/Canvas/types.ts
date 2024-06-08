export interface Status {
    id: string;
    name: string;
    imageSrc: string;
    color: string;
    applicationDelay: number;
    duration: number;
}

interface BaseAction {
    id: string;
    name: string;
    imageSrc: string;
    /* The number of seconds before the pull to use this action */
    prepull?: number;
    statusApplied?: Status;
}

export interface GCD extends BaseAction {
    type: 'gcd';
    recastTime?: number;
    castTime?: number;
}

export interface oGCD extends BaseAction {
    type: 'ogcd';
    lateWeave?: boolean;
}

export type Action = GCD | oGCD;

interface BaseCanvasIcon {
    x: number;
    y: number;
    width: number;
    height: number;
}

export interface CanvasGCD extends GCD, BaseCanvasIcon {
    weaveSlots: number;
    /* How far the timeline advances after using this action */
    timeElapsed: number;
}

export interface CanvasoGCD extends oGCD, BaseCanvasIcon {
    weavePosition?: number;
    /* How far the timeline advances after using this action */
    timeElapsed: number;
}

export interface CanvasIconWeaveSlot extends BaseCanvasIcon {
    type: 'weave';
    imageSrc: string;
    /* How far the timeline advances after using this action */
    timeElapsed: number;
}

export interface CanvasIconOther extends BaseCanvasIcon {
    type: 'other';
    imageSrc: string;
}

export type CanvasIcon = CanvasGCD | CanvasoGCD | CanvasIconWeaveSlot | CanvasIconOther;

export interface CanvasBuffLine {
    status: Status;
    icon: HTMLImageElement | null;
    startX: number;
    endX: number;
}

export interface TimelinePoint {
    x: number;
    time: number;
    addedTime: number;
    addedWeaveTime?: number;
}
