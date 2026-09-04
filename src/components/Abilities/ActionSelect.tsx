import { Job } from '@/data/jobs';
import React, { useEffect, useRef, useState } from 'react';
import { Action } from '../Canvas/types';
import { DataAction, searchForAction } from '@/app/api';
import SearchInput from './SearchInput';
import styled from 'styled-components';
import { ActionBuilder } from './ActionBuilder';
import { CustomActionInput } from './CustomActionInput'
import { buffDetailsToStatus, getStoredCustomAction } from '@/lib/customActionsStore';
import { useTranslation } from '@/context/LanguageContext'

const DEFAULT_RECAST_TIME = 2.5;
const DEFAULT_CAST_TIME = 0;

const ActionSelectContainer = styled.div`
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 16px;
    font-size: 16px;
    flex-shrink: 0;
    margin-bottom: auto;
`;

const SearchContainer = styled.div`
    display: block;
    width: 100%;
`;

interface ActionSelectProps {
    createAction: (action: Action) => void
    job: Job
    appliesBuff: boolean
    setAppliesBuff: (appliesBuff: boolean) => void
    setStatus: (status: any) => void
}

export const ActionSelect: React.FC<ActionSelectProps> = ({
    createAction,
    job,
    appliesBuff,
    setAppliesBuff,
    setStatus,
}) => {
    const { t, locale } = useTranslation()
    const [currentAction, setCurrentAction] = useState<DataAction | null>(null);
    const [gcdToggled, setGcdToggled] = useState<boolean>(true);
    const [lateWeave, setLateWeave] = useState<boolean>(false);
    const [recastTime, setRecastTime] = useState<number | null>(null);
    const [castTime, setCastTime] = useState<number | null>(null);
    const [prepull, setPrepull] = useState<boolean>(false);
    const [prepullTime, setPrepullTime] = useState<number | null>(-5);
    const loadedActionIdRef = useRef<string | null>(null);

    // Effect to populate fields from local storage when an action is selected
    useEffect(() => {
        if (!currentAction || loadedActionIdRef.current === currentAction.id) {
            return;
        }

        const storedAction = getStoredCustomAction(currentAction.id);
        if (storedAction) {
            // Populate action type and times
            setGcdToggled(storedAction.isGCD);
            if (storedAction.isGCD) {
                setRecastTime(storedAction.recastTime ?? null);
                setCastTime(storedAction.castTime ?? null);
            } else {
                setLateWeave(storedAction.lateWeave ?? false);
            }

            // Populate buff details if they exist
            if (storedAction.appliesBuff && storedAction.buffDetails) {
                setAppliesBuff(true);
                const status = buffDetailsToStatus(storedAction.buffDetails);
                if (status) {
                    setStatus(status);
                }
            }
            
            loadedActionIdRef.current = currentAction.id;
        }
    }, [currentAction, setAppliesBuff, setStatus]);

    const onClear = () => {
        setCurrentAction(null);
        setAppliesBuff(false);
        setGcdToggled(true);
        setLateWeave(false);
        setRecastTime(null);
        setCastTime(null);
        loadedActionIdRef.current = null;
    }

    const onCreate = async () => {
        if (!currentAction) return;

        const icon = currentAction.icon ? currentAction.icon.toString() : '';

        if (gcdToggled) {
            createAction({
                type: 'gcd',
                id: currentAction.id,
                name: currentAction.name ?? '',
                imageSrc: icon,
                recastTime: recastTime ?? DEFAULT_RECAST_TIME,
                castTime: castTime ?? DEFAULT_CAST_TIME,
                prepull: prepull ? (prepullTime ?? 0) : undefined,
            });
        } else {
            createAction({
                type: 'ogcd',
                id: currentAction.id,
                name: currentAction.name ?? '',
                imageSrc: icon,
                lateWeave: lateWeave,
                prepull: prepull ? (prepullTime ?? 0) : undefined,
            });
        }

        onClear();
    }

    if (!currentAction) {
        return (
            <ActionSelectContainer>
                <SearchContainer>
                    <SearchInput
                        job={job}
                        onSelect={setCurrentAction}
                        search={searchForAction}
                        placeholder={t('abilities.searchAction')}
                        language={locale}
                    />
                </SearchContainer>
                <div>{t('abilities.orDivider')}</div>
                <CustomActionInput onCreate={setCurrentAction} />
            </ActionSelectContainer>
        );
    }

    return (
        <ActionBuilder
            currentAction={currentAction}
            setGcdToggled={setGcdToggled}
            gcdToggled={gcdToggled}
            setLateWeave={setLateWeave}
            lateWeave={lateWeave}
            setRecastTime={setRecastTime}
            recastTime={recastTime}
            setCastTime={setCastTime}
            castTime={castTime}
            setPrepull={setPrepull}
            prepull={prepull}
            setPrepullTime={setPrepullTime}
            prepullTime={prepullTime}
            appliesBuff={appliesBuff}
            setAppliesBuff={setAppliesBuff}
            onCreate={onCreate}
            onClear={onClear}
        />
    );
}
