'use client';

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
  type ReactElement,
  cloneElement,
  isValidElement,
} from 'react';
import { FiAlertTriangle, FiClock } from 'react-icons/fi';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabaseClient';
import { useRouter } from 'next/navigation';

interface ContaPagar {
  id: string;
  descricao: string;
  data_vencimento: string | null;
  status: string | null;
  data_pagamento?: string | null;
}

interface AlertCardItem {
  id: string;
  titulo: string;
  dataFormatada: string;
  descricaoDias: string;
  dataISO?: string | null;
}

interface AlertCard {
  id: string;
  titulo: string;
  descricao: string;
  corFundo: string;
  corTexto: string;
  icon: ReactNode;
  itens: AlertCardItem[];
  restante: string | null;
}

interface ConfigAvisoContasPagar {
  id: string;
  tipo_alerta: 'vencidas' | 'proximas';
  titulo: string;
  descricao: string;
  cor_fundo: string;
  cor_texto: string;
  dias_antecedencia: number | null;
  ativo: boolean;
  exibir_para_todos: boolean;
  usuarios_ids: string[];
}

const MS_PER_DAY = 1000 * 60 * 60 * 24;

const hexToRgba = (hex: string | undefined, alpha: number) => {
  if (!hex) {
    return `rgba(0, 0, 0, ${alpha})`;
  }

  let sanitized = hex.replace('#', '');
  if (sanitized.length === 3) {
    sanitized = sanitized
      .split('')
      .map((char) => char + char)
      .join('');
  }

  if (sanitized.length !== 6) {
    return `rgba(0, 0, 0, ${alpha})`;
  }

  const r = parseInt(sanitized.slice(0, 2), 16);
  const g = parseInt(sanitized.slice(2, 4), 16);
  const b = parseInt(sanitized.slice(4, 6), 16);

  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

const formatarDataCurta = (data: string | null) => {
  if (!data) return '-';
  try {
    return new Date(`${data}T00:00:00`).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
    });
  } catch {
    return data;
  }
};

const calcularDiasRestantes = (data: string | null) => {
  if (!data) return undefined;
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const vencimento = new Date(`${data}T00:00:00`);
  if (Number.isNaN(vencimento.getTime())) return undefined;
  const diffMs = vencimento.getTime() - hoje.getTime();
  return Math.ceil(diffMs / MS_PER_DAY);
};

const calcularDiasEmAtraso = (data: string | null) => {
  if (!data) return undefined;
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const vencimento = new Date(`${data}T00:00:00`);
  if (Number.isNaN(vencimento.getTime())) return undefined;
  const diffMs = hoje.getTime() - vencimento.getTime();
  return Math.floor(diffMs / MS_PER_DAY);
};

