"use client";

import { Action, CanvasIcon, GCD, oGCD } from './types'

const SCALING_FACTOR = 4;
const GCD_WIDTH = 64 * SCALING_FACTOR;
const GCD_HEIGHT = 64 * SCALING_FACTOR;
const oGCD_WIDTH = 48 * SCALING_FACTOR;
const oGCD_HEIGHT = 48 * SCALING_FACTOR;
const oGCD_ADJUST_INWARD = 3 * SCALING_FACTOR;
const oGCD_CLIP_PADDING = 8 * SCALING_FACTOR;
const WEAVE_SLOT_WIDTH = 64 * SCALING_FACTOR;
const WEAVE_SLOT_HEIGHT = 24 * SCALING_FACTOR;
const WEAVE_SLOT_Y_OFFSET = 8 * SCALING_FACTOR;
const oGCD_BOTTOM_PADDING = 24 * SCALING_FACTOR;
const DEFAULT_CAST_WIDTH = 2 * WEAVE_SLOT_WIDTH;  // for a 2.5s cast
const FRAME_ADJUST_LEFT = 3 * SCALING_FACTOR;
const FRAME_ADJUST_TOP = 3 * SCALING_FACTOR;
const FRAME_EXTRA_WIDTH_GCD = 8 * SCALING_FACTOR;
const FRAME_EXTRA_WIDTH_OGCD = 6 * SCALING_FACTOR;
const FRAME_EXTRA_HEIGHT_GCD = 12 * SCALING_FACTOR;
const FRAME_EXTRA_HEIGHT_OGCD = 10 * SCALING_FACTOR;
const HARDCAST_END_WIDTH = 4 * SCALING_FACTOR;
const WEAVESLOT_END_ADJUST_LEFT = 4 * SCALING_FACTOR;
const PREPULL_GCD_PADDING = 16 * SCALING_FACTOR;
const PREPULL_OGCD_PADDING = 40 * SCALING_FACTOR;
const ANIMATION_LOCK = 0.65;
const CAST_ANIMATION_LOCK = 0.1;
const DEFAULT_RECAST = 2.5;

interface GCDResult {
    gcdIcons: CanvasIcon[];
    gcdWidth: number;
    weaveSlots: number;
    firstWeaveSlotX: number;
}

const calculateGCDIcons = (action: GCD, x: number): GCDResult => {
    const icons: CanvasIcon[] = [];
    let width = 0;
    let firstWeaveSlotX = null;

    const animationLock = Math.max(0, ANIMATION_LOCK - (action.castTime ?? 0));
    const weaveTime = Math.max(0, (action.recastTime ?? DEFAULT_RECAST) - (action.castTime ?? 0) - animationLock);
    const weaveSlots = Math.max(0, Math.floor(weaveTime / ANIMATION_LOCK));
    const excessGCDRollTime = (action.recastTime ?? DEFAULT_RECAST) - (action.castTime ?? 0) - (weaveSlots * DEFAULT_RECAST / 2);
    const excessGCDRollWidth = excessGCDRollTime / DEFAULT_RECAST * DEFAULT_CAST_WIDTH;

    // Add GCD icon
    const gcdIcon = {
        x: x,
        y: -(GCD_WIDTH) / 2,
        width: GCD_WIDTH,
        height: GCD_HEIGHT,
        ...action,
        weaveSlots: weaveSlots,
        timeElapsed: Math.max((action.castTime ?? 0) + CAST_ANIMATION_LOCK, action.recastTime ?? DEFAULT_RECAST)
    } as const;

    // Add icon frame
    const frameIcon = {
        type: 'other',
        x: x - FRAME_ADJUST_LEFT,
        y: -(GCD_WIDTH) / 2 - FRAME_ADJUST_TOP,
        width: GCD_WIDTH + FRAME_EXTRA_WIDTH_GCD,
        height: GCD_HEIGHT + FRAME_EXTRA_HEIGHT_GCD,
        imageSrc: '/icon_frame.png',
    } as const;

    width += GCD_WIDTH;

    // Add a cast bar icon as needed
    if (action.castTime && action.castTime > 0) {
        const castWidth = (action.castTime / DEFAULT_RECAST * DEFAULT_CAST_WIDTH) - HARDCAST_END_WIDTH;
        icons.push({
            type: 'other',
            x: x + width,
            y: -(WEAVE_SLOT_HEIGHT) / 2 + WEAVE_SLOT_Y_OFFSET,
            width: castWidth,
            height: WEAVE_SLOT_HEIGHT,
            imageSrc: '/hardcast.png',
        });
        icons.push({
            type: 'other',
            x: x + width + castWidth - 1,
            y: -(WEAVE_SLOT_HEIGHT) / 2 + WEAVE_SLOT_Y_OFFSET,
            width: HARDCAST_END_WIDTH,
            height: WEAVE_SLOT_HEIGHT,
            imageSrc: '/hardcast_end.png',
        });

        width += castWidth + HARDCAST_END_WIDTH;
    }

    const weaveSlotIcons: CanvasIcon[] = [];

    // Add weave slot icons as needed
    if (weaveSlots > 0 && !action.prepull) {
        for (let i = 0; i < weaveSlots; i++) {
            weaveSlotIcons.push({
                type: 'weave',
                x: x + width,
                y: -(WEAVE_SLOT_HEIGHT) / 2 + WEAVE_SLOT_Y_OFFSET,
                width: WEAVE_SLOT_WIDTH,
                height: WEAVE_SLOT_HEIGHT,
                imageSrc: (i === weaveSlots - 1) 
                    ? '/last_weaveslot.png' 
                    : '/weaveslot.png',
                timeElapsed: ANIMATION_LOCK + (i === 0 && action.castTime ? action.castTime : 0),
            });

            if (firstWeaveSlotX === null) {
                firstWeaveSlotX = x + width;
            }

            width += WEAVE_SLOT_WIDTH;
        }

        width -= WEAVESLOT_END_ADJUST_LEFT;
    }

    // Add an excess GCD roll icon as needed
    if (excessGCDRollWidth > 0 && !action.prepull) {
        icons.push({
            type: 'other',
            x: x + width,
            y: -(WEAVE_SLOT_HEIGHT) / 2 + WEAVE_SLOT_Y_OFFSET,
            width: excessGCDRollWidth,
            height: WEAVE_SLOT_HEIGHT,
            imageSrc: '/dead_space.png',
        });

        width += excessGCDRollWidth;
    }

    width += FRAME_EXTRA_WIDTH_GCD / 2;

    // Push these last so they're on top
    icons.push(...weaveSlotIcons);
    icons.push(gcdIcon, frameIcon);

    if (action.prepull) {
        width += PREPULL_GCD_PADDING;
    }

    return {
        gcdIcons: icons,
        gcdWidth: width,
        weaveSlots: action.prepull ? 0 : weaveSlots,
        firstWeaveSlotX: firstWeaveSlotX ?? x + GCD_WIDTH,
    }
}

