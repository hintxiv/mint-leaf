import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Image from 'next/image'
import styled from 'styled-components'
import { Button, Popconfirm } from 'antd'
import TextArea from 'antd/es/input/TextArea'
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    type DragEndEvent,
} from '@dnd-kit/core'
import {
    SortableContext,
    sortableKeyboardCoordinates,
    useSortable,
    verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { restrictToVerticalAxis } from '@dnd-kit/modifiers'
import { useLanguage, useTranslation } from '@/context/LanguageContext'
import { getJobAbbreviation, getJobName } from '@/lib/jobs'
import { jobs, type Job } from '@/data/jobs'
import type { Action, Status } from '@/components/Canvas/types'
import {
    createEmptyRecord,
    deleteRecord,
    getActiveRecord,
    loadRotationLibrary,
    prependRecord,
    reorderRecords,
    saveRotationLibrary,
    upsertRecord,
    type RotationLibraryStore,
    type RotationRecord,
} from '@/lib/rotationLibraryStore'
import { rotationRecordToText, textToRotationRecord } from '@/lib/rotationRecordText'

const PANEL_WIDTH_PX = 280
// Extra left gutter so the collapsed tab does not cover MetaBar / palette labels
export const LIBRARY_TAB_GUTTER_PX = 28

const Root = styled.div`
    position: absolute;
    top: 0;
    bottom: 0;
    left: 0;
    z-index: 20;
    pointer-events: none;
`

const Tab = styled.button<{ $open: boolean }>`
    pointer-events: auto;
    position: absolute;
    top: 12px;
    left: ${({ $open }) => ($open ? `${PANEL_WIDTH_PX}px` : '0')};
    z-index: 21;
    writing-mode: vertical-rl;
    text-orientation: mixed;
    padding: 10px 6px;
    border: 1px solid #444;
    border-left: none;
    border-radius: 0 6px 6px 0;
    background: #1a1c24;
    color: #c8cbce;
    font-size: 12px;
    letter-spacing: 0.04em;
    cursor: pointer;
    transition: left 0.18s ease;

    &:hover {
        color: #aaf0d1;
        border-color: #666;
    }
`

const Panel = styled.aside<{ $open: boolean }>`
    pointer-events: ${({ $open }) => ($open ? 'auto' : 'none')};
    position: absolute;
    top: 0;
    bottom: 0;
    left: 0;
    width: ${PANEL_WIDTH_PX}px;
    display: flex;
    flex-direction: column;
    gap: 10px;
    padding: 12px;
    box-sizing: border-box;
    background: #14161d;
    border-right: 1px solid #333;
    box-shadow: 4px 0 16px rgba(0, 0, 0, 0.35);
    transform: translateX(${({ $open }) => ($open ? '0' : '-100%')});
    transition: transform 0.18s ease;
    overflow: hidden;
`

const PanelHeader = styled.div`
    display: flex;
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
`

const PanelTitle = styled.h2`
    margin: 0;
    font-size: 14px;
    font-weight: 600;
    color: #c8cbce;
`

const ListScroll = styled.div`
    flex: 1;
    min-height: 0;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: 4px;
`

const Row = styled.div<{ $active: boolean; $dragging: boolean }>`
    display: flex;
    flex-direction: row;
    align-items: center;
    gap: 6px;
    width: 100%;
    padding: 6px 6px 6px 2px;
    border: 1px solid ${({ $active }) => ($active ? '#aaf0d1' : '#444')};
    border-radius: 4px;
    background: ${({ $active }) => ($active ? '#2a3a34' : '#1a1c24')};
    color: white;
    font-size: 12px;
    opacity: ${({ $dragging }) => ($dragging ? 0.7 : 1)};
    box-shadow: ${({ $dragging }) => ($dragging ? '0 4px 12px rgba(0,0,0,0.35)' : 'none')};
    touch-action: none;
    cursor: pointer;

    &:hover {
        border-color: #888;
    }
`

const DragHandle = styled.button`
    flex-shrink: 0;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 18px;
    height: 28px;
    padding: 0;
    border: none;
    border-radius: 3px;
    background: transparent;
    color: #9a9da3;
    cursor: grab;
    font-size: 14px;
    line-height: 1;

    &:active {
        cursor: grabbing;
    }

    &:hover {
        color: #aaf0d1;
        background: #2a2d3a;
    }
`

const JobIcon = styled(Image)`
    flex-shrink: 0;
    border-radius: 2px;
`

const Labels = styled.div`
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 1px;
`

const JobLabel = styled.span`
    font-size: 10px;
    color: #8b8e96;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
`

const TitleLabel = styled.span`
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
`

const RowActions = styled.div`
    flex-shrink: 0;
    display: flex;
    flex-direction: column;
    gap: 2px;
`

const IconButton = styled.button`
    padding: 1px 5px;
    border: 1px solid #555;
    border-radius: 3px;
    background: #2a2d3a;
    color: white;
    cursor: pointer;
    font-size: 11px;
    line-height: 1.2;

    &:hover {
        background: #3a3d4a;
    }
`

const ImportBlock = styled.div`
    display: flex;
    flex-direction: column;
    gap: 6px;
    flex-shrink: 0;
`

const ErrorText = styled.div`
    color: #ff8a8a;
    font-size: 12px;
`

export interface EditorSnapshot {
    job: Job
    rotationTitle: string
    expansion: string
    patch: string
    level: number
    rowCount: number
    rowSpacing: number | null
    prepullRotation: Action[]
    rotation: Action[]
}

interface LibraryPanelProps {
    editorSnapshot: EditorSnapshot
    onActiveRecord: (record: RotationRecord) => void
}

const buildRecordFromEditor = (id: string, fields: EditorSnapshot): RotationRecord => ({
    id,
    title: fields.rotationTitle,
    job: getJobAbbreviation(fields.job),
    expansion: fields.expansion,
    patch: fields.patch,
    level: fields.level,
    rowCount: fields.rowCount,
    rowSpacing: fields.rowSpacing,
    prepullRotation: fields.prepullRotation,
    rotation: fields.rotation,
})

const statusesEqual = (left: Status | undefined, right: Status | undefined): boolean => {
    if (left === right) {
        return true
    }
    if (!left || !right) {
        return false
    }
    return (
        left.id === right.id
        && left.name === right.name
        && left.imageSrc === right.imageSrc
        && left.color === right.color
        && left.applicationDelay === right.applicationDelay
        && left.duration === right.duration
    )
}

const actionsEqual = (left: Action, right: Action): boolean => {
    if (left.type !== right.type) {
        return false
    }
    if (
        left.id !== right.id
        || left.name !== right.name
        || left.imageSrc !== right.imageSrc
        || left.instanceId !== right.instanceId
        || left.prepull !== right.prepull
        || !statusesEqual(left.statusApplied, right.statusApplied)
    ) {
        return false
    }
    if (left.type === 'gcd' && right.type === 'gcd') {
        return left.recastTime === right.recastTime && left.castTime === right.castTime
    }
    if (left.type === 'ogcd' && right.type === 'ogcd') {
        return left.lateWeave === right.lateWeave
    }
    return false
}

const actionArraysEqual = (left: Action[], right: Action[]): boolean => {
    if (left.length !== right.length) {
        return false
    }
    return left.every((action, index) => {
        const other = right[index]
        return other !== undefined && actionsEqual(action, other)
    })
}

const recordsEqual = (left: RotationRecord, right: RotationRecord): boolean => (
    left.id === right.id
    && left.title === right.title
    && left.job === right.job
    && left.expansion === right.expansion
    && left.patch === right.patch
    && left.level === right.level
    && left.rowCount === right.rowCount
    && left.rowSpacing === right.rowSpacing
    && actionArraysEqual(left.prepullRotation, right.prepullRotation)
    && actionArraysEqual(left.rotation, right.rotation)
)

const SortableLibraryRow = ({
    record,
    active,
    onSelect,
    onDelete,
    onCopy,
}: {
    record: RotationRecord
    active: boolean
    onSelect: (recordId: string) => void
    onDelete: (recordId: string) => void
    onCopy: (recordId: string) => Promise<void>
}) => {
    const { t } = useTranslation()
    const { locale } = useLanguage()
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: record.id })

    const job = jobs[record.job] ?? jobs['DRK']
    const title = record.title.trim() === '' ? t('library.emptyTitle') : record.title

    return (
        <Row
            ref={setNodeRef}
            style={{
                transform: CSS.Transform.toString(transform),
                transition,
            }}
            $active={active}
            $dragging={isDragging}
            onClick={() => onSelect(record.id)}
        >
            <DragHandle
                type="button"
                aria-label={t('library.dragHandle')}
                onClick={(event) => event.stopPropagation()}
                {...attributes}
                {...listeners}
            >
                ⠿
            </DragHandle>
            <JobIcon
                width={24}
                height={24}
                src={job.icon}
                alt={getJobName(job, locale)}
            />
            <Labels>
                <JobLabel>{getJobName(job, locale)}</JobLabel>
                <TitleLabel>{title}</TitleLabel>
            </Labels>
            <RowActions>
                <IconButton
                    type="button"
                    aria-label={t('library.copy')}
                    onClick={(event) => {
                        event.stopPropagation()
                        void onCopy(record.id)
                    }}
                >
                    {t('library.copy')}
                </IconButton>
                <Popconfirm
                    title={t('library.deleteConfirm')}
                    okText={t('library.delete')}
                    cancelText={t('customAction.cancel')}
                    onConfirm={(event) => {
                        event?.stopPropagation()
                        onDelete(record.id)
                    }}
                    onPopupClick={(event) => event.stopPropagation()}
                >
                    <IconButton
                        type="button"
                        aria-label={t('library.delete')}
                        onClick={(event) => event.stopPropagation()}
                    >
                        {t('library.delete')}
                    </IconButton>
                </Popconfirm>
            </RowActions>
        </Row>
    )
}

