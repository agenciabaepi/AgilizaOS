'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/context/AuthContext';
import { FiSmartphone, FiMonitor, FiTrendingUp } from 'react-icons/fi';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

const COLORS = [
  '#6366f1', '#8b5cf6', '#a78bfa', '#c4b5fd', '#ddd6fe',
  '#818cf8', '#a5b4fc', '#c7d2fe', '#93c5fd', '#bfdbfe',
];

type PeriodFilter = '30' | '90' | '180' | '365' | 'all';
type CategoryTab = string;

interface ModeloRanking {
  marca: string;
  modelo: string;
  total: number;
}

function SkeletonBar() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex items-center gap-3">
          <div className="h-4 w-6 bg-gray-200 rounded animate-pulse" />
          <div className="h-4 bg-gray-200 rounded animate-pulse flex-1" style={{ maxWidth: `${90 - i * 12}%` }} />
          <div className="h-4 w-8 bg-gray-200 rounded animate-pulse" />
        </div>
      ))}
    </div>
  );
}

export default function DashboardAparelhosRanking() {
  const { empresaData } = useAuth();
  const empresaId = empresaData?.id;

  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<PeriodFilter>('90');
  const [categorias, setCategorias] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<CategoryTab>('TODOS');
  const [allRows, setAllRows] = useState<Array<{ marca: string; modelo: string; categoria: string }>>([]);

  const load = useCallback(async () => {
    if (!empresaId) { setLoading(false); return; }
    setLoading(true);

    try {
      let query = supabase
        .from('ordens_servico')
        .select('marca, modelo, categoria')
        .eq('empresa_id', empresaId)
        .not('marca', 'is', null)
        .not('modelo', 'is', null);

      if (period !== 'all') {
        const d = new Date();
        d.setDate(d.getDate() - Number(period));
        query = query.gte('created_at', d.toISOString());
      }

      const { data, error } = await query;
      if (error) throw error;

      const rows = (data || []).filter(
        (r: any) => r.marca && r.modelo && r.marca.trim() && r.modelo.trim()
      );
      setAllRows(rows);

      const cats = new Set<string>();
      rows.forEach((r: any) => {
        const c = (r.categoria || '').trim().toUpperCase();
        if (c) cats.add(c);
      });
      const sorted = Array.from(cats).sort();
      setCategorias(sorted);
    } catch {
      setAllRows([]);
      setCategorias([]);
    } finally {
      setLoading(false);
    }
  }, [empresaId, period]);

  useEffect(() => { load(); }, [load]);

  const ranking = useMemo((): ModeloRanking[] => {
    const filtered = activeTab === 'TODOS'
      ? allRows
      : allRows.filter((r) => (r.categoria || '').trim().toUpperCase() === activeTab);

    const counts = new Map<string, { marca: string; modelo: string; total: number }>();
    filtered.forEach((r) => {
      const key = `${r.marca.trim().toUpperCase()}|${r.modelo.trim().toUpperCase()}`;
      const existing = counts.get(key);
      if (existing) {
        existing.total++;
      } else {
        counts.set(key, { marca: r.marca.trim().toUpperCase(), modelo: r.modelo.trim().toUpperCase(), total: 1 });
      }
    });

    return Array.from(counts.values())
      .sort((a, b) => b.total - a.total)
      .slice(0, 10);
  }, [allRows, activeTab]);

  const chartData = useMemo(() =>
    ranking.map((r) => ({
      name: `${r.marca} ${r.modelo}`.length > 25
        ? `${r.marca} ${r.modelo}`.substring(0, 22) + '...'
        : `${r.marca} ${r.modelo}`,
      fullName: `${r.marca} ${r.modelo}`,
      total: r.total,
    })),
    [ranking]
  );

  const totalOS = useMemo(() => {
    const filtered = activeTab === 'TODOS'
      ? allRows
      : allRows.filter((r) => (r.categoria || '').trim().toUpperCase() === activeTab);
    return filtered.length;
  }, [allRows, activeTab]);

  const periodLabels: Record<PeriodFilter, string> = {
    '30': '30 dias',
    '90': '3 meses',
    '180': '6 meses',
    '365': '1 ano',
    'all': 'Todo período',
  };

  const categoryIcons: Record<string, React.ReactNode> = {
    CELULAR: <FiSmartphone className="w-3.5 h-3.5" />,
    NOTEBOOK: <FiMonitor className="w-3.5 h-3.5" />,
    COMPUTADOR: <FiMonitor className="w-3.5 h-3.5" />,
    TABLET: <FiSmartphone className="w-3.5 h-3.5" />,
  };

  if (!empresaId) return null;

  return (
    <div className="rounded-xl border border-zinc-200/80 dark:border-zinc-700 bg-white dark:bg-zinc-800 p-4 md:p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5">
        <div className="flex items-center gap-2">
          <FiTrendingUp className="w-5 h-5 text-indigo-500" />
          <h2 className="text-base md:text-lg font-semibold text-zinc-900 dark:text-zinc-50">
            Aparelhos mais atendidos
          </h2>
        </div>
        <select
          value={period}
          onChange={(e) => setPeriod(e.target.value as PeriodFilter)}
          className="text-xs border border-zinc-200 dark:border-zinc-600 rounded-lg px-2.5 py-1.5 bg-white dark:bg-zinc-700 text-zinc-700 dark:text-zinc-200 focus:ring-1 focus:ring-indigo-500 w-fit"
        >
          {Object.entries(periodLabels).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
      </div>

      <div className="flex flex-wrap gap-1.5 mb-5">
        <button
          type="button"
          onClick={() => setActiveTab('TODOS')}
          className={`text-xs font-medium px-3 py-1.5 rounded-full transition-colors ${
            activeTab === 'TODOS'
              ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300'
              : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-600'
          }`}
        >
          Todos ({allRows.length})
        </button>
        {categorias.map((cat) => {
          const count = allRows.filter((r) => (r.categoria || '').trim().toUpperCase() === cat).length;
          return (
            <button
              key={cat}
              type="button"
              onClick={() => setActiveTab(cat)}
              className={`text-xs font-medium px-3 py-1.5 rounded-full transition-colors flex items-center gap-1.5 ${
                activeTab === cat
                  ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300'
                  : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-600'
              }`}
            >
              {categoryIcons[cat] || null}
              {cat.charAt(0) + cat.slice(1).toLowerCase()} ({count})
            </button>
          );
        })}
      </div>

      {loading ? (
        <SkeletonBar />
      ) : ranking.length === 0 ? (
        <div className="text-center py-10 text-zinc-400 dark:text-zinc-500">
          <FiSmartphone className="w-10 h-10 mx-auto mb-2 opacity-30" />
          <p className="text-sm">Nenhum aparelho registrado neste período</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_1fr] gap-6">
          <div className="space-y-2">
            {ranking.map((r, i) => {
              const pct = ranking[0]?.total ? (r.total / ranking[0].total) * 100 : 0;
              return (
                <div key={`${r.marca}|${r.modelo}`} className="flex items-center gap-3 group">
                  <span className="text-xs font-bold text-zinc-400 dark:text-zinc-500 w-5 text-right tabular-nums">
                    {i + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="text-sm font-medium text-zinc-800 dark:text-zinc-100 truncate">
                        {r.marca} {r.modelo}
                      </span>
                      <span className="text-xs font-semibold text-zinc-600 dark:text-zinc-300 tabular-nums shrink-0 ml-2">
                        {r.total} OS
                      </span>
                    </div>
                    <div className="h-2 bg-zinc-100 dark:bg-zinc-700 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${pct}%`,
                          backgroundColor: COLORS[i % COLORS.length],
                        }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
            <p className="text-[11px] text-zinc-400 dark:text-zinc-500 mt-3">
              Total: {totalOS} ordens de serviço {activeTab !== 'TODOS' ? `(${activeTab.charAt(0) + activeTab.slice(1).toLowerCase()})` : ''}
            </p>
          </div>

          {ranking.length >= 3 && (
            <div className="hidden lg:block">
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={chartData} layout="vertical" margin={{ left: 0, right: 20, top: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 11, fill: '#a1a1aa' }} axisLine={false} tickLine={false} />
                  <YAxis
                    dataKey="name"
                    type="category"
                    tick={{ fontSize: 11, fill: '#71717a' }}
                    axisLine={false}
                    tickLine={false}
                    width={140}
                  />
                  <Tooltip
                    contentStyle={{
                      borderRadius: 10,
                      border: '1px solid #e4e4e7',
                      fontSize: 12,
                      padding: '8px 12px',
                    }}
                    formatter={(value: number, _: string, props: any) => [
                      `${value} OS`,
                      props.payload.fullName,
                    ]}
                  />
                  <Bar dataKey="total" radius={[0, 6, 6, 0]} maxBarSize={24}>
                    {chartData.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
