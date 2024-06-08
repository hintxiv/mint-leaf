import { Session } from 'next-auth'
import { default as NextImage } from 'next/image'

interface UserAvatarProps {
    session: Session
}

export const UserAvatar = async ({ session }: UserAvatarProps) => {
    if (!session || !session.user) return null

    return (
        <div style={{ display: 'flex', flexDirection: 'row', gap: '8px', alignItems: 'center' }}>
            <NextImage
                src={session.user.image ?? ''}
                alt={session.user.name ?? 'Discord Avatar'}
                height={32}
                width={32}
                style={{
                    borderRadius: '50%'
                }}
            />
            <span>{session.user.name}</span>
        </div>
    )
}
