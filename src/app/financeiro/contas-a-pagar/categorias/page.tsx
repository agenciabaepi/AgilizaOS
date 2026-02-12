'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabaseClient';
import { useToast } from '@/components/Toast';
import MenuLayout from '@/components/MenuLayout';
import AuthGuard from '@/components/AuthGuard';
import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
import { Select } from '@/components/Select';
import { FiPlus, FiEdit, FiTrash2, FiArrowLeft } from 'react-icons/fi';
import { useRouter } from 'next/navigation';

interface Categoria {
  id: string;
  nome: string;
  tipo: 'fixa' | 'variavel' | 'pecas';
  cor: string;
  empresa_id: string;
  ativo?: boolean;
}

const CORES_PREDEFINIDAS = [
  '#ef4444', '#f97316', '#eab308', '#22c55e', '#14b8a6',
  '#3b82f6', '#8b5cf6', '#ec4899', '#6b7280', '#1f2937'
];

function CategoriasPageContent() {
  const { empresaData } = useAuth();
  const { addToast } = useToast();
  const router = useRouter();
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingCategoria, setEditingCategoria] = useState<Categoria | null>(null);
  const [formData, setFormData] = useState({ nome: '', tipo: 'variavel' as Categoria['tipo'], cor: '#3b82f6' });

  const loadCategorias = useCallback(async () => {
    if (!empresaData?.id) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('categorias_contas')
        .select('*')
        .eq('empresa_id', empresaData.id)
        .order('nome');
      if (error) throw error;
      setCategorias((data || []).filter((c: Categoria) => c.ativo !== false));
    } catch (e: unknown) {
      addToast('error', e instanceof Error ? e.message : 'Erro ao carregar categorias');
      setCategorias([]);
    } finally {
      setLoading(false);
    }
  }, [empresaData?.id, addToast]);

  useEffect(() => {
    loadCategorias();
  }, [loadCategorias]);

  const resetForm = () => {
    setFormData({ nome: '', tipo: 'variavel', cor: '#3b82f6' });
    setEditingCategoria(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!empresaData?.id) return;
    try {
      const payload = {
        empresa_id: empresaData.id,
        nome: formData.nome.trim(),
        tipo: formData.tipo,
        cor: formData.cor,
        ativo: true
      };
      if (editingCategoria) {
        const { error } = await supabase
          .from('categorias_contas')
          .update(payload)
          .eq('id', editingCategoria.id);
        if (error) throw error;
        addToast('success', 'Categoria atualizada com sucesso!');
      } else {
        const { error } = await supabase.from('categorias_contas').insert(payload);
        if (error) throw error;
        addToast('success', 'Categoria cadastrada com sucesso!');
      }
      setShowModal(false);
      resetForm();
      loadCategorias();
    } catch (e: unknown) {
      addToast('error', e instanceof Error ? e.message : 'Erro ao salvar categoria');
    }
  };

  const handleEdit = (cat: Categoria) => {
    setEditingCategoria(cat);
    setFormData({ nome: cat.nome, tipo: cat.tipo, cor: cat.cor || '#3b82f6' });
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir esta categoria? Contas vinculadas podem ficar sem categoria.')) return;
    try {
      const { error } = await supabase
        .from('categorias_contas')
        .update({ ativo: false })
        .eq('id', id);
      if (error) throw error;
      addToast('success', 'Categoria excluída com sucesso!');
      loadCategorias();
    } catch (e: unknown) {
      addToast('error', e instanceof Error ? e.message : 'Erro ao excluir categoria');
    }
  };

  const openModal = () => {
    resetForm();
    setShowModal(true);
  };

  if (loading) {
    return (
      <MenuLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
        </div>
      </MenuLayout>
    );
  }

  return (
    <MenuLayout>
      <div className="p-6">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-4">
            <Button variant="outline" size="sm" onClick={() => router.push('/financeiro/contas-a-pagar')}>
              <FiArrowLeft className="w-4 h-4 mr-2" />
              Voltar
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Categorias de Contas</h1>
              <p className="text-gray-600">Organize as categorias usadas nas contas a pagar</p>
            </div>
          </div>
          <Button onClick={openModal} size="sm">
            <FiPlus className="w-4 h-4 mr-2" />
            Nova Categoria
          </Button>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nome</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tipo</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Cor</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Ações</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {categorias.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-gray-500">
                    Nenhuma categoria cadastrada. Clique em &quot;Nova Categoria&quot; para criar.
                  </td>
                </tr>
              ) : (
                categorias.map((cat) => (
                  <tr key={cat.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{cat.nome}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 capitalize">{cat.tipo}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className="inline-block w-6 h-6 rounded border border-gray-300"
                        style={{ backgroundColor: cat.cor || '#6b7280' }}
                        title={cat.cor}
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                      <button
                        type="button"
                        onClick={() => handleEdit(cat)}
                        className="text-blue-600 hover:text-blue-800 mr-4"
                      >
                        <FiEdit className="w-4 h-4 inline" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(cat.id)}
                        className="text-red-600 hover:text-red-800"
                      >
                        <FiTrash2 className="w-4 h-4 inline" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {showModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                {editingCategoria ? 'Editar Categoria' : 'Nova Categoria'}
              </h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nome *</label>
                  <Input
                    value={formData.nome}
                    onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                    placeholder="Ex: Aluguel, Energia"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tipo</label>
                  <Select
                    value={formData.tipo}
                    onChange={(e) => setFormData({ ...formData, tipo: e.target.value as Categoria['tipo'] })}
                  >
                    <option value="fixa">Fixa</option>
                    <option value="variavel">Variável</option>
                    <option value="pecas">Peças</option>
                  </Select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Cor</label>
                  <div className="flex flex-wrap gap-2">
                    {CORES_PREDEFINIDAS.map((cor) => (
                      <button
                        key={cor}
                        type="button"
                        onClick={() => setFormData({ ...formData, cor })}
                        className={`w-8 h-8 rounded-full border-2 ${formData.cor === cor ? 'border-gray-900' : 'border-gray-200'}`}
                        style={{ backgroundColor: cor }}
                      />
                    ))}
                  </div>
                  <Input
                    type="color"
                    value={formData.cor}
                    onChange={(e) => setFormData({ ...formData, cor: e.target.value })}
                    className="mt-2 h-10 w-full p-1 cursor-pointer"
                  />
                </div>
                <div className="flex gap-2 pt-4">
                  <Button type="submit">{editingCategoria ? 'Salvar' : 'Cadastrar'}</Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => { setShowModal(false); resetForm(); }}
                  >
                    Cancelar
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </MenuLayout>
  );
}

export default function CategoriasPage() {
  return (
    <AuthGuard>
      <CategoriasPageContent />
    </AuthGuard>
  );
}
