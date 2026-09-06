import { useId, useState } from 'react'
import styled from 'styled-components'
import { Button, Checkbox, Input } from 'antd'
import { DraftNumber } from './DraftNumber'
import { Action, Status } from '../Canvas/types'
import { AbilityIcon } from '../Abilities/AbilityIcon'
import SearchInput from '../Abilities/SearchInput'
import { CustomBuffInput } from '../Abilities/CustomBuffInput'
import { searchForStatus } from '@/app/api'
import { DataStatus } from '@/app/api/xivapi/types'
import { ActionEdit, isSharingRecast } from '@/lib/actionDefaults'
import { Job } from '@/data/jobs'
import { DataAction } from '@/app/api'
import { useTranslation } from '@/context/LanguageContext'
import { SequenceListKind } from './SequenceList'

const DEFAULT_RECAST_TIME = 2.5
const DEFAULT_CAST_TIME = 0
const DEFAULT_PREPULL_TIME = -5

const Container = styled.div`
    --detail-border: #454957;
    --detail-muted: #adb2bf;
    display: flex;
    flex-direction: column;
    gap: 16px;
    min-width: 0;
    font-size: 13px;
    line-height: 1.5;
    color: #e1e4e6;

    .ant-checkbox-wrapper {
        color: #e1e4e6;
        font-size: 13px;
        align-items: flex-start;
        margin: 0;
        min-width: 0;
        overflow-wrap: anywhere;
    }
    .ant-checkbox { margin-top: 2px; }
    .ant-checkbox-checked, .ant-checkbox-inner, .ant-checkbox-input {
        width: 16px !important;
        height: 16px !important;
    }
    .ant-checkbox-inner::after { width: 5px !important; height: 9px !important; }
    .ant-input { font-size: 13px; min-height: 32px; }
    .ant-btn {
        height: auto;
        min-height: 32px;
        padding: 5px 10px;
        font-size: 13px;
        line-height: 20px;
        white-space: normal;
        box-shadow: none;
        border-radius: 6px;
        background: #2d303c !important;
        border: 1px solid var(--detail-border) !important;
        color: #e1e4e6 !important;
    }
    .ant-btn:hover {
        background: #363b47 !important;
        border-color: #74d6b4 !important;
        color: #aaf0d1 !important;
    }
    .ant-btn-text {
        background: transparent !important;
        border-color: transparent !important;
        color: #aaf0d1 !important;
        padding: 4px 0;
        text-align: left;
        justify-content: flex-start;
    }
    .ant-btn-text.ant-btn-dangerous { color: #eea0a7 !important; }
    .ant-btn-text.ant-btn-dangerous:hover { color: #ffc3c8 !important; background: #442d38 !important; }
    :is(button, input, summary):focus-visible {
        outline: 2px solid #aaf0d1;
        outline-offset: 2px;
    }
    input[type=color] {
        width: 40px;
        height: 32px;
        padding: 3px;
        border: 1px solid var(--detail-border);
        border-radius: 6px;
        background: #1d1d20;
        cursor: pointer;
    }
    input[type=color]::-webkit-color-swatch-wrapper { padding: 0; }
    input[type=color]::-webkit-color-swatch { border: 0; border-radius: 3px; }
    input[type=color]::-moz-color-swatch { border: 0; border-radius: 3px; }
`

const Title = styled.h3`
    margin: 0;
    font-size: 12px;
    font-weight: 600;
    color: #adb2bf;
`

const EmptyText = styled.div`
    color: #adb2bf;
    font-size: 13px;
`

const Section = styled.section`
    display: flex;
    flex-direction: column;
    gap: 12px;
    min-width: 0;
`

const Grid = styled.div`
    display: grid;
    grid-template-columns: minmax(0, 1fr) 96px;
    gap: 8px 12px;
    align-items: center;
    min-width: 0;
`

const FieldLabel = styled.label`
    color: #c8cbce;
    overflow-wrap: anywhere;
`

const HeaderRow = styled.div`
    display: flex;
    align-items: center;
    gap: 12px;
    > :first-child:not(:last-child) { flex: 0 0 48px; height: 48px; margin: 0; }
`

const ActionInfo = styled.div`
    display: flex;
    flex-direction: column;
    gap: 2px;
    min-width: 0;
    flex: 1;
`

const NameRow = styled.div`
    display: flex;
    align-items: flex-start;
    gap: 4px;
    min-width: 0;
    .ant-btn {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        flex: 0 0 24px;
        width: 24px;
        height: 24px;
        min-height: 24px;
        padding: 0;
        line-height: 1;
    }
    .ant-btn svg { display: block; flex-shrink: 0; }
    .ant-btn:hover { border-color: transparent !important; }
    > :first-child { flex: 0 1 auto; min-width: 0; }
`

