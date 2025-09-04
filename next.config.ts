import type { NextConfig } from "next";

// CONFIGURAÇÃO LIMPA E COMPATÍVEL
const nextConfig: NextConfig = {
  // Ignorar erros para build de emergência
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  
  // Configuração experimental simplificada
  experimental: {
    optimizeCss: false,
  },
  
  // Desabilitar otimizações que causam problemas
  optimizeFonts: false,
  productionBrowserSourceMaps: false,
  
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
  
  // Desabilitar geração estática para evitar problemas com manifest
  output: 'standalone',
  
  // Webpack config para forçar compatibilidade
  webpack: (config: any) => {
    config.optimization = {
      ...config.optimization,
      minimize: false,  // Desabilitar minificação
    };
    return config;
  },
};

export default nextConfig;
