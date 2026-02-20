"use client";

import { useEffect, useRef } from "react";
import axios from "axios";

// 6 Hours in milliseconds
const IDLE_TIMEOUT = 6 * 60 * 60 * 1000;

// Flag to prevent multiple redirects
let isRedirecting = false;

function performLogout() {
    if (typeof window !== 'undefined' && !isRedirecting) {
        isRedirecting = true;
        localStorage.removeItem('token');
        localStorage.removeItem('lastActive');
        window.location.href = '/';
    }
}

export default function SessionManager() {
    const timeoutRef = useRef<NodeJS.Timeout>(null);
    const lastActiveRef = useRef<number>(Date.now());

    useEffect(() => {
        // === GLOBAL AXIOS 401 INTERCEPTOR ===
        // This catches 401 from ALL axios calls (raw axios + api instance)
        const interceptorId = axios.interceptors.response.use(
            (response) => response,
            (error) => {
                if (error.response && error.response.status === 401) {
                    const token = localStorage.getItem('token');
                    // Only redirect if user WAS logged in (token expired)
                    if (token) {
                        performLogout();
                    }
                }
                return Promise.reject(error);
            }
        );

        // === IDLE TIMEOUT LOGIC ===
        const token = localStorage.getItem('token');
        if (!token) {
            // Not logged in, only keep the 401 interceptor active
            return () => {
                axios.interceptors.response.eject(interceptorId);
            };
        }

        // Check if session expired while away
        const storedLastActive = localStorage.getItem('lastActive');
        if (storedLastActive) {
            const timeSinceLastActive = Date.now() - parseInt(storedLastActive);
            if (timeSinceLastActive > IDLE_TIMEOUT) {
                performLogout();
                return () => {
                    axios.interceptors.response.eject(interceptorId);
                };
            }
        }

        // Events to listen for activity
        const events = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'];

        const resetTimer = () => {
            lastActiveRef.current = Date.now();
            localStorage.setItem('lastActive', Date.now().toString());

            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }

            timeoutRef.current = setTimeout(performLogout, IDLE_TIMEOUT);
        };

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
            const currentToken = localStorage.getItem('token');
            if (!currentToken) return;

            const stored = localStorage.getItem('lastActive');
            if (stored) {
                const timeSince = Date.now() - parseInt(stored);
                if (timeSince > IDLE_TIMEOUT) {
                    performLogout();
                }
            }
        }, 60000);

        return () => {
            axios.interceptors.response.eject(interceptorId);
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
            clearInterval(checkInterval);
            events.forEach(event => {
                window.removeEventListener(event, handleActivity);
            });
        };
    }, []);

    return null;
}
