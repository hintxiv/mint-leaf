import { DiscordAuth } from '@/components/Discord/DiscordAuth'
import { Home } from '@/components/Home'
import { Providers } from '@/components/Providers'
import { SessionProvider } from 'next-auth/react'

export default function Index() {
    const discordAuth = <DiscordAuth />

    return (
        <SessionProvider>
            <Providers>
                <Home discordAuth={discordAuth} />
            </Providers>
        </SessionProvider>
    )
}
