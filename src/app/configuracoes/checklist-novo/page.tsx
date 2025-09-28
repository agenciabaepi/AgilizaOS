'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/Button';
import { useToast } from '@/components/Toast';
import { FiPlus, FiEdit, FiTrash2, FiSearch, FiRefreshCw, FiPackage, FiList, FiChevronDown, FiChevronUp } from 'react-icons/fi';

interface ChecklistItem {
  id: string;
  nome: string;
  descricao?: string;
  categoria: string;
  equipamento_categoria?: string;
  ativo: boolean;
  ordem: number;
  obrigatorio: boolean;
  created_at: string;
  updated_at: string;
}

interface CategoriaEquipamento {
  categoria: string;
  total_equipamentos: number;
  total_checklist: number;
}

export default function ChecklistNovoPage() {
  const { empresaData } = useAuth();
  const { addToast } = useToast();
  
  const [categorias, setCategorias] = useState<CategoriaEquipamento[]>([]);
  const [categoriaSelecionada, setCategoriaSelecionada] = useState<string>('');
  const [itens, setItens] = useState<ChecklistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingItens, setLoadingItens] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Estados para modal de edição/criação
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState<ChecklistItem | null>(null);
  const [formData, setFormData] = useState({
    nome: '',
    descricao: '',
    equipamento_categoria: '',
    ordem: 0,
    obrigatorio: false,
    ativo: true
  });

  // Buscar categorias de equipamentos da empresa
  const fetchCategorias = useCallback(async () => {
    if (!empresaData?.id) return;

    try {
      console.log('🔍 Buscando categorias de equipamentos...');
      const response = await fetch(`/api/equipamentos-tipos/categorias?empresa_id=${empresaData.id}`);
      
      if (response.ok) {
        const data = await response.json();
        console.log('✅ Categorias carregadas:', data.categorias?.length || 0);
        setCategorias(data.categorias || []);
        
        // Auto-selecionar primeira categoria se houver
        if (data.categorias?.length > 0 && !categoriaSelecionada) {
          setCategoriaSelecionada(data.categorias[0].categoria);
        }
      } else {
        const errorData = await response.json().catch(() => ({ error: 'Erro desconhecido' }));
        console.error('❌ Erro ao buscar categorias:', errorData);
        addToast('error', `Erro: ${errorData.error || 'Não foi possível carregar categorias'}`);
      }
    } catch (error) {
      console.error('❌ Erro ao buscar categorias:', error);
      addToast('error', 'Erro de conexão ao carregar categorias');
    } finally {
      setLoading(false);
    }
  }, [empresaData?.id, addToast, categoriaSelecionada]);

  // Buscar itens de checklist para a categoria selecionada
  const fetchItens = useCallback(async () => {
    if (!empresaData?.id || !categoriaSelecionada) {
      setItens([]);
      return;
    }

    setLoadingItens(true);

    try {
      console.log(`🔍 Buscando itens para categoria: ${categoriaSelecionada}`);
      const response = await fetch(
        `/api/checklist-itens?empresa_id=${empresaData.id}&equipamento_categoria=${encodeURIComponent(categoriaSelecionada)}&ativo=true`
      );
      
      if (response.ok) {
        const data = await response.json();
        console.log(`✅ ${data.itens?.length || 0} itens carregados para ${categoriaSelecionada}`);
        setItens(data.itens || []);
      } else {
        const errorData = await response.json().catch(() => ({ error: 'Erro desconhecido' }));
        console.error(`❌ Erro ao buscar itens:`, errorData);
        addToast('error', `Erro: ${errorData.error || 'Não foi possível carregar itens'}`);
        setItens([]);
      }
    } catch (error) {
      console.error('❌ Erro ao buscar itens:', error);
      addToast('error', 'Erro de conexão ao carregar itens');
      setItens([]);
    } finally {
      setLoadingItens(false);
    }
  }, [empresaData?.id, categoriaSelecionada, addToast]);

  // Carregar categorias na inicialização
  useEffect(() => {
    if (empresaData?.id) {
      fetchCategorias();
    }
  }, [fetchCategorias]);

  // Carregar itens quando categoria mudar
  useEffect(() => {
    if (categoriaSelecionada) {
      fetchItens();
    }
  }, [fetchItens, categoriaSelecionada]);

  // Filtrar itens por busca
  const filteredItens = itens.filter(item =>
    item.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.descricao?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Abrir modal para criar/editar item
  const openModal = (item?: ChecklistItem) => {
    if (item) {
      setEditingItem(item);
      setFormData({
        nome: item.nome,
        descricao: item.descricao || '',
        equipamento_categoria: item.equipamento_categoria || categoriaSelecionada,
        ordem: item.ordem || 0,
        obrigatorio: item.obrigatorio || false,
        ativo: item.ativo
      });
    } else {
      setEditingItem(null);
      setFormData({
        nome: '',
        descricao: '',
        equipamento_categoria: categoriaSelecionada,
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
            equipamento_categoria: formData.equipamento_categoria,
            ordem: formData.ordem,
            obrigatorio: formData.obrigatorio,
            ativo: formData.ativo
          }
        : { 
            nome: formData.nome, 
            descricao: formData.descricao, 
            equipamento_categoria: formData.equipamento_categoria,
            ordem: formData.ordem,
            obrigatorio: formData.obrigatorio,
            ativo: formData.ativo,
            empresa_id: empresaData?.id
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
        fetchCategorias(); // Atualizar contadores
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
        fetchCategorias(); // Atualizar contadores
      } else {
        const data = await response.json();
        addToast('error', data.error || 'Erro ao deletar item');
      }
    } catch (error) {
      console.error('Erro ao deletar item:', error);
      addToast('error', 'Erro ao deletar item');
    }
  };

  if (loading) {
    return (
      <div className="p-6 max-w-7xl mx-auto">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <h2 className="text-lg font-semibold text-blue-800 mb-2">Carregando...</h2>
          <p className="text-blue-600">Buscando categorias de equipamentos...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2 flex items-center gap-2">
          <FiList className="text-blue-600" />
          Gerenciar Checklists
        </h1>
        <p className="text-gray-600">
          Configure checklists personalizados para cada categoria de equipamento.
        </p>
      </div>

      {/* Seletor de Categoria */}
      {categorias.length === 0 ? (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
          <FiPackage className="w-16 h-16 text-yellow-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-yellow-800 mb-2">
            Nenhuma categoria encontrada
          </h3>
          <p className="text-yellow-600 mb-4">
            Você precisa cadastrar equipamentos primeiro para criar checklists personalizados.
          </p>
          <Button 
            variant="outline" 
            className="text-yellow-700 border-yellow-300"
            onClick={() => window.location.href = '/configuracoes?tab=3'}
          >
            Ir para Equipamentos
          </Button>
        </div>
      ) : (
        <>
          {/* Dropdown de Categorias */}
          <div className="mb-6 bg-white p-4 rounded-lg border border-gray-200">
            <div className="flex flex-col md:flex-row gap-4 items-start md:items-center">
              {/* Seletor de Categoria */}
              <div className="flex-shrink-0">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Categoria de Equipamento:
                </label>
                <div className="relative">
                  <button
                    onClick={() => setDropdownOpen(!dropdownOpen)}
                    className="flex items-center justify-between w-64 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <div className="flex items-center gap-2">
                      <FiPackage className="text-blue-600" />
                      <span className="font-medium">
                        {categoriaSelecionada || 'Selecione uma categoria'}
                      </span>
                    </div>
                    {dropdownOpen ? <FiChevronUp /> : <FiChevronDown />}
                  </button>
                  
                  {dropdownOpen && (
                    <div className="absolute z-10 mt-1 w-full bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-auto">
                      {categorias.map((cat) => (
                        <button
                          key={cat.categoria}
                          onClick={() => {
                            setCategoriaSelecionada(cat.categoria);
                            setDropdownOpen(false);
                          }}
                          className={`w-full text-left px-4 py-3 hover:bg-blue-50 border-b border-gray-100 last:border-b-0 ${
                            categoriaSelecionada === cat.categoria ? 'bg-blue-50 text-blue-700' : ''
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <FiPackage className="text-blue-600" />
                              <span className="font-medium">{cat.categoria}</span>
                            </div>
                            <div className="text-xs text-gray-500">
                              {cat.total_equipamentos} equip. • {cat.total_checklist} itens
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Busca */}
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Buscar itens:
                </label>
                <div className="relative">
                  <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Nome do item..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              {/* Botões de Ação */}
              <div className="flex gap-2">
                <Button
                  onClick={fetchCategorias}
                  variant="outline"
                  className="flex items-center gap-2"
                >
                  <FiRefreshCw />
                  Atualizar
                </Button>
                <Button
                  onClick={() => openModal()}
                  disabled={!categoriaSelecionada}
                  variant="default"
                  className="flex items-center gap-2"
                >
                  <FiPlus />
                  Novo Item
                </Button>
              </div>
            </div>
          </div>

          {/* Lista de Itens */}
          {categoriaSelecionada && (
            <div className="bg-white border border-gray-200 rounded-lg">
              {/* Header da Lista */}
              <div className="p-4 border-b border-gray-200 bg-gray-50">
                <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <FiPackage className="text-blue-600" />
                  Checklist para {categoriaSelecionada}
                  {loadingItens && (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 ml-2"></div>
                  )}
                </h3>
                <p className="text-sm text-gray-600 mt-1">
                  {filteredItens.length} {filteredItens.length === 1 ? 'item' : 'itens'} 
                  {searchTerm && ` encontrados para "${searchTerm}"`}
                </p>
              </div>

              {/* Conteúdo da Lista */}
              <div className="p-4">
                {loadingItens ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <p className="text-gray-600">Carregando itens...</p>
                  </div>
                ) : filteredItens.length === 0 ? (
                  <div className="text-center py-8">
                    <FiList className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-gray-600 mb-2">
                      {searchTerm ? 'Nenhum item encontrado' : 'Nenhum item cadastrado'}
                    </h3>
                    <p className="text-gray-500 mb-4">
                      {searchTerm 
                        ? `Não foi encontrado nenhum item com "${searchTerm}"`
                        : `Adicione o primeiro item de checklist para a categoria ${categoriaSelecionada}`
                      }
                    </p>
                    {!searchTerm && (
                      <Button
                        onClick={() => openModal()}
                        variant="default"
                        className="flex items-center gap-2"
                      >
                        <FiPlus />
                        Adicionar Primeiro Item
                      </Button>
                    )}
                  </div>
                ) : (
                  <div className="grid gap-3">
                    {filteredItens.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200 hover:border-blue-300 transition-colors"
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-semibold text-gray-900">{item.nome}</h4>
                            {item.obrigatorio && (
                              <span className="px-2 py-1 bg-red-100 text-red-700 text-xs rounded-full font-medium">
                                Obrigatório
                              </span>
                            )}
                          </div>
                          {item.descricao && (
                            <p className="text-sm text-gray-600">{item.descricao}</p>
                          )}
                          <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                            <span>Ordem: {item.ordem}</span>
                            <span>Status: {item.ativo ? 'Ativo' : 'Inativo'}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 ml-4">
                          <Button
                            onClick={() => openModal(item)}
                            variant="outline"
                            size="sm"
                            className="flex items-center gap-1"
                          >
                            <FiEdit size={16} />
                            Editar
                          </Button>
                          <Button
                            onClick={() => handleDelete(item.id)}
                            variant="outline"
                            size="sm"
                            className="text-red-600 border-red-300 hover:bg-red-50 flex items-center gap-1"
                          >
                            <FiTrash2 size={16} />
                            Excluir
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      )}

      {/* Modal de Edição/Criação */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <FiList className="text-blue-600" />
              {editingItem ? 'Editar Item' : 'Novo Item de Checklist'}
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nome do Item *
                </label>
                <input
                  type="text"
                  value={formData.nome}
                  onChange={(e) => setFormData({...formData, nome: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Ex: Tela funcionando corretamente"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Descrição
                </label>
                <textarea
                  value={formData.descricao}
                  onChange={(e) => setFormData({...formData, descricao: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows={3}
                  placeholder="Descrição detalhada do que verificar..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Categoria do Equipamento
                </label>
                <input
                  type="text"
                  value={formData.equipamento_categoria}
                  readOnly
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-600"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Ordem
                </label>
                <input
                  type="number"
                  value={formData.ordem}
                  onChange={(e) => setFormData({...formData, ordem: parseInt(e.target.value) || 0})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  min="0"
                />
              </div>

              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.obrigatorio}
                    onChange={(e) => setFormData({...formData, obrigatorio: e.target.checked})}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">Item obrigatório</span>
                </label>
                
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.ativo}
                    onChange={(e) => setFormData({...formData, ativo: e.target.checked})}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">Ativo</span>
                </label>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <Button
                onClick={() => setShowModal(false)}
                variant="outline"
              >
                Cancelar
              </Button>
              <Button
                onClick={handleSave}
                variant="default"
              >
                {editingItem ? 'Atualizar' : 'Criar'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
