'use client';

import { ReactNode } from 'react';
import PopupAnnouncement from './PopupAnnouncement';

interface ClientLayoutProps {
    children: ReactNode;
}

export default function ClientLayout({ children }: ClientLayoutProps) {
    return (
        <>
            {children}
            <PopupAnnouncement />
        </>
    );
}
