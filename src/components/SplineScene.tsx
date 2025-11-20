'use client'

import { useState, useEffect, useRef } from 'react'

// Componente de Loading
const LoadingSpinner = () => (
  <div className="w-full h-full flex items-center justify-center bg-transparent">
    <div className="relative w-16 h-16">
      <div className="absolute top-0 left-0 w-full h-full border-4 border-gray-300 border-t-transparent rounded-full animate-spin"></div>
      <div className="absolute top-0 left-0 w-full h-full border-4 border-transparent border-t-[#D1FE6E] rounded-full animate-spin" style={{ animationDirection: 'reverse', animationDuration: '0.8s' }}></div>
    </div>
  </div>
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
  const [scriptLoaded, setScriptLoaded] = useState(false)
  const [splineReady, setSplineReady] = useState(false)
  const [error, setError] = useState(false)
  const [isClient, setIsClient] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const scriptRef = useRef<HTMLScriptElement | null>(null)

  useEffect(() => {
    setIsClient(true)
  }, [])

  // Notificar quando o Spline estiver pronto
  useEffect(() => {
    if (splineReady) {
      window.dispatchEvent(new CustomEvent('spline-ready'))
      if (onSplineReady) {
        onSplineReady()
      }
    }
  }, [splineReady, onSplineReady])

  // Carregar script do spline-viewer
  useEffect(() => {
    if (typeof window === 'undefined') return

    // Verificar se o custom element já está registrado
    if (customElements.get('spline-viewer')) {
      setScriptLoaded(true)
      return
    }

    // Verificar se já existe um script tag carregando
    const existingScript = document.querySelector('script[src*="spline-viewer"]')
    if (existingScript) {
      const checkInterval = setInterval(() => {
        if (customElements.get('spline-viewer')) {
          clearInterval(checkInterval)
          setScriptLoaded(true)
        }
      }, 100)

      setTimeout(() => {
        clearInterval(checkInterval)
        if (!customElements.get('spline-viewer')) {
          setError(true)
        }
      }, 5000)
      return
    }

    // Criar e carregar script
    const script = document.createElement('script')
    script.type = 'module'
    script.src = 'https://unpkg.com/@splinetool/viewer@1.11.9/build/spline-viewer.js'
    script.crossOrigin = 'anonymous'

    script.onload = () => {
      let attempts = 0
      const maxAttempts = 50

      const checkInterval = setInterval(() => {
        attempts++
        if (customElements.get('spline-viewer')) {
          clearInterval(checkInterval)
          setScriptLoaded(true)
          scriptRef.current = script
        } else if (attempts >= maxAttempts) {
          clearInterval(checkInterval)
          setError(true)
        }
      }, 100)
    }

    script.onerror = () => {
      setError(true)
    }

    document.head.appendChild(script)
    scriptRef.current = script

    return () => {
      // Não remover o script ao desmontar
    }
  }, [])

  // Criar o elemento spline-viewer quando o script carregar
  useEffect(() => {
    if (!containerRef.current || !scriptLoaded || !scene || error || typeof window === 'undefined') return

    const createViewer = () => {
      if (!containerRef.current) return

      // Limpar conteúdo anterior
      containerRef.current.innerHTML = ''

      // Criar novo elemento spline-viewer
      const viewer = document.createElement('spline-viewer') as any
      viewer.url = scene
      viewer.loading = 'lazy'

      if (background) {
        viewer.setAttribute('background', background)
      }
      if (shadows) {
        viewer.setAttribute('shadows', 'true')
      }

      viewer.setAttribute('events-target', 'window')

      // Estilos inline
      viewer.style.width = '100%'
      viewer.style.height = '100%'
      viewer.style.display = 'block'
      viewer.style.position = 'absolute'
      viewer.style.top = '0'
      viewer.style.left = '0'
      viewer.style.right = '0'
      viewer.style.bottom = '0'
      viewer.style.borderRadius = '0'
      viewer.style.objectFit = 'contain'
      viewer.style.overflow = 'visible'
      viewer.style.margin = '0'
      viewer.style.padding = '0'
      viewer.style.background = 'transparent'
      viewer.style.transform = 'scale(1.3)'
      viewer.style.transformOrigin = 'center center'
      viewer.style.left = '50%'
      viewer.style.top = '50%'
      viewer.style.transform = 'translate(-50%, -50%) scale(1.3)'

      // Event listeners
      viewer.addEventListener('load', () => {
        setTimeout(() => {
          setSplineReady(true)
        }, 3000)
      })

      viewer.addEventListener('error', () => {
        setError(true)
      })

      containerRef.current.appendChild(viewer)
    }

    const timer = setTimeout(() => {
      if (!containerRef.current) return

      if (!customElements.get('spline-viewer')) {
        setTimeout(() => {
          if (!containerRef.current) return
          if (!customElements.get('spline-viewer')) {
            setError(true)
            return
          }
          createViewer()
        }, 500)
        return
      }

      createViewer()
    }, 200)

    return () => clearTimeout(timer)
  }, [scene, scriptLoaded, error, background, shadows])

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
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-transparent">
        <div className="text-center p-4">
          <div className="text-gray-400 text-sm mb-2">
            Erro ao carregar animação
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
      <div 
        ref={containerRef}
        style={{
          width: '100%',
          height: '100%',
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          overflow: 'visible'
        }}
      >
        {/* Loading removido para não ficar feio */}
      </div>
    </div>
  )
}
