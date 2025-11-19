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
}

export function SplineScene({ 
  scene, 
  className, 
  background,
  shadows = true,
  showOverlay = true,
  overlayGradient = true
}: SplineSceneProps) {
  const [scriptLoaded, setScriptLoaded] = useState(false)
  const [error, setError] = useState(false)
  const [isClient, setIsClient] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const scriptRef = useRef<HTMLScriptElement | null>(null)

  useEffect(() => {
    setIsClient(true)
  }, [])

  // Carregar script do spline-viewer diretamente
  useEffect(() => {
    if (typeof window === 'undefined') return

    // Verificar se o custom element já está registrado
    if (customElements.get('spline-viewer')) {
      console.log('spline-viewer já está registrado')
      setScriptLoaded(true)
      return
    }

    // Verificar se já existe um script tag carregando
    const existingScript = document.querySelector('script[src*="spline-viewer"]')
    if (existingScript) {
      console.log('Script do spline-viewer já existe, aguardando registro...')
      // Aguardar até que o custom element seja registrado
      const checkInterval = setInterval(() => {
        if (customElements.get('spline-viewer')) {
          console.log('spline-viewer registrado após aguardar')
          clearInterval(checkInterval)
          setScriptLoaded(true)
        }
      }, 100)

      setTimeout(() => {
        clearInterval(checkInterval)
        if (!customElements.get('spline-viewer')) {
          console.error('spline-viewer não foi registrado após aguardar')
          setError(true)
        }
      }, 5000)
      return
    }

    // Criar e carregar script
    console.log('Carregando script do spline-viewer...')
    const script = document.createElement('script')
    script.type = 'module'
    script.src = 'https://unpkg.com/@splinetool/viewer@1.11.8/build/spline-viewer.js'
    script.crossOrigin = 'anonymous'

    script.onload = () => {
      console.log('Script do spline-viewer carregado, aguardando registro do custom element...')
      // Aguardar o registro do custom element
      let attempts = 0
      const maxAttempts = 50 // 5 segundos (50 * 100ms)

      const checkInterval = setInterval(() => {
        attempts++
        if (customElements.get('spline-viewer')) {
          console.log('spline-viewer custom element registrado!')
          clearInterval(checkInterval)
          setScriptLoaded(true)
          scriptRef.current = script
        } else if (attempts >= maxAttempts) {
          console.error('spline-viewer custom element não foi registrado após 5s')
          clearInterval(checkInterval)
          setError(true)
        }
      }, 100)
    }

    script.onerror = (e) => {
      console.error('Erro ao carregar script do Spline:', e)
      setError(true)
    }

    document.head.appendChild(script)
    scriptRef.current = script

    return () => {
      // Não remover o script ao desmontar, pode ser usado por outros componentes
    }
  }, [])

  // Verificar se a URL é válida
  useEffect(() => {
    if (!scene || !isClient) return

    // Validar formato da URL
    const isValidUrl = scene.startsWith('https://') && (scene.includes('.splinecode') || scene.includes('spline.design'))
    
    if (!isValidUrl) {
      console.warn('URL do Spline parece inválida:', scene)
      setError(true)
    }
  }, [scene, isClient])

  // Limpar elemento anterior quando a URL mudar ou script carregar
  useEffect(() => {
    if (!containerRef.current || !scriptLoaded || !scene || typeof window === 'undefined') return

    // Função para criar o viewer
    const createViewer = () => {
      if (!containerRef.current) return

      // Limpar conteúdo anterior
      containerRef.current.innerHTML = ''
      
      // Criar novo elemento spline-viewer
      const viewer = document.createElement('spline-viewer')
      viewer.setAttribute('url', scene)
      viewer.setAttribute('loading', 'lazy')
      
      // Configurações do viewer
      if (background) {
        viewer.setAttribute('background', background)
      }
      if (shadows) {
        viewer.setAttribute('shadows', 'true')
      }
      
      // Adicionar atributos para melhor controle
      viewer.setAttribute('events-target', 'window')
      
      // Estilos inline para garantir que ocupe todo o espaço - integrado ao site
      viewer.style.width = '100%'
      viewer.style.height = '100%'
      viewer.style.display = 'block'
      viewer.style.minHeight = '100%'
      viewer.style.position = 'absolute'
      viewer.style.top = '0'
      viewer.style.left = '0'
      viewer.style.right = '0'
      viewer.style.bottom = '0'
      viewer.style.borderRadius = '0'
      viewer.style.objectFit = 'contain' // Usar contain para não cortar
      viewer.style.overflow = 'visible' // Permite que elementos ultrapassem
      viewer.style.margin = '0'
      viewer.style.padding = '0'
      viewer.style.background = 'transparent'
      viewer.style.transform = 'scale(1.1)' // Aumentar um pouco para preencher melhor
      
      // Adicionar estilos CSS customizados para o web component
      const styleId = 'spline-viewer-styles'
      let style = document.head.querySelector(`style#${styleId}`) as HTMLStyleElement
      
      if (!style) {
        style = document.createElement('style')
        style.id = styleId
        style.textContent = `
          spline-viewer {
            width: 100% !important;
            height: 100% !important;
            display: block !important;
            position: absolute !important;
            top: 0 !important;
            left: 0 !important;
            right: 0 !important;
            bottom: 0 !important;
            border-radius: 0 !important;
            overflow: visible !important;
            margin: 0 !important;
            padding: 0 !important;
            background: transparent !important;
            border: none !important;
            box-shadow: none !important;
            transform: scale(1.1) !important;
            transform-origin: center center !important;
          }
          spline-viewer canvas {
            width: 100% !important;
            height: 100% !important;
            display: block !important;
            object-fit: contain !important;
            max-width: none !important;
            max-height: none !important;
            border-radius: 0 !important;
            overflow: visible !important;
          }
          spline-viewer * {
            overflow: visible !important;
            box-sizing: border-box !important;
            border-radius: 0 !important;
          }
          spline-viewer > * {
            width: 100% !important;
            height: 100% !important;
          }
        `
        document.head.appendChild(style)
      }
      
      // Adicionar event listeners para debug
      viewer.addEventListener('load', () => {
        console.log('Spline viewer carregado com sucesso')
      })
      
      viewer.addEventListener('error', (e) => {
        console.error('Erro no spline-viewer:', e)
        setError(true)
      })
      
      // Adicionar ao container
      containerRef.current.appendChild(viewer)
      console.log('spline-viewer element criado e adicionado:', viewer)
    }

    // Aguardar um pouco para garantir que o web component está registrado
    const timer = setTimeout(() => {
      if (!containerRef.current) return

      // Verificar se o web component está registrado
      if (!customElements.get('spline-viewer')) {
        console.warn('spline-viewer web component não está registrado ainda, aguardando...')
        // Tentar novamente após mais tempo
        setTimeout(() => {
          if (!containerRef.current) return
          if (!customElements.get('spline-viewer')) {
            console.error('spline-viewer web component não está disponível')
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
  }, [scene, scriptLoaded])

  // Não renderizar no servidor
  if (!isClient) {
    return <LoadingSpinner />
  }

  // Se não tiver URL da cena, mostrar mensagem
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

  if (error) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-transparent">
        <div className="text-center p-4">
          <div className="text-gray-400 text-sm mb-2">
            Erro ao carregar animação
          </div>
          <div className="text-gray-500 text-xs mb-2">
            Verifique se a URL do Spline está correta
          </div>
        </div>
      </div>
    )
  }

  return (
    <>
      {/* Container para o spline-viewer */}
      <div 
        ref={containerRef} 
        className={className} 
        style={{ 
          width: '100%', 
          height: '100%', 
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          overflow: 'visible', // Permite que o robô ultrapasse as bordas
          borderRadius: 0,
          margin: 0,
          padding: 0,
          background: 'transparent',
          border: 'none',
          boxShadow: 'none',
          zIndex: 1
        }}
      >
        {!scriptLoaded && !error && (
          <div className="absolute inset-0 flex items-center justify-center" style={{ zIndex: 10 }}>
            <LoadingSpinner />
          </div>
        )}
        
        {/* Overlay de efeitos visuais - agora com mais controle */}
        {showOverlay && scriptLoaded && !error && (
          <>
            {/* Gradiente de fundo */}
            {overlayGradient && (
              <div 
                className="absolute inset-0 pointer-events-none"
                style={{
                  background: 'radial-gradient(circle at 30% 50%, rgba(209, 254, 110, 0.15) 0%, transparent 50%), radial-gradient(circle at 70% 50%, rgba(184, 229, 90, 0.1) 0%, transparent 50%)',
                  zIndex: 2,
                  mixBlendMode: 'overlay',
                  overflow: 'visible'
                }}
              />
            )}
            
            {/* Partículas de luz flutuantes */}
            <div 
              className="absolute inset-0 pointer-events-none"
              style={{
                zIndex: 2,
                background: 'radial-gradient(circle at 20% 30%, rgba(209, 254, 110, 0.1) 0%, transparent 20%), radial-gradient(circle at 80% 70%, rgba(184, 229, 90, 0.08) 0%, transparent 25%)',
                animation: 'pulse 4s ease-in-out infinite',
                overflow: 'visible'
              }}
            />
            
            {/* Linhas de grade sutil */}
            <div 
              className="absolute inset-0 pointer-events-none"
              style={{
                backgroundImage: 'linear-gradient(rgba(209, 254, 110, 0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(209, 254, 110, 0.03) 1px, transparent 1px)',
                backgroundSize: '50px 50px',
                zIndex: 2,
                mixBlendMode: 'screen',
                overflow: 'visible'
              }}
            />
            
            {/* Área para textos e elementos customizados */}
            <div 
              className="absolute inset-0 pointer-events-none"
              style={{
                zIndex: 3,
                overflow: 'visible'
              }}
              id="spline-text-overlay"
            />
          </>
        )}
      </div>
      
      <style jsx>{`
        @keyframes pulse {
          0%, 100% { opacity: 0.6; }
          50% { opacity: 1; }
        }
      `}</style>
    </>
  )
}

