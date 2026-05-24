'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/Button';
import { useToast } from '@/components/Toast';
import { useConfirm } from '@/components/ConfirmDialog';
import { FiDollarSign, FiUsers, FiSettings, FiEdit, FiSave, FiX, FiCheck, FiSearch, FiPercent, FiTool, FiShield, FiRefreshCw } from 'react-icons/fi';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { bearerAuthHeadersForApi } from '@/lib/api/clientAuthHeaders';
import { cn } from '@/lib/utils';

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
  const { usuarioData, session } = useAuth();
  const { addToast } = useToast();
  const confirm = useConfirm();
  
  const [tecnicos, setTecnicos] = useState<Tecnico[]>([]);
  const [configuracao, setConfiguracao] = useState<ConfiguracaoComissao | null>(null);
  const [loading, setLoading] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [editandoTecnico, setEditandoTecnico] = useState<string | null>(null);
  const [editandoConfig, setEditandoConfig] = useState(false);
  const [buscaTecnico, setBuscaTecnico] = useState('');

  // Estados temporários para edição
  const [tempTecnico, setTempTecnico] = useState<Partial<Tecnico>>({});
  const [tempConfig, setTempConfig] = useState<Partial<ConfiguracaoComissao>>({});

  useEffect(() => {
    if (usuarioData?.empresa_id) {
      fetchData();
    }
  }, [usuarioData, session?.access_token]);

  const normalizarConfiguracao = (configData: Record<string, unknown>): ConfiguracaoComissao => ({
    id: String(configData.id),
    empresa_id: String(configData.empresa_id),
    comissao_padrao: Number(configData.comissao_padrao ?? 10),
    comissao_apenas_servico: Boolean(configData.comissao_apenas_servico ?? true),
    comissao_retorno_ativo: Boolean(configData.comissao_retorno_ativo ?? false),
    observacoes: String(configData.observacoes || ''),
    tipo_comissao: (configData.tipo_comissao as ConfiguracaoComissao['tipo_comissao']) || 'porcentagem',
    comissao_fixa_padrao: Number(configData.comissao_fixa_padrao ?? 0),
  });

  const carregarConfiguracao = async (): Promise<ConfiguracaoComissao | null> => {
    const response = await fetch('/api/configuracoes-comissao', {
      method: 'GET',
      headers: await bearerAuthHeadersForApi(session),
      credentials: 'include',
    });

    const responseText = await response.text();
    if (responseText.trim().startsWith('<!DOCTYPE') || responseText.trim().startsWith('<html')) {
      throw new Error('Resposta inválida do servidor ao carregar configurações.');
    }

    const responseData = responseText ? JSON.parse(responseText) : null;
    if (!response.ok) {
      throw new Error(responseData?.error || 'Erro ao carregar configurações de comissão');
    }

    return responseData?.data ? normalizarConfiguracao(responseData.data) : null;
  };

  const salvarConfiguracaoViaApi = async (dadosCompletos: Record<string, unknown>) => {
    const response = await fetch('/api/configuracoes-comissao/salvar', {
      method: 'POST',
      headers: await bearerAuthHeadersForApi(session, {
        'Content-Type': 'application/json',
      }),
      credentials: 'include',
      body: JSON.stringify({ dadosCompletos }),
    });

    const responseText = await response.text();
    if (responseText.trim().startsWith('<!DOCTYPE') || responseText.trim().startsWith('<html')) {
      throw new Error('Resposta inválida do servidor ao salvar configurações.');
    }

    const responseData = responseText ? JSON.parse(responseText) : null;
    if (!response.ok) {
      throw new Error(responseData?.error || 'Erro desconhecido ao salvar');
    }

    if (!responseData?.data) {
      throw new Error('Nenhum dado retornado após salvar');
    }

    return normalizarConfiguracao(responseData.data);
  };

  const fetchData = async () => {
    if (!usuarioData?.empresa_id) {
      console.warn('⚠️ empresa_id não encontrado, não é possível carregar dados');
      return;
    }
    
    setLoading(true);
    try {
      // Verificar autenticação antes de fazer queries
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !session) {
        console.error('❌ Erro de autenticação:', sessionError);
        addToast('error', 'Erro de autenticação. Por favor, faça login novamente.');
        setLoading(false);
        return;
      }
      
      // Buscar técnicos da empresa
      const { data: tecnicosData, error: tecnicosError } = await supabase
        .from('usuarios')
        .select('id, nome, email, comissao_percentual, comissao_ativa, comissao_observacoes, tipo_comissao, comissao_fixa')
        .eq('empresa_id', usuarioData.empresa_id)
        .eq('nivel', 'tecnico')
        .order('nome');

      if (tecnicosError) {
        console.error('❌ Erro ao buscar técnicos:', tecnicosError);
        
        // Verificar se é erro de HTML/autenticação
        const errorMsg = String(tecnicosError.message || '');
        if (errorMsg.includes('DOCTYPE') || errorMsg.includes('<html')) {
          addToast('error', 'Erro de autenticação. Por favor, faça login novamente.');
        } else {
          addToast('error', 'Erro ao carregar técnicos: ' + errorMsg);
        }
      } else {
        setTecnicos(tecnicosData || []);
      }

      // Buscar configurações de comissão via API (admin), pois RLS pode bloquear leitura direta
      try {
        const configCarregada = await carregarConfiguracao();
        if (configCarregada) {
          setConfiguracao(configCarregada);
        } else {
          await criarConfiguracaoPadrao();
        }
      } catch (configLoadError: unknown) {
        const message = configLoadError instanceof Error ? configLoadError.message : 'Erro ao carregar configurações';
        console.error('❌ Erro ao buscar configurações:', configLoadError);
        addToast('error', message);
      }

    } catch (error: any) {
      console.error('❌ Erro ao carregar dados:', error);
      console.error('❌ Tipo do erro:', typeof error);
      console.error('❌ Mensagem:', error?.message);
      
      let mensagemErro = 'Erro ao carregar dados';
      if (error?.message?.includes('DOCTYPE') || error?.message?.includes('<html') || error?.message?.includes('JSON')) {
        mensagemErro = 'Erro de conexão. Por favor, recarregue a página ou faça login novamente.';
      } else if (error?.message) {
        mensagemErro = error.message;
      }
      
      addToast('error', mensagemErro);
    } finally {
      setLoading(false);
    }
  };

  const criarConfiguracaoPadrao = async () => {
    if (!usuarioData?.empresa_id) {
      console.error('❌ empresa_id não encontrado ao criar configuração padrão');
      return;
    }

    try {
      const configSalva = await salvarConfiguracaoViaApi({
        empresa_id: usuarioData.empresa_id,
        comissao_padrao: 10.0,
        comissao_apenas_servico: true,
        comissao_retorno_ativo: false,
        observacoes: '',
        tipo_comissao: 'porcentagem',
        comissao_fixa_padrao: 0.0,
      });
      setConfiguracao(configSalva);
    } catch (error) {
      console.error('❌ Erro ao criar configuração padrão:', error);
      addToast('error', error instanceof Error ? error.message : 'Erro ao criar configuração padrão');
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

  const iniciarEdicaoConfig = () => {
    const tipoComissao = configuracao?.tipo_comissao || 'porcentagem';
    setTempConfig({
      comissao_padrao: configuracao?.comissao_padrao || 10.00,
      comissao_apenas_servico: configuracao?.comissao_apenas_servico ?? true,
      comissao_retorno_ativo: configuracao?.comissao_retorno_ativo ?? false,
      observacoes: configuracao?.observacoes || '',
      tipo_comissao: tipoComissao,
      comissao_fixa_padrao: configuracao?.comissao_fixa_padrao ?? 0.00,
    });
    setEditandoConfig(true);
  };

  const salvarConfiguracao = async () => {
    if (!usuarioData?.empresa_id) {
      addToast('error', 'Empresa não encontrada. Faça login novamente.');
      return;
    }

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
      const dadosCompletos: Record<string, unknown> = {
        empresa_id: usuarioData.empresa_id,
        tipo_comissao: tempConfig.tipo_comissao,
        comissao_apenas_servico: tempConfig.comissao_apenas_servico ?? configuracao?.comissao_apenas_servico ?? true,
        comissao_retorno_ativo: tempConfig.comissao_retorno_ativo ?? configuracao?.comissao_retorno_ativo ?? false,
        observacoes: tempConfig.observacoes ?? configuracao?.observacoes ?? '',
      };

      if (tempConfig.tipo_comissao === 'fixo') {
        dadosCompletos.comissao_fixa_padrao = tempConfig.comissao_fixa_padrao;
        dadosCompletos.comissao_padrao = configuracao?.comissao_padrao || 10;
      } else {
        dadosCompletos.comissao_padrao = tempConfig.comissao_padrao;
        dadosCompletos.comissao_fixa_padrao = configuracao?.comissao_fixa_padrao || 0;
      }

      const configSalva = await salvarConfiguracaoViaApi(dadosCompletos);
      setConfiguracao(configSalva);
      setEditandoConfig(false);
      setTempConfig({});
      addToast('success', 'Configurações atualizadas com sucesso!');
    } catch (error) {
      console.error('❌ Erro ao salvar configurações:', error);
      addToast('error', error instanceof Error ? error.message : 'Erro ao salvar configurações');
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

  const tecnicosFiltrados = tecnicos.filter((tecnico) => {
    const termo = buscaTecnico.trim().toLowerCase();
    if (!termo) return true;
    return (
      tecnico.nome.toLowerCase().includes(termo) ||
      tecnico.email.toLowerCase().includes(termo) ||
      (tecnico.comissao_observacoes || '').toLowerCase().includes(termo)
    );
  });

  const tecnicosAtivos = tecnicos.filter((t) => t.comissao_ativa).length;

  const iniciaisTecnico = (nome: string) =>
    nome
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((parte) => parte[0]?.toUpperCase() ?? '')
      .join('');

  const formatarValorComissao = (tecnico: Tecnico) =>
    tecnico.tipo_comissao === 'fixo'
      ? `R$ ${(tecnico.comissao_fixa ?? 0).toFixed(2)}`
      : `${tecnico.comissao_percentual ?? 0}%`;

  if (loading) {
    return (
      <div className="p-6 max-w-7xl mx-auto">
        <div className="flex items-center justify-center min-h-[320px]">
          <div className="text-center space-y-4">
            <div className="animate-spin rounded-full h-10 w-10 border-2 border-gray-200 border-t-gray-900 mx-auto" />
            <p className="text-sm text-gray-500">Carregando configurações de comissão...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 ring-1 ring-emerald-100">
            <FiDollarSign size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-gray-900">Gerenciar Comissões</h1>
            <p className="mt-1 text-sm text-gray-500">
              Configure percentuais e regras de comissão para técnicos
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-700">
            <FiUsers size={14} />
            {tecnicos.length} {tecnicos.length === 1 ? 'técnico' : 'técnicos'}
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700 ring-1 ring-emerald-100">
            <FiCheck size={14} />
            {tecnicosAtivos} ativo{tecnicosAtivos !== 1 ? 's' : ''}
          </span>
        </div>
      </div>

      {/* Configurações Gerais */}
      <Card className="py-0 gap-0 overflow-hidden">
        <div className="flex items-center justify-between gap-4 border-b px-6 py-5">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
              <FiSettings size={16} />
            </div>
            <div>
              <h2 className="text-base font-semibold leading-none">Configurações Gerais</h2>
              <p className="text-xs text-gray-500 mt-1">Regras padrão aplicadas a novos técnicos</p>
            </div>
          </div>
          {!editandoConfig && (
            <Button type="button" onClick={iniciarEdicaoConfig} variant="outline" size="sm">
              <FiEdit size={14} className="mr-1.5" />
              Editar
            </Button>
          )}
        </div>

        <CardContent className="py-5">
          {editandoConfig ? (
            <div className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">Tipo de Comissão</label>
                  <select
                    value={tempConfig.tipo_comissao || 'porcentagem'}
                    onChange={(e) => {
                      const novoTipo = e.target.value as 'porcentagem' | 'fixo';
                      setTempConfig((prev) => ({
                        ...prev,
                        tipo_comissao: novoTipo,
                        comissao_fixa_padrao: novoTipo === 'fixo' ? (prev.comissao_fixa_padrao || 0) : undefined,
                        comissao_padrao: novoTipo === 'porcentagem' ? (prev.comissao_padrao || 10) : undefined,
                      }));
                    }}
                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm focus:border-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900/10"
                  >
                    <option value="porcentagem">Porcentagem (%)</option>
                    <option value="fixo">Valor fixo por aparelho (R$)</option>
                  </select>
                  <p className="text-xs text-gray-500">Escolha como a comissão será calculada para cada entrega</p>
                </div>

                {tempConfig.tipo_comissao === 'fixo' ? (
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700">Valor fixo padrão (R$)</label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={tempConfig.comissao_fixa_padrao ?? ''}
                      onChange={(e) => {
                        const valor = e.target.value === '' ? 0 : parseFloat(e.target.value);
                        setTempConfig((prev) => ({ ...prev, comissao_fixa_padrao: isNaN(valor) ? 0 : valor }));
                      }}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900/10"
                      placeholder="0,00"
                    />
                  </div>
                ) : (
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700">Comissão padrão (%)</label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="0.01"
                      value={tempConfig.comissao_padrao ?? ''}
                      onChange={(e) => {
                        const valor = e.target.value === '' ? 0 : parseFloat(e.target.value);
                        setTempConfig((prev) => ({ ...prev, comissao_padrao: isNaN(valor) ? 0 : valor }));
                      }}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900/10"
                      placeholder="10,00"
                    />
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-gray-200 bg-gray-50/60 p-4 transition-colors hover:bg-gray-50">
                  <input
                    type="checkbox"
                    checked={tempConfig.comissao_apenas_servico || false}
                    onChange={(e) => setTempConfig((prev) => ({ ...prev, comissao_apenas_servico: e.target.checked }))}
                    className="mt-0.5 rounded border-gray-300 text-gray-900 focus:ring-gray-900"
                  />
                  <span>
                    <span className="block text-sm font-medium text-gray-900">Apenas serviços</span>
                    <span className="block text-xs text-gray-500 mt-0.5">Não incluir peças no cálculo</span>
                  </span>
                </label>

                <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-gray-200 bg-gray-50/60 p-4 transition-colors hover:bg-gray-50">
                  <input
                    type="checkbox"
                    checked={tempConfig.comissao_retorno_ativo || false}
                    onChange={(e) => setTempConfig((prev) => ({ ...prev, comissao_retorno_ativo: e.target.checked }))}
                    className="mt-0.5 rounded border-gray-300 text-gray-900 focus:ring-gray-900"
                  />
                  <span>
                    <span className="block text-sm font-medium text-gray-900">Retornos e garantias</span>
                    <span className="block text-xs text-gray-500 mt-0.5">Técnico recebe comissão nesses casos</span>
                  </span>
                </label>
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">Observações</label>
                <textarea
                  value={tempConfig.observacoes || ''}
                  onChange={(e) => setTempConfig((prev) => ({ ...prev, observacoes: e.target.value }))}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900/10 resize-none"
                  rows={3}
                  placeholder="Regras adicionais ou observações internas..."
                />
              </div>

              <div className="flex flex-wrap gap-2 pt-1 border-t border-gray-100">
                <Button type="button" onClick={salvarConfiguracao} disabled={salvando}>
                  <FiSave size={16} className="mr-1.5" />
                  {salvando ? 'Salvando...' : 'Salvar alterações'}
                </Button>
                <Button type="button" onClick={cancelarEdicaoConfig} variant="outline" disabled={salvando}>
                  <FiX size={16} className="mr-1.5" />
                  Cancelar
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="rounded-xl border border-blue-100 bg-gradient-to-br from-blue-50 to-white p-4">
                  <div className="flex items-center gap-2 text-blue-600 mb-2">
                    <FiPercent size={16} />
                    <span className="text-xs font-semibold uppercase tracking-wide">
                      {configuracao?.tipo_comissao === 'fixo' ? 'Valor fixo' : 'Comissão padrão'}
                    </span>
                  </div>
                  <p className="text-2xl font-bold text-gray-900">
                    {configuracao?.tipo_comissao === 'fixo'
                      ? `R$ ${(configuracao?.comissao_fixa_padrao ?? 0).toFixed(2)}`
                      : `${configuracao?.comissao_padrao ?? 10}%`}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    {configuracao?.tipo_comissao === 'fixo' ? 'Por aparelho entregue' : 'Sobre o valor base'}
                  </p>
                </div>

                <div className="rounded-xl border border-emerald-100 bg-gradient-to-br from-emerald-50 to-white p-4">
                  <div className="flex items-center gap-2 text-emerald-600 mb-2">
                    <FiTool size={16} />
                    <span className="text-xs font-semibold uppercase tracking-wide">Base de cálculo</span>
                  </div>
                  <p className="text-lg font-bold text-gray-900">
                    {(configuracao?.comissao_apenas_servico ?? true) ? 'Apenas serviços' : 'Serviços + peças'}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">Itens considerados no valor</p>
                </div>

                <div className="rounded-xl border border-amber-100 bg-gradient-to-br from-amber-50 to-white p-4">
                  <div className="flex items-center gap-2 text-amber-600 mb-2">
                    <FiShield size={16} />
                    <span className="text-xs font-semibold uppercase tracking-wide">Retornos</span>
                  </div>
                  <p className="text-lg font-bold text-gray-900">
                    {(configuracao?.comissao_retorno_ativo ?? false) ? 'Com comissão' : 'Sem comissão'}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">Garantias e retornos</p>
                </div>
              </div>

              {configuracao?.observacoes && (
                <div className="rounded-xl border border-gray-200 bg-gray-50/80 px-4 py-3">
                  <p className="text-xs font-medium uppercase tracking-wide text-gray-500 mb-1">Observações</p>
                  <p className="text-sm text-gray-700">{configuracao.observacoes}</p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Lista de Técnicos */}
      <Card className="py-0 gap-0 overflow-hidden">
        <CardHeader className="border-b py-5">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-50 text-violet-600">
              <FiUsers size={16} />
            </div>
            <div>
              <CardTitle className="text-base">Comissões por Técnico</CardTitle>
              <p className="text-xs text-gray-500 mt-0.5">Valores individuais sobrescrevem a configuração padrão</p>
            </div>
          </div>
        </CardHeader>

        {tecnicos.length > 0 && (
          <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50">
            <div className="relative max-w-md">
              <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
              <input
                type="text"
                value={buscaTecnico}
                onChange={(e) => setBuscaTecnico(e.target.value)}
                placeholder="Buscar por nome, e-mail ou observação..."
                className="w-full rounded-lg border border-gray-300 bg-white py-2.5 pl-10 pr-3 text-sm focus:border-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900/10"
              />
            </div>
          </div>
        )}

        {tecnicos.length === 0 ? (
          <CardContent className="py-16 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-gray-100 text-gray-400">
              <FiUsers size={24} />
            </div>
            <h3 className="text-base font-semibold text-gray-900 mb-1">Nenhum técnico encontrado</h3>
            <p className="text-sm text-gray-500 max-w-sm mx-auto">
              Cadastre técnicos em Usuários para configurar comissões individuais.
            </p>
          </CardContent>
        ) : tecnicosFiltrados.length === 0 ? (
          <CardContent className="py-12 text-center">
            <p className="text-sm text-gray-500">Nenhum técnico corresponde à busca.</p>
            <Button variant="ghost" size="sm" className="mt-3" onClick={() => setBuscaTecnico('')}>
              Limpar busca
            </Button>
          </CardContent>
        ) : (
          <div className="divide-y divide-gray-100">
            {tecnicosFiltrados.map((tecnico) => {
              const editando = editandoTecnico === tecnico.id;

              return (
                <div
                  key={tecnico.id}
                  className={cn(
                    'px-6 py-5 transition-colors',
                    editando ? 'bg-blue-50/40' : 'hover:bg-gray-50/80'
                  )}
                >
                  <div className="flex flex-col gap-4 xl:grid xl:grid-cols-[minmax(200px,1.2fr)_minmax(180px,0.9fr)_100px_minmax(160px,1fr)_auto] xl:items-center xl:gap-4">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gray-900 text-xs font-semibold text-white">
                        {iniciaisTecnico(tecnico.nome) || '?'}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-gray-900">{tecnico.nome}</p>
                        <p className="truncate text-xs text-gray-500">{tecnico.email}</p>
                      </div>
                    </div>

                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-1.5 xl:hidden">Comissão</p>
                      {editando ? (
                        <div className="flex gap-2">
                          <select
                            value={tempTecnico.tipo_comissao || 'porcentagem'}
                            onChange={(e) => setTempTecnico((prev) => ({ ...prev, tipo_comissao: e.target.value as 'porcentagem' | 'fixo' }))}
                            className="w-[130px] shrink-0 rounded-lg border border-gray-300 bg-white px-2.5 py-2 text-sm focus:border-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900/10"
                          >
                            <option value="porcentagem">%</option>
                            <option value="fixo">R$ fixo</option>
                          </select>
                          {tempTecnico.tipo_comissao === 'fixo' ? (
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={tempTecnico.comissao_fixa ?? ''}
                              onChange={(e) => setTempTecnico((prev) => ({ ...prev, comissao_fixa: parseFloat(e.target.value) }))}
                              className="min-w-0 flex-1 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900/10"
                              placeholder="0,00"
                            />
                          ) : (
                            <input
                              type="number"
                              min="0"
                              max="100"
                              step="0.01"
                              value={tempTecnico.comissao_percentual || ''}
                              onChange={(e) => setTempTecnico((prev) => ({ ...prev, comissao_percentual: parseFloat(e.target.value) }))}
                              className="min-w-0 flex-1 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900/10"
                              placeholder="10,00"
                            />
                          )}
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <span className={cn('text-lg font-bold tabular-nums', tecnico.comissao_ativa ? 'text-emerald-600' : 'text-gray-400')}>
                            {formatarValorComissao(tecnico)}
                          </span>
                          <span className="rounded-md bg-gray-100 px-2 py-0.5 text-[10px] font-medium uppercase text-gray-600">
                            {tecnico.tipo_comissao === 'fixo' ? 'Fixo' : '%'}
                          </span>
                        </div>
                      )}
                    </div>

                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-1.5 xl:hidden">Status</p>
                      {editando ? (
                        <label className="inline-flex cursor-pointer items-center gap-2">
                          <input
                            type="checkbox"
                            checked={tempTecnico.comissao_ativa || false}
                            onChange={(e) => setTempTecnico((prev) => ({ ...prev, comissao_ativa: e.target.checked }))}
                            className="rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                          />
                          <span className="text-sm text-gray-700">Ativo</span>
                        </label>
                      ) : (
                        <span className={cn(
                          'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium',
                          tecnico.comissao_ativa ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100' : 'bg-gray-100 text-gray-600'
                        )}>
                          <span className={cn('h-1.5 w-1.5 rounded-full', tecnico.comissao_ativa ? 'bg-emerald-500' : 'bg-gray-400')} />
                          {tecnico.comissao_ativa ? 'Ativo' : 'Inativo'}
                        </span>
                      )}
                    </div>

                    <div className="min-w-0">
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-1.5 xl:hidden">Observações</p>
                      {editando ? (
                        <input
                          type="text"
                          value={tempTecnico.comissao_observacoes || ''}
                          onChange={(e) => setTempTecnico((prev) => ({ ...prev, comissao_observacoes: e.target.value }))}
                          className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900/10"
                          placeholder="Observações..."
                        />
                      ) : (
                        <p className="truncate text-sm text-gray-600">
                          {tecnico.comissao_observacoes || <span className="text-gray-400 italic">Sem observações</span>}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center justify-end gap-1.5">
                      {editando ? (
                        <>
                          <Button onClick={() => salvarTecnico(tecnico.id)} size="sm" disabled={salvando} title="Salvar">
                            <FiCheck size={14} />
                          </Button>
                          <Button onClick={cancelarEdicaoTecnico} variant="outline" size="sm" title="Cancelar">
                            <FiX size={14} />
                          </Button>
                        </>
                      ) : (
                        <>
                          <Button onClick={() => iniciarEdicaoTecnico(tecnico)} variant="outline" size="sm" title="Editar comissão">
                            <FiEdit size={14} />
                          </Button>
                          {configuracao && (
                            <Button
                              onClick={() => aplicarComissaoPadrao(tecnico.id)}
                              variant="outline"
                              size="sm"
                              className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                              title="Aplicar comissão padrão"
                            >
                              <FiRefreshCw size={14} />
                            </Button>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}
