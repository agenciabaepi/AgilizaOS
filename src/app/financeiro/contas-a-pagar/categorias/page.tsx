'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabaseClient';
import { useToast } from '@/components/Toast';
import MenuLayout from '@/components/MenuLayout';
import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
import { Select } from '@/components/Select';
import { FiPlus, FiEdit, FiTrash2, FiArrowLeft, FiSave, FiX } from 'react-icons/fi';
import { useRouter } from 'next/navigation';

interface Categoria {
  id: string;
  nome: string;
  tipo: 'fixa' | 'variavel' | 'pecas';
  cor: string;
  descricao?: string;
  ativo: boolean;
}

export default function CategoriasPage() {
  const { empresaData } = useAuth();
  const { addToast } = useToast();
  const router = useRouter();
  
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingCategoria, setEditingCategoria] = useState<Categoria | null>(null);
  const [filtroTipo, setFiltroTipo] = useState('');
  
  const [formData, setFormData] = useState({
    nome: '',
    tipo: 'fixa' as 'fixa' | 'variavel' | 'pecas',
    cor: '#3B82F6',
    descricao: ''
  });

  useEffect(() => {
    if (empresaData?.id) {
      loadCategorias();
    }
  }, [empresaData?.id]);

  const loadCategorias = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('categorias_contas')
        .select('*')
        .eq('empresa_id', empresaData.id)
        .order('nome');
      
      if (error) throw error;
      
      setCategorias(data || []);
      
    } catch (error) {
      console.error('Erro ao carregar categorias:', error);
      addToast('error', 'Erro ao carregar categorias');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const categoriaData = {
        empresa_id: empresaData.id,
        nome: formData.nome,
        tipo: formData.tipo,
        cor: formData.cor,
        descricao: formData.descricao || null
      };

      if (editingCategoria) {
        const { error } = await supabase
          .from('categorias_contas')
          .update(categoriaData)
          .eq('id', editingCategoria.id);
        
        if (error) throw error;
        addToast('success', 'Categoria atualizada com sucesso!');
      } else {
        const { error } = await supabase
          .from('categorias_contas')
          .insert(categoriaData);
        
        if (error) throw error;
        addToast('success', 'Categoria criada com sucesso!');
      }
      
      setShowModal(false);
      setEditingCategoria(null);
      resetForm();
      loadCategorias();
      
    } catch (error) {
      console.error('Erro ao salvar categoria:', error);
      addToast('error', 'Erro ao salvar categoria');
    }
  };

  const handleEdit = (categoria: Categoria) => {
    setEditingCategoria(categoria);
    setFormData({
      nome: categoria.nome,
      tipo: categoria.tipo,
      cor: categoria.cor,
      descricao: categoria.descricao || ''
    });
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir esta categoria?')) return;
    
    try {
      const { error } = await supabase
        .from('categorias_contas')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      
      addToast('success', 'Categoria excluída com sucesso!');
      loadCategorias();
      
    } catch (error) {
      console.error('Erro ao excluir categoria:', error);
      addToast('error', 'Erro ao excluir categoria');
    }
  };

  const handleToggleStatus = async (id: string, ativo: boolean) => {
    try {
      const { error } = await supabase
        .from('categorias_contas')
        .update({ ativo: !ativo })
        .eq('id', id);
      
      if (error) throw error;
      
      addToast('success', `Categoria ${!ativo ? 'ativada' : 'desativada'} com sucesso!`);
      loadCategorias();
      
    } catch (error) {
      console.error('Erro ao alterar status:', error);
      addToast('error', 'Erro ao alterar status');
    }
  };

  const resetForm = () => {
    setFormData({
      nome: '',
      tipo: 'fixa',
      cor: '#3B82F6',
      descricao: ''
    });
  };

  const openModal = () => {
    setEditingCategoria(null);
    resetForm();
    setShowModal(true);
  };

  const filteredCategorias = categorias.filter(cat => 
    !filtroTipo || cat.tipo === filtroTipo
  );

  const coresPredefinidas = [
    '#EF4444', '#F59E0B', '#10B981', '#3B82F6', '#8B5CF6',
    '#EC4899', '#06B6D4', '#84CC16', '#F97316', '#6366F1',
    '#64748B', '#6B7280'
  ];

  if (loading) {
    return (
      <MenuLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-2 text-gray-600">Carregando categorias...</p>
          </div>
        </div>
      </MenuLayout>
    );
  }

  return (
    <MenuLayout>
      <div className="p-6">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Button
            onClick={() => router.back()}
            variant="outline"
            size="sm"
          >
            <FiArrowLeft className="w-4 h-4 mr-2" />
            Voltar
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Categorias de Contas</h1>
            <p className="text-gray-600">Gerencie as categorias para organizar suas contas</p>
          </div>
        </div>

        {/* Filtros e Ações */}
        <div className="flex justify-between items-center mb-6">
          <div className="flex gap-4">
            <Select
              value={filtroTipo}
              onChange={(e) => setFiltroTipo(e.target.value)}
            >
              <option value="">Todos os tipos</option>
              <option value="fixa">Fixa</option>
              <option value="variavel">Variável</option>
              <option value="pecas">Peças</option>
            </Select>
          </div>
          
          <Button onClick={openModal}>
            <FiPlus className="w-4 h-4 mr-2" />
            Nova Categoria
          </Button>
        </div>

        {/* Lista de Categorias */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredCategorias.map((categoria) => (
            <div key={categoria.id} className="bg-white rounded-lg border border-gray-200 p-4">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div 
                    className="w-4 h-4 rounded-full"
                    style={{ backgroundColor: categoria.cor }}
                  ></div>
                  <h3 className="font-semibold text-gray-900">{categoria.nome}</h3>
                </div>
                
                <div className="flex gap-1">
                  <button
                    onClick={() => handleEdit(categoria)}
                    className="text-blue-600 hover:text-blue-900"
                    title="Editar"
                  >
                    <FiEdit className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(categoria.id)}
                    className="text-red-600 hover:text-red-900"
                    title="Excluir"
                  >
                    <FiTrash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-600">Tipo:</span>
                  <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                    categoria.tipo === 'fixa' 
                      ? 'bg-blue-100 text-blue-800'
                      : categoria.tipo === 'variavel'
                      ? 'bg-yellow-100 text-yellow-800'
                      : 'bg-green-100 text-green-800'
                  }`}>
                    {categoria.tipo === 'fixa' ? 'Fixa' : 
                     categoria.tipo === 'variavel' ? 'Variável' : 'Peças'}
                  </span>
                </div>
                
                {categoria.descricao && (
                  <p className="text-sm text-gray-600">{categoria.descricao}</p>
                )}
                
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-600">Status:</span>
                  <button
                    onClick={() => handleToggleStatus(categoria.id, categoria.ativo)}
                    className={`px-2 py-1 text-xs font-semibold rounded-full ${
                      categoria.ativo 
                        ? 'bg-green-100 text-green-800'
                        : 'bg-red-100 text-red-800'
                    }`}
                  >
                    {categoria.ativo ? 'Ativa' : 'Inativa'}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {filteredCategorias.length === 0 && (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <FiPlus className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Nenhuma categoria encontrada
            </h3>
            <p className="text-gray-600 mb-4">
              {filtroTipo ? 'Tente ajustar os filtros ou' : ''} Crie sua primeira categoria para começar
            </p>
            <Button onClick={openModal}>
              <FiPlus className="w-4 h-4 mr-2" />
              Nova Categoria
            </Button>
          </div>
        )}

        {/* Modal de Cadastro/Edição */}
        {showModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md">
              <h2 className="text-xl font-bold mb-4">
                {editingCategoria ? 'Editar Categoria' : 'Nova Categoria'}
              </h2>
              
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nome *
                  </label>
                  <Input
                    value={formData.nome}
                    onChange={(e) => setFormData({...formData, nome: e.target.value})}
                    required
                    placeholder="Ex: Aluguel"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tipo *
                  </label>
                  <Select
                    value={formData.tipo}
                    onChange={(e) => setFormData({...formData, tipo: e.target.value as any})}
                    required
                  >
                    <option value="fixa">Fixa</option>
                    <option value="variavel">Variável</option>
                    <option value="pecas">Peças</option>
                  </Select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Cor
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={formData.cor}
                      onChange={(e) => setFormData({...formData, cor: e.target.value})}
                      className="w-12 h-8 border border-gray-300 rounded cursor-pointer"
                    />
                    <span className="text-sm text-gray-600">{formData.cor}</span>
                  </div>
                  
                  <div className="mt-2">
                    <p className="text-sm text-gray-600 mb-2">Cores predefinidas:</p>
                    <div className="flex gap-2 flex-wrap">
                      {coresPredefinidas.map(cor => (
                        <button
                          key={cor}
                          type="button"
                          onClick={() => setFormData({...formData, cor})}
                          className={`w-6 h-6 rounded-full border-2 ${
                            formData.cor === cor ? 'border-gray-400' : 'border-gray-200'
                          }`}
                          style={{ backgroundColor: cor }}
                          title={cor}
                        />
                      ))}
                    </div>
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Descrição
                  </label>
                  <textarea
                    value={formData.descricao}
                    onChange={(e) => setFormData({...formData, descricao: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    rows={3}
                    placeholder="Descrição da categoria..."
                  />
                </div>
                
                <div className="flex justify-end gap-2 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowModal(false)}
                  >
                    Cancelar
                  </Button>
                  <Button type="submit">
                    <FiSave className="w-4 h-4 mr-2" />
                    {editingCategoria ? 'Atualizar' : 'Criar'}
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