export const LibraryPanel = ({
    editorSnapshot,
    onActiveRecord,
}: LibraryPanelProps) => {
    const { localeReady, t } = useTranslation()
    const [open, setOpen] = useState(false)
    const [importOpen, setImportOpen] = useState(false)
    const [importText, setImportText] = useState('')
    const [importError, setImportError] = useState(false)
    const [library, setLibrary] = useState<RotationLibraryStore | null>(null)
    const rootRef = useRef<HTMLDivElement>(null)

    const localeDefaults = useMemo(
        () => ({
            title: t('defaults.rotationTitle'),
            expansion: t('defaults.expansion'),
        }),
        [t],
    )

    // Load once after locale is ready, then hand the active record to the editor.
    useEffect(() => {
        if (!localeReady || library) {
            return
        }
        const loaded = loadRotationLibrary(localeDefaults)
        setLibrary(loaded)
        onActiveRecord(getActiveRecord(loaded))
    }, [localeReady, localeDefaults, library, onActiveRecord])

    // Persist editor edits into the active record.
    useEffect(() => {
        setLibrary((current) => {
            if (!current) {
                return current
            }
            const nextRecord = buildRecordFromEditor(current.activeId, editorSnapshot)
            const existing = current.records.find((record) => record.id === current.activeId)
            if (existing && recordsEqual(existing, nextRecord)) {
                return current
            }
            const next = upsertRecord(current, nextRecord)
            saveRotationLibrary(next)
            return next
        })
    }, [editorSnapshot])

    const flushEditor = useCallback((current: RotationLibraryStore): RotationLibraryStore => (
        upsertRecord(current, buildRecordFromEditor(current.activeId, editorSnapshot))
    ), [editorSnapshot])

    const onSelect = useCallback((recordId: string) => {
        if (!library || recordId === library.activeId) {
            return
        }
        const next: RotationLibraryStore = { ...flushEditor(library), activeId: recordId }
        const record = next.records.find((candidate) => candidate.id === recordId)
        if (!record) {
            return
        }
        setLibrary(next)
        saveRotationLibrary(next)
        onActiveRecord(record)
    }, [library, flushEditor, onActiveRecord])

    const onCreate = useCallback(() => {
        if (!library) {
            return
        }
        const empty = createEmptyRecord(localeDefaults)
        const next = prependRecord(flushEditor(library), empty)
        setLibrary(next)
        saveRotationLibrary(next)
        onActiveRecord(empty)
    }, [library, flushEditor, localeDefaults, onActiveRecord])

    const onDelete = useCallback((recordId: string) => {
        if (!library) {
            return
        }
        const next = deleteRecord(flushEditor(library), recordId, localeDefaults)
        setLibrary(next)
        saveRotationLibrary(next)
        onActiveRecord(getActiveRecord(next))
    }, [library, flushEditor, localeDefaults, onActiveRecord])

    const onReorder = useCallback((fromIndex: number, toIndex: number) => {
        if (!library) {
            return
        }
        const next = reorderRecords(library, fromIndex, toIndex)
        setLibrary(next)
        saveRotationLibrary(next)
    }, [library])

    const onCopy = useCallback(async (recordId: string) => {
        if (!library) {
            return
        }
        let source = library
        if (recordId === library.activeId) {
            source = flushEditor(library)
            setLibrary(source)
            saveRotationLibrary(source)
        }
        const record = source.records.find((candidate) => candidate.id === recordId)
        if (!record) {
            return
        }
        try {
            await navigator.clipboard.writeText(rotationRecordToText(record))
        } catch (error) {
            console.error('Failed to copy rotation record text:', error)
        }
    }, [library, flushEditor])

    const onImport = useCallback((text: string): boolean => {
        if (!library) {
            return false
        }
        try {
            const imported = textToRotationRecord(text.trim())
            const next = prependRecord(flushEditor(library), imported)
            setLibrary(next)
            saveRotationLibrary(next)
            onActiveRecord(imported)
            return true
        } catch (error) {
            console.error('Failed to import rotation record text:', error)
            return false
        }
    }, [library, flushEditor, onActiveRecord])

    const sensors = useSensors(
        useSensor(PointerSensor, {
            // Separate click-to-select from drag-to-reorder
            activationConstraint: { distance: 6 },
        }),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        }),
    )

    // Close the drawer when the user clicks outside it.
    // Popconfirm renders into a document.body portal, so its DOM is outside rootRef.
    // Without the .ant-popover exception, clicking Delete / Cancel would look like an
    // outside click and close the drawer before the confirm action runs.
    useEffect(() => {
        if (!open) {
            return
        }

        const onMouseDown = (event: MouseEvent) => {
            const target = event.target
            if (!(target instanceof Node)) {
                return
            }
            if (rootRef.current?.contains(target)) {
                return
            }
            if (target instanceof Element && target.closest('.ant-popover')) {
                return
            }
            setOpen(false)
        }

        document.addEventListener('mousedown', onMouseDown)
        return () => document.removeEventListener('mousedown', onMouseDown)
    }, [open])

    const onDragEnd = (event: DragEndEvent) => {
        if (!library) {
            return
        }
        const { active, over } = event
        if (!over || active.id === over.id) {
            return
        }
        const fromIndex = library.records.findIndex((record) => record.id === active.id)
        const toIndex = library.records.findIndex((record) => record.id === over.id)
        if (fromIndex < 0 || toIndex < 0) {
            return
        }
        onReorder(fromIndex, toIndex)
    }

    const applyImport = () => {
        const ok = onImport(importText)
        if (ok) {
            setImportText('')
            setImportError(false)
            setImportOpen(false)
            return
        }
        setImportError(true)
    }

    if (!library) {
        return null
    }

    return (
        <Root ref={rootRef}>
            <Tab
                type="button"
                $open={open}
                aria-expanded={open}
                onClick={() => setOpen((current) => !current)}
            >
                {t('library.tab')}
            </Tab>
            <Panel $open={open} aria-hidden={!open}>
                <PanelHeader>
                    <PanelTitle>{t('library.title')}</PanelTitle>
                    <Button type="primary" size="small" onClick={onCreate}>
                        {t('library.new')}
                    </Button>
                </PanelHeader>
                <ListScroll>
                    <DndContext
                        sensors={sensors}
                        collisionDetection={closestCenter}
                        modifiers={[restrictToVerticalAxis]}
                        onDragEnd={onDragEnd}
                    >
                        <SortableContext
                            items={library.records.map((record) => record.id)}
                            strategy={verticalListSortingStrategy}
                        >
                            {library.records.map((record) => (
                                <SortableLibraryRow
                                    key={record.id}
                                    record={record}
                                    active={record.id === library.activeId}
                                    onSelect={onSelect}
                                    onDelete={onDelete}
                                    onCopy={onCopy}
                                />
                            ))}
                        </SortableContext>
                    </DndContext>
                </ListScroll>
                <ImportBlock>
                    <Button
                        size="small"
                        onClick={() => {
                            setImportOpen((current) => !current)
                            setImportError(false)
                        }}
                    >
                        {t('library.importToggle')}
                    </Button>
                    {importOpen && (
                        <>
                            <TextArea
                                value={importText}
                                onChange={(event) => {
                                    setImportText(event.target.value)
                                    setImportError(false)
                                }}
                                placeholder={t('library.importPlaceholder')}
                                autoSize={{ minRows: 4, maxRows: 8 }}
                                status={importError ? 'error' : undefined}
                                style={{ fontSize: 12 }}
                            />
                            <Button type="primary" size="small" onClick={applyImport}>
                                {t('library.importApply')}
                            </Button>
                            {importError && <ErrorText>{t('library.importError')}</ErrorText>}
                        </>
                    )}
                </ImportBlock>
            </Panel>
        </Root>
    )
}
