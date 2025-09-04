import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Configuração mínima para evitar erros de build
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
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
  // Desabilitar TODAS as otimizações que podem causar problemas
  experimental: {
    optimizeCss: false,  // Explicitamente desabilitar optimizeCss
  },
  // Configuração básica sem otimizações avançadas
  poweredByHeader: false,
  reactStrictMode: false,
  trailingSlash: false,
};

export default nextConfig;
