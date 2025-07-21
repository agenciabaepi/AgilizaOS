import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
<<<<<<< HEAD
    domains: ['nxamrvfusyrtkcshehfm.supabase.co'],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'nxamrvfusyrtkcshehfm.supabase.co',
        port: '',
        pathname: '/storage/v1/object/public/**',
      },
=======
    domains: [
      'nxamrvfusyrtkcshehfm.supabase.co',
      // adicione outros domínios necessários aqui
>>>>>>> 611510e19cb3e4a0dc2513bb3ba1415e491ada3b
    ],
  },
};

export default nextConfig;
