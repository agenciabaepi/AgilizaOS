'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/Button';
import { useToast } from '@/components/Toast';
import { useAutoSync } from '@/hooks/useAutoSync';
import { FiPlus, FiEdit, FiTrash2, FiSearch, FiFilter, FiRefreshCw } from 'react-icons/fi';

interface EquipamentoTipo {
  id: string;
  nome: string;
  categoria: string;
  descricao?: string;
  ativo: boolean;
  quantidade_cadastrada: number;
  created_at: string;
  updated_at: string;
}

export default function EquipamentosConfigPage() {
  const { empresaData } = useAuth();
  const { addToast } = useToast();
  
  // Sincronização automática a cada 5 minutos
  useAutoSync({ intervalMs: 5 * 60 * 1000, enabled: true });
  
  const [equipamentos, setEquipamentos] = useState<EquipamentoTipo[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategoria, setFilterCategoria] = useState('');
  const [filterAtivo, setFilterAtivo] = useState('');
  
  // ✅ Estado para aguardar empresa estar disponível
  const aguardandoEmpresa = !empresaData?.id;
  
  // Estados para modal de edição/criação
  const [showModal, setShowModal] = useState(false);
  const [editingEquipamento, setEditingEquipamento] = useState<EquipamentoTipo | null>(null);
  const [formData, setFormData] = useState({
    nome: '',
    descricao: '',
    ativo: true
  });

  // Buscar equipamentos
  const fetchEquipamentos = async (forceRefresh = false) => {
    // ✅ AGUARDAR empresaData estar disponível
    if (!empresaData?.id) {
      console.warn('⚠️ Aguardando empresaData estar disponível...');
      setLoading(false);
      return; // Retorna sem erro, apenas aguarda
    }
    
    const empresaId = empresaData.id;
    
    setLoading(true);
    try {
      const params = new URLSearchParams({
        empresa_id: empresaId,
        _t: forceRefresh ? Date.now().toString() : Date.now().toString() // Sempre força refresh
      });
      
      if (filterAtivo !== '') {
        params.append('ativo', filterAtivo);
      }
      
      if (filterCategoria) {
        params.append('categoria', filterCategoria);
      }

      console.log('🔍 Buscando equipamentos com params:', params.toString());
      
      const response = await fetch(`/api/equipamentos-tipos?${params}`, {
        method: 'GET',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0',
          'Content-Type': 'application/json'
        },
        credentials: 'include'
      });
      
      console.log('🔍 Response status:', response.status);
      console.log('🔍 Response headers:', Object.fromEntries(response.headers.entries()));
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log('🔍 Response data:', data);
      
      setEquipamentos(data.equipamentos || []);
      console.log('✅ Equipamentos carregados:', data.equipamentos?.length || 0);
      
    } catch (error) {
      console.error('❌ Erro ao buscar equipamentos:', error);
      addToast('error', `Erro ao carregar equipamentos: ${error instanceof Error ? error.message : 'Erro de conexão'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleSincronizarContadores = async () => {
    try {
      setLoading(true);
      addToast('info', 'Sincronizando contadores...');
      
      const response = await fetch('/api/sincronizar-contadores', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const result = await response.json();

      if (response.ok) {
        addToast('success', `Sincronização concluída! ${result.contadoresAtualizados} contadores atualizados.`);
        fetchEquipamentos(); // Recarregar a lista
      } else {
        addToast('error', 'Erro ao sincronizar contadores: ' + result.error);
      }
    } catch (error) {
      console.error('Erro ao sincronizar contadores:', error);
      addToast('error', 'Erro ao sincronizar contadores');
    } finally {
      setLoading(false);
    }
  };

  // ✅ PRINCIPAL: Carregar quando empresaData estiver pronto ou filtros mudarem
  useEffect(() => {
    if (empresaData?.id) {
      console.log('🔄 Carregando equipamentos...', { 
        empresaId: empresaData.id, 
        filterCategoria, 
        filterAtivo 
      });
      fetchEquipamentos();
    }
  }, [empresaData?.id, filterCategoria, filterAtivo]);

  // Filtrar equipamentos por busca
  const filteredEquipamentos = equipamentos.filter(equipamento =>
    equipamento.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
    equipamento.categoria.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (equipamento.descricao && equipamento.descricao.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  // Abrir modal para criar/editar
  const openModal = (equipamento?: EquipamentoTipo) => {
    if (equipamento) {
      setEditingEquipamento(equipamento);
      setFormData({
        nome: equipamento.nome,
        descricao: equipamento.descricao || '',
        ativo: equipamento.ativo
      });
    } else {
      setEditingEquipamento(null);
      setFormData({
        nome: '',
        descricao: '',
        ativo: true
      });
    }
    setShowModal(true);
  };

  // Salvar equipamento
  const handleSave = async () => {
    if (!formData.nome) {
      addToast('error', 'Nome é obrigatório');
      return;
    }

    try {
      const url = editingEquipamento 
        ? `/api/equipamentos-tipos` 
        : `/api/equipamentos-tipos`;
      
      const method = editingEquipamento ? 'PUT' : 'POST';
      
      if (!empresaData?.id) {
        addToast('error', 'Erro: Empresa não identificada. Faça login novamente.');
        return;
      }
      
      const empresaId = empresaData.id;
      const body = editingEquipamento 
        ? { id: editingEquipamento.id, nome: formData.nome, categoria: formData.nome, descricao: formData.descricao, ativo: formData.ativo }
        : { nome: formData.nome, categoria: formData.nome, descricao: formData.descricao, ativo: formData.ativo, empresa_id: empresaId };

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
          editingEquipamento 
            ? 'Equipamento atualizado com sucesso!' 
            : 'Equipamento criado com sucesso!'
        );
        setShowModal(false);
        fetchEquipamentos();
      } else if (response.status === 409) {
        addToast('error', 'Já existe um equipamento com este nome. Escolha outro nome.');
      } else {
        addToast('error', data.error || 'Erro ao salvar equipamento');
      }
    } catch (error) {
      console.error('Erro ao salvar equipamento:', error);
      addToast('error', 'Erro ao salvar equipamento');
    }
  };

  // Deletar equipamento
  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja deletar este equipamento?')) return;

    try {
      const response = await fetch(`/api/equipamentos-tipos?id=${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        addToast('success', 'Equipamento deletado com sucesso!');
        fetchEquipamentos();
      } else {
        const data = await response.json();
        addToast('error', data.error || 'Erro ao deletar equipamento');
      }
    } catch (error) {
      console.error('Erro ao deletar equipamento:', error);
      addToast('error', 'Erro ao deletar equipamento');
    }
  };

  // Obter categorias únicas
  const categorias = [...new Set(equipamentos.map(e => e.categoria))];

  // ✅ AGUARDAR empresaData antes de mostrar erro
  if (aguardandoEmpresa) {
    return (
      <div className="p-6 max-w-7xl mx-auto">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <h2 className="text-lg font-semibold text-blue-800 mb-2">Carregando...</h2>
          <p className="text-blue-600">Aguardando dados da empresa...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Gerenciar Tipos de Equipamentos</h1>
        <p className="text-gray-600">Configure os tipos de equipamentos (CELULAR, NOTEBOOK, etc.) disponíveis para seleção nas OS</p>
      </div>

      {/* Filtros e busca */}
      <div className="bg-white rounded-lg shadow-sm border p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Buscar</label>
            <div className="relative">
              <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
              <input
                type="text"
                placeholder="Nome, categoria ou descrição..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
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
              Novo Equipamento
            </Button>
            <Button
              onClick={() => {
                console.log('🔄 Refresh manual dos equipamentos...');
                fetchEquipamentos();
              }}
              className="bg-gray-600 hover:bg-gray-700 text-white px-3"
              title="Atualizar lista"
            >
              <FiRefreshCw size={16} />
            </Button>
            <Button
              onClick={handleSincronizarContadores}
              className="bg-blue-600 hover:bg-blue-700 text-white px-3"
              title="Sincronizar contadores"
            >
              <FiRefreshCw size={16} />
            </Button>
          </div>
        </div>
      </div>

      {/* Lista de equipamentos */}
      <div className="bg-white rounded-lg shadow-sm border">
        {loading ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-500">Carregando equipamentos...</p>
          </div>
        ) : filteredEquipamentos.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-gray-500 mb-4">Nenhum equipamento encontrado</p>
            <Button
              onClick={() => openModal()}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              <FiPlus size={16} className="mr-2" />
              Adicionar Primeiro Equipamento
            </Button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Equipamento
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Categoria
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Descrição
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Usos
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
                {filteredEquipamentos.map((equipamento) => (
                  <tr key={equipamento.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{equipamento.nome}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                        {equipamento.categoria}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-500 max-w-xs truncate">
                        {equipamento.descricao || '-'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{equipamento.quantidade_cadastrada}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        equipamento.ativo 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {equipamento.ativo ? 'Ativo' : 'Inativo'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => openModal(equipamento)}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          <FiEdit size={16} />
                        </button>
                        <button
                          onClick={() => handleDelete(equipamento.id)}
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
              {editingEquipamento ? 'Editar Equipamento' : 'Novo Equipamento'}
            </h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nome *
                </label>
                <input
                  type="text"
                  value={formData.nome}
                  onChange={(e) => setFormData(prev => ({ ...prev, nome: e.target.value.toUpperCase() }))}
                  placeholder="Ex: CELULAR, NOTEBOOK, IMPRESSORA"
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
                  placeholder="Descrição opcional do equipamento"
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
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
                  Equipamento ativo (disponível para seleção)
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
                {editingEquipamento ? 'Atualizar' : 'Criar'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
