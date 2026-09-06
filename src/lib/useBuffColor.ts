import { useEffect, useState } from 'react'
import { automaticBuffColor, FALLBACK_BUFF_COLOR } from './buffColors'

export const useBuffColor = (source: string, color: string): string => {
    const [resolved, setResolved] = useState({ source: '', color: FALLBACK_BUFF_COLOR })
    useEffect(() => {
        if (color !== 'auto') return
        let active = true
        automaticBuffColor(source).then(value => {
            if (active) setResolved({ source, color: value })
        })
        return () => { active = false }
    }, [source, color])
    return color === 'auto' ? (resolved.source === source ? resolved.color : FALLBACK_BUFF_COLOR) : color
}
