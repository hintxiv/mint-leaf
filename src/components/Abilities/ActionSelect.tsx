import { Job } from '@/data/jobs';
import React, { useState } from 'react';
import { Action } from '../Canvas/types';
import { DataAction, searchForAction } from '@/app/api';
import SearchInput from './SearchInput';
import styled from 'styled-components';
import { ActionBuilder } from './ActionBuilder';
import { Button } from 'antd';
import { CustomActionInput } from './CustomActionInput'

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
}

export const ActionSelect: React.FC<ActionSelectProps> = ({
    createAction,
    job,
    appliesBuff,
    setAppliesBuff,
}) => {
    const [currentAction, setCurrentAction] = useState<DataAction | null>(null);
    const [gcdToggled, setGcdToggled] = useState<boolean>(true);
    const [lateWeave, setLateWeave] = useState<boolean>(false);
    const [recastTime, setRecastTime] = useState<number | null>(null);
    const [castTime, setCastTime] = useState<number | null>(null);
    const [prepull, setPrepull] = useState<boolean>(false);
    const [prepullTime, setPrepullTime] = useState<number | null>(-5);

    const onClear = () => {
        setCurrentAction(null);
        setAppliesBuff(false);
        setGcdToggled(true);
        setLateWeave(false);
        setRecastTime(null);
        setCastTime(null);
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
                        placeholder="Search for an action..."
                    />
                </SearchContainer>
                <div>- or -</div>
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
