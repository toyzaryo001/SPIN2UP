import type { Metadata } from "next";
import "./globals.css";

export const metadata = {
  title: "CHECK24M - เว็บพนันออนไลน์อันดับ 1",
  description: "เว็บพนันออนไลน์ที่ดีที่สุด",
};

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
        {children}
      </body>
    </html>
  );
}
