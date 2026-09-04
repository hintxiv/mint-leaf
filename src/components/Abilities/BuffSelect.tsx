import { DataStatus } from '@/app/api/xivapi/types'
import React, { useCallback, useEffect, useState } from 'react';
import { Status } from '../Canvas/types'
import { Job } from '@/data/jobs'
import { searchForStatus } from '@/app/api'
import styled from 'styled-components'
import SearchInput from './SearchInput'
import { BuffBuilder } from './BuffBuilder'
import { CustomBuffInput } from './CustomBuffInput'
import { useTranslation } from '@/context/LanguageContext'

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
    preloadedStatus?: Status | undefined
}

export const BuffSelect: React.FC<BuffSelectProps> = ({ job, setStatus, preloadedStatus }) => {
    const { t, locale } = useTranslation()
    const [currentStatus, setCurrentStatus] = useState<DataStatus | null>(null);
    const [applicationDelay, setApplicationDelay] = useState<number | null>(0);
    const [duration, setDuration] = useState<number | null>(20);
    const [color, setColor] = useState<string>();
    
    // Effect to populate fields from preloaded status
    useEffect(() => {
        if (preloadedStatus && !currentStatus) {
            // Create a DataStatus from the preloaded Status
            const dataStatus: DataStatus = {
                id: preloadedStatus.id,
                name: preloadedStatus.name,
                icon: new URL(preloadedStatus.imageSrc),
            };
            setCurrentStatus(dataStatus);
            setDuration(preloadedStatus.duration);
            setApplicationDelay(preloadedStatus.applicationDelay);
            setColor(preloadedStatus.color);
        }
    }, [preloadedStatus, currentStatus]);
    
    const onCreate = useCallback(() => {
        if (!currentStatus || !currentStatus.icon || duration === null || applicationDelay === null) {
            return;
        }

        const buff: Status = {
            id: currentStatus.id,
            name: currentStatus.name ?? t('buffBuilder.unknown'),
            imageSrc: currentStatus.icon.toString(),
            color: color ?? '#000000',
            duration: duration ?? 0,
            applicationDelay: applicationDelay ?? 0,
        };

        setStatus(buff);
    }, [applicationDelay, color, currentStatus, duration, setStatus, t]);

    if (!currentStatus) {
        return (
            <RotationBuilderContainer>
                <SearchContainer>
                    <SearchInput
                        job={job}
                        onSelect={setCurrentStatus}
                        search={searchForStatus}
                        placeholder={t('abilities.searchStatus')}
                        language={locale}
                    />
                </SearchContainer>
                <div>{t('abilities.orDivider')}</div>
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
