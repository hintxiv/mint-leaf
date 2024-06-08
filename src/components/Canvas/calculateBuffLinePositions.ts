import { MutableRefObject } from 'react'
import { CanvasBuffLine, CanvasIcon, TimelinePoint } from './types'

export const calculateTimeline = (
    prepullRotation: CanvasIcon[],
    rotation: CanvasIcon[],
    finalX: number,
    pullX?: number,
): TimelinePoint[] => {
    const timeline: TimelinePoint[] = []
    const sortedPrepull = prepullRotation.slice().sort((a, b) => a.x - b.x)
    const sortedRotation = rotation.slice().sort((a, b) => a.x - b.x)

    sortedPrepull.forEach(icon => {
        if (icon.type !== 'gcd' && icon.type !== 'ogcd') return

        timeline.push({
            x: icon.x,
            time: icon.prepull ?? 0,
            addedTime: 0,
        })
    })

    if (pullX) {
        timeline.push({
            x: pullX,
            time: 0,
            addedTime: 0,
        })
    }

    sortedRotation.forEach(icon => {
        const lastTimelinePoint = timeline.at(-1) ?? { time: 0, x: 0, addedTime: 0 }

        switch (icon.type) {
            case 'gcd':
                timeline.push({
                    time: lastTimelinePoint.time + lastTimelinePoint.addedTime,
                    addedTime: icon.timeElapsed,
                    x: icon.x + icon.width,
                })
                break
            case 'ogcd':
                timeline.push({
                    time: lastTimelinePoint.time,
                    addedTime: lastTimelinePoint.addedTime,
                    addedWeaveTime: lastTimelinePoint.addedWeaveTime ?? 0,
                    x: icon.x + icon.width,
                })
                break
            case 'weave':
                timeline.push({
                    time: lastTimelinePoint.time,
                    addedTime: lastTimelinePoint.addedTime,
                    addedWeaveTime: icon.timeElapsed + (lastTimelinePoint.addedWeaveTime ?? 0),
                    x: icon.x + icon.width,
                })
                break
        }
    })

    // Add a final point to the timeline to finish addedTime
    if (timeline.length > 0) {
        const lastTimelinePoint = timeline[timeline.length - 1]

        timeline.push({
            time: lastTimelinePoint.time + lastTimelinePoint.addedTime,
            addedTime: 0,
            x: finalX,
        })
    }

    return timeline
}

// Interpolate the x position of a given time in the timeline
const interpolateX = (timeline: TimelinePoint[], time: number, finalX: number) => {
    if (timeline.length === 0) return 0
    if (timeline.length === 1) return timeline[0].x

    const sortedPoints = timeline.slice().sort((a, b) => a.x - b.x)
    const reverseSortedPoints = sortedPoints.slice().reverse()

    const before = reverseSortedPoints.find(point => point.time + (point.addedWeaveTime ?? 0) <= time)
    const after = sortedPoints.find(point => point.time + (point.addedWeaveTime ?? 0) > time)

    if (!before) return timeline[0].x
    if (!after) return finalX

    const beforeTime = before.time + (before.addedWeaveTime ?? 0)
    const afterTime = after.time + (after.addedWeaveTime ?? 0)

    return before.x + (after.x - before.x) * (time - beforeTime) / (afterTime - beforeTime)
}

// Interpolate the time of a given x position in the timeline
const interpolateTime = (timeline: TimelinePoint[], x: number) => {
    if (timeline.length === 0) return 0
    if (timeline.length === 1) return timeline[0].time

    const sortedPoints = timeline.slice().sort((a, b) => a.x - b.x)
    const reverseSortedPoints = sortedPoints.slice().reverse()

    const before = reverseSortedPoints.find(point => point.x <= x)
    const after = sortedPoints.find(point => point.x > x)

    if (!before || !after) return sortedPoints[0].time

    const beforeTime = before.time + (before.addedWeaveTime ?? 0)
    const afterTime = after.time + (after.addedWeaveTime ?? 0)

    return beforeTime + (afterTime - beforeTime) * (x - before.x) / (after.x - before.x)
}

// Calculate the positions of buff lines on the canvas
export const calculateBuffLinePositions = (
    rotation: CanvasIcon[],
    timeline: TimelinePoint[],
    iconRefs: MutableRefObject<(HTMLImageElement | null)[]>,
    finalX: number,
): CanvasBuffLine[] => {
    const buffLines: CanvasBuffLine[] = []

    // TODO prepull buff lines?

    rotation.forEach((icon, index) => {
        if (icon.type !== 'gcd' && icon.type !== 'ogcd') return
        if (!icon.statusApplied) return

        const status = icon.statusApplied
        const initialX = icon.x + icon.width
        const startTime = interpolateTime(timeline, initialX) + (status.applicationDelay ?? 0)
        const startX = interpolateX(timeline, startTime, finalX)

        buffLines.push({
            status: status,
            icon: iconRefs.current[index],
            startX: startX,
            endX: interpolateX(timeline, startTime + status.duration, finalX),
        })
    })

    return buffLines
}
