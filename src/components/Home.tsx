"use client"

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Canvas, CanvasRenderState } from './Canvas/Canvas'
import styled from 'styled-components'
import { Action, Status } from './Canvas/types'
import { normalizeRowCount, rotationGroupStarts } from './Canvas/rotationRows'
import { textToRotation } from '../lib/parseRotation'
import { Job, jobs } from '../data/jobs'
import { Title } from './Title/Title'
import { MetaBar } from './MetaBar/MetaBar'
import { EditorPanel, dataActionToDefaultAction, persistActionSettings } from './Editor/EditorPanel'
import { SequenceListKind, SequenceSelection } from './Editor/SequenceList'
import { CanvasActionsBar } from './Canvas/CanvasActionsBar'
import { CanvasPreviewModal } from './Canvas/CanvasPreviewModal'
import { LibraryPanel } from './Library/LibraryPanel'
import { useTranslation } from '@/context/LanguageContext'
import { getJobName } from '@/lib/jobs'
import { DataAction } from '@/app/api'
import { type RotationRecord } from '@/lib/rotationLibraryStore'

const Container = styled.div`
    display: flex;
    flex-direction: column;
    height: 100vh;
    width: 100%;
    overflow: hidden;
`

// Below Title. Anchors the floating library panel over MetaBar.
const Workspace = styled.div`
    position: relative;
    display: flex;
    flex-direction: column;
    flex: 1;
    min-height: 0;
    width: 100%;
`

const MainRow = styled.div`
    display: flex;
    flex-direction: row;
    flex: 1;
    min-height: 0;
    width: 100%;
`

const CanvasPreview = styled.div`
    display: flex;
    flex-direction: column;
    flex: 1;
    min-width: 0;
    min-height: 0;
`

// Sort prepull actions by time ascending (more negative = earlier)
const sortPrepull = (actions: Action[]): Action[] =>
    [...actions].sort((a, b) => (a.prepull ?? 0) - (b.prepull ?? 0))

interface HomeProps {
    discordAuth: JSX.Element
}

