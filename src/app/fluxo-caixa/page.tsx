'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/hooks/useToast';
import { useConfirm } from '@/hooks/useConfirm';
import { useFluxoCaixa, FluxoCaixaFormData } from '@/hooks/useFluxoCaixa';

export default function FluxoCaixaPage() {
  const { usuarioData } = useAuth();
  const { addToast } = useToast();
  const { confirm, ConfirmDialog } = useConfirm();
  
  const {
    movimentacoes,
    loading,
    error,
    carregarMovimentacoes,
    adicionarMovimentacao,
    atualizarMovimentacao,
    excluirMovimentacao,
    calcularTotais,
    getCategorias
  } = useFluxoCaixa();

  // Estados do modal
  const [showModal, setShowModal] = useState(false);
  const [editingMovimentacao, setEditingMovimentacao] = useState<any>(null);
  const [formData, setFormData] = useState<FluxoCaixaFormData>({
    tipo: 'entrada',
    categoria: '',
    descricao: '',
    valor: '',
    data_movimentacao: new Date().toISOString().split('T')[0],
    observacoes: '',
    comprovante_url: '',
    referencia_id: ''
  });

  // Estados dos filtros
  const [filtros, setFiltros] = useState({
    dataInicio: '',
    dataFim: '',
    tipo: '' as 'entrada' | 'saida' | '',
    categoria: ''
  });
  const [showFiltros, setShowFiltros] = useState(false);

  // Carregar dados quando a página carrega
  useEffect(() => {
    carregarMovimentacoes();
  }, [usuarioData?.empresa_id]);

  // Carregar dados quando filtros mudarem
  useEffect(() => {
    carregarMovimentacoes(
      filtros.dataInicio || undefined,
      filtros.dataFim || undefined,
      filtros.tipo || undefined,
      filtros.categoria || undefined
    );
  }, [filtros]);

  // Resetar formulário
  const resetForm = () => {
    setFormData({
      tipo: 'entrada',
      categoria: '',
      descricao: '',
      valor: '',
      data_movimentacao: new Date().toISOString().split('T')[0],
      observacoes: '',
      comprovante_url: '',
      referencia_id: ''
    });
    setEditingMovimentacao(null);
  };

  // Abrir modal para adicionar
  const handleAdd = () => {
    resetForm();
    setShowModal(true);
  };

  // Abrir modal para editar
  const handleEdit = (movimentacao: any) => {
    setEditingMovimentacao(movimentacao);
    setFormData({
      tipo: movimentacao.tipo,
      categoria: movimentacao.categoria,
      descricao: movimentacao.descricao,
      valor: movimentacao.valor.toString().replace('.', ','),
      data_movimentacao: movimentacao.data_movimentacao,
      observacoes: movimentacao.observacoes || '',
      comprovante_url: movimentacao.comprovante_url || '',
      referencia_id: movimentacao.referencia_id || ''
    });
    setShowModal(true);
  };

  // Excluir movimentação
  const handleDelete = async (id: string, descricao: string) => {
    const confirmed = await confirm(
      'Confirmar exclusão',
      `Tem certeza que deseja excluir a movimentação "${descricao}"?`
    );

    if (confirmed) {
      try {
        await excluirMovimentacao(id);
        addToast('Movimentação excluída com sucesso!', 'success');
      } catch (error) {
        addToast('Erro ao excluir movimentação', 'error');
      }
    }
  };

  // Submeter formulário
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.descricao.trim()) {
      addToast('Descrição é obrigatória', 'error');
      return;
    }

    if (!formData.categoria) {
      addToast('Categoria é obrigatória', 'error');
      return;
    }

    if (!formData.valor || parseFloat(formData.valor.replace(',', '.')) <= 0) {
      addToast('Valor deve ser maior que zero', 'error');
      return;
    }

    try {
      if (editingMovimentacao) {
        await atualizarMovimentacao(editingMovimentacao.id, formData);
        addToast('Movimentação atualizada com sucesso!', 'success');
      } else {
        await adicionarMovimentacao(formData);
        addToast('Movimentação adicionada com sucesso!', 'success');
      }

      setShowModal(false);
      resetForm();
    } catch (error) {
      addToast('Erro ao salvar movimentação', 'error');
    }
  };

  // Formatação de moeda
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  // Formatação de data
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  // Obter categorias baseadas no tipo
  const categoriasDisponiveis = getCategorias();
  const categoriasPorTipo = formData.tipo === 'entrada' 
    ? categoriasDisponiveis.entrada 
    : categoriasDisponiveis.saida;

  // Calcular totais
  const totais = calcularTotais();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Carregando movimentações...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Cabeçalho */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Fluxo de Caixa</h1>
          <p className="text-gray-600">Gerencie entradas e saídas de caixa</p>
        </div>
        <button
          onClick={handleAdd}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
        >
          + Nova Movimentação
        </button>
      </div>

      {/* Cards de resumo */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <div>
            <p className="text-sm text-gray-600">Total Entradas</p>
            <p className="text-2xl font-bold text-green-600">{formatCurrency(totais.entradas)}</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <div>
            <p className="text-sm text-gray-600">Total Saídas</p>
            <p className="text-2xl font-bold text-red-600">{formatCurrency(totais.saidas)}</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <div>
            <p className="text-sm text-gray-600">Saldo</p>
            <p className={`text-2xl font-bold ${totais.saldo >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {formatCurrency(totais.saldo)}
            </p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <div>
            <p className="text-sm text-gray-600">Movimentações</p>
            <p className="text-2xl font-bold text-gray-900">{totais.totalMovimentacoes}</p>
          </div>
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Filtros</h3>
          <button
            onClick={() => setShowFiltros(!showFiltros)}
            className="text-blue-600 hover:text-blue-700"
          >
            {showFiltros ? 'Ocultar' : 'Mostrar'} Filtros
          </button>
        </div>

        {showFiltros && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Data Início
              </label>
              <input
                type="date"
                value={filtros.dataInicio}
                onChange={(e) => setFiltros(prev => ({ ...prev, dataInicio: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Data Fim
              </label>
              <input
                type="date"
                value={filtros.dataFim}
                onChange={(e) => setFiltros(prev => ({ ...prev, dataFim: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tipo
              </label>
              <select
                value={filtros.tipo}
                onChange={(e) => setFiltros(prev => ({ ...prev, tipo: e.target.value as any }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Todos</option>
                <option value="entrada">Entrada</option>
                <option value="saida">Saída</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Categoria
              </label>
              <select
                value={filtros.categoria}
                onChange={(e) => setFiltros(prev => ({ ...prev, categoria: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Todas</option>
                {categoriasDisponiveis.todas.map(categoria => (
                  <option key={categoria} value={categoria}>
                    {categoria.charAt(0).toUpperCase() + categoria.slice(1)}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Tabela de movimentações */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Data
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Tipo
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Categoria
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Descrição
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Valor
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Usuário
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Ações
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {movimentacoes.map((mov) => (
                <tr key={mov.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {formatDate(mov.data_movimentacao)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      mov.tipo === 'entrada' 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {mov.tipo === 'entrada' ? 'Entrada' : 'Saída'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {mov.categoria.charAt(0).toUpperCase() + mov.categoria.slice(1)}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    <div>
                      <div className="font-medium">{mov.descricao}</div>
                      {mov.observacoes && (
                        <div className="text-gray-500 text-xs">{mov.observacoes}</div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    <span className={mov.tipo === 'entrada' ? 'text-green-600' : 'text-red-600'}>
                      {mov.tipo === 'entrada' ? '+' : '-'}{formatCurrency(mov.valor)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {mov.usuario?.nome || 'N/A'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleEdit(mov)}
                        className="text-blue-600 hover:text-blue-900 px-2 py-1"
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => handleDelete(mov.id, mov.descricao)}
                        className="text-red-600 hover:text-red-900 px-2 py-1"
                      >
                        Excluir
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {movimentacoes.length === 0 && (
            <div className="text-center py-12">
              <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhuma movimentação encontrada</h3>
              <p className="text-gray-500 mb-4">
                {Object.values(filtros).some(f => f) 
                  ? 'Nenhuma movimentação corresponde aos filtros aplicados.'
                  : 'Comece adicionando uma nova movimentação de caixa.'
                }
              </p>
              <button
                onClick={handleAdd}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
              >
                + Nova Movimentação
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Modal para adicionar/editar */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold text-gray-900">
                {editingMovimentacao ? 'Editar' : 'Nova'} Movimentação
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tipo *
                  </label>
                  <select
                    value={formData.tipo}
                    onChange={(e) => setFormData(prev => ({ ...prev, tipo: e.target.value as any, categoria: '' }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  >
                    <option value="entrada">Entrada</option>
                    <option value="saida">Saída</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Categoria *
                  </label>
                  <select
                    value={formData.categoria}
                    onChange={(e) => setFormData(prev => ({ ...prev, categoria: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  >
                    <option value="">Selecione</option>
                    {categoriasPorTipo.map(categoria => (
                      <option key={categoria} value={categoria}>
                        {categoria.charAt(0).toUpperCase() + categoria.slice(1)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Descrição *
                </label>
                <input
                  type="text"
                  value={formData.descricao}
                  onChange={(e) => setFormData(prev => ({ ...prev, descricao: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Ex: Venda de produto, Pagamento de fornecedor"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Valor *
                  </label>
                  <input
                    type="text"
                    value={formData.valor}
                    onChange={(e) => setFormData(prev => ({ ...prev, valor: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="0,00"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Data *
                  </label>
                  <input
                    type="date"
                    value={formData.data_movimentacao}
                    onChange={(e) => setFormData(prev => ({ ...prev, data_movimentacao: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Observações
                </label>
                <textarea
                  value={formData.observacoes}
                  onChange={(e) => setFormData(prev => ({ ...prev, observacoes: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  rows={3}
                  placeholder="Informações adicionais..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  URL do Comprovante
                </label>
                <input
                  type="url"
                  value={formData.comprovante_url}
                  onChange={(e) => setFormData(prev => ({ ...prev, comprovante_url: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="https://exemplo.com/comprovante.pdf"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  {editingMovimentacao ? 'Atualizar' : 'Adicionar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de confirmação */}
      <ConfirmDialog />
    </div>
  );
}