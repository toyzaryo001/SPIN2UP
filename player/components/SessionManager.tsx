"use client";

import { useEffect, useRef } from "react";

// 6 Hours in milliseconds
const IDLE_TIMEOUT = 6 * 60 * 60 * 1000;

export default function SessionManager() {
    const timeoutRef = useRef<NodeJS.Timeout>(null);
    const lastActiveRef = useRef<number>(Date.now());

    const logout = () => {
        if (typeof window !== 'undefined') {
            // Clear ALL session data to prevent loop
            localStorage.removeItem('token');
            localStorage.removeItem('lastActive');

            // Only redirect if not already on homepage
            if (window.location.pathname !== '/') {
                window.location.href = '/';
            }
        }
    };

    const resetTimer = () => {
        lastActiveRef.current = Date.now();
        localStorage.setItem('lastActive', Date.now().toString());

        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
        }

        timeoutRef.current = setTimeout(logout, IDLE_TIMEOUT);
    };

    useEffect(() => {
        // Only activate if user is logged in
        const token = localStorage.getItem('token');
        if (!token) return; // Not logged in, do nothing

        // Check if session expired while away
        const storedLastActive = localStorage.getItem('lastActive');
        if (storedLastActive) {
            const timeSinceLastActive = Date.now() - parseInt(storedLastActive);
            if (timeSinceLastActive > IDLE_TIMEOUT) {
                logout();
                return;
            }
        }

        // Events to listen for activity
        const events = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'];

        const handleActivity = () => {
            // Throttling: Only reset if more than 1 minute has passed
            if (Date.now() - lastActiveRef.current > 60000) {
                resetTimer();
            }
        };

        // Attach listeners
        events.forEach(event => {
            window.addEventListener(event, handleActivity);
        });

        // Set initial timer
        resetTimer();

        // Interval to check localStorage (for multi-tab sync)
        const checkInterval = setInterval(() => {
            // Re-check token in case it was removed by another tab
            const currentToken = localStorage.getItem('token');
            if (!currentToken) return; // Already logged out

            const stored = localStorage.getItem('lastActive');
            if (stored) {
                const timeSince = Date.now() - parseInt(stored);
                if (timeSince > IDLE_TIMEOUT) {
                    logout();
                }
            }
        }, 60000); // Check every minute

        return () => {
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
            clearInterval(checkInterval);
            events.forEach(event => {
                window.removeEventListener(event, handleActivity);
            });
        };
    }, []);

    return null; // Render nothing
}
