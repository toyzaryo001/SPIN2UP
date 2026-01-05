import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import axios from "axios";

export const handler = NextAuth({
    providers: [
        CredentialsProvider({
            name: "Credentials",
            credentials: {
                username: { label: "Username", type: "text" },
                password: { label: "Password", type: "password" }
            },
            async authorize(credentials) {
                if (!credentials?.username || !credentials?.password) return null;

                try {
                    // Use admin login endpoint (separate from player)
                    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api";
                    const res = await axios.post(`${apiUrl}/auth/admin/login`, {
                        username: credentials.username,
                        password: credentials.password,
                    });

                    if (res.data.success) {
                        const user = res.data.data.user;
                        const token = res.data.data.token;
                        return {
                            id: user.id.toString(),
                            name: user.fullName,
                            email: null,
                            username: user.username,
                            role: user.role,
                            isSuperAdmin: user.isSuperAdmin,
                            permissions: user.permissions,
                            accessToken: token,
                        };
                    }
                    return null;
                } catch (error) {
                    console.error("Admin login failed:", error);
                    return null;
                }
            }
        })
    ],
    callbacks: {
        async jwt({ token, user }) {
            if (user) {
                token.id = user.id;
                token.role = (user as any).role;
                token.isSuperAdmin = (user as any).isSuperAdmin;
                token.permissions = (user as any).permissions;
                token.accessToken = (user as any).accessToken;
                token.username = (user as any).username;
            }
            return token;
        },
        async session({ session, token }) {
            if (token) {
                session.user = {
                    ...session.user,
                    // @ts-ignore
                    id: token.id,
                    role: token.role,
                    isSuperAdmin: token.isSuperAdmin,
                    permissions: token.permissions,
                    username: token.username,
                    accessToken: token.accessToken,
                } as any;
            }
            return session;
        }
    },
    pages: {
        signIn: '/login',
    },
    session: {
        strategy: "jwt",
    },
});

export { handler as GET, handler as POST };
