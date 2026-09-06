import { useState } from 'react'
import styled from 'styled-components'
import { Button, Checkbox, InputNumber, Switch } from 'antd'
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
    display: flex;
    flex-direction: column;
    gap: 10px;
    font-size: 13px;
    color: #e1e4e6;

    .ant-checkbox-wrapper { color: #e1e4e6; align-items: flex-start; }
    .ant-checkbox-checked, .ant-checkbox-inner, .ant-checkbox-input {
        width: 18px !important;
        height: 18px !important;
    }
    .ant-checkbox-inner::after { width: 6px !important; height: 10px !important; }
    summary { cursor: pointer; color: #aaf0d1; margin: 5px 0; }
    details[open] { padding: 6px 0; }
`

const Title = styled.h3`
    margin: 0;
    font-size: 13px;
    font-weight: 600;
    color: #c8cbce;
`

const EmptyText = styled.div`
    color: #888;
    font-size: 13px;
`

const Grid = styled.div`
    display: grid;
    grid-template-columns: auto 1fr;
    gap: 8px 12px;
    align-items: center;
`

const FieldLabel = styled.span`
    color: #c8cbce;
    white-space: nowrap;
`

const HeaderRow = styled.div`
    display: flex;
    flex-direction: row;
    align-items: center;
    gap: 10px;
    min-height: 54px;
    > :first-child { flex: 0 0 48px; height: 48px; margin: 0; }
`

const ActionInfo = styled.div`
    display: flex;
    flex-direction: column;
    gap: 2px;
    min-width: 0;
    flex: 1;
`

const ActionName = styled.div`
    font-weight: 600;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
`

const ActionId = styled.div`
    color: #888;
    font-size: 12px;
`

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
        <Container>
            <Title>{t('editor.detail')}</Title>
            <HeaderRow>
                {action.imageSrc && <AbilityIcon action={dataAction} width={48} />}
                <ActionInfo>
                    <ActionName>{action.name || t('actionBuilder.unknown')}</ActionName>
                    <ActionId>{action.id}</ActionId>
                </ActionInfo>
            </HeaderRow>
            <Grid>
                <FieldLabel>{t('actionBuilder.actionType')}</FieldLabel>
                <Switch
                    checkedChildren={t('actionBuilder.gcd')}
                    unCheckedChildren={t('actionBuilder.ogcd')}
                    checked={isGcd}
                    onChange={setGcd}
                />

                <FieldLabel>{t('actionBuilder.prepull')}</FieldLabel>
                <Checkbox
                    aria-label={t('actionBuilder.prepull')}
                    checked={hasPrepull}
                    onChange={(e) => setPrepullEnabled(e.target.checked)}
                />

                {hasPrepull && (
                    <>
                        <FieldLabel>{t('actionBuilder.timeSeconds')}</FieldLabel>
                        <InputNumber
                            min={-60}
                            max={0}
                            value={action.prepull ?? DEFAULT_PREPULL_TIME}
                            onChange={(value) => emit({ ...action, prepull: value ?? DEFAULT_PREPULL_TIME })}
                        />
                    </>
                )}

                {isGcd ? (
                    <>
                        <FieldLabel>{t('actionBuilder.recastTime')}</FieldLabel>
                        <InputNumber
                            aria-label={t('actionBuilder.recastTime')}
                            min={0}
                            max={30}
                            step={0.01}
                            value={action.type === 'gcd' ? (action.recastTime ?? DEFAULT_RECAST_TIME) : DEFAULT_RECAST_TIME}
                            onChange={(value) => {
                                if (action.type !== 'gcd') return
                                emit({ ...action, recastTime: value ?? DEFAULT_RECAST_TIME })
                            }}
                        />
                        {action.defaults?.gcdGroup && (
                            <>
                                <FieldLabel>{t('editor.recastScope')}</FieldLabel>
                                <div>
                                    <Checkbox checked={isSharingRecast(action)} onChange={event => emit(action, event.target.checked ? 'share' : 'specific')}>
                                        {t('editor.shareGcd')}
                                    </Checkbox>
                                    <div>{isSharingRecast(action) ? t('editor.sharedValue') : t('editor.specificValue')}</div>
                                    {!isSharingRecast(action) && <Button size="small" onClick={() => emit(action, 'reset-recast')}>{t('editor.resetRecast')}</Button>}
                                </div>
                            </>
                        )}
                        <FieldLabel>{t('actionBuilder.castTime')}</FieldLabel>
                        <InputNumber
                            min={0}
                            max={10}
                            aria-label={t('actionBuilder.castTime')}
                            value={action.type === 'gcd' ? (action.castTime ?? DEFAULT_CAST_TIME) : DEFAULT_CAST_TIME}
                            onChange={(value) => {
                                if (action.type !== 'gcd') return
                                emit({ ...action, castTime: value ?? DEFAULT_CAST_TIME })
                            }}
                        />
                    </>
                ) : (
                    // Late weave only applies to oGCDs in the post-pull rotation.
                    !hasPrepull && (
                        <>
                            <FieldLabel>{t('actionBuilder.weaveLate')}</FieldLabel>
                            <Checkbox
                                checked={action.type === 'ogcd' ? !!action.lateWeave : false}
                                onChange={(e) => {
                                    if (action.type !== 'ogcd') return
                                    emit({ ...action, lateWeave: e.target.checked })
                                }}
                            />
                        </>
                    )
                )}

            </Grid>
            <Title>{t('editor.statuses')}</Title>
            {statuses.map((status, statusIndex) => (
                <div key={`${status.id}:${statusIndex}`} data-testid="status-row">
                    <Checkbox checked={status.enabled !== false} onChange={event => updateStatus(statusIndex, { enabled: event.target.checked })}>
                        {status.name}
                    </Checkbox>
                    <details>
                        <summary>{t('editor.statusSettings')}</summary>
                        <Grid>
                            <FieldLabel>{t('buffBuilder.duration')}</FieldLabel>
                            <InputNumber aria-label={`${status.name} ${t('buffBuilder.duration')}`} min={0} max={999} value={status.duration} onChange={value => updateStatus(statusIndex, { duration: value ?? 0 })} />
                            <FieldLabel>{t('buffBuilder.applicationDelay')}</FieldLabel>
                            <InputNumber aria-label={`${status.name} ${t('buffBuilder.applicationDelay')}`} min={0} max={30} step={0.1} value={status.applicationDelay} onChange={value => updateStatus(statusIndex, { applicationDelay: value ?? 0 })} />
                            <FieldLabel>{t('editor.statusColor')}</FieldLabel>
                            <input aria-label={`${status.name} ${t('editor.statusColor')}`} type="color" value={status.color} onChange={event => updateStatus(statusIndex, { color: event.target.value })} />
                        </Grid>
                        <Button size="small" onClick={() => emit({ ...action, statusesApplied: statuses.filter((_, i) => i !== statusIndex) })}>{t('editor.remove')}</Button>
                    </details>
                </div>
            ))}
            <Button onClick={() => setBuffEditorOpen(!buffEditorOpen)}>{buffEditorOpen ? t('customAction.cancel') : t('editor.addStatus')}</Button>
            {buffEditorOpen && <>
                <SearchInput job={job} onSelect={addStatus} search={searchForStatus} placeholder={t('abilities.searchStatus')} language={locale} />
                <CustomBuffInput onCreate={addStatus} />
            </>}
            <Button onClick={() => emit(action, 'reset')}>{t('editor.resetDefaults')}</Button>
        </Container>
    )
}
