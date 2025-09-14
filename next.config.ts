import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Configurações para produção no Vercel
  eslint: {
    ignoreDuringBuilds: false, // Habilitar linting para melhor qualidade
  },
  typescript: {
    ignoreBuildErrors: false, // Habilitar verificação de tipos
  },
  
  // Configurações experimentais otimizadas para Vercel
  experimental: {
    optimizeCss: true, // Habilitar otimização de CSS
    serverComponentsExternalPackages: ['whatsapp-web.js'], // Externalizar pacotes pesados
  },
  
  // Configuração de imagens otimizada
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'nxamrvfusyrtkcshehfm.supabase.co',
        port: '',
        pathname: '/storage/v1/object/public/**',
      },
      {
        protocol: 'https',
        hostname: '*.vercel.app',
        port: '',
        pathname: '/**',
      },
    ],
    formats: ['image/webp', 'image/avif'],
    minimumCacheTTL: 60,
  },

  // Configurações básicas otimizadas
  poweredByHeader: false,
  reactStrictMode: true, // Habilitar modo estrito para melhor performance
  trailingSlash: false,
  compress: true, // Habilitar compressão
  
  // Configurações de output para Vercel
  output: 'standalone', // Habilitar standalone para melhor performance
  
  // Configurações de webpack otimizadas
  webpack: (config: any, { isServer, dev }: any) => {
    // Otimizações para produção
    if (!isServer && !dev) {
      config.optimization = {
        ...config.optimization,
        minimize: true,
        splitChunks: {
          chunks: 'all',
          cacheGroups: {
            vendor: {
              test: /[\\/]node_modules[\\/]/,
              name: 'vendors',
              chunks: 'all',
            },
          },
        },
      };
    }
    
    // Externalizar pacotes pesados
    config.externals = config.externals || [];
    if (isServer) {
      config.externals.push('whatsapp-web.js');
    }
    
    return config;
  },
  
  // Configurações de headers para segurança
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
            value: 'origin-when-cross-origin',
          },
        ],
      },
    ];
  },
};

export default nextConfig;