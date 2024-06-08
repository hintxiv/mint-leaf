import { Button } from 'antd'
import { useSession } from 'next-auth/react'
import styled from 'styled-components'

const FooterContainer = styled.div`
    display: flex;
    flex-direction: row;
    align-items: center;
    justify-content: center;
    background-color: #121317;
    color: white;
    width: 100%;
    border-top: 1px solid white;
    border-bottom: 1px solid white;
    height: 50px;
    gap: 1rem;
    flex-shrink: 0;
    > * {
        font-size: 16px;
        line-height: 20px;
    }
`;

interface FooterProps {
    onExport: () => void;
    useBalanceLogo: boolean;
    setUseBalanceLogo: (useBalanceLogo: boolean) => void;
}

export const Footer = ({ onExport, useBalanceLogo, setUseBalanceLogo }: FooterProps) => {
    const { data: session } = useSession()

    return (
        <FooterContainer>
            <Button type="primary" onClick={onExport}>
                Export to PNG
            </Button>
            {session &&
                <Button type="primary" onClick={() => setUseBalanceLogo(!useBalanceLogo)}>
                    {useBalanceLogo ? 'Remove Balance Stamp' : 'Add Balance Stamp'}
                </Button>
            }
        </FooterContainer>
    );
}