const EditableName = ({ name, onChange }: { name: string; onChange: (name: string) => void }) => {
    const { t } = useTranslation()
    const [draft, setDraft] = useState<string | null>(null)
    return draft === null ? <NameRow>
        <ActionName>{name || t('actionBuilder.unknown')}</ActionName>
        <Button type="text" aria-label={t('editor.editName')} onClick={() => setDraft(name)}>
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                <path d="m10 3 3 3M3 10l8-8a1 1 0 0 1 3 3l-8 8-4 1 1-4Z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
            </svg>
        </Button>
    </NameRow> : <Input
        autoFocus aria-label={t('editor.actionName')} value={draft}
        onFocus={event => event.target.select()}
        onChange={event => setDraft(event.target.value)}
        onBlur={() => { if (draft.trim() && draft.trim() !== name) onChange(draft.trim()); setDraft(null) }}
        onKeyDown={event => {
            if (event.nativeEvent.isComposing) return
            if (event.key === 'Enter') { event.preventDefault(); event.currentTarget.blur() }
            if (event.key === 'Escape') { event.preventDefault(); setDraft(null) }
        }}
    />
}

const ActionName = styled.div`
    font-size: 15px;
    font-weight: 600;
    line-height: 24px;
    overflow-wrap: anywhere;
`

const ActionId = styled.div`
    color: #adb2bf;
    font-size: 12px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
`

