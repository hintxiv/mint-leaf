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

export interface Bounds {
    x: number;
    y: number;
    width: number;
    height: number;
}

export interface MeasuredTextLine {
    text: string;
    x: number;
    y: number;
    width: number;
    ascent: number;
    descent: number;
    bounds: Bounds;
}

export type TextRole = 'title' | 'subtitle' | 'metadata' | 'action' | 'count' | 'time' | 'pull' | 'buff' | 'branding'

export interface CollisionExemption {
    withId: string;
    reason: 'ownership' | 'leader-endpoint' | 'decorative-contact';
}

interface PrimitiveBase {
    id: string;
    ownerId?: string;
    bounds: Bounds;
    collisionExemptions?: CollisionExemption[];
}

export interface TextBlock extends PrimitiveBase {
    kind: 'text';
    role: TextRole;
    font: string;
    color: string;
    align: CanvasTextAlign;
    baseline: CanvasTextBaseline;
    lineHeight: number;
    lines: MeasuredTextLine[];
    clearance: number;
}

export interface ImagePrimitive extends PrimitiveBase {
    kind: 'image';
    role: 'action-icon' | 'timeline' | 'job-icon' | 'buff-icon' | 'branding';
    source: string;
}

export interface LinePrimitive extends PrimitiveBase {
    kind: 'line';
    role: 'leader' | 'pull' | 'separator' | 'buff';
    points: Array<{ x: number; y: number }>;
    color: string;
    width: number;
    leaderFor?: string;
    fadeStart?: boolean;
    fadeEnd?: boolean;
    fadeLength?: number;
}

export interface ShapePrimitive extends PrimitiveBase {
    kind: 'shape';
    role: 'background';
    color: string;
    radius?: number;
}

export type RenderPrimitive = TextBlock | ImagePrimitive | LinePrimitive | ShapePrimitive;

export interface RenderPlan {
    width: number;
    height: number;
    primitives: RenderPrimitive[];
    textBlocks: TextBlock[];
    requiredImages: string[];
}

export type LayoutViolationCode =
    | 'collision'
    | 'out-of-bounds'
    | 'leader-crossing'
    | 'invalid-measurement'

export interface LayoutViolation {
    code: LayoutViolationCode;
    primitiveId: string;
    otherPrimitiveId?: string;
    message: string;
}
