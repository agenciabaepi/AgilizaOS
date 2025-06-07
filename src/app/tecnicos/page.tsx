'use client';

import MenuLayout from '@/components/MenuLayout';
import { supabase } from '@/lib/supabaseClient';

// Função de cadastro de técnico via API backend
async function cadastrarTecnico({ nome, email, senha, empresa_id }: { nome: string, email: string, senha: string, empresa_id: string }) {
  try {
    const response = await fetch('/api/cadastrarTecnico', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nome, email, senha, empresa_id }),
    });

    const result = await response.json();

    if (!response.ok) {
      console.error('Erro ao cadastrar técnico:', result.error);
      return { error: result.error };
    }

    return { success: true, message: result.message };
  } catch (err) {
    console.error('Erro inesperado:', err);
    return { error: err };
  }
}

import { useState, useEffect } from 'react';

interface Tecnico {
  id: string;
  nome: string;
  email: string;
  telefone: string;
}

export default function TecnicosPage() {
  const [tecnicos, setTecnicos] = useState<Tecnico[]>([]);
  const [form, setForm] = useState({ nome: '', email: '', telefone: '', senha: '' });
  const [empresaPlano, setEmpresaPlano] = useState({ maxUsuarios: 0 });
  const [empresaId, setEmpresaId] = useState<string | null>(null);

  useEffect(() => {
    const fetchEmpresa = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      const { data: empresa } = await supabase
        .from('empresas')
        .select('id, plano')
        .eq('user_id', user.id)
        .maybeSingle();

      if (empresa) {
        setEmpresaId(empresa.id);
        const plano = empresa.plano;
        let maxUsuarios = 2;
        if (plano === 'pro') maxUsuarios = 5;
        if (plano === 'avancado') maxUsuarios = 10;
        setEmpresaPlano({ maxUsuarios });
      }
    };

    const fetchTecnicos = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      const { data } = await supabase
        .from('tecnicos')
        .select('*')
        .eq('empresa_id', empresaId);

      if (data) setTecnicos(data);
    };

    fetchEmpresa();
    if (empresaId) fetchTecnicos();
  }, [empresaId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (tecnicos.length >= empresaPlano.maxUsuarios) {
      alert('Limite de técnicos atingido pelo seu plano.');
      return;
    }

    const resultado = await cadastrarTecnico({
      nome: form.nome,
      email: form.email,
      senha: form.senha,
      empresa_id: empresaId!
    });

    if (resultado.error) {
      console.error('Erro ao cadastrar técnico:', resultado.error);
    } else {
      alert('Técnico cadastrado com sucesso!');
      setForm({ nome: '', email: '', telefone: '', senha: '' });
    }
  };

  return (
    <MenuLayout>
      <div className="p-6 max-w-5xl mx-auto">
        <div className="mb-6">
          <h1 className="text-xl font-semibold text-gray-800">Cadastro de Técnicos</h1>
        </div>

        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-white p-6 rounded-lg shadow-sm mb-8">
          <input
            type="text"
            placeholder="Nome"
            value={form.nome}
            onChange={(e) => setForm({ ...form, nome: e.target.value })}
            className="p-2 border border-gray-300 rounded-md bg-gray-50 text-sm text-gray-700"
          />
          <input
            type="email"
            placeholder="Email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            className="p-2 border border-gray-300 rounded-md bg-gray-50 text-sm text-gray-700"
          />
          <input
            type="text"
            placeholder="Telefone"
            value={form.telefone}
            onChange={(e) => setForm({ ...form, telefone: e.target.value })}
            className="p-2 border border-gray-300 rounded-md bg-gray-50 text-sm text-gray-700"
          />
          <input
            type="password"
            placeholder="Senha"
            value={form.senha}
            onChange={(e) => setForm({ ...form, senha: e.target.value })}
            className="p-2 border border-gray-300 rounded-md bg-gray-50 text-sm text-gray-700"
          />
          <div className="md:col-span-2">
            <button
              type="submit"
              className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition"
            >
              Cadastrar Técnico
            </button>
          </div>
        </form>

        <section className="bg-white p-6 rounded-lg shadow-sm">
          <h2 className="text-lg font-medium text-gray-800 mb-4">Técnicos Cadastrados</h2>
          <ul className="divide-y divide-gray-200">
            {tecnicos.map((tecnico: Tecnico) => (
              <li key={tecnico.id} className="py-3 text-gray-700">
                {tecnico.nome} - {tecnico.email}
              </li>
            ))}
          </ul>
        </section>
      </div>
    </MenuLayout>
  );
}