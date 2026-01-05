"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

interface User {
    id: number;
    username: string;
    phone: string;
    fullName: string;
    balance: number;
    bankName?: string;
    bankAccount?: string;
}

export function useAuth(requireAuth: boolean = true) {
    const router = useRouter();
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const checkUser = () => {
            const userData = localStorage.getItem("user");
            if (!userData || userData === "undefined") {
                if (requireAuth) {
                    router.push("/?action=login");
                }
                setLoading(false);
                return;
            }
            try {
                setUser(JSON.parse(userData));
            } catch (e) {
                localStorage.removeItem("user");
                if (requireAuth) {
                    router.push("/?action=login");
                }
            }
            setLoading(false);
        };

        checkUser();

        window.addEventListener('storage', checkUser);
        window.addEventListener('user-login', checkUser);
        window.addEventListener('user-logout', checkUser);

        return () => {
            window.removeEventListener('storage', checkUser);
            window.removeEventListener('user-login', checkUser);
            window.removeEventListener('user-logout', checkUser);
        };
    }, [router, requireAuth]);

    return { user, loading, isAuthenticated: !!user };
}
