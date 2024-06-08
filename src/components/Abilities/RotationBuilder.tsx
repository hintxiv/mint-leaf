import React, { useState } from 'react';
import SearchInput from './SearchInput'
import { DataAction, searchForAction } from '@/app/api'
import styled from 'styled-components'
import { Button, Checkbox, InputNumber, Switch } from 'antd'
import { Action } from '../Canvas/types'
import { AbilityIcon } from './AbilityIcon'
import { Job } from '@/data/jobs'

const DEFAULT_RECAST_TIME = 2.5;
const DEFAULT_CAST_TIME = 0;

const RotationBuilderContainer = styled.div`
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

const ActionDisplayAndSettings = styled.div`
    display: flex;
    flex-direction: row;
    gap: 16px;
    height: 100%;
    width: 100%;
    padding: 16px;
    justify-content: space-between;
    flex-grow: 1;
    background-image: url("data:image/svg+xml,%3csvg width='100%25' height='100%25' xmlns='http://www.w3.org/2000/svg'%3e%3crect width='100%25' height='100%25' fill='none' stroke='white' stroke-width='2' stroke-dasharray='6%2c 14' stroke-dashoffset='0' stroke-linecap='square'/%3e%3c/svg%3e");
`;

const ActionDisplayAndSettingsColumn = styled.div`
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 12px;
    flex: 1 1 0;
    width: 0;
`;

const ActionInfo = styled.div`
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
    gap: 4px;
`;

const ActionButtons = styled.div`
    display: flex;
    flex-direction: row;
    gap: 8px;
    padding-bottom: 8px;
    > * {
        font-size: 16px;
        line-height: 20px;
    }
`;

interface RotationBuilderProps {
    createAction: (action: Action) => void
    job: Job
    appliesBuff: boolean
    setAppliesBuff: (appliesBuff: boolean) => void
}

export const RotationBuilder: React.FC<RotationBuilderProps> = ({
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
            <RotationBuilderContainer>
                <SearchContainer>
                    <SearchInput
                        job={job}
                        onSelect={setCurrentAction}
                        search={searchForAction}
                        placeholder="Search for an action..."
                    />
                </SearchContainer>
            </RotationBuilderContainer>
        );
    }

    return (
        <RotationBuilderContainer>
            <ActionDisplayAndSettings>
                <ActionDisplayAndSettingsColumn>
                    {currentAction.icon &&
                        <AbilityIcon action={currentAction} width={80} />
                    }
                    <ActionInfo>
                        <div>{currentAction.name ?? 'Unknown'}</div>
                        <div>
                            {currentAction.id.startsWith('item-')
                                ? `${currentAction.id.replace('item-', '')} (Item)`
                                : `${currentAction.id}`
                            }
                        </div>
                    </ActionInfo>
                </ActionDisplayAndSettingsColumn>
                <ActionDisplayAndSettingsColumn>
                    <span>Action Type</span>
                    <Switch
                        checkedChildren="GCD"
                        unCheckedChildren="oGCD"
                        defaultChecked
                        onChange={setGcdToggled}
                    />
                    <span>Applies Buff?</span>
                    <Checkbox
                        checked={appliesBuff}
                        onChange={(e) => setAppliesBuff(e.target.checked)}
                    />
                </ActionDisplayAndSettingsColumn>
                <ActionDisplayAndSettingsColumn>
                    <span>Prepull?</span>
                    <Checkbox
                        checked={prepull}
                        onChange={(e) => setPrepull(e.target.checked)}
                    />
                    {prepull &&
                        <>
                            <span>Time (s)</span>
                            <InputNumber
                                min={-60}
                                max={0}
                                defaultValue={-5}
                                value={prepullTime}
                                onChange={setPrepullTime}
                            />
                        </>
                    }
                </ActionDisplayAndSettingsColumn>
                <ActionDisplayAndSettingsColumn>
                    {gcdToggled ?
                        <>
                            <span>Recast Time (s)</span>
                            <InputNumber
                                min={0}
                                max={10}
                                defaultValue={DEFAULT_RECAST_TIME}
                                value={recastTime}
                                onChange={setRecastTime}
                            />
                            <span>Cast Time (s)</span>
                            <InputNumber
                                min={0}
                                max={10}
                                defaultValue={DEFAULT_CAST_TIME}
                                value={castTime}
                                onChange={setCastTime}
                            />
                        </>
                        : !prepull &&
                        <>
                            <span>Weave late?</span>
                            <Checkbox
                                checked={lateWeave}
                                onChange={(e) => setLateWeave(e.target.checked)}
                            />
                        </>
                    }    
                </ActionDisplayAndSettingsColumn>
            </ActionDisplayAndSettings>
            <ActionButtons>
                <Button type="primary" onClick={onCreate}>
                    Add to rotation
                </Button>
                <Button danger onClick={onClear}>
                    Clear
                </Button>
            </ActionButtons>
        </RotationBuilderContainer>
    );
}
