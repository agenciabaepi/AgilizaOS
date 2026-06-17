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
import { useTheme } from '@/context/ThemeContext';
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

const parseHexColor = (hex: string | undefined) => {
  if (!hex) return null;

  let sanitized = hex.replace('#', '');
  if (sanitized.length === 3) {
    sanitized = sanitized
      .split('')
      .map((char) => char + char)
      .join('');
  }

  if (sanitized.length !== 6) return null;

  return {
    r: parseInt(sanitized.slice(0, 2), 16),
    g: parseInt(sanitized.slice(2, 4), 16),
    b: parseInt(sanitized.slice(4, 6), 16),
  };
};

const hexToRgba = (hex: string | undefined, alpha: number) => {
  const rgb = parseHexColor(hex);
  if (!rgb) return `rgba(0, 0, 0, ${alpha})`;
  return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha})`;
};

const mixHexColors = (hexA: string, hexB: string, weightB: number) => {
  const a = parseHexColor(hexA);
  const b = parseHexColor(hexB);
  if (!a || !b) return hexA;

  const w = Math.min(1, Math.max(0, weightB));
  const mix = (c1: number, c2: number) => Math.round(c1 * (1 - w) + c2 * w);
  const r = mix(a.r, b.r);
  const g = mix(a.g, b.g);
  const bl = mix(a.b, b.b);

  return `#${[r, g, bl].map((v) => v.toString(16).padStart(2, '0')).join('')}`;
};

interface BannerTheme {
  fundo: string;
  border: string;
  shadow: string;
  texto: string;
  muted: string;
  chipBg: string;
  iconBg: string;
  iconRing: string;
  itemBg: string;
  itemHoverBg: string;
  itemBorder: string;
  itemMuted: string;
}

const DARK_THEMES: Record<string, BannerTheme> = {
  'contas-vencidas': {
    fundo: 'rgba(69, 10, 10, 0.92)',
    border: 'rgba(252, 165, 165, 0.55)',
    shadow: 'rgba(127, 29, 29, 0.45)',
    texto: '#fecaca',
    muted: '#fca5a5',
    chipBg: 'rgba(153, 27, 27, 0.75)',
    iconBg: 'rgba(127, 29, 29, 0.85)',
    iconRing: 'rgba(252, 165, 165, 0.45)',
    itemBg: 'rgba(24, 24, 27, 0.92)',
    itemHoverBg: 'rgba(39, 39, 42, 0.95)',
    itemBorder: 'rgba(252, 165, 165, 0.35)',
    itemMuted: '#fdba74',
  },
  'contas-proximas': {
    fundo: 'rgba(69, 26, 3, 0.92)',
    border: 'rgba(252, 211, 77, 0.55)',
    shadow: 'rgba(120, 53, 15, 0.45)',
    texto: '#fde68a',
    muted: '#fcd34d',
    chipBg: 'rgba(146, 64, 14, 0.75)',
    iconBg: 'rgba(120, 53, 15, 0.85)',
    iconRing: 'rgba(252, 211, 77, 0.45)',
    itemBg: 'rgba(24, 24, 27, 0.92)',
    itemHoverBg: 'rgba(39, 39, 42, 0.95)',
    itemBorder: 'rgba(252, 211, 77, 0.35)',
    itemMuted: '#fbbf24',
  },
};

