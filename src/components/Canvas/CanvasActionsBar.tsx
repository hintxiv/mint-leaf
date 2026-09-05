import React, { useEffect, useMemo, useState } from 'react'
import { Button, Input as AntdInput } from 'antd'
import { debounce } from 'lodash'
import { useSession } from 'next-auth/react'
import styled from 'styled-components'
import { useTranslation } from '@/context/LanguageContext'
import { styles } from './styles'
import { normalizeRowCount } from './rotationRows'

const { positions } = styles

const ROW_COUNT_DEBOUNCE_MS = 300

const Bar = styled.div`
    display: flex;
    flex-direction: row;
    align-items: center;
    gap: 12px;
    width: 100%;
    padding: 8px 16px;
    background-color: #1a1c24;
    color: #e1e4e6;
    border-bottom: 1px solid white;
    flex-shrink: 0;
    font-size: 14px;
`

const Field = styled.label`
    display: flex;
    flex-direction: row;
    align-items: center;
    gap: 8px;
    white-space: nowrap;
`

const Input = styled(AntdInput)`
    width: 64px;
    font-size: 14px;

    /* Hide number spinners */
    -moz-appearance: textfield;
    appearance: textfield;

    &::-webkit-outer-spin-button,
    &::-webkit-inner-spin-button {
        -webkit-appearance: none;
        margin: 0;
    }
`

const Spacer = styled.div`
    flex: 1;
`

interface CanvasActionsBarProps {
    maxRows: number
    rowCount: number
    setRowCount: (count: number) => void
    rowSpacing: number | null
    setRowSpacing: (spacing: number | null) => void
    onPreview: () => void
    onExport: () => void
    exportReady: boolean
    useBalanceLogo: boolean
    setUseBalanceLogo: (useBalanceLogo: boolean) => void
}

// Canvas toolbar: row controls on the left, Preview / Export / Balance on the right.
export const CanvasActionsBar = ({
    maxRows,
    rowCount,
    setRowCount,
    rowSpacing,
    setRowSpacing,
    onPreview,
    onExport,
    exportReady,
    useBalanceLogo,
    setUseBalanceLogo,
}: CanvasActionsBarProps) => {
    const { data: session } = useSession()
    const { t } = useTranslation()
    const [rowDraft, setRowDraft] = useState(String(rowCount))
    const [rowFocused, setRowFocused] = useState(false)

    // Keep the draft in sync with the committed value while the field is idle.
    useEffect(() => {
        if (rowFocused) return
        setRowDraft(String(rowCount))
    }, [rowCount, rowFocused])

    const commitRowCount = useMemo(
        () => debounce((raw: string) => {
            const parsed = Number(raw)
            if (raw.trim() === '' || !Number.isInteger(parsed) || parsed < 1 || parsed > maxRows) return
            setRowCount(parsed)
        }, ROW_COUNT_DEBOUNCE_MS),
        [setRowCount, maxRows],
    )

    useEffect(() => () => commitRowCount.cancel(), [commitRowCount])

    const onRowBlur = () => {
        setRowFocused(false)
        commitRowCount.cancel()
        const parsed = Number(rowDraft)
        const count = normalizeRowCount(Number.isInteger(parsed) ? parsed : 1, maxRows)
        setRowDraft(String(count))
        setRowCount(count)
    }

    return (
        <Bar>
            <Field>
                <span>{t('canvas.rows')}</span>
                <Input
                    type="number"
                    min={1}
                    max={maxRows}
                    step={1}
                    value={rowDraft}
                    onFocus={() => setRowFocused(true)}
                    onBlur={onRowBlur}
                    onChange={(e) => {
                        const raw = e.target.value
                        setRowDraft(raw)
                        commitRowCount(raw)
                    }}
                />
            </Field>
            <Field title={t('canvas.rowSpacingHelp')}>
                <span>{t('canvas.rowSpacing')}</span>
                <Input
                    type="number"
                    min={0}
                    step={1}
                    disabled={rowCount <= 1}
                    value={rowSpacing ?? ''}
                    placeholder={String(positions.rotationRowSpacing)}
                    onChange={(e) => {
                        const raw = e.target.value.trim()
                        if (raw === '') {
                            setRowSpacing(null)
                            return
                        }
                        const parsed = Number(raw)
                        setRowSpacing(Number.isFinite(parsed) && parsed >= 0 ? parsed : null)
                    }}
                />
            </Field>
            <Spacer />
            <Button type="primary" onClick={onPreview} disabled={!exportReady}>
                {t('canvas.preview')}
            </Button>
            <Button type="primary" onClick={onExport} disabled={!exportReady}>
                {t('footer.export')}
            </Button>
            {session && (
                <Button type="primary" onClick={() => setUseBalanceLogo(!useBalanceLogo)}>
                    {useBalanceLogo ? t('footer.removeBalanceStamp') : t('footer.addBalanceStamp')}
                </Button>
            )}
        </Bar>
    )
}
