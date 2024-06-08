import React, { useEffect, useRef, useState } from 'react';
import SearchInput from './SearchInput'
import { searchForStatus } from '@/app/api'
import styled from 'styled-components'
import { InputNumber } from 'antd'
import { Status } from '../Canvas/types'
import { Job } from '@/data/jobs'
import { DataStatus } from '@/app/api/xivapi/types'
import { StatusIcon } from './StatusIcon'
import ColorThief from 'colorthief'

const colorThief = new ColorThief();

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

const componentToHex = (c: number) => {
    var hex = c.toString(16);
    return hex.length == 1 ? "0" + hex : hex;
}
  
const rgbToHex = (r: number, g: number, b: number) => {
    return "#" + componentToHex(r) + componentToHex(g) + componentToHex(b);
}

interface BuffBuilderProps {
    job: Job
    setStatus: (status: Status) => void
}

export const BuffBuilder: React.FC<BuffBuilderProps> = ({ job, setStatus }) => {
    const [currentStatus, setCurrentStatus] = useState<DataStatus | null>(null);
    const [applicationDelay, setApplicationDelay] = useState<number | null>(0);
    const [duration, setDuration] = useState<number | null>(20);
    const [color, setColor] = useState<string>();
    const imageRef = useRef<HTMLImageElement>(null);

    const getDominantColor = async () => {
        if (!imageRef.current) {
            return;
        }

        if (imageRef.current.complete) {
            const color = await colorThief.getColor(imageRef.current, 1); 
            return rgbToHex(color[0], color[1], color[2]);
        } else {
            return new Promise<string>((resolve, _) => {
                imageRef.current!.onload = async () => {
                    const color = await colorThief.getColor(imageRef.current, 1);
                    resolve(rgbToHex(color[0], color[1], color[2]));
                }
            });
        }
    }

    useEffect(() => {
        getDominantColor().then(setColor);
    }, [currentStatus]);

    const createBuff = () => {
        if (!currentStatus || !currentStatus.icon || duration === null || applicationDelay === null) {
            return;
        }

        const buff: Status = {
            id: currentStatus.id,
            name: currentStatus.name ?? 'Unknown',
            imageSrc: currentStatus.icon.toString(),
            color: color ?? '#000000',
            duration: duration ?? 0,
            applicationDelay: applicationDelay ?? 0,
        };

        console.log(color);
        setStatus(buff);
    }

    useEffect(createBuff, [currentStatus, duration, applicationDelay, setStatus, color]);

    if (!currentStatus) {
        return (
            <RotationBuilderContainer>
                <SearchContainer>
                    <SearchInput
                        job={job}
                        onSelect={setCurrentStatus}
                        search={searchForStatus}
                        placeholder="Search for a status..."
                    />
                </SearchContainer>
            </RotationBuilderContainer>
        );
    }

    return (
        <RotationBuilderContainer>
            <ActionDisplayAndSettings>
                <ActionDisplayAndSettingsColumn>
                    {currentStatus.icon &&
                        <StatusIcon
                            ref={imageRef}
                            status={currentStatus}
                            width={60}
                        />
                    }
                    <ActionInfo>
                        <div>{currentStatus.name ?? 'Unknown'}</div>
                        <div>{currentStatus.id}</div>
                    </ActionInfo>
                </ActionDisplayAndSettingsColumn>
                <ActionDisplayAndSettingsColumn>
                    <span>Duration (s)</span>
                    <InputNumber
                        min={0}
                        max={60}
                        step={1}
                        defaultValue={0}
                        value={duration}
                        onChange={setDuration}
                    />
                    <span>Application delay (s)</span>
                    <InputNumber
                        min={0}
                        max={5}
                        step={0.1}
                        defaultValue={0}
                        value={applicationDelay}
                        onChange={setApplicationDelay}
                    />
                </ActionDisplayAndSettingsColumn>
            </ActionDisplayAndSettings>
        </RotationBuilderContainer>
    );
}