function montarCards(contas: ContaPagar[], configs: ConfigAvisoContasPagar[], configsCarregadas: boolean): AlertCard[] {
  if (!contas || contas.length === 0) {
    return [];
  }

  // IMPORTANTE: Não mostrar nada até que as configurações sejam carregadas
  // Isso evita mostrar o banner para usuários sem permissão durante o carregamento
  if (!configsCarregadas) {
    return []; // Retornar vazio enquanto carrega
  }

  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);

  // Buscar configurações ativas (já filtradas por usuário no carregarConfigs)
  // IMPORTANTE: Se não houver configurações no banco, usar valores padrão
  // Mas se há configurações e nenhuma se aplica ao usuário, não mostrar nada
  const configVencidas = configs.find(c => c.tipo_alerta === 'vencidas');
  const configProximas = configs.find(c => c.tipo_alerta === 'proximas');
  
  // ❌ REMOVIDO: Não usar valores padrão automaticamente
  // Se não há configurações no banco OU se há configurações mas nenhuma se aplica ao usuário, não mostrar nada
  // Isso garante que avisos só aparecem quando explicitamente configurados pelo admin
  const usarValoresPadrao = false; // Nunca usar valores padrão - só mostrar se configurado explicitamente
  
  // Usar configurações ou valores padrão para dias de antecedência
  const diasAntecedencia = configProximas?.dias_antecedencia || 3;
  
  const limiteProximoVencimento = new Date(hoje);
  limiteProximoVencimento.setDate(limiteProximoVencimento.getDate() + diasAntecedencia);

  const vencidas = contas.filter((conta) => {
    if (!conta.data_vencimento) return false;
    const status = (conta.status || '').toLowerCase();
    if (status === 'pago') return false;

    const dataVencimento = new Date(`${conta.data_vencimento}T00:00:00`);
    if (Number.isNaN(dataVencimento.getTime())) return false;

    return status === 'vencido' || dataVencimento < hoje;
  });

  const vencidasIds = new Set(vencidas.map((conta) => conta.id));

  const proximas = contas.filter((conta) => {
    if (!conta.data_vencimento) return false;
    const status = (conta.status || '').toLowerCase();
    if (status === 'pago' || vencidasIds.has(conta.id)) return false;

    const dataVencimento = new Date(`${conta.data_vencimento}T00:00:00`);
    if (Number.isNaN(dataVencimento.getTime())) return false;

    return dataVencimento >= hoje && dataVencimento <= limiteProximoVencimento;
  });

  vencidas.sort((a, b) => {
    const da = new Date(`${a.data_vencimento ?? ''}T00:00:00`).getTime();
    const db = new Date(`${b.data_vencimento ?? ''}T00:00:00`).getTime();
    return da - db;
  });

  proximas.sort((a, b) => {
    const da = new Date(`${a.data_vencimento ?? ''}T00:00:00`).getTime();
    const db = new Date(`${b.data_vencimento ?? ''}T00:00:00`).getTime();
    return da - db;
  });

  const cards: AlertCard[] = [];

  // Exibir avisos apenas se:
  // 1. Há contas vencidas E
  // 2. (Há configuração ativa para o usuário OU não há configurações no banco - usar padrão)
  if (vencidas.length > 0 && (configVencidas || usarValoresPadrao)) {
    const titulo = configVencidas 
      ? configVencidas.titulo.replace('{quantidade}', String(vencidas.length))
      : `${vencidas.length} conta(s) vencidas`;
    
    const descricao = configVencidas 
      ? configVencidas.descricao
      : 'Regularize os pagamentos para evitar juros ou bloqueios de serviços.';
    
    const corFundo = configVencidas 
      ? configVencidas.cor_fundo
      : '#FEE2E2';
    
    const corTexto = configVencidas 
      ? configVencidas.cor_texto
      : '#991B1B';

    cards.push({
      id: 'contas-vencidas',
      titulo,
      descricao,
      corFundo,
      corTexto,
      icon: <FiAlertTriangle className="w-5 h-5" />,
      itens: vencidas.slice(0, 3).map((conta) => {
        const dias = calcularDiasEmAtraso(conta.data_vencimento);
        const descricaoDias =
          dias === undefined
            ? ''
            : dias <= 0
              ? 'vencida hoje'
              : `${dias} dia(s) em atraso`;
        const dataFormatada = formatarDataCurta(conta.data_vencimento);
        return {
          id: conta.id,
          titulo: conta.descricao,
          dataFormatada,
          descricaoDias,
          dataISO: conta.data_vencimento,
        } satisfies AlertCardItem;
      }),
      restante: vencidas.length > 3 ? `+${vencidas.length - 3} outras contas vencidas.` : null,
    });
  }

  // Exibir avisos apenas se:
  // 1. Há contas próximas E
  // 2. (Há configuração ativa para o usuário OU não há configurações no banco - usar padrão)
  if (proximas.length > 0 && (configProximas || usarValoresPadrao)) {
    const titulo = configProximas
      ? configProximas.titulo
          .replace('{quantidade}', String(proximas.length))
          .replace('{dias}', String(diasAntecedencia))
      : `${proximas.length} conta(s) vencem em até ${diasAntecedencia} dia(s)`;
    
    const descricao = configProximas
      ? configProximas.descricao
      : 'Antecipe os pagamentos para manter o caixa saudável.';
    
    const corFundo = configProximas
      ? configProximas.cor_fundo
      : '#FEF3C7';
    
    const corTexto = configProximas
      ? configProximas.cor_texto
      : '#92400E';

    cards.push({
      id: 'contas-proximas',
      titulo,
      descricao,
      corFundo,
      corTexto,
      icon: <FiClock className="w-5 h-5" />,
      itens: proximas.slice(0, 3).map((conta) => {
        const dias = calcularDiasRestantes(conta.data_vencimento);
        let descricaoDias = '';
        if (dias !== undefined) {
          descricaoDias =
            dias <= 0
              ? 'vence hoje'
              : dias === 1
                ? 'vence amanhã'
                : `vence em ${dias} dias`;
        }
        const dataFormatada = formatarDataCurta(conta.data_vencimento);
        return {
          id: conta.id,
          titulo: conta.descricao,
          dataFormatada,
          descricaoDias,
          dataISO: conta.data_vencimento,
        } satisfies AlertCardItem;
      }),
      restante:
        proximas.length > 3
          ? `+${proximas.length - 3} outras contas com vencimento próximo.`
          : null,
    });
  }

  return cards;
}

