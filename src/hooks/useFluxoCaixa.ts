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
      // Buscar movimentações manuais da tabela fluxo_caixa
      let queryFluxoCaixa = supabase
        .from('fluxo_caixa')
        .select(`
          *,
          usuario:usuario_id(nome)
        `)
        .eq('empresa_id', usuarioData.empresa_id);

      // Filtros opcionais para fluxo_caixa
      if (dataInicio) {
        queryFluxoCaixa = queryFluxoCaixa.gte('data_movimentacao', dataInicio);
      }
      if (dataFim) {
        queryFluxoCaixa = queryFluxoCaixa.lte('data_movimentacao', dataFim);
      }
      if (tipo) {
        queryFluxoCaixa = queryFluxoCaixa.eq('tipo', tipo);
      }
      if (categoria) {
        queryFluxoCaixa = queryFluxoCaixa.eq('categoria', categoria);
      }

      const { data: movimentacoesManuais, error: errorFluxo } = await queryFluxoCaixa;

      if (errorFluxo) {
        console.error('Erro ao buscar movimentações manuais:', errorFluxo);
      }

      // Buscar vendas (entradas) - apenas se não filtrar por tipo='saida'
      const vendas = tipo === 'saida' ? [] : await (async () => {
        try {
          let queryVendas = supabase
            .from('vendas')
            .select('id, total, data_venda, observacoes, empresa_id')
            .eq('empresa_id', usuarioData.empresa_id)
            .eq('status', 'finalizada');

          if (dataInicio) {
            queryVendas = queryVendas.gte('data_venda', `${dataInicio}T00:00:00`);
          }
          if (dataFim) {
            queryVendas = queryVendas.lte('data_venda', `${dataFim}T23:59:59`);
          }

          const { data: vendasData, error: vendasError } = await queryVendas;

          if (vendasError) {
            // Log detalhado do erro mesmo que o objeto esteja vazio
            const errorDetails = {
              message: vendasError?.message || 'Erro desconhecido',
              details: vendasError?.details || 'Sem detalhes',
              hint: vendasError?.hint || 'Sem dica',
              code: vendasError?.code || 'Sem código',
              empresa_id: usuarioData.empresa_id,
              dataInicio,
              dataFim,
              errorString: JSON.stringify(vendasError, null, 2)
            };
            
            console.error('❌ Erro ao buscar vendas:', errorDetails);
            
            // Log adicional para garantir que aparece
            if (vendasError.message) {
              console.error('Mensagem do erro:', vendasError.message);
            }
            if (vendasError.details) {
              console.error('Detalhes:', vendasError.details);
            }
            if (vendasError.code) {
              console.error('Código:', vendasError.code);
            }
            
            return [];
          }

          if (!vendasData || vendasData.length === 0) {
            console.log('ℹ️ Nenhuma venda encontrada para o período');
            return [];
          }

          // Converter vendas para formato de movimentação
          const vendasConvertidas = vendasData.map(venda => {
            const valor = venda.total || 0;
            
            return {
              id: `venda_${venda.id}`,
              empresa_id: venda.empresa_id,
              usuario_id: '',
              tipo: 'entrada' as const,
              categoria: 'venda',
              descricao: venda.observacoes || `Venda #${venda.id}`,
              valor: valor,
              data_movimentacao: venda.data_venda ? venda.data_venda.split('T')[0] : new Date().toISOString().split('T')[0],
              data_cadastro: venda.data_venda || new Date().toISOString(),
              created_at: venda.data_venda || new Date().toISOString(),
              updated_at: venda.data_venda || new Date().toISOString(),
              observacoes: null,
              comprovante_url: null,
              referencia_id: venda.id,
              usuario: undefined
            };
          });

          // Filtrar por categoria se necessário
          const vendasFiltradas = categoria 
            ? vendasConvertidas.filter(v => v.categoria === categoria)
            : vendasConvertidas;

          console.log(`✅ ${vendasFiltradas.length} venda(s) carregada(s)`);
          return vendasFiltradas;
        } catch (err) {
          console.error('❌ Erro inesperado ao buscar vendas:', err);
          return [];
        }
      })();

      // Buscar contas pagas (saídas) - apenas se não filtrar por tipo='entrada'
      const contasPagas = tipo === 'entrada' ? [] : await (async () => {
        let queryContas = supabase
          .from('contas_pagar')
          .select('id, valor, data_pagamento, descricao, tipo, empresa_id')
          .eq('empresa_id', usuarioData.empresa_id)
          .eq('status', 'pago')
          .not('data_pagamento', 'is', null);

        if (dataInicio) {
          queryContas = queryContas.gte('data_pagamento', `${dataInicio}T00:00:00`);
        }
        if (dataFim) {
          queryContas = queryContas.lte('data_pagamento', `${dataFim}T23:59:59`);
        }

        const { data: contasData, error: contasError } = await queryContas;

        if (contasError) {
          console.error('Erro ao buscar contas pagas:', contasError);
          return [];
        }

        // Converter contas para formato de movimentação
        return contasData?.map(conta => {
          let categoriaMov = '';
          if (conta.tipo === 'pecas') categoriaMov = 'compra';
          else if (conta.tipo === 'variavel') categoriaMov = 'despesa';
          else if (conta.tipo === 'fixa') categoriaMov = 'pagamento';
          else categoriaMov = 'outros';

          return {
            id: `conta_${conta.id}`,
            empresa_id: conta.empresa_id,
            usuario_id: '',
            tipo: 'saida' as const,
            categoria: categoriaMov,
            descricao: conta.descricao || `Conta #${conta.id}`,
            valor: conta.valor,
            data_movimentacao: conta.data_pagamento.split('T')[0],
            data_cadastro: conta.data_pagamento,
            created_at: conta.data_pagamento,
            updated_at: conta.data_pagamento,
            observacoes: null,
            comprovante_url: null,
            referencia_id: conta.id,
            usuario: undefined
          };
        }).filter(c => !categoria || c.categoria === categoria) || [];
      })();

      // Buscar investimentos (entradas) da tabela movimentacoes_caixa
      const investimentos = tipo === 'saida' ? [] : await (async () => {
        let queryInvestimentos = supabase
          .from('movimentacoes_caixa')
          .select(`
            id,
            valor,
            data_movimentacao,
            descricao,
            empresa_id,
            tipo,
            usuario:usuario_id(nome)
          `)
          .eq('empresa_id', usuarioData.empresa_id)
          .eq('tipo', 'investimento');

        if (dataInicio) {
          queryInvestimentos = queryInvestimentos.gte('data_movimentacao', `${dataInicio}T00:00:00`);
        }
        if (dataFim) {
          queryInvestimentos = queryInvestimentos.lte('data_movimentacao', `${dataFim}T23:59:59`);
        }

        const { data: investimentosData, error: investimentosError } = await queryInvestimentos;

        if (investimentosError) {
          console.error('Erro ao buscar investimentos:', investimentosError);
          return [];
        }

        // Converter investimentos para formato de movimentação
        return investimentosData?.map(inv => ({
          id: `investimento_${inv.id}`,
          empresa_id: inv.empresa_id,
          usuario_id: '',
          tipo: 'entrada' as const,
          categoria: 'investimento',
          descricao: inv.descricao || 'Investimento no caixa',
          valor: inv.valor,
          data_movimentacao: inv.data_movimentacao.split('T')[0],
          data_cadastro: inv.data_movimentacao,
          created_at: inv.data_movimentacao,
          updated_at: inv.data_movimentacao,
          observacoes: null,
          comprovante_url: null,
          referencia_id: inv.id,
          usuario: inv.usuario
        })).filter(i => !categoria || i.categoria === categoria) || [];
      })();

      // Combinar todas as movimentações
      const todasMovimentacoes = [
        ...(movimentacoesManuais || []),
        ...vendas,
        ...contasPagas,
        ...investimentos
      ];

      // Filtrar por categoria se necessário (após combinar)
      let movimentacoesFiltradas = todasMovimentacoes;
      if (categoria) {
        movimentacoesFiltradas = todasMovimentacoes.filter(mov => mov.categoria === categoria);
      }

      // Ordenar por data (mais recente primeiro)
      movimentacoesFiltradas.sort((a, b) => {
        const dataA = new Date(a.data_movimentacao).getTime();
        const dataB = new Date(b.data_movimentacao).getTime();
        return dataB - dataA;
      });

      console.log('💰 Movimentações carregadas:', {
        manuais: movimentacoesManuais?.length || 0,
        vendas: vendas.length,
        contasPagas: contasPagas.length,
        investimentos: investimentos.length,
        total: movimentacoesFiltradas.length
      });

      setMovimentacoes(movimentacoesFiltradas as FluxoCaixa[]);
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
      // Não permitir editar movimentações que vêm de outras tabelas (vendas, contas, investimentos)
      if (id.startsWith('venda_') || id.startsWith('conta_') || id.startsWith('investimento_')) {
        throw new Error('Esta movimentação não pode ser editada diretamente. Edite a venda, conta ou investimento correspondente.');
      }

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
      // Não permitir excluir movimentações que vêm de outras tabelas (vendas, contas, investimentos)
      if (id.startsWith('venda_') || id.startsWith('conta_') || id.startsWith('investimento_')) {
        throw new Error('Esta movimentação não pode ser excluída diretamente. Exclua a venda, conta ou investimento correspondente.');
      }

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
