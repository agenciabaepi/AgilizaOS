'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/Button';
import { useToast } from '@/components/Toast';
import { FiPlus, FiEdit, FiTrash2, FiSearch, FiFilter, FiRefreshCw, FiEye, FiEyeOff } from 'react-icons/fi';

interface ChecklistItem {
  id: string;
  nome: string;
  descricao?: string;
  categoria: string;
  ativo: boolean;
  ordem: number;
  obrigatorio: boolean;
  created_at: string;
  updated_at: string;
}

const categorias = [
  { value: 'geral', label: 'Geral' },
  { value: 'audio', label: 'Áudio' },
  { value: 'video', label: 'Vídeo' },
  { value: 'conectividade', label: 'Conectividade' },
  { value: 'hardware', label: 'Hardware' },
  { value: 'seguranca', label: 'Segurança' },
  { value: 'energia', label: 'Energia' },
  { value: 'display', label: 'Display' },
];

export default function ChecklistConfigPage() {
  const { empresaData } = useAuth();
  const { addToast } = useToast();
  
  const [itens, setItens] = useState<ChecklistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategoria, setFilterCategoria] = useState('');
  const [filterAtivo, setFilterAtivo] = useState('');
  
  // Estados para modal de edição/criação
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState<ChecklistItem | null>(null);
  const [formData, setFormData] = useState({
    nome: '',
    descricao: '',
    categoria: 'geral',
    ordem: 0,
    obrigatorio: false,
    ativo: true
  });

  // Buscar itens de checklist
  const fetchItens = useCallback(async (forceRefresh = false) => {
    if (!empresaData?.id) return;
    
    setLoading(true);
    try {
      const params = new URLSearchParams({
        empresa_id: empresaData.id,
        _t: forceRefresh ? Date.now().toString() : Date.now().toString()
      });
      
      if (filterAtivo !== '') {
        params.append('ativo', filterAtivo);
      }
      
      if (filterCategoria) {
        params.append('categoria', filterCategoria);
      }

      console.log('🔍 Buscando itens de checklist com params:', params.toString());
      
      const response = await fetch(`/api/checklist-itens?${params}`, {
        method: 'GET',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0',
          'Content-Type': 'application/json'
        },
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      setItens(data.itens || []);
      console.log('✅ Itens de checklist carregados:', data.itens?.length || 0);
      
    } catch (error) {
      console.error('❌ Erro ao buscar itens de checklist:', error);
      addToast('error', `Erro ao carregar itens de checklist: ${error instanceof Error ? error.message : 'Erro de conexão'}`);
    } finally {
      setLoading(false);
    }
  }, [empresaData?.id, filterAtivo, filterCategoria, addToast]);

  useEffect(() => {
    fetchItens();
  }, [fetchItens]);

  // Filtrar itens por busca
  const filteredItens = itens.filter(item =>
    item.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (item.descricao && item.descricao.toLowerCase().includes(searchTerm.toLowerCase())) ||
    item.categoria.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Abrir modal para criar/editar
  const openModal = (item?: ChecklistItem) => {
    if (item) {
      setEditingItem(item);
      setFormData({
        nome: item.nome,
        descricao: item.descricao || '',
        categoria: item.categoria,
        ordem: item.ordem,
        obrigatorio: item.obrigatorio,
        ativo: item.ativo
      });
    } else {
      setEditingItem(null);
      setFormData({
        nome: '',
        descricao: '',
        categoria: 'geral',
        ordem: itens.length,
        obrigatorio: false,
        ativo: true
      });
    }
    setShowModal(true);
  };

  // Salvar item
  const handleSave = async () => {
    if (!formData.nome) {
      addToast('error', 'Nome é obrigatório');
      return;
    }

    try {
      const url = `/api/checklist-itens`;
      const method = editingItem ? 'PUT' : 'POST';
      
      const body = editingItem 
        ? { 
            id: editingItem.id, 
            nome: formData.nome, 
            descricao: formData.descricao, 
            categoria: formData.categoria,
            ordem: formData.ordem,
            obrigatorio: formData.obrigatorio,
            ativo: formData.ativo
          }
        : { 
            nome: formData.nome, 
            descricao: formData.descricao, 
            categoria: formData.categoria,
            ordem: formData.ordem,
            obrigatorio: formData.obrigatorio,
            ativo: formData.ativo,
            empresa_id: empresaData.id
          };

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      const data = await response.json();

      if (response.ok) {
        addToast(
          'success',
          editingItem 
            ? 'Item atualizado com sucesso!' 
            : 'Item criado com sucesso!'
        );
        setShowModal(false);
        fetchItens();
      } else if (response.status === 409) {
        addToast('error', 'Já existe um item com este nome. Escolha outro nome.');
      } else {
        addToast('error', data.error || 'Erro ao salvar item');
      }
    } catch (error) {
      console.error('Erro ao salvar item:', error);
      addToast('error', 'Erro ao salvar item');
    }
  };

  // Deletar item
  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja deletar este item?')) return;

    try {
      const response = await fetch(`/api/checklist-itens?id=${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        addToast('success', 'Item deletado com sucesso!');
        fetchItens();
      } else {
        const data = await response.json();
        addToast('error', data.error || 'Erro ao deletar item');
      }
    } catch (error) {
      console.error('Erro ao deletar item:', error);
      addToast('error', 'Erro ao deletar item');
    }
  };

  // Alternar status ativo
  const toggleAtivo = async (item: ChecklistItem) => {
    try {
      const response = await fetch('/api/checklist-itens', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: item.id,
          ativo: !item.ativo
        }),
      });

      if (response.ok) {
        addToast('success', `Item ${!item.ativo ? 'ativado' : 'desativado'} com sucesso!`);
        fetchItens();
      } else {
        const data = await response.json();
        addToast('error', data.error || 'Erro ao alterar status');
      }
    } catch (error) {
      console.error('Erro ao alterar status:', error);
      addToast('error', 'Erro ao alterar status');
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Verificar se há empresa válida */}
      {!empresaData?.id ? (
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <h2 className="text-lg font-semibold text-red-800 mb-2">Erro de Segurança</h2>
          <p className="text-red-600 mb-4">Empresa não identificada. Faça login novamente para continuar.</p>
          <button
            onClick={() => window.location.href = '/login'}
            className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg"
          >
            Fazer Login
          </button>
        </div>
      ) : (
        <>
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Configurar Checklist de Entrada</h1>
            <p className="text-gray-600">Personalize os itens de checklist que serão utilizados na entrada dos equipamentos</p>
          </div>

      {/* Filtros e busca */}
      <div className="bg-white rounded-lg shadow-sm border p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Buscar</label>
            <div className="relative">
              <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
              <input
                type="text"
                placeholder="Nome, descrição ou categoria..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Categoria</label>
            <select
              value={filterCategoria}
              onChange={(e) => setFilterCategoria(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Todas</option>
              {categorias.map(cat => (
                <option key={cat.value} value={cat.value}>{cat.label}</option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select
              value={filterAtivo}
              onChange={(e) => setFilterAtivo(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Todos</option>
              <option value="true">Ativos</option>
              <option value="false">Inativos</option>
            </select>
          </div>
          
          <div className="flex items-end space-x-2">
            <Button
              onClick={() => openModal()}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
            >
              <FiPlus size={16} className="mr-2" />
              Novo Item
            </Button>
            <Button
              onClick={() => fetchItens(true)}
              className="bg-gray-600 hover:bg-gray-700 text-white px-3"
              title="Atualizar lista"
            >
              <FiRefreshCw size={16} />
            </Button>
          </div>
        </div>
      </div>

      {/* Lista de itens */}
      <div className="bg-white rounded-lg shadow-sm border">
        {loading ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-500">Carregando itens de checklist...</p>
          </div>
        ) : filteredItens.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-gray-500 mb-4">Nenhum item de checklist encontrado</p>
            <Button
              onClick={() => openModal()}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              <FiPlus size={16} className="mr-2" />
              Adicionar Primeiro Item
            </Button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Item
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Categoria
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Ordem
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Obrigatório
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredItens.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-gray-900">{item.nome}</div>
                      {item.descricao && (
                        <div className="text-sm text-gray-500 max-w-xs truncate">{item.descricao}</div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                        {categorias.find(cat => cat.value === item.categoria)?.label || item.categoria}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{item.ordem}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        item.obrigatorio 
                          ? 'bg-red-100 text-red-800' 
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {item.obrigatorio ? 'Sim' : 'Não'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        item.ativo 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {item.ativo ? 'Ativo' : 'Inativo'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => toggleAtivo(item)}
                          className={`${item.ativo ? 'text-red-600 hover:text-red-900' : 'text-green-600 hover:text-green-900'}`}
                          title={item.ativo ? 'Desativar' : 'Ativar'}
                        >
                          {item.ativo ? <FiEyeOff size={16} /> : <FiEye size={16} />}
                        </button>
                        <button
                          onClick={() => openModal(item)}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          <FiEdit size={16} />
                        </button>
                        <button
                          onClick={() => handleDelete(item.id)}
                          className="text-red-600 hover:text-red-900"
                        >
                          <FiTrash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal de edição/criação */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              {editingItem ? 'Editar Item' : 'Novo Item'}
            </h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nome *
                </label>
                <input
                  type="text"
                  value={formData.nome}
                  onChange={(e) => setFormData(prev => ({ ...prev, nome: e.target.value }))}
                  placeholder="Ex: Alto-falante, Câmera frontal"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Descrição
                </label>
                <textarea
                  value={formData.descricao}
                  onChange={(e) => setFormData(prev => ({ ...prev, descricao: e.target.value }))}
                  placeholder="Descrição detalhada do item"
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Categoria
                </label>
                <select
                  value={formData.categoria}
                  onChange={(e) => setFormData(prev => ({ ...prev, categoria: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  {categorias.map(cat => (
                    <option key={cat.value} value={cat.value}>{cat.label}</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Ordem
                </label>
                <input
                  type="number"
                  value={formData.ordem}
                  onChange={(e) => setFormData(prev => ({ ...prev, ordem: parseInt(e.target.value) || 0 }))}
                  placeholder="0"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="obrigatorio"
                  checked={formData.obrigatorio}
                  onChange={(e) => setFormData(prev => ({ ...prev, obrigatorio: e.target.checked }))}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="obrigatorio" className="ml-2 block text-sm text-gray-700">
                  Item obrigatório
                </label>
              </div>
              
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="ativo"
                  checked={formData.ativo}
                  onChange={(e) => setFormData(prev => ({ ...prev, ativo: e.target.checked }))}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="ativo" className="ml-2 block text-sm text-gray-700">
                  Item ativo (disponível para uso)
                </label>
              </div>
            </div>
            
            <div className="flex justify-end space-x-3 mt-6">
              <Button
                onClick={() => setShowModal(false)}
                className="bg-gray-300 hover:bg-gray-400 text-gray-700"
              >
                Cancelar
              </Button>
              <Button
                onClick={handleSave}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                {editingItem ? 'Atualizar' : 'Criar'}
              </Button>
            </div>
          </div>
        </div>
      )}
        </>
      )}
    </div>
  );
}
