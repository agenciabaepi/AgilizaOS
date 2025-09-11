'use client';

import { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { FiClock, FiCheckCircle, FiAlertCircle, FiCamera, FiFileText, FiSmartphone, FiUser, FiCalendar, FiTool } from 'react-icons/fi';

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

    // Se não tem senha, redireciona para login
    if (!senha) {
      window.location.href = `/os/${osId}/login`;
      return;
    }

    const fetchOSData = async () => {
      try {
        console.log('🔍 Debug - Buscando OS com ID:', osId, 'e senha:', senha);
        
        const { data, error } = await supabase
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
            relato,
            condicoes_equipamento,
            clientes(nome, telefone, email),
            tecnico:usuarios(nome),
            empresas(nome, telefone, email, logo_url)
          `)
          .eq('id', osId)
          .eq('senha_acesso', senha)
          .single();

        console.log('🔍 Debug - Query resultado:', { data, error, osId });

        if (error) {
          console.log('❌ Erro ao buscar OS real:', error.message);
          setError(`Erro ao buscar OS: ${error.message}`);
          setLoading(false);
          return;
        }

        if (data) {
          console.log('✅ Dados reais encontrados:', data);
          setOsData(data);
          setLoading(false);
        } else {
          console.log('⚠️ Nenhum dado encontrado');
          setError('OS não encontrada ou senha incorreta');
          setLoading(false);
        }
      } catch (err: any) {
        console.log('Timeout ou erro na busca:', err.message);
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
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center max-w-md mx-auto p-6">
          <div className="bg-red-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Erro ao carregar a OS</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <div className="space-y-3">
            <button
              onClick={() => window.location.href = `/os/${osId}/login`}
              className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Voltar ao Login
            </button>
            <button
              onClick={() => window.location.reload()}
              className="w-full bg-gray-600 text-white py-2 px-4 rounded-lg hover:bg-gray-700 transition-colors"
            >
              Tentar Novamente
            </button>
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
              <p><span className="font-medium">Nome:</span> {osData.clientes?.nome || 'N/A'}</p>
              <p><span className="font-medium">Telefone:</span> {osData.clientes?.telefone || 'N/A'}</p>
              <p><span className="font-medium">Email:</span> {osData.clientes?.email || 'N/A'}</p>
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
              <p><span className="font-medium">Categoria:</span> {osData.categoria || 'N/A'}</p>
              <p><span className="font-medium">Marca:</span> {osData.marca || 'N/A'}</p>
              <p><span className="font-medium">Modelo:</span> {osData.modelo || 'N/A'}</p>
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
              <p><span className="font-medium">Descrição:</span> {osData.servico || 'N/A'}</p>
              <p><span className="font-medium">Técnico:</span> {osData.tecnico?.nome || 'N/A'}</p>
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
              <p><span className="font-medium">Nome:</span> {osData.empresas?.nome || 'N/A'}</p>
              <p><span className="font-medium">Telefone:</span> {osData.empresas?.telefone || 'N/A'}</p>
              <p><span className="font-medium">Email:</span> {osData.empresas?.email || 'N/A'}</p>
            </div>
          </div>
        </div>

        {/* Observações */}
        {(osData.observacao || osData.relato || osData.condicoes_equipamento) && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Observações</h3>
            <div className="space-y-3">
              {osData.relato && (
                <div>
                  <p className="font-medium text-gray-700">Relato do Cliente:</p>
                  <p className="text-gray-600">{osData.relato}</p>
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
      </div>
    </div>
  );
}
