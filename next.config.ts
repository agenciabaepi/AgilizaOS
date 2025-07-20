import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    domains: [
      'nxamrvfusyrtkcshehfm.supabase.co',
      // adicione outros domínios necessários aqui
    ],
  },
};

export default nextConfig;
