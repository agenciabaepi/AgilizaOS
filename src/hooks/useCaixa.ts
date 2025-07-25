import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/context/AuthContext';

export interface TurnoCaixa {
  id: string;
  caixa_id: string;
  usuario_id: string;
  data_abertura: string;
  data_fechamento: string | null;
  valor_abertura: number;
  valor_fechamento: number | null;
  valor_vendas: number;
  valor_sangrias: number;
  valor_suprimentos: number;
  valor_diferenca: number;
  valor_troco: number | null;
  status: 'aberto' | 'fechado';
  observacoes: string | null;
  empresa_id: string;
  usuario?: {
    nome: string;
  };
}

export interface MovimentacaoCaixa {
  id: string;
  turno_id: string;
  tipo: 'sangria' | 'suprimento' | 'venda';
  valor: number;
  descricao: string | null;
  usuario_id: string;
  data_movimentacao: string;
  venda_id: string | null;
  empresa_id: string;
  usuario?: {
    nome: string;
  };
}

export interface Caixa {
  id: string;
  nome: string;
  empresa_id: string;
  ativo: boolean;
}

export const useCaixa = () => {
  const { usuarioData } = useAuth();
  const [turnoAtual, setTurnoAtual] = useState<TurnoCaixa | null>(null);
  const [movimentacoes, setMovimentacoes] = useState<MovimentacaoCaixa[]>([]);
  const [loading, setLoading] = useState(false);
  const [verificacaoInicial, setVerificacaoInicial] = useState(false);

  // Verificar se há turno aberto apenas na inicialização
  useEffect(() => {
    if (usuarioData?.empresa_id && !verificacaoInicial) {
      verificarTurnoAberto();
      setVerificacaoInicial(true);
    }
  }, [usuarioData, verificacaoInicial]);

  const verificarTurnoAberto = async () => {
    if (!usuarioData?.empresa_id) return;

    try {
      console.log('Verificando turno aberto...');
      const { data, error } = await supabase
        .from('turnos_caixa')
        .select(`
          *,
          usuario:usuario_id(nome)
        `)
        .eq('empresa_id', usuarioData.empresa_id)
        .eq('status', 'aberto')
        .maybeSingle();

      if (error) {
        console.error('Erro ao verificar turno:', error);
        return;
      }

      console.log('Turno encontrado:', data);
      setTurnoAtual(data);
      if (data) {
        await buscarMovimentacoes(data.id);
      }
    } catch (error) {
      console.error('Erro ao verificar turno aberto:', error);
    }
  };

  const buscarMovimentacoes = async (turnoId: string) => {
    try {
      const { data } = await supabase
        .from('movimentacoes_caixa')
        .select(`
          *,
          usuario:usuario_id(nome)
        `)
        .eq('turno_id', turnoId)
        .order('data_movimentacao', { ascending: false });

      setMovimentacoes(data || []);
    } catch (error) {
      console.error('Erro ao buscar movimentações:', error);
    }
  };

  const abrirCaixa = async (valorAbertura: number, observacoes?: string) => {
    if (!usuarioData?.empresa_id) throw new Error('Empresa não encontrada');

    setLoading(true);
    try {
      // Verificar se já existe turno aberto
      const { data: turnoExistente } = await supabase
        .from('turnos_caixa')
        .select('id')
        .eq('empresa_id', usuarioData.empresa_id)
        .eq('status', 'aberto')
        .maybeSingle();

      if (turnoExistente) {
        throw new Error('Já existe um turno aberto');
      }

      // Buscar ou criar caixa padrão
      let { data: caixa } = await supabase
        .from('caixas')
        .select('id')
        .eq('empresa_id', usuarioData.empresa_id)
        .eq('nome', 'Caixa Principal')
        .maybeSingle();

      if (!caixa) {
        const { data: novoCaixa } = await supabase
          .from('caixas')
          .insert({
            nome: 'Caixa Principal',
            empresa_id: usuarioData.empresa_id
          })
          .select('id')
          .single();
        caixa = novoCaixa;
      }

      // Buscar usuario_id
      const { data: usuario } = await supabase
        .from('usuarios')
        .select('id')
        .eq('auth_user_id', (await supabase.auth.getUser()).data.user?.id)
        .single();

      if (!usuario) throw new Error('Usuário não encontrado');

      // Criar novo turno
      const { data: novoTurno } = await supabase
        .from('turnos_caixa')
        .insert({
          caixa_id: caixa.id,
          usuario_id: usuario.id,
          valor_abertura: valorAbertura,
          observacoes,
          empresa_id: usuarioData.empresa_id
        })
        .select(`
          *,
          usuario:usuario_id(nome)
        `)
        .single();

      setTurnoAtual(novoTurno);
      setMovimentacoes([]);
      return novoTurno;
    } finally {
      setLoading(false);
    }
  };

  const fecharCaixa = async (valorFechamento: number, valorTroco: number = 0, observacoes?: string) => {
    if (!turnoAtual) throw new Error('Nenhum turno aberto');

    setLoading(true);
    try {
      const saldoEsperado = turnoAtual.valor_abertura + 
        turnoAtual.valor_vendas + 
        turnoAtual.valor_suprimentos - 
        turnoAtual.valor_sangrias;
      
      const valorDiferenca = valorFechamento - saldoEsperado;

      console.log('Cálculos de fechamento:', {
        valorAbertura: turnoAtual.valor_abertura,
        valorVendas: turnoAtual.valor_vendas,
        valorSuprimentos: turnoAtual.valor_suprimentos,
        valorSangrias: turnoAtual.valor_sangrias,
        saldoEsperado,
        valorFechamento,
        valorDiferenca
      });

      console.log('Dados para fechamento:', {
        id: turnoAtual.id,
        valorFechamento,
        valorDiferenca,
        valorTroco,
        observacoes: observacoes || turnoAtual.observacoes
      });

      const dadosUpdate = {
        data_fechamento: new Date().toISOString(),
        valor_fechamento: valorFechamento,
        valor_troco: valorTroco,
        status: 'fechado',
        observacoes: observacoes || turnoAtual.observacoes || null
      };

      console.log('Dados de update:', dadosUpdate);

      // Primeiro, tentar apenas o update sem select
      const { error: updateError } = await supabase
        .from('turnos_caixa')
        .update(dadosUpdate)
        .eq('id', turnoAtual.id);

      if (updateError) {
        console.error('Erro no update:', updateError);
        throw new Error(`Erro no update: ${updateError.message}`);
      }

      console.log('Update realizado com sucesso');

      // Depois, buscar os dados atualizados
      const { data, error: selectError } = await supabase
        .from('turnos_caixa')
        .select(`
          *,
          usuario:usuario_id(nome)
        `)
        .eq('id', turnoAtual.id)
        .single();

      if (selectError) {
        console.error('Erro ao buscar dados atualizados:', selectError);
        // Não vamos falhar aqui, pois o update já foi feito
      }

      console.log('Caixa fechado no banco:', data);
      
      // Limpar estado local
      setTurnoAtual(null);
      setMovimentacoes([]);
      
      return data;
    } finally {
      setLoading(false);
    }
  };

  const adicionarMovimentacao = async (
    tipo: 'sangria' | 'suprimento',
    valor: number,
    descricao: string
  ) => {
    if (!turnoAtual) throw new Error('Nenhum turno aberto');
    if (!usuarioData?.empresa_id) throw new Error('Empresa não encontrada');

    try {
      // Buscar usuario_id
      const { data: usuario } = await supabase
        .from('usuarios')
        .select('id')
        .eq('auth_user_id', (await supabase.auth.getUser()).data.user?.id)
        .single();

      if (!usuario) throw new Error('Usuário não encontrado');

      // Adicionar movimentação
      const { data: movimentacao } = await supabase
        .from('movimentacoes_caixa')
        .insert({
          turno_id: turnoAtual.id,
          tipo,
          valor,
          descricao,
          usuario_id: usuario.id,
          empresa_id: usuarioData.empresa_id
        })
        .select(`
          *,
          usuario:usuario_id(nome)
        `)
        .single();

      // Atualizar valores do turno
      const novoValorSangrias = tipo === 'sangria' 
        ? turnoAtual.valor_sangrias + valor 
        : turnoAtual.valor_sangrias;
      
      const novoValorSuprimentos = tipo === 'suprimento' 
        ? turnoAtual.valor_suprimentos + valor 
        : turnoAtual.valor_suprimentos;

      await supabase
        .from('turnos_caixa')
        .update({
          valor_sangrias: novoValorSangrias,
          valor_suprimentos: novoValorSuprimentos
        })
        .eq('id', turnoAtual.id);

      // Atualizar estado local
      setTurnoAtual(prev => prev ? {
        ...prev,
        valor_sangrias: novoValorSangrias,
        valor_suprimentos: novoValorSuprimentos
      } : null);

      setMovimentacoes(prev => [movimentacao, ...prev]);
      return movimentacao;
    } catch (error) {
      console.error('Erro ao adicionar movimentação:', error);
      throw error;
    }
  };

  const registrarVenda = async (vendaId: string, valor: number) => {
    if (!turnoAtual) return;
    if (!usuarioData?.empresa_id) return;

    try {
      // Buscar usuario_id
      const { data: usuario } = await supabase
        .from('usuarios')
        .select('id')
        .eq('auth_user_id', (await supabase.auth.getUser()).data.user?.id)
        .single();

      if (!usuario) return;

      // Registrar movimentação da venda
      await supabase
        .from('movimentacoes_caixa')
        .insert({
          turno_id: turnoAtual.id,
          tipo: 'venda',
          valor,
          descricao: `Venda #${vendaId}`,
          usuario_id: usuario.id,
          venda_id: vendaId,
          empresa_id: usuarioData.empresa_id
        });

      // Atualizar valor de vendas no turno
      const novoValorVendas = turnoAtual.valor_vendas + valor;
      
      await supabase
        .from('turnos_caixa')
        .update({
          valor_vendas: novoValorVendas
        })
        .eq('id', turnoAtual.id);

      // Vincular venda ao turno
      await supabase
        .from('vendas')
        .update({
          turno_id: turnoAtual.id
        })
        .eq('id', vendaId);

      // Atualizar estado local
      setTurnoAtual(prev => prev ? {
        ...prev,
        valor_vendas: novoValorVendas
      } : null);

    } catch (error) {
      console.error('Erro ao registrar venda no caixa:', error);
    }
  };

  const calcularSaldoAtual = () => {
    if (!turnoAtual) return 0;
    return turnoAtual.valor_abertura + 
           turnoAtual.valor_vendas + 
           turnoAtual.valor_suprimentos - 
           turnoAtual.valor_sangrias;
  };

  const buscarUltimoValorFechamento = async (): Promise<number> => {
    if (!usuarioData?.empresa_id) return 0;

    try {
      const { data } = await supabase
        .from('turnos_caixa')
        .select('valor_troco')
        .eq('empresa_id', usuarioData.empresa_id)
        .eq('status', 'fechado')
        .order('data_fechamento', { ascending: false })
        .limit(1)
        .maybeSingle();

      console.log('Valor do troco do último fechamento:', data?.valor_troco || 0);
      return data?.valor_troco || 0;
    } catch (error) {
      console.error('Erro ao buscar último valor de fechamento:', error);
      return 0;
    }
  };

  return {
    turnoAtual,
    movimentacoes,
    loading,
    abrirCaixa,
    fecharCaixa,
    adicionarMovimentacao,
    registrarVenda,
    calcularSaldoAtual,
    verificarTurnoAberto,
    buscarUltimoValorFechamento
  };
}; 