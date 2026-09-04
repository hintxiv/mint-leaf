"use client"

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { en, Messages } from '@/messages/en'
import { ja } from '@/messages/ja'

export type Locale = 'en' | 'ja'

const STORAGE_KEY = 'mint-leaf-locale'

const messagesByLocale: Record<Locale, Messages> = {
    en,
    ja,
}

// Prefer navigator.languages; treat ja / ja-* as Japanese, everything else as English.
// Used only when the user has not stored an explicit locale in localStorage.
const detectLocaleFromBrowser = (): Locale => {
    const candidates =
        typeof navigator !== 'undefined'
            ? [...(navigator.languages ?? []), navigator.language]
            : []

    for (const candidate of candidates) {
        if (!candidate) {
            continue
        }
        const primary = candidate.toLowerCase().split('-')[0]
        if (primary === 'ja') {
            return 'ja'
        }
    }

    return 'en'
}

// Build dotted keys from the messages object, e.g. "footer.export".
type NestedKeyOf<T, Prefix extends string = ''> = T extends object
    ? {
        [K in keyof T & string]: T[K] extends object
            ? NestedKeyOf<T[K], `${Prefix}${K}.`>
            : `${Prefix}${K}`
    }[keyof T & string]
    : never

export type TranslationKey = NestedKeyOf<Messages>

interface LanguageContextValue {
    locale: Locale
    // False until localStorage / browser detection has run (client-only).
    localeReady: boolean
    setLocale: (locale: Locale) => void
    t: (key: TranslationKey) => string
    messages: Messages
}

const LanguageContext = createContext<LanguageContextValue | null>(null)

// Resolve "a.b.c" against the nested messages object; unknown keys fall back to the path itself.
const getNestedValue = (obj: Messages, path: string): string => {
    const value = path.split('.').reduce<unknown>((current, key) => {
        if (current && typeof current === 'object' && key in current) {
            return (current as Record<string, unknown>)[key]
        }
        return undefined
    }, obj)

    return typeof value === 'string' ? value : path
}

export const LanguageProvider = ({ children }: { children: React.ReactNode }) => {
    // Default to English for SSR / first paint so upstream stays English-first.
    // The mount effect below may replace this with a stored or browser locale.
    const [locale, setLocaleState] = useState<Locale>('en')
    const [localeReady, setLocaleReady] = useState(false)

    // Hydrate locale on the client only (localStorage is unavailable during SSR).
    useEffect(() => {
        const stored = localStorage.getItem(STORAGE_KEY)
        if (stored === 'en' || stored === 'ja') {
            setLocaleState(stored)
        } else {
            setLocaleState(detectLocaleFromBrowser())
        }
        setLocaleReady(true)
    }, [])

    // Keep <html lang> and the document title in sync with the active locale.
    useEffect(() => {
        document.documentElement.lang = locale
        document.title = messagesByLocale[locale].meta.title
    }, [locale])

    const setLocale = useCallback((nextLocale: Locale) => {
        setLocaleState(nextLocale)
        localStorage.setItem(STORAGE_KEY, nextLocale)
    }, [])

    const messages = messagesByLocale[locale]

    const t = useCallback((key: TranslationKey) => getNestedValue(messages, key), [messages])

    const value = useMemo(
        () => ({ locale, localeReady, setLocale, t, messages }),
        [locale, localeReady, setLocale, t, messages],
    )

    return (
        <LanguageContext.Provider value={value}>
            {children}
        </LanguageContext.Provider>
    )
}

export const useLanguage = () => {
    const context = useContext(LanguageContext)
    if (!context) {
        throw new Error('useLanguage must be used within LanguageProvider')
    }
    return context
}

// Convenience hook for components that only need translation helpers.
export const useTranslation = () => {
    const { t, locale, localeReady, messages } = useLanguage()
    return { t, locale, localeReady, messages }
}
