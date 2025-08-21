'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabaseClient';
import MenuLayout from '@/components/MenuLayout';
import ProtectedArea from '@/components/ProtectedArea';
import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
import { Select } from '@/components/Select';
import { 
  FiCalendar, 
  FiClock, 
  FiUser, 
  FiPhone, 
  FiMessageSquare, 
  FiAlertCircle, 
  FiCheckCircle, 
  FiFileText,
  FiTrendingUp,
  FiUsers,
  FiRefreshCw
} from 'react-icons/fi';

interface OS {
  id: string;
  numero_os: string;
  cliente_nome: string;
  tecnico_nome: string;
  status: string;
  data_cadastro: string;
  marca: string;
  modelo: string;
  problema_relatado: string;
  cliente_whatsapp?: string;
  cliente_email?: string;
}

interface EstatisticasDia {
  totalOS: number;
  osAbertas: number;
  osEmAndamento: number;
  osFinalizadas: number;
  clientesAtendidos: number;
}

export default function DashboardAtendente() {
  const { usuarioData, empresaData } = useAuth();
  const [osList, setOsList] = useState<OS[]>([]);
  const [estatisticas, setEstatisticas] = useState<EstatisticasDia>({
    totalOS: 0,
    osAbertas: 0,
    osEmAndamento: 0,
    osFinalizadas: 0,
    clientesAtendidos: 0
  });
  const [filtroStatus, setFiltroStatus] = useState<string>('todos');
  const [busca, setBusca] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [horaAtual, setHoraAtual] = useState<string>('');

  // Atualizar hora a cada minuto
  useEffect(() => {
    const atualizarHora = () => {
      const agora = new Date();
      setHoraAtual(agora.toLocaleTimeString('pt-BR', { 
        hour: '2-digit', 
        minute: '2-digit' 
      }));
    };
    
    atualizarHora();
    const interval = setInterval(atualizarHora, 60000);
    return () => clearInterval(interval);
  }, []);

  // Carregar dados
  useEffect(() => {
    if (empresaData?.id) {
      carregarDados();
    }
  }, [empresaData]);

  const carregarDados = async () => {
    try {
      setLoading(true);
      
      if (!empresaData?.id) {
        console.log('Empresa ID não disponível ainda');
        return;
      }

      console.log('Carregando dados para empresa:', empresaData.id);
      
      // Buscar OSs da empresa - simplificando a query primeiro
      console.log('Testando query simplificada...');
      const { data: osData, error: osError } = await supabase
        .from('ordens_servico')
        .select('*')
        .eq('empresa_id', empresaData.id)
        .order('data_cadastro', { ascending: false })
        .limit(20);

      if (osError) {
        console.error('Erro na consulta Supabase:', osError);
        throw osError;
      }

      console.log('OSs encontradas:', osData?.length || 0);

      // Buscar dados relacionados separadamente
      const clienteIds = [...new Set(osData?.map(os => os.cliente_id).filter(Boolean) || [])];
      const tecnicoIds = [...new Set(osData?.map(os => os.tecnico_id).filter(Boolean) || [])];

      console.log('Buscando clientes para IDs:', clienteIds);
      console.log('Buscando técnicos para IDs:', tecnicoIds);

      // Buscar clientes
      const { data: clientesData } = await supabase
        .from('clientes')
        .select('id, nome, whatsapp, email')
        .in('id', clienteIds.length > 0 ? clienteIds : ['']);

      // Buscar técnicos/usuários
      const { data: usuariosData } = await supabase
        .from('usuarios')
        .select('id, nome')
        .in('id', tecnicoIds.length > 0 ? tecnicoIds : ['']);

      console.log('Clientes encontrados:', clientesData?.length || 0);
      console.log('Usuários encontrados:', usuariosData?.length || 0);

      // Criar maps para lookup rápido
      const clientesMap = new Map(clientesData?.map(c => [c.id, c]) || []);
      const usuariosMap = new Map(usuariosData?.map(u => [u.id, u]) || []);

      // Processar dados
      const osProcessadas = osData?.map(os => {
        const cliente = clientesMap.get(os.cliente_id);
        const usuario = usuariosMap.get(os.tecnico_id);
        
        return {
          id: os.id,
          numero_os: os.numero_os || `OS-${os.id.slice(0, 8)}`,
          cliente_nome: cliente?.nome || 'Cliente não informado',
          tecnico_nome: usuario?.nome || 'Técnico não informado',
          status: os.status || 'ABERTA',
          data_cadastro: os.data_cadastro,
          marca: os.marca || 'Não informado',
          modelo: os.modelo || 'Não informado',
          problema_relatado: os.problema_relatado || 'Problema não especificado',
          cliente_whatsapp: cliente?.whatsapp,
          cliente_email: cliente?.email
        };
      }) || [];

      setOsList(osProcessadas);

      // Calcular estatísticas
      const hoje = new Date().toISOString().split('T')[0];
      const osHoje = osProcessadas.filter(os => 
        os.data_cadastro.startsWith(hoje)
      );

      setEstatisticas({
        totalOS: osProcessadas.length,
        osAbertas: osProcessadas.filter(os => os.status === 'ABERTA').length,
        osEmAndamento: osProcessadas.filter(os => 
          ['EM ANDAMENTO', 'AGUARDANDO PEÇA', 'AGUARDANDO CLIENTE'].includes(os.status)
        ).length,
        osFinalizadas: osProcessadas.filter(os => 
          ['FINALIZADA', 'ENTREGUE'].includes(os.status)
        ).length,
        clientesAtendidos: new Set(osHoje.map(os => os.cliente_nome)).size
      });

      console.log('Dados carregados com sucesso');

    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      // Mostrar erro mais detalhado
      if (error instanceof Error) {
        console.error('Mensagem de erro:', error.message);
        console.error('Stack trace:', error.stack);
      }
    } finally {
      setLoading(false);
    }
  };

  const getSaudacao = () => {
    const hora = new Date().getHours();
    if (hora < 12) return 'Bom dia';
    if (hora < 18) return 'Boa tarde';
    return 'Boa noite';
  };

  const getStatusColor = (status: string) => {
    switch (status.toUpperCase()) {
      case 'ABERTA': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'EM ANDAMENTO': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'AGUARDANDO PEÇA': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'AGUARDANDO CLIENTE': return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'FINALIZADA': return 'bg-green-100 text-green-800 border-green-200';
      case 'ENTREGUE': return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status.toUpperCase()) {
      case 'ABERTA': return <FiAlertCircle className="w-4 h-4" />;
      case 'EM ANDAMENTO': return <FiClock className="w-4 h-4" />;
      case 'AGUARDANDO PEÇA': return <FiClock className="w-4 h-4" />;
      case 'AGUARDANDO CLIENTE': return <FiClock className="w-4 h-4" />;
      case 'FINALIZADA': return <FiCheckCircle className="w-4 h-4" />;
      case 'ENTREGUE': return <FiCheckCircle className="w-4 h-4" />;
      default: return <FiFileText className="w-4 h-4" />;
    }
  };

  const filtrarOS = () => {
    let filtradas = osList;

    // Filtro por status
    if (filtroStatus !== 'todos') {
      filtradas = filtradas.filter(os => os.status === filtroStatus);
    }

    // Filtro por busca
    if (busca) {
      const buscaLower = busca.toLowerCase();
      filtradas = filtradas.filter(os => 
        os.numero_os.toLowerCase().includes(buscaLower) ||
        os.cliente_nome.toLowerCase().includes(buscaLower) ||
        os.marca.toLowerCase().includes(buscaLower) ||
        os.modelo.toLowerCase().includes(buscaLower)
      );
    }

    return filtradas;
  };

  const enviarAvisoCliente = async (os: OS, tipo: 'whatsapp' | 'email') => {
    try {
      if (tipo === 'whatsapp' && !os.cliente_whatsapp) {
        alert('Cliente não possui WhatsApp cadastrado');
        return;
      }

      if (tipo === 'email' && !os.cliente_email) {
        alert('Cliente não possui email cadastrado');
        return;
      }

      // Aqui você pode implementar o envio real de avisos
      if (tipo === 'whatsapp') {
        alert(`Aviso enviado via WhatsApp para ${os.cliente_nome}`);
      } else {
        alert(`Aviso enviado via email para ${os.cliente_nome}`);
      }
    } catch (error) {
      console.error('Erro ao enviar aviso:', error);
      alert('Erro ao enviar aviso');
    }
  };

  const osFiltradas = filtrarOS();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Carregando dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <MenuLayout>
      <ProtectedArea area="dashboard">
        <div className="p-8">
          {/* Header com Saudação */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                {getSaudacao()}, {usuarioData?.nome?.split(' ')[0]}! 👋
              </h1>
              <p className="text-gray-600 mt-1">
                {new Date().toLocaleDateString('pt-BR', { 
                  weekday: 'long', 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                })}
              </p>
            </div>
            <div className="text-right">
              <div className="text-4xl font-bold text-gray-900">{horaAtual}</div>
              <div className="text-gray-500 text-sm">Hora atual</div>
            </div>
          </div>

      {/* Cards de Estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total de OS</p>
              <p className="text-2xl font-bold text-gray-900">{estatisticas.totalOS}</p>
              <p className="text-xs text-gray-500 mt-1">Todas as ordens</p>
            </div>
            <div className="p-3 bg-blue-50 rounded-full">
              <FiFileText className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">OS Abertas</p>
              <p className="text-2xl font-bold text-gray-900">{estatisticas.osAbertas}</p>
              <p className="text-xs text-gray-500 mt-1">Aguardando atendimento</p>
            </div>
            <div className="p-3 bg-blue-50 rounded-full">
              <FiAlertCircle className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Em Andamento</p>
              <p className="text-2xl font-bold text-gray-900">{estatisticas.osEmAndamento}</p>
              <p className="text-xs text-gray-500 mt-1">Sendo processadas</p>
            </div>
            <div className="p-3 bg-yellow-50 rounded-full">
              <FiClock className="w-6 h-6 text-yellow-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Finalizadas</p>
              <p className="text-2xl font-bold text-gray-900">{estatisticas.osFinalizadas}</p>
              <p className="text-xs text-gray-500 mt-1">Concluídas hoje</p>
            </div>
            <div className="p-3 bg-green-50 rounded-full">
              <FiCheckCircle className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Clientes</p>
              <p className="text-2xl font-bold text-gray-900">{estatisticas.clientesAtendidos}</p>
              <p className="text-xs text-gray-500 mt-1">Atendidos hoje</p>
            </div>
            <div className="p-3 bg-purple-50 rounded-full">
              <FiUsers className="w-6 h-6 text-purple-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Filtros e Busca */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <Input
              placeholder="Buscar por OS, cliente, marca ou modelo..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="w-full"
            />
          </div>
          <Select 
            value={filtroStatus} 
            onChange={(e) => setFiltroStatus(e.target.value)}
            className="w-full md:w-48"
          >
            <option value="todos">Todos os status</option>
            <option value="ABERTA">Aberta</option>
            <option value="EM ANDAMENTO">Em Andamento</option>
            <option value="AGUARDANDO PEÇA">Aguardando Peça</option>
            <option value="AGUARDANDO CLIENTE">Aguardando Cliente</option>
            <option value="FINALIZADA">Finalizada</option>
            <option value="ENTREGUE">Entregue</option>
          </Select>
          <Button 
            onClick={carregarDados}
            variant="default"
            className="flex items-center gap-2"
          >
            <FiRefreshCw className="w-4 h-4" />
            Atualizar
          </Button>
        </div>
      </div>

      {/* Lista de OS */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Últimas Ordens de Serviço</h2>
          <p className="text-gray-600 mt-1">Acompanhe o status das OSs em tempo real</p>
        </div>
        
        <div className="p-6">
          {osFiltradas.length === 0 ? (
            <div className="text-center py-12">
              <FiFileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">Nenhuma OS encontrada</p>
            </div>
          ) : (
            <div className="space-y-4">
              {osFiltradas.map((os) => (
                <div key={os.id} className="bg-gray-50 rounded-xl p-4 border border-gray-200 hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-3">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(os.status)}`}>
                          <div className="flex items-center gap-2">
                            {getStatusIcon(os.status)}
                            {os.status}
                          </div>
                        </span>
                        <span className="font-mono text-sm text-gray-600 bg-white px-2 py-1 rounded border">
                          {os.numero_os}
                        </span>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <h3 className="font-semibold text-gray-900 mb-2">
                            <FiUser className="w-4 h-4 inline mr-2" />
                            {os.cliente_nome}
                          </h3>
                          <p className="text-sm text-gray-600 mb-1">
                            <span className="font-medium">Técnico:</span> {os.tecnico_nome}
                          </p>
                          <p className="text-sm text-gray-600">
                            <span className="font-medium">Equipamento:</span> {os.marca} {os.modelo}
                          </p>
                        </div>
                        
                        <div>
                          <p className="text-sm text-gray-600 mb-2">
                            <span className="font-medium">Problema:</span> {os.problema_relatado}
                          </p>
                          <p className="text-sm text-gray-600">
                            <FiCalendar className="w-4 h-4 inline mr-2" />
                            {new Date(os.data_cadastro).toLocaleDateString('pt-BR')}
                          </p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex flex-col gap-2 ml-4">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => enviarAvisoCliente(os, 'whatsapp')}
                        disabled={!os.cliente_whatsapp}
                        className="text-green-600 border-green-200 hover:bg-green-50"
                      >
                        <FiMessageSquare className="w-4 h-4 mr-2" />
                        WhatsApp
                      </Button>
                      
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => enviarAvisoCliente(os, 'email')}
                        disabled={!os.cliente_email}
                        className="text-blue-600 border-blue-200 hover:bg-blue-50"
                      >
                        <FiPhone className="w-4 h-4 mr-2" />
                        Email
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
        </div>
      </ProtectedArea>
    </MenuLayout>
  );
}
