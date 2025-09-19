import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/context/AuthContext';

interface SnapshotFinanceiro {
  receita: number;
  receita_bruta: number;
  descontos: number;
  acrescimos: number;
  total_vendas: number;
  despesas: number;
  despesas_pagas: number;
  despesas_pendentes: number;
  despesas_vencidas: number;
  total_contas: number;
  lucro: number;
  margem_percentual: number;
}

interface UseSnapshotFinanceiroReturn {
  snapshot: SnapshotFinanceiro | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useSnapshotFinanceiro(
  dataInicio?: string,
  dataFim?: string
): UseSnapshotFinanceiroReturn {
  const [snapshot, setSnapshot] = useState<SnapshotFinanceiro | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { empresaData } = useAuth();

  const fetchSnapshot = async () => {
    if (!empresaData?.id) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      let query;
      
      if (dataInicio && dataFim) {
        // Usar função para período específico
        const { data, error: functionError } = await supabase.rpc(
          'get_snapshot_financeiro_periodo',
          {
            empresa_uuid: empresaData.id,
            data_inicio: dataInicio,
            data_fim: dataFim
          }
        );

        if (functionError) throw functionError;
        
        if (data && data.length > 0) {
          setSnapshot(data[0]);
        } else {
          // Se não há dados, retornar valores zerados
          setSnapshot({
            receita: 0,
            receita_bruta: 0,
            descontos: 0,
            acrescimos: 0,
            total_vendas: 0,
            despesas: 0,
            despesas_pagas: 0,
            despesas_pendentes: 0,
            despesas_vencidas: 0,
            total_contas: 0,
            lucro: 0,
            margem_percentual: 0
          });
        }
      } else {
        // Usar view geral
        const { data, error: viewError } = await supabase
          .from('view_snapshot_financeiro')
          .select('*')
          .eq('empresa_id', empresaData.id)
          .single();

        if (viewError) throw viewError;
        
        if (data) {
          setSnapshot(data);
        } else {
          // Se não há dados, retornar valores zerados
          setSnapshot({
            receita: 0,
            receita_bruta: 0,
            descontos: 0,
            acrescimos: 0,
            total_vendas: 0,
            despesas: 0,
            despesas_pagas: 0,
            despesas_pendentes: 0,
            despesas_vencidas: 0,
            total_contas: 0,
            lucro: 0,
            margem_percentual: 0
          });
        }
      }
    } catch (err) {
      console.error('Erro ao buscar snapshot financeiro:', err);
      setError('Erro ao carregar dados financeiros');
      
      // Em caso de erro, retornar valores zerados
      setSnapshot({
        receita: 0,
        receita_bruta: 0,
        descontos: 0,
        acrescimos: 0,
        total_vendas: 0,
        despesas: 0,
        despesas_pagas: 0,
        despesas_pendentes: 0,
        despesas_vencidas: 0,
        total_contas: 0,
        lucro: 0,
        margem_percentual: 0
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSnapshot();
  }, [empresaData?.id, dataInicio, dataFim]);

  return {
    snapshot,
    loading,
    error,
    refetch: fetchSnapshot
  };
}
