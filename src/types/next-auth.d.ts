import NextAuth, { DefaultSession } from "next-auth";

declare module "next-auth" {
  /**
   * Returned by `useSession`, `getSession` and received as a prop on the `SessionProvider` React Context
   */
  interface Session {
    access_token: string;
    token_type: string;
    user_id: string;
  }

  interface JWT {
    access_token: string;
    token_type: string;
    user_id: string;
  }
}
