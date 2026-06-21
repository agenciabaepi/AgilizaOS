'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  FiArrowDownRight,
  FiArrowUpRight,
  FiClock,
  FiDollarSign,
  FiFileText,
  FiLayers,
  FiTrendingUp,
  FiUsers,
} from 'react-icons/fi';
import DashboardCard from '@/components/ui/DashboardCard';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/context/AuthContext';
import { cn } from '@/lib/utils';
import { getStatusTecnicoLabel } from '@/utils/statusLabels';

const CHART_COLORS = [
  '#3b82f6',
  '#22c55e',
  '#f59e0b',
  '#ef4444',
  '#8b5cf6',
  '#06b6d4',
  '#ec4899',
  '#64748b',
];

const brl = (n: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(n || 0);

const norm = (v: string | undefined | null) => (v || '').toUpperCase().trim().replace(/_/g, ' ');

function startEndOfMonth(d: Date) {
  const y = d.getFullYear();
  const m = d.getMonth();
  return {
    start: new Date(y, m, 1, 0, 0, 0, 0),
    end: new Date(y, m + 1, 0, 23, 59, 59, 999),
  };
}

function sameCalendarPeriodPrevMonth(now: Date) {
  const y = now.getFullYear();
  const m = now.getMonth();
  const day = now.getDate();
  const curStart = new Date(y, m, 1, 0, 0, 0, 0);
  const curEnd = new Date(y, m, day, 23, 59, 59, 999);
  const pm = m === 0 ? 11 : m - 1;
  const py = m === 0 ? y - 1 : y;
  const dimPrev = new Date(py, pm + 1, 0).getDate();
  const d2 = Math.min(day, dimPrev);
  return {
    curStart,
    curEnd,
    prevStart: new Date(py, pm, 1, 0, 0, 0, 0),
    prevEnd: new Date(py, pm, d2, 23, 59, 59, 999),
  };
}

function parseDayKey(createdAt: string) {
  return (createdAt || '').toString().split('T')[0] || '';
}

type OsRow = {
  id: string;
  numero_os: string;
  status: string | null;
  status_tecnico: string | null;
  valor_faturado: number | null;
  created_at: string;
  data_entrega: string | null;
  servico: string | null;
  cliente_id: string | null;
  clientes: { nome: string; telefone?: string | null } | null;
};

type ClienteRow = {
  id: string;
  nome: string;
  telefone: string | null;
  created_at: string;
};

function isOsAberta(status: string | null, statusTecnico: string | null): boolean {
  const s = norm(status);
  const st = norm(statusTecnico);
  if (s.includes('CONCLUID') || s.includes('ENTREGUE') || s.includes('CANCELAD')) return false;
  if (st.includes('ENTREGUE') || st.includes('SEM REPARO')) return false;
  return true;
}

function isAguardandoAprovacao(statusTecnico: string | null): boolean {
  const st = norm(statusTecnico);
  return st.includes('ORCAMENTO CONCLUIDO') || st.includes('AGUARDANDO APROVACAO');
}

function isLaudoPronto(statusTecnico: string | null, laudo?: string | null): boolean {
  const st = norm(statusTecnico);
  return st.includes('LAUDO PRONTO') || Boolean(laudo && laudo.trim());
}

export default function DashboardAtendenteOverview() {
  const { user, usuarioData, empresaData } = useAuth();
  const empresaId = empresaData?.id;
  const atendenteIds = useMemo(
    () => [...new Set([user?.id, usuarioData?.id].filter(Boolean))] as string[],
    [user?.id, usuarioData?.id]
  );

  const [loading, setLoading] = useState(true);
  const [osNoMes, setOsNoMes] = useState(0);
  const [osHoje, setOsHoje] = useState(0);
  const [osAbertas, setOsAbertas] = useState(0);
  const [faturamentoMes, setFaturamentoMes] = useState(0);
  const [ticketMedio, setTicketMedio] = useState(0);
  const [clientesTotal, setClientesTotal] = useState(0);
  const [clientesNovosMes, setClientesNovosMes] = useState(0);
  const [osMesAtualPeriodo, setOsMesAtualPeriodo] = useState(0);
  const [osMesAnteriorPeriodo, setOsMesAnteriorPeriodo] = useState(0);
  const [tempoMedioDias, setTempoMedioDias] = useState(0);
  const [porStatus, setPorStatus] = useState<Array<{ name: string; value: number }>>([]);
  const [osPorDia, setOsPorDia] = useState<Array<{ dia: string; total: number; label: string }>>([]);
  const [ultimasOs, setUltimasOs] = useState<OsRow[]>([]);
  const [aguardandoAprovacao, setAguardandoAprovacao] = useState<OsRow[]>([]);
  const [laudosProntos, setLaudosProntos] = useState<OsRow[]>([]);
  const [clientesRecentes, setClientesRecentes] = useState<ClienteRow[]>([]);

  const refLabel = useMemo(() => format(new Date(), "MMMM yyyy", { locale: ptBR }), []);
  const deltaOs = osMesAtualPeriodo - osMesAnteriorPeriodo;
  const deltaPositive = deltaOs >= 0;

  const load = useCallback(async () => {
    if (!empresaId || atendenteIds.length === 0) {
      setLoading(false);
      return;
    }

    setLoading(true);
    const now = new Date();
    const { start: inicioMes, end: fimMes } = startEndOfMonth(now);
    const { curStart, curEnd, prevStart, prevEnd } = sameCalendarPeriodPrevMonth(now);
    const hojeInicio = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    const orAtendente = atendenteIds.map((id) => `atendente_id.eq.${id}`).join(',');

    try {
      const [ordensRes, ordensPeriodoRes, clientesRes, pendenciasRes] = await Promise.all([
        supabase
          .from('ordens_servico')
          .select(`
            id,
            numero_os,
            status,
            status_tecnico,
            valor_faturado,
            created_at,
            data_entrega,
            servico,
            laudo,
            cliente_id,
            atendente_id
          `)
          .eq('empresa_id', empresaId)
          .or(orAtendente)
          .order('created_at', { ascending: false }),
        supabase
          .from('ordens_servico')
          .select('id, created_at')
          .eq('empresa_id', empresaId)
          .or(orAtendente)
          .gte('created_at', prevStart.toISOString())
          .lte('created_at', curEnd.toISOString()),
        supabase
          .from('clientes')
          .select('id, nome, telefone, created_at')
          .eq('empresa_id', empresaId)
          .or(orAtendente)
          .order('created_at', { ascending: false }),
        supabase
          .from('ordens_servico')
          .select(`
            id,
            numero_os,
            status,
            status_tecnico,
            valor_faturado,
            created_at,
            data_entrega,
            servico,
            laudo,
            cliente_id,
            atendente_id
          `)
          .eq('empresa_id', empresaId)
          .or(orAtendente)
          .in('status_tecnico', [
            'ORÇAMENTO CONCLUÍDO',
            'AGUARDANDO APROVAÇÃO',
            'LAUDO PRONTO',
          ])
          .order('created_at', { ascending: false })
          .limit(20),
      ]);

      if (ordensRes.error) throw ordensRes.error;

      let ordens = (ordensRes.data || []) as OsRow[];
      const clienteIds = [...new Set(ordens.map((o) => o.cliente_id).filter(Boolean))] as string[];

      if (clienteIds.length > 0) {
        const { data: clientesData } = await supabase
          .from('clientes')
          .select('id, nome, telefone')
          .in('id', clienteIds);

        if (clientesData) {
          const map = new Map(clientesData.map((c) => [c.id, c]));
          ordens = ordens.map((os) => ({
            ...os,
            clientes: os.cliente_id ? map.get(os.cliente_id) || null : null,
          }));
        }
      }

      const ordensMes = ordens.filter((o) => {
        const t = new Date(o.created_at).getTime();
        return t >= inicioMes.getTime() && t <= fimMes.getTime();
      });

      setOsNoMes(ordensMes.length);
      setOsHoje(
        ordens.filter((o) => new Date(o.created_at).getTime() >= hojeInicio.getTime()).length
      );
      setOsAbertas(ordens.filter((o) => isOsAberta(o.status, o.status_tecnico)).length);

      const faturadas = ordensMes.filter((o) => Number(o.valor_faturado) > 0);
      const fat = faturadas.reduce((s, o) => s + Number(o.valor_faturado || 0), 0);
      setFaturamentoMes(fat);
      setTicketMedio(
        faturadas.length > 0 ? fat / faturadas.length : 0
      );

      const concluidasComEntrega = ordens.filter(
        (o) => o.data_entrega && new Date(o.data_entrega).getTime() > new Date(o.created_at).getTime()
      );
      if (concluidasComEntrega.length > 0) {
        const mediaMs =
          concluidasComEntrega.reduce((s, o) => {
            return s + (new Date(o.data_entrega!).getTime() - new Date(o.created_at).getTime());
          }, 0) / concluidasComEntrega.length;
        setTempoMedioDias(Math.round(mediaMs / (1000 * 60 * 60 * 24)));
      } else {
        setTempoMedioDias(0);
      }

      const periodoRows = ordensPeriodoRes.data || [];
      setOsMesAtualPeriodo(
        periodoRows.filter((r: { created_at: string }) => {
          const t = new Date(r.created_at).getTime();
          return t >= curStart.getTime() && t <= curEnd.getTime();
        }).length
      );
      setOsMesAnteriorPeriodo(
        periodoRows.filter((r: { created_at: string }) => {
          const t = new Date(r.created_at).getTime();
          return t >= prevStart.getTime() && t <= prevEnd.getTime();
        }).length
      );

      const statusCount = new Map<string, number>();
      ordens.forEach((row) => {
        const label = getStatusTecnicoLabel(row.status, row.status_tecnico);
        statusCount.set(label, (statusCount.get(label) || 0) + 1);
      });
      setPorStatus(
        Array.from(statusCount.entries())
          .map(([name, value]) => ({ name, value }))
          .sort((a, b) => b.value - a.value)
          .slice(0, 8)
      );

      const diasNoMes = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
      const perDay = new Map<string, number>();
      for (let d = 1; d <= diasNoMes; d++) {
        const key = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        perDay.set(key, 0);
      }
      ordensMes.forEach((row) => {
        const k = parseDayKey(row.created_at);
        if (perDay.has(k)) perDay.set(k, (perDay.get(k) || 0) + 1);
      });
      setOsPorDia(
        Array.from(perDay.entries()).map(([dia, total]) => ({
          dia,
          total,
          label: format(new Date(dia + 'T12:00:00'), 'dd/MM', { locale: ptBR }),
        }))
      );

      setUltimasOs(ordens.slice(0, 8));

      const pendencias = (pendenciasRes.data || []) as (OsRow & { laudo?: string | null })[];
      const pendClienteIds = [...new Set(pendencias.map((o) => o.cliente_id).filter(Boolean))] as string[];
      if (pendClienteIds.length > 0) {
        const { data: pendClientes } = await supabase
          .from('clientes')
          .select('id, nome, telefone')
          .in('id', pendClienteIds);
        if (pendClientes) {
          const map = new Map(pendClientes.map((c) => [c.id, c]));
          pendencias.forEach((os) => {
            os.clientes = os.cliente_id ? map.get(os.cliente_id) || null : null;
          });
        }
      }

      setAguardandoAprovacao(
        pendencias.filter((o) => isAguardandoAprovacao(o.status_tecnico)).slice(0, 6)
      );
      setLaudosProntos(
        pendencias.filter((o) => isLaudoPronto(o.status_tecnico, o.laudo)).slice(0, 6)
      );

      const clientes = (clientesRes.data || []) as ClienteRow[];
      setClientesTotal(clientes.length);
      setClientesNovosMes(
        clientes.filter((c) => {
          const t = new Date(c.created_at).getTime();
          return t >= inicioMes.getTime() && t <= fimMes.getTime();
        }).length
      );
      setClientesRecentes(clientes.slice(0, 6));
    } catch (err) {
      console.error('[Dashboard Atendente]', err);
    } finally {
      setLoading(false);
    }
  }, [empresaId, atendenteIds]);

  useEffect(() => {
    void load();
  }, [load]);

  const pieData = porStatus.filter((s) => s.value > 0);
  const barData = porStatus.slice(0, 6);

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-2">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-zinc-900 dark:text-zinc-100">
            Meu painel
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
            Olá, {usuarioData?.nome || 'Atendente'} · {refLabel}
          </p>
        </div>
        <button
          type="button"
          onClick={() => void load()}
          disabled={loading}
          className="text-xs font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 disabled:opacity-50"
        >
          {loading ? 'Atualizando…' : 'Atualizar dados'}
        </button>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <div key={i} className="h-24 rounded-xl bg-zinc-100 dark:bg-zinc-800 animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
          <DashboardCard
            title="O.S. no mês"
            value={osNoMes}
            description="Ordens abertas por você"
            descriptionColorClass="text-zinc-500 dark:text-zinc-400"
            icon={<FiFileText className="w-5 h-5 text-blue-600 dark:text-blue-400" />}
            svgPolyline={{ color: '#3b82f6', points: '0,14 15,10 30,12 45,8 60,10' }}
          />
          <DashboardCard
            title="O.S. hoje"
            value={osHoje}
            description={`${osAbertas} em aberto no total`}
            descriptionColorClass="text-zinc-500 dark:text-zinc-400"
            icon={<FiClock className="w-5 h-5 text-amber-600 dark:text-amber-400" />}
            svgPolyline={{ color: '#f59e0b', points: '0,16 12,12 24,14 36,8 48,10 60,6' }}
          />
          <DashboardCard
            title="Faturamento (mês)"
            value={brl(faturamentoMes)}
            description={`Ticket médio: ${brl(ticketMedio)}`}
            descriptionColorClass="text-zinc-500 dark:text-zinc-400"
            icon={<FiDollarSign className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />}
            svgPolyline={{ color: '#22c55e', points: '0,18 12,12 24,14 36,8 48,10 60,6' }}
          />
          <DashboardCard
            title="Clientes"
            value={clientesTotal}
            description={`+${clientesNovosMes} cadastrados no mês`}
            descriptionColorClass="text-zinc-500 dark:text-zinc-400"
            icon={<FiUsers className="w-5 h-5 text-violet-600 dark:text-violet-400" />}
            svgPolyline={{ color: '#8b5cf6', points: '0,14 15,10 30,12 45,8 60,10' }}
          />
          <DashboardCard
            title="vs. mês anterior"
            value={
              <span className="flex items-center gap-2 flex-wrap text-xl md:text-2xl">
                <span>
                  {deltaPositive ? '+' : ''}
                  {deltaOs}
                </span>
                <span
                  className={cn(
                    'inline-flex items-center gap-0.5 text-xs font-medium rounded-full px-2 py-0.5',
                    deltaPositive
                      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300'
                      : 'bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300'
                  )}
                >
                  {deltaPositive ? <FiArrowUpRight className="w-3 h-3" /> : <FiArrowDownRight className="w-3 h-3" />}
                  O.S.
                </span>
              </span>
            }
            description={`Período: ${osMesAtualPeriodo} · Anterior: ${osMesAnteriorPeriodo}`}
            descriptionColorClass="text-zinc-500 dark:text-zinc-400"
            icon={<FiTrendingUp className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />}
          />
          <DashboardCard
            title="Em aberto"
            value={osAbertas}
            description="Aguardando conclusão"
            descriptionColorClass="text-zinc-500 dark:text-zinc-400"
            icon={<FiLayers className="w-5 h-5 text-orange-600 dark:text-orange-400" />}
          />
          <DashboardCard
            title="Orçamentos pendentes"
            value={aguardandoAprovacao.length}
            description="Aguardando resposta do cliente"
            descriptionColorClass="text-zinc-500 dark:text-zinc-400"
            icon={<FiFileText className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />}
          />
          <DashboardCard
            title="Tempo médio"
            value={tempoMedioDias > 0 ? `${tempoMedioDias} dias` : '—'}
            description="Da abertura até a entrega"
            descriptionColorClass="text-zinc-500 dark:text-zinc-400"
            icon={<FiClock className="w-5 h-5 text-slate-600 dark:text-slate-400" />}
          />
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 md:gap-6">
        <section className="rounded-2xl border border-zinc-200 dark:border-zinc-700 bg-gradient-to-b from-white to-zinc-50/80 dark:from-zinc-800 dark:to-zinc-900/40 p-4 md:p-6 shadow-sm">
          <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100 mb-1">
            O.S. por dia (mês atual)
          </h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-4">
            Volume das suas ordens abertas por dia.
          </p>
          <div className="h-[280px] w-full">
            {loading ? (
              <div className="h-full rounded-xl bg-zinc-100 dark:bg-zinc-700/40 animate-pulse" />
            ) : osPorDia.every((d) => d.total === 0) ? (
              <div className="h-full flex items-center justify-center text-sm text-zinc-500">
                Nenhuma O.S. registrada neste mês.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={osPorDia} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
                  <defs>
                    <linearGradient id="atendArea" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.35} />
                      <stop offset="100%" stopColor="#3b82f6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgb(228 228 231)" />
                  <XAxis dataKey="label" tick={{ fontSize: 10, fill: 'rgb(113 113 122)' }} interval="preserveStartEnd" minTickGap={24} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: 'rgb(113 113 122)' }} width={28} />
                  <Tooltip
                    contentStyle={{ borderRadius: 12, border: '1px solid rgb(228 228 231)' }}
                    formatter={(value: number) => [`${value}`, 'O.S.']}
                    labelFormatter={(_, p) => {
                      const pl = p?.[0]?.payload as { dia?: string } | undefined;
                      return pl?.dia ? format(new Date(pl.dia + 'T12:00:00'), 'dd/MM/yyyy', { locale: ptBR }) : '';
                    }}
                  />
                  <Area type="monotone" dataKey="total" stroke="#2563eb" strokeWidth={2} fill="url(#atendArea)" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </section>

        <section className="rounded-2xl border border-zinc-200 dark:border-zinc-700 bg-gradient-to-b from-white to-zinc-50/80 dark:from-zinc-800 dark:to-zinc-900/40 p-4 md:p-6 shadow-sm">
          <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100 mb-1">
            Status das suas O.S.
          </h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-4">
            Distribuição por situação atual.
          </p>
          <div className="h-[280px] w-full">
            {loading ? (
              <div className="h-full rounded-xl bg-zinc-100 dark:bg-zinc-700/40 animate-pulse" />
            ) : pieData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-sm text-zinc-500">
                Sem ordens vinculadas a você.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={88}
                    paddingAngle={2}
                    stroke="none"
                  >
                    {pieData.map((_, i) => (
                      <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ borderRadius: 12, border: '1px solid rgb(228 228 231)' }}
                    formatter={(value: number) => [`${value} O.S.`, 'Quantidade']}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
          {!loading && pieData.length > 0 && (
            <div className="flex flex-wrap gap-2 justify-center mt-2">
              {pieData.map((c, i) => (
                <span key={c.name} className="inline-flex items-center gap-1.5 text-[11px] text-zinc-600 dark:text-zinc-300">
                  <span className="w-2 h-2 rounded-full" style={{ background: CHART_COLORS[i % CHART_COLORS.length] }} />
                  {c.name} ({c.value})
                </span>
              ))}
            </div>
          )}
        </section>
      </div>

      {!loading && barData.length > 0 && (
        <section className="rounded-2xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800/80 p-4 md:p-6 shadow-sm">
          <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100 mb-1">
            Ranking por status
          </h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-4">
            Principais situações das suas ordens de serviço.
          </p>
          <div className="h-[220px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barData} layout="vertical" margin={{ top: 0, right: 16, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="rgb(228 228 231)" />
                <XAxis type="number" allowDecimals={false} tick={{ fontSize: 10 }} />
                <YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 11 }} />
                <Tooltip formatter={(value: number) => [`${value}`, 'O.S.']} />
                <Bar dataKey="value" radius={[0, 6, 6, 0]}>
                  {barData.map((_, i) => (
                    <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 md:gap-6">
        <section className="rounded-2xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800/80 p-4 md:p-5 shadow-sm">
          <div className="flex items-center justify-between gap-2 mb-4">
            <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">Últimas O.S.</h2>
            <Link href="/ordens" className="text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline">
              Ver todas →
            </Link>
          </div>
          {loading ? (
            <div className="space-y-2">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-12 rounded-lg bg-zinc-100 dark:bg-zinc-700/60 animate-pulse" />
              ))}
            </div>
          ) : ultimasOs.length === 0 ? (
            <p className="text-sm text-zinc-500">Nenhuma ordem vinculada ao seu usuário ainda.</p>
          ) : (
            <ul className="divide-y divide-zinc-100 dark:divide-zinc-700">
              {ultimasOs.map((os) => (
                <li key={os.id}>
                  <Link
                    href={`/ordens/${os.id}`}
                    className="flex items-center justify-between gap-3 py-3 hover:bg-zinc-50 dark:hover:bg-zinc-700/30 -mx-2 px-2 rounded-lg transition-colors"
                  >
                    <div className="min-w-0">
                      <p className="font-medium text-sm text-zinc-900 dark:text-zinc-100">
                        OS #{os.numero_os}
                      </p>
                      <p className="text-xs text-zinc-500 truncate">
                        {os.clientes?.nome || 'Cliente não informado'}
                      </p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <span className="inline-block text-[11px] font-medium px-2 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300">
                        {getStatusTecnicoLabel(os.status, os.status_tecnico)}
                      </span>
                      <p className="text-[10px] text-zinc-400 mt-1">
                        {format(new Date(os.created_at), 'dd/MM/yyyy', { locale: ptBR })}
                      </p>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-2xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800/80 p-4 md:p-5 shadow-sm">
          <div className="flex items-center justify-between gap-2 mb-4">
            <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">Clientes recentes</h2>
            <Link href="/clientes" className="text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline">
              Ver todos →
            </Link>
          </div>
          {loading ? (
            <div className="space-y-2">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-12 rounded-lg bg-zinc-100 dark:bg-zinc-700/60 animate-pulse" />
              ))}
            </div>
          ) : clientesRecentes.length === 0 ? (
            <p className="text-sm text-zinc-500">Nenhum cliente cadastrado por você.</p>
          ) : (
            <ul className="divide-y divide-zinc-100 dark:divide-zinc-700">
              {clientesRecentes.map((c) => (
                <li key={c.id}>
                  <Link
                    href={`/clientes/${c.id}`}
                    className="flex items-center justify-between gap-3 py-3 hover:bg-zinc-50 dark:hover:bg-zinc-700/30 -mx-2 px-2 rounded-lg transition-colors"
                  >
                    <div>
                      <p className="font-medium text-sm text-zinc-900 dark:text-zinc-100">{c.nome}</p>
                      <p className="text-xs text-zinc-500">{c.telefone || 'Sem telefone'}</p>
                    </div>
                    <p className="text-[10px] text-zinc-400">
                      {format(new Date(c.created_at), 'dd/MM/yyyy', { locale: ptBR })}
                    </p>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      {(aguardandoAprovacao.length > 0 || laudosProntos.length > 0) && (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 md:gap-6">
          {aguardandoAprovacao.length > 0 && (
            <section className="rounded-2xl border border-blue-200 dark:border-blue-900/50 bg-blue-50/50 dark:bg-blue-950/20 p-4 md:p-5">
              <h2 className="text-base font-semibold text-blue-900 dark:text-blue-200 mb-3">
                Orçamentos aguardando aprovação ({aguardandoAprovacao.length})
              </h2>
              <ul className="space-y-2">
                {aguardandoAprovacao.map((os) => (
                  <li key={os.id}>
                    <Link
                      href={`/ordens/${os.id}`}
                      className="flex items-center justify-between gap-2 p-3 bg-white dark:bg-zinc-900 rounded-lg border border-blue-100 dark:border-blue-900/40 hover:shadow-sm transition-shadow"
                    >
                      <div className="min-w-0">
                        <p className="font-medium text-sm">OS #{os.numero_os}</p>
                        <p className="text-xs text-zinc-500 truncate">{os.clientes?.nome}</p>
                      </div>
                      <span className="text-xs font-medium text-blue-700 dark:text-blue-300 flex-shrink-0">
                        Contatar →
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {laudosProntos.length > 0 && (
            <section className="rounded-2xl border border-emerald-200 dark:border-emerald-900/50 bg-emerald-50/50 dark:bg-emerald-950/20 p-4 md:p-5">
              <h2 className="text-base font-semibold text-emerald-900 dark:text-emerald-200 mb-3">
                Laudos prontos ({laudosProntos.length})
              </h2>
              <ul className="space-y-2">
                {laudosProntos.map((os) => (
                  <li key={os.id}>
                    <Link
                      href={`/ordens/${os.id}`}
                      className="flex items-center justify-between gap-2 p-3 bg-white dark:bg-zinc-900 rounded-lg border border-emerald-100 dark:border-emerald-900/40 hover:shadow-sm transition-shadow"
                    >
                      <div className="min-w-0">
                        <p className="font-medium text-sm">OS #{os.numero_os}</p>
                        <p className="text-xs text-zinc-500 truncate">{os.clientes?.nome}</p>
                      </div>
                      <span className="text-xs font-medium text-emerald-700 dark:text-emerald-300 flex-shrink-0">
                        Ver laudo →
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