interface OGCDResult {
    ogcdIcons: CanvasIcon[];
    addedRotationWidth: number;
    addedWeaveSlotWidth: number;
}

const calculateOGCDIcons = (
    action: oGCD,
    rotationEndX: number,
    weaveSlot: number,
    remainingWeaves: number,
    weaveSlotX: number,
    hardClip = false,
): OGCDResult => {
    const icons: CanvasIcon[] = [];
    const x = hardClip ? rotationEndX : weaveSlotX;
    const iconX = hardClip 
        ? x 
        : x + (WEAVE_SLOT_WIDTH - oGCD_WIDTH) / 2 + (
            weaveSlot === 1
                ? oGCD_ADJUST_INWARD 
                : (remainingWeaves === 1) ? -oGCD_ADJUST_INWARD : 0
        );

    // Add oGCD icon
    icons.push({
        x: iconX,
        y: -(oGCD_BOTTOM_PADDING + oGCD_HEIGHT),
        width: oGCD_WIDTH,
        height: oGCD_HEIGHT,
        weavePosition: hardClip ? undefined : weaveSlot,
        timeElapsed: hardClip ? ANIMATION_LOCK : 0,
        ...action,
    });

    // Add icon frame
    icons.push({
        type: 'other',
        x: iconX - FRAME_ADJUST_LEFT,
        y: -(oGCD_BOTTOM_PADDING + oGCD_HEIGHT) - FRAME_ADJUST_TOP,
        width: oGCD_WIDTH + FRAME_EXTRA_WIDTH_OGCD,
        height: oGCD_HEIGHT + FRAME_EXTRA_HEIGHT_OGCD,
        imageSrc: '/icon_frame.png',
    });

    return {
        ogcdIcons: icons,
        addedRotationWidth: action.prepull
                ? oGCD_WIDTH + (FRAME_EXTRA_WIDTH_OGCD / 2) + PREPULL_OGCD_PADDING
                : hardClip
                    ? oGCD_WIDTH + (FRAME_EXTRA_WIDTH_OGCD / 2) + oGCD_CLIP_PADDING
                    : 0,
        addedWeaveSlotWidth: hardClip ? 0 : WEAVE_SLOT_WIDTH,
    }
}

interface IconPositionResult {
    icons: CanvasIcon[];
    width: number;
}

// TODO separate into prepull and post-pull phases
export const calculateIconPositions = (rotation: Action[]): IconPositionResult => {
    const icons: CanvasIcon[] = [];
    let width = 0;
    let currentWeaveSlot = 0;
    let currentWeaveSlotX = 0;
    let availableWeaveSlots = 0;

    for (const action of rotation) {
        switch (action.type) {
            case 'gcd': {
                const { gcdIcons, gcdWidth, weaveSlots, firstWeaveSlotX } = calculateGCDIcons(action, width);
                icons.push(...gcdIcons);
                width += gcdWidth;
                currentWeaveSlot = 1;
                currentWeaveSlotX = firstWeaveSlotX;
                availableWeaveSlots = weaveSlots;
                break;
            }
            case 'ogcd': {
                if (action.lateWeave) {
                    currentWeaveSlotX += WEAVE_SLOT_WIDTH * (availableWeaveSlots - 1);
                    availableWeaveSlots = Math.min(availableWeaveSlots, 1);
                }

                const hardClip = availableWeaveSlots <= 0;
                const { ogcdIcons, addedRotationWidth, addedWeaveSlotWidth } = calculateOGCDIcons(
                    action,
                    width,
                    currentWeaveSlot,
                    availableWeaveSlots,
                    currentWeaveSlotX,
                    hardClip,
                );
                icons.push(...ogcdIcons);
                availableWeaveSlots -= 1;
                width += addedRotationWidth;
                currentWeaveSlot += 1;
                currentWeaveSlotX += addedWeaveSlotWidth;
                break;
            }
        }
    }

    return {
        icons,
        width,
    }
}
