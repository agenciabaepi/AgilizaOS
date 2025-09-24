'use client';

import { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { supabasePublic } from '@/lib/supabasePublicClient';
import { FiClock, FiCheckCircle, FiAlertCircle, FiCamera, FiFileText, FiSmartphone, FiShield, FiUser, FiCalendar, FiTool, FiZoomIn, FiDownload, FiChevronRight } from 'react-icons/fi';
import ImagensOS from '@/components/ImagensOS';
import StatusHistoricoTimeline from '@/components/StatusHistoricoTimeline';

export default function OSPublicPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const osId = params.id as string;
  const senha = searchParams.get('senha');
  
  const [osData, setOsData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  // Dados de exemplo para fallback
  const exemploOS = {
    numero_os: 1234,
    categoria: 'Smartphone',
    marca: 'Samsung',
    modelo: 'Galaxy S21',
    status: 'EM_ANALISE',
    created_at: new Date().toISOString(),
    servico: 'Reparo de tela',
    observacao: 'Tela trincada, necessário troca',
    relato: 'Cliente relatou que o aparelho caiu e a tela quebrou',
    condicoes_equipamento: 'Aparelho em bom estado, apenas tela danificada',
    clientes: {
      nome: 'João Silva',
      telefone: '(11) 99999-9999',
      email: 'joao@email.com'
    },
    tecnico: {
      nome: 'Técnico Exemplo'
    },
    empresas: {
      nome: 'Empresa Exemplo',
      telefone: '(11) 3333-4444',
      email: 'contato@empresa.com'
    }
  };

  // Configuração de status
  const statusConfig = {
    'AGUARDANDO_ANALISE': { label: 'Aguardando Análise', color: 'bg-yellow-100 text-yellow-800', icon: FiClock },
    'EM_ANALISE': { label: 'Em Análise', color: 'bg-blue-100 text-blue-800', icon: FiAlertCircle },
    'AGUARDANDO_APROVACAO': { label: 'Aguardando Aprovação', color: 'bg-orange-100 text-orange-800', icon: FiClock },
    'APROVADO': { label: 'Aprovado', color: 'bg-green-100 text-green-800', icon: FiCheckCircle },
    'EM_REPARO': { label: 'Em Reparo', color: 'bg-purple-100 text-purple-800', icon: FiTool },
    'AGUARDANDO_RETIRADA': { label: 'Aguardando Retirada', color: 'bg-indigo-100 text-indigo-800', icon: FiClock },
    'ENTREGUE': { label: 'Entregue', color: 'bg-green-100 text-green-800', icon: FiCheckCircle },
    'CANCELADO': { label: 'Cancelado', color: 'bg-red-100 text-red-800', icon: FiAlertCircle },
    'RECUSADO_PELO_CLIENTE': { label: 'Recusado pelo Cliente', color: 'bg-red-100 text-red-800', icon: FiAlertCircle }
  };

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;

    console.log('🔍 Debug - useEffect executado:', { mounted, osId, senha });

    // Se não tem senha, redireciona para login
    if (!senha) {
      console.log('❌ Sem senha, redirecionando para login');
      window.location.href = `/os/${osId}/login`;
      return;
    }

    // Validação básica da senha
    if (senha.length !== 4 || !/^\d+$/.test(senha)) {
      console.log('❌ Senha inválida:', senha);
      setError('❌ Senha inválida! A senha deve ter 4 dígitos numéricos.');
      setLoading(false);
      return;
    }

    const fetchOSData = async () => {
      try {
        console.log('🔍 Debug - Iniciando busca REAL da OS:', { osId, senha });
        
        // Timeout de 10 segundos para consultas
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Timeout na consulta')), 10000);
        });
        
        // Primeiro verificar se a OS existe e validar senha
        console.log('🔍 Verificando se OS existe e senha...');
        const verifyQuery = supabasePublic
          .from('ordens_servico')
          .select('id, numero_os, senha_acesso')
          .eq('id', osId)
          .single();

        const { data: osExists, error: existsError } = await Promise.race([verifyQuery, timeoutPromise]) as any;

        console.log('🔍 Verificação OS:', { osExists, existsError });

        if (existsError) {
          console.log('❌ Erro ao verificar OS:', existsError.message);
          setError(`OS não encontrada: ${existsError.message}`);
          setLoading(false);
          return;
        }

        if (!osExists) {
          console.log('❌ OS não existe');
          setError('OS não encontrada');
          setLoading(false);
          return;
        }

        // Verificar senha
        if (osExists.senha_acesso !== senha) {
          console.log('❌ Senha incorreta');
          setError('❌ Senha incorreta! Verifique os 4 dígitos que estão impressos na sua OS.');
          setLoading(false);
          return;
        }

        console.log('✅ Senha validada! Buscando dados completos...');

        // Buscar dados completos REAIS - Teste com consulta mais simples
        console.log('🔍 Testando consulta simples primeiro...');
        const simpleQuery = supabasePublic
          .from('ordens_servico')
          .select('id, numero_os, categoria, marca, modelo, status, servico, cliente_id, tecnico_id, empresa_id')
          .eq('id', osId)
          .single();

        const { data: simpleData, error: simpleError } = await Promise.race([simpleQuery, timeoutPromise]) as any;
        console.log('🔍 Dados simples:', { simpleData, simpleError });
        console.log('🔍 IDs das foreign keys:', {
          cliente_id: simpleData?.cliente_id,
          tecnico_id: simpleData?.tecnico_id,
          empresa_id: simpleData?.empresa_id
        });

        if (simpleError) {
          console.log('❌ Erro na consulta simples:', simpleError.message);
          setError(`Erro ao buscar dados: ${simpleError.message}`);
          setLoading(false);
          return;
        }

        // 🚨 SOLUÇÃO: Usar cliente principal para buscar dados completos
        console.log('🔍 Buscando dados reais com cliente principal...');
        
        // Importar cliente principal temporariamente
        const { supabase: supabaseMain } = await import('@/lib/supabaseClient');
        
        // Buscar dados completos com cliente principal (que tem permissões)
        const dataQuery = supabaseMain
          .from('ordens_servico')
          .select(`
            id,
            numero_os,
            categoria,
            marca,
            modelo,
            status,
            created_at,
            servico,
            observacao,
            problema_relatado,
            condicoes_equipamento,
            senha_aparelho,
            senha_padrao,
            imagens,
            cliente_id,
            tecnico_id,
            empresa_id,
            clientes(nome, telefone, email),
            tecnico:usuarios(nome),
            empresas(nome, telefone, email, logo_url)
          `)
          .eq('id', osId)
          .single();

        const { data, error } = await Promise.race([dataQuery, timeoutPromise]) as any;
        console.log('🔍 Dados completos REAIS:', { data, error });

        if (error) {
          console.log('❌ Erro ao buscar dados:', error.message);
          setError(`Erro ao buscar dados: ${error.message}`);
          setLoading(false);
          return;
        }

        if (data) {
          console.log('✅ Dados REAIS carregados!');
          console.log('🔍 Debug - Cliente:', data.clientes);
          console.log('🔍 Debug - Empresa:', data.empresas);
          console.log('🔍 Debug - Servico:', data.servico);
          console.log('🔍 Debug - Tecnico:', data.tecnico);
          console.log('🔍 Debug - Imagens:', data.imagens);
          console.log('🔍 Debug - IDs das foreign keys:', {
            cliente_id: data.cliente_id,
            tecnico_id: data.tecnico_id,
            empresa_id: data.empresa_id
          });
          console.log('🔍 Debug - TODOS os campos:', data);
          
          // Buscar histórico de status
          console.log('🔍 Buscando histórico de status...');
          const { data: historicoData, error: historicoError } = await supabaseMain
            .from('status_historico')
            .select(`
              id,
              status_anterior,
              status_novo,
              usuario_nome,
              motivo,
              created_at,
              tempo_no_status_anterior
            `)
            .eq('os_id', osId)
            .order('created_at', { ascending: false });

          console.log('🔍 Histórico de status:', { historicoData, historicoError });
          
          // Buscar dados do cliente e empresa separadamente
          let clienteData = null;
          let empresaData = null;
          
          if (data.cliente_id) {
            console.log('🔍 Buscando dados do cliente separadamente...');
            const { data: cliente, error: clienteError } = await supabaseMain
              .from('clientes')
              .select('nome, telefone, email')
              .eq('id', data.cliente_id)
              .single();
            console.log('🔍 Cliente separado:', { cliente, clienteError });
            clienteData = cliente;
          }
          
          if (data.empresa_id) {
            console.log('🔍 Buscando dados da empresa separadamente...');
            const { data: empresa, error: empresaError } = await supabaseMain
              .from('empresas')
              .select('nome, telefone, email, logo_url')
              .eq('id', data.empresa_id)
              .single();
            console.log('🔍 Empresa separada:', { empresa, empresaError });
            empresaData = empresa;
          }
          
          // Combinar dados da OS com histórico e dados separados
          const dadosCompletos = {
            ...data,
            clientes: clienteData,
            empresas: empresaData,
            historico: historicoData || []
          };
          
          setOsData(dadosCompletos);
          setLoading(false);
        } else {
          console.log('❌ Nenhum dado retornado');
          setError('Erro ao carregar dados da OS');
          setLoading(false);
        }
      } catch (err: any) {
        console.log('❌ Erro geral na busca:', err.message);
        setError(`Erro ao conectar: ${err.message}`);
        setLoading(false);
      }
    };

    fetchOSData();
  }, [mounted, osId, senha]);

  if (!mounted) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 text-lg">Carregando...</p>
        </div>
      </div>
    );
  }

  if (loading || !osData) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 text-lg">Carregando informações da OS...</p>
        </div>
      </div>
    );
  }

  if (error) {
    const isPasswordError = error.includes('Senha incorreta');
    
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center max-w-md mx-auto p-6">
          <div className={`rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4 ${
            isPasswordError ? 'bg-red-100' : 'bg-red-100'
          }`}>
            <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            {isPasswordError ? 'Senha Incorreta' : 'Erro ao carregar a OS'}
          </h2>
          <p className="text-gray-600 mb-6">{error}</p>
          
          {isPasswordError && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
              <p className="text-yellow-800 text-sm">
                <strong>💡 Dica:</strong> A senha de 4 dígitos está impressa na sua OS, 
                logo abaixo do QR Code. Verifique se você digitou corretamente.
              </p>
            </div>
          )}
          
          <div className="space-y-3">
            <button
              onClick={() => window.location.href = `/os/${osId}/login`}
              className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors"
            >
              {isPasswordError ? 'Tentar Novamente' : 'Voltar ao Login'}
            </button>
            {!isPasswordError && (
              <button
                onClick={() => window.location.reload()}
                className="w-full bg-gray-600 text-white py-2 px-4 rounded-lg hover:bg-gray-700 transition-colors"
              >
                Tentar Novamente
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  const currentStatus = statusConfig[osData.status as keyof typeof statusConfig] || statusConfig.EM_ANALISE;
  const StatusIcon = currentStatus.icon;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Acompanhamento de OS
          </h1>
          <p className="text-xl text-gray-600">OS #{osData.numero_os}</p>
        </div>

        {/* Status Atual */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex items-center justify-center mb-4">
            <div className={`inline-flex items-center px-4 py-2 rounded-full text-sm font-medium ${currentStatus.color}`}>
              <StatusIcon className="w-4 h-4 mr-2" />
              {currentStatus.label}
            </div>
          </div>
          <p className="text-center text-gray-600">
            Status atualizado em {new Date(osData.created_at).toLocaleDateString('pt-BR')}
          </p>
        </div>

        {/* Grid de Informações */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          {/* Informações do Cliente */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center mb-4">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center mr-3">
                <FiUser className="w-5 h-5 text-blue-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">Cliente</h3>
            </div>
            <div className="space-y-2">
              <p><span className="font-medium">Nome:</span> {osData.clientes?.nome || 'Não informado'}</p>
              <p><span className="font-medium">Telefone:</span> {osData.clientes?.telefone || 'Não informado'}</p>
              <p><span className="font-medium">Email:</span> {osData.clientes?.email || 'Não informado'}</p>
            </div>
          </div>

          {/* Informações do Equipamento */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center mb-4">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center mr-3">
                <FiSmartphone className="w-5 h-5 text-green-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">Equipamento</h3>
            </div>
            <div className="space-y-2">
              <p><span className="font-medium">Categoria:</span> {osData.categoria || 'Não informado'}</p>
              <p><span className="font-medium">Marca:</span> {osData.marca || 'Não informado'}</p>
              <p><span className="font-medium">Modelo:</span> {osData.modelo || 'Não informado'}</p>
            </div>
          </div>

          {/* Informações do Serviço */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center mb-4">
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center mr-3">
                <FiFileText className="w-5 h-5 text-purple-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">Serviço</h3>
            </div>
            <div className="space-y-2">
              <p><span className="font-medium">Técnico:</span> {osData.tecnico?.nome || 'Não informado'}</p>
            </div>
          </div>

          {/* Informações da Empresa */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center mb-4">
              <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center mr-3">
                <FiCalendar className="w-5 h-5 text-orange-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">Empresa</h3>
            </div>
            <div className="space-y-2">
              <p><span className="font-medium">Nome:</span> {osData.empresas?.nome || 'Não informado'}</p>
              <p><span className="font-medium">Telefone:</span> {osData.empresas?.telefone || 'Não informado'}</p>
              <p><span className="font-medium">Email:</span> {osData.empresas?.email || 'Não informado'}</p>
            </div>
          </div>
        </div>

        {/* Informações de Acesso */}
        {(osData.senha_aparelho || osData.senha_padrao) && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
            <div className="flex items-center mb-4">
              <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center mr-3">
                <FiShield className="w-5 h-5 text-indigo-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">Informações de Acesso</h3>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {osData.senha_aparelho && (
                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                  <div className="p-1.5 bg-gray-100 rounded">
                    <FiShield className="w-4 h-4 text-gray-600" />
                  </div>
                  <div>
                    <span className="text-sm font-medium text-gray-700">Senha do Aparelho:</span>
                    <p className="font-mono text-gray-800 bg-white px-2 py-1 rounded text-sm mt-1 border">
                      {osData.senha_aparelho}
                    </p>
                  </div>
                </div>
              )}
              
              {osData.senha_padrao && (
                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                  <div className="p-1.5 bg-gray-100 rounded">
                    <FiSmartphone className="w-4 h-4 text-gray-600" />
                  </div>
                  <div className="flex-1">
                    <span className="text-sm font-medium text-gray-700">Padrão de Desenho:</span>
                    <div className="mt-2">
                      <div className="grid grid-cols-3 gap-1 w-24 bg-white border border-gray-300 rounded p-2">
                        {Array.from({ length: 9 }, (_, index) => {
                          const pattern = JSON.parse(osData.senha_padrao);
                          const isSelected = pattern.includes(index);
                          const sequenceNumber = isSelected ? pattern.indexOf(index) + 1 : null;
                          return (
                            <div
                              key={index}
                              className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                                isSelected
                                  ? 'bg-gray-800 border-gray-800'
                                  : 'bg-gray-100 border-gray-300'
                              }`}
                            >
                              {isSelected && (
                                <span className="text-xs font-medium text-white">
                                  {sequenceNumber}
                                </span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Observações */}
        {(osData.observacao || osData.problema_relatado || osData.condicoes_equipamento) && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Observações</h3>
            <div className="space-y-3">
              {osData.problema_relatado && (
                <div>
                  <p className="font-medium text-gray-700">Relato do Cliente:</p>
                  <p className="text-gray-600">{osData.problema_relatado}</p>
                </div>
              )}
              {osData.condicoes_equipamento && (
                <div>
                  <p className="font-medium text-gray-700">Condições do Equipamento:</p>
                  <p className="text-gray-600">{osData.condicoes_equipamento}</p>
                </div>
              )}
              {osData.observacao && (
                <div>
                  <p className="font-medium text-gray-700">Observações Técnicas:</p>
                  <p className="text-gray-600">{osData.observacao}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Imagens do Equipamento */}
        {osData.imagens && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Imagens do Equipamento</h3>
            <ImagensOS 
              imagens={osData.imagens || ''} 
              ordemId={osData.numero_os || osData.id} 
            />
          </div>
        )}

        {/* Histórico de Status */}
        {osData.historico && osData.historico.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Histórico de Status</h3>
            <StatusHistoricoTimeline 
              historico={osData.historico} 
              loading={false}
              compact={true}
            />
          </div>
        )}
      </div>
    </div>
  );
}
