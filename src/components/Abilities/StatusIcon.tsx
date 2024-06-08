import React, { forwardRef } from 'react';
import styled from 'styled-components';
import { default as NextImage } from 'next/image';
import { DataStatus } from '@/app/api/xivapi/types';

const AbilityContainer = styled.div<{ $width: number }>`
    display: flex;
    justify-content: center;
`;

const IconImage = styled(NextImage)`
`;

interface StatusIconProps {
    status: DataStatus;
    width: number;
}

export const StatusIcon = forwardRef<HTMLImageElement, StatusIconProps>(
    ({ status, width }, ref) => {
        return (
            <AbilityContainer $width={width}>
                <IconImage
                    ref={ref}
                    src={status.icon?.toString() ?? ''}
                    alt={status.name ?? ''}
                    height={width}
                    width={width}
                />
            </AbilityContainer>
        );
    }
);

StatusIcon.displayName = 'StatusIcon';
