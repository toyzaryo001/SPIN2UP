import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'ardmhzelxcmj.ocrazeckyunc.com',
      },
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
      }
    ],
  },

  // Security & Compatibility Headers — รองรับทุก browser, ทุก ISP, ทุกเครือข่าย
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          // อนุญาตทุก origin เข้าถึง API
          { key: 'Access-Control-Allow-Origin', value: '*' },
          { key: 'Access-Control-Allow-Methods', value: 'GET, POST, PUT, DELETE, OPTIONS' },
          { key: 'Access-Control-Allow-Headers', value: 'Content-Type, Authorization' },

          // ป้องกัน Mixed Content — บังคับ HTTPS
          { key: 'Content-Security-Policy', value: "upgrade-insecure-requests" },

          // DNS prefetch — เร่งการเชื่อมต่อ API
          { key: 'X-DNS-Prefetch-Control', value: 'on' },

          // ปิด X-Frame-Options เพื่อความเข้ากันได้กับ WebView บน iOS/Android
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },

          // รองรับ iOS Safari — ไม่บล็อก referrer
          { key: 'Referrer-Policy', value: 'no-referrer-when-downgrade' },

          // Cache control — ป้องกัน ISP cache หน้าเก่า
          { key: 'Cache-Control', value: 'no-cache, no-store, must-revalidate' },
          { key: 'Pragma', value: 'no-cache' },

          // Permissions Policy — อนุญาต features ที่จำเป็นสำหรับ mobile
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
        ],
      },
    ];
  },
};

export default nextConfig;
