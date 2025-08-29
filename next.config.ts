import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint: {
    ignoreDuringBuilds: true,  // ⚠️ Temporariamente ignorar ESLint para build
  },
  typescript: {
    ignoreBuildErrors: false,   // ✅ Mostrar erros do TypeScript
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'nxamrvfusyrtkcshehfm.supabase.co',
        port: '',
        pathname: '/storage/v1/object/public/**',
      },
    ],
  },

};

export default nextConfig;
