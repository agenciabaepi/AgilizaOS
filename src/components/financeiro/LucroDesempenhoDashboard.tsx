'use client';

import React, { useId, useMemo } from 'react';
import Link from 'next/link';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { FiInfo, FiPlus, FiPrinter } from 'react-icons/fi';
import { Button } from '@/components/Button';
import { cn } from '@/lib/utils';

type Metricas = {
  totalReceita: number;
  totalCustos: number;
  despesasOperacionais: number;
  custosFixos: number;
  saldoNaConta: number;
  lucroTotal: number;
  margemMedia: number;
  totalOS: number;
  osLucrativas: number;
  osPrejuizo: number;
};

type MetricasPrevistas = {
  receitaPrevista: number;
  contasAPagarPrevistas: number;
  saldoNaContaPrevisto: number;
};

type DadoDia = { dia: number; receita: number; custos: number; lucro: number };

type Props = {
  currentMonth: Date;
  metricas: Metricas;
  metricasMesAnterior: Metricas;
  carregandoComparativo: boolean;
  rotuloMesAtual: string;
  rotuloMesAnterior: string;
  nomeEmpresa: string;
  metricasPrevistas: MetricasPrevistas;
  dadosDiarios: DadoDia[];
  investimentosMes: number;
  onRegistrarInvestimento: () => void;
  formatarMoeda: (v: number) => string;
};

function totalDespesasDeMetricas(m: Metricas) {
  return m.totalCustos + m.despesasOperacionais + m.custosFixos;
}

function lucroOperacionalDe(m: Metricas) {
  return m.totalReceita - totalDespesasDeMetricas(m);
}

function deltaPct(atual: number, anterior: number): string {
  if (anterior === 0 && atual === 0) return '0%';
  if (anterior === 0) return '—';
  const p = ((atual - anterior) / Math.abs(anterior)) * 100;
  return `${p >= 0 ? '+' : ''}${p.toFixed(1)}%`;
}

function deltaValorFmt(atual: number, anterior: number, formatarMoeda: (v: number) => string) {
  const d = atual - anterior;
  if (d === 0) return formatarMoeda(0);
  const sign = d > 0 ? '+' : '−';
  return `${sign} ${formatarMoeda(Math.abs(d))}`;
}

function buildSerieMensal(currentMonth: Date, dadosDiarios: DadoDia[]) {
  const y = currentMonth.getFullYear();
  const m = currentMonth.getMonth();
  const last = new Date(y, m + 1, 0).getDate();
  const map = new Map(dadosDiarios.map((d) => [d.dia, d]));
  return Array.from({ length: last }, (_, i) => {
    const dia = i + 1;
    const row = map.get(dia);
    return {
      label: String(dia),
      receita: row?.receita ?? 0,
      despesas: row?.custos ?? 0,
      lucroDia: row?.lucro ?? 0,
    };
  });
}