export default function FinanceiroAlertsBanner() {
  const { empresaData, usuarioData } = useAuth();
  const [contas, setContas] = useState<ContaPagar[]>([]);
  const [configs, setConfigs] = useState<ConfigAvisoContasPagar[]>([]);
  const [loadingConfigs, setLoadingConfigs] = useState(true); // Estado de carregamento
  const [configsCarregadas, setConfigsCarregadas] = useState(false); // Flag para saber se já carregou
  const empresaId = empresaData?.id;
  const usuarioId = usuarioData?.id;
  const router = useRouter();

  const carregarContas = useCallback(async () => {
    if (!empresaId) {
      setContas([]);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('contas_pagar')
        .select('id, descricao, data_vencimento, status, data_pagamento')
        .eq('empresa_id', empresaId)
        .order('data_vencimento', { ascending: true });

      if (error) {
        console.error('[FinanceiroAlertsBanner] Erro ao carregar contas:', error);
        setContas([]);
        return;
      }

      setContas(data || []);
    } catch (err) {
      console.error('[FinanceiroAlertsBanner] Erro inesperado ao carregar contas:', err);
      setContas([]);
    }
  }, [empresaId]);

  const carregarConfigs = useCallback(async () => {
    if (!empresaId) {
      setConfigs([]);
      setLoadingConfigs(false);
      setConfigsCarregadas(false);
      return;
    }

    setLoadingConfigs(true);
    try {
      // Forçar recarregamento sem cache usando timestamp
      const timestamp = Date.now();
      const randomId = Math.random().toString(36).substring(7);
      const url = `/api/avisos-contas-pagar?empresa_id=${empresaId}&_t=${timestamp}&_r=${randomId}`;
      
      console.log('[FinanceiroAlertsBanner] Carregando configurações:', url, 'usuarioId:', usuarioId);
      
      const response = await fetch(url, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        const todasConfigs = data.configs || [];
        console.log('[FinanceiroAlertsBanner] Todas as configurações recebidas:', todasConfigs.length);
        
        // Filtrar configurações que se aplicam ao usuário atual
        // IMPORTANTE: Só incluir configurações ativas E que o usuário tem permissão para ver
        let configsFiltradas = todasConfigs.filter((config: ConfigAvisoContasPagar) => {
          // Primeiro verificar se está ativa
          if (!config.ativo) {
            console.log('[FinanceiroAlertsBanner] Configuração desativada ignorada:', config.tipo_alerta);
            return false;
          }
          
          // Verificar se o usuário pode ver esta configuração
          if (usuarioId) {
            if (config.exibir_para_todos) {
              console.log('[FinanceiroAlertsBanner] Configuração "para todos" incluída:', config.tipo_alerta);
              return true;
            }
            const usuarioEstaNaLista = Array.isArray(config.usuarios_ids) && config.usuarios_ids.includes(usuarioId);
            if (usuarioEstaNaLista) {
              console.log('[FinanceiroAlertsBanner] Usuário está na lista, incluindo:', config.tipo_alerta);
              return true;
            }
            console.log('[FinanceiroAlertsBanner] Usuário NÃO está na lista, excluindo:', config.tipo_alerta);
            return false;
          } else {
            // Se não há usuarioId, mostrar apenas avisos "para todos"
            const mostrar = config.exibir_para_todos;
            if (!mostrar) {
              console.log('[FinanceiroAlertsBanner] Sem usuarioId e não é "para todos", excluindo:', config.tipo_alerta);
            }
            return mostrar;
          }
        });
        
        console.log('[FinanceiroAlertsBanner] Configurações filtradas (ativas e aplicáveis ao usuário):', configsFiltradas.length);
        console.log('[FinanceiroAlertsBanner] Atualizando estado das configurações:', configsFiltradas.map(c => ({ 
          tipo: c.tipo_alerta, 
          titulo: c.titulo, 
          cor_fundo: c.cor_fundo,
          ativo: c.ativo,
          exibir_para_todos: c.exibir_para_todos,
          usuarios_ids: c.usuarios_ids
        })));
        
        // Forçar atualização do estado mesmo que os dados pareçam iguais
        setConfigs([...configsFiltradas]);
        setConfigsCarregadas(true); // Marcar que já carregou
      } else {
        // Se a API falhar, deixar vazio (não usar valores padrão se há configurações no banco)
        console.warn('[FinanceiroAlertsBanner] Erro ao carregar configurações:', response.status);
        setConfigs([]);
        setConfigsCarregadas(true); // Marcar como carregado mesmo com erro
      }
    } catch (error) {
      // Se houver erro, deixar vazio (não usar valores padrão se há configurações no banco)
      console.error('[FinanceiroAlertsBanner] Erro ao carregar configurações:', error);
      setConfigs([]);
      setConfigsCarregadas(true); // Marcar como carregado mesmo com erro
    } finally {
      setLoadingConfigs(false); // Sempre desativar loading
    }
  }, [empresaId, usuarioId]);

  useEffect(() => {
    carregarContas();
    carregarConfigs();

    if (!empresaId) {
      return;
    }

    // Escutar evento de atualização de configurações
    const handleConfigAtualizada = () => {
      console.log('[FinanceiroAlertsBanner] Evento de atualização recebido, recarregando configurações...');
      // Aguardar um pouco para garantir que o banco foi atualizado
      setTimeout(() => {
        carregarConfigs();
      }, 500);
    };
    
    window.addEventListener('configAvisosContasPagarAtualizada', handleConfigAtualizada);
    
    // Também escutar eventos de atualização de avisos do sistema (caso alguém edite de outra forma)
    const handleAvisosAtualizados = () => {
      console.log('[FinanceiroAlertsBanner] Avisos atualizados, recarregando configurações...');
      setTimeout(() => {
        carregarConfigs();
      }, 500);
    };
    
    window.addEventListener('avisosAtualizados', handleAvisosAtualizados);

    const interval = setInterval(() => {
      carregarContas();
      carregarConfigs();
    }, 5 * 60 * 1000);

    return () => {
      clearInterval(interval);
      window.removeEventListener('configAvisosContasPagarAtualizada', handleConfigAtualizada);
      window.removeEventListener('avisosAtualizados', handleAvisosAtualizados);
    };
  }, [carregarContas, carregarConfigs, empresaId]);

  const alertCards = useMemo(() => {
    console.log('[FinanceiroAlertsBanner] Recalculando cards:', { 
      contasCount: contas.length, 
      configsCount: configs.length,
      configsCarregadas,
      loadingConfigs,
      configs: configs.map(c => ({ tipo: c.tipo_alerta, ativo: c.ativo, titulo: c.titulo }))
    });
    return montarCards(contas, configs, configsCarregadas);
  }, [contas, configs, configsCarregadas]);

  if (alertCards.length === 0) {
    return null;
  }

  return (
    <div className="w-full space-y-2.5">
      {alertCards.map((card) => {
        const gradient = `linear-gradient(120deg, rgba(255,255,255,0.95) 0%, ${hexToRgba(card.corFundo, 0.85)} 100%)`;
        const borderColor = hexToRgba(card.corTexto, 0.16);
        const shadowColor = hexToRgba(card.corTexto, 0.28);
        const mutedColor = hexToRgba(card.corTexto, 0.68);
        const chipBackground = hexToRgba(card.corTexto, 0.12);

        const handleContaClick = (contaId: string, dataISO?: string | null) => {
          const params = new URLSearchParams();
          params.set('focus', contaId);
          if (dataISO) {
            params.set('mes', dataISO.substring(0, 7));
          }
          router.push(`/financeiro/contas-a-pagar?${params.toString()}`);
        };

        return (
          <div
            key={card.id}
            className="relative flex w-full flex-col gap-4 overflow-hidden rounded-2xl border backdrop-blur-md shadow-lg animate-fade-in md:flex-row md:items-center md:justify-between"
            style={{
              background: gradient,
              borderColor,
              boxShadow: `0 22px 36px -22px ${shadowColor}`,
              color: card.corTexto,
            }}
          >
            <span
              className="pointer-events-none absolute inset-y-[-45%] right-[-30%] w-1/2 rounded-full opacity-60 blur-3xl"
              style={{
                background: `radial-gradient(circle at center, ${hexToRgba(card.corTexto, 0.3)} 0%, transparent 70%)`,
              }}
            />

            <div className="relative flex flex-1 items-center gap-3 px-4 py-4 md:px-5">
              <div
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white/70 text-lg font-semibold shadow-inner ring-1 ring-white/70"
                style={{ color: card.corTexto }}
              >
                {isValidElement(card.icon)
                  ? cloneElement(card.icon as ReactElement<any>, { className: 'h-5 w-5' } as any)
                  : card.icon}
              </div>
              <div className="min-w-0 space-y-0.5">
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className="text-[10px] font-semibold uppercase tracking-[0.28em]"
                    style={{ color: mutedColor }}
                  >
                    Alerta financeiro
                  </span>
                  {card.restante && (
                    <span
                      className="rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider"
                      style={{
                        backgroundColor: chipBackground,
                        color: card.corTexto,
                      }}
                    >
                      {card.restante}
                    </span>
                  )}
                </div>
                <h4 className="text-base font-semibold leading-tight tracking-tight">{card.titulo}</h4>
                <p className="text-xs leading-relaxed md:text-sm" style={{ color: mutedColor }}>
                  {card.descricao}
                </p>
              </div>
            </div>

            <div
              className="relative flex w-full flex-1 gap-2 overflow-x-auto border-t border-white/40 px-4 pb-4 scrollbar-thin scrollbar-thumb-white/60 scrollbar-track-transparent hover:scrollbar-thumb-white/80 md:border-l md:border-t-0 md:px-5 md:py-4"
              style={{ WebkitOverflowScrolling: 'touch' }}
            >
              {card.itens.map((item, index) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleContaClick(item.id, item.dataISO)}
                  className="group flex min-w-[220px] shrink-0 items-center justify-between gap-3 rounded-xl border bg-white/70 px-4 py-2.5 text-left shadow-sm backdrop-blur-[4px] transition-transform hover:-translate-y-[2px] hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
                  style={{
                    borderColor: hexToRgba(card.corTexto, 0.12),
                    boxShadow: `0 12px 20px -16px ${shadowColor}`,
                  }}
                >
                  <div className="flex items-center gap-3">
                    <span
                      className="flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold transition-colors group-hover:scale-105"
                      style={{
                        backgroundColor: chipBackground,
                        color: card.corTexto,
                      }}
                    >
                      {String(index + 1).padStart(2, '0')}
                    </span>
                    <span className="truncate text-sm font-semibold leading-snug" style={{ color: card.corTexto }}>
                      {item.titulo}
                    </span>
                  </div>
                  <div className="flex flex-col text-right">
                    <span className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: card.corTexto }}>
                      {item.dataFormatada}
                    </span>
                    <span className="text-xs font-medium" style={{ color: mutedColor }}>
                      {item.descricaoDias}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        );
      })}
      <style>{`
        @keyframes fade-in {
          from {
            opacity: 0;
            transform: translateY(-8px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fade-in {
          animation: fade-in 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}

