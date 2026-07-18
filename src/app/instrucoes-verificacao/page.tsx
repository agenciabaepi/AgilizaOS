'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { FiSmartphone, FiArrowRight, FiCheckCircle } from 'react-icons/fi'
import { useToast } from '@/hooks/useToast'
import Image from 'next/image'
import logo from '@/assets/imagens/logopreto.png'

function InstrucoesVerificacaoContent() {
  const [email, setEmail] = useState('')
  const [telefone, setTelefone] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const searchParams = useSearchParams()
  const { addToast } = useToast()

  useEffect(() => {
    const emailParam = searchParams.get('email')
    if (emailParam) {
      setEmail(emailParam)
    } else {
      router.push('/login')
    }
  }, [searchParams, router])

  const handleIrParaLogin = () => {
    router.push(`/login?email=${encodeURIComponent(email)}&verificacao=pending`)
  }

  const handleReenviarCodigo = async () => {
    setLoading(true)

    try {
      const response = await fetch('/api/verificacao/reenviar-codigo', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, force: true }),
      })

      const data = await response.json()

      if (response.ok) {
        if (data.telefone) setTelefone(data.telefone)
        addToast(
          data.telefone
            ? `Novo código enviado por SMS para ${data.telefone}!`
            : 'Novo código enviado por SMS!',
          'success'
        )
      } else {
        addToast(data.error || 'Erro ao reenviar código', 'error')
      }
    } catch (error) {
      console.error('Erro ao reenviar código:', error)
      addToast('Erro ao reenviar código', 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#cffb6d] to-[#e0ffe3] flex items-center justify-center p-4">
      <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-2xl p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <Image
              src={logo}
              alt="Consert"
              width={120}
              height={40}
              className="h-10 w-auto"
            />
          </div>

          <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <FiSmartphone className="w-8 h-8 text-emerald-700" />
          </div>

          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Confirme sua conta
          </h1>

          <p className="text-gray-600">
            Enviamos um código de verificação por SMS
            {telefone ? ':' : ' para o WhatsApp cadastrado.'}
          </p>

          {telefone ? (
            <p className="text-emerald-700 font-medium mt-1">{telefone}</p>
          ) : (
            <p className="text-gray-500 text-sm mt-1">{email}</p>
          )}
        </div>

        <div className="space-y-4 mb-8">
          <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
            <div className="flex items-start space-x-3">
              <FiCheckCircle className="w-5 h-5 text-emerald-600 mt-0.5 flex-shrink-0" />
              <div>
                <h3 className="font-medium text-emerald-900 mb-2">
                  Próximos passos:
                </h3>
                <ol className="text-sm text-emerald-800 space-y-2">
                  <li>1. Abra as mensagens SMS do celular</li>
                  <li>2. Procure a mensagem do Consert</li>
                  <li>3. Copie o código de 6 dígitos</li>
                  <li>4. Faça login e informe o código</li>
                </ol>
              </div>
            </div>
          </div>

          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-start space-x-3">
              <FiCheckCircle className="w-5 h-5 text-yellow-600 mt-0.5 flex-shrink-0" />
              <div>
                <h3 className="font-medium text-yellow-900 mb-1">
                  Não recebeu o SMS?
                </h3>
                <ul className="text-sm text-yellow-800 space-y-1">
                  <li>• Confira se o WhatsApp do cadastro está correto</li>
                  <li>• Aguarde alguns minutos</li>
                  <li>• Clique em &quot;Reenviar código&quot; abaixo</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <button
            onClick={handleIrParaLogin}
            className="w-full bg-black text-white py-3 px-4 rounded-lg font-medium hover:bg-gray-800 transition-colors flex items-center justify-center space-x-2"
          >
            <span>Ir para o Login</span>
            <FiArrowRight className="w-4 h-4" />
          </button>

          <button
            onClick={handleReenviarCodigo}
            disabled={loading}
            className="w-full bg-gray-100 text-gray-700 py-3 px-4 rounded-lg font-medium hover:bg-gray-200 transition-colors disabled:opacity-50"
          >
            {loading ? 'Enviando...' : 'Reenviar código'}
          </button>
        </div>

        <div className="mt-6 text-center">
          <p className="text-xs text-gray-500">
            O código é válido por 24 horas
          </p>
        </div>
      </div>
    </div>
  )
}

export default function InstrucoesVerificacaoPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-[#cffb6d] to-[#e0ffe3] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black mx-auto"></div>
          <p className="mt-4 text-gray-600">Carregando...</p>
        </div>
      </div>
    }>
      <InstrucoesVerificacaoContent />
    </Suspense>
  )
}
