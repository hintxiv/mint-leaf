"use client";

import { Action, CanvasIcon, GCD, oGCD } from './types'
import { styles } from './styles'

const { positions } = styles

const ANIMATION_LOCK = 0.63;
const CAST_ANIMATION_LOCK = 0.1;
const DEFAULT_RECAST = 2.5;
const DEFAULT_CAST_WIDTH = 2 * positions.weaveSlotWidth;  // for a 2.5s cast

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
        y: -positions.gcdWidth / 2,
        width: positions.gcdWidth,
        height: positions.gcdHeight,
        ...action,
        weaveSlots: weaveSlots,
        timeElapsed: Math.max((action.castTime ?? 0) + CAST_ANIMATION_LOCK, action.recastTime ?? DEFAULT_RECAST)
    } as const;

    // Add icon frame
    const frameIcon = {
        type: 'other',
        x: x - positions.frameAdjustLeft,
        y: -positions.gcdHeight / 2 - positions.frameAdjustTop,
        width: positions.gcdWidth + positions.frameExtraWidthGcd,
        height: positions.gcdHeight + positions.frameExtraHeightOgcd,
        imageSrc: '/icon_frame.png',
    } as const;

    width += positions.gcdWidth;

    // Add a cast bar icon as needed
    if (action.castTime && action.castTime > 0) {
        const castWidth = (action.castTime / DEFAULT_RECAST * DEFAULT_CAST_WIDTH) - positions.hardcastEndWidth;
        icons.push({
            type: 'other',
            x: x + width,
            y: -positions.weaveSlotHeight / 2 + positions.weaveSlotYOffset,
            width: castWidth,
            height: positions.weaveSlotHeight,
            imageSrc: '/hardcast.png',
        });
        icons.push({
            type: 'other',
            x: x + width + castWidth - 1,
            y: -positions.weaveSlotHeight / 2 + positions.weaveSlotYOffset,
            width: positions.hardcastEndWidth,
            height: positions.weaveSlotHeight,
            imageSrc: '/hardcast_end.png',
        });

        width += castWidth + positions.hardcastEndWidth;
    }

    const weaveSlotIcons: CanvasIcon[] = [];

    // Add weave slot icons as needed
    if (weaveSlots > 0 && !action.prepull) {
        for (let i = 0; i < weaveSlots; i++) {
            const weaveSlotWidth = excessGCDRollWidth > 0
                ? positions.weaveSlotWidth + (i === weaveSlots - 1 ? excessGCDRollWidth : 0)
                : positions.weaveSlotWidth;

            weaveSlotIcons.push({
                type: 'weave',
                x: x + width,
                y: -positions.weaveSlotHeight / 2 + positions.weaveSlotYOffset,
                width: weaveSlotWidth,
                height: positions.weaveSlotHeight,
                imageSrc: (i === weaveSlots - 1) 
                    ? '/last_weaveslot.png' 
                    : '/weaveslot.png',
                timeElapsed: ANIMATION_LOCK + (i === 0 && action.castTime ? action.castTime : 0),
            });

            if (firstWeaveSlotX === null) {
                firstWeaveSlotX = x + width;
            }

            width += weaveSlotWidth;
        }

        width -= positions.weaveslotEndAdjustLeft;
    }

    width += positions.frameExtraWidthGcd / 2;

    // Push these last so they're on top
    icons.push(...weaveSlotIcons);
    icons.push(gcdIcon, frameIcon);

    if (action.prepull) {
        width += positions.prepullGcdPadding;
    }

    return {
        gcdIcons: icons,
        gcdWidth: width,
        weaveSlots: action.prepull ? 0 : weaveSlots,
        firstWeaveSlotX: firstWeaveSlotX ?? x + positions.gcdWidth,
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
        : x + (positions.weaveSlotWidth - positions.ogcdWidth) / 2 + (
            weaveSlot === 1
                ? positions.ogcdAdjustInward 
                : (remainingWeaves === 1) ? -positions.ogcdAdjustInward  : 0
        );

    // Add oGCD icon
    icons.push({
        x: iconX,
        y: -(positions.ogcdBottomPadding + positions.ogcdHeight),
        width: positions.ogcdWidth,
        height: positions.ogcdHeight,
        weavePosition: hardClip ? undefined : weaveSlot,
        timeElapsed: hardClip ? ANIMATION_LOCK : 0,
        ...action,
    });

    // Add icon frame
    icons.push({
        type: 'other',
        x: iconX - positions.frameAdjustLeft,
        y: -(positions.ogcdBottomPadding + positions.ogcdHeight) - positions.frameAdjustTop,
        width: positions.ogcdWidth + positions.frameExtraWidthOgcd,
        height: positions.ogcdHeight + positions.frameExtraHeightOgcd,
        imageSrc: '/icon_frame.png',
    });

    return {
        ogcdIcons: icons,
        addedRotationWidth: action.prepull
                ? positions.ogcdWidth + (positions.frameExtraWidthOgcd / 2) + positions.prepullOgcdPadding
                : hardClip
                    ? positions.ogcdWidth + (positions.frameExtraWidthOgcd / 2) + positions.ogcdClipPadding
                    : 0,
        addedWeaveSlotWidth: hardClip ? 0 : positions.weaveSlotWidth,
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
                    currentWeaveSlotX += positions.weaveSlotWidth * (availableWeaveSlots - 1);
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
