// apps/web/src/app/criar-empresa/page.tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function CriarEmpresaPage() {
  const router = useRouter()
  const [nome, setNome] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    const res = await fetch('/api/empresa/cadastrar', {
      method: 'POST',
      body: JSON.stringify({ nome }),
    })

    if (res.ok) {
      router.push('/dashboard/admin') // ou outro redirecionamento
    } else {
      alert('Erro ao cadastrar empresa')
    }

    setLoading(false)
  }

  return (
    <div className="max-w-lg mx-auto mt-10 p-6 bg-white rounded shadow">
      <h1 className="text-2xl font-bold mb-4">Criar Empresa</h1>
      <form onSubmit={handleSubmit}>
        <label className="block mb-2 text-sm font-medium">Nome da Empresa</label>
        <input
          type="text"
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          className="w-full px-4 py-2 border rounded mb-4"
          required
        />
        <button
          type="submit"
          className="bg-black text-white px-6 py-2 rounded"
          disabled={loading}
        >
          {loading ? 'Salvando...' : 'Criar'}
        </button>
      </form>
    </div>
  )
}