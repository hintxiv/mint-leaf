import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import Image from 'next/image'
import styled from 'styled-components'
import { DataAction, JobListAction, fetchJobActions } from '@/app/api'
import { Job } from '@/data/jobs'
import { Locale, useTranslation } from '@/context/LanguageContext'
import { sortJobActions } from '@/app/api/xivapi/jobActionList'
import { getJobAbbreviation } from '@/lib/jobs'
import { getCachedJobActions, setCachedJobActions } from '@/lib/jobActionsStore'

// Approximate in-game ability tooltip chrome (opaque, no fade)
const SKILL_TOOLTIP_BG = '#1a1a1a'
const SKILL_TOOLTIP_BORDER = '#5a5a5a'

const ListContainer = styled.div`
    display: flex;
    flex-direction: column;
    gap: 8px;
    width: 100%;
    font-size: 14px;
`

const Toolbar = styled.div`
    display: flex;
    flex-direction: row;
    gap: 8px;
    align-items: center;
`

const FilterInput = styled.input`
    flex: 1;
    min-width: 0;
    padding: 6px 10px;
    border: 1px solid #555;
    border-radius: 4px;
    background: #1a1c24;
    color: white;
    font-size: 14px;

    &::placeholder {
        color: #888;
    }
`

const ReloadButton = styled.button`
    flex-shrink: 0;
    padding: 6px 12px;
    border: 1px solid #555;
    border-radius: 4px;
    background: #2a2d3a;
    color: white;
    cursor: pointer;
    font-size: 13px;
    white-space: nowrap;

    &:hover:not(:disabled) {
        background: #3a3d4a;
    }

    &:disabled {
        opacity: 0.5;
        cursor: not-allowed;
    }
`

const StatusText = styled.div`
    color: #aaa;
    font-size: 13px;
`

const ErrorText = styled.div`
    color: #f66;
    font-size: 13px;
`

const ActionScroll = styled.div`
    max-height: min(480px, 50vh);
    overflow-y: auto;
    border: 1px solid #444;
    border-radius: 4px;
    background: #1a1c24;
`

const ActionRow = styled.button`
    display: flex;
    flex-direction: row;
    align-items: center;
    gap: 8px;
    width: 100%;
    padding: 6px 10px;
    border: none;
    border-bottom: 1px solid #333;
    background: transparent;
    color: white;
    cursor: pointer;
    text-align: left;
    font-size: 14px;

    &:last-child {
        border-bottom: none;
    }

    &:hover {
        background: #2a2d3a;
    }
`

const ActionName = styled.span`
    flex: 1;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
`

const IconHitArea = styled.span`
    position: relative;
    flex-shrink: 0;
    display: inline-flex;
    line-height: 0;
`

const TooltipBubble = styled.div`
    position: fixed;
    z-index: 2000;
    max-width: 380px;
    padding: 8px 10px;
    box-sizing: border-box;
    overflow: hidden;
    background: ${SKILL_TOOLTIP_BG};
    border: 1px solid ${SKILL_TOOLTIP_BORDER};
    border-radius: 4px;
    color: #fff;
    pointer-events: none;
`

const DescriptionBody = styled.div`
    word-break: break-word;
    max-width: 100%;
    font-size: 12px;
    line-height: 1.45;
`

interface ActionIconProps {
    action: JobListAction
}

// Instant description popup.
const ActionIconWithDescription: React.FC<ActionIconProps> = ({ action }) => {
    const iconRef = useRef<HTMLSpanElement>(null)
    const [position, setPosition] = useState<{ top: number; left: number } | null>(null)

    const hide = useCallback(() => {
        setPosition(null)
    }, [])

    const show = useCallback(() => {
        if (!action.description || !iconRef.current) {
            return
        }
        const rect = iconRef.current.getBoundingClientRect()
        // bottomLeft under the icon (vertical gap matches previous offset y=6)
        setPosition({ top: rect.bottom + 6, left: rect.left })
    }, [action.description])

    useEffect(() => {
        if (!position) {
            return
        }
        // Hide when the list scrolls or the window moves under the cursor
        window.addEventListener('scroll', hide, true)
        window.addEventListener('resize', hide)
        return () => {
            window.removeEventListener('scroll', hide, true)
            window.removeEventListener('resize', hide)
        }
    }, [position, hide])

    return (
        <>
            <IconHitArea
                ref={iconRef}
                onMouseEnter={show}
                onMouseLeave={hide}
            >
                {action.icon && (
                    <Image
                        width={28}
                        height={28}
                        src={action.icon.toString()}
                        alt={action.name ?? ''}
                    />
                )}
            </IconHitArea>
            {position && action.description && createPortal(
                <TooltipBubble style={{ top: position.top, left: position.left }}>
                    <DescriptionBody
                        // HTML comes from XIVAPI Description@as(html)
                        dangerouslySetInnerHTML={{ __html: action.description }}
                    />
                </TooltipBubble>,
                document.body,
            )}
        </>
    )
}

