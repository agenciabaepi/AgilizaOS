'use client';

// Desabilitar cache para esta página
export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/Button';
import { useToast } from '@/components/Toast';
import { useConfirm } from '@/components/ConfirmDialog';
import { FiDollarSign, FiUsers, FiSettings, FiEdit, FiSave, FiX, FiCheck } from 'react-icons/fi';

interface Tecnico {
  id: string;
  nome: string;
  email: string;
  comissao_percentual: number;
  comissao_ativa: boolean;
  comissao_observacoes: string;
  tipo_comissao?: 'porcentagem' | 'fixo' | null;
  comissao_fixa?: number | null;
}

interface ConfiguracaoComissao {
  id: string;
  empresa_id: string;
  comissao_padrao: number;
  comissao_apenas_servico: boolean;
  comissao_retorno_ativo: boolean;
  observacoes: string;
  tipo_comissao?: 'porcentagem' | 'fixo' | null;
  comissao_fixa_padrao?: number | null;
}

export default function ComissoesPage() {
  const { usuarioData } = useAuth();
  const { addToast } = useToast();
  const confirm = useConfirm();
  
  const [tecnicos, setTecnicos] = useState<Tecnico[]>([]);
  const [configuracao, setConfiguracao] = useState<ConfiguracaoComissao | null>(null);
  const [loading, setLoading] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [editandoTecnico, setEditandoTecnico] = useState<string | null>(null);
  const [editandoConfig, setEditandoConfig] = useState(false);

  // Estados temporários para edição
  const [tempTecnico, setTempTecnico] = useState<Partial<Tecnico>>({});
  const [tempConfig, setTempConfig] = useState<Partial<ConfiguracaoComissao>>({});

  useEffect(() => {
    if (usuarioData?.empresa_id) {
      fetchData();
    }
  }, [usuarioData]);

  // Debug: Log quando editandoConfig muda
  useEffect(() => {
    if (editandoConfig) {
      console.log('🟢 Modo edição ativado - editandoConfig:', editandoConfig);
      console.log('🟢 tempConfig:', tempConfig);
    }
  }, [editandoConfig, tempConfig]);

  const fetchData = async () => {
    if (!usuarioData?.empresa_id) return;
    
    setLoading(true);
    try {
      // Buscar técnicos da empresa
      const { data: tecnicosData, error: tecnicosError } = await supabase
        .from('usuarios')
        .select('id, nome, email, comissao_percentual, comissao_ativa, comissao_observacoes, tipo_comissao, comissao_fixa')
        .eq('empresa_id', usuarioData.empresa_id)
        .eq('nivel', 'tecnico')
        .order('nome');

      if (tecnicosError) {
        console.error('Erro ao buscar técnicos:', tecnicosError);
        addToast('error', 'Erro ao carregar técnicos');
      } else {
        setTecnicos(tecnicosData || []);
      }

      // Buscar configurações de comissão da empresa
      const { data: configData, error: configError } = await supabase
        .from('configuracoes_comissao')
        .select('*')
        .eq('empresa_id', usuarioData.empresa_id)
        .single();

      if (configError) {
        if (configError.code === 'PGRST116') {
          // Não existe configuração, criar uma padrão
          await criarConfiguracaoPadrao();
        } else {
          console.error('Erro ao buscar configurações:', configError);
          addToast('error', 'Erro ao carregar configurações');
        }
      } else {
        // Garantir que os novos campos existam (para compatibilidade com registros antigos)
        const configCompleto = {
          ...configData,
          tipo_comissao: configData.tipo_comissao || 'porcentagem',
          comissao_fixa_padrao: configData.comissao_fixa_padrao ?? 0.00
        };
        console.log('📊 Configuração carregada:', configCompleto);
        setConfiguracao(configCompleto);
      }

    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      addToast('error', 'Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  };

  const criarConfiguracaoPadrao = async () => {
    if (!usuarioData?.empresa_id) return;

    const configPadrao = {
      empresa_id: usuarioData.empresa_id,
      comissao_padrao: 10.00,
      comissao_apenas_servico: true,
      comissao_retorno_ativo: false,
      observacoes: '',
      tipo_comissao: 'porcentagem',
      comissao_fixa_padrao: 0.00
    };

    const { data, error } = await supabase
      .from('configuracoes_comissao')
      .insert(configPadrao)
      .select()
      .single();

    if (error) {
      console.error('Erro ao criar configuração padrão:', error);
    } else {
      setConfiguracao(data);
    }
  };

  const iniciarEdicaoTecnico = (tecnico: Tecnico) => {
    setEditandoTecnico(tecnico.id);
    setTempTecnico({
      comissao_percentual: tecnico.comissao_percentual,
      comissao_ativa: tecnico.comissao_ativa,
      comissao_observacoes: tecnico.comissao_observacoes,
      tipo_comissao: tecnico.tipo_comissao || configuracao?.tipo_comissao || 'porcentagem',
      comissao_fixa: tecnico.comissao_fixa || null
    });
  };

  const salvarTecnico = async (tecnicoId: string) => {
    setSalvando(true);
    try {
      const { error } = await supabase
        .from('usuarios')
        .update({
          comissao_percentual: tempTecnico.comissao_percentual,
          comissao_ativa: tempTecnico.comissao_ativa,
          comissao_observacoes: tempTecnico.comissao_observacoes,
          tipo_comissao: tempTecnico.tipo_comissao,
          comissao_fixa: tempTecnico.comissao_fixa
        })
        .eq('id', tecnicoId);

      if (error) {
        addToast('error', 'Erro ao salvar comissão do técnico');
      } else {
        addToast('success', 'Comissão atualizada com sucesso!');
        setEditandoTecnico(null);
        fetchData();
      }
    } catch (error) {
      addToast('error', 'Erro ao salvar dados');
    } finally {
      setSalvando(false);
    }
  };

  const cancelarEdicaoTecnico = () => {
    setEditandoTecnico(null);
    setTempTecnico({});
  };

  const iniciarEdicaoConfig = useCallback(() => {
    console.log('🔵 Iniciando edição de configuração...');
    console.log('🔵 Configuração atual:', configuracao);
    
    const tipoComissao = configuracao?.tipo_comissao || 'porcentagem';
    const configInicial = {
      comissao_padrao: configuracao?.comissao_padrao || 10.00,
      comissao_apenas_servico: configuracao?.comissao_apenas_servico ?? true,
      comissao_retorno_ativo: configuracao?.comissao_retorno_ativo ?? false,
      observacoes: configuracao?.observacoes || '',
      tipo_comissao: tipoComissao,
      comissao_fixa_padrao: configuracao?.comissao_fixa_padrao ?? 0.00
    };
    
    console.log('🔵 TempConfig inicial:', configInicial);
    
    // Usar função de atualização para garantir que o estado seja atualizado
    setTempConfig(() => configInicial);
    setEditandoConfig(() => true);
    
    console.log('🔵 editandoConfig setado para: true');
    console.log('🔵 tempConfig setado para:', configInicial);
  }, [configuracao]);

  const salvarConfiguracao = async () => {
    if (!configuracao?.id) return;
    
    // Validar campos obrigatórios
    if (!tempConfig.tipo_comissao) {
      addToast('error', 'Selecione o tipo de comissão');
      return;
    }
    
    if (tempConfig.tipo_comissao === 'fixo' && (!tempConfig.comissao_fixa_padrao || tempConfig.comissao_fixa_padrao <= 0)) {
      addToast('error', 'Informe o valor fixo da comissão');
      return;
    }
    
    if (tempConfig.tipo_comissao === 'porcentagem' && (!tempConfig.comissao_padrao || tempConfig.comissao_padrao <= 0)) {
      addToast('error', 'Informe o percentual da comissão');
      return;
    }
    
    setSalvando(true);
    try {
      console.log('💾 Salvando configuração:', tempConfig);
      const { error } = await supabase
        .from('configuracoes_comissao')
        .update(tempConfig)
        .eq('id', configuracao.id);

      if (error) {
        console.error('❌ Erro ao salvar:', error);
        addToast('error', 'Erro ao salvar configurações: ' + error.message);
      } else {
        addToast('success', 'Configurações atualizadas com sucesso!');
        setEditandoConfig(false);
        // Aguardar um pouco antes de recarregar para garantir que o update foi processado
        setTimeout(() => {
          fetchData();
        }, 500);
      }
    } catch (error) {
      console.error('❌ Erro ao salvar dados:', error);
      addToast('error', 'Erro ao salvar dados');
    } finally {
      setSalvando(false);
    }
  };

  const cancelarEdicaoConfig = () => {
    setEditandoConfig(false);
    setTempConfig({});
  };

  const aplicarComissaoPadrao = async (tecnicoId: string) => {
    const tipoComissao = configuracao?.tipo_comissao || 'porcentagem';
    const mensagem = tipoComissao === 'fixo' 
      ? `Deseja aplicar a comissão fixa padrão de R$ ${configuracao?.comissao_fixa_padrao?.toFixed(2)} por aparelho para este técnico?`
      : `Deseja aplicar a comissão padrão de ${configuracao?.comissao_padrao}% para este técnico?`;
    
    const confirmed = await confirm({
      title: 'Aplicar Comissão Padrão',
      message: mensagem,
      confirmText: 'Aplicar',
      cancelText: 'Cancelar'
    });

    if (confirmed && configuracao) {
      setSalvando(true);
      try {
        const updateData: any = {
          comissao_ativa: true,
          tipo_comissao: tipoComissao
        };
        
        if (tipoComissao === 'fixo') {
          updateData.comissao_fixa = configuracao.comissao_fixa_padrao;
        } else {
          updateData.comissao_percentual = configuracao.comissao_padrao;
        }
        
        const { error } = await supabase
          .from('usuarios')
          .update(updateData)
          .eq('id', tecnicoId);

        if (error) {
          addToast('error', 'Erro ao aplicar comissão padrão');
        } else {
          addToast('success', 'Comissão padrão aplicada com sucesso!');
          fetchData();
        }
      } catch (error) {
        addToast('error', 'Erro ao salvar dados');
      } finally {
        setSalvando(false);
      }
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Carregando configurações de comissão...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <FiDollarSign className="text-green-600" size={28} />
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Gerenciar Comissões</h1>
          <p className="text-gray-600">Configure percentuais e regras de comissão para técnicos</p>
        </div>
      </div>

      {/* Configurações Gerais */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <FiSettings className="text-blue-600" size={20} />
            <h2 className="text-lg font-semibold text-gray-900">Configurações Gerais</h2>
          </div>
          {!editandoConfig && (
            <Button onClick={iniciarEdicaoConfig} variant="outline" size="sm">
              <FiEdit size={16} className="mr-1" />
              Editar
            </Button>
          )}
        </div>

        {editandoConfig ? (
          <div className="space-y-4" key={`edit-mode-${Date.now()}`}>
            {/* Tipo de Comissão - SEMPRE VISÍVEL EM MODO EDIÇÃO */}
            <div className="bg-blue-50 p-4 rounded-lg border-2 border-blue-400 shadow-md">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-blue-600 font-bold text-lg">⚙️</span>
                <label className="block text-sm font-bold text-gray-900">
                  Tipo de Comissão *
                </label>
              </div>
              <select
                value={tempConfig.tipo_comissao || 'porcentagem'}
                key={`tipo-comissao-select-${tempConfig.tipo_comissao || 'porcentagem'}`}
                onChange={(e) => {
                  const novoTipo = e.target.value as 'porcentagem' | 'fixo';
                  console.log('🔄 Mudando tipo de comissão para:', novoTipo);
                  setTempConfig(prev => ({ 
                    ...prev, 
                    tipo_comissao: novoTipo,
                    // Limpar valores quando mudar de tipo
                    comissao_fixa_padrao: novoTipo === 'fixo' ? (prev.comissao_fixa_padrao || 0) : undefined,
                    comissao_padrao: novoTipo === 'porcentagem' ? (prev.comissao_padrao || 10) : undefined
                  }));
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
              >
                <option value="porcentagem">Porcentagem (%)</option>
                <option value="fixo">Valor Fixo por Aparelho (R$)</option>
              </select>
              <p className="text-xs text-gray-600 mt-2 font-medium">
                💡 Escolha como a comissão será calculada: por porcentagem sobre o valor ou valor fixo por aparelho
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Tipo atual: <strong>{tempConfig.tipo_comissao || 'porcentagem'}</strong>
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {tempConfig.tipo_comissao === 'fixo' ? (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Valor Fixo Padrão (R$) *
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={tempConfig.comissao_fixa_padrao ?? ''}
                    onChange={(e) => {
                      const valor = e.target.value === '' ? 0 : parseFloat(e.target.value);
                      setTempConfig(prev => ({ ...prev, comissao_fixa_padrao: isNaN(valor) ? 0 : valor }));
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="0.00"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Valor fixo que será pago por cada aparelho entregue pelo técnico
                  </p>
                </div>
              ) : (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Comissão Padrão (%) *
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.01"
                    value={tempConfig.comissao_padrao ?? ''}
                    onChange={(e) => {
                      const valor = e.target.value === '' ? 0 : parseFloat(e.target.value);
                      setTempConfig(prev => ({ ...prev, comissao_padrao: isNaN(valor) ? 0 : valor }));
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="10.00"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Percentual de comissão sobre o valor do serviço (ou serviço + peças)
                  </p>
                </div>
              )}
            </div>

            <div className="space-y-3">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={tempConfig.comissao_apenas_servico || false}
                  onChange={(e) => setTempConfig(prev => ({ ...prev, comissao_apenas_servico: e.target.checked }))}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">Comissão apenas sobre valor de serviço (não incluir peças)</span>
              </label>

              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={tempConfig.comissao_retorno_ativo || false}
                  onChange={(e) => setTempConfig(prev => ({ ...prev, comissao_retorno_ativo: e.target.checked }))}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">Técnico recebe comissão em retornos/garantias</span>
              </label>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Observações
              </label>
              <textarea
                value={tempConfig.observacoes || ''}
                onChange={(e) => setTempConfig(prev => ({ ...prev, observacoes: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                rows={3}
                placeholder="Observações sobre as regras de comissão..."
              />
            </div>

            <div className="flex gap-2">
              <Button onClick={salvarConfiguracao} disabled={salvando}>
                <FiSave size={16} className="mr-1" />
                {salvando ? 'Salvando...' : 'Salvar'}
              </Button>
              <Button onClick={cancelarEdicaoConfig} variant="outline">
                <FiX size={16} className="mr-1" />
                Cancelar
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-blue-50 p-4 rounded-lg">
                <p className="text-sm text-blue-600 font-medium">
                  {configuracao?.tipo_comissao === 'fixo' ? 'Comissão Fixa Padrão' : 'Comissão Padrão'}
                </p>
                <p className="text-2xl font-bold text-blue-900">
                  {configuracao?.tipo_comissao === 'fixo' 
                    ? `R$ ${configuracao?.comissao_fixa_padrao?.toFixed(2) || '0.00'}` 
                    : `${configuracao?.comissao_padrao}%`}
                </p>
                <p className="text-xs text-blue-600 mt-1">
                  {configuracao?.tipo_comissao === 'fixo' ? 'Por aparelho' : 'Percentual'}
                </p>
              </div>
              <div className="bg-green-50 p-4 rounded-lg">
                <p className="text-sm text-green-600 font-medium">Base de Cálculo</p>
                <p className="text-sm font-semibold text-green-900">
                  {configuracao?.comissao_apenas_servico ? 'Apenas Serviços' : 'Serviços + Peças'}
                </p>
              </div>
              <div className="bg-orange-50 p-4 rounded-lg">
                <p className="text-sm text-orange-600 font-medium">Retornos/Garantias</p>
                <p className="text-sm font-semibold text-orange-900">
                  {configuracao?.comissao_retorno_ativo ? 'Com Comissão' : 'Sem Comissão'}
                </p>
              </div>
            </div>
            {configuracao?.observacoes && (
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-sm text-gray-600">{configuracao.observacoes}</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Lista de Técnicos */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <FiUsers className="text-purple-600" size={20} />
            <h2 className="text-lg font-semibold text-gray-900">Comissões por Técnico</h2>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-[200px]">
                  Técnico
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-[180px]">
                  Tipo / Valor
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-[100px]">
                  Status
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Observações
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider w-[120px]">
                  Ações
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {tecnicos.map((tecnico) => (
                <tr key={tecnico.id} className="hover:bg-gray-50">
                  <td className="px-4 py-4 align-top">
                    <div>
                      <div className="text-sm font-medium text-gray-900">{tecnico.nome}</div>
                      <div className="text-sm text-gray-500">{tecnico.email}</div>
                    </div>
                  </td>
                  <td className="px-4 py-4 align-top">
                    <div className="max-w-[180px] mx-auto">
                      {editandoTecnico === tecnico.id ? (
                        <div className="flex flex-col gap-2">
                          <select
                            value={tempTecnico.tipo_comissao || 'porcentagem'}
                            onChange={(e) => setTempTecnico(prev => ({ ...prev, tipo_comissao: e.target.value as 'porcentagem' | 'fixo' }))}
                            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                          >
                            <option value="porcentagem">Porcentagem</option>
                            <option value="fixo">Valor Fixo</option>
                          </select>
                          {tempTecnico.tipo_comissao === 'fixo' ? (
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={tempTecnico.comissao_fixa || ''}
                              onChange={(e) => setTempTecnico(prev => ({ ...prev, comissao_fixa: parseFloat(e.target.value) }))}
                              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg text-center focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                              placeholder="0.00"
                            />
                          ) : (
                            <input
                              type="number"
                              min="0"
                              max="100"
                              step="0.01"
                              value={tempTecnico.comissao_percentual || ''}
                              onChange={(e) => setTempTecnico(prev => ({ ...prev, comissao_percentual: parseFloat(e.target.value) }))}
                              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg text-center focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                              placeholder="10.00"
                            />
                          )}
                        </div>
                      ) : (
                        <div className="text-sm text-center">
                          <div className={`font-semibold ${tecnico.comissao_ativa ? 'text-green-600' : 'text-gray-400'}`}>
                            {tecnico.tipo_comissao === 'fixo' 
                              ? `R$ ${tecnico.comissao_fixa?.toFixed(2) || '0.00'}` 
                              : `${tecnico.comissao_percentual || 0}%`}
                          </div>
                          <div className="text-xs text-gray-500 mt-1">
                            {tecnico.tipo_comissao === 'fixo' ? 'Fixo' : 'Porcentagem'}
                          </div>
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-4 align-top">
                    <div className="flex items-center justify-center">
                      {editandoTecnico === tecnico.id ? (
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={tempTecnico.comissao_ativa || false}
                            onChange={(e) => setTempTecnico(prev => ({ ...prev, comissao_ativa: e.target.checked }))}
                            className="w-4 h-4 rounded border-gray-300 text-green-600 focus:ring-green-500"
                          />
                          <span className="text-sm text-gray-700 whitespace-nowrap">Ativo</span>
                        </label>
                      ) : (
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium whitespace-nowrap ${
                          tecnico.comissao_ativa 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {tecnico.comissao_ativa ? 'Ativo' : 'Inativo'}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-4 align-top">
                    {editandoTecnico === tecnico.id ? (
                      <input
                        type="text"
                        value={tempTecnico.comissao_observacoes || ''}
                        onChange={(e) => setTempTecnico(prev => ({ ...prev, comissao_observacoes: e.target.value }))}
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                        placeholder="Observações..."
                      />
                    ) : (
                      <span className="text-sm text-gray-600">
                        {tecnico.comissao_observacoes || '-'}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-4 text-right">
                    {editandoTecnico === tecnico.id ? (
                      <div className="flex items-center justify-end gap-1">
                        <Button onClick={() => salvarTecnico(tecnico.id)} size="sm" disabled={salvando}>
                          <FiCheck size={14} />
                        </Button>
                        <Button onClick={cancelarEdicaoTecnico} variant="outline" size="sm">
                          <FiX size={14} />
                        </Button>
                      </div>
                    ) : (
                      <div className="flex items-center justify-end gap-1">
                        <Button onClick={() => iniciarEdicaoTecnico(tecnico)} variant="outline" size="sm">
                          <FiEdit size={14} />
                        </Button>
                        {configuracao && (
                          <Button 
                            onClick={() => aplicarComissaoPadrao(tecnico.id)}
                            variant="outline" 
                            size="sm"
                            className="text-blue-600 hover:text-blue-700"
                          >
                            Padrão
                          </Button>
                        )}
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {tecnicos.length === 0 && (
          <div className="text-center py-12">
            <FiUsers className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhum técnico encontrado</h3>
            <p className="text-gray-500">Cadastre técnicos primeiro para configurar suas comissões.</p>
          </div>
        )}
      </div>
    </div>
  );
}
