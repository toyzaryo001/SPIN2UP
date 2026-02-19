'use client';

import { ReactNode } from 'react';
import PopupAnnouncement from './PopupAnnouncement';
import SessionManager from './SessionManager';

interface ClientLayoutProps {
    children: ReactNode;
}

export default function ClientLayout({ children }: ClientLayoutProps) {
    return (
        <>
            <SessionManager />
            {children}
            <PopupAnnouncement />
        </>
    );
}
