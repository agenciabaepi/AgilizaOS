'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { FiMail, FiCheck, FiAlertCircle } from 'react-icons/fi'
import { useToast } from '@/hooks/useToast'

export default function VerificarEmail() {
  const [codigo, setCodigo] = useState('')
  const [loading, setLoading] = useState(false)
  const [email, setEmail] = useState('')
  const [enviandoNovamente, setEnviandoNovamente] = useState(false)
  const router = useRouter()
  const searchParams = useSearchParams()
  const { addToast } = useToast()

  useEffect(() => {
    const emailParam = searchParams.get('email')
    if (emailParam) {
      setEmail(emailParam)
    } else {
      // Se não tem email, redireciona para login
      router.push('/login')
    }
  }, [searchParams, router])

  const handleVerificar = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!codigo || codigo.length !== 6) {
      addToast('Digite o código de 6 dígitos', 'error')
      return
    }

    setLoading(true)

    try {
      const response = await fetch('/api/email/verificar-codigo', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: email,
          codigo: codigo
        })
      })

      const data = await response.json()

      if (response.ok) {
        addToast('Email verificado com sucesso!', 'success')
        // Redirecionar para login após verificação
        setTimeout(() => {
          router.push('/login?verified=true')
        }, 1500)
      } else {
        addToast(data.error || 'Código inválido ou expirado', 'error')
      }
    } catch (error) {
      console.error('Erro ao verificar código:', error)
      addToast('Erro ao verificar código', 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleEnviarNovamente = async () => {
    setEnviandoNovamente(true)

    try {
      // Buscar dados do usuário para reenvio
      const response = await fetch('/api/email/reenviar-codigo', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email })
      })

      const data = await response.json()

      if (response.ok) {
        addToast('Novo código enviado para seu email!', 'success')
      } else {
        addToast(data.error || 'Erro ao reenviar código', 'error')
      }
    } catch (error) {
      console.error('Erro ao reenviar código:', error)
      addToast('Erro ao reenviar código', 'error')
    } finally {
      setEnviandoNovamente(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center p-4">
      <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-2xl p-8 w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="bg-blue-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
            <FiMail className="text-blue-600 text-2xl" />
          </div>
          <h1 className="text-2xl font-bold text-gray-800 mb-2">
            Verificar Email
          </h1>
          <p className="text-gray-600 text-sm">
            Digite o código de 6 dígitos enviado para:
          </p>
          <p className="text-blue-600 font-medium mt-1">
            {email}
          </p>
        </div>

        {/* Formulário */}
        <form onSubmit={handleVerificar} className="space-y-6">
          <div>
            <label htmlFor="codigo" className="block text-sm font-medium text-gray-700 mb-2">
              Código de Verificação
            </label>
            <input
              type="text"
              id="codigo"
              value={codigo}
              onChange={(e) => {
                const value = e.target.value.replace(/\D/g, '').slice(0, 6)
                setCodigo(value)
              }}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent text-center text-2xl font-mono tracking-widest"
              placeholder="000000"
              maxLength={6}
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading || codigo.length !== 6}
            className="w-full bg-blue-600 text-white py-3 px-6 rounded-xl font-medium hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                Verificando...
              </>
            ) : (
              <>
                <FiCheck className="text-lg" />
                Verificar Código
              </>
            )}
          </button>
        </form>

        {/* Reenviar código */}
        <div className="mt-6 text-center">
          <p className="text-gray-600 text-sm mb-3">
            Não recebeu o código?
          </p>
          <button
            onClick={handleEnviarNovamente}
            disabled={enviandoNovamente}
            className="text-blue-600 hover:text-blue-700 font-medium text-sm underline disabled:opacity-50"
          >
            {enviandoNovamente ? 'Enviando...' : 'Enviar novamente'}
          </button>
        </div>

        {/* Info */}
        <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <div className="flex gap-3">
            <FiAlertCircle className="text-yellow-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-yellow-800 text-sm font-medium">
                Código válido por 24 horas
              </p>
              <p className="text-yellow-700 text-xs mt-1">
                Verifique sua caixa de spam se não encontrar o email.
              </p>
            </div>
          </div>
        </div>

        {/* Voltar para login */}
        <div className="mt-6 text-center">
          <button
            onClick={() => router.push('/login')}
            className="text-gray-500 hover:text-gray-700 text-sm underline"
          >
            Voltar para o login
          </button>
        </div>
      </div>
    </div>
  )
}
