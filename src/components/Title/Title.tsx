import styled from 'styled-components';
import { default as NextImage } from 'next/image';
import { Dropdown } from 'antd'
import type { MenuProps } from 'antd'
import { Locale, useLanguage, useTranslation } from '@/context/LanguageContext'

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

const RightNav = styled.div`
    display: flex;
    flex-direction: row;
    align-items: center;
    gap: 1.5rem;
    margin-left: auto;
`;

const BalanceLink = styled.a`
    display: flex;
    flex-direction: row;
    align-items: center;
    gap: 8px;
    color: white;
    font-size: 1.25em;
`;

const LanguageDropdownTrigger = styled.button`
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 0;
    border: none;
    background: none;
    color: #c8cbce;
    font-size: 14px;
    line-height: 1;
    cursor: pointer;
    transition: color 0.15s ease;

    .current-locale {
        color: white;
        font-weight: 500;
    }

    .chevron {
        font-size: 10px;
        opacity: 0.7;
        transform: translateY(1px);
    }

    &:hover,
    &[aria-expanded="true"] {
        color: #aaf0d1;

        .current-locale {
            color: #aaf0d1;
        }
    }
`;

const localeLabel = (locale: Locale): string => (locale === 'en' ? 'EN' : 'JP')

interface TitleProps {
    discordAuth: JSX.Element
}

export const Title = ({ discordAuth }: TitleProps) => {
    const { t } = useTranslation()
    const { locale, setLocale } = useLanguage()

    const languageMenuItems: MenuProps['items'] = [
        { key: 'en', label: 'EN' },
        { key: 'ja', label: 'JP' },
    ]

    const onLanguageMenuClick: MenuProps['onClick'] = ({ key }) => {
        setLocale(key as Locale)
    }

    return (
        <TitleContainer>
            <NextImage
                src="/leaf-icon.svg"
                alt={t('title.logoAlt')}
                width={40}
                height={40}
                priority={true}
            />
            <TitleTextContainer>
                <TitleWrapper>
                    <TitleText>
                        {t('meta.title')}
                    </TitleText>
                </TitleWrapper>
                <SubTitleText>
                    {t('title.subtitle')}
                </SubTitleText>
            </TitleTextContainer>
            <DiscordAuthContainer>
                {discordAuth}
            </DiscordAuthContainer>
            <RightNav>
                <Dropdown
                    menu={{
                        items: languageMenuItems,
                        onClick: onLanguageMenuClick,
                        selectedKeys: [locale],
                    }}
                    trigger={['click']}
                    overlayClassName="language-dropdown-overlay"
                >
                    <LanguageDropdownTrigger type="button">
                        <span>{t('title.language')}</span>
                        <span className="current-locale">{localeLabel(locale)}</span>
                        <span className="chevron">▼</span>
                    </LanguageDropdownTrigger>
                </Dropdown>
                <BalanceLink href="https://discord.gg/thebalanceffxiv" target="_blank" rel="noreferrer">
                    <NextImage
                        src="/Balance_Logo-02.png"
                        alt={t('title.balanceLogoAlt')}
                        width={36}
                        height={36}
                        priority={true}
                    />
                    {t('title.balanceLink')}
                </BalanceLink>
            </RightNav>
        </TitleContainer>
    );
}