interface JobActionListProps {
    job: Job
    locale: Locale
    onSelect: (action: DataAction) => void
}

export const JobActionList: React.FC<JobActionListProps> = ({
    job,
    locale,
    onSelect,
}) => {
    const { t, localeReady } = useTranslation()
    const [actions, setActions] = useState<JobListAction[]>([])
    const [filterText, setFilterText] = useState('')
    const [loading, setLoading] = useState(false)
    const [errorMessage, setErrorMessage] = useState<string | null>(null)

    const jobAbbreviation = useMemo(() => getJobAbbreviation(job), [job])

    const loadActions = useCallback(
        async (forceRefresh: boolean, isCancelled?: () => boolean) => {
            const cached = getCachedJobActions(jobAbbreviation, locale)

            // Show cache immediately (including stale). Refresh only via the reload button.
            if (cached && !forceRefresh) {
                setActions(cached.actions)
                setErrorMessage(null)
                return
            }

            if (cached) {
                // Keep the previous list visible while forcing a refresh
                setActions(cached.actions)
            } else {
                // Clear so a job switch does not briefly show the previous job
                setActions([])
            }
            setLoading(true)
            setErrorMessage(null)

            try {
                const { actions: fetched, version, schema } = await fetchJobActions(
                    jobAbbreviation,
                    locale,
                )
                if (isCancelled?.()) {
                    return
                }
                setCachedJobActions(jobAbbreviation, locale, fetched, { version, schema })
                setActions(fetched)
            } catch (error) {
                if (isCancelled?.()) {
                    return
                }
                console.error('Failed to fetch job actions:', error)
                setErrorMessage(t('abilities.jobActionListError'))
                if (!cached) {
                    setActions([])
                }
            }
            setLoading(false)
        },
        [jobAbbreviation, locale, t],
    )

    useEffect(() => {
        // Wait until client locale hydration finishes.
        if (!localeReady) {
            return
        }

        let cancelled = false
        setFilterText('')
        void loadActions(false, () => cancelled)
        return () => {
            cancelled = true
        }
    }, [loadActions, localeReady])

    const filteredActions = useMemo(() => {
        const trimmed = filterText.trim().toLowerCase()
        if (!trimmed) {
            return sortJobActions(actions, locale)
        }
        return sortJobActions(actions, locale).filter((action) =>
            (action.name ?? '').toLowerCase().includes(trimmed),
        )
    }, [actions, filterText, locale])

    return (
        <ListContainer>
            <Toolbar>
                <FilterInput
                    type="text"
                    value={filterText}
                    onChange={(event) => setFilterText(event.target.value)}
                    placeholder={t('abilities.jobActionListFilter')}
                    aria-label={t('abilities.jobActionListFilter')}
                />
                <ReloadButton
                    type="button"
                    onClick={() => void loadActions(true)}
                    disabled={loading || !localeReady}
                >
                    {t('abilities.jobActionListReload')}
                </ReloadButton>
            </Toolbar>

            {(!localeReady || loading) && (
                <StatusText>{t('abilities.jobActionListLoading')}</StatusText>
            )}
            {errorMessage && <ErrorText>{errorMessage}</ErrorText>}

            {localeReady && !loading && !errorMessage && actions.length === 0 && (
                <StatusText>{t('abilities.jobActionListEmpty')}</StatusText>
            )}

            {filteredActions.length > 0 && (
                <ActionScroll data-testid="job-action-library">
                    {filteredActions.map((action) => (
                        <ActionRow
                            key={action.id}
                            type="button"
                            onClick={() => onSelect(action)}
                        >
                            {action.icon && <ActionIconWithDescription action={action} />}
                            <ActionName title={action.name ?? undefined}>
                                {action.name}
                            </ActionName>
                        </ActionRow>
                    ))}
                </ActionScroll>
            )}
        </ListContainer>
    )
}
