/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  turbopack: {},
  onDemandEntries: {
    maxInactiveAge: 5000,
    pagesBufferLength: 1,
  },

  // ── Proxy rewrites to avoid CORS issues with Intellizence APIs ─────────────
  //
  //  /proxy/account/*  →  https://account-api.intellizence.com/*
  //    Handles: auth, subscriptions, and company news (Trial)
  //
  //  /proxy/news/*     →  https://api.intellizence.com/*        [Paid Plan]
  //    Handles: paid company news API (commented out in lib/api.ts)
  //
  async rewrites() {
    return [
      {
        source: '/proxy/account/:path*',
        destination: 'https://account-api.intellizence.com/:path*',
      },
      // Kept for when paid plan is activated (see lib/api.ts fetchPaidCompanyNews)
      {
        source: '/proxy/news/:path*',
        destination: 'https://api.intellizence.com/:path*',
      },
    ];
  },
};

export default nextConfig;
