"use client"

import { LanguageProvider, useLanguage } from '@/context/LanguageContext'
import { ConfigProvider } from 'antd'
import enUS from 'antd/locale/en_US'
import jaJP from 'antd/locale/ja_JP'

const AntdLocaleProvider = ({ children }: { children: React.ReactNode }) => {
    const { locale } = useLanguage()

    return (
        <ConfigProvider
            locale={locale === 'ja' ? jaJP : enUS}
            theme={{
                token: {
                    colorPrimary: '#aaf0d1',
                },
            }}
        >
            {children}
        </ConfigProvider>
    )
}

export const Providers = ({ children }: { children: React.ReactNode }) => {
    return (
        <LanguageProvider>
            <AntdLocaleProvider>
                {children}
            </AntdLocaleProvider>
        </LanguageProvider>
    )
}