const TypeRow = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
`

const TypeSelector = styled.div`
    display: flex;
    flex-shrink: 0;
    padding: 2px;
    border: 1px solid var(--detail-border);
    border-radius: 6px;
    background: #1d1d20;
    label { position: relative; cursor: pointer; }
    input { position: absolute; opacity: 0; width: 100%; height: 100%; margin: 0; cursor: pointer; }
    span { display: block; padding: 2px 10px; line-height: 22px; border-radius: 3px; color: #adb2bf; }
    input:checked + span { color: #b7f3db; background: #254c42; }
    input:focus-visible + span { outline: 2px solid #aaf0d1; outline-offset: 2px; }
`

const RecastScope = styled.div`
    grid-column: 1 / -1;
    padding: 8px 10px;
    border-radius: 6px;
    background: #20232d;
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 4px;
`

const Help = styled.p`
    margin: 0;
    color: #adb2bf;
    font-size: 12px;
    line-height: 1.5;
`

const StatusCard = styled.div`
    border: 1px solid var(--detail-border);
    border-radius: 8px;
    background: #232630;
    min-width: 0;
`

const StatusHeader = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    padding: 8px 4px 8px 10px;
    .ant-btn {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        flex: 0 0 32px;
        width: 32px;
        height: 32px;
        padding: 0;
        line-height: 1;
        color: #adb2bf !important;
    }
    .ant-btn svg { display: block; flex-shrink: 0; }
    .ant-btn:hover {
        border-color: transparent !important;
        background: transparent !important;
        color: #aaf0d1 !important;
    }
`

const StatusSettings = styled.div`
    padding: 12px;
    border-top: 1px solid var(--detail-border);
    display: flex;
    flex-direction: column;
    align-items: stretch;
    gap: 8px;
    .ant-btn { align-self: flex-start; }
`

const Footer = styled.div`
    padding-top: 16px;
    border-top: 1px solid var(--detail-border);
    display: flex;
    flex-direction: column;
`

const AddStatusForm = styled.div`
    display: flex;
    flex-direction: column;
    gap: 8px;
    min-width: 0;
    > * { min-width: 0; }
    .status-search__control { border-color: var(--detail-border); font-size: 13px; }
    .status-search__control:hover, .status-search__control--is-focused { border-color: #aaf0d1; }
    .status-search__placeholder { color: #adb2bf; }
`

const StatusEditor = ({ status, onUpdate, onRemove }: {
    status: Status
    onUpdate: (patch: Partial<Status>) => void
    onRemove: () => void
}) => {
    const { t } = useTranslation()
    const id = useId()
    const [open, setOpen] = useState(false)
    return <StatusCard data-testid="status-row">
        <StatusHeader>
            <Checkbox checked={status.enabled !== false} onChange={event => onUpdate({ enabled: event.target.checked })}>
                {status.name}
            </Checkbox>
            <Button type="text" aria-label={`${status.name} ${t('editor.statusSettings')}`} aria-expanded={open} aria-controls={`${id}-settings`} onClick={() => setOpen(!open)}>
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true" style={{ transform: open ? 'rotate(180deg)' : undefined }}>
                    <path d="m4 6 4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
            </Button>
        </StatusHeader>
        <div id={`${id}-settings`} hidden={!open}>
            <StatusSettings>
                <Grid>
                    <FieldLabel htmlFor={`${id}-duration`}>{t('buffBuilder.duration')}</FieldLabel>
                    <DraftNumber id={`${id}-duration`} aria-label={`${status.name} ${t('buffBuilder.duration')}`} min={0} max={999} value={status.duration} onChange={value => onUpdate({ duration: value ?? 0 })} />
                    <FieldLabel htmlFor={`${id}-delay`}>{t('buffBuilder.applicationDelay')}</FieldLabel>
                    <DraftNumber id={`${id}-delay`} aria-label={`${status.name} ${t('buffBuilder.applicationDelay')}`} min={0} max={30} step={0.1} value={status.applicationDelay} onChange={value => onUpdate({ applicationDelay: value ?? 0 })} />
                    <FieldLabel htmlFor={`${id}-color`}>{t('editor.statusColor')}</FieldLabel>
                    <input id={`${id}-color`} aria-label={`${status.name} ${t('editor.statusColor')}`} type="color" value={status.color} onChange={event => onUpdate({ color: event.target.value })} />
                </Grid>
                <Button type="text" danger aria-label={`${t('editor.removeStatus')}: ${status.name}`} onClick={onRemove}>{t('editor.removeStatus')}</Button>
            </StatusSettings>
        </div>
    </StatusCard>
}

interface SequenceDetailProps {
    job: Job
    action: Action | null
    list: SequenceListKind | null
    index: number | null
    onChange: (list: SequenceListKind, index: number, next: Action, edit?: ActionEdit) => void
}

const toDataAction = (action: Action): DataAction => ({
    id: action.id,
    name: action.name,
    icon: action.imageSrc ? new URL(action.imageSrc) : null,
})

export const SequenceDetail = ({ job, action, list, index, onChange }: SequenceDetailProps) => {
    const { t, locale } = useTranslation()
    const id = useId()
    // Status search opens only in response to an explicit user action.
    const [buffEditorOpen, setBuffEditorOpen] = useState(false)

    if (!action || !list || index === null) {
        return (
            <Container>
                <Title>{t('editor.detail')}</Title>
                <EmptyText>{t('editor.detailEmpty')}</EmptyText>
            </Container>
        )
    }

    const isGcd = action.type === 'gcd'
    const hasPrepull = action.prepull !== undefined

    const emit = (next: Action, edit: ActionEdit = 'edit') => {
        onChange(list, index, next, edit)
    }

    // Build GCD/oGCD from the current `action` (shared fields stay; timing resets).
    const setGcd = (gcd: boolean) => {
        if (gcd) {
            emit({
                ...action,
                type: 'gcd',
                id: action.id,
                name: action.name,
                imageSrc: action.imageSrc,
                instanceId: action.instanceId,
                prepull: action.prepull,
                recastTime: DEFAULT_RECAST_TIME,
                castTime: DEFAULT_CAST_TIME,
            })
        } else {
            emit({
                ...action,
                type: 'ogcd',
                id: action.id,
                name: action.name,
                imageSrc: action.imageSrc,
                instanceId: action.instanceId,
                prepull: action.prepull,
                lateWeave: false,
            })
        }
    }

    // Toggle whether this action lives in the prepull list.
    // Prepull is on when `prepull` is a number (`!== undefined`).
    const setPrepullEnabled = (enabled: boolean) => {
        if (enabled) {
            emit({ ...action, prepull: action.prepull ?? DEFAULT_PREPULL_TIME })
        } else {
            emit({ ...action, prepull: undefined })
        }
    }

    const statuses = action.statusesApplied ?? []
    const updateStatus = (statusIndex: number, patch: Partial<Status>) => {
        emit({ ...action, statusesApplied: statuses.map((status, i) => i === statusIndex ? { ...status, ...patch } : status) })
    }
    const addStatus = (data: DataStatus) => {
        emit({ ...action, statusesApplied: [...statuses, {
            id: data.id, name: data.name ?? '', imageSrc: data.icon?.toString() ?? '',
            enabled: true, duration: 20, applicationDelay: 0, color: '#74d6b4',
        }] })
        setBuffEditorOpen(false)
    }

    const dataAction = toDataAction(action)

    return (
        <Container data-testid="action-detail">
            <Section>
                <Title>{t('editor.detail')}</Title>
                <HeaderRow>
                    {action.imageSrc && <AbilityIcon action={dataAction} width={48} />}
                    <ActionInfo>
                        <EditableName name={action.name} onChange={name => emit({ ...action, name })} />
                        <ActionId title={action.id}>{action.id}</ActionId>
                    </ActionInfo>
                </HeaderRow>
            </Section>
            <TypeRow>
                <span id={`${id}-type`}>{t('actionBuilder.actionType')}</span>
                <TypeSelector role="radiogroup" aria-labelledby={`${id}-type`}>
                    {(['gcd', 'ogcd'] as const).map(type => <label key={type}>
                        <input type="radio" name={`${id}-type`} value={type} checked={action.type === type} onChange={() => setGcd(type === 'gcd')} />
                        <span>{t(type === 'gcd' ? 'actionBuilder.gcd' : 'actionBuilder.ogcd')}</span>
                    </label>)}
                </TypeSelector>
            </TypeRow>
            <Section aria-labelledby={`${id}-timing`}>
                <Title id={`${id}-timing`}>{t('editor.timing')}</Title>
                {isGcd && <Grid>
                    <FieldLabel htmlFor={`${id}-recast`}>{t('actionBuilder.recastTime')}</FieldLabel>
                    <DraftNumber
                        id={`${id}-recast`}
                        min={0} max={30} step={0.01}
                        value={action.type === 'gcd' ? (action.recastTime ?? DEFAULT_RECAST_TIME) : DEFAULT_RECAST_TIME}
                        onChange={value => {
                            if (action.type === 'gcd') emit({ ...action, recastTime: value ?? DEFAULT_RECAST_TIME })
                        }}
                    />
                    {action.defaults?.gcdGroup && <RecastScope>
                        <Checkbox aria-describedby={`${id}-scope-help`} checked={isSharingRecast(action)} onChange={event => emit(action, event.target.checked ? 'share' : 'specific')}>
                            {t('editor.shareGcd')}
                        </Checkbox>
                        <Help id={`${id}-scope-help`}>{isSharingRecast(action) ? t('editor.sharedValue') : t('editor.specificValue')}</Help>
                        {!isSharingRecast(action) && <Button type="text" onClick={() => emit(action, 'reset-recast')}>{t('editor.resetRecast')}</Button>}
                    </RecastScope>}
                    <FieldLabel htmlFor={`${id}-cast`}>{t('actionBuilder.castTime')}</FieldLabel>
                    <DraftNumber
                        id={`${id}-cast`} min={0} max={10}
                        value={action.type === 'gcd' ? (action.castTime ?? DEFAULT_CAST_TIME) : DEFAULT_CAST_TIME}
                        onChange={value => {
                            if (action.type === 'gcd') emit({ ...action, castTime: value ?? DEFAULT_CAST_TIME })
                        }}
                    />
                </Grid>}
                <Checkbox checked={hasPrepull} onChange={event => setPrepullEnabled(event.target.checked)}>{t('editor.prepull')}</Checkbox>
                {hasPrepull && <Grid>
                    <FieldLabel htmlFor={`${id}-prepull`}>{t('actionBuilder.timeSeconds')}</FieldLabel>
                    <DraftNumber id={`${id}-prepull`} min={-60} max={0} value={action.prepull ?? DEFAULT_PREPULL_TIME} onChange={value => emit({ ...action, prepull: value ?? DEFAULT_PREPULL_TIME })} />
                </Grid>}
                {!isGcd && !hasPrepull && <Checkbox
                    checked={action.type === 'ogcd' ? !!action.lateWeave : false}
                    onChange={event => {
                        if (action.type === 'ogcd') emit({ ...action, lateWeave: event.target.checked })
                    }}
                >{t('editor.lateWeave')}</Checkbox>}
            </Section>
            <Section aria-labelledby={`${id}-statuses`}>
                <Title id={`${id}-statuses`}>{t('editor.statuses')}</Title>
                {statuses.map((status, statusIndex) => <StatusEditor
                    key={`${status.id}:${statusIndex}`} status={status}
                    onUpdate={patch => updateStatus(statusIndex, patch)}
                    onRemove={() => emit({ ...action, statusesApplied: statuses.filter((_, i) => i !== statusIndex) })}
                />)}
                <Button aria-expanded={buffEditorOpen} aria-controls={`${id}-add-status`} onClick={() => setBuffEditorOpen(!buffEditorOpen)}>{buffEditorOpen ? t('customAction.cancel') : t('editor.addStatus')}</Button>
                <div id={`${id}-add-status`} hidden={!buffEditorOpen}>
                    {buffEditorOpen && <AddStatusForm>
                        <SearchInput classNamePrefix="status-search" job={job} onSelect={addStatus} search={searchForStatus} placeholder={t('abilities.searchStatus')} language={locale} />
                        <CustomBuffInput onCreate={addStatus} />
                    </AddStatusForm>}
                </div>
            </Section>
            <Footer><Button onClick={() => emit(action, 'reset')}>{t('editor.resetDefaults')}</Button></Footer>
        </Container>
    )
}
