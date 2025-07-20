'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { useAuth } from '@/context/AuthContext'
import MenuLayout from '@/components/MenuLayout'
import { useToast } from '@/components/Toast'

interface UsuarioPerfil {
  id: string
  nome: string
  email: string
  cpf: string
  telefone: string
  nivel: string
}

export default function PerfilPage() {
  const { user, loading: authLoading, usuarioData } = useAuth()
  const { addToast } = useToast()
  
  const [perfil, setPerfil] = useState<UsuarioPerfil | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [form, setForm] = useState({
    nome: '',
    email: '',
    cpf: '',
    telefone: ''
  })

  useEffect(() => {
    const fetchPerfil = async () => {
      if (authLoading) {
        console.log('Aguardando carregamento da autenticação...')
        return
      }

      if (!user) {
        console.log('Usuário não autenticado')
        setLoading(false)
        return
      }

      // Se já temos dados do contexto, usa imediatamente
      if (usuarioData) {
        console.log('Usando dados do contexto:', usuarioData)
        setPerfil({
          id: user.id,
          nome: usuarioData.nome,
          email: usuarioData.email,
          cpf: '',
          telefone: '',
          nivel: usuarioData.nivel
        })
        setForm({
          nome: usuarioData.nome,
          email: usuarioData.email,
          cpf: '',
          telefone: ''
        })
        setLoading(false)
        return
      }

      // Se não temos dados do contexto, tenta buscar
      console.log('Buscando dados do perfil no Supabase...')
      
      try {
        // Primeiro, vamos verificar se a tabela existe e tem a estrutura esperada
        const { data: tableData, error: tableError } = await supabase
          .from('usuarios')
          .select('*')
          .limit(1)

        if (tableError) {
          console.error('Erro ao verificar tabela usuarios:', tableError)
          addToast('error', 'Erro ao verificar tabela: ' + tableError.message)
          setLoading(false)
          return
        }

        console.log('Estrutura da tabela verificada:', tableData)
        if (tableData && tableData.length > 0) {
          console.log('Campos disponíveis na tabela:', Object.keys(tableData[0]))
        }

        // Agora busca os dados do usuário
        const { data, error } = await supabase
          .from('usuarios')
          .select('*')
          .eq('auth_user_id', user.id)
          .maybeSingle()

        console.log('Resultado da busca:', { data, error })

        if (error) {
          console.error('Erro ao buscar perfil:', {
            message: error.message,
            details: error.details,
            hint: error.hint,
            code: error.code
          })
          
          addToast('error', 'Erro ao carregar dados do perfil: ' + error.message)
          setLoading(false)
          return
        }

        if (!data) {
          console.error('Nenhum dado encontrado para o usuário')
          addToast('error', 'Perfil não encontrado. Verifique se você está cadastrado no sistema.')
          setLoading(false)
          return
        }

        console.log('Dados do perfil carregados:', data)
        console.log('Campos disponíveis no perfil:', Object.keys(data))
        
        setPerfil({
          id: data.id || user.id,
          nome: data.nome || '',
          email: data.email || '',
          cpf: data.cpf || '',
          telefone: data.telefone || '',
          nivel: data.nivel || 'atendente'
        })

        setForm({
          nome: data.nome || '',
          email: data.email || '',
          cpf: data.cpf || '',
          telefone: data.telefone || ''
        })

        // Agora vamos tentar buscar dados adicionais (cpf, telefone) se necessário
        setTimeout(async () => {
          try {
            const timeoutPromise = new Promise((_, reject) => {
              setTimeout(() => reject(new Error('Timeout')), 3000) // 3 segundos de timeout
            })

            const fetchPromise = supabase
              .from('usuarios')
              .select('cpf, telefone')
              .eq('auth_user_id', user.id)
              .maybeSingle()

            const { data: additionalData, error: additionalError } = await Promise.race([fetchPromise, timeoutPromise]) as { data: { cpf: string, telefone: string } | null, error: { message: string } | null }

            if (!additionalError && additionalData) {
              console.log('Dados adicionais carregados:', additionalData)
              setPerfil(prev => prev ? {
                ...prev,
                cpf: additionalData.cpf || '',
                telefone: additionalData.telefone || ''
              } : prev)
              setForm(prev => ({
                ...prev,
                cpf: additionalData.cpf || '',
                telefone: additionalData.telefone || ''
              }))
            }
          } catch (error) {
            console.log('Erro ao buscar dados adicionais (não crítico):', error)
          }
        }, 100)

      } catch (error) {
        console.error('Erro geral ao buscar perfil:', error)
        addToast('error', 'Erro inesperado ao carregar dados do perfil')
      } finally {
        setLoading(false)
      }
    }

    fetchPerfil()
  }, [user, authLoading, usuarioData, addToast])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value })
  }



  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)

    try {
      if (!user?.id) {
        addToast('error', 'Usuário não autenticado')
        setSaving(false)
        return
      }

      console.log('Iniciando atualização do perfil:', {
        userId: user.id,
        formData: form
      })

      // Testa a conexão com o Supabase
      console.log('Testando conexão com Supabase...')
      const { data: connectionTest, error: connectionError } = await supabase
        .from('usuarios')
        .select('count')
        .limit(1)

      console.log('Teste de conexão:', { connectionTest, connectionError })

      if (connectionError) {
        console.error('Erro de conexão com Supabase:', connectionError)
        addToast('error', 'Erro de conexão com o banco de dados')
        setSaving(false)
        return
      }

      // Primeiro, vamos testar se conseguimos ler os dados
      console.log('Testando leitura dos dados...')
      const { data: readData, error: readError } = await supabase
        .from('usuarios')
        .select('*')
        .eq('auth_user_id', user.id)
        .maybeSingle()

      console.log('Teste de leitura:', { readData, readError })

      if (readError) {
        console.error('Erro ao ler dados do usuário:', {
          message: readError.message,
          details: readError.details,
          hint: readError.hint,
          code: readError.code
        })
        addToast('error', 'Erro ao ler dados do usuário: ' + readError.message)
        setSaving(false)
        return
      }

      if (!readData) {
        console.error('Usuário não encontrado na tabela')
        addToast('error', 'Usuário não encontrado no sistema')
        setSaving(false)
        return
      }

      console.log('Dados encontrados para atualização:', readData)

      // Agora tenta a atualização
      console.log('Tentando atualização...')
      const updateResult = await supabase
        .from('usuarios')
        .update({
          nome: form.nome,
          email: form.email,
          cpf: form.cpf || null,
          telefone: form.telefone || null
        })
        .eq('auth_user_id', user.id)
        .select()

      console.log('Resultado bruto da atualização:', updateResult)

      // Verifica se há erro
      if (updateResult.error) {
        console.error('Erro na atualização:', {
          error: updateResult.error,
          message: updateResult.error.message,
          details: updateResult.error.details,
          hint: updateResult.error.hint,
          code: updateResult.error.code,
          type: typeof updateResult.error
        })
        
        let errorMessage = 'Erro ao salvar alterações'
        if (updateResult.error.code === '42501') {
          errorMessage = 'Sem permissão para atualizar dados. Verifique suas permissões.'
        } else if (updateResult.error.code === '23505') {
          errorMessage = 'Email já está em uso por outro usuário.'
        } else if (updateResult.error.message) {
          errorMessage = updateResult.error.message
        }
        
        addToast('error', errorMessage)
        setSaving(false)
        return
      }

      // Verifica se a atualização foi bem-sucedida
      if (!updateResult.data || updateResult.data.length === 0) {
        console.error('Nenhum registro foi atualizado')
        addToast('error', 'Nenhum registro foi atualizado. Verifique se você está cadastrado no sistema.')
        setSaving(false)
        return
      }

      console.log('Perfil atualizado com sucesso:', updateResult.data)
      addToast('success', 'Perfil atualizado com sucesso!')
      setIsEditing(false)
      
      // Atualiza o estado local
      setPerfil(prev => prev ? { ...prev, ...form } : null)
    } catch (error) {
      console.error('Erro inesperado ao atualizar perfil:', {
        error,
        type: typeof error,
        message: error instanceof Error ? error.message : 'Erro desconhecido',
        stack: error instanceof Error ? error.stack : undefined,
        stringified: JSON.stringify(error, null, 2)
      })
      addToast('error', 'Erro inesperado ao salvar alterações')
    } finally {
      setSaving(false)
    }
  }

  if (loading || authLoading) {
    return (
      <MenuLayout>
        <div className="p-8">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
            <div className="space-y-4">
              <div className="h-4 bg-gray-200 rounded w-3/4"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2"></div>
              <div className="h-4 bg-gray-200 rounded w-2/3"></div>
            </div>
          </div>
        </div>
      </MenuLayout>
    )
  }

  return (
    <MenuLayout>
      <div className="p-8">
        <div className="max-w-2xl mx-auto">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold text-gray-900">Meu Perfil</h1>
            <button
              onClick={() => setIsEditing(!isEditing)}
              className="px-4 py-2 bg-black text-white rounded-md hover:bg-gray-800 transition-colors"
            >
              {isEditing ? 'Cancelar' : 'Editar'}
            </button>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nome Completo
                  </label>
                  <input
                    type="text"
                    name="nome"
                    value={form.nome}
                    onChange={handleChange}
                    disabled={!isEditing}
                    className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      isEditing 
                        ? 'border-gray-300 bg-white' 
                        : 'border-gray-200 bg-gray-50 cursor-not-allowed'
                    }`}
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    E-mail
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={form.email}
                    onChange={handleChange}
                    disabled={!isEditing}
                    className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      isEditing 
                        ? 'border-gray-300 bg-white' 
                        : 'border-gray-200 bg-gray-50 cursor-not-allowed'
                    }`}
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    CPF
                  </label>
                  <input
                    type="text"
                    name="cpf"
                    value={form.cpf}
                    onChange={handleChange}
                    disabled={!isEditing}
                    className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      isEditing 
                        ? 'border-gray-300 bg-white' 
                        : 'border-gray-200 bg-gray-50 cursor-not-allowed'
                    }`}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Telefone
                  </label>
                  <input
                    type="text"
                    name="telefone"
                    value={form.telefone}
                    onChange={handleChange}
                    disabled={!isEditing}
                    className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      isEditing 
                        ? 'border-gray-300 bg-white' 
                        : 'border-gray-200 bg-gray-50 cursor-not-allowed'
                    }`}
                  />
                </div>
              </div>

              <div className="bg-gray-50 rounded-md p-4">
                <h3 className="text-sm font-medium text-gray-700 mb-2">Informações do Sistema</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-500">Nível de Acesso:</span>
                    <span className="ml-2 font-medium text-gray-900 capitalize">
                      {perfil?.nivel || 'Não definido'}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-500">ID do Usuário:</span>
                    <span className="ml-2 font-medium text-gray-900">
                      {perfil?.id || 'Não disponível'}
                    </span>
                  </div>
                </div>
              </div>

              {isEditing && (
                <div className="flex justify-end space-x-3 pt-4 border-t">
                  <button
                    type="button"
                    onClick={() => setIsEditing(false)}
                    className="px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50"
                  >
                    {saving ? 'Salvando...' : 'Salvar Alterações'}
                  </button>
                </div>
              )}
            </form>
          </div>
        </div>
      </div>
    </MenuLayout>
  )
}