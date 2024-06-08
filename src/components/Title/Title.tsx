import styled from 'styled-components';
import { default as NextImage } from 'next/image';

const TitleContainer = styled.div`
    display: flex;
    flex-direction: row;
    align-items: center;
    background-color: #121317;
    width: 100%;
    border-top: 1px solid white;
    border-bottom: 1px solid white;
    height: 70px;
    padding: 0 1rem;
    gap: 8px;
`;

const TitleTextContainer = styled.div`
    display: flex;
    flex-direction: column;
    height: 100%;
    padding-top: 0.75rem;
    padding-bottom: 0.5rem;
`;

const TitleWrapper = styled.div`
    display: flex;
    flex-direction: row;
    align-items: center;
`;

const TitleText = styled.h1`
    margin: 0;
    color: white;
    align-content: center;
    text-align: center;
    font-size: 2.1em;
    line-height: 0.9;
    letter-spacing: 0.7px;
`;

const SubTitleText = styled.h2`
    color: #c8cbce;
    text-align: center;
    font-size: 14px;
    letter-spacing: 0.1px;
`;

const DiscordAuthContainer = styled.div`
    display: flex;
    flex-direction: row;
    align-items: center;
    margin-left: 2rem;
`;

const BalanceLink = styled.a`
    display: flex;
    flex-direction: row;
    align-items: center;
    gap: 8px;
    color: white;
    font-size: 1.25em;
    margin-left: auto;
`;

interface TitleProps {
    discordAuth: JSX.Element
}

export const Title = ({ discordAuth }: TitleProps) => {
    return (
        <TitleContainer>
            <NextImage
                src="/leaf-icon.svg"
                alt="Logo"
                width={40}
                height={40}
                priority={true}
            />
            <TitleTextContainer>
                <TitleWrapper>
                    <TitleText>
                        Mint Leaf
                    </TitleText>
                </TitleWrapper>
                <SubTitleText>
                    FFXIV Rotation Builder
                </SubTitleText>
            </TitleTextContainer>
            <DiscordAuthContainer>
                {discordAuth}
            </DiscordAuthContainer>
            <BalanceLink href="https://discord.gg/thebalanceffxiv" target="_blank" rel="noreferrer">
                <NextImage
                    src="/Balance_Logo-02.png"
                    alt="The Balance Discord"
                    width={36}
                    height={36}
                    priority={true}
                />
                The Balance FFXIV
            </BalanceLink>
        </TitleContainer>
    );
}
