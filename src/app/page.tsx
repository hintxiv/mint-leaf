import { DiscordAuth } from '@/components/Discord/DiscordAuth'
import { Home } from '@/components/Home'
import { SessionProvider } from 'next-auth/react'

export default function Index() {
    const discordAuth = <DiscordAuth />

    return (
        <SessionProvider>
            <Home discordAuth={discordAuth} />
        </SessionProvider>
    )
}
