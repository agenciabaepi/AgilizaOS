
'use client';

import { getStatusTecnicoLabel } from '@/utils/statusLabels';
import { extrairNumeroOSDaObservacao } from '@/utils/extrairNumeroOSDaObservacao';

/** Extrai string do status/status_tecnico (Supabase pode retornar objeto da relação com .nome). */
function normStatusVal(v: unknown): string {
  if (v == null || v === '') return '';
  if (typeof v === 'string') return v.trim();
  if (typeof v === 'object' && v !== null && 'nome' in v && typeof (v as { nome: string }).nome === 'string') {
    return (v as { nome: string }).nome.trim();
  }
  return String(v).trim();
}

/** Valor monetário vindo do Supabase (number ou string pt-BR / decimal). */
function parseValorMonetarioBR(v: unknown): number {
  if (v == null || v === '') return 0;
  if (typeof v === 'number') return Number.isFinite(v) ? v : 0;
  const s = String(v).trim();
  if (!s) return 0;
  if (/^\d+(\.\d+)?$/.test(s)) return parseFloat(s);
  const normalized = s.replace(/\./g, '').replace(',', '.').replace(/[^\d.-]/g, '');
  const n = parseFloat(normalized);
  return Number.isFinite(n) ? n : 0;
}

function statusOsConsideradaFechada(os: { status?: unknown; status_tecnico?: unknown }): boolean {
  const s = normStatusVal(os.status)
    .toUpperCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '');
  const st = normStatusVal(os.status_tecnico)
    .toUpperCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '');
  return (
    s === 'ENTREGUE' ||
    s === 'CONCLUIDO' ||
    s === 'FATURADO' ||
    st === 'REPARO CONCLUIDO' ||
    st.includes('REPARO CONCLUIDO')
  );
}

function statusOsEntregueOuConcluido(os: { status?: unknown }): boolean {
  const s = normStatusVal(os.status)
    .toUpperCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '');
  return s === 'ENTREGUE' || s === 'CONCLUIDO' || s === 'FATURADO';
}

/** Mesma ideia do dados-impressao: observações da venda ou total + cliente. */
function observacoesReferenciamOS(observacoes: unknown, numeroOs: unknown): boolean {
  const n = String(numeroOs ?? '').trim();
  if (!n) return false;
  const up = String(observacoes ?? '')
    .replace(/\s+/g, ' ')
    .toUpperCase();
  if (!up) return false;
  const sn = n.toUpperCase();
  const patterns = [`O.S. #${sn}`, `OS #${sn}`, `O.S #${sn}`, `O.S.#${sn}`, `OS#${sn}`];
  return patterns.some((p) => up.includes(p));
}

function findVendaParaOS(os: { id?: string; numero_os?: unknown; cliente_id?: string; valor_faturado?: unknown }, todasVendas: any[]): any | undefined {
  if (!Array.isArray(todasVendas) || todasVendas.length === 0) return undefined;
  const num = String(os.numero_os ?? '').trim();
  if (num) {
    const candidatos = todasVendas.filter(
      (v: any) => extrairNumeroOSDaObservacao(v.observacoes) === num
    );
    if (candidatos.length > 0) {
      const comCliente = os.cliente_id
        ? candidatos.find((v: any) => v.cliente_id === os.cliente_id)
        : undefined;
      if (comCliente) return comCliente;
      return candidatos[0];
    }
  }
  const porObs = todasVendas.find((v: any) => observacoesReferenciamOS(v.observacoes, os.numero_os));
  if (porObs) return porObs;
  const vf = parseValorMonetarioBR(os.valor_faturado);
  if (vf <= 0 || !os.cliente_id) return undefined;
  return todasVendas.find((v: any) => {
    if (v.cliente_id !== os.cliente_id) return false;
    return Math.abs(parseValorMonetarioBR(v.total) - vf) <= 5;
  });
}

interface OrdemTransformada {
  id: string;
  numero: number;
  cliente: string;
  clienteTelefone: string;
  clienteEmail: string;
  aparelho: string;
  aparelhoCategoria: string;
  aparelhoMarca: string;
  servico: string;
  statusOS: string;
  statusTecnico: string;
  entrada: string;
  tecnico: string;
  atendente: string;
  entrega: string;
  prazoEntrega: string;
  garantia: string;
  valorPeca: number;
  valorServico: number;
  desconto: number;
  valorTotal: number;
  valorComDesconto: number;
  valorFaturado: number;
  tipo: string;
  foiFaturada: boolean;
  /** OS encerrada com valor, mas não encontramos linha em `vendas` ligada a ela. */
  faturamentoSemVendaVinculada: boolean;
  formaPagamento: string;
  clienteRecusou: boolean;
  aparelhoSemConserto: boolean;
  observacao?: string | null;
  problema_relatado?: string | null;
  responsavelId?: string | null;
  responsavelNome?: string;
  responsavelAvatar?: string | null;
  // Previsões
  valorPrevisto?: number;
  custoPrevisto?: number;
  lucroPrevisto?: number;
}

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { FiRefreshCw, FiPlus, FiSearch, FiFilter, FiUser, FiSmartphone, FiDollarSign, FiClock, FiAlertCircle, FiFileText, FiCheckCircle } from 'react-icons/fi';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/context/AuthContext';
import AuthGuardFinal from '@/components/AuthGuardFinal';
// Removido ProtectedArea - agora é responsabilidade do MenuLayout
import DashboardCard from '@/components/ui/DashboardCard';
import MenuLayout from '@/components/MenuLayout';
import { useToast } from '@/components/Toast';

import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
import { Select } from '@/components/Select';
import LaudoProntoAlert from '@/components/LaudoProntoAlert';
import { useSupabaseRetry } from '@/hooks/useRetry';
import { OSFullPageSkeleton } from '@/components/OSTableSkeleton';

const getInitials = (nome: string) => {
  if (!nome) return 'US';
  const parts = nome.trim().split(/\s+/);
  const initials = parts.slice(0, 2).map((part) => part.charAt(0).toUpperCase()).join('');
  return initials || 'US';
};

const renderUserAvatar = (nome: string, fotoUrl?: string | null, size = 40) => {
  const initials = getInitials(nome);
  if (fotoUrl) {
    return (
      <Image
        src={fotoUrl}
        alt={nome}
        width={size}
        height={size}
        className="rounded-full object-cover border border-white shadow-sm"
      />
    );
  }
  return (
    <div
      className="flex items-center justify-center rounded-full bg-rose-100 text-rose-600 font-semibold border border-white shadow-sm"
      style={{ width: size, height: size }}
    >
      {initials}
    </div>
  );
};

