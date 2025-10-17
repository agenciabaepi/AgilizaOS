import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/context/AuthContext';

export interface FluxoCaixa {
  id: string;
  empresa_id: string;
  usuario_id: string;
  tipo: 'entrada' | 'saida';
  categoria: string;
  descricao: string;
  valor: number;
  data_movimentacao: string;
  data_cadastro: string;
  observacoes?: string;
  comprovante_url?: string;
  referencia_id?: string;
  created_at: string;
  updated_at: string;
  usuario?: {
    nome: string;
  };
}

export interface FluxoCaixaFormData {
  tipo: 'entrada' | 'saida';
  categoria: string;
  descricao: string;
  valor: string;
  data_movimentacao: string;
  observacoes?: string;
  comprovante_url?: string;
  referencia_id?: string;
}

export const useFluxoCaixa = () => {
  const { usuarioData } = useAuth();
  const [movimentacoes, setMovimentacoes] = useState<FluxoCaixa[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Carregar movimentações
  const carregarMovimentacoes = async (
    dataInicio?: string,
    dataFim?: string,
    tipo?: 'entrada' | 'saida',
    categoria?: string
  ) => {
    if (!usuarioData?.empresa_id) return;

    setLoading(true);
    setError(null);

    try {
      let query = supabase
        .from('fluxo_caixa')
        .select(`
          *,
          usuario:usuario_id(nome)
        `)
        .eq('empresa_id', usuarioData.empresa_id)
        .order('data_movimentacao', { ascending: false });

      // Filtros opcionais
      if (dataInicio) {
        query = query.gte('data_movimentacao', dataInicio);
      }
      if (dataFim) {
        query = query.lte('data_movimentacao', dataFim);
      }
      if (tipo) {
        query = query.eq('tipo', tipo);
      }
      if (categoria) {
        query = query.eq('categoria', categoria);
      }

      const { data, error } = await query;

      if (error) throw error;
      setMovimentacoes(data || []);
    } catch (err) {
      console.error('Erro ao carregar movimentações:', err);
      setError('Erro ao carregar movimentações');
    } finally {
      setLoading(false);
    }
  };

  // Adicionar nova movimentação
  const adicionarMovimentacao = async (formData: FluxoCaixaFormData) => {
    if (!usuarioData?.empresa_id || !usuarioData?.auth_user_id) {
      throw new Error('Dados do usuário não encontrados');
    }

    try {
      // Buscar o ID do usuário na tabela usuarios usando auth_user_id
      const { data: userData, error: userError } = await supabase
        .from('usuarios')
        .select('id')
        .eq('auth_user_id', usuarioData.auth_user_id)
        .single();

      if (userError || !userData) {
        throw new Error('Usuário não encontrado na base de dados');
      }

      const { data, error } = await supabase
        .from('fluxo_caixa')
        .insert({
          empresa_id: usuarioData.empresa_id,
          usuario_id: userData.id,
          tipo: formData.tipo,
          categoria: formData.categoria,
          descricao: formData.descricao,
          valor: parseFloat(formData.valor.replace(',', '.')),
          data_movimentacao: formData.data_movimentacao,
          observacoes: formData.observacoes || null,
          comprovante_url: formData.comprovante_url || null,
          referencia_id: formData.referencia_id || null
        })
        .select(`
          *,
          usuario:usuario_id(nome)
        `)
        .single();

      if (error) throw error;

      // Atualizar lista local
      setMovimentacoes(prev => [data, ...prev]);
      return data;
    } catch (err) {
      console.error('Erro ao adicionar movimentação:', err);
      throw err;
    }
  };

  // Atualizar movimentação
  const atualizarMovimentacao = async (id: string, formData: Partial<FluxoCaixaFormData>) => {
    try {
      const updateData: any = {};
      
      if (formData.tipo) updateData.tipo = formData.tipo;
      if (formData.categoria) updateData.categoria = formData.categoria;
      if (formData.descricao) updateData.descricao = formData.descricao;
      if (formData.valor) updateData.valor = parseFloat(formData.valor.replace(',', '.'));
      if (formData.data_movimentacao) updateData.data_movimentacao = formData.data_movimentacao;
      if (formData.observacoes !== undefined) updateData.observacoes = formData.observacoes;
      if (formData.comprovante_url !== undefined) updateData.comprovante_url = formData.comprovante_url;
      if (formData.referencia_id !== undefined) updateData.referencia_id = formData.referencia_id;

      const { data, error } = await supabase
        .from('fluxo_caixa')
        .update(updateData)
        .eq('id', id)
        .select(`
          *,
          usuario:usuario_id(nome)
        `)
        .single();

      if (error) throw error;

      // Atualizar lista local
      setMovimentacoes(prev => 
        prev.map(mov => mov.id === id ? data : mov)
      );
      return data;
    } catch (err) {
      console.error('Erro ao atualizar movimentação:', err);
      throw err;
    }
  };

  // Excluir movimentação
  const excluirMovimentacao = async (id: string) => {
    try {
      const { error } = await supabase
        .from('fluxo_caixa')
        .delete()
        .eq('id', id);

      if (error) throw error;

      // Atualizar lista local
      setMovimentacoes(prev => prev.filter(mov => mov.id !== id));
    } catch (err) {
      console.error('Erro ao excluir movimentação:', err);
      throw err;
    }
  };

  // Calcular totais
  const calcularTotais = () => {
    const entradas = movimentacoes
      .filter(mov => mov.tipo === 'entrada')
      .reduce((total, mov) => total + mov.valor, 0);

    const saidas = movimentacoes
      .filter(mov => mov.tipo === 'saida')
      .reduce((total, mov) => total + mov.valor, 0);

    const saldo = entradas - saidas;

    return {
      entradas,
      saidas,
      saldo,
      totalMovimentacoes: movimentacoes.length
    };
  };

  // Obter categorias disponíveis
  const getCategorias = () => {
    const categoriasEntrada = [
      'venda',
      'recebimento',
      'emprestimo',
      'investimento',
      'reembolso',
      'outros'
    ];

    const categoriasSaida = [
      'despesa',
      'investimento',
      'emprestimo',
      'pagamento',
      'compra',
      'outros'
    ];

    return {
      entrada: categoriasEntrada,
      saida: categoriasSaida,
      todas: [...categoriasEntrada, ...categoriasSaida].filter((cat, index, arr) => arr.indexOf(cat) === index)
    };
  };

  // Carregar movimentações quando o componente monta
  useEffect(() => {
    if (usuarioData?.empresa_id) {
      carregarMovimentacoes();
    }
  }, [usuarioData?.empresa_id]);

  return {
    movimentacoes,
    loading,
    error,
    carregarMovimentacoes,
    adicionarMovimentacao,
    atualizarMovimentacao,
    excluirMovimentacao,
    calcularTotais,
    getCategorias
  };
};
