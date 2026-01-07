import type { Metadata } from "next";
import "./globals.css";

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
            <body>{children}</body>
        </html>
    );
}
