import styled from 'styled-components'
import { default as NextImage } from 'next/image'
import { DataAction } from '@/app/api'

const AbilityContainer = styled.div<{ $width: number }>`
    position: relative;
    height: 100%;
    width: 100%;
    flex-basis: ${({ $width }) => $width}px;
    margin-left: auto;
    margin-right: auto;
`;

const IconImage = styled(NextImage)`
    position: absolute;
    top: 0;
    left: calc(50% - 0.5 * ${({ width }) => width}px);
`;

// Just fuck my shit up man
const FrameImage = styled(NextImage)<{ width: number }>`
    position: absolute;
    top: ${({ width }) => -0.05 * width}px;;
    left: calc(50% - 0.5 * ${({ width }) => width + 0.07 * width}px);
    width: ${({ width }) => 1.14 * width}px;
    height: ${({ width }) => 1.14 * width}px;
    max-width: unset;
    max-height: unset;
`;

interface AbilityIconProps {
    action: DataAction;
    width: number;
}

export const AbilityIcon = ({ action, width }: AbilityIconProps) => {
    return (
        <AbilityContainer $width={width}>
            <IconImage
                src={action.icon?.toString() ?? ''}
                alt={action.name ?? ''}
                height={width}
                width={width}
            />
            <FrameImage
                src={'/icon_frame.png'}
                alt={'icon frame'}
                height={width}
                width={width}
            />
        </AbilityContainer>
    );
}
