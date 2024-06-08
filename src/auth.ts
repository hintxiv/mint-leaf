import NextAuth from "next-auth"
import Discord from "next-auth/providers/discord"

export const { handlers, signIn, signOut, auth } = NextAuth({
    providers: [
        Discord({
            clientId: process.env.DISCORD_CLIENT_ID,
            clientSecret: process.env.DISCORD_CLIENT_SECRET,
            authorization: "https://discord.com/api/oauth2/authorize?scope=identify",
        })
    ],
    callbacks: {
        signIn: async ({ profile }) => {
            const whitelistedUsers = JSON.parse(process.env.DISCORD_WHITELISTED_USERS ?? '[]')

            return profile && whitelistedUsers.includes(profile.id)
        },
    }
})