export const Home = ({ discordAuth }: HomeProps) => {
    const { locale, localeReady, t } = useTranslation()
    const [rotation, setRotation] = useState<Action[]>([])
    const [prepullRotation, setPrepullRotation] = useState<Action[]>([])
    const [importError, setImportError] = useState(false)
    const [job, setJob] = useState<Job>(jobs['DRK'])
    const [rotationTitle, setRotationTitle] = useState('')
    const [expansion, setExpansion] = useState('')
    const [patch, setPatch] = useState<string>('7.4')
    const [level, setLevel] = useState<number>(100)
    const [useBalanceLogo, setUseBalanceLogo] = useState(false)
    const [rowCount, setRowCount] = useState(1)
    const [rowSpacing, setRowSpacing] = useState<number | null>(null)
    const [selection, setSelection] = useState<SequenceSelection | null>(null)
    const [previewImageSrc, setPreviewImageSrc] = useState<string | null>(null)
    const [renderReady, setRenderReady] = useState(false)
    const canvasRef = useRef<HTMLCanvasElement>(null)

    const onRenderStateChange = useCallback((state: CanvasRenderState) => {
        setRenderReady(state.status === 'ready')
    }, [])

    // Load the active library record into editor state.
    const applyRecordToEditor = useCallback((record: RotationRecord) => {
        setJob(jobs[record.job] ?? jobs['DRK'])
        setRotationTitle(record.title)
        setExpansion(record.expansion)
        setPatch(record.patch)
        setLevel(record.level)
        setRowCount(record.rowCount)
        setRowSpacing(record.rowSpacing)
        setPrepullRotation(record.prepullRotation)
        setRotation(record.rotation)
        setSelection(null)
        setImportError(false)
    }, [])

    const editorSnapshot = useMemo(() => ({
        job,
        rotationTitle,
        expansion,
        patch,
        level,
        rowCount,
        rowSpacing,
        prepullRotation,
        rotation,
    }), [
        job,
        rotationTitle,
        expansion,
        patch,
        level,
        rowCount,
        rowSpacing,
        prepullRotation,
        rotation,
    ])

    const maxRows = useMemo(() => rotationGroupStarts(rotation).length, [rotation])
    const effectiveRowCount = normalizeRowCount(rowCount, maxRows)
    useEffect(() => setRowCount(current => normalizeRowCount(current, maxRows)), [maxRows])
    useEffect(() => {
        if (!localeReady) {
            return
        }
        setRotationTitle(t('defaults.rotationTitle'))
        setExpansion(t('defaults.expansion'))
    }, [localeReady]) // eslint-disable-line react-hooks/exhaustive-deps -- run once when locale is ready

    // Append an action from search/palette (prepull list if it has a prepull time)
    const addAction = useCallback((action: Action, status?: Status) => {
        const nextAction = status ? { ...action, statusApplied: status } : action
        persistActionSettings(nextAction)

        if (nextAction.prepull !== undefined) {
            setPrepullRotation((current) => sortPrepull([...current, nextAction]))
            return
        }

        setRotation((current) => [...current, nextAction])
    }, [])

    // Palette pick: add to rotation and select the new trailing item
    const onPaletteSelect = useCallback((dataAction: DataAction) => {
        setSelection({ list: 'rotation', index: rotation.length })
        addAction(dataActionToDefaultAction(dataAction))
    }, [addAction, rotation.length])

    // Remove one action; keep selection valid for the same list
    const removeAction = useCallback((list: SequenceListKind, index: number) => {
        if (list === 'prepull') {
            setPrepullRotation((current) => current.filter((_, i) => i !== index))
        } else {
            setRotation((current) => current.filter((_, i) => i !== index))
        }

        setSelection((current) => {
            if (!current || current.list !== list) {
                return current
            }
            if (current.index === index) {
                return null
            }
            if (current.index > index) {
                return { list, index: current.index - 1 }
            }
            return current
        })
    }, [])

    // Reorder within a single list (drag and drop)
    const reorderAction = useCallback((list: SequenceListKind, fromIndex: number, toIndex: number) => {
        if (fromIndex === toIndex) {
            return
        }

        const reorder = (actions: Action[]) => {
            if (
                fromIndex < 0
                || toIndex < 0
                || fromIndex >= actions.length
                || toIndex >= actions.length
            ) {
                return actions
            }
            const next = [...actions]
            const [moved] = next.splice(fromIndex, 1)
            if (!moved) {
                return actions
            }
            next.splice(toIndex, 0, moved)
            return next
        }

        if (list === 'prepull') {
            setPrepullRotation(reorder)
        } else {
            setRotation(reorder)
        }

        // Keep selection on the same action after a reorder in its list.
        setSelection((current) => {
            if (!current || current.list !== list) {
                return current
            }
            if (current.index === fromIndex) {
                return { list, index: toIndex }
            }
            if (fromIndex < current.index && toIndex >= current.index) {
                return { list, index: current.index - 1 }
            }
            if (fromIndex > current.index && toIndex <= current.index) {
                return { list, index: current.index + 1 }
            }
            return current
        })
    }, [])

    // Apply detail-panel edits. Prepull toggle moves between lists; prepull
    // time edits re-sort. Selection updates only when list/index changes.
    const updateAction = useCallback((
        list: SequenceListKind,
        index: number,
        next: Action,
    ) => {
        const willBePrepull = next.prepull !== undefined
        let nextSelection: SequenceSelection = { list, index }

        if (list === 'rotation' && willBePrepull) {
            const updatedPrepull = sortPrepull([...prepullRotation, next])
            const nextIndex = updatedPrepull.indexOf(next)
            setRotation((current) => current.filter((_, i) => i !== index))
            setPrepullRotation(updatedPrepull)
            nextSelection = { list: 'prepull', index: Math.max(0, nextIndex) }
        } else if (list === 'prepull' && !willBePrepull) {
            const nextIndex = rotation.length
            setPrepullRotation((current) => current.filter((_, i) => i !== index))
            setRotation((current) => [...current, next])
            nextSelection = { list: 'rotation', index: nextIndex }
        } else if (list === 'prepull') {
            const updatedPrepull = sortPrepull(
                prepullRotation.map((action, i) => (i === index ? next : action)),
            )
            const nextIndex = updatedPrepull.indexOf(next)
            setPrepullRotation(updatedPrepull)
            nextSelection = { list: 'prepull', index: Math.max(0, nextIndex) }
        } else {
            setRotation((current) => current.map((action, i) => (i === index ? next : action)))
        }

        if (nextSelection.list !== list || nextSelection.index !== index) {
            setSelection(nextSelection)
        }
    }, [prepullRotation, rotation])

    // Parse import text into prepull + rotation lists
    const importRotationText = useCallback(async (text: string) => {
        if (text.trim() === '') {
            setRotation([])
            setPrepullRotation([])
            setSelection(null)
            setImportError(false)
            return
        }

        try {
            const parsedRotation = await textToRotation(text.trim(), locale)

            if (!parsedRotation) {
                setImportError(true)
                return
            }

            setRotation(parsedRotation.filter((action) => !action.prepull))
            setPrepullRotation(
                sortPrepull(parsedRotation.filter((action) => action.prepull)),
            )
            setSelection(null)
            setImportError(false)
        } catch {
            setImportError(true)
        }
    }, [locale])

    // Download the canvas as a PNG
    const exportInfographic = () => {
        const canvas = canvasRef.current
        if (!canvas || !renderReady) return

        const link = document.createElement('a')
        link.download = `${getJobName(job, locale)} ${rotationTitle}.png`
        link.href = canvas.toDataURL('image/png')
        link.click()
    }

    // Open a canvas snapshot in the preview modal
    const openPreview = useCallback(() => {
        const canvas = canvasRef.current
        if (!canvas || !renderReady) return
        setPreviewImageSrc(canvas.toDataURL('image/png'))
    }, [renderReady])

    // Close the preview modal
    const closePreview = useCallback(() => {
        setPreviewImageSrc(null)
    }, [])

    return (
        <Container>
            <Title discordAuth={discordAuth} />
            <Workspace>
                <LibraryPanel
                    editorSnapshot={editorSnapshot}
                    onActiveRecord={applyRecordToEditor}
                />
                <MetaBar
                    currentJob={job}
                    setJob={setJob}
                    title={rotationTitle}
                    setTitle={setRotationTitle}
                    expansion={expansion}
                    setExpansion={setExpansion}
                    patch={patch}
                    setPatch={setPatch}
                    level={level}
                    setLevel={setLevel}
                />
                <MainRow>
                    <EditorPanel
                        job={job}
                        prepullRotation={prepullRotation}
                        rotation={rotation}
                        selection={selection}
                        importError={importError}
                        onSelect={setSelection}
                        onUpdateAction={updateAction}
                        onRemoveAction={removeAction}
                        onReorderAction={reorderAction}
                        onImport={(text) => void importRotationText(text)}
                        onPaletteSelect={onPaletteSelect}
                    />
                    <CanvasPreview>
                        <CanvasActionsBar
                            maxRows={maxRows}
                            rowCount={effectiveRowCount}
                            setRowCount={setRowCount}
                            rowSpacing={rowSpacing}
                            setRowSpacing={setRowSpacing}
                            onPreview={openPreview}
                            onExport={exportInfographic}
                            exportReady={renderReady}
                            useBalanceLogo={useBalanceLogo}
                            setUseBalanceLogo={setUseBalanceLogo}
                        />
                        <Canvas
                            prepullRotation={prepullRotation}
                            rotation={rotation}
                            jobName={getJobName(job, locale)}
                            jobIcon={job?.icon}
                            title={rotationTitle}
                            expansion={expansion}
                            patch={patch}
                            level={level}
                            ref={canvasRef}
                            useBalanceLogo={useBalanceLogo}
                            rowCount={effectiveRowCount}
                            rowSpacing={rowSpacing}
                            onRenderStateChange={onRenderStateChange}
                        />
                    </CanvasPreview>
                </MainRow>
            </Workspace>
            {previewImageSrc && (
                <CanvasPreviewModal
                    imageSrc={previewImageSrc}
                    onClose={closePreview}
                />
            )}
        </Container>
    )
}
