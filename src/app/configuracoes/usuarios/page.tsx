'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import MenuLayout from '@/components/MenuLayout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useSession } from '@supabase/auth-helpers-react'
import { Session } from '@supabase/auth-helpers-nextjs'

export default function UsuariosPage() {
  const session: Session | null = useSession()

  const [nome, setNome] = useState('')
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [cpf, setCpf] = useState('')
  const [whatsapp, setWhatsapp] = useState('')
  const [nivel, setNivel] = useState('tecnico')
  const [empresaId, setEmpresaId] = useState('')
  const [usuarios, setUsuarios] = useState<any[]>([])

  const router = useRouter()

useEffect(() => {
  const fetchUsuarios = async () => {
    try {
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
        .select('id, nome, email, cpf, whatsapp, nivel')
        .eq('empresa_id', meuUsuario?.empresa_id)

      if (error) throw error

      setUsuarios(data)
    } catch (error) {
      console.error('Erro ao buscar usuários:', error)
    }
  }

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
    } catch (error: any) {
      console.error('Erro ao cadastrar usuário:', error.message)
    }
  }

  return (
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
              <button className="bg-black text-white text-sm px-4 py-2 rounded hover:bg-gray-800 transition">
                + Adicionar novo usuário
              </button>
            </div>
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
            {empresaId && (
              <div className="space-y-2 mt-4">
                {usuarios.map((usuario) => (
                  <div key={usuario.id} className="p-4 border rounded bg-gray-50">
                    <p className="font-medium">{usuario.nome}</p>
                    <p className="text-sm text-gray-500">{usuario.email}</p>
                    <p className="text-sm text-gray-500 capitalize">{usuario.nivel}</p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </MenuLayout>
  )
}