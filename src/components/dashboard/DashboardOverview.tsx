'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  Area,
  AreaChart,
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
  FiDollarSign,
  FiFileText,
  FiLayers,
  FiTrendingUp,
} from 'react-icons/fi';
import DashboardCard from '@/components/ui/DashboardCard';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/context/AuthContext';
import { cn } from '@/lib/utils';

const norm = (v: string | undefined) => (v || '').toLowerCase().trim();

const brl = (n: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(n || 0);

const CHART_COLORS = [
  '#84cc16',
  '#22d3ee',
  '#a78bfa',
  '#fb7185',
  '#fbbf24',
  '#38bdf8',
  '#4ade80',
  '#f472b6',
];

function observacoesMatchNumeroOs(obs: string | undefined, numeroOs: string | undefined) {
  const n = String(numeroOs || '').trim();
  if (!n || !obs) return false;
  return (
    obs.includes(`O.S. #${n}`) ||
    obs.includes(`OS #${n}`) ||
    obs.includes(`#${n}`)
  );
}

function startEndOfMonth(d: Date) {
  const y = d.getFullYear();
  const m = d.getMonth();
  const start = new Date(y, m, 1, 0, 0, 0, 0);
  const end = new Date(y, m + 1, 0, 23, 59, 59, 999);
  return { start, end };
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
  const prevStart = new Date(py, pm, 1, 0, 0, 0, 0);
  const prevEnd = new Date(py, pm, d2, 23, 59, 59, 999);
  return { curStart, curEnd, prevStart, prevEnd };
}

function parseDayKey(createdAt: string) {
  const s = (createdAt || '').toString().split('T')[0];
  return s || '';
}

export default function DashboardOverview() {
  const { empresaData } = useAuth();
  const empresaId = empresaData?.id;

  const [loading, setLoading] = useState(true);
  const [faturamentoMes, setFaturamentoMes] = useState(0);
  const [contasPagasMes, setContasPagasMes] = useState(0);
  const [osNoMes, setOsNoMes] = useState(0);
  const [osMesAtualPeriodo, setOsMesAtualPeriodo] = useState(0);
  const [osMesAnteriorPeriodo, setOsMesAnteriorPeriodo] = useState(0);
  const [ultimasOs, setUltimasOs] = useState<
    Array<{
      id: string;
      numero_os: string;
      created_at: string;
      status: string | null;
      clientes: { nome: string } | null;
    }>
  >([]);
  const [topLucro, setTopLucro] = useState<
    Array<{
      id: string;
      numero_os: string;
      lucro: number;
      receita: number;
      custos: number;
      clientes: { nome: string } | null;
    }>
  >([]);
  const [porCategoria, setPorCategoria] = useState<Array<{ name: string; value: number }>>([]);
  const [osPorDia, setOsPorDia] = useState<Array<{ dia: string; total: number; label: string }>>([]);
  const [contasVencer, setContasVencer] = useState<
    Array<{
      id: string;
      descricao: string;
      valor: number;
      data_vencimento: string;
      status: string;
      fornecedor?: string | null;
    }>
  >([]);

  const refLabel = useMemo(() => format(new Date(), "MMMM yyyy", { locale: ptBR }), []);

  const load = useCallback(async () => {
    if (!empresaId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const now = new Date();
    const { start: inicioMes, end: fimMes } = startEndOfMonth(now);
    const mesISO = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const { curStart, curEnd, prevStart, prevEnd } = sameCalendarPeriodPrevMonth(now);

    try {
      const inicioMesIso = inicioMes.toISOString();
      const fimMesIso = fimMes.toISOString();

      const [vendasRes, contasRes, ordensMesRes, ordensPeriodoRes, ultimasRes] = await Promise.all([
        supabase
          .from('vendas')
          .select('id, total, data_venda, status, observacoes')
          .eq('empresa_id', empresaId)
          .eq('status', 'finalizada')
          .gte('data_venda', inicioMesIso.split('T')[0])
          .lte('data_venda', fimMesIso.split('T')[0]),
        supabase
          .from('contas_pagar')
          .select('id, descricao, valor, tipo, data_vencimento, data_pagamento, status, fornecedor, os_id')
          .eq('empresa_id', empresaId),
        supabase
          .from('ordens_servico')
          .select('id, numero_os, cliente_id, created_at, categoria')
          .eq('empresa_id', empresaId)
          .gte('created_at', inicioMesIso)
          .lte('created_at', fimMesIso),
        supabase
          .from('ordens_servico')
          .select('id, created_at')
          .eq('empresa_id', empresaId)
          .gte('created_at', prevStart.toISOString())
          .lte('created_at', curEnd.toISOString()),
        supabase
          .from('ordens_servico')
          .select(
            `
            id,
            numero_os,
            created_at,
            status,
            clientes!cliente_id(nome)
          `
          )
          .eq('empresa_id', empresaId)
          .order('created_at', { ascending: false })
          .limit(5),
      ]);

      if (vendasRes.error) throw vendasRes.error;
      if (contasRes.error) throw contasRes.error;
      if (ordensMesRes.error) throw ordensMesRes.error;
      if (ordensPeriodoRes.error) throw ordensPeriodoRes.error;
      if (ultimasRes.error) throw ultimasRes.error;

      const vendasMes = (vendasRes.data || []).filter((v: { data_venda?: string }) => {
        const d = (v.data_venda || '').toString().slice(0, 7);
        return d === mesISO;
      });
      const fat = vendasMes.reduce((s: number, v: { total?: number }) => s + Number(v.total || 0), 0);
      setFaturamentoMes(fat);

      const contas = contasRes.data || [];
      const pagasMesValor = contas
        .filter((c: { status?: string; data_pagamento?: string | null }) => {
          if (norm(c.status) !== 'pago') return false;
          const p = (c.data_pagamento || '').toString();
          return p.length >= 7 && p.slice(0, 7) === mesISO;
        })
        .reduce((s: number, c: { valor?: number }) => s + Number(c.valor || 0), 0);
      setContasPagasMes(pagasMesValor);

      const ordensDoMes = (ordensMesRes.data || []) as Array<{
        id: string;
        numero_os: string;
        cliente_id?: string | null;
        created_at: string;
        categoria?: string | null;
      }>;

      setOsNoMes(ordensDoMes.length);

      const periodoRows = ordensPeriodoRes.data || [];
      const osCur = periodoRows.filter((r: { created_at: string }) => {
        const t = new Date(r.created_at).getTime();
        return t >= curStart.getTime() && t <= curEnd.getTime();
      }).length;
      const osPrev = periodoRows.filter((r: { created_at: string }) => {
        const t = new Date(r.created_at).getTime();
        return t >= prevStart.getTime() && t <= prevEnd.getTime();
      }).length;
      setOsMesAtualPeriodo(osCur);
      setOsMesAnteriorPeriodo(osPrev);

      const catCount = new Map<string, number>();
      ordensDoMes.forEach((row) => {
        const raw = (row.categoria || '').trim();
        const key = raw.length ? raw : 'Sem categoria';
        catCount.set(key, (catCount.get(key) || 0) + 1);
      });
      const catArr = Array.from(catCount.entries())
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value);
      setPorCategoria(catArr);

      const diasNoMes = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
      const perDay = new Map<string, number>();
      for (let d = 1; d <= diasNoMes; d++) {
        const key = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        perDay.set(key, 0);
      }
      ordensDoMes.forEach((row) => {
        const k = parseDayKey(row.created_at);
        if (perDay.has(k)) perDay.set(k, (perDay.get(k) || 0) + 1);
      });
      const osDia = Array.from(perDay.entries()).map(([dia, total]) => ({
        dia,
        total,
        label: format(new Date(dia + 'T12:00:00'), 'dd/MM', { locale: ptBR }),
      }));
      setOsPorDia(osDia);

      const hoje = new Date();
      hoje.setHours(0, 0, 0, 0);
      const limite = new Date(hoje);
      limite.setDate(limite.getDate() + 60);

      const pendentesVencer = contas
        .filter((c: { status?: string; data_vencimento?: string }) => {
          const st = norm(c.status);
          if (st === 'pago') return false;
          const v = (c.data_vencimento || '').toString().split('T')[0];
          if (!v) return false;
          const dv = new Date(v + 'T12:00:00');
          return dv >= hoje && dv <= limite;
        })
        .sort(
          (a: { data_vencimento?: string }, b: { data_vencimento?: string }) =>
            new Date(a.data_vencimento || '').getTime() - new Date(b.data_vencimento || '').getTime()
        )
        .slice(0, 12);
      setContasVencer(pendentesVencer);

      const ult = (ultimasRes.data || []).map((row: Record<string, unknown>) => {
        const cli = row.clientes as { nome?: string } | { nome?: string }[] | null;
        const cliente =
          Array.isArray(cli) && cli[0] ? { nome: cli[0].nome || '—' } : cli && !Array.isArray(cli) ? { nome: cli.nome || '—' } : null;
        return {
          id: row.id as string,
          numero_os: String(row.numero_os),
          created_at: String(row.created_at),
          status: (row.status as string) || null,
          clientes: cliente,
        };
      });
      setUltimasOs(ult);

      const idsOsMes = new Set(ordensDoMes.map((o) => o.id));
      const ordensMap = new Map(
        ordensDoMes.map((o) => [String(o.numero_os), o] as const)
      );

      const receitaByOs = new Map<string, number>();
      vendasMes.forEach((v: { id: string; total?: number; observacoes?: string }) => {
        for (const os of ordensMap.values()) {
          if (observacoesMatchNumeroOs(v.observacoes, os.numero_os)) {
            const cur = receitaByOs.get(os.id) || 0;
            receitaByOs.set(os.id, cur + Number(v.total || 0));
            break;
          }
        }
      });

      const pecasMes = contas.filter(
        (c: { tipo?: string; data_vencimento?: string }) =>
          norm(c.tipo) === 'pecas' && (c.data_vencimento || '').toString().slice(0, 7) === mesISO
      );
      const custoByOs = new Map<string, number>();
      pecasMes.forEach((c: { os_id?: string | null; valor?: number }) => {
        if (!c.os_id || !idsOsMes.has(c.os_id)) return;
        const cur = custoByOs.get(c.os_id) || 0;
        custoByOs.set(c.os_id, cur + Number(c.valor || 0));
      });

      const lucroRows: Array<{
        id: string;
        numero_os: string;
        lucro: number;
        receita: number;
        custos: number;
        cliente_id?: string;
      }> = [];
      receitaByOs.forEach((rec, osId) => {
        const os = ordensDoMes.find((o) => o.id === osId);
        if (!os) return;
        const cust = custoByOs.get(osId) || 0;
        lucroRows.push({
          id: osId,
          numero_os: os.numero_os,
          receita: rec,
          custos: cust,
          lucro: rec - cust,
          cliente_id: os.cliente_id,
        });
      });
      lucroRows.sort((a, b) => b.lucro - a.lucro);
      const top = lucroRows.slice(0, 5);
      const clientIds = [...new Set(top.map((t) => t.cliente_id).filter(Boolean))] as string[];
      let nomeMap = new Map<string, string>();
      if (clientIds.length) {
        const { data: cliData } = await supabase.from('clientes').select('id, nome').in('id', clientIds);
        nomeMap = new Map((cliData || []).map((c: { id: string; nome: string }) => [c.id, c.nome]));
      }
      setTopLucro(
        top.map((t) => ({
          ...t,
          clientes: t.cliente_id ? { nome: nomeMap.get(t.cliente_id) || '—' } : null,
        }))
      );
    } catch {
      setFaturamentoMes(0);
      setContasPagasMes(0);
      setOsNoMes(0);
      setOsMesAtualPeriodo(0);
      setOsMesAnteriorPeriodo(0);
      setUltimasOs([]);
      setTopLucro([]);
      setPorCategoria([]);
      setOsPorDia([]);
      setContasVencer([]);
    } finally {
      setLoading(false);
    }
  }, [empresaId]);

  useEffect(() => {
    load();
  }, [load]);

  const deltaOs = osMesAtualPeriodo - osMesAnteriorPeriodo;
  const deltaPositive = deltaOs >= 0;

  const pieData = porCategoria.slice(0, 8);

  if (!empresaId) return null;

  return (
    <div className="space-y-8 px-2 md:px-0">
      <div>
        <h1 className="text-xl md:text-2xl font-semibold text-zinc-900 dark:text-zinc-50 tracking-tight">
          Painel
        </h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1 capitalize">{refLabel}</p>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="h-28 rounded-xl bg-zinc-100 dark:bg-zinc-800 animate-pulse border border-zinc-200/80 dark:border-zinc-700"
            />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
          <DashboardCard
            title="Faturamento (mês)"
            value={brl(faturamentoMes)}
            description="Vendas finalizadas no mês atual"
            descriptionColorClass="text-zinc-500 dark:text-zinc-400"
            icon={<FiDollarSign className="w-5 h-5 text-lime-600 dark:text-lime-400" />}
            svgPolyline={{ color: '#84cc16', points: '0,18 12,12 24,14 36,8 48,10 60,6' }}
          />
          <DashboardCard
            title="Contas pagas (mês)"
            value={brl(contasPagasMes)}
            description="Total pago no mês (data de pagamento)"
            descriptionColorClass="text-zinc-500 dark:text-zinc-400"
            icon={<FiTrendingUp className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />}
            svgPolyline={{ color: '#22d3ee', points: '0,16 10,14 20,10 30,12 40,8 50,9 60,7' }}
          />
          <DashboardCard
            title="O.S. no mês"
            value={osNoMes}
            description="Ordens criadas no mês atual"
            descriptionColorClass="text-zinc-500 dark:text-zinc-400"
            icon={<FiFileText className="w-5 h-5 text-violet-600 dark:text-violet-400" />}
            svgPolyline={{ color: '#a78bfa', points: '0,14 15,10 30,12 45,8 60,10' }}
          />
          <DashboardCard
            title="vs. mês anterior"
            value={
              <span className="flex items-center gap-2 flex-wrap">
                <span>
                  {deltaPositive ? '+' : ''}
                  {deltaOs}
                </span>
                <span
                  className={cn(
                    'inline-flex items-center gap-0.5 text-sm font-medium rounded-full px-2 py-0.5',
                    deltaPositive
                      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300'
                      : 'bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300'
                  )}
                >
                  {deltaPositive ? (
                    <FiArrowUpRight className="w-4 h-4" />
                  ) : (
                    <FiArrowDownRight className="w-4 h-4" />
                  )}
                  O.S. (1–{format(new Date(), 'd')} vs. período anterior)
                </span>
              </span>
            }
            description={`Este período: ${osMesAtualPeriodo} · Anterior: ${osMesAnteriorPeriodo}`}
            descriptionColorClass="text-zinc-500 dark:text-zinc-400"
            icon={<FiLayers className="w-5 h-5 text-amber-600 dark:text-amber-400" />}
            svgPolyline={{
              color: deltaPositive ? '#4ade80' : '#fb7185',
              points: deltaPositive ? '0,16 20,8 40,12 60,4' : '0,8 20,16 40,10 60,18',
            }}
          />
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 md:gap-6">
        <section className="rounded-2xl border border-zinc-200 dark:border-zinc-700 bg-gradient-to-b from-white to-zinc-50/80 dark:from-zinc-800 dark:to-zinc-900/40 p-4 md:p-6 shadow-sm">
          <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100 mb-1">
            O.S. por categoria de equipamento
          </h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-4">
            Distribuição das ordens criadas no mês atual.
          </p>
          <div className="h-[300px] w-full">
            {loading ? (
              <div className="h-full rounded-xl bg-zinc-100 dark:bg-zinc-700/40 animate-pulse" />
            ) : pieData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-sm text-zinc-500">
                Sem dados de categoria no mês.
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
                    innerRadius={58}
                    outerRadius={92}
                    paddingAngle={2}
                    stroke="none"
                  >
                    {pieData.map((_, i) => (
                      <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      borderRadius: 12,
                      border: '1px solid rgb(228 228 231)',
                      background: 'rgba(255,255,255,0.96)',
                    }}
                    formatter={(value: number) => [`${value} O.S.`, 'Quantidade']}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
          {!loading && pieData.length > 0 && (
            <div className="flex flex-wrap gap-2 justify-center mt-2">
              {pieData.map((c, i) => (
                <span
                  key={c.name}
                  className="inline-flex items-center gap-1.5 text-[11px] text-zinc-600 dark:text-zinc-300"
                >
                  <span
                    className="w-2 h-2 rounded-full"
                    style={{ background: CHART_COLORS[i % CHART_COLORS.length] }}
                  />
                  {c.name} ({c.value})
                </span>
              ))}
            </div>
          )}
        </section>

        <section className="rounded-2xl border border-zinc-200 dark:border-zinc-700 bg-gradient-to-b from-white to-zinc-50/80 dark:from-zinc-800 dark:to-zinc-900/40 p-4 md:p-6 shadow-sm">
          <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100 mb-1">
            O.S. por dia (mês atual)
          </h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-4">
            Volume de ordens criadas em cada dia.
          </p>
          <div className="h-[300px] w-full">
            {loading ? (
              <div className="h-full rounded-xl bg-zinc-100 dark:bg-zinc-700/40 animate-pulse" />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={osPorDia} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
                  <defs>
                    <linearGradient id="osArea" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#84cc16" stopOpacity={0.35} />
                      <stop offset="100%" stopColor="#84cc16" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgb(228 228 231)" className="dark:stroke-zinc-600" />
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 10, fill: 'rgb(113 113 122)' }}
                    interval="preserveStartEnd"
                    minTickGap={24}
                  />
                  <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: 'rgb(113 113 122)' }} width={28} />
                  <Tooltip
                    contentStyle={{
                      borderRadius: 12,
                      border: '1px solid rgb(228 228 231)',
                      background: 'rgba(255,255,255,0.96)',
                    }}
                    formatter={(value: number) => [`${value}`, 'O.S.']}
                    labelFormatter={(_, p) => {
                      const pl = p?.[0]?.payload as { dia?: string } | undefined;
                      return pl?.dia ? format(new Date(pl.dia + 'T12:00:00'), 'dd/MM/yyyy', { locale: ptBR }) : '';
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="total"
                    stroke="#65a30d"
                    strokeWidth={2}
                    fill="url(#osArea)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </section>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 md:gap-6">
        <section className="rounded-2xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800/80 p-4 md:p-5 shadow-sm">
          <div className="flex items-center justify-between gap-2 mb-4">
            <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">Últimas O.S.</h2>
            <Link
              href="/ordens"
              className="text-xs font-medium text-lime-700 dark:text-lime-400 hover:underline"
            >
              Ver todas →
            </Link>
          </div>
          {loading ? (
            <div className="space-y-2">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="h-12 rounded-lg bg-zinc-100 dark:bg-zinc-700/60 animate-pulse" />
              ))}
            </div>
          ) : ultimasOs.length === 0 ? (
            <p className="text-sm text-zinc-500">Nenhuma ordem encontrada.</p>
          ) : (
            <ul className="divide-y divide-zinc-100 dark:divide-zinc-700">
              {ultimasOs.map((os) => (
                <li key={os.id} className="py-3 first:pt-0 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <Link
                      href={`/ordens/${os.id}`}
                      className="font-medium text-zinc-900 dark:text-zinc-100 hover:text-lime-700 dark:hover:text-lime-400 truncate block"
                    >
                      OS {os.numero_os}
                    </Link>
                    <p className="text-xs text-zinc-500 truncate">
                      {os.clientes?.nome || 'Cliente —'} ·{' '}
                      {format(new Date(os.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                    </p>
                  </div>
                  {os.status && (
                    <span className="shrink-0 text-[10px] uppercase tracking-wide px-2 py-1 rounded-md bg-zinc-100 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-300 max-w-[120px] truncate">
                      {os.status}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-2xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800/80 p-4 md:p-5 shadow-sm">
          <div className="flex items-center justify-between gap-2 mb-4">
            <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
              Maior lucro no mês
            </h2>
            <Link
              href="/financeiro/lucro-desempenho"
              className="text-xs font-medium text-lime-700 dark:text-lime-400 hover:underline"
            >
              Lucro & desempenho →
            </Link>
          </div>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-3">
            Apenas O.S. criadas no mês atual. Receita de vendas finalizadas no mês vinculadas à O.S.,
            menos peças (contas tipo peças com vencimento no mês) ligadas a essas O.S.
          </p>
          {loading ? (
            <div className="space-y-2">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="h-12 rounded-lg bg-zinc-100 dark:bg-zinc-700/60 animate-pulse" />
              ))}
            </div>
          ) : topLucro.length === 0 ? (
            <p className="text-sm text-zinc-500">Sem vendas vinculadas a O.S. neste mês.</p>
          ) : (
            <ul className="divide-y divide-zinc-100 dark:divide-zinc-700">
              {topLucro.map((os) => (
                <li key={os.id} className="py-3 first:pt-0 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <Link
                      href={`/ordens/${os.id}`}
                      className="font-medium text-zinc-900 dark:text-zinc-100 hover:text-lime-700 dark:hover:text-lime-400 truncate block"
                    >
                      OS {os.numero_os}
                    </Link>
                    <p className="text-xs text-zinc-500 truncate">{os.clientes?.nome || 'Cliente —'}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-semibold tabular-nums text-emerald-700 dark:text-emerald-400">
                      {brl(os.lucro)}
                    </p>
                    <p className="text-[10px] text-zinc-400">
                      rec. {brl(os.receita)} · custo {brl(os.custos)}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <section className="rounded-2xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800/80 p-4 md:p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
          <div>
            <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">Contas a vencer</h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
              Próximos 60 dias · pendentes ou vencidas não pagas
            </p>
          </div>
          <Link
            href="/financeiro/contas-a-pagar"
            className="text-xs font-medium text-lime-700 dark:text-lime-400 hover:underline shrink-0"
          >
            Abrir contas a pagar →
          </Link>
        </div>
        {loading ? (
          <div className="h-32 rounded-xl bg-zinc-100 dark:bg-zinc-700/40 animate-pulse" />
        ) : contasVencer.length === 0 ? (
          <p className="text-sm text-zinc-500">Nenhuma conta nesse período.</p>
        ) : (
          <div className="overflow-x-auto -mx-1">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wide text-zinc-500 border-b border-zinc-200 dark:border-zinc-600">
                  <th className="pb-2 pr-4 font-medium">Vencimento</th>
                  <th className="pb-2 pr-4 font-medium">Descrição</th>
                  <th className="pb-2 pr-4 font-medium hidden sm:table-cell">Fornecedor</th>
                  <th className="pb-2 pr-4 font-medium">Status</th>
                  <th className="pb-2 text-right font-medium">Valor</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-700">
                {contasVencer.map((c) => (
                  <tr key={c.id} className="text-zinc-800 dark:text-zinc-200">
                    <td className="py-2.5 pr-4 whitespace-nowrap tabular-nums text-zinc-600 dark:text-zinc-400">
                      {format(new Date((c.data_vencimento || '').split('T')[0] + 'T12:00:00'), 'dd/MM/yyyy', {
                        locale: ptBR,
                      })}
                    </td>
                    <td className="py-2.5 pr-4 max-w-[200px] sm:max-w-xs truncate" title={c.descricao}>
                      {c.descricao}
                    </td>
                    <td className="py-2.5 pr-4 hidden sm:table-cell text-zinc-500 max-w-[140px] truncate">
                      {c.fornecedor || '—'}
                    </td>
                    <td className="py-2.5 pr-4">
                      <span
                        className={cn(
                          'text-[10px] font-semibold px-2 py-0.5 rounded-md',
                          norm(c.status) === 'vencido'
                            ? 'bg-rose-100 text-rose-800 dark:bg-rose-900/35 dark:text-rose-300'
                            : 'bg-amber-100 text-amber-900 dark:bg-amber-900/35 dark:text-amber-200'
                        )}
                      >
                        {norm(c.status) === 'vencido' ? 'Vencido' : 'Pendente'}
                      </span>
                    </td>
                    <td className="py-2.5 text-right font-medium tabular-nums">{brl(c.valor)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
