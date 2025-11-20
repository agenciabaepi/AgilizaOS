'use client'

import dynamic from 'next/dynamic'
import { useState, useEffect } from 'react'

// Componente de Loading
const LoadingSpinner = () => (
  <div className="w-full h-full flex items-center justify-center bg-transparent">
    <div className="relative w-16 h-16">
      <div className="absolute top-0 left-0 w-full h-full border-4 border-gray-300 border-t-transparent rounded-full animate-spin"></div>
      <div className="absolute top-0 left-0 w-full h-full border-4 border-transparent border-t-[#D1FE6E] rounded-full animate-spin" style={{ animationDirection: 'reverse', animationDuration: '0.8s' }}></div>
    </div>
  </div>
)

// Importação dinâmica do Spline para evitar problemas de SSR
const Spline = dynamic(
  () => import('@splinetool/react-spline/next').then((mod) => mod.default),
  {
    ssr: false,
    loading: () => <LoadingSpinner />,
  }
)

interface SplineSceneProps {
  scene: string
  className?: string
  background?: string
  shadows?: boolean
  showOverlay?: boolean
  overlayGradient?: boolean
  onSplineReady?: () => void
}

export function SplineScene({ 
  scene, 
  className, 
  background,
  shadows = true,
  showOverlay = true,
  overlayGradient = true,
  onSplineReady
}: SplineSceneProps) {
  const [splineReady, setSplineReady] = useState(false)
  const [isClient, setIsClient] = useState(false)

  useEffect(() => {
    setIsClient(true)
  }, [])

  // Notificar quando o Spline estiver pronto
  useEffect(() => {
    if (splineReady) {
      // Aguardar 3 segundos para garantir que a animação começou
      const timer = setTimeout(() => {
        console.log('Spline pronto - texto pode aparecer agora')
        window.dispatchEvent(new CustomEvent('spline-ready'))
        if (onSplineReady) {
          onSplineReady()
        }
      }, 3000)
      return () => clearTimeout(timer)
    }
  }, [splineReady, onSplineReady])

  const handleLoad = () => {
    console.log('Spline carregado com sucesso')
    setSplineReady(true)
  }

  // Não renderizar no servidor
  if (!isClient) {
    return <LoadingSpinner />
  }

  if (!scene) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-transparent">
        <div className="text-center p-4">
          <div className="text-gray-400 text-sm mb-2">
            URL do Spline não configurada
          </div>
          <div className="text-gray-500 text-xs">
            Configure a constante SPLINE_SCENE_URL no arquivo page.tsx
          </div>
        </div>
      </div>
    )
  }

  return (
    <div 
      className={className}
      style={{
        width: '100%',
        height: '100%',
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        overflow: 'visible',
        borderRadius: 0,
        margin: 0,
        padding: 0,
        background: 'transparent',
        border: 'none',
        boxShadow: 'none',
        zIndex: 1
      }}
    >
      <Spline
        scene={scene}
        onLoad={handleLoad}
        style={{
          width: '100%',
          height: '100%',
          display: 'block',
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          overflow: 'visible',
          borderRadius: 0,
          margin: 0,
          padding: 0,
          background: 'transparent',
          transform: 'scale(1.3)',
          transformOrigin: 'center center',
        }}
      />
    </div>
  )
}