export default function LucroDesempenhoDashboard({
  currentMonth,
  metricas,
  metricasMesAnterior,
  carregandoComparativo,
  rotuloMesAtual,
  rotuloMesAnterior,
  nomeEmpresa,
  metricasPrevistas,
  dadosDiarios,
  investimentosMes,
  onRegistrarInvestimento,
  formatarMoeda,
}: Props) {
  const totalDespesas = useMemo(() => totalDespesasDeMetricas(metricas), [metricas]);

  const totalDespesasAnt = useMemo(() => totalDespesasDeMetricas(metricasMesAnterior), [metricasMesAnterior]);

  const lucroOperacional = metricas.totalReceita - totalDespesas;
  const lucroOperacionalAnt = useMemo(
    () => lucroOperacionalDe(metricasMesAnterior),
    [metricasMesAnterior]
  );

  const margemOperacional =
    metricas.totalReceita > 0 ? (lucroOperacional / metricas.totalReceita) * 100 : 0;

  const margemAnt =
    metricasMesAnterior.totalReceita > 0
      ? (lucroOperacionalAnt / metricasMesAnterior.totalReceita) * 100
      : 0;

  const handleImprimir = () => {
    if (typeof window !== 'undefined') window.print();
  };

  const serie = useMemo(
    () => buildSerieMensal(currentMonth, dadosDiarios),
    [currentMonth, dadosDiarios]
  );

  const temMovimento = serie.some((d) => d.receita > 0 || d.despesas > 0);
  const tickInterval = Math.max(0, Math.floor(serie.length / 12) - 1);

  const uid = useId().replace(/:/g, '');

  const serieLucroAcumulado = useMemo(() => {
    let acc = 0;
    return serie.map((d) => {
      acc += d.lucroDia;
      return { ...d, lucroAcum: acc };
    });
  }, [serie]);


  const dadosPieDespesas = useMemo(
    () =>
      [
        { name: 'Peças', value: metricas.totalCustos, color: '#f43f5e' },
        { name: 'Variáveis', value: metricas.despesasOperacionais, color: '#fb923c' },
        { name: 'Fixos', value: metricas.custosFixos, color: '#8b5cf6' },
      ].filter((d) => d.value > 0),
    [metricas.totalCustos, metricas.despesasOperacionais, metricas.custosFixos]
  );

  const dadosBarrasMesVsMes = useMemo(
    () => [
      {
        nome: 'Receita',
        atual: metricas.totalReceita,
        anterior: metricasMesAnterior.totalReceita,
      },
      {
        nome: 'Despesas',
        atual: totalDespesas,
        anterior: totalDespesasAnt,
      },
      {
        nome: 'Lucro',
        atual: lucroOperacional,
        anterior: lucroOperacionalAnt,
      },
    ],
    [
      metricas.totalReceita,
      metricasMesAnterior.totalReceita,
      totalDespesas,
      totalDespesasAnt,
      lucroOperacional,
      lucroOperacionalAnt,
    ]
  );

  const printCss = `
@media print {
  body * { visibility: hidden !important; }
  #relatorio-lucro-impressao, #relatorio-lucro-impressao * { visibility: visible !important; }
  #relatorio-lucro-impressao {
    position: absolute !important; left: 0 !important; top: 0 !important;
    width: 100% !important; min-height: 100vh !important;
    padding: 24px !important; background: white !important; color: #18181b !important;
  }
  #relatorio-lucro-impressao .no-print { display: none !important; }
  #relatorio-lucro-impressao .print-only { display: block !important; }
}
.print-only { display: none; }
`;

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: printCss }} />

      <div id="relatorio-lucro-impressao" className="space-y-8">
        <div className="print-only border-b border-zinc-200 pb-4 mb-2">
          <h1 className="text-xl font-bold text-zinc-900">Relatório — Lucro e desempenho</h1>
          <p className="text-sm text-zinc-700 mt-1">
            <span className="font-medium">{nomeEmpresa}</span>
            {' · '}
            <span className="capitalize">{rotuloMesAtual}</span>
          </p>
          <p className="text-xs text-zinc-500 mt-2">
            Comparativo com{' '}
            <span className="capitalize">{rotuloMesAnterior}</span> · Emitido em{' '}
            {new Date().toLocaleString('pt-BR')}
          </p>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 no-print">
          <p className="text-sm text-zinc-600 dark:text-zinc-400 max-w-xl">
            Visão simples do mês: tudo que entrou (vendas) menos tudo que saiu (contas pagas no mês).
          </p>
          <div className="flex flex-wrap gap-2 justify-end shrink-0">
            <Button
              type="button"
              variant="outline"
              onClick={handleImprimir}
              className="flex items-center gap-2 border-zinc-300 dark:border-zinc-600"
            >
              <FiPrinter className="w-4 h-4" />
              Imprimir relatório
            </Button>
            <Button
              type="button"
              onClick={onRegistrarInvestimento}
              className="bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-2"
            >
              <FiPlus className="w-4 h-4" />
              Registrar investimento
            </Button>
          </div>
        </div>

      {/* Equação principal */}
      <div className="rounded-2xl border border-zinc-200/80 dark:border-zinc-700 bg-white dark:bg-zinc-900/80 shadow-sm overflow-hidden">
        <div className="flex flex-col lg:flex-row lg:items-stretch lg:justify-between gap-6 p-6 lg:p-8">
          <div className="flex-1 text-center lg:text-left space-y-1 min-w-0">
            <p className="text-xs font-medium uppercase tracking-wide text-emerald-700 dark:text-emerald-400">
              Receita
            </p>
            <p className="text-2xl sm:text-3xl font-semibold tabular-nums text-zinc-900 dark:text-zinc-50">
              {formatarMoeda(metricas.totalReceita)}
            </p>
            <p className="text-xs text-zinc-500">Vendas finalizadas no mês</p>
          </div>

          <div className="hidden lg:flex items-center justify-center px-1 text-3xl font-extralight text-zinc-300 dark:text-zinc-600 select-none">
            −
          </div>

          <div className="flex-1 text-center lg:text-left space-y-1 min-w-0">
            <p className="text-xs font-medium uppercase tracking-wide text-rose-700 dark:text-rose-400">
              Despesas
            </p>
            <p className="text-2xl sm:text-3xl font-semibold tabular-nums text-zinc-900 dark:text-zinc-50">
              {formatarMoeda(totalDespesas)}
            </p>
            <p className="text-xs text-zinc-500">Tudo pago no mês (peças + variáveis + fixos)</p>
          </div>

          <div className="hidden lg:flex items-center justify-center px-1 text-3xl font-extralight text-zinc-300 dark:text-zinc-600 select-none">
            =
          </div>

          <div
            className={cn(
              'flex-1 rounded-xl p-5 text-center lg:text-left min-w-0',
              lucroOperacional >= 0
                ? 'bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-100 dark:border-emerald-900/50'
                : 'bg-rose-50 dark:bg-rose-950/30 border border-rose-100 dark:border-rose-900/50'
            )}
          >
            <p className="text-xs font-medium uppercase tracking-wide text-zinc-600 dark:text-zinc-400">
              Lucro do mês
            </p>
            <p
              className={cn(
                'text-2xl sm:text-3xl font-bold tabular-nums mt-1',
                lucroOperacional >= 0 ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-700 dark:text-rose-400'
              )}
            >
              {formatarMoeda(lucroOperacional)}
            </p>
            <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-1">
              Margem{' '}
              <span className="font-semibold tabular-nums">{margemOperacional.toFixed(1)}%</span>
            </p>
          </div>
        </div>

        <div className="lg:hidden px-6 pb-2 text-center text-xs text-zinc-400">
          Receita − despesas = lucro
        </div>

        {/* Composição das despesas */}
        <div className="px-6 pb-6 lg:px-8 lg:pb-8 border-t border-zinc-100 dark:border-zinc-800">
          <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-3">Composição das despesas</p>
          <div className="h-2.5 rounded-full overflow-hidden flex bg-zinc-100 dark:bg-zinc-800">
            {totalDespesas > 0 ? (
              <>
                <div
                  className="h-full bg-rose-500 transition-all"
                  style={{ width: `${(metricas.totalCustos / totalDespesas) * 100}%` }}
                  title={`Peças ${formatarMoeda(metricas.totalCustos)}`}
                />
                <div
                  className="h-full bg-orange-400 transition-all"
                  style={{ width: `${(metricas.despesasOperacionais / totalDespesas) * 100}%` }}
                  title={`Variáveis ${formatarMoeda(metricas.despesasOperacionais)}`}
                />
                <div
                  className="h-full bg-violet-500 transition-all"
                  style={{ width: `${(metricas.custosFixos / totalDespesas) * 100}%` }}
                  title={`Fixos ${formatarMoeda(metricas.custosFixos)}`}
                />
              </>
            ) : (
              <div className="h-full w-full bg-zinc-200 dark:bg-zinc-700" />
            )}
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-2 mt-3 text-xs text-zinc-600 dark:text-zinc-400">
            <span className="inline-flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-rose-500" />
              Peças {formatarMoeda(metricas.totalCustos)}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-orange-400" />
              Variáveis {formatarMoeda(metricas.despesasOperacionais)}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-violet-500" />
              Fixos {formatarMoeda(metricas.custosFixos)}
            </span>
          </div>
        </div>
      </div>

      {/* Comparativo com o mês anterior (abaixo da equação) */}
      <section className="rounded-2xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900/80 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-zinc-100 dark:border-zinc-800">
          <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
            Comparativo com o mês anterior
          </h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
            Mesmos critérios de receita, despesas pagas e lucro operacional.
          </p>
        </div>
        <div className="overflow-x-auto">
          {carregandoComparativo ? (
            <div className="p-8 flex justify-center">
              <div className="h-10 w-full max-w-md rounded-lg bg-zinc-100 dark:bg-zinc-800 animate-pulse" />
            </div>
          ) : (
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wide text-zinc-500 border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50/80 dark:bg-zinc-800/50">
                  <th className="px-4 py-3 font-medium">Indicador</th>
                  <th className="px-4 py-3 font-medium capitalize whitespace-nowrap">{rotuloMesAnterior}</th>
                  <th className="px-4 py-3 font-medium capitalize whitespace-nowrap">{rotuloMesAtual}</th>
                  <th className="px-4 py-3 font-medium text-right">Variação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800 text-zinc-800 dark:text-zinc-200">
                <tr>
                  <td className="px-4 py-3 font-medium">Receita</td>
                  <td className="px-4 py-3 tabular-nums">{formatarMoeda(metricasMesAnterior.totalReceita)}</td>
                  <td className="px-4 py-3 tabular-nums">{formatarMoeda(metricas.totalReceita)}</td>
                  <td className="px-4 py-3 text-right">
                    <span
                      className={cn(
                        'tabular-nums font-medium',
                        metricas.totalReceita >= metricasMesAnterior.totalReceita
                          ? 'text-emerald-700 dark:text-emerald-400'
                          : 'text-rose-700 dark:text-rose-400'
                      )}
                    >
                      {deltaPct(metricas.totalReceita, metricasMesAnterior.totalReceita)} (
                      {deltaValorFmt(metricas.totalReceita, metricasMesAnterior.totalReceita, formatarMoeda)})
                    </span>
                  </td>
                </tr>
                <tr>
                  <td className="px-4 py-3 font-medium">Despesas</td>
                  <td className="px-4 py-3 tabular-nums">{formatarMoeda(totalDespesasAnt)}</td>
                  <td className="px-4 py-3 tabular-nums">{formatarMoeda(totalDespesas)}</td>
                  <td className="px-4 py-3 text-right">
                    <span
                      className={cn(
                        'tabular-nums font-medium',
                        totalDespesas <= totalDespesasAnt
                          ? 'text-emerald-700 dark:text-emerald-400'
                          : 'text-rose-700 dark:text-rose-400'
                      )}
                    >
                      {deltaPct(totalDespesas, totalDespesasAnt)} (
                      {deltaValorFmt(totalDespesas, totalDespesasAnt, formatarMoeda)})
                    </span>
                  </td>
                </tr>
                <tr>
                  <td className="px-4 py-3 font-medium">Lucro operacional</td>
                  <td className="px-4 py-3 tabular-nums">{formatarMoeda(lucroOperacionalAnt)}</td>
                  <td className="px-4 py-3 tabular-nums">{formatarMoeda(lucroOperacional)}</td>
                  <td className="px-4 py-3 text-right">
                    <span
                      className={cn(
                        'tabular-nums font-medium',
                        lucroOperacional >= lucroOperacionalAnt
                          ? 'text-emerald-700 dark:text-emerald-400'
                          : 'text-rose-700 dark:text-rose-400'
                      )}
                    >
                      {deltaPct(lucroOperacional, lucroOperacionalAnt)} (
                      {deltaValorFmt(lucroOperacional, lucroOperacionalAnt, formatarMoeda)})
                    </span>
                  </td>
                </tr>
                <tr>
                  <td className="px-4 py-3 font-medium">Margem</td>
                  <td className="px-4 py-3 tabular-nums">{margemAnt.toFixed(1)}%</td>
                  <td className="px-4 py-3 tabular-nums">{margemOperacional.toFixed(1)}%</td>
                  <td className="px-4 py-3 text-right">
                    <span
                      className={cn(
                        'tabular-nums font-medium',
                        margemOperacional >= margemAnt
                          ? 'text-emerald-700 dark:text-emerald-400'
                          : 'text-rose-700 dark:text-rose-400'
                      )}
                    >
                      {deltaPct(margemOperacional, margemAnt)}
                    </span>
                  </td>
                </tr>
                <tr>
                  <td className="px-4 py-3 font-medium">O.S. no período</td>
                  <td className="px-4 py-3 tabular-nums">{metricasMesAnterior.totalOS}</td>
                  <td className="px-4 py-3 tabular-nums">{metricas.totalOS}</td>
                  <td className="px-4 py-3 text-right">
                    <span
                      className={cn(
                        'tabular-nums font-medium',
                        metricas.totalOS >= metricasMesAnterior.totalOS
                          ? 'text-emerald-700 dark:text-emerald-400'
                          : 'text-rose-700 dark:text-rose-400'
                      )}
                    >
                      {`${deltaPct(metricas.totalOS, metricasMesAnterior.totalOS)} (${
                        metricas.totalOS - metricasMesAnterior.totalOS >= 0 ? '+' : '−'
                      }${Math.abs(metricas.totalOS - metricasMesAnterior.totalOS)} O.S.)`}
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          )}
        </div>
      </section>

      {/* Gráficos analíticos */}
      <div className="space-y-4 no-print">
        <div className="rounded-2xl border border-zinc-200 dark:border-zinc-700 bg-gradient-to-br from-white via-zinc-50/50 to-emerald-50/30 dark:from-zinc-900 dark:via-zinc-900 dark:to-emerald-950/20 p-5 md:p-6 shadow-sm">
          <div className="mb-5">
            <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
              Receita, despesas e lucro — mês atual × mês anterior
            </h3>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-0.5">
              Visão lado a lado para comparar magnitudes (valores absolutos).
            </p>
          </div>
          <div className="h-[280px] w-full min-w-0">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={dadosBarrasMesVsMes}
                margin={{ top: 12, right: 12, left: 8, bottom: 8 }}
                barGap={4}
              >
                <defs>
                  <linearGradient id={`gAnt-${uid}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#94a3b8" stopOpacity={0.95} />
                    <stop offset="100%" stopColor="#64748b" stopOpacity={0.75} />
                  </linearGradient>
                  <linearGradient id={`gAtu-${uid}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#34d399" stopOpacity={0.95} />
                    <stop offset="100%" stopColor="#059669" stopOpacity={0.85} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgb(228 228 231)" vertical={false} className="dark:stroke-zinc-600" />
                <XAxis
                  dataKey="nome"
                  tick={{ fontSize: 11, fill: 'rgb(113 113 122)' }}
                  tickLine={false}
                  axisLine={{ stroke: 'rgb(228 228 231)' }}
                />
                <YAxis
                  tick={{ fontSize: 10, fill: 'rgb(113 113 122)' }}
                  tickLine={false}
                  axisLine={false}
                  width={52}
                  tickFormatter={(v) =>
                    new Intl.NumberFormat('pt-BR', {
                      notation: 'compact',
                      compactDisplay: 'short',
                      maximumFractionDigits: 0,
                    }).format(Number(v))
                  }
                />
                <Tooltip
                  contentStyle={{
                    borderRadius: 12,
                    border: '1px solid rgb(228 228 231)',
                    boxShadow: '0 10px 40px -10px rgba(0,0,0,0.12)',
                  }}
                  formatter={(v: number) => formatarMoeda(v)}
                  labelFormatter={(label) => String(label)}
                />
                <Legend wrapperStyle={{ paddingTop: 8 }} formatter={(v) => (v === 'anterior' ? rotuloMesAnterior : rotuloMesAtual)} />
                <Bar
                  dataKey="anterior"
                  name="anterior"
                  fill={`url(#gAnt-${uid})`}
                  radius={[6, 6, 0, 0]}
                  maxBarSize={44}
                />
                <Bar
                  dataKey="atual"
                  name="atual"
                  fill={`url(#gAtu-${uid})`}
                  radius={[6, 6, 0, 0]}
                  maxBarSize={44}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          <div className="rounded-2xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900/70 p-5 md:p-6 shadow-sm">
            <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100 mb-1">
              Composição das despesas (mês)
            </h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-4">Distribuição do que foi pago no período.</p>
            <div className="h-[260px] w-full min-w-0 flex flex-col items-center justify-center">
              {dadosPieDespesas.length === 0 ? (
                <p className="text-sm text-zinc-500">Sem despesas no mês.</p>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={dadosPieDespesas}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={62}
                      outerRadius={88}
                      paddingAngle={3}
                      stroke="none"
                    >
                      {dadosPieDespesas.map((entry, i) => (
                        <Cell key={i} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(v: number) => formatarMoeda(v)}
                      contentStyle={{ borderRadius: 12, border: '1px solid rgb(228 228 231)' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
            {dadosPieDespesas.length > 0 && (
              <div className="flex flex-wrap justify-center gap-3 mt-2 text-[11px] text-zinc-600 dark:text-zinc-400">
                {dadosPieDespesas.map((d) => (
                  <span key={d.name} className="inline-flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full" style={{ background: d.color }} />
                    {d.name}
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900/70 p-5 md:p-6 shadow-sm">
            <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100 mb-1">
              Lucro acumulado no mês
            </h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-4">
              Soma dia a dia do lucro (receita − despesas alocadas por dia).
            </p>
            <div className="h-[260px] w-full min-w-0">
              {!temMovimento ? (
                <div className="h-full flex items-center justify-center text-sm text-zinc-500 rounded-xl bg-zinc-50 dark:bg-zinc-800/40">
                  Sem dados de lucro diário para acumular.
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={serieLucroAcumulado} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id={`areaLucro-${uid}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#10b981" stopOpacity={0.45} />
                        <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgb(228 228 231)" vertical={false} className="dark:stroke-zinc-600" />
                    <XAxis
                      dataKey="label"
                      tick={{ fontSize: 10, fill: 'rgb(113 113 122)' }}
                      interval={tickInterval}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fontSize: 10, fill: 'rgb(113 113 122)' }}
                      width={48}
                      tickFormatter={(v) =>
                        new Intl.NumberFormat('pt-BR', { notation: 'compact', maximumFractionDigits: 0 }).format(Number(v))
                      }
                    />
                    <Tooltip
                      formatter={(v: number) => formatarMoeda(v)}
                      labelFormatter={(l) => `Dia ${l}`}
                      contentStyle={{ borderRadius: 12, border: '1px solid rgb(228 228 231)' }}
                    />
                    <Area
                      type="monotone"
                      dataKey="lucroAcum"
                      stroke="#059669"
                      strokeWidth={2.5}
                      fill={`url(#areaLucro-${uid})`}
                      dot={false}
                      activeDot={{ r: 4, strokeWidth: 0 }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Caixa (com aportes) + OS + previsão */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900/60 p-5 shadow-sm">
          <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">
            Saldo no caixa
          </p>
          <p
            className={cn(
              'text-xl font-semibold tabular-nums mt-1',
              metricas.saldoNaConta >= 0 ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-700 dark:text-rose-400'
            )}
          >
            {formatarMoeda(metricas.saldoNaConta)}
          </p>
          <p className="text-xs text-zinc-500 mt-2 leading-relaxed">
            Receita − despesas
            {investimentosMes > 0 && (
              <>
                {' '}
                + aportes ({formatarMoeda(investimentosMes)})
              </>
            )}
            .
          </p>
        </div>

        <div className="rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900/60 p-5 shadow-sm">
          <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">
            Ordens no mês
          </p>
          <p className="text-xl font-semibold text-zinc-900 dark:text-zinc-100 mt-1 tabular-nums">
            {metricas.totalOS}
          </p>
          <p className="text-xs text-zinc-500 mt-2">
            <span className="text-emerald-600 dark:text-emerald-400 font-medium">{metricas.osLucrativas}</span>{' '}
            com lucro ·{' '}
            <span className="text-rose-600 dark:text-rose-400 font-medium">{metricas.osPrejuizo}</span> com prejuízo
          </p>
        </div>

        <div className="rounded-xl border border-dashed border-amber-200 dark:border-amber-900/50 bg-amber-50/80 dark:bg-amber-950/20 p-5">
          <p className="text-xs font-medium text-amber-800 dark:text-amber-200 uppercase tracking-wide">
            Previsão (pendentes)
          </p>
          <p className="text-lg font-semibold text-amber-950 dark:text-amber-100 mt-1 tabular-nums">
            {formatarMoeda(metricasPrevistas.saldoNaContaPrevisto)}
          </p>
          <p className="text-xs text-amber-900/80 dark:text-amber-200/90 mt-2 leading-relaxed">
            Estimativa somando o resultado atual a receitas e contas ainda não realizadas no mês.
          </p>
        </div>
      </div>

      {/* Gráfico */}
      <div className="rounded-2xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900/60 p-5 md:p-6 shadow-sm no-print">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 mb-6">
          <div>
            <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
              Receita e despesas por dia
            </h3>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-0.5">
              Valores alocados por dia da venda (entrada) e do vencimento das peças (saídas).
            </p>
          </div>
          <Link
            href="/financeiro/contas-a-pagar"
            className="text-xs font-medium text-emerald-700 dark:text-emerald-400 hover:underline shrink-0"
          >
            Ver contas a pagar →
          </Link>
        </div>

        <div className="h-[320px] w-full min-w-0">
          {!temMovimento ? (
            <div className="h-full flex flex-col items-center justify-center text-zinc-500 text-sm gap-2 rounded-xl bg-zinc-50 dark:bg-zinc-800/50">
              <FiInfo className="w-8 h-8 opacity-40" />
              Sem movimento diário neste mês para exibir no gráfico.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={serie} margin={{ top: 8, right: 8, left: 4, bottom: 0 }}>
                <defs>
                  <linearGradient id={`barReceita-${uid}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10b981" stopOpacity={0.95} />
                    <stop offset="100%" stopColor="#059669" stopOpacity={0.85} />
                  </linearGradient>
                  <linearGradient id={`barDesp-${uid}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#fb7185" stopOpacity={0.95} />
                    <stop offset="100%" stopColor="#e11d48" stopOpacity={0.85} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgb(228 228 231)" className="dark:stroke-zinc-600" vertical={false} />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 10, fill: 'rgb(113 113 122)' }}
                  tickLine={false}
                  axisLine={{ stroke: 'rgb(228 228 231)' }}
                  interval={tickInterval}
                />
                <YAxis
                  tick={{ fontSize: 10, fill: 'rgb(113 113 122)' }}
                  tickLine={false}
                  axisLine={false}
                  width={56}
                  tickFormatter={(v) =>
                    new Intl.NumberFormat('pt-BR', {
                      notation: 'compact',
                      compactDisplay: 'short',
                      maximumFractionDigits: 0,
                    }).format(Number(v))
                  }
                />
                <Tooltip
                  cursor={{ fill: 'rgba(16, 185, 129, 0.06)' }}
                  contentStyle={{
                    borderRadius: 12,
                    border: '1px solid rgb(228 228 231)',
                    boxShadow: '0 10px 40px -10px rgba(0,0,0,0.15)',
                  }}
                  formatter={(value: number, name: string) => [
                    formatarMoeda(value),
                    name === 'receita' ? 'Receita' : 'Despesas',
                  ]}
                  labelFormatter={(label) => `Dia ${label}`}
                />
                <Legend
                  wrapperStyle={{ paddingTop: 16 }}
                  formatter={(value) => (value === 'receita' ? 'Receita' : 'Despesas')}
                />
                <Bar dataKey="receita" name="receita" fill={`url(#barReceita-${uid})`} radius={[6, 6, 0, 0]} maxBarSize={28} />
                <Bar dataKey="despesas" name="despesas" fill={`url(#barDesp-${uid})`} radius={[6, 6, 0, 0]} maxBarSize={28} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      <details className="group rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50/80 dark:bg-zinc-800/40 px-4 py-3 text-sm text-zinc-600 dark:text-zinc-400 no-print">
        <summary className="cursor-pointer font-medium text-zinc-800 dark:text-zinc-200 list-none flex items-center gap-2">
          <FiInfo className="w-4 h-4 opacity-70" />
          Como estes números são calculados
        </summary>
        <ul className="mt-3 space-y-2 pl-6 list-disc text-xs leading-relaxed">
          <li>
            <strong>Receita:</strong> soma das vendas com status &quot;finalizada&quot; cuja data de venda está neste mês.
          </li>
          <li>
            <strong>Despesas:</strong> contas pagas neste mês (data de pagamento), separadas em peças (ligadas à OS),
            despesas variáveis e contas fixas.
          </li>
          <li>
            <strong>Lucro do mês:</strong> receita menos a soma dessas despesas — o mesmo critério do lucro operacional.
          </li>
          <li>
            <strong>Saldo no caixa:</strong> inclui investimentos registrados no mês (aportes), como no fluxo de caixa.
          </li>
        </ul>
      </details>
      </div>
    </>
  );
}
