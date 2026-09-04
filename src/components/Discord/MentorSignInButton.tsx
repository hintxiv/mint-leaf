"use client"

import { useTranslation } from '@/context/LanguageContext'

export const MentorSignInButton = () => {
    const { t } = useTranslation()

    return (
        <button type="submit">
            {t('discord.mentorSignIn')}
        </button>
    )
}
