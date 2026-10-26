import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Browser fixtures must not replace the developer's live dev bundle or types.
  ...(process.env.XENON_BROWSER_TEST === "1" ? {
    distDir: ".next/browser-tests",
    typescript: { tsconfigPath: ".impeccable/build/browser-tsconfig.json" },
  } : {}),
  images: {
    ...(process.env.XENON_BROWSER_TEST === "1" ? { unoptimized: true } : {}),
    qualities: [75, 80],
    remotePatterns: [
      // Supabase storage (covers all project URLs)
      {
        protocol: "https",
        hostname: "*.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
      // Common CDN patterns for product images
      {
        protocol: "https",
        hostname: "*.supabase.com",
        pathname: "/storage/v1/object/public/**",
      },
      // Editorial development placeholders.
      {
        protocol: "https",
        hostname: "images.unsplash.com",
        pathname: "/**",
      },
    ],
  },
  // Increase Server Action body size limit for banner/product image uploads
  // Default is 1MB, we increase to 10MB to handle high-res images
  experimental: {
    serverActions: {
      bodySizeLimit: "10mb",
    },
  },
};

export default nextConfig;
