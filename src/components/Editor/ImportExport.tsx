import { useEffect, useMemo, useState } from 'react'
import styled from 'styled-components'
import { Button } from 'antd'
import TextArea from 'antd/es/input/TextArea'
import { Action } from '../Canvas/types'
import { rotationToText } from '@/lib/parseRotation'
import { useTranslation } from '@/context/LanguageContext'

const Accordion = styled.details`
    min-width: 0;
    flex-shrink: 0;
    border: 1px solid #454957;
    border-radius: 8px;
    background: #232630;
    color: #e1e4e6;
    font-size: 13px;
    line-height: 1.5;

    summary {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 8px;
        padding: 8px 4px 8px 10px;
        list-style: none;
        cursor: pointer;
        border-radius: 8px;
    }
    summary::-webkit-details-marker { display: none; }
    summary > span:first-child { min-width: 0; overflow-wrap: anywhere; }
    summary:hover svg { color: #aaf0d1; }
    &[open] summary svg { transform: rotate(180deg); }
    :is(summary, button, textarea):focus-visible {
        outline: 2px solid #aaf0d1;
        outline-offset: 2px;
    }
    .ant-btn {
        height: auto;
        min-height: 32px;
        padding: 5px 10px;
        font-size: 13px;
        line-height: 20px;
        white-space: normal;
        border-radius: 6px;
        box-shadow: none;
        background: #2d303c !important;
        border: 1px solid #454957 !important;
        color: #e1e4e6 !important;
    }
    .ant-btn:hover {
        background: #363b47 !important;
        border-color: #74d6b4 !important;
        color: #aaf0d1 !important;
    }
`

const Chevron = styled.span`
    display: inline-flex;
    align-items: center;
    justify-content: center;
    flex: 0 0 32px;
    width: 32px;
    height: 32px;
    color: #adb2bf;
    svg { display: block; }
`

const PanelBody = styled.div`
    padding: 12px;
    border-top: 1px solid #454957;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 8px;
`

const Actions = styled.div`
    display: flex;
    flex-direction: row;
    flex-wrap: wrap;
    gap: 8px;
    > * { flex: 1 1 auto; }
`

interface ImportExportProps {
    prepullRotation: Action[]
    rotation: Action[]
    importError: boolean
    onImport: (text: string) => void
}

export const ImportExport = ({
    prepullRotation,
    rotation,
    importError,
    onImport,
}: ImportExportProps) => {
    const { t } = useTranslation()
    const exportText = useMemo(
        () => rotationToText([...prepullRotation, ...rotation]),
        [prepullRotation, rotation],
    )
    const [draftText, setDraftText] = useState(exportText)

    useEffect(() => {
        setDraftText(exportText)
    }, [exportText])

    const onCopy = async () => {
        try {
            await navigator.clipboard.writeText(exportText)
        } catch (error) {
            console.error('Failed to copy rotation text:', error)
        }
    }

    return (
        <Accordion>
            <summary>
                <span>{t('editor.importExport')}</span>
                <Chevron aria-hidden="true">
                    <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                        <path d="m4 6 4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                </Chevron>
            </summary>
            <PanelBody>
                <TextArea
                    value={draftText}
                    onChange={(e) => setDraftText(e.target.value)}
                    placeholder={t('abilities.rotationPlaceholder')}
                    aria-label={t('editor.importExport')}
                    autoSize={{ minRows: 4, maxRows: 8 }}
                    status={importError ? 'error' : undefined}
                    style={{ fontSize: 13 }}
                />
                <Actions>
                    <Button type="primary" onClick={() => onImport(draftText)}>
                        {t('editor.importApply')}
                    </Button>
                    <Button onClick={() => void onCopy()}>
                        {t('editor.exportCopy')}
                    </Button>
                </Actions>
            </PanelBody>
        </Accordion>
    )
}
