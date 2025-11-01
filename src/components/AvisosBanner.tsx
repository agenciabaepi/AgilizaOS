'use client'

import { useState, useEffect } from 'react'
import { FiAlertCircle, FiInfo, FiCheckCircle, FiAlertTriangle } from 'react-icons/fi'
import { useAuth } from '@/context/AuthContext'

interface Aviso {
  id: string
  titulo: string
  mensagem: string
  tipo: 'info' | 'warning' | 'error' | 'success'
  cor_fundo: string
  cor_texto: string
  prioridade: number
}

export default function AvisosBanner() {
  const { empresaData, usuarioData } = useAuth()
  const [avisos, setAvisos] = useState<Aviso[]>([])

  useEffect(() => {
    const empresaId = empresaData?.id || usuarioData?.empresa_id
    if (empresaId) {
      carregarAvisos()
    }

    // Escutar evento de atualização de avisos
    const handleAvisosAtualizados = () => {
      carregarAvisos()
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
  }, [empresaData?.id, usuarioData?.empresa_id])

  const carregarAvisos = async () => {
    try {
      const empresaId = empresaData?.id || usuarioData?.empresa_id
      if (!empresaId) {
        return
      }
      const timestamp = Date.now()
      const randomId = Math.random().toString(36).substring(7)
      const response = await fetch(`/api/avisos?empresa_id=${empresaId}&_t=${timestamp}&_r=${randomId}`, {
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
        // Silenciosamente falha - não é um erro crítico
        return
      }
      
      const data = await response.json()

      if (data.avisos) {
        // Filtrar avisos por data se necessário
        const agora = new Date()
        const avisosValidos = data.avisos.filter((aviso: any) => {
          // Se tem data_inicio e ainda não chegou
          if (aviso.data_inicio) {
            const inicio = new Date(aviso.data_inicio)
            if (inicio > agora) {
              return false
            }
          }
          // Se tem data_fim e já passou
          if (aviso.data_fim) {
            const fim = new Date(aviso.data_fim)
            if (fim < agora) {
              return false
            }
          }
          // Só mostrar avisos ativos
          if (!aviso.ativo) {
            return false
          }
          return true
        })

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
          style={{
            backgroundColor: aviso.cor_fundo,
            color: aviso.cor_texto,
          }}
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

