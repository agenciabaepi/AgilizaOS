'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/context/AuthContext';
import MenuLayout from '@/components/MenuLayout';
import { useToast } from '@/components/Toast';

interface UsuarioPerfil {
  id: string;
  nome: string;
  email: string;
  cpf: string;
  telefone: string;
  nivel: string;
}

export default function PerfilPage() {
  const { user, loading: authLoading, usuarioData } = useAuth();
  const { addToast } = useToast();

  const [perfil, setPerfil] = useState<UsuarioPerfil | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [form, setForm] = useState({
    nome: '',
    email: '',
    cpf: '',
    telefone: ''
  });

  useEffect(() => {
    const fetchPerfil = async () => {
      if (authLoading) return;
      if (!user) {
        setLoading(false);
        return;
      }
      // Busca dados do usuário
      try {
        const { data, error } = await supabase
          .from('usuarios')
          .select('*')
          .eq('auth_user_id', user.id)
          .maybeSingle();
        if (error || !data) {
          addToast('error', 'Erro ao carregar dados do perfil');
          setLoading(false);
          return;
        }
        setPerfil({
          id: data.id || user.id,
          nome: data.nome || '',
          email: data.email || '',
          cpf: data.cpf || '',
          telefone: data.telefone || '',
          nivel: data.nivel || 'atendente',
        });
        setForm({
          nome: data.nome || '',
          email: data.email || '',
          cpf: data.cpf || '',
          telefone: data.telefone || ''
        });
      } catch (err) {
        addToast('error', 'Erro inesperado ao carregar perfil');
      } finally {
        setLoading(false);
      }
    };
    fetchPerfil();
  }, [user, authLoading, usuarioData, addToast]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (!user?.id) {
        addToast('error', 'Usuário não autenticado');
        setSaving(false);
        return;
      }
      const { error } = await supabase
        .from('usuarios')
        .update({
          nome: form.nome,
          email: form.email,
          cpf: form.cpf || null,
          telefone: form.telefone || null
        })
        .eq('auth_user_id', user.id);
      if (error) {
        addToast('error', 'Erro ao salvar alterações');
        setSaving(false);
        return;
      }
      setPerfil(prev => prev ? { ...prev, ...form } : null);
      addToast('success', 'Perfil atualizado com sucesso!');
      setIsEditing(false);
    } catch (err) {
      addToast('error', 'Erro inesperado ao salvar alterações');
    } finally {
      setSaving(false);
    }
  };

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
    );
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
  );
} 