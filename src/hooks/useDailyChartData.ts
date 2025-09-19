import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';

interface DailyData {
  date: string;
  value: number;
  label: string;
}

export function useDailyChartData(empresaId: string, ano: string, mes: string) {
  const [data, setData] = useState<DailyData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!empresaId || !ano || !mes) return;

    const fetchDailyData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Calcular datas do mês
        const inicioMes = new Date(parseInt(ano), parseInt(mes) - 1, 1);
        const fimMes = new Date(parseInt(ano), parseInt(mes), 0);
        
        const dataInicio = inicioMes.toISOString().split('T')[0];
        const dataFim = fimMes.toISOString().split('T')[0];

        // Buscar vendas diárias
        const { data: vendasData, error: vendasError } = await supabase
          .from('vendas')
          .select('data_venda, total')
          .eq('empresa_id', empresaId)
          .gte('data_venda', `${dataInicio}T00:00:00`)
          .lte('data_venda', `${dataFim}T23:59:59`)
          .order('data_venda', { ascending: true });

        if (vendasError) {
          throw vendasError;
        }

        // Buscar despesas diárias
        const { data: despesasData, error: despesasError } = await supabase
          .from('contas_pagar')
          .select('data_vencimento, valor')
          .eq('empresa_id', empresaId)
          .gte('data_vencimento', dataInicio)
          .lte('data_vencimento', dataFim);

        if (despesasError) {
          console.warn('Erro ao buscar despesas:', despesasError);
        }

        // Processar dados diários
        const dailyMap = new Map<string, { vendas: number; despesas: number }>();

        // Processar vendas
        vendasData?.forEach(venda => {
          const date = venda.data_venda.split('T')[0];
          const existing = dailyMap.get(date) || { vendas: 0, despesas: 0 };
          dailyMap.set(date, {
            ...existing,
            vendas: existing.vendas + (venda.total || 0)
          });
        });

        // Processar despesas
        despesasData?.forEach(despesa => {
          const date = despesa.data_vencimento;
          const existing = dailyMap.get(date) || { vendas: 0, despesas: 0 };
          dailyMap.set(date, {
            ...existing,
            despesas: existing.despesas + (despesa.valor || 0)
          });
        });

        // Gerar dados para todos os dias do mês
        const dailyData: DailyData[] = [];
        const currentDate = new Date(inicioMes);
        
        while (currentDate <= fimMes) {
          const dateStr = currentDate.toISOString().split('T')[0];
          const dayData = dailyMap.get(dateStr) || { vendas: 0, despesas: 0 };
          
          // Calcular lucro diário (vendas - despesas)
          const lucroDiario = dayData.vendas - dayData.despesas;
          
          dailyData.push({
            date: dateStr,
            value: lucroDiario,
            label: currentDate.getDate().toString()
          });
          
          currentDate.setDate(currentDate.getDate() + 1);
        }

        setData(dailyData);
      } catch (err: any) {
        setError(err.message);
        console.error('Erro ao buscar dados diários:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchDailyData();
  }, [empresaId, ano, mes]);

  return { data, loading, error };
}
