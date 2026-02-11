import type { Metadata } from "next";
import "./globals.css";
import { ToastProvider } from "@/components/Toast";
import ClientLayout from "@/components/ClientLayout";

import { headers } from "next/headers";

export async function generateMetadata(): Promise<Metadata> {
  const headersList = await headers();
  const host = headersList.get('host') || '';
  const domain = host.split(':')[0]; // Remove port
  const API_URL = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001") + "/api";

  try {
    const res = await fetch(`${API_URL}/auth/config?domain=${domain}`, { next: { revalidate: 60 } });
    if (res.ok) {
      const json = await res.json();
      if (json.success && json.data) {
        return {
          title: `${json.data.name} - เว็บพนันออนไลน์อันดับ 1`,
          description: "เว็บพนันออนไลน์ที่ดีที่สุด",
          icons: json.data.logo ? { icon: json.data.logo } : undefined
        };
      }
    }
  } catch (error) {
    console.error("Metadata fetch error:", error);
  }

  return {
    title: "CASINO - เว็บพนันออนไลน์อันดับ 1",
    description: "เว็บพนันออนไลน์ที่ดีที่สุด",
  };
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="th">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link href="https://fonts.googleapis.com/css2?family=Kanit:wght@300;400;500;600;700&display=swap" rel="stylesheet" />
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
        <meta name="theme-color" content="#0f0f1a" />
      </head>
      <body className="antialiased">
        <ToastProvider>
          <ClientLayout>
            {children}
          </ClientLayout>
        </ToastProvider>
      </body>
    </html>
  );
}