export default function ListaOrdensPage() {
  const router = useRouter();
  const { empresaData } = useAuth();
  const empresaId = empresaData?.id;
  const { addToast } = useToast();
  
  // Debug removido temporariamente
  
  const { executeWithRetry, manualRetry, state: retryState } = useSupabaseRetry();

  // Estados dos cards principais
  const [totalOS, setTotalOS] = useState(0);
  const [percentualRetornos, setPercentualRetornos] = useState(0);

  // Estados da lista
  const [ordens, setOrdens] = useState<OrdemTransformada[]>([]);
  const [loading, setLoading] = useState(false); // ✅ Começar como false para evitar loops
  const [loadingOrdens, setLoadingOrdens] = useState(false);
  const [error, setError] = useState<any>(null);
  const [lastFetchTime, setLastFetchTime] = useState(0);
  const [cacheKey, setCacheKey] = useState('');
  const [loadingTecnicos, setLoadingTecnicos] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [aparelhoFilter, setAparelhoFilter] = useState('');
  const [tecnicoFilter, setTecnicoFilter] = useState('');
  const [tipoFilter, setTipoFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(20);
  const [tecnicos, setTecnicos] = useState<string[]>([]);

  // Estado para abas
  const [activeTab, setActiveTab] = useState('todas');
  

  function formatDate(date: string) {
    if (!date) return '';
    // Trata YYYY-MM-DD como data local (evita -1 dia por timezone)
    const m = date.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (m) {
      const [, y, mm, dd] = m;
      return `${dd}/${mm}/${y}`;
    }
    return new Date(date).toLocaleDateString('pt-BR');
  }

  const toDateOnlyString = (d: Date): string => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  const addDaysDateOnly = (dateOnly: string, days: number): string => {
    const m = dateOnly.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!m) return dateOnly;
    const y = Number(m[1]);
    const mm = Number(m[2]);
    const dd = Number(m[3]);
    const d = new Date(y, mm - 1, dd + days);
    return toDateOnlyString(d);
  };

  function formatPhoneNumber(phone: string) {
    const cleaned = ('' + phone).replace(/\D/g, '');
    const match = cleaned.match(/^(\d{2})(\d{5})(\d{4})$/);
    if (match) {
      return `(${match[1]}) ${match[2]}-${match[3]}`;
    }
    return phone;
  }

  function formatFormaPagamento(forma: string) {
    const formas: Record<string, string> = {
      'dinheiro': 'Dinheiro',
      'pix': 'PIX',
      'cartao_debito': 'Cartão Débito',
      'cartao_credito': 'Cartão Crédito',
      'transferencia': 'Transferência',
      'boleto': 'Boleto',
      'cheque': 'Cheque'
    };
    return formas[forma] || forma;
  }

  function formatCurrency(value: number) {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  }

  const getStatusColor = (status: string) => {
    if (!status) {
      return 'bg-gray-100 text-gray-800 border border-gray-200 dark:bg-zinc-700 dark:text-zinc-100 dark:border-zinc-500';
    }

    const statusLower = status.toLowerCase();
    switch (statusLower) {
      case 'concluido':
      case 'finalizado':
      case 'reparo concluído':
      case 'entregue':
        return 'bg-green-100 text-green-800 border border-green-200 dark:bg-green-950 dark:text-green-200 dark:border-green-700';
      case 'orcamento':
      case 'orçamento':
      case 'orçamento enviado':
      case 'aprovado':
        return 'bg-yellow-100 text-yellow-900 border border-yellow-300 dark:bg-amber-950 dark:text-amber-100 dark:border-amber-600';
      case 'analise':
      case 'em analise':
      case 'em análise':
        return 'bg-blue-100 text-blue-900 border border-blue-200 dark:bg-blue-950 dark:text-blue-200 dark:border-blue-600';
      case 'aguardando inicio':
      case 'aguardando início':
        return 'bg-gray-100 text-gray-800 border border-gray-200 dark:bg-zinc-700 dark:text-zinc-100 dark:border-zinc-500';
      case 'aguardando peca':
      case 'aguardando peça':
        return 'bg-orange-100 text-orange-900 border border-orange-200 dark:bg-orange-950 dark:text-orange-200 dark:border-orange-700';
      case 'em execucao':
      case 'em execução':
        return 'bg-purple-100 text-purple-900 border border-purple-200 dark:bg-purple-950 dark:text-purple-200 dark:border-purple-700';
      case 'sem reparo':
        return 'bg-red-100 text-red-900 border border-red-200 dark:bg-red-950 dark:text-red-200 dark:border-red-700';
      case 'nao aprovado':
      case 'não aprovado':
        return 'bg-red-100 text-red-900 border border-red-200 dark:bg-red-950 dark:text-red-200 dark:border-red-700';
      default:
        return 'bg-gray-100 text-gray-800 border border-gray-200 dark:bg-zinc-700 dark:text-zinc-100 dark:border-zinc-500';
    }
  };

  const getStatusTecnicoColor = (status: string) => {
    if (!status) {
      return 'bg-gray-100 text-gray-800 border border-gray-200 dark:bg-zinc-700 dark:text-zinc-100 dark:border-zinc-500';
    }

    const statusLower = status.toLowerCase();
    switch (statusLower) {
      case 'aguardando início':
      case 'aguardando inicio':
        return 'bg-gray-100 text-gray-800 border border-gray-200 dark:bg-zinc-700 dark:text-zinc-100 dark:border-zinc-500';
      case 'em análise':
      case 'em analise':
        return 'bg-blue-100 text-blue-900 border border-blue-200 dark:bg-blue-950 dark:text-blue-200 dark:border-blue-600';
      case 'orçamento enviado':
      case 'orcamento enviado':
        return 'bg-yellow-100 text-yellow-900 border border-yellow-300 dark:bg-amber-950 dark:text-amber-100 dark:border-amber-600';
      case 'aguardando peça':
      case 'aguardando peca':
        return 'bg-orange-100 text-orange-900 border border-orange-200 dark:bg-orange-950 dark:text-orange-200 dark:border-orange-700';
      case 'em execução':
      case 'em execucao':
        return 'bg-purple-100 text-purple-900 border border-purple-200 dark:bg-purple-950 dark:text-purple-200 dark:border-purple-700';
      case 'sem reparo':
        return 'bg-red-100 text-red-900 border border-red-200 dark:bg-red-950 dark:text-red-200 dark:border-red-700';
      case 'reparo concluído':
      case 'reparo concluido':
      case 'finalizada':
      case 'finalizado':
        return 'bg-green-100 text-green-800 border border-green-200 dark:bg-green-950 dark:text-green-200 dark:border-green-700';
      case 'em atendimento':
        return 'bg-slate-100 text-slate-900 border border-slate-300 dark:bg-slate-800 dark:text-slate-100 dark:border-slate-600';
      default:
        return 'bg-gray-100 text-gray-800 border border-gray-200 dark:bg-zinc-700 dark:text-zinc-100 dark:border-zinc-500';
    }
  };

  // Função para determinar forma de pagamento com fallback inteligente
  const getFormaPagamento = (item: any, vendaOS: any): string => {
    // 1. Se cliente recusou, não há forma de pagamento
    if (item.cliente_recusou) {
      return 'N/A';
    }
    
    // 2. Se há venda específica registrada, usar ela
    if (vendaOS?.forma_pagamento) {
      return vendaOS.forma_pagamento;
    }
    
    // 3. Se não há venda, não há forma de pagamento
    return 'N/A';
  };

  const fetchOrdens = async (forceRefresh = false) => {
    if (!empresaId || !empresaId.trim()) {
      setLoading(false);
      setLoadingOrdens(false);
      return;
    }

    // ✅ REFRESH AUTOMÁTICO: Refrescar sessão se houver problemas de conexão
    try {
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !sessionData.session) {
        console.log('🔄 Refrescando sessão automaticamente...');
        await supabase.auth.refreshSession();
      }
    } catch (error) {
      console.warn('⚠️ Erro ao verificar sessão:', error);
    }

    // Cache simples - evitar buscar dados se já foram buscados recentemente
    const now = Date.now();
    const currentCacheKey = `ordens_${empresaId}`;
    
    if (!forceRefresh && 
        cacheKey === currentCacheKey && 
        now - lastFetchTime < 30000 && // 30 segundos
        ordens.length > 0) {
      setLoading(false);
      setLoadingOrdens(false);
      return;
    }

    setLoadingOrdens(true);
    setError(null);
    
    try {
      await executeWithRetry(async () => {
      const baseSelect = `
        id,
        numero_os,
        cliente_id,
        categoria,
        marca,
        modelo,
        status,
        status_tecnico,
        created_at,
        tecnico_id,
        data_entrega,
        prazo_entrega,
        valor_faturado,
        valor_peca,
        valor_servico,
        qtd_peca,
        qtd_servico,
        desconto,
        servico,
        tipo,
        observacao,
        problema_relatado,
        atendente,
        atendente_id,
        cliente_recusou,
        vencimento_garantia
      `;
      const selectComAparelhoSemConserto = `${baseSelect}, aparelho_sem_conserto`;
      const buildQuery = (selectFields: string) =>
        supabase
          .from('ordens_servico')
          .select(selectFields)
          .eq("empresa_id", empresaId)
          .order('created_at', { ascending: false })
          .limit(500); // ✅ Reduzido de 1000 para 500
      
      // Executar query e tratar erros
      let queryResult: any;
      try {
        // ✅ OTIMIZADO: Timeout reduzido para 15 segundos (mais responsivo)
        queryResult = await Promise.race([
          buildQuery(selectComAparelhoSemConserto),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Query timeout - dados demorando muito para carregar')), 15000)
          )
        ]);
      } catch (timeoutError) {
        // Timeout - tratar como erro real
        throw timeoutError;
      }
      
      let { data, error } = queryResult || { data: null, error: null };
      const columnMissingAparelhoSemConserto =
        !!error && typeof error.message === 'string' && error.message.includes('aparelho_sem_conserto');
      if (columnMissingAparelhoSemConserto) {
        console.warn('⚠️ Coluna aparelho_sem_conserto ausente neste banco; executando fallback de compatibilidade.');
        const fallbackResult = await Promise.race([
          buildQuery(baseSelect),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Query timeout - fallback sem aparelho_sem_conserto')), 15000)
          )
        ]);
        data = (fallbackResult as any)?.data ?? [];
        error = (fallbackResult as any)?.error ?? null;
      }
      
      // Log apenas erros críticos
      if (error) {
        console.error('❌ Erro na query de ordens:', error.message || error);
      }
      
      // Tratar erros: NUNCA ignorar erros reais
      if (error) {
        // Verificar se o erro tem informações úteis
        const errorStr = JSON.stringify(error);
        const hasUsefulInfo = (
          error.message || 
          error.code || 
          error.details ||
          error.hint ||
          (errorStr && errorStr !== '{}' && errorStr !== 'null' && errorStr.length > 2)
        );
        
        // Se for um erro real com informações úteis, sempre tratar como erro
        if (hasUsefulInfo && (error.code || error.message)) {
          console.error('❌ ERRO REAL na query:', error);
          // Se não houver dados, parar aqui
          if (!data || (Array.isArray(data) && data.length === 0)) {
            addToast('error', `Erro ao carregar ordens: ${error.message || 'Erro desconhecido'}`);
          setLoadingOrdens(false);
            setError(error);
          return;
          }
          // Se houver dados mas também erro, logar mas continuar
          console.warn('⚠️ Erro na query mas temos dados, continuando...');
        }
        
        // Se for erro vazio ou sem informações, ignorar apenas se tiver dados
        if (!hasUsefulInfo && data && Array.isArray(data) && data.length > 0) {
          console.log('⚠️ Erro vazio ignorado porque temos dados');
          error = null;
        }
      }
      
      // Garantir que data seja um array válido
      if (!Array.isArray(data)) {
        data = data ? [data] : [];
      }
      
      // Processar dados mesmo se estiver vazio (para limpar estado anterior)
      if (data && data.length > 0) {

        // ✅ OTIMIZADO: Ordenar dados (já vem ordenado do banco, mas garantir)
        data.sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        
        // ✅ OTIMIZADO: Buscar dados relacionados em paralelo para reduzir tempo total
        const clienteIds = [...new Set(data.filter((item: any) => item.cliente_id).map((item: any) => item.cliente_id))];
        const tecnicoIds = [...new Set(
          data
            .filter((item: any) => item.tecnico_id && item.tecnico_id !== null && item.tecnico_id !== undefined)
            .map((item: any) => String(item.tecnico_id))
        )] as string[];
        const responsavelIds = [...new Set(data
          .filter((item: any) => item.atendente_id && item.atendente_id !== null && item.atendente_id !== undefined)
          .map((item: any) => item.atendente_id))];

        // ✅ Executar todas as queries de relacionamento em paralelo
        // técnicos: ordens_servico.tecnico_id pode ser usuarios.id OU auth_user_id — buscar pelos dois
        const tecnicosPromise = tecnicoIds.length > 0
          ? Promise.all([
              supabase.from('usuarios').select('id, nome, auth_user_id').in('id', tecnicoIds),
              supabase.from('usuarios').select('id, nome, auth_user_id').in('auth_user_id', tecnicoIds)
            ]).then(([byId, byAuth]) => {
              const byIdData = (byId.data || []) as any[];
              const byAuthData = (byAuth.data || []).filter((u: any) => !byIdData.some((x: any) => x.id === u.id)) as any[];
              return { data: [...byIdData, ...byAuthData], error: byId.error || byAuth.error };
            })
          : Promise.resolve({ data: [], error: null });

        const [clientesResult, tecnicosResult, responsaveisResult] = await Promise.allSettled([
          clienteIds.length > 0 
            ? supabase
                .from('clientes')
                .select('id, nome, telefone, email')
                .in('id', clienteIds)
            : Promise.resolve({ data: [], error: null }),
          tecnicosPromise,
          responsavelIds.length > 0
            ? supabase
                .from('usuarios')
                .select('id, nome, foto_url')
                .in('id', responsavelIds)
            : Promise.resolve({ data: [], error: null })
        ]);

        // Processar resultados
        let clientesDict: Record<string, { nome: string; telefone: string; email: string }> = {};
        if (clientesResult.status === 'fulfilled' && clientesResult.value.data) {
          const clientesData = clientesResult.value.data as any[];
          clientesDict = clientesData.reduce((acc: Record<string, { nome: string; telefone: string; email: string }>, cliente: any) => {
            acc[cliente.id] = { 
              nome: cliente.nome || '', 
              telefone: cliente.telefone || '', 
              email: cliente.email || '' 
            };
            return acc;
          }, {} as Record<string, { nome: string; telefone: string; email: string }>);
        }

        let tecnicosDict: Record<string, string> = {};
        if (tecnicosResult.status === 'fulfilled' && tecnicosResult.value.data) {
          const tecnicosData = tecnicosResult.value.data as any[];
          const nomeTecnico = (t: any) => t.nome || 'Sem nome';
          tecnicosDict = tecnicosData.reduce((acc: Record<string, string>, tecnico: any) => {
            acc[tecnico.id] = nomeTecnico(tecnico);
            if (tecnico.auth_user_id) acc[tecnico.auth_user_id] = nomeTecnico(tecnico);
            return acc;
          }, {} as Record<string, string>);
        }

        let responsaveisDict: Record<string, { nome: string; foto_url: string | null }> = {};
        if (responsaveisResult.status === 'fulfilled' && responsaveisResult.value.data) {
          const responsaveisData = responsaveisResult.value.data as any[];
          responsaveisDict = responsaveisData.reduce((acc: Record<string, { nome: string; foto_url: string | null }>, usuario: any) => {
            acc[usuario.id] = { nome: usuario.nome, foto_url: usuario.foto_url || null };
            return acc;
          }, {} as Record<string, { nome: string; foto_url: string | null }>);
        }

        // ✅ OTIMIZADO: Buscar vendas e contas_pagar apenas para OSs que realmente precisam (lazy loading)
        const vendasDict: Record<string, any> = {};
        const custosPorOS: Record<string, number> = {};
        
        const osIds = data.map((d: any) => d.id);
        // Buscar vendas para qualquer OS da lista (não só as com valor_faturado > 0 no registro —
        // muitas OS entregues têm venda no caixa mas valor_faturado ainda 0 ou desatualizado no banco).
        const precisaBuscarVendas = data.some(
          (os: any) => !os.cliente_recusou && !os.aparelho_sem_conserto
        );

        if (precisaBuscarVendas) {
          try {
            // Buscar vendas e contas em paralelo
            const [vendasResult, contasResult] = await Promise.allSettled([
              supabase
                .from('vendas')
                .select('id, cliente_id, forma_pagamento, total, status, observacoes, data_venda')
                .eq('empresa_id', empresaId)
                .order('data_venda', { ascending: false })
                .limit(5000),
              supabase
                .from('contas_pagar')
                .select('id, os_id, valor, status, tipo')
                .eq('empresa_id', empresaId)
                .in('os_id', osIds)
                .in('tipo', ['pecas', 'servicos'])
            ]);

            // Processar vendas — vincular por nº da OS nas observações (prioridade) para todas as linhas
            if (vendasResult.status === 'fulfilled' && vendasResult.value.data) {
              const todasVendas = vendasResult.value.data;
              data.forEach((os: any) => {
                if (os.cliente_recusou || os.aparelho_sem_conserto) return;
                const vendaOS = findVendaParaOS(os, todasVendas);
                if (vendaOS) {
                  vendasDict[os.id] = {
                    id: vendaOS.id,
                    forma_pagamento: vendaOS.forma_pagamento,
                    total: vendaOS.total,
                    status: vendaOS.status
                  };
                }
              });
            }

            // Processar contas_pagar
            if (contasResult.status === 'fulfilled' && contasResult.value.data) {
              (contasResult.value.data || []).forEach((c: any) => {
                const valor = Number(c.valor || 0);
                if (!custosPorOS[c.os_id]) custosPorOS[c.os_id] = 0;
                custosPorOS[c.os_id] += valor;
              });
            }
          } catch (e) {
            console.warn('⚠️ Erro ao buscar vendas/contas:', e);
            // Continuar sem dados
          }
        }

        const mapped = data.map((item: any) => {
          // manter datas como YYYY-MM-DD para evitar timezone
          const entregaCalc = item.data_entrega
            ? item.data_entrega
            : (item.vencimento_garantia
              ? addDaysDateOnly(item.vencimento_garantia, -90)
              : '');
          const garantiaCalc = item.vencimento_garantia
            ? item.vencimento_garantia
            : (item.data_entrega
              ? addDaysDateOnly(item.data_entrega, 90)
              : '');
          
          const valorFaturado = parseValorMonetarioBR(item.valor_faturado);
          const vendaOS = vendasDict[item.id];
          // Buscar atendente_id separadamente se necessário
          const atendenteId = item.atendente_id || null;
          const responsavelInfo = atendenteId ? responsaveisDict[atendenteId] : null;
          const responsavelNome = responsavelInfo?.nome || item.atendente || '';
          const responsavelAvatar = responsavelInfo?.foto_url || null;
          const responsavelId = atendenteId;
          
          // Previsão de valores (para qualquer OS, especialmente as não finalizadas)
          const subtotal = ((item.valor_peca || 0) * (item.qtd_peca || 1)) + ((item.valor_servico || 0) * (item.qtd_servico || 1));
          const valorPrevisto = subtotal - (item.desconto || 0);
          const custoPrevisto = Number(custosPorOS[item.id] || 0);
          const lucroPrevisto = valorPrevisto - custoPrevisto;

          const clienteInfo = item.cliente_id ? clientesDict[item.cliente_id] : null;
          
          // ✅ OTIMIZADO: Buscar nome do técnico do dict (mais rápido que relacionamento)
          let tecnicoNome = 'Sem técnico';
          if (item.tecnico_id && tecnicosDict[item.tecnico_id]) {
            tecnicoNome = tecnicosDict[item.tecnico_id];
          } else if (item.tecnico_id) {
            tecnicoNome = 'Técnico não encontrado';
          }

          return {
          id: item.id,
            numero: item.numero_os,
            cliente: clienteInfo?.nome || 'Sem nome',
            clienteTelefone: clienteInfo?.telefone ? formatPhoneNumber(clienteInfo.telefone) : '',
            clienteEmail: clienteInfo?.email || '',
            aparelho: item.modelo || item.marca || item.categoria || '',
            aparelhoCategoria: item.categoria || '',
            aparelhoMarca: item.marca || '',
            servico: item.servico || '',
            statusOS: normStatusVal(item.status) || '',
            statusTecnico: normStatusVal(item.status_tecnico) || '',
            entrada: item.created_at || '',
            tecnico: tecnicoNome,
            atendente: item.atendente || '',
            entrega: entregaCalc,
            prazoEntrega: item.prazo_entrega || '',
            garantia: garantiaCalc,
          valorPeca: item.valor_peca || 0,
          valorServico: item.valor_servico || 0,
          desconto: item.desconto || 0,
            valorTotal: ((item.valor_peca || 0) * (item.qtd_peca || 1)) + ((item.valor_servico || 0) * (item.qtd_servico || 1)),
            valorComDesconto: (((item.valor_peca || 0) * (item.qtd_peca || 1)) + ((item.valor_servico || 0) * (item.qtd_servico || 1))) - (item.desconto || 0),
            valorFaturado: valorFaturado,
            tipo: item.tipo || 'Nova',
            clienteRecusou: item.cliente_recusou || false, // Campo para marcar se cliente recusou
            aparelhoSemConserto: item.aparelho_sem_conserto || false, // Campo para marcar se aparelho não teve conserto
            // Faturado: OS fechada + venda encontrada + (valor na OS ou total na venda > 0)
            foiFaturada:
              !item.cliente_recusou &&
              !item.aparelho_sem_conserto &&
              statusOsConsideradaFechada(item) &&
              !!vendaOS &&
              (valorFaturado > 0 || parseValorMonetarioBR(vendaOS?.total) > 0),
            faturamentoSemVendaVinculada:
              !item.cliente_recusou &&
              !item.aparelho_sem_conserto &&
              statusOsConsideradaFechada(item) &&
              !vendaOS &&
              (valorFaturado > 0 || statusOsEntregueOuConcluido(item)),
            formaPagamento: getFormaPagamento(item, vendaOS),
            observacao: item.observacao || null,
            problema_relatado: item.problema_relatado || null,
            valorPrevisto,
            custoPrevisto,
            lucroPrevisto,
            responsavelId,
            responsavelNome,
            responsavelAvatar,
          };
        });

        setOrdens(mapped);

        // Calcular métricas dos cards
        const hoje = new Date();
        const inicioMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
        const inicioSemana = new Date(hoje.setDate(hoje.getDate() - hoje.getDay()));
        const mesAnterior = new Date(hoje.getFullYear(), hoje.getMonth() - 1, 1);

        const totalOS = mapped.length;
        const totalMes = mapped.filter((o: any) => new Date(o.entrada) >= inicioMes).length;
        const retornosMes = mapped.filter((o: any) => o.tipo === 'Retorno' && new Date(o.entrada) >= inicioMes).length;
        const percentualRetornos = totalOS > 0 ? Math.round((retornosMes / totalOS) * 100) : 0;

        // Calcular crescimento
        const ordensSemana = mapped.filter((o: any) => new Date(o.entrada) >= inicioSemana).length;
        const ordensSemanaAnterior = mapped.filter((o: any) => {
          const data = new Date(o.entrada);
          const semanaAnterior = new Date(inicioSemana);
          semanaAnterior.setDate(semanaAnterior.getDate() - 7);
          return data >= semanaAnterior && data < inicioSemana;
        }).length;

        const ordensMesAnterior = mapped.filter((o: any) => {
          const data = new Date(o.entrada);
          return data >= mesAnterior && data < inicioMes;
        }).length;
    
    const calcPercent = (atual: number, anterior: number) => {
      if (anterior === 0) return atual > 0 ? 100 : 0;
      return Math.round(((atual - anterior) / anterior) * 100);
    };

        setTotalOS(totalOS);
        setPercentualRetornos(percentualRetornos);
      } else {
        // Se não houver dados, limpar ordens e métricas
        console.log('⚠️ Nenhuma ordem encontrada');
        setOrdens([]);
        setTotalOS(0);
        setPercentualRetornos(0);
      }
      
      // Atualizar cache
      setLastFetchTime(now);
      setCacheKey(currentCacheKey);
      });
      
    } catch (error) {
      setError(error);
      console.error('Erro ao carregar ordens:', error);
      
      if (error instanceof Error) {
        if (error.message.includes('timeout')) {
          console.warn('⚠️ Timeout detectado - tentando refrescar sessão...');
          // Tentar refrescar sessão e recarregar automaticamente
          try {
            await supabase.auth.refreshSession();
            console.log('✅ Sessão refrescada, tentando recarregar...');
            setTimeout(() => {
              fetchOrdens(true); // Tentar novamente após refresh
            }, 1000);
          } catch (refreshError) {
            console.error('❌ Falha ao refrescar sessão:', refreshError);
            addToast('error', 'Problema de conexão. Clique em "Tentar novamente" ou recarregue a página.');
          }
        } else if (error.message.includes('conectar com o servidor')) {
          addToast('error', 'Problema de conexão com servidor. Verificando...');
          // Tentar refrescar sessão automaticamente
          setTimeout(async () => {
            try {
              await supabase.auth.refreshSession();
              fetchOrdens(true);
            } catch (e) {
              console.error('Falha na reconexão:', e);
            }
          }, 2000);
        } else {
          addToast('error', 'Erro ao carregar ordens. Tente novamente.');
        }
      } else {
        console.warn('⚠️ Erro desconhecido:', error);
        addToast('error', 'Erro inesperado. Tente recarregar a página.');
      }
    } finally {
      setLoadingOrdens(false);
      setLoading(false);
    }
  };

  const handleRetry = useCallback(async () => {
    setError(null);
    await manualRetry(() => fetchOrdens(true));
  }, [manualRetry]);

  const handleStatusChange = (ordemId: string, newStatus: string, newStatusTecnico: string) => {
    setOrdens(prevOrdens => 
      prevOrdens.map(os => 
        os.id === ordemId 
          ? { ...os, statusOS: newStatus, statusTecnico: newStatusTecnico }
          : os
      )
    );
  };

  const fetchTecnicos = async () => {
    if (!empresaId || !empresaId.trim()) {
      return;
    }

    // ✅ REFRESH AUTOMÁTICO: Refrescar sessão se necessário
    try {
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !sessionData.session) {
        console.log('🔄 Refrescando sessão para técnicos...');
        await supabase.auth.refreshSession();
      }
    } catch (error) {
      console.warn('⚠️ Erro ao verificar sessão para técnicos:', error);
    }

    setLoadingTecnicos(true);
    try {
      // ✅ MODO SILENCIOSO: Não mostrar erro se falhar após inatividade
      const { data, error } = await Promise.race([
        supabase
          .from('usuarios')
          .select('nome')
          .eq('empresa_id', empresaId)
          .eq('nivel', 'tecnico')
          .order('nome'),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Técnicos timeout')), 30000) // 30 segundos - mais tolerante
        )
      ]) as any;

      if (error) {
        console.warn('⚠️ Falha ao buscar técnicos (modo silencioso):', error);
        // Não mostrar toast de erro para não incomodar o usuário
        setTecnicos([]); // Lista vazia como fallback
        return;
      }

      if (data) {
        setTecnicos(data.map((u: any) => u.nome).filter(Boolean));
      }
    } catch (error) {
      console.warn('⚠️ Timeout ao carregar técnicos (modo silencioso):', error);
      // Falha silenciosa - não mostrar erro ao usuário
      setTecnicos([]); // Lista vazia como fallback
    } finally {
      setLoadingTecnicos(false);
    }
  };


  // ✅ OTIMIZADO: useEffect simplificado para evitar loops
  useEffect(() => {
    if (!empresaId?.trim()) {
      console.warn('EmpresaId não disponível - aguardando...');
      return;
    }

    let isMounted = true;
    
    const loadData = async () => {
      try {
        console.log('🔄 Carregando dados para empresa:', empresaId);
        await Promise.all([
          fetchOrdens(),
          fetchTecnicos()
        ]);
      } catch (error) {
        if (isMounted) {
          console.error('Erro ao carregar dados:', error);
          addToast('error', 'Erro ao carregar dados. Tente recarregar a página.');
        }
      }
    };

    // Delay pequeno para evitar chamadas múltiplas
    const timeoutId = setTimeout(loadData, 200);
    
    return () => {
      isMounted = false;
      clearTimeout(timeoutId);
    };
  }, [empresaId, addToast]); // Dependências mínimas

  // ✅ TIMEOUT DE SEGURANÇA: Evitar loading infinito
  useEffect(() => {
    if (!loading) return;

    const loadingTimeout = setTimeout(() => {
      console.warn('⚠️ Loading timeout - resetando estados');
      setLoading(false);
      setLoadingOrdens(false);
      setLoadingTecnicos(false);
      addToast('warning', 'Carregamento demorou muito. Tente atualizar a página.');
    }, 15000); // 15 segundos - mais conservador

    return () => clearTimeout(loadingTimeout);
  }, [loading, addToast]);

  // Filtros e busca
  const filteredOrdens = useMemo(() => {
    // Debug: mostrar dados de filtro

    return ordens.filter(os => {
      const matchesSearch = searchTerm === '' || 
        os.numero.toString().includes(searchTerm) ||
        os.cliente.toLowerCase().includes(searchTerm.toLowerCase()) ||
        os.aparelho.toLowerCase().includes(searchTerm.toLowerCase()) ||
        os.servico.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (os.responsavelNome && os.responsavelNome.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchesStatus = statusFilter === '' || os.statusOS.toLowerCase() === statusFilter.toLowerCase();
      const matchesAparelho = aparelhoFilter === '' || os.aparelho.toLowerCase().includes(aparelhoFilter.toLowerCase());
      const matchesTecnico = tecnicoFilter === '' || os.tecnico.toLowerCase().includes(tecnicoFilter.toLowerCase());
      const matchesTipo = tipoFilter === '' || os.tipo === tipoFilter;
      
      // Filtro por aba - Garantir consistência visual entre todas as abas
      let matchesTab = true;
      if (activeTab === 'reparo_concluido') {
        // OS com reparo concluído pelo técnico (status_tecnico)
        const statusTecnico = (os.statusTecnico || '').toLowerCase();
        matchesTab = statusTecnico.includes('reparo concluído') || statusTecnico.includes('reparo concluido');
      } else if (activeTab === 'concluidas') {
        // OS concluídas: entregues, finalizadas (status da OS)
        const statusConcluidos = ['entregue', 'finalizado', 'concluído', 'reparo concluído'];
        matchesTab = statusConcluidos.includes(os.statusOS.toLowerCase());
      } else if (activeTab === 'orcamentos') {
        // OS com orçamento (status da OS)
        const statusOrcamento = ['orçamento', 'orçamento enviado', 'aguardando aprovação'];
        matchesTab = statusOrcamento.includes(os.statusOS.toLowerCase());
      } else if (activeTab === 'aguardando_retirada') {
        // OS aguardando retirada (status da OS ou técnico)
        const stOs = (os.statusOS || '').toUpperCase();
        const stTec = (os.statusTecnico || '').toUpperCase();
        matchesTab = stOs === 'AGUARDANDO RETIRADA' || stTec === 'AGUARDANDO RETIRADA';
      } else if (activeTab === 'aprovadas') {
        // OS aprovadas (status da OS ou técnico)
        const stOs = (os.statusOS || '').toUpperCase();
        const stTec = (os.statusTecnico || '').toUpperCase();
        matchesTab = stOs === 'APROVADO' || stTec === 'APROVADO';
      } else if (activeTab === 'laudo_pronto') {
        // OS com laudo pronto (status técnico)
        const stTec = (os.statusTecnico || '').toUpperCase();
        matchesTab = stTec === 'ORÇAMENTO CONCLUÍDO' || stTec === 'ORCAMENTO CONCLUIDO' || 
                     stTec === 'AGUARDANDO APROVAÇÃO' || stTec === 'AGUARDANDO APROVACAO';
      }
      // activeTab === 'todas' não filtra nada - mostra todas as OSs

      return matchesSearch && matchesStatus && matchesAparelho && matchesTecnico && matchesTipo && matchesTab;
    });

  }, [ordens, searchTerm, statusFilter, aparelhoFilter, tecnicoFilter, tipoFilter, activeTab]);

  const totalPages = Math.ceil(filteredOrdens.length / itemsPerPage);
  const paginated = filteredOrdens.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const handleSearchChange = useCallback((value: string) => {
    setSearchTerm(value);
    setCurrentPage(1);
  }, []);

  const handleStatusFilterChange = useCallback((value: string) => {
    setStatusFilter(value);
    setCurrentPage(1);
  }, []);

  const handleTecnicoFilterChange = useCallback((value: string) => {
    setTecnicoFilter(value);
    setCurrentPage(1);
  }, []);

  const handleTipoFilterChange = useCallback((value: string) => {
    setTipoFilter(value);
    setCurrentPage(1);
  }, []);

  const handlePageChange = useCallback((page: number) => {
    setCurrentPage(page);
  }, []);

  const handleTabChange = useCallback((tab: string) => {
    setActiveTab(tab);
    setCurrentPage(1);
  }, []);

  // Contadores para as abas
  const contadores = useMemo(() => {
    const reparoConcluido = ordens.filter(os => {
      const statusTecnico = (os.statusTecnico || '').toLowerCase();
      return statusTecnico.includes('reparo concluído') || statusTecnico.includes('reparo concluido');
    }).length;
    
    const concluidas = ordens.filter(os => {
      const statusConcluidos = ['entregue', 'finalizado', 'concluído', 'reparo concluído'];
      return statusConcluidos.includes(os.statusOS.toLowerCase());
    }).length;
    
    const orcamentos = ordens.filter(os => {
      const statusOrcamento = ['orçamento', 'orçamento concluído', 'aguardando aprovação'];
      return statusOrcamento.includes(os.statusOS.toLowerCase());
    }).length;
    const aguardandoRetirada = ordens.filter(os => {
      const stOs = (os.statusOS || '').toUpperCase();
      const stTec = (os.statusTecnico || '').toUpperCase();
      return stOs === 'AGUARDANDO RETIRADA' || stTec === 'AGUARDANDO RETIRADA';
    }).length;
    const aprovadas = ordens.filter(os => {
      const stOs = (os.statusOS || '').toUpperCase();
      const stTec = (os.statusTecnico || '').toUpperCase();
      return stOs === 'APROVADO' || stTec === 'APROVADO';
    }).length;
    const laudoPronto = ordens.filter(os => {
      const stTec = (os.statusTecnico || '').toUpperCase();
      return stTec === 'ORÇAMENTO CONCLUÍDO' || stTec === 'ORCAMENTO CONCLUIDO' ||
             stTec === 'AGUARDANDO APROVAÇÃO' || stTec === 'AGUARDANDO APROVACAO';
    }).length;
    
    return { reparoConcluido, concluidas, orcamentos, aguardandoRetirada, aprovadas, laudoPronto, todas: ordens.length };
  }, [ordens]);

  // ✅ OTIMIZADO: Loading states mais inteligentes
  if (!empresaId) {
    return (
      <MenuLayout>
        <OSFullPageSkeleton />
      </MenuLayout>
    );
  }

  if (loadingOrdens && ordens.length === 0) {
    return (
      <MenuLayout>
        <OSFullPageSkeleton />
        {retryState.isRetrying && (
          <div className="fixed bottom-4 right-4 bg-blue-100 dark:bg-blue-900/50 border border-blue-200 dark:border-blue-700 rounded-lg p-4 shadow-lg">
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
              <span className="text-blue-700 font-medium">
                Tentativa {retryState.currentAttempt} de 3...
              </span>
            </div>
          </div>
        )}
      </MenuLayout>
    );
  }

  // Estado de erro
  if (error && !loading) {
    return (
      <MenuLayout>
        <div className="p-4 md:p-8">
          <div className="text-center py-12">
            <div className="bg-red-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
              <FiAlertCircle className="w-8 h-8 text-red-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Não foi possível carregar as ordens
            </h3>
            <p className="text-gray-600 mb-4">
              Verifique sua conexão e tente novamente
            </p>
            {retryState.isRetrying && (
              <p className="text-blue-600 text-sm mb-4">
                Tentativa {retryState.currentAttempt} de 3...
              </p>
            )}
            <Button onClick={handleRetry} disabled={retryState.isRetrying}>
              <FiRefreshCw className={`w-4 h-4 mr-2 ${retryState.isRetrying ? 'animate-spin' : ''}`} />
              {retryState.isRetrying ? 'Tentando...' : 'Tentar novamente'}
            </Button>
          </div>
        </div>
      </MenuLayout>
    );
  }

  const hoje = new Date();
  const inicioMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
  const inicioSemana = new Date(hoje.setDate(hoje.getDate() - hoje.getDay()));
  const mesAnterior = new Date(hoje.getFullYear(), hoje.getMonth(), 1);

  // Calcular métricas diárias
  const hojeAgora = new Date();
  const inicioDia = new Date(hojeAgora.getFullYear(), hojeAgora.getMonth(), hojeAgora.getDate());
  const fimDia = new Date(hojeAgora.getFullYear(), hojeAgora.getMonth(), hojeAgora.getDate() + 1);

  const osHoje = ordens.filter(os => {
    // Converter a data de entrada para data local sem timezone
    let dataOS: Date;
    if (typeof os.entrada === 'string') {
      // Se for string YYYY-MM-DD, tratar como data local
      const match = os.entrada.match(/^(\d{4})-(\d{2})-(\d{2})/);
      if (match) {
        const [, year, month, day] = match;
        dataOS = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
      } else {
        dataOS = new Date(os.entrada);
      }
    } else {
      dataOS = new Date(os.entrada);
    }
    
    return dataOS >= inicioDia && dataOS < fimDia;
  }).length;

  const faturamentoHoje = ordens.filter(os => {
    const dataOS = new Date(os.entrada);
    return dataOS >= inicioDia && dataOS < fimDia && os.valorFaturado;
  }).reduce((sum: number, o: any) => sum + (o.valorFaturado || 0), 0);

  const ticketMedioHoje = osHoje > 0 ? faturamentoHoje / osHoje : 0;

  const retornosHoje = ordens.filter(os => {
    const dataOS = new Date(os.entrada);
    return dataOS >= inicioDia && dataOS < fimDia && os.tipo === 'Retorno';
  }).length;

  const aprovadosHoje = ordens.filter(os => {
    const dataOS = new Date(os.entrada);
    return dataOS >= inicioDia && dataOS < fimDia && 
           (os.statusOS?.toLowerCase() === 'aprovado' || 
            os.statusTecnico?.toLowerCase() === 'aprovado');
  }).length;

  return (
    <AuthGuardFinal>
      <MenuLayout>
        <div className="p-4 md:p-8">
          {/* Header com título e botão */}
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-6 md:mb-8 gap-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-zinc-100">Ordens de Serviço</h1>
              <p className="text-gray-600 dark:text-zinc-300 mt-1 text-sm md:text-base">
                Gerencie todas as ordens de serviço da sua empresa
              </p>
            </div>
            <div className="flex gap-3 w-full md:w-auto">
              <Button
                onClick={() => router.push("/nova-os")}
                size="lg"
                className="bg-black text-white hover:bg-neutral-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white px-6 md:px-8 py-3 text-sm md:text-base font-semibold shadow-lg flex-1 md:flex-none"
              >
                <FiPlus className="w-5 h-5 mr-2" />
                Nova OS
              </Button>
            </div>
          </div>

          {/* Cards principais - Dados Diários */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-6 md:mb-8">
            <DashboardCard
              title="OS do Dia"
              value={osHoje}
              description={`Total: ${totalOS}`}
              descriptionColorClass="text-gray-600 dark:text-zinc-300"
              icon={<FiFileText className="w-5 h-5" />}
              svgPolyline={{
                points: '0,20 10,15 20,17 30,10 40,12 50,8 60,10 70,6',
                strokeClass: 'text-lime-500 dark:text-lime-300',
              }}
            >
              <div className="mt-2">
                <button 
                  onClick={() => router.push('/financeiro/detalhamento-mes')}
                  className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 font-medium"
                >
                  Ver mês completo →
                </button>
              </div>
            </DashboardCard>
            <DashboardCard
              title="Faturamento do Dia"
              value={formatCurrency(faturamentoHoje)}
              description={`Ticket médio: ${formatCurrency(ticketMedioHoje)}`}
              descriptionColorClass="text-green-700 dark:text-green-300"
              icon={<FiDollarSign className="w-5 h-5" />}
              svgPolyline={{
                points: '0,18 10,16 20,14 30,10 40,11 50,9 60,10 70,6',
                strokeClass: 'text-emerald-500 dark:text-emerald-300',
              }}
            >
              <div className="mt-2">
                <button 
                  onClick={() => router.push('/financeiro/detalhamento-mes')}
                  className="text-xs text-green-600 dark:text-green-400 hover:text-green-800 dark:hover:text-green-300 font-medium"
                >
                  Ver mês completo →
                </button>
              </div>
            </DashboardCard>
            <DashboardCard
              title="Retornos do Dia"
              value={retornosHoje}
              description={`${percentualRetornos}% do total`}
              descriptionColorClass="text-red-600 dark:text-red-300"
              icon={<FiRefreshCw className="w-5 h-5" />}
              svgPolyline={{
                points: '0,12 10,14 20,16 30,18 40,20 50,17 60,15 70,16',
                strokeClass: 'text-red-500 dark:text-red-300',
              }}
            >
              <div className="mt-2">
                <button 
                  onClick={() => router.push('/financeiro/detalhamento-mes')}
                  className="text-xs text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 font-medium"
                >
                  Ver mês completo →
                </button>
              </div>
            </DashboardCard>
            <DashboardCard
              title="Aprovados do Dia"
              value={aprovadosHoje}
              description={`OS aprovadas hoje`}
              descriptionColorClass="text-purple-700 dark:text-purple-300"
              icon={<FiCheckCircle className="w-5 h-5" />}
              svgPolyline={{
                points: '0,15 10,18 20,16 30,19 40,17 50,20 60,18 70,20',
                strokeClass: 'text-violet-500 dark:text-violet-300',
              }}
            >
              <div className="mt-2">
                <button 
                  onClick={() => router.push('/financeiro/detalhamento-mes')}
                  className="text-xs text-purple-600 dark:text-purple-400 hover:text-purple-800 dark:hover:text-purple-300 font-medium"
                >
                  Ver mês completo →
                </button>
              </div>
            </DashboardCard>
          </div>

          {/* Abas */}
          <div className="bg-white dark:bg-zinc-900 rounded-xl shadow-sm dark:shadow-none border border-gray-200 dark:border-zinc-600 mb-6">
            <div className="flex overflow-x-auto border-b border-gray-200 dark:border-zinc-600">
              <div className="flex min-w-max">
              <button
                onClick={() => handleTabChange('todas')}
                aria-label="Mostrar todas as ordens de serviço"
                aria-pressed={activeTab === 'todas'}
                className={`px-4 py-3 font-medium text-sm border-b-2 transition-colors whitespace-nowrap ${
                  activeTab === 'todas'
                    ? 'border-blue-500 dark:border-blue-400 text-blue-600 dark:text-blue-300 bg-blue-50 dark:bg-blue-900/40'
                    : 'border-transparent text-gray-500 dark:text-zinc-400 hover:text-gray-700 dark:hover:text-zinc-200 hover:bg-gray-50 dark:hover:bg-zinc-700'
                }`}
              >
                Todas
                <span className={`ml-2 px-2 py-1 text-xs rounded-full ${
                  activeTab === 'todas' ? 'bg-blue-100 dark:bg-blue-900/70 text-blue-800 dark:text-blue-100' : 'bg-gray-100 dark:bg-zinc-800 text-gray-700 dark:text-zinc-200'
                }`}>
                  {contadores.todas}
                </span>
              </button>
              <button
                onClick={() => handleTabChange('reparo_concluido')}
                className={`px-4 py-3 font-medium text-sm border-b-2 transition-colors whitespace-nowrap ${
                  activeTab === 'reparo_concluido'
                    ? 'border-blue-500 dark:border-blue-400 text-blue-600 dark:text-blue-300 bg-blue-50 dark:bg-blue-900/40'
                    : 'border-transparent text-gray-500 dark:text-zinc-400 hover:text-gray-700 dark:hover:text-zinc-200 hover:bg-gray-50 dark:hover:bg-zinc-700'
                }`}
              >
                Reparo Concluído
                <span className={`ml-2 px-2 py-1 text-xs rounded-full ${
                  activeTab === 'reparo_concluido' ? 'bg-blue-100 dark:bg-blue-900/70 text-blue-800 dark:text-blue-100' : 'bg-gray-100 dark:bg-zinc-800 text-gray-700 dark:text-zinc-200'
                }`}>
                  {contadores.reparoConcluido}
                </span>
              </button>
              <button
                onClick={() => handleTabChange('orcamentos')}
                className={`px-4 py-3 font-medium text-sm border-b-2 transition-colors whitespace-nowrap ${
                  activeTab === 'orcamentos'
                    ? 'border-blue-500 dark:border-blue-400 text-blue-600 dark:text-blue-300 bg-blue-50 dark:bg-blue-900/40'
                    : 'border-transparent text-gray-500 dark:text-zinc-400 hover:text-gray-700 dark:hover:text-zinc-200 hover:bg-gray-50 dark:hover:bg-zinc-700'
                }`}
              >
                Orçamentos
                <span className={`ml-2 px-2 py-1 text-xs rounded-full ${
                  activeTab === 'orcamentos' ? 'bg-blue-100 dark:bg-blue-900/70 text-blue-800 dark:text-blue-100' : 'bg-gray-100 dark:bg-zinc-800 text-gray-700 dark:text-zinc-200'
                }`}>
                  {contadores.orcamentos}
                </span>
              </button>
              <button
                onClick={() => handleTabChange('aprovadas')}
                className={`px-4 py-3 font-medium text-sm border-b-2 transition-colors whitespace-nowrap ${
                  activeTab === 'aprovadas'
                    ? 'border-blue-500 dark:border-blue-400 text-blue-600 dark:text-blue-300 bg-blue-50 dark:bg-blue-900/40'
                    : 'border-transparent text-gray-500 dark:text-zinc-400 hover:text-gray-700 dark:hover:text-zinc-200 hover:bg-gray-50 dark:hover:bg-zinc-700'
                }`}
              >
                Aprovadas
                <span className={`ml-2 px-2 py-1 text-xs rounded-full ${
                  activeTab === 'aprovadas' ? 'bg-blue-100 dark:bg-blue-900/70 text-blue-800 dark:text-blue-100' : 'bg-gray-100 dark:bg-zinc-800 text-gray-700 dark:text-zinc-200'
                }`}>
                  {contadores.aprovadas}
                </span>
              </button>
              <button
                onClick={() => handleTabChange('laudo_pronto')}
                className={`px-4 py-3 font-medium text-sm border-b-2 transition-colors whitespace-nowrap ${
                  activeTab === 'laudo_pronto'
                    ? 'border-blue-500 dark:border-blue-400 text-blue-600 dark:text-blue-300 bg-blue-50 dark:bg-blue-900/40'
                    : 'border-transparent text-gray-500 dark:text-zinc-400 hover:text-gray-700 dark:hover:text-zinc-200 hover:bg-gray-50 dark:hover:bg-zinc-700'
                }`}
              >
                Laudo Pronto
                <span className={`ml-2 px-2 py-1 text-xs rounded-full ${
                  activeTab === 'laudo_pronto' ? 'bg-blue-100 dark:bg-blue-900/70 text-blue-800 dark:text-blue-100' : 'bg-gray-100 dark:bg-zinc-800 text-gray-700 dark:text-zinc-200'
                }`}>
                  {contadores.laudoPronto}
                </span>
              </button>
              <button
                onClick={() => handleTabChange('aguardando_retirada')}
                className={`px-4 py-3 font-medium text-sm border-b-2 transition-colors whitespace-nowrap ${
                  activeTab === 'aguardando_retirada'
                    ? 'border-blue-500 dark:border-blue-400 text-blue-600 dark:text-blue-300 bg-blue-50 dark:bg-blue-900/40'
                    : 'border-transparent text-gray-500 dark:text-zinc-400 hover:text-gray-700 dark:hover:text-zinc-200 hover:bg-gray-50 dark:hover:bg-zinc-700'
                }`}
              >
                                 Aguardando Retirada
                <span className={`ml-2 px-2 py-1 text-xs rounded-full ${
                  activeTab === 'aguardando_retirada' ? 'bg-blue-100 dark:bg-blue-900/70 text-blue-800 dark:text-blue-100' : 'bg-gray-100 dark:bg-zinc-800 text-gray-700 dark:text-zinc-200'
                }`}>
                  {contadores.aguardandoRetirada}
                </span>
              </button>
              <button
                onClick={() => handleTabChange('concluidas')}
                className={`px-4 py-3 font-medium text-sm border-b-2 transition-colors whitespace-nowrap ${
                  activeTab === 'concluidas'
                    ? 'border-blue-500 dark:border-blue-400 text-blue-600 dark:text-blue-300 bg-blue-50 dark:bg-blue-900/40'
                    : 'border-transparent text-gray-500 dark:text-zinc-400 hover:text-gray-700 dark:hover:text-zinc-200 hover:bg-gray-50 dark:hover:bg-zinc-700'
                }`}
              >
                                 Concluídas
                <span className={`ml-2 px-2 py-1 text-xs rounded-full ${
                  activeTab === 'concluidas' ? 'bg-blue-100 dark:bg-blue-900/70 text-blue-800 dark:text-blue-100' : 'bg-gray-100 dark:bg-zinc-800 text-gray-700 dark:text-zinc-200'
                }`}>
                  {contadores.concluidas}
                </span>
              </button>
              </div>
            </div>
          </div>

          {/* Filtros e busca */}
          <div className="bg-white dark:bg-zinc-900 rounded-xl shadow-sm dark:shadow-none border border-gray-200 dark:border-zinc-600 p-6 mb-6">
            <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center">
              {/* Busca */}
              <div className="flex-1 relative">
                  <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-zinc-500 w-4 h-4" />
                  <Input
                    type="text"
                  placeholder="Buscar por OS, cliente, aparelho ou serviço..."
                    value={searchTerm}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  className="pl-10 w-full"
                  />
              </div>

              {/* Filtros */}
              <div className="flex flex-wrap gap-3">
                <Select
                  value={statusFilter}
                  onChange={(e) => handleStatusFilterChange(e.target.value)}
                  className="w-48"
                >
                  <option value="">Todos os Status</option>
                                     <option value="concluido">Concluído</option>
                   <option value="pendente">Pendente</option>
                   <option value="orcamento">Orçamento</option>
                   <option value="analise">Análise</option>
                   <option value="nao aprovado">Não Aprovado</option>
                </Select>

                <Select
                  value={tipoFilter}
                  onChange={(e) => handleTipoFilterChange(e.target.value)}
                  className="w-40"
                >
                  <option value="">Todos os Tipos</option>
                                     <option value="Nova">Nova</option>
                   <option value="Retorno">Retorno</option>
                </Select>

                <Select
                  value={tecnicoFilter}
                  onChange={(e) => handleTecnicoFilterChange(e.target.value)}
                  className="w-48"
                >
                  <option value="">Todos os Técnicos</option>
                  {tecnicos.map((tecnico, index) => (
                    <option key={`tecnico-${index}-${tecnico}`} value={tecnico}>{tecnico}</option>
                  ))}
                </Select>

                <Button
                  onClick={() => {
                    setSearchTerm('');
                    setStatusFilter('');
                    setTipoFilter('');
                    setTecnicoFilter('');
                    setAparelhoFilter('');
                    setActiveTab('reparo_concluido');
                    setCurrentPage(1);
                  }}
                  variant="outline"
                  size="sm"
                  className="flex items-center gap-2"
                >
                  <FiFilter className="w-4 h-4" />
                  Limpar
                </Button>
              </div>
            </div>

            {/* Resultados */}
            <div className="mt-4 flex items-center justify-between text-sm text-gray-600 dark:text-zinc-400">
              <span>
                {filteredOrdens.length} de {ordens.length} ordens encontradas
              </span>
              {loading && (
                <div className="flex items-center gap-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-900 dark:border-zinc-100"></div>
                  <span>Carregando...</span>
                </div>
              )}
          </div>
        </div>

        {/* Tabela - Desktop */}
        <div className="hidden md:block bg-white dark:bg-zinc-900 rounded-xl shadow-sm dark:shadow-none border border-gray-200 dark:border-zinc-600">
          <div className="w-full">
            <table className="w-full table-fixed divide-y divide-gray-200 dark:divide-zinc-600">
                <colgroup>
                  <col className="w-20" /><col className="w-16" /><col className="w-24" /><col className="w-20" /><col className="w-16" /><col className="w-20" /><col className="w-16" /><col className="w-20" /><col className="w-20" /><col className="w-20" /><col className="w-16" />
                </colgroup>
              <thead className="bg-gray-50 dark:bg-zinc-700">
                <tr>
                  <th className="px-1 py-2 text-left text-xs font-medium text-gray-500 dark:text-zinc-300 uppercase tracking-wider">
                    <div className="flex items-center gap-1">
                        <FiFileText className="w-3 h-3" />
                      <span className="hidden sm:inline">OS</span>
                    </div>
                  </th>
                  <th className="px-1 py-2 text-left text-xs font-medium text-gray-500 dark:text-zinc-300 uppercase tracking-wider">
                    <div className="flex items-center gap-1">
                        <FiRefreshCw className="w-3 h-3" />
                      <span className="hidden sm:inline">Tipo</span>
                    </div>
                  </th>
                  <th className="px-1 py-2 text-left text-xs font-medium text-gray-500 dark:text-zinc-300 uppercase tracking-wider">
                    <div className="flex items-center gap-1">
                        <FiSmartphone className="w-3 h-3" />
                      <span className="hidden sm:inline">Aparelho</span>
                    </div>
                  </th>
                  <th className="px-1 py-2 text-left text-xs font-medium text-gray-500 dark:text-zinc-300 uppercase tracking-wider">
                      <span className="hidden sm:inline">Serviço</span>
                  </th>
                  <th className="px-1 py-2 text-left text-xs font-medium text-gray-500 dark:text-zinc-300 uppercase tracking-wider">
                    <div className="flex items-center gap-1">
                        <FiClock className="w-3 h-3" />
                      <span className="hidden sm:inline">Prazo</span>
                    </div>
                  </th>
                  <th className="px-1 py-2 text-left text-xs font-medium text-gray-500 dark:text-zinc-300 uppercase tracking-wider">
                      <span className="hidden sm:inline">Garantia</span>
                  </th>
                  <th className="px-1 py-2 text-left text-xs font-medium text-gray-500 dark:text-zinc-300 uppercase tracking-wider">
                    <div className="flex items-center gap-1">
                      <FiDollarSign className="w-3 h-3" />
                        <span className="hidden sm:inline">Total</span>
                    </div>
                  </th>
                  <th className="px-1 py-2 text-left text-xs font-medium text-gray-500 dark:text-zinc-300 uppercase tracking-wider">
                    <div className="flex items-center gap-1">
                      <FiUser className="w-3 h-3" />
                      <span className="hidden sm:inline">Técnico</span>
                    </div>
                  </th>
                  <th className="px-1 py-2 text-left text-xs font-medium text-gray-500 dark:text-zinc-300 uppercase tracking-wider">
                    <span className="hidden sm:inline">Status</span>
                  </th>
                  <th className="px-1 py-2 text-left text-xs font-medium text-gray-500 dark:text-zinc-300 uppercase tracking-wider">
                    <span className="hidden sm:inline">Status Técnico</span>
                  </th>
                  <th className="px-1 py-2 text-left text-xs font-medium text-gray-500 dark:text-zinc-300 uppercase tracking-wider">
                    <div className="flex items-center gap-1">
                      <FiDollarSign className="w-3 h-3" />
                      <span className="hidden sm:inline">Faturado</span>
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-zinc-900 divide-y divide-gray-200 dark:divide-zinc-600">
                {paginated.map((os) => (
                  <tr 
                    key={os.id} 
                    className={`hover:bg-blue-50 dark:hover:bg-zinc-700 hover:shadow-sm transition-all duration-200 cursor-pointer group ${
                      os.tipo === 'Retorno' ? 'border-l-4 border-l-red-500 bg-red-50/50 dark:bg-red-900/20 hover:bg-red-100/50 dark:hover:bg-red-900/30' : ''
                    }`}
                    onClick={() => router.push(`/ordens/${os.id}`)}
                  >
                    <td className="px-1 py-2 relative">
                      <div className="flex items-start gap-2">
                        <div className="flex-shrink-0">
                          {renderUserAvatar(os.responsavelNome || os.atendente || 'Usuário', os.responsavelAvatar, 38)}
                        </div>
                        <div className="min-w-0 flex-1 space-y-0.5">
                          <div className="flex items-center gap-1">
                            <span className="font-bold text-gray-900 dark:text-zinc-100 text-xs group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                              #{os.numero}
                            </span>
                            {os.tipo === 'Retorno' && (
                              <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse flex-shrink-0"></div>
                            )}
                          </div>
                          <div className="text-[11px] text-gray-500 dark:text-zinc-400 font-medium truncate">
                            Criada por {os.responsavelNome || os.atendente || 'Usuário'}
                          </div>
                          <div className="text-xs text-gray-600 dark:text-zinc-300 font-medium truncate min-w-0 group-hover:text-gray-900 dark:group-hover:text-zinc-100 transition-colors">
                            {os.cliente || 'N/A'}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-zinc-400 truncate">{os.clienteTelefone || 'N/A'}</div>
                          <div className="text-xs text-gray-400 dark:text-zinc-400 truncate">{formatDate(os.entrada) || 'N/A'}</div>
                        </div>
                      </div>
                      {/* Indicador de recusa - ponto vermelho no canto superior direito da célula */}
                      {os.observacao?.includes('🚫 CLIENTE RECUSOU ORÇAMENTO') && (
                        <div className="absolute top-1 right-1 w-2 h-2 bg-red-600 rounded-full shadow-sm border border-white" title="Cliente recusou orçamento"></div>
                      )}
                    </td>
                    <td className="px-1 py-2">
                      {os.tipo === 'Retorno' ? (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-bold bg-red-200 text-red-900 border border-red-300 shadow-sm">
                          <FiRefreshCw className="w-3 h-3 mr-1" />
                          <span className="hidden sm:inline">RETORNO</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-1 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 border border-green-200">
                          <FiPlus className="w-3 h-3 mr-0.5" />
                          <span className="hidden sm:inline">Nova</span>
                        </span>
                      )}
                    </td>
                    <td className="px-1 py-2">
                      <div className="text-xs font-medium text-gray-900 dark:text-zinc-100 truncate min-w-0">{os.aparelho || 'N/A'}</div>
                      {(os.aparelhoCategoria || os.aparelhoMarca) && (
                        <div className="text-xs text-gray-500 dark:text-zinc-400 truncate">
                          {[os.aparelhoCategoria, os.aparelhoMarca].filter(Boolean).join(' • ')}
                        </div>
                      )}
                      {os.problema_relatado && (
                        <div className="text-xs text-blue-600 truncate mt-1" title={os.problema_relatado}>
                          💬 {os.problema_relatado}
                        </div>
                      )}
                    </td>
                    <td className="px-1 py-2">
                      <div className="text-xs text-gray-900 dark:text-zinc-100 min-w-0">
                        <div className="font-medium truncate">{os.servico || 'Aguardando'}</div>
                        <div className="text-gray-600 dark:text-zinc-400 font-semibold">{formatCurrency(os.valorTotal)}</div>
                      </div>
                    </td>
                    <td className="px-1 py-2">
                      <div className="text-xs text-gray-600 min-w-0">
                        <div className="mb-1">
                          <span className="font-medium text-gray-700 dark:text-zinc-300">
                            {formatDate(os.prazoEntrega) || 'Não definido'}
                          </span>
                        </div>
                        <div className={`text-xs ${
                          os.entrega && os.entrega !== 'Aguardando retirada' 
                            ? 'text-green-600' 
                            : 'text-gray-500 dark:text-zinc-500'
                        }`}>
                          {formatDate(os.entrega) || 'Aguardando'}
                        </div>
                      </div>
                    </td>
                    <td className="px-1 py-2">
                      <div className={`text-xs font-medium min-w-0 ${
                        os.garantia && new Date(os.garantia) < new Date()
                          ? 'text-red-600'
                          : 'text-green-600'
                      }`}>
                        <div className="whitespace-nowrap">{formatDate(os.garantia) || 'Aguardando'}</div>
                        {os.garantia && (
                          <div className="text-xs text-gray-500 dark:text-zinc-400 truncate">
                            {new Date(os.garantia).setHours(0,0,0,0) < new Date().setHours(0,0,0,0)
                              ? 'Expirada'
                              : `${Math.max(0, Math.ceil((new Date(os.garantia).setHours(0,0,0,0) - new Date().setHours(0,0,0,0)) / (1000 * 60 * 60 * 24)))} dias restantes`
                            }
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-1 py-2">
                      <div className="text-xs font-bold text-green-600 whitespace-nowrap min-w-0">
                        {formatCurrency(os.valorTotal) || 'R$ 0,00'}
                      </div>
                    </td>
                    <td className="px-1 py-2">
                      <div className="text-xs text-gray-900 dark:text-zinc-100 truncate min-w-0">{os.tecnico || 'N/A'}</div>
                    </td>
                    <td className="px-1 py-2">
                      <div className="flex items-center gap-1 min-w-0 overflow-hidden">
                        <span className={`inline-flex items-center px-1 py-0.5 rounded-full text-xs font-medium truncate max-w-full ${getStatusColor(os.statusOS)}`}>
                          {getStatusTecnicoLabel(os.statusOS, null) || 'N/A'}
                        </span>
                        {os.tipo === 'Retorno' && (
                          <div className="w-1.5 h-1.5 bg-red-500 rounded-full flex-shrink-0"></div>
                        )}
                      </div>
                    </td>
                    <td className="px-1 py-2">
                      <div className="flex items-center gap-1 min-w-0 overflow-hidden">
                        <span className={`inline-flex items-center px-1 py-0.5 rounded-full text-xs font-medium truncate max-w-full ${getStatusTecnicoColor(os.statusTecnico)}`}>
                            {getStatusTecnicoLabel(os.statusOS, os.statusTecnico) || 'N/A'}
                        </span>
                      </div>
                    </td>
                    <td className="px-1 py-2">
                      <div className="text-xs min-w-0">
                        {os.clienteRecusou ? (
                          <>
                            <div className="font-bold text-red-600">
                              Recusado
                            </div>
                            <div className="text-xs text-red-500 font-medium mt-1">
                              Cliente recusou
                            </div>
                          </>
                        ) : os.aparelhoSemConserto ? (
                          <>
                            <div className="font-bold text-orange-600">
                              Sem conserto
                            </div>
                            <div className="text-xs text-orange-500 font-medium mt-1">
                              Aparelho s/ reparo
                            </div>
                          </>
                        ) : os.foiFaturada ? (
                          <>
                            <div className="font-bold text-green-600">
                              Faturado
                            </div>
                            <div className="text-xs text-blue-600 font-medium mt-1">
                              {formatFormaPagamento(os.formaPagamento)}
                            </div>
                          </>
                        ) : os.faturamentoSemVendaVinculada ? (
                          <>
                            <div className="font-bold text-amber-700 dark:text-amber-400">
                              Entregue
                            </div>
                            <div className="text-xs text-amber-600 dark:text-amber-500 font-medium mt-1 leading-snug">
                              Sem venda no caixa
                            </div>
                          </>
                        ) : (
                          <>
                            <div className="text-gray-500 dark:text-zinc-400 font-medium">
                              Aguardando
                            </div>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          </div>

          {/* Cards Mobile - Layout responsivo para mobile */}
          <div className="md:hidden space-y-4">
            {paginated.map((os) => {
              const responsavelNome = os.responsavelNome || os.atendente || 'Usuário';
              return (
              <div 
                key={os.id} 
                className={`relative bg-white dark:bg-zinc-900 rounded-lg border border-gray-200 dark:border-zinc-600 p-4 shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer ${
                  os.tipo === 'Retorno' ? 'border-l-4 border-l-red-500 bg-red-50/60 dark:bg-red-900/20 hover:bg-red-100/60 dark:hover:bg-red-900/30' : ''
                }`}
                onClick={() => router.push(`/ordens/${os.id}`)}
              >
                {/* Indicador de recusa - ponto vermelho no canto superior direito */}
                {os.observacao?.includes('🚫 CLIENTE RECUSOU ORÇAMENTO') && (
                  <div className="absolute top-3 right-3 w-2.5 h-2.5 bg-red-500 rounded-full shadow-sm z-10" title="Cliente recusou orçamento"></div>
                )}
                {/* Indicador de aparelho sem conserto - ponto laranja */}
                {os.aparelhoSemConserto && (
                  <div className="absolute top-3 right-3 w-2.5 h-2.5 bg-orange-500 rounded-full shadow-sm z-10" title="Aparelho sem conserto"></div>
                )}
                {/* Header do card */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    {renderUserAvatar(responsavelNome, os.responsavelAvatar, 42)}
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-gray-900 dark:text-zinc-100">#{os.numero}</span>
                        {os.tipo === 'Retorno' && (
                          <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                        )}
                      </div>
                      <div className="text-[11px] text-gray-500 dark:text-zinc-400">Criada por {responsavelNome}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {os.tipo === 'Retorno' && (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-bold bg-red-200 text-red-900 border border-red-300 shadow-sm">
                        <FiRefreshCw className="w-3 h-3 mr-1" />
                        RETORNO
                      </span>
                    )}
                    <div className={`px-2 py-1 text-xs rounded-full font-medium ${getStatusColor(os.statusOS)}`}>
                      {getStatusTecnicoLabel(os.statusOS, null)}
                    </div>
                  </div>
                </div>

                {/* Cliente */}
                <div className="mb-3">
                  <div className="text-sm font-medium text-gray-900 dark:text-zinc-100">{os.cliente || 'N/A'}</div>
                  <div className="text-xs text-gray-600 dark:text-zinc-400">{os.clienteTelefone || 'N/A'}</div>
                </div>

                {/* Aparelho e Serviço */}
                <div className="mb-3">
                  <div className="text-sm font-medium text-gray-800 dark:text-zinc-200">{os.aparelho || 'N/A'}</div>
                  <div className="text-xs text-gray-600 dark:text-zinc-400">{os.servico || 'Aguardando'}</div>
                </div>

                {/* Relato do Cliente */}
                {os.problema_relatado && (
                  <div className="mb-3 p-2 bg-blue-50 dark:bg-blue-900/30 rounded-lg border border-blue-200 dark:border-blue-800">
                    <div className="text-xs text-blue-600 dark:text-blue-300 font-medium mb-1">💬 Relato do Cliente:</div>
                    <div className="text-xs text-blue-700 dark:text-blue-200 line-clamp-2">{os.problema_relatado}</div>
                  </div>
                )}

                {/* Informações técnicas */}
                <div className="grid grid-cols-2 gap-4 mb-3 text-xs">
                  <div>
                    <div className="text-gray-500 dark:text-zinc-400">Técnico</div>
                    <div className="font-medium text-gray-900 dark:text-zinc-100">{os.tecnico || 'N/A'}</div>
                  </div>
                  <div>
                    <div className="text-gray-500 dark:text-zinc-400">Total</div>
                    <div className="font-medium text-gray-900 dark:text-zinc-100">{formatCurrency(os.valorTotal)}</div>
                  </div>
                </div>

                {/* Status técnico e faturado */}
                <div className="flex items-center justify-between text-xs">
                  <div>
                    <div className="text-gray-500 dark:text-zinc-400">Status Técnico</div>
                    <div className="font-medium text-gray-900 dark:text-zinc-100">{getStatusTecnicoLabel(os.statusOS, os.statusTecnico) || 'N/A'}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-gray-500 dark:text-zinc-400">Faturado</div>
                    <div className={`font-medium ${
                      os.clienteRecusou ? 'text-red-600 dark:text-red-400' :
                      os.aparelhoSemConserto ? 'text-orange-600 dark:text-orange-400' :
                      os.foiFaturada ? 'text-green-600 dark:text-green-400' :
                      os.faturamentoSemVendaVinculada ? 'text-amber-700 dark:text-amber-400' :
                      'text-gray-500 dark:text-zinc-400'
                    }`}>
                      {os.clienteRecusou
                        ? 'Recusado'
                        : os.aparelhoSemConserto
                          ? 'Sem conserto'
                          : os.foiFaturada
                            ? 'Faturado'
                            : os.faturamentoSemVendaVinculada
                              ? 'Entregue (sem venda)'
                              : 'Aguardando'}
                    </div>
                  </div>
                </div>
              </div>
            );
            })}
          </div>

          {/* Estado vazio */}
            {!loading && paginated.length === 0 && (
              <div className="text-center py-12">
                <FiAlertCircle className="w-12 h-12 text-gray-400 dark:text-zinc-500 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 dark:text-zinc-100 mb-2">Nenhuma ordem encontrada</h3>
                <p className="text-gray-600 dark:text-zinc-400 mb-4">
                  {searchTerm || statusFilter || tipoFilter || tecnicoFilter 
                    ? 'Tente ajustar os filtros de busca'
                    : 'Comece criando sua primeira ordem de serviço'
                  }
                </p>
                {!searchTerm && !statusFilter && !tipoFilter && !tecnicoFilter && (
                  <Button
                    onClick={() => router.push("/nova-os")}
                    className="bg-black text-white hover:bg-neutral-800"
                  >
                    <FiPlus className="w-4 h-4 mr-2" />
                    Criar Primeira OS
                  </Button>
                )}
              </div>
            )}
          </div>

          {/* Paginação */}
          {totalPages > 1 && (
            <div className="mt-6 flex justify-center gap-2">
              <Button
                  onClick={() => handlePageChange(currentPage - 1)}
                variant="outline"
                size="sm"
                  disabled={currentPage === 1}
                >
                  Anterior
              </Button>
              
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                const page = i + 1;
                return (
                  <Button
                    key={page}
                    onClick={() => handlePageChange(page)}
                    variant={currentPage === page ? "default" : "outline"}
                    size="sm"
                  >
                    {page}
                  </Button>
                );
              })}
              
              <Button
                  onClick={() => handlePageChange(currentPage + 1)}
                variant="outline"
                size="sm"
                  disabled={currentPage === totalPages}
                >
                  Próxima
              </Button>
              </div>
          )}
        
        {/* Alerta de Laudos Prontos */}
        <LaudoProntoAlert />
      </MenuLayout>
    </AuthGuardFinal>
  );
}
