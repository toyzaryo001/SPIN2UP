import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import ToastProvider from "@/components/ToastProvider";

const inter = Inter({ subsets: ["latin"] });

import { headers } from "next/headers";

export async function generateMetadata(): Promise<Metadata> {
  const headersList = await headers();
  const host = headersList.get('host') || '';
  const domain = host.split(':')[0]; // Remove port
  const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api";

  try {
    const res = await fetch(`${API_URL}/auth/config?domain=${domain}`, { next: { revalidate: 60 } });
    const json = await res.json();
    if (json.success && json.data) {
      return {
        title: `${json.data.name} Admin`,
        description: "Casino Management System",
        icons: json.data.logo ? { icon: json.data.logo } : undefined
      };
    }
  } catch (error) {
    console.error("Metadata fetch error:", error);
  }

  return {
    title: "Casino Admin",
    description: "Casino Management System",
  };
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <Providers>
          <ToastProvider />
          {children}
        </Providers>
      </body>
    </html>
  );
}

