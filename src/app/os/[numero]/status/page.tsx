'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { FiClock, FiCheckCircle, FiAlertCircle, FiCamera, FiFileText, FiSmartphone, FiUser, FiCalendar, FiTool } from 'react-icons/fi';

export default function OSPublicPage() {
  const params = useParams();
  const numeroOS = params.numero as string;
  
  const [osData, setOsData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const [senhaValida, setSenhaValida] = useState(false);

  // Dados de exemplo para fallback
  const exemploOS = {
    numero_os: parseInt(numeroOS),
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
    }
  };

  useEffect(() => {
    const fetchOSData = async () => {
      try {
        // Verificar se tem senha na URL
        const urlParams = new URLSearchParams(window.location.search);
        const senha = urlParams.get('senha');
        
        if (!senha) {
          // Sem senha, redirecionar para login
          window.location.href = `/os/${numeroOS}/login`;
          return;
        }

        // Primeiro tenta buscar dados reais do Supabase
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Timeout na busca da OS')), 10000)
        );

        const queryPromise = supabase
          .from('ordens_servico')
          .select(`
            id,
            numero_os,
            categoria,
            marca,
            modelo,
            status,
            status_tecnico,
            created_at,
            data_entrega,
            valor_faturado,
            servico,
            peca,
            observacao,
            relato,
            condicoes_equipamento,
            cor,
            numero_serie,
            acessorios,
            senha_acesso,
            clientes!left(nome, telefone, email, cpf, endereco),
            tecnico:usuarios!left(nome),
            empresas!left(nome, cnpj, endereco, telefone, email, logo_url)
          `)
          .eq('numero_os', parseInt(numeroOS))
          .eq('senha_acesso', senha)
          .single();

        const { data, error } = await Promise.race([queryPromise, timeoutPromise]) as any;

        console.log('🔍 Debug - Query resultado:', { data, error, numeroOS });

        if (error) {
          console.log('❌ Erro ao buscar OS real:', error.message);
          // Se der erro (senha incorreta), redirecionar para login
          window.location.href = `/os/${numeroOS}/login`;
          return;
        }

        if (data) {
          console.log('✅ Dados reais encontrados:', data);
          // Se encontrou dados reais, usa eles
          setOsData(data);
          setSenhaValida(true);
          setLoading(false);
        } else {
          console.log('⚠️ Nenhum dado encontrado, senha incorreta');
          // Senha incorreta, redirecionar para login
          window.location.href = `/os/${numeroOS}/login`;
        }
      } catch (err: any) {
        console.log('Timeout ou erro na busca, usando dados de exemplo:', err.message);
        // Se der timeout ou erro, usa dados de exemplo
        setOsData(exemploOS);
        setLoading(false);
      }
    };

    fetchOSData();
  }, [numeroOS]);

  useEffect(() => {
    setMounted(true);
  }, []);

  const statusConfig = {
    'EM_ANALISE': { 
      label: 'Em Análise', 
      color: 'bg-blue-100 text-blue-800 border-blue-200',
      icon: FiAlertCircle,
      description: 'Nossa equipe está analisando o problema do seu aparelho.'
    },
    'AGUARDANDO_PECA': { 
      label: 'Aguardando Peça', 
      color: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      icon: FiClock,
      description: 'Aguardando a chegada da peça necessária para o reparo.'
    },
    'EM_REPARO': { 
      label: 'Em Reparo', 
      color: 'bg-orange-100 text-orange-800 border-orange-200',
      icon: FiCheckCircle,
      description: 'Seu aparelho está sendo reparado por nossa equipe técnica.'
    },
    'AGUARDANDO_RETIRADA': { 
      label: 'Pronto para Retirada', 
      color: 'bg-green-100 text-green-800 border-green-200',
      icon: FiCheckCircle,
      description: 'Seu aparelho está pronto! Você pode retirar na loja.'
    },
    'ENTREGUE': { 
      label: 'Entregue', 
      color: 'bg-green-100 text-green-800 border-green-200',
      icon: FiCheckCircle,
      description: 'Aparelho entregue ao cliente.'
    },
    'CANCELADO': { 
      label: 'Cancelado', 
      color: 'bg-red-100 text-red-800 border-red-200',
      icon: FiAlertCircle,
      description: 'OS cancelada.'
    }
  };

  const getStatusInfo = (status: string) => {
    return statusConfig[status as keyof typeof statusConfig] || {
      label: status,
      color: 'bg-gray-100 text-gray-800 border-gray-200',
      icon: FiClock,
      description: 'Status atualizado'
    };
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Sempre mostra loading até estar completamente hidratado e carregado
  if (!mounted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 text-lg">Carregando informações da OS...</p>
        </div>
      </div>
    );
  }

  // Após montado, mostra loading se ainda carregando ou sem dados
  if (loading || !osData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 text-lg">Carregando informações da OS...</p>
        </div>
      </div>
    );
  }

  // Se chegou até aqui, tem dados para renderizar

  const statusInfo = getStatusInfo(osData.status);
  const StatusIcon = statusInfo.icon;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Acompanhamento de OS</h1>
              <p className="text-gray-600 mt-1">OS #{osData.numero_os}</p>
            </div>
            <div className="text-right">
              <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${statusInfo.color}`}>
                <StatusIcon className="w-4 h-4 mr-2" />
                {statusInfo.label}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Status Card */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
          <div className="text-center">
            <div className={`inline-flex items-center px-4 py-2 rounded-full text-lg font-medium border ${statusInfo.color} mb-4`}>
              <StatusIcon className="w-5 h-5 mr-3" />
              {statusInfo.label}
            </div>
            <p className="text-gray-600 text-lg">{statusInfo.description}</p>
          </div>
        </div>

        {/* Grid Principal */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Coluna Esquerda - Informações Principais */}
          <div className="lg:col-span-2 space-y-6">
            {/* Cliente */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <FiUser className="w-5 h-5 text-blue-600" />
                </div>
                <h2 className="text-xl font-semibold text-gray-900">Cliente</h2>
              </div>
              <div className="space-y-3">
                <div>
                  <p className="text-lg font-medium text-gray-900">{osData.clientes?.nome || 'Nome não informado'}</p>
                </div>
                <div className="text-sm">
                  <div>
                    <span className="text-gray-600">Telefone:</span>
                    <p className="font-medium text-gray-900">{osData.clientes?.telefone || '---'}</p>
                  </div>
                  <div className="mt-2">
                    <span className="text-gray-600">Email:</span>
                    <p className="font-medium text-gray-900">{osData.clientes?.email || '---'}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Aparelho */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-green-100 rounded-lg">
                  <FiSmartphone className="w-5 h-5 text-green-600" />
                </div>
                <h2 className="text-xl font-semibold text-gray-900">Aparelho</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-600">Categoria:</span>
                  <p className="font-medium text-gray-900">{osData.categoria || '---'}</p>
                </div>
                <div>
                  <span className="text-gray-600">Marca:</span>
                  <p className="font-medium text-gray-900">{osData.marca || '---'}</p>
                </div>
                <div>
                  <span className="text-gray-600">Modelo:</span>
                  <p className="font-medium text-gray-900">{osData.modelo || '---'}</p>
                </div>
                <div>
                  <span className="text-gray-600">Data de Entrada:</span>
                  <p className="font-medium text-gray-900">{formatDate(osData.created_at)}</p>
                </div>
              </div>
            </div>

            {/* Serviço */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-orange-100 rounded-lg">
                  <FiFileText className="w-5 h-5 text-orange-600" />
                </div>
                <h2 className="text-xl font-semibold text-gray-900">Serviço</h2>
              </div>
              <div className="space-y-3 text-sm">
                <div>
                  <span className="text-gray-600">Tipo de Serviço:</span>
                  <p className="font-medium text-gray-900">{osData.servico || '---'}</p>
                </div>
                <div>
                  <span className="text-gray-600">Observações:</span>
                  <p className="font-medium text-gray-900">{osData.observacao || '---'}</p>
                </div>
                <div>
                  <span className="text-gray-600">Relato do Cliente:</span>
                  <p className="font-medium text-gray-900">{osData.relato || '---'}</p>
                </div>
                {osData.condicoes_equipamento && (
                  <div>
                    <span className="text-gray-600">Condições do Equipamento:</span>
                    <p className="font-medium text-gray-900">{osData.condicoes_equipamento}</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Coluna Direita - Informações Adicionais */}
          <div className="space-y-6">
            {/* Status Timeline */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <FiClock className="w-5 h-5 text-purple-600" />
                </div>
                <h2 className="text-xl font-semibold text-gray-900">Status</h2>
              </div>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className={`w-3 h-3 rounded-full ${statusInfo.color.includes('green') ? 'bg-green-500' : statusInfo.color.includes('blue') ? 'bg-blue-500' : statusInfo.color.includes('yellow') ? 'bg-yellow-500' : statusInfo.color.includes('orange') ? 'bg-orange-500' : 'bg-gray-500'}`}></div>
                  <span className="text-sm font-medium text-gray-900">{statusInfo.label}</span>
                </div>
                <p className="text-sm text-gray-600">{statusInfo.description}</p>
              </div>
            </div>

            {/* Informações da Empresa */}
            {osData.empresas && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-gray-100 rounded-lg">
                    <FiFileText className="w-5 h-5 text-gray-600" />
                  </div>
                  <h2 className="text-xl font-semibold text-gray-900">Empresa</h2>
                </div>
                <div className="space-y-2 text-sm">
                  <div>
                    <span className="text-gray-600">Nome:</span>
                    <p className="font-medium text-gray-900">{osData.empresas.nome}</p>
                  </div>
                  <div>
                    <span className="text-gray-600">Telefone:</span>
                    <p className="font-medium text-gray-900">{osData.empresas.telefone}</p>
                  </div>
                  <div>
                    <span className="text-gray-600">Email:</span>
                    <p className="font-medium text-gray-900">{osData.empresas.email}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Técnico Responsável */}
            {osData.tecnico && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-indigo-100 rounded-lg">
                    <FiUser className="w-5 h-5 text-indigo-600" />
                  </div>
                  <h2 className="text-xl font-semibold text-gray-900">Técnico</h2>
                </div>
                <div className="text-sm">
                  <span className="text-gray-600">Responsável:</span>
                  <p className="font-medium text-gray-900">{osData.tecnico.nome}</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-8 text-gray-600">
          <p className="text-sm">
            Dúvidas? Entre em contato conosco pelo telefone ou WhatsApp.
          </p>
        </div>
      </div>
    </div>
  );
}