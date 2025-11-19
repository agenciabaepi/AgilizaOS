/** @type {import('next').NextConfig} */
const nextConfig = {
  // Otimizações para múltiplos usuários simultâneos
  experimental: {
    optimizeCss: false,
    optimizePackageImports: ['@supabase/supabase-js', 'react-icons/fi'],
    // ⚠️ 'experimental.turbo' foi removido no Next 15.
    // Se quiser usar Turbopack, não precisa declarar aqui.
  },

  // Configuração para pacotes ESM
  transpilePackages: ['@react-pdf/renderer', '@splinetool/react-spline', '@splinetool/runtime'],

  // Cache estratégico para melhor performance
  async headers() {
    return [
      {
        source: '/api/avisos',
        headers: [
          { key: 'Cache-Control', value: 'no-store, no-cache, must-revalidate, proxy-revalidate' },
          { key: 'Pragma', value: 'no-cache' },
          { key: 'Expires', value: '0' },
          { key: 'Surrogate-Control', value: 'no-store' },
        ],
      },
      {
        source: '/api/:path*',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=300, s-maxage=600' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
        ],
      },
      {
        source: '/_next/static/:path*',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
        ],
      },
      {
        source: '/images/:path*',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=86400' },
        ],
      },
      {
        source: '/:path*',
        headers: [
          { key: 'Access-Control-Allow-Origin', value: '*' },
          { key: 'Access-Control-Allow-Methods', value: 'GET, POST, PUT, DELETE, OPTIONS' },
          { key: 'Access-Control-Allow-Headers', value: 'Content-Type, Authorization' },
        ],
      },
    ]
  },

  // Otimizações de imagem
  images: {
    domains: ['localhost', 'supabase.co', 'nxamrvfusyrtkcshehfm.supabase.co'],
    formats: ['image/webp', 'image/avif'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    unoptimized: true,
    // Se for usar `output: 'export'`, considere adicionar: unoptimized: true
  },

  // Compressão e otimização
  compress: true,
  poweredByHeader: false,

  // Configurações de segurança
  async rewrites() {
    return [
      { source: '/api/:path*', destination: '/api/:path*' },
    ]
  },

  // ⚠️ Removido: 'swcMinify' (não é mais suportado/necessário no Next 15)
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production',
  },

  // Configurações de performance (dev)
  onDemandEntries: {
    maxInactiveAge: 25 * 1000,
    pagesBufferLength: 2,
  },

  // Rate limiting (se necessário)
  async redirects() {
    return []
  },

  // Suporte a SVG via SVGR (webpack)
  webpack(config, { isServer }) {
    config.module.rules.push({
      test: /\.svg$/i,
      issuer: /\.[jt]sx?$/,
      use: ['@svgr/webpack'],
    })
    
    // Forçar resolução do @splinetool/react-spline usando alias direto
    // Usar alias apenas para o Spline, sem afetar outros pacotes
    if (!isServer) {
      try {
        const path = require('path')
        const fs = require('fs')
        const splinePath = path.resolve(process.cwd(), 'node_modules/@splinetool/react-spline/dist/react-spline.js')
        
        // Verificar se o arquivo existe antes de criar o alias
        if (fs.existsSync(splinePath)) {
          config.resolve.alias = {
            ...(config.resolve.alias || {}),
            '@splinetool/react-spline': splinePath,
          }
        }
      } catch (e) {
        // Se não conseguir, deixar o webpack resolver normalmente
        console.warn('Não foi possível criar alias para Spline:', e)
      }
    }
    
    return config
  },
}

module.exports = nextConfig
