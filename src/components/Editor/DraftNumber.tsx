import { useState } from 'react'
import { Input } from 'antd'

interface DraftNumberProps {
    id?: string
    'aria-label'?: string
    value: number
    min: number
    max: number
    step?: number
    onChange: (value: number) => void
}

// Keep incomplete input local. Only blur/Enter can normalize or publish a value.
export const DraftNumber = ({ value, min, max, step = 1, onChange, ...props }: DraftNumberProps) => {
    const [draft, setDraft] = useState<string | null>(null)
    const precision = String(step).split('.')[1]?.length ?? 0
    const format = (number: number) => precision ? number.toFixed(precision) : String(number)
    const commit = () => {
        if (draft !== null && /^-?(?:\d+(?:\.\d*)?|\.\d+)$/.test(draft.trim())) {
            const parsed = Number(draft)
            if (Number.isFinite(parsed)) {
                const next = Math.max(min, Math.min(max, parsed))
                if (next !== value) onChange(next)
            }
        }
        setDraft(null)
    }
    return <Input
        {...props}
        role="spinbutton" inputMode="decimal"
        aria-valuemin={min} aria-valuemax={max} aria-valuenow={value}
        value={draft ?? format(value)}
        onChange={event => setDraft(event.target.value)}
        onBlur={commit}
        onKeyDown={event => {
            if (event.key === 'Enter') {
                event.preventDefault()
                event.currentTarget.blur()
            } else if (event.key === 'Escape') {
                event.preventDefault()
                setDraft(null)
            } else if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
                event.preventDefault()
                const parsed = draft?.trim() ? Number(draft) : value
                const current = Number.isFinite(parsed) ? parsed : value
                setDraft(format(Math.max(min, Math.min(max, current + (event.key === 'ArrowUp' ? step : -step)))))
            }
        }}
    />
}
