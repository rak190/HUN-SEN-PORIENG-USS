import type { NextConfig } from "next";
import withPWAInit from "@ducanh2912/next-pwa";

const withPWA = withPWAInit({
  dest: "public",
  cacheOnFrontEndNav: false,
  aggressiveFrontEndNavCaching: false,
  reloadOnOnline: true,
  disable: process.env.NODE_ENV === "development",
  workboxOptions: {
    disableDevLogs: true,
    runtimeCaching: [
      {
        urlPattern: /^https:\/\/fonts\.(?:gstatic|googleapis)\.com\/.*/i,
        handler: "CacheFirst",
        options: {
          cacheName: "google-fonts",
          expiration: {
            maxEntries: 4,
            maxAgeSeconds: 31536000,
          },
        },
      },
      {
        urlPattern: /\.(?:eot|otf|ttc|ttf|woff|woff2|font.css)$/i,
        handler: "StaleWhileRevalidate",
        options: {
          cacheName: "static-font-assets",
          expiration: {
            maxEntries: 8,
            maxAgeSeconds: 604800,
          },
        },
      },
      {
        // Only cache public application UI assets; explicitly exclude storage buckets, private student docs and photos
        urlPattern: /^\/(?:icons|images|_next\/static)\/.*\.(?:jpg|jpeg|gif|png|svg|ico|webp)$/i,
        handler: "StaleWhileRevalidate",
        options: {
          cacheName: "static-image-assets",
          expiration: {
            maxEntries: 64,
            maxAgeSeconds: 2592000,
          },
        },
      },
      {
        urlPattern: /\/_next\/static.+\.js$/i,
        handler: "CacheFirst",
        options: {
          cacheName: "next-static-js-assets",
          expiration: {
            maxEntries: 64,
            maxAgeSeconds: 86400,
          },
        },
      },
      {
        urlPattern: /\.(?:css)$/i,
        handler: "StaleWhileRevalidate",
        options: {
          cacheName: "static-style-assets",
          expiration: {
            maxEntries: 32,
            maxAgeSeconds: 86400,
          },
        },
      },
    ],
  },
});

const nextConfig: NextConfig = {
  experimental: {
    agentUpgrade: 'latest',
    optimizePackageImports: ['lucide-react'],
  },
  async rewrites() {
    // Only enable mock proxy in local development if explicitly opted-in
    if (process.env.NODE_ENV === 'development' && process.env.ENABLE_LOCAL_POSTGREST_PROXY === 'true') {
      return [
        {
          source: '/rest/v1/:path*',
          destination: 'http://127.0.0.1:3001/:path*',
        },
      ];
    }
    return [];
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=31536000; includeSubDomains; preload',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          }
        ],
      },
    ];
  },
};

const isDev = process.env.NODE_ENV === "development";

export default isDev ? nextConfig : withPWA(nextConfig);
