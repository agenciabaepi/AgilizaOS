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
        console.log('📞 Chamando função RPC get_snapshot_financeiro_periodo:', {
          empresa_uuid: empresaData.id,
          data_inicio: dataInicio,
          data_fim: dataFim
        });
        
        const { data, error: functionError } = await supabase.rpc(
          'get_snapshot_financeiro_periodo',
          {
            empresa_uuid: empresaData.id,
            data_inicio: dataInicio,
            data_fim: dataFim
          }
        );

        if (functionError) {
          // Tentar serializar o erro de forma mais completa
          const errorDetails: any = {
            message: functionError?.message || 'Erro desconhecido',
            details: functionError?.details || null,
            hint: functionError?.hint || null,
            code: functionError?.code || null,
          };
          
          // Tentar capturar todas as propriedades do erro
          try {
            Object.keys(functionError).forEach(key => {
              if (!errorDetails.hasOwnProperty(key)) {
                errorDetails[key] = (functionError as any)[key];
              }
            });
          } catch (e) {
            // Ignorar se não conseguir serializar
          }
          
          console.error('❌ Erro detalhado na função RPC:', errorDetails);
          console.error('❌ Erro completo (stringify):', JSON.stringify(errorDetails, null, 2));
          
          // Se a função não existe, mostrar mensagem clara
          const errorMessage = String(errorDetails.message || '').toLowerCase();
          if (errorMessage.includes('does not exist') || errorMessage.includes('function') || errorDetails.code === '42883' || errorDetails.code === 'P0001') {
            console.error('⚠️⚠️⚠️ FUNÇÃO NÃO EXISTE NO BANCO! ⚠️⚠️⚠️');
            console.error('⚠️ Execute o SQL completo do arquivo snapshot_financeiro.sql no Supabase SQL Editor');
            console.error('⚠️ A função get_snapshot_financeiro_periodo precisa ser criada no banco de dados');
          }
          
          // Não fazer throw para não travar a interface - apenas retornar valores zerados
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
          setError(`Erro: ${errorDetails.message || 'Função não encontrada. Execute o SQL no Supabase.'}`);
          setLoading(false);
          return;
        }
        
        console.log('📊 Dados retornados da função RPC:', { 
          data, 
          length: data?.length,
          dataInicio,
          dataFim,
          empresaId: empresaData.id
        });
        
        if (data && data.length > 0 && data[0]) {
          console.log('📊 Primeiro registro retornado:', data[0]);
          console.log('💰 Lucro calculado:', data[0].lucro);
          console.log('💰 Receita:', data[0].receita);
          console.log('💰 Despesas pagas:', data[0].despesas_pagas);
          
          // Sempre usar os dados retornados, mesmo se forem zero
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
      
      // Finalizar loading após sucesso
      setLoading(false);
    } catch (err: any) {
      console.error('❌ Erro ao buscar snapshot financeiro:', {
        error: err,
        message: err?.message,
        details: err?.details,
        hint: err?.hint,
        code: err?.code
      });
      setError(err?.message || 'Erro ao carregar dados financeiros');
      
      // Em caso de erro, retornar valores zerados para não travar a interface
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
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSnapshot();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [empresaData?.id, dataInicio, dataFim]);

  return {
    snapshot,
    loading,
    error,
    refetch: fetchSnapshot
  };
}
