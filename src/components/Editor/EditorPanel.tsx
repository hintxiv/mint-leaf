import { useCallback } from 'react'
import styled from 'styled-components'
import { Job } from '@/data/jobs'
import { Action } from '../Canvas/types'
import { DataAction, searchForAction } from '@/app/api'
import SearchInput from '../Abilities/SearchInput'
import { CustomActionInput } from '../Abilities/CustomActionInput'
import { JobActionList } from '../Abilities/JobActionList'
import { useLanguage, useTranslation } from '@/context/LanguageContext'
import { SequenceList, SequenceListKind, SequenceSelection } from './SequenceList'
import { SequenceDetail } from './SequenceDetail'
import { ImportExport } from './ImportExport'
import {
    buffDetailsToStatus,
    getStoredCustomAction,
    saveCustomAction,
    statusToBuffDetails,
    type StoredCustomAction,
} from '@/lib/customActionsStore'
import { LIBRARY_TAB_GUTTER_PX } from '@/components/Library/LibraryPanel'

const DEFAULT_RECAST_TIME = 2.5
const DEFAULT_CAST_TIME = 0

const Column = styled.div`
    display: flex;
    flex-direction: column;
    gap: 12px;
    min-height: 0;
    height: 100%;
    overflow-y: auto;
    padding: 12px;
    background-color: #262833;
    color: white;
    border-right: 1px solid white;
    flex-shrink: 0;
`

const PaletteColumn = styled(Column)`
    width: 280px;
`

const SequenceColumn = styled(Column)`
    width: 320px;

    /* Let SequenceList fill the column so empty-area clicks can clear selection. */
    > * {
        flex: 1;
    }
`

const DetailColumn = styled(Column)`
    width: 300px;
`

const SectionTitle = styled.h3`
    margin: 0 0 6px;
    font-size: 13px;
    font-weight: 600;
    color: #c8cbce;
    /* Shift the "Job skills" heading so the library tab does not cover it. */
    padding-left: ${LIBRARY_TAB_GUTTER_PX}px;
`

const PaletteExtras = styled.div`
    display: flex;
    flex-direction: column;
    align-items: stretch;
    gap: 8px;
`

const Divider = styled.div`
    text-align: center;
    color: #888;
    font-size: 12px;
`

const Block = styled.div`
    display: flex;
    flex-direction: column;
    gap: 8px;
`

interface EditorPanelProps {
    job: Job
    prepullRotation: Action[]
    rotation: Action[]
    selection: SequenceSelection | null
    importError: boolean
    onSelect: (selection: SequenceSelection | null) => void
    onUpdateAction: (list: SequenceListKind, index: number, next: Action) => void
    onRemoveAction: (list: SequenceListKind, index: number) => void
    onReorderAction: (list: SequenceListKind, fromIndex: number, toIndex: number) => void
    onImport: (text: string) => void
    onPaletteSelect: (dataAction: DataAction) => void
}

// Save cast/recast/buff defaults for this action id to localStorage.
export const persistActionSettings = (action: Action) => {
    const storedAction: StoredCustomAction = {
        id: action.id,
        name: action.name,
        iconUrl: action.imageSrc,
        isGCD: action.type === 'gcd',
        appliesBuff: !!action.statusApplied,
    }

    if (action.type === 'gcd') {
        storedAction.recastTime = action.recastTime
        storedAction.castTime = action.castTime
    } else {
        storedAction.lateWeave = action.lateWeave
    }

    if (action.statusApplied) {
        storedAction.buffDetails = statusToBuffDetails(action.statusApplied)
    }

    saveCustomAction(storedAction)
}

export const dataActionToDefaultAction = (dataAction: DataAction): Action => {
    const imageSrc = dataAction.icon ? dataAction.icon.toString() : ''
    const stored = getStoredCustomAction(dataAction.id)
    const instanceId = crypto.randomUUID()

    // No saved prefs: start as a plain GCD with default timings.
    if (!stored) {
        return {
            type: 'gcd',
            id: dataAction.id,
            name: dataAction.name ?? '',
            imageSrc,
            instanceId,
            recastTime: DEFAULT_RECAST_TIME,
            castTime: DEFAULT_CAST_TIME,
        }
    }

    const status = stored.appliesBuff
        ? buffDetailsToStatus(stored.buffDetails)
        : undefined

    if (stored.isGCD) {
        return {
            type: 'gcd',
            id: dataAction.id,
            name: dataAction.name ?? stored.name,
            imageSrc: imageSrc || stored.iconUrl,
            instanceId,
            recastTime: stored.recastTime ?? DEFAULT_RECAST_TIME,
            castTime: stored.castTime ?? DEFAULT_CAST_TIME,
            statusApplied: status,
        }
    }

    return {
        type: 'ogcd',
        id: dataAction.id,
        name: dataAction.name ?? stored.name,
        imageSrc: imageSrc || stored.iconUrl,
        instanceId,
        lateWeave: stored.lateWeave ?? false,
        statusApplied: status,
    }
}

// Left editor strip: palette, sequence list, and optional detail pane.
export const EditorPanel = ({
    job,
    prepullRotation,
    rotation,
    selection,
    importError,
    onSelect,
    onUpdateAction,
    onRemoveAction,
    onReorderAction,
    onImport,
    onPaletteSelect,
}: EditorPanelProps) => {
    const { t } = useTranslation()
    const { locale } = useLanguage()

    const searchActions = useCallback(
        (query: string, searchJob: Job, language: typeof locale) =>
            searchForAction(query, searchJob, language),
        [],
    )

    const selectedAction =
        selection === null
            ? null
            : selection.list === 'prepull'
                ? prepullRotation[selection.index] ?? null
                : rotation[selection.index] ?? null

    const onDetailChange = useCallback(
        (list: SequenceListKind, index: number, next: Action) => {
            persistActionSettings(next)
            onUpdateAction(list, index, next)
        },
        [onUpdateAction],
    )

    return (
        <>
            <PaletteColumn>
                <Block>
                    <SectionTitle>{t('editor.palette')}</SectionTitle>
                    <JobActionList job={job} locale={locale} onSelect={onPaletteSelect} />
                    <PaletteExtras>
                        <Divider>{t('abilities.orDivider')}</Divider>
                        <SearchInput
                            job={job}
                            onSelect={onPaletteSelect}
                            search={searchActions}
                            placeholder={t('abilities.searchAction')}
                            language={locale}
                        />
                        <Divider>{t('abilities.orDivider')}</Divider>
                        <CustomActionInput onCreate={onPaletteSelect} />
                    </PaletteExtras>
                </Block>
                <ImportExport
                    prepullRotation={prepullRotation}
                    rotation={rotation}
                    importError={importError}
                    onImport={onImport}
                />
            </PaletteColumn>
            <SequenceColumn>
                <SequenceList
                    prepullRotation={prepullRotation}
                    rotation={rotation}
                    selection={selection}
                    onSelect={onSelect}
                    onReorder={onReorderAction}
                    onRemove={onRemoveAction}
                />
            </SequenceColumn>
            {selectedAction && selection && (
                <DetailColumn>
                    {/* Change key with the selection so the detail pane remounts on each select. */}
                    <SequenceDetail
                        key={`${selection.list}:${selection.index}`}
                        job={job}
                        action={selectedAction}
                        list={selection.list}
                        index={selection.index}
                        onChange={onDetailChange}
                    />
                </DetailColumn>
            )}
        </>
    )
}
