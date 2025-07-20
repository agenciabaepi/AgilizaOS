'use client'

import {
  Pencil,
  Trash2,
} from 'lucide-react'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabaseClient'
import MenuLayout from '@/components/MenuLayout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useSession } from '@supabase/auth-helpers-react'
import { Session } from '@supabase/auth-helpers-nextjs'
import ProtectedRoute from '@/components/ProtectedRoute';
import { useRouter } from 'next/navigation';

export default function UsuariosPage() {
  const session: Session | null = useSession()
  const router = useRouter();

  const [nome, setNome] = useState('')
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [cpf, setCpf] = useState('')
  const [whatsapp, setWhatsapp] = useState('')
  const [nivel, setNivel] = useState('tecnico')
  const [empresaId, setEmpresaId] = useState('')
  const [usuarios, setUsuarios] = useState<Array<{
    id: string
    nome: string
    email: string
    cpf: string
    whatsapp: string
    nivel: string
    auth_user_id: string
  }>>([])
  const [mostrarFormulario, setMostrarFormulario] = useState(false)

  const fetchUsuarios = async () => {
    try {
      if (!session?.user?.id) {
        throw new Error('Usuário não autenticado')
      }

      const {
        data: meuUsuario,
        error: erroUsuario,
      } = await supabase
        .from('usuarios')
        .select('empresa_id')
        .eq('auth_user_id', session.user.id)
        .single()

      if (erroUsuario) throw erroUsuario
      setEmpresaId(meuUsuario?.empresa_id)

      const { data, error } = await supabase
        .from('usuarios')
        .select('id, nome, email, cpf, whatsapp, nivel, auth_user_id')
        .eq('empresa_id', meuUsuario?.empresa_id)

      if (error) throw error

      const usuariosFiltrados = data.filter((u) => u.auth_user_id !== session?.user?.id)
      setUsuarios(usuariosFiltrados)
    } catch (error) {
      console.error('Erro ao buscar usuários:', error)
    }
  }

  const handleDeleteUsuario = async (id: string) => {
    if (id === session?.user?.id) {
      alert('Você não pode excluir seu próprio usuário.')
      return
    }
    const confirmar = confirm('Tem certeza que deseja excluir este usuário?')
    if (!confirmar) return

    try {
      const { error } = await supabase.from('usuarios').delete().eq('id', id)
      if (error) throw error
      fetchUsuarios()
    } catch (error: unknown) {
      console.error('Erro ao excluir usuário:', error instanceof Error ? error.message : 'Erro desconhecido')
    }
  }

  useEffect(() => {
    if (session?.user?.id) {
      fetchUsuarios()
    }
  }, [session])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const response = await fetch('/api/usuarios/cadastrar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nome,
          email,
          senha,
          cpf,
          whatsapp,
          nivel,
          empresa_id: empresaId,
        }),
      })

      const data = await response.json()
      if (!response.ok) {
        console.error('Erro detalhado:', data)
        throw new Error(data.message || 'Erro ao cadastrar usuário.')
      }

      alert('Usuário cadastrado com sucesso!')
      setNome('')
      setEmail('')
      setSenha('')
      setCpf('')
      setWhatsapp('')
      setNivel('tecnico')

      // Atualiza lista
      fetchUsuarios()
    } catch (error: unknown) {
      console.error('Erro ao cadastrar usuário:', error instanceof Error ? error.message : 'Erro desconhecido')
    }
  }

  return (
    <ProtectedRoute allowedLevels={['admin']}>
      <MenuLayout>
        <main className="p-4 sm:p-6 md:p-10">
          <Card>
            <CardHeader>
              <CardTitle>Gerenciar Usuários</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-500">
                Aqui você poderá adicionar, editar e remover usuários vinculados à empresa.
              </p>
              <div className="flex justify-between items-center mb-4">
                <p className="text-sm text-gray-600">Usuários cadastrados na empresa:</p>
                <button
                  onClick={() => setMostrarFormulario(!mostrarFormulario)}
                  className="bg-black text-white text-sm px-4 py-2 rounded hover:bg-gray-800 transition"
                >
                  {mostrarFormulario ? 'Cancelar' : '+ Adicionar novo usuário'}
                </button>
              </div>
              {mostrarFormulario && (
                <form className="mt-4 space-y-4 bg-gray-100 p-4 rounded" onSubmit={handleSubmit}>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm text-gray-700">Nome</label>
                      <input
                        type="text"
                        value={nome}
                        onChange={(e) => setNome(e.target.value)}
                        className="w-full border px-3 py-2 rounded"
                        required
                      />
                    </div>
                    <div>
                      <label className="text-sm text-gray-700">E-mail</label>
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full border px-3 py-2 rounded"
                        required
                      />
                    </div>
                    <div>
                      <label className="text-sm text-gray-700">Senha</label>
                      <input
                        type="password"
                        value={senha}
                        onChange={(e) => setSenha(e.target.value)}
                        className="w-full border px-3 py-2 rounded"
                        required
                      />
                    </div>
                    <div>
                      <label className="text-sm text-gray-700">CPF</label>
                      <input
                        type="text"
                        value={cpf}
                        onChange={(e) => setCpf(e.target.value)}
                        className="w-full border px-3 py-2 rounded"
                        required
                      />
                    </div>
                    <div>
                      <label className="text-sm text-gray-700">WhatsApp</label>
                      <input
                        type="text"
                        value={whatsapp}
                        onChange={(e) => setWhatsapp(e.target.value)}
                        className="w-full border px-3 py-2 rounded"
                        required
                      />
                    </div>
                    <div>
                      <label className="text-sm text-gray-700">Nível</label>
                      <select
                        value={nivel}
                        onChange={(e) => setNivel(e.target.value)}
                        className="w-full border px-3 py-2 rounded"
                        required
                      >
                        <option value="tecnico">Técnico</option>
                        <option value="atendente">Atendente</option>
                        <option value="financeiro">Financeiro</option>
                        <option value="admin">Administrador</option>
                      </select>
                    </div>
                  </div>
                  <button
                    type="submit"
                    className="bg-black text-white px-4 py-2 rounded hover:bg-gray-800 transition"
                  >
                    Cadastrar usuário
                  </button>
                </form>
              )}
              {empresaId && (
                <div className="space-y-2 mt-4">
                  {usuarios.map((usuario) => (
                    <div key={usuario.id} className="flex items-center justify-between p-4 bg-white rounded shadow hover:shadow-md transition">
                      <div className="flex items-center gap-4">
                        <div className="flex items-center justify-center w-10 h-10 bg-black text-white rounded-full">
                          {usuario.nome.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-gray-900">{usuario.nome}</p>
                          <p className="text-xs text-gray-500">{usuario.email}</p>
                          <p className="text-xs text-gray-400 capitalize">{usuario.nivel}</p>
                        </div>
                      </div>
                      <div className="flex gap-3">
                        <button
                          title="Editar"
                          className={`text-gray-600 transition ${usuario.id === session?.user?.id ? 'opacity-40 cursor-not-allowed' : 'hover:text-blue-600'}`}
                          onClick={() => {
                            if (usuario.id !== session?.user?.id) {
                              router.push(`/configuracoes/usuarios/${usuario.id}/editar`)
                            }
                          }}
                          disabled={usuario.id === session?.user?.id}
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        {/* Botões de ativar/desativar e permissões só serão exibidos quando modo de edição estiver implementado */}
                        {/* <button
                          title="Ativar/Desativar"
                          className="text-gray-600 hover:text-yellow-600 transition"
                          onClick={() => alert('Função de ativar/desativar ainda não implementada')}
                        >
                          <RotateCcw className="w-4 h-4" />
                        </button>
                        <button
                          title="Permissões"
                          className="text-gray-600 hover:text-indigo-600 transition"
                          onClick={() => alert('Função de permissões ainda não implementada')}
                        >
                          <Shield className="w-4 h-4" />
                        </button> */}
                        <button
                          title="Excluir"
                          className={`text-gray-600 transition ${usuario.id === session?.user?.id ? 'opacity-40 cursor-not-allowed' : 'hover:text-red-600'}`}
                          onClick={() => {
                            if (usuario.id !== session?.user?.id) {
                              handleDeleteUsuario(usuario.id)
                            }
                          }}
                          disabled={usuario.id === session?.user?.id}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </main>
      </MenuLayout>
    </ProtectedRoute>
  )
}