'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import MenuLayout from '@/components/MenuLayout';
import { useToast } from '@/components/Toast';

const AREAS_SISTEMA = [
  { key: 'dashboard', label: 'Dashboard' },
  { key: 'clientes', label: 'Clientes' },
  { key: 'ordens', label: 'Ordens de Serviço' },
  { key: 'equipamentos', label: 'Equipamentos' },
  { key: 'financeiro', label: 'Financeiro' },
  { key: 'configuracoes', label: 'Configurações' },
  { key: 'lembretes', label: 'Lembretes' },
];

export default function EditarUsuarioPage() {
  const router = useRouter();
  const params = useParams();
  const { addToast } = useToast();
  const userId = params?.id as string;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    nome: '',
    email: '',
    telefone: '',
    nivel: '',
    permissoes: [] as string[],
  });

  useEffect(() => {
    const fetchUsuario = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('usuarios')
        .select('nome, email, telefone, nivel, permissoes')
        .eq('id', userId)
        .maybeSingle();
      if (error || !data) {
        addToast('error', 'Erro ao carregar usuário');
        setLoading(false);
        return;
      }
      setForm({
        nome: data.nome || '',
        email: data.email || '',
        telefone: data.telefone || '',
        nivel: data.nivel || '',
        permissoes: data.permissoes || [],
      });
      setLoading(false);
    };
    if (userId) fetchUsuario();
  }, [userId, addToast]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handlePermissaoChange = (key: string) => {
    setForm((prev) => ({
      ...prev,
      permissoes: prev.permissoes.includes(key)
        ? prev.permissoes.filter((p) => p !== key)
        : [...prev.permissoes, key],
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const { error } = await supabase
      .from('usuarios')
      .update({
        nome: form.nome,
        email: form.email,
        telefone: form.telefone,
        nivel: form.nivel,
        permissoes: form.permissoes,
      })
      .eq('id', userId);
    setSaving(false);
    if (error) {
      addToast('error', 'Erro ao salvar alterações');
    } else {
      addToast('success', 'Usuário atualizado com sucesso!');
      router.push('/configuracoes/usuarios');
    }
  };

  return (
    <MenuLayout>
      <div className="max-w-xl mx-auto p-8">
        <h1 className="text-2xl font-bold mb-6">Editar Usuário</h1>
        {loading ? (
          <div>Carregando...</div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium mb-1">Nome</label>
              <input
                type="text"
                name="nome"
                value={form.nome}
                onChange={handleChange}
                className="w-full border rounded px-3 py-2"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">E-mail</label>
              <input
                type="email"
                name="email"
                value={form.email}
                onChange={handleChange}
                className="w-full border rounded px-3 py-2"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Telefone</label>
              <input
                type="text"
                name="telefone"
                value={form.telefone}
                onChange={handleChange}
                className="w-full border rounded px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Nível</label>
              <select
                name="nivel"
                value={form.nivel}
                onChange={handleChange}
                className="w-full border rounded px-3 py-2"
                required
              >
                <option value="">Selecione...</option>
                <option value="admin">Administrador</option>
                <option value="tecnico">Técnico</option>
                <option value="atendente">Atendente</option>
                <option value="financeiro">Financeiro</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Permissões de Acesso</label>
              <div className="grid grid-cols-2 gap-2">
                {AREAS_SISTEMA.map((area) => (
                  <label key={area.key} className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={form.permissoes.includes(area.key)}
                      onChange={() => handlePermissaoChange(area.key)}
                    />
                    {area.label}
                  </label>
                ))}
              </div>
            </div>
            <button
              type="submit"
              className="bg-black text-white px-4 py-2 rounded hover:bg-gray-800 transition"
              disabled={saving}
            >
              {saving ? 'Salvando...' : 'Salvar Alterações'}
            </button>
          </form>
        )}
      </div>
    </MenuLayout>
  );
} 