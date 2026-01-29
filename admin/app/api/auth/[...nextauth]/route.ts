import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import axios from "axios";

export const handler = NextAuth({
    providers: [
        CredentialsProvider({
            name: "Credentials",
            credentials: {
                username: { label: "Username", type: "text" },
                password: { label: "Password", type: "password" },
                prefix: { label: "Prefix", type: "text" }
            },
            async authorize(credentials) {
                if (!credentials?.username || !credentials?.password || !credentials?.prefix) return null;

                try {
                    // Use admin login endpoint (separate from player)
                    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api";
                    const res = await axios.post(`${apiUrl}/auth/admin/login`, {
                        username: credentials.username,
                        password: credentials.password,
                        prefix: credentials.prefix,
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
                            prefix: credentials.prefix,
                        };
                    }
                    throw new Error(res.data.message || 'ข้อมูลไม่ถูกต้อง');
                } catch (error: any) {
                    console.error("Admin login failed:", error?.response?.data || error.message);
                    const errorMessage = error?.response?.data?.message || error.message || 'เข้าสู่ระบบไม่สำเร็จ';
                    throw new Error(errorMessage);
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
                token.prefix = (user as any).prefix;
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
                    prefix: token.prefix,
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