const resolveBannerTheme = (card: AlertCard, isDark: boolean): BannerTheme => {
  if (isDark) {
    const preset = DARK_THEMES[card.id];
    if (preset) return preset;

    const accent = card.corTexto;
    return {
      fundo: hexToRgba(accent, 0.35),
      border: hexToRgba(mixHexColors(accent, '#FFFFFF', 0.65), 0.55),
      shadow: hexToRgba(accent, 0.35),
      texto: mixHexColors(accent, '#FFFFFF', 0.82),
      muted: mixHexColors(accent, '#E4E4E7', 0.68),
      chipBg: hexToRgba(accent, 0.45),
      iconBg: hexToRgba(accent, 0.4),
      iconRing: hexToRgba(mixHexColors(accent, '#FFFFFF', 0.65), 0.45),
      itemBg: 'rgba(24, 24, 27, 0.92)',
      itemHoverBg: 'rgba(39, 39, 42, 0.95)',
      itemBorder: hexToRgba(mixHexColors(accent, '#FFFFFF', 0.65), 0.35),
      itemMuted: mixHexColors(accent, '#E4E4E7', 0.55),
    };
  }

  return {
    fundo: hexToRgba(card.corFundo, 0.38),
    border: hexToRgba(card.corTexto, 0.14),
    shadow: hexToRgba(card.corTexto, 0.18),
    texto: card.corTexto,
    muted: hexToRgba(card.corTexto, 0.65),
    chipBg: hexToRgba(card.corTexto, 0.1),
    iconBg: 'rgba(255, 255, 255, 0.65)',
    iconRing: 'rgba(255, 255, 255, 0.5)',
    itemBg: 'rgba(255, 255, 255, 0.55)',
    itemHoverBg: 'rgba(255, 255, 255, 0.8)',
    itemBorder: hexToRgba(card.corTexto, 0.1),
    itemMuted: hexToRgba(card.corTexto, 0.65),
  };
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
  const { theme } = useTheme();
  const isDark = theme === 'dark';
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
    <div className="w-full space-y-1.5">
      {alertCards.map((card) => {
        const theme = resolveBannerTheme(card, isDark);

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
            className="relative flex w-full flex-col gap-1.5 overflow-hidden rounded-lg border px-2.5 py-2 shadow-sm animate-fade-in sm:flex-row sm:items-center sm:gap-2 sm:py-1.5 sm:pr-2"
            style={{
              backgroundColor: theme.fundo,
              borderColor: theme.border,
              boxShadow: `0 4px 14px -6px ${theme.shadow}`,
              color: theme.texto,
            }}
          >
            <div className="relative flex min-w-0 flex-1 items-center gap-2">
              <div
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md ring-1"
                style={{
                  color: theme.texto,
                  backgroundColor: theme.iconBg,
                  boxShadow: `inset 0 0 0 1px ${theme.iconRing}`,
                }}
              >
                {isValidElement(card.icon)
                  ? cloneElement(card.icon as ReactElement<any>, { className: 'h-3.5 w-3.5' } as any)
                  : card.icon}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-baseline gap-x-1.5 gap-y-0">
                  <span
                    className="text-[9px] font-semibold uppercase tracking-wider"
                    style={{ color: theme.muted }}
                  >
                    Financeiro
                  </span>
                  <h4 className="text-xs font-semibold leading-snug sm:text-[13px]" style={{ color: theme.texto }}>
                    {card.titulo}
                  </h4>
                  {card.restante && (
                    <span
                      className="rounded px-1 py-0.5 text-[9px] font-medium"
                      style={{
                        backgroundColor: theme.chipBg,
                        color: theme.texto,
                      }}
                    >
                      {card.restante}
                    </span>
                  )}
                </div>
                <p
                  className="line-clamp-1 text-[10px] leading-tight"
                  style={{ color: theme.muted }}
                  title={card.descricao}
                >
                  {card.descricao}
                </p>
              </div>
            </div>

            <div
              className="flex gap-1 overflow-x-auto pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] sm:max-w-[min(100%,52%)] sm:flex-nowrap sm:justify-end sm:pb-0 [&::-webkit-scrollbar]:hidden"
              style={{ WebkitOverflowScrolling: 'touch' }}
            >
              {card.itens.map((item, index) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleContaClick(item.id, item.dataISO)}
                  className="group flex max-w-[min(100%,240px)] shrink-0 items-center gap-1.5 rounded-md border px-2 py-1 text-left text-[11px] leading-tight transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1"
                  style={{
                    backgroundColor: theme.itemBg,
                    borderColor: theme.itemBorder,
                    color: theme.texto,
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = theme.itemHoverBg; }}
                  onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = theme.itemBg; }}
                  title={`${item.titulo} · ${item.dataFormatada} · ${item.descricaoDias}`}
                >
                  <span
                    className="flex h-4 min-w-[1.1rem] items-center justify-center rounded text-[9px] font-bold tabular-nums"
                    style={{
                      backgroundColor: theme.chipBg,
                      color: theme.texto,
                    }}
                  >
                    {index + 1}
                  </span>
                  <span className="min-w-0 flex-1 truncate font-medium" style={{ color: theme.texto }}>
                    {item.titulo}
                  </span>
                  <span className="shrink-0 whitespace-nowrap text-[10px]" style={{ color: theme.texto }}>
                    {item.dataFormatada}
                    <span className="mx-0.5 opacity-60">·</span>
                    <span style={{ color: theme.itemMuted }}>{item.descricaoDias}</span>
                  </span>
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

