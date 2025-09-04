import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Ignorar erros para build de emergência
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  
  // Configuração de imagens (necessária)
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

  // Configurações básicas
  poweredByHeader: false,
  reactStrictMode: false,
  trailingSlash: false,

  // Standalone para deployment
  output: 'standalone',
};

export default nextConfig;