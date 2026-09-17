'use client'

import { useState, useEffect } from 'react'
import { FiAlertCircle, FiInfo, FiCheckCircle, FiAlertTriangle } from 'react-icons/fi'
import { useAuth } from '@/context/AuthContext'
import { useTheme } from '@/context/ThemeContext'

interface Aviso {
  id: string
  titulo: string
  mensagem: string
  tipo: 'info' | 'warning' | 'error' | 'success'
  cor_fundo: string
  cor_texto: string
  prioridade: number
}

function parseRgb(input: string): { r: number; g: number; b: number } | null {
  if (!input) return null
  const hex = input.trim()
  const short = /^#([0-9a-f]{3})$/i.exec(hex)
  if (short) {
    const [r, g, b] = short[1].split('').map((c) => parseInt(c + c, 16))
    return { r, g, b }
  }
  const long = /^#([0-9a-f]{6})$/i.exec(hex)
  if (long) {
    return {
      r: parseInt(long[1].slice(0, 2), 16),
      g: parseInt(long[1].slice(2, 4), 16),
      b: parseInt(long[1].slice(4, 6), 16),
    }
  }
  const rgb = /^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/i.exec(hex)
  if (rgb) return { r: Number(rgb[1]), g: Number(rgb[2]), b: Number(rgb[3]) }
  return null
}

function luminance({ r, g, b }: { r: number; g: number; b: number }) {
  const toLin = (v: number) => {
    const c = v / 255
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
  }
  return 0.2126 * toLin(r) + 0.7152 * toLin(g) + 0.0722 * toLin(b)
}

function adaptAvisoColors(bg: string, text: string, isDark: boolean) {
  if (!isDark) return { backgroundColor: bg, color: text }
  const parsedBg = parseRgb(bg)
  const parsedText = parseRgb(text)
  const backgroundColor =
    parsedBg && luminance(parsedBg) > 0.35
      ? `rgb(${Math.round(parsedBg.r * 0.18)}, ${Math.round(parsedBg.g * 0.18)}, ${Math.round(parsedBg.b * 0.18)})`
      : bg || '#18181b'
  const color =
    parsedText && luminance(parsedText) < 0.5 ? '#f4f4f5' : text || '#f4f4f5'
  return { backgroundColor, color }
}

export default function AvisosBanner() {
  const { empresaData, usuarioData } = useAuth()
  const { theme } = useTheme()
  const isDark = theme === 'dark'
  const [avisos, setAvisos] = useState<Aviso[]>([])

  useEffect(() => {
    const empresaId = empresaData?.id || usuarioData?.empresa_id
    const usuarioId = usuarioData?.id
    
    // Carregar avisos se tiver empresaId (usuarioId é opcional - para avisos "para todos")
    if (empresaId) {
      carregarAvisos()
    }

    // Escutar evento de atualização de avisos
    const handleAvisosAtualizados = () => {
      const empresaId = empresaData?.id || usuarioData?.empresa_id
      if (empresaId) {
        carregarAvisos()
      }
    }
    
    window.addEventListener('avisosAtualizados', handleAvisosAtualizados)

    // Recarregar avisos a cada 5 minutos
    const interval = setInterval(() => {
      const empresaId = empresaData?.id || usuarioData?.empresa_id
      if (empresaId) {
        carregarAvisos()
      }
    }, 5 * 60 * 1000)
    
    return () => {
      clearInterval(interval)
      window.removeEventListener('avisosAtualizados', handleAvisosAtualizados)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [empresaData?.id, usuarioData?.empresa_id, usuarioData?.id])

  const carregarAvisos = async () => {
    try {
      const empresaId = empresaData?.id || usuarioData?.empresa_id
      const usuarioId = usuarioData?.id
      
      console.log('[AvisosBanner] Carregando avisos:', {
        empresaId,
        usuarioId,
        usuarioData_completo: usuarioData
      })
      
      // Validar que temos empresaId (usuarioId é opcional - para avisos "para todos")
      if (!empresaId) {
        console.warn('[AvisosBanner] empresaId não disponível, aguardando...')
        return
      }
      
      const timestamp = Date.now()
      const randomId = Math.random().toString(36).substring(7)
      // Incluir usuarioId na URL se disponível, senão apenas empresaId (para buscar avisos "para todos")
      const url = `/api/avisos?empresa_id=${empresaId}${usuarioId ? `&usuario_id=${usuarioId}` : ''}&_t=${timestamp}&_r=${randomId}`
      
      console.log('[AvisosBanner] URL da requisição:', url)
      
      const response = await fetch(url, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      })
      
      // Se for erro 401 (não autenticado), pode ser que a sessão ainda esteja carregando
      // Tentar novamente após um pequeno delay
      if (response.status === 401) {
        // Aguardar um pouco e tentar novamente (sessão pode estar carregando)
        setTimeout(() => {
          carregarAvisos()
        }, 2000)
        return
      }
      
      // Se a tabela não existe ou outro erro, não mostrar erro (retorna vazio)
      if (!response.ok) {
        console.warn('[AvisosBanner] Erro na resposta:', response.status)
        // Silenciosamente falha - não é um erro crítico
        return
      }
      
      const data = await response.json()
      
      console.log('[AvisosBanner] Avisos recebidos:', {
        quantidade: data.avisos?.length || 0,
        usuarioId: usuarioId || 'não fornecido',
        avisos: data.avisos?.map((a: any) => ({
          id: a.id,
          titulo: a.titulo,
          exibir_para_todos: a.exibir_para_todos,
          usuarios_ids: a.usuarios_ids
        })) || []
      })

      if (data.avisos) {
        // A API já filtra por usuário e datas, então apenas filtrar por ativo se necessário
        const avisosValidos = data.avisos.filter((aviso: any) => {
          // Só mostrar avisos ativos (a API já filtra por datas e usuário)
          if (!aviso.ativo) {
            return false
          }
          return true
        })

        console.log('[AvisosBanner] Avisos válidos após filtro de ativo:', avisosValidos.length)
        setAvisos(avisosValidos)
      } else {
        setAvisos([])
      }
    } catch (error) {
      // Silenciosamente falha se houver erro (tabela pode não existir ainda ou rede)
      console.debug('Avisos não disponíveis:', error)
    }
  }


  const getIcon = (tipo: string) => {
    switch (tipo) {
      case 'error':
        return <FiAlertCircle size={20} />
      case 'warning':
        return <FiAlertTriangle size={20} />
      case 'success':
        return <FiCheckCircle size={20} />
      case 'info':
      default:
        return <FiInfo size={20} />
    }
  }

  // Ordenar avisos por prioridade
  const avisosOrdenados = avisos
    .filter(aviso => {
      // Garantir que só mostra avisos válidos
      if (!aviso || !aviso.id || !aviso.titulo) {
        return false
      }
      return true
    })
    .sort((a, b) => b.prioridade - a.prioridade)

  // Se não há avisos, não renderizar nada
  if (!avisosOrdenados || avisosOrdenados.length === 0) {
    return null
  }

  return (
    <div className="w-full space-y-2">
      {avisosOrdenados.map((aviso) => (
        <div
          key={aviso.id}
          className="relative w-full px-4 py-3 flex items-start gap-3 shadow-sm animate-fade-in"
          style={adaptAvisoColors(aviso.cor_fundo, aviso.cor_texto, isDark)}
        >
          <div className="flex-shrink-0 mt-0.5">{getIcon(aviso.tipo)}</div>
          <div className="flex-1 min-w-0">
            <h4 className="font-semibold text-base mb-1">{aviso.titulo}</h4>
            <p className="text-sm opacity-90 leading-relaxed">{aviso.mensagem}</p>
          </div>
        </div>
      ))}
      <style>{`
        @keyframes fade-in {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fade-in {
          animation: fade-in 0.3s ease-out;
        }
      `}</style>
    </div>
  )
}

