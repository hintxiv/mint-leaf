import { auth, signIn } from "@/auth"
import { UserAvatar } from './UserAvatar'

export const DiscordAuth = async () => {
    const session = await auth()
    const action = async () => {
        "use server"
        await signIn("discord")
    }

    if (session) {
        return <UserAvatar session={session} />
    }

    return (
        <form action={action} style={{ color: '#aaf0d1' }}>
            <button type="submit">mentor sign in</button>
        </form>
    )
}
