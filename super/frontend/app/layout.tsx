import type { Metadata } from "next";
import "./globals.css";

import { Toaster } from "react-hot-toast";

export const metadata: Metadata = {
    title: "PREFIX MASTER - จัดการระบบ Prefix",
    description: "ระบบจัดการ Prefix สำหรับ Super Admin",
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="th">
            <body>
                <Toaster position="top-right" />
                {children}
            </body>
        </html>
    );
}
