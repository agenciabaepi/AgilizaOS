'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/context/AuthContext';

export interface HistoricoItem {
  id: string;
  os_id: string;
  numero_os?: string;
  acao: string;
  categoria: string;
  descricao: string;
  detalhes?: any;
  valor_anterior?: string;
  valor_novo?: string;
  campo_alterado?: string;
  usuario_id?: string;
  usuario_nome?: string;
  usuario_tipo?: string;
  motivo?: string;
  observacoes?: string;
  created_at: string;
  empresa_id: string;
  // Dados relacionados
  equipamento?: string;
  status_atual?: string;
  cliente_nome?: string;
}

export interface HistoricoMetricas {
  totalAcoes: number;
  acoesHoje: number;
  usuarioMaisAtivo: string;
  categoriaMaisComum: string;
  ultimaAcao?: string;
}

/**
 * Hook para gerenciar histórico completo das OS
 */
export function useHistoricoOS() {
  const { usuarioData, user } = useAuth();
  const [historico, setHistorico] = useState<HistoricoItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Registra uma ação no histórico
   */
  const registrarHistorico = async (
    osId: string,
    acao: string,
    categoria: string,
    descricao: string,
    detalhes?: any,
    valorAnterior?: string,
    valorNovo?: string,
    campoAlterado?: string,
    motivo?: string,
    observacoes?: string
  ): Promise<boolean> => {
    try {
      // Obter IP do usuário (se disponível)
      let ipAddress = null;
      try {
        const response = await fetch('https://api.ipify.org?format=json');
        const data = await response.json();
        ipAddress = data.ip;
      } catch (e) {
        console.warn('Não foi possível obter IP:', e);
      }

      // Chamar função SQL de histórico
      const { data, error } = await supabase.rpc('registrar_historico_os', {
        p_os_id: osId,
        p_acao: acao,
        p_categoria: categoria,
        p_descricao: descricao,
        p_detalhes: detalhes ? JSON.stringify(detalhes) : null,
        p_valor_anterior: valorAnterior,
        p_valor_novo: valorNovo,
        p_campo_alterado: campoAlterado,
        p_usuario_id: user?.id || null,
        p_motivo: motivo,
        p_observacoes: observacoes,
        p_ip_address: ipAddress,
        p_user_agent: typeof window !== 'undefined' ? navigator.userAgent : null,
        p_origem: 'WEB'
      });

      if (error) {
        console.error('❌ Erro ao registrar histórico:', error);
        
        // Fallback: inserção direta se a função falhar
        const { error: insertError } = await supabase
          .from('os_historico')
          .insert({
            os_id: osId,
            acao,
            categoria,
            descricao,
            detalhes: detalhes ? JSON.stringify(detalhes) : null,
            valor_anterior: valorAnterior,
            valor_novo: valorNovo,
            campo_alterado: campoAlterado,
            usuario_id: user?.id,
            usuario_nome: usuarioData?.nome || 'Sistema',
            usuario_tipo: usuarioData?.nivel || 'SISTEMA',
            motivo,
            observacoes,
            ip_address: ipAddress,
            user_agent: typeof window !== 'undefined' ? navigator.userAgent : null,
            origem: 'WEB',
            empresa_id: usuarioData?.empresa_id
          });

        if (insertError) {
          console.error('❌ Erro no fallback de histórico:', insertError);
          return false;
        }
      }

      return true;
    } catch (error) {
      console.error('❌ Erro ao registrar histórico:', error);
      return false;
    }
  };

  /**
   * Busca histórico de uma OS específica
   */
  const buscarHistoricoOS = useCallback(async (osId: string) => {
    setLoading(true);
    setError(null);

    try {
      const { data, error } = await supabase
        .from('os_historico')
        .select('*')
        .eq('os_id', osId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('❌ Erro na query:', error);
        throw error;
      }

      setHistorico(data || []);
    } catch (error) {
      console.error('Erro ao buscar histórico:', error);
      setError(error instanceof Error ? error.message : 'Erro ao carregar histórico');
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Busca histórico geral da empresa
   */
  const buscarHistoricoGeral = useCallback(async (limite: number = 100) => {
    setLoading(true);
    setError(null);

    try {
      const { data, error } = await supabase
        .from('os_historico')
        .select('*')
        .limit(limite)
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error('Erro ao buscar histórico geral:', error);
      setError(error instanceof Error ? error.message : 'Erro ao carregar histórico');
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Busca métricas de histórico
   */
  const buscarMetricas = async (osId?: string): Promise<HistoricoMetricas | null> => {
    try {
      let query = supabase.from('os_historico').select('*');
      
      if (osId) {
        query = query.eq('os_id', osId);
      }

      const { data, error } = await query;

      if (error || !data) {
        return null;
      }

      const hoje = new Date().toISOString().split('T')[0];
      const acoesHoje = data.filter(item => 
        item.created_at.startsWith(hoje)
      ).length;

      // Usuário mais ativo
      const usuarioCount = data.reduce((acc, item) => {
        if (item.usuario_nome) {
          acc[item.usuario_nome] = (acc[item.usuario_nome] || 0) + 1;
        }
        return acc;
      }, {} as Record<string, number>);
      
      const usuarioMaisAtivo = Object.entries(usuarioCount)
        .sort(([,a], [,b]) => (b as number) - (a as number))[0]?.[0] || '';

      // Categoria mais comum
      const categoriaCount = data.reduce((acc, item) => {
        acc[item.categoria] = (acc[item.categoria] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      
      const categoriaMaisComum = Object.entries(categoriaCount)
        .sort(([,a], [,b]) => (b as number) - (a as number))[0]?.[0] || '';

      return {
        totalAcoes: data.length,
        acoesHoje,
        usuarioMaisAtivo,
        categoriaMaisComum,
        ultimaAcao: data[0]?.descricao
      };
    } catch (error) {
      console.error('Erro ao buscar métricas:', error);
      return null;
    }
  };

  // Funções de conveniência para ações específicas
  const registrarMudancaStatus = (
    osId: string, 
    statusAnterior: string, 
    statusNovo: string, 
    motivo?: string
  ) => {
    return registrarHistorico(
      osId,
      'STATUS_CHANGE',
      'STATUS',
      `Status alterado de "${statusAnterior}" para "${statusNovo}"`,
      { statusAnterior, statusNovo },
      statusAnterior,
      statusNovo,
      'status',
      motivo
    );
  };

  const registrarUploadImagem = (
    osId: string, 
    tipoImagem: 'cliente' | 'tecnico', 
    nomeArquivo: string
  ) => {
    return registrarHistorico(
      osId,
      'IMAGE_UPLOAD',
      'ANEXOS',
      `Imagem ${tipoImagem === 'cliente' ? 'do cliente' : 'do técnico'} adicionada: ${nomeArquivo}`,
      { tipoImagem, nomeArquivo }
    );
  };

  const registrarMudancaValor = (
    osId: string, 
    campo: string, 
    valorAnterior: number, 
    valorNovo: number
  ) => {
    return registrarHistorico(
      osId,
      'VALUE_CHANGE',
      'FINANCEIRO',
      `${campo} alterado de R$ ${valorAnterior.toFixed(2)} para R$ ${valorNovo.toFixed(2)}`,
      { campo, valorAnterior, valorNovo },
      valorAnterior.toString(),
      valorNovo.toString(),
      campo
    );
  };

  const registrarEntrega = (osId: string, dataEntrega: string) => {
    return registrarHistorico(
      osId,
      'DELIVERY',
      'ENTREGA',
      `OS entregue em ${new Date(dataEntrega).toLocaleDateString('pt-BR')}`,
      { dataEntrega }
    );
  };

  return {
    historico,
    loading,
    error,
    registrarHistorico,
    buscarHistoricoOS,
    buscarHistoricoGeral,
    buscarMetricas,
    // Funções de conveniência
    registrarMudancaStatus,
    registrarUploadImagem,
    registrarMudancaValor,
    registrarEntrega
  };
}
