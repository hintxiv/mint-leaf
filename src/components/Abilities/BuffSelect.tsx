import { DataStatus } from '@/app/api/xivapi/types'
import React, { useCallback, useState } from 'react';
import { Status } from '../Canvas/types'
import { Job } from '@/data/jobs'
import { searchForStatus } from '@/app/api'
import styled from 'styled-components'
import SearchInput from './SearchInput'
import { BuffBuilder } from './BuffBuilder'
import { CustomBuffInput } from './CustomBuffInput'

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

interface BuffSelectProps {
    job: Job
    setStatus: (status: Status) => void
}

export const BuffSelect: React.FC<BuffSelectProps> = ({ job, setStatus }) => {
    const [currentStatus, setCurrentStatus] = useState<DataStatus | null>(null);
    const [applicationDelay, setApplicationDelay] = useState<number | null>(0);
    const [duration, setDuration] = useState<number | null>(20);
    const [color, setColor] = useState<string>();
    
    const onCreate = useCallback(() => {
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

        setStatus(buff);
    }, [applicationDelay, color, currentStatus, duration, setStatus]);

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
                <div>- or -</div>
                <CustomBuffInput onCreate={setCurrentStatus} />
            </RotationBuilderContainer>
        );
    }

    return (
        <BuffBuilder
            status={currentStatus}
            applicationDelay={applicationDelay}
            setApplicationDelay={setApplicationDelay}
            duration={duration}
            setDuration={setDuration}
            color={color}
            setColor={setColor}
            onCreate={onCreate}
        />
    );
}
