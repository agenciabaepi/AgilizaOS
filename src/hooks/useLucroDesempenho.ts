'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/lib/supabaseClient';

export interface Venda {
  id: string;
  total: number;
  data_venda: string;
  status: string;
  empresa_id: string;
  observacoes?: string;
}

export interface ContaPagar {
  id: string;
  descricao: string;
  valor: number;
  tipo: string;
  data_vencimento: string;
  data_pagamento?: string | null;
  status: string;
  os_id?: string | null;
}

export interface OrdemServico {
  id: string;
  numero_os: string;
  cliente_id: string;
  tecnico?: string;
  valor_peca?: number;
  valor_servico?: number;
  qtd_peca?: number;
  qtd_servico?: number;
  status: string;
  created_at: string;
  vendas?: Venda[];
  custos?: ContaPagar[];
  tecnico_nome?: string;
  clientes?: { id: string; nome: string };
}

const getMesISO = (date: Date) => date.toISOString().slice(0, 7);
const norm = (v: string | undefined) => (v || '').toLowerCase().trim();

export function useLucroDesempenho(empresaId: string | undefined, currentMonth: Date) {
  const [loading, setLoading] = useState(true);
  const [ordens, setOrdens] = useState<OrdemServico[]>([]);
  const [todasVendas, setTodasVendas] = useState<Venda[]>([]);
  const [todasContas, setTodasContas] = useState<ContaPagar[]>([]);
  const [investimentosMes, setInvestimentosMes] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const mesISO = getMesISO(currentMonth);

  const loadAll = useCallback(async () => {
    if (!empresaId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const ano = currentMonth.getFullYear();
      const mes = currentMonth.getMonth();
      const dataInicio = `${ano}-${String(mes + 1).padStart(2, '0')}-01`;
      const dataFim = new Date(ano, mes + 1, 0).toISOString().split('T')[0];

      const [ordensRes, vendasRes, contasRes, invRes] = await Promise.all([
        supabase
          .from('ordens_servico')
          .select('id, numero_os, cliente_id, tecnico, valor_peca, valor_servico, qtd_peca, qtd_servico, status, created_at')
          .eq('empresa_id', empresaId)
          .order('created_at', { ascending: false })
          .limit(200),
        supabase
          .from('vendas')
          .select('id, total, data_venda, status, empresa_id, observacoes')
          .eq('empresa_id', empresaId)
          .eq('status', 'finalizada')
          .order('data_venda', { ascending: false }),
        supabase
          .from('contas_pagar')
          .select('id, descricao, valor, tipo, data_vencimento, data_pagamento, status, os_id')
          .eq('empresa_id', empresaId),
        supabase
          .from('movimentacoes_caixa')
          .select('valor')
          .eq('empresa_id', empresaId)
          .eq('tipo', 'investimento')
          .gte('data_movimentacao', `${dataInicio}T00:00:00`)
          .lte('data_movimentacao', `${dataFim}T23:59:59`)
      ]);

      if (ordensRes.error) throw ordensRes.error;
      if (vendasRes.error) throw vendasRes.error;
      if (contasRes.error) throw contasRes.error;

      const vendasData = vendasRes.data || [];
      const contasData = contasRes.data || [];
      const ordensData = ordensRes.data || [];

      const pecasContas = contasData.filter(c => norm(c.tipo) === 'pecas');
      const clienteIds = [...new Set((ordensData || []).map((o: any) => o.cliente_id).filter(Boolean))];
      const { data: clientesData } = await supabase.from('clientes').select('id, nome').in('id', clienteIds);
      const clientesMap = new Map((clientesData || []).map((c: any) => [c.id, c]));

      const ordensCompletas: OrdemServico[] = (ordensData || []).map((os: any) => {
        const vendasOS = vendasData.filter(v => {
          const obs = (v.observacoes || '');
          return obs.includes(`O.S. #${os.numero_os}`) || obs.includes(`OS #${os.numero_os}`) || obs.includes(`#${os.numero_os}`);
        });
        const custosOS = pecasContas.filter(c => c.os_id === os.id);
        return {
          ...os,
          vendas: vendasOS,
          custos: custosOS,
          tecnico_nome: os.tecnico || 'N/A',
          clientes: clientesMap.get(os.cliente_id) || undefined
        };
      });

      const vendasDoPeriodo = vendasData.filter(v => {
        const d = (v.data_venda || '').toString().substring(0, 7);
        return d === mesISO;
      });

      const ordensComVenda = ordensCompletas.filter(o =>
        o.vendas?.some(v => vendasDoPeriodo.some(vp => vp.id === v.id))
      );

      const ordensSemVenda = ordensCompletas.filter(o => {
        const createdMes = (o.created_at || '').toString().substring(0, 7);
        const entregue = norm(o.status) === 'entregue';
        const temVenda = (o.vendas || []).some(v => vendasDoPeriodo.some(vp => vp.id === v.id));
        return createdMes === mesISO && !entregue && !temVenda;
      });

      const calcValorOS = (o: OrdemServico) => {
        const vs = Number(o.valor_servico || 0);
        const qs = Number(o.qtd_servico || 1);
        const vp = Number(o.valor_peca || 0);
        const qp = Number(o.qtd_peca || 1);
        const sub = vs * qs + vp * qp;
        return Math.max(0, sub - Number((o as any).desconto || 0));
      };

      const ordensPrevistas = ordensSemVenda.filter(o => calcValorOS(o) > 0);
      const ordensFinais = [...ordensComVenda, ...ordensPrevistas].sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );

      const invest = (invRes.data || []).reduce((s, i) => s + (i.valor || 0), 0);

      setOrdens(ordensFinais);
      setTodasVendas(vendasData);
      setTodasContas(contasData);
      setInvestimentosMes(invest);
    } catch (e: any) {
      setError(e?.message || 'Erro ao carregar dados');
      setOrdens([]);
      setTodasVendas([]);
      setTodasContas([]);
      setInvestimentosMes(0);
    } finally {
      setLoading(false);
    }
  }, [empresaId, mesISO]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const vendasFiltradas = useMemo(() => {
    return todasVendas.filter(v => ((v.data_venda || '').toString().substring(0, 7)) === mesISO);
  }, [todasVendas, mesISO]);

  const contasPagasNoMes = useMemo(() => {
    return todasContas.filter(c => {
      if (norm(c.status) !== 'pago') return false;
      const pag = (c.data_pagamento || '').toString();
      if (!pag) return false;
      return pag.substring(0, 7) === mesISO;
    });
  }, [todasContas, mesISO]);

  const contasDoMesVencimento = useMemo(() => {
    return todasContas.filter(c => {
      const venc = (c.data_vencimento || '').toString().substring(0, 7);
      return venc === mesISO;
    });
  }, [todasContas, mesISO]);

  const contasPendentes = useMemo(() => {
    return contasDoMesVencimento.filter(c => {
      const s = norm(c.status);
      return s === 'pendente' || s === 'vencido' || s === 'pending';
    });
  }, [contasDoMesVencimento]);

  const totalReceita = useMemo(() =>
    vendasFiltradas.reduce((s, v) => s + (v.total || 0), 0),
    [vendasFiltradas]
  );

  const custosComputados = useMemo(() => {
    const pecas = contasPagasNoMes.filter(c => norm(c.tipo) === 'pecas');
    const variavel = contasPagasNoMes.filter(c => norm(c.tipo) === 'variavel');
    const fixa = contasPagasNoMes.filter(c => norm(c.tipo) === 'fixa');
    const custosTotais = pecas.reduce((s, c) => s + (c.valor || 0), 0);
    const despesasOp = variavel.reduce((s, c) => s + (c.valor || 0), 0);
    const custosFixos = fixa.reduce((s, c) => s + (c.valor || 0), 0);
    return { custosTotais, despesasOp, custosFixos, pecas, variavel, fixa };
  }, [contasPagasNoMes]);

  const metricasPrevistas = useMemo(() => {
    const ordensSemVenda = ordens.filter(o => !(o.vendas?.length));
    const calcValor = (o: OrdemServico) => {
      const vs = Number(o.valor_servico || 0);
      const qs = Number(o.qtd_servico || 1);
      const vp = Number(o.valor_peca || 0);
      const qp = Number(o.qtd_peca || 1);
      return Math.max(0, vs * qs + vp * qp - Number((o as any).desconto || 0));
    };
    const receitaPrevista = ordensSemVenda.reduce((s, o) => s + calcValor(o), 0);

    const pendPecas = contasPendentes.filter(c => norm(c.tipo) === 'pecas');
    const pendVar = contasPendentes.filter(c => norm(c.tipo) === 'variavel');
    const pendFix = contasPendentes.filter(c => norm(c.tipo) === 'fixa');
    const custosPrevistos = pendPecas.reduce((s, c) => s + (c.valor || 0), 0);
    const contasAPagarPrevistas = contasPendentes.reduce((s, c) => s + (c.valor || 0), 0);
    const despesasOpPrev = pendVar.reduce((s, c) => s + (c.valor || 0), 0);
    const custosFixPrev = pendFix.reduce((s, c) => s + (c.valor || 0), 0);
    const lucroPrevisto = receitaPrevista - custosPrevistos;
    const margemPrevista = receitaPrevista > 0 ? (lucroPrevisto / receitaPrevista) * 100 : 0;

    return {
      receitaPrevista,
      custosPrevistos,
      contasAPagarPrevistas,
      despesasOperacionaisPrevistas: despesasOpPrev,
      custosFixosPrevistos: custosFixPrev,
      lucroPrevisto,
      margemPrevista
    };
  }, [ordens, contasPendentes]);

  const metricas = useMemo(() => {
    const { custosTotais, despesasOp, custosFixos } = custosComputados;
    const lucroTotal = totalReceita - custosTotais;
    const saldoNaConta = totalReceita + investimentosMes - custosTotais - despesasOp - custosFixos;
    const margemMedia = totalReceita > 0 ? (lucroTotal / totalReceita) * 100 : 0;

    const ordensComLucro = ordens.map(o => {
      const rec = (o.vendas || []).reduce((s, v) => s + (v.total || 0), 0);
      const custos = (o.custos || [])
        .filter(c => ((c.data_vencimento || '').toString().substring(0, 7)) === mesISO)
        .reduce((s, c) => s + (c.valor || 0), 0);
      return { ...o, receita: rec, custos, lucro: rec - custos };
    });
    const lucrativas = ordensComLucro.filter(o => o.lucro > 0).length;
    const prejuizo = ordensComLucro.filter(o => o.lucro < 0).length;

    return {
      totalReceita,
      totalCustos: custosTotais,
      despesasOperacionais: despesasOp,
      custosFixos,
      saldoNaConta,
      lucroTotal,
      margemMedia,
      totalOS: ordens.length,
      osLucrativas: lucrativas,
      osPrejuizo: prejuizo
    };
  }, [totalReceita, custosComputados, investimentosMes, ordens, mesISO]);

  const saldoNaContaPrevisto = useMemo(() => {
    return metricas.saldoNaConta + metricasPrevistas.receitaPrevista - metricasPrevistas.contasAPagarPrevistas;
  }, [metricas.saldoNaConta, metricasPrevistas.receitaPrevista, metricasPrevistas.contasAPagarPrevistas]);

  const custosEmpresa = useMemo(() => {
    const pagas = contasPagasNoMes.reduce((s, c) => s + (c.valor || 0), 0);
    const pend = contasPendentes.reduce((s, c) => s + (c.valor || 0), 0);
    const pecas = contasDoMesVencimento.filter(c => norm(c.tipo) === 'pecas');
    const gerais = contasDoMesVencimento.filter(c => norm(c.tipo) === 'fixa' || norm(c.tipo) === 'variavel');
    const totalPecas = pecas.reduce((s, c) => s + (c.valor || 0), 0);
    const totalGerais = gerais.reduce((s, c) => s + (c.valor || 0), 0);

    const catMap = new Map<string, { total: number; contasPagas: number; contasPendentes: number; quantidade: number; contas: any[] }>();
    contasDoMesVencimento.forEach(c => {
      const cat = c.tipo || 'Outros';
      if (!catMap.has(cat)) catMap.set(cat, { total: 0, contasPagas: 0, contasPendentes: 0, quantidade: 0, contas: [] });
      const ent = catMap.get(cat)!;
      ent.total += c.valor || 0;
      ent.quantidade += 1;
      if (norm(c.status) === 'pago') ent.contasPagas += c.valor || 0;
      else ent.contasPendentes += c.valor || 0;
      ent.contas.push({ descricao: c.descricao, valor: c.valor, status: c.status, data_vencimento: c.data_vencimento });
    });

    return {
      contasPagas: pagas,
      contasPendentes: pend,
      totalContas: pagas + pend,
      despesasOperacionais: custosComputados.despesasOp,
      custosFixos: custosComputados.custosFixos,
      custosTotais: custosComputados.custosTotais,
      custosPecas: totalPecas,
      custosGerais: totalGerais,
      categoriasDetalhadas: Array.from(catMap.entries()).map(([categoria, d]) => ({ categoria, ...d }))
    };
  }, [contasPagasNoMes, contasPendentes, contasDoMesVencimento, custosComputados]);

  const analiseTecnicos = useMemo(() => {
    const map = new Map<string, { totalOS: number; receitaTotal: number; custosTotal: number; lucroTotal: number }>();
    ordens.forEach(o => {
      const nome = o.tecnico_nome || o.tecnico || 'N/A';
      if (nome === 'N/A') return;
      const rec = (o.vendas || []).reduce((s, v) => s + (v.total || 0), 0);
      const custos = (o.custos || [])
        .filter(c => ((c.data_vencimento || '').toString().substring(0, 7)) === mesISO)
        .reduce((s, c) => s + (c.valor || 0), 0);
      let lucro = rec - custos;
      if (rec === 0) {
        const vs = Number(o.valor_servico || 0);
        const qs = Number(o.qtd_servico || 1);
        const vp = Number(o.valor_peca || 0);
        const qp = Number(o.qtd_peca || 1);
        lucro = Math.max(0, vs * qs + vp * qp) - custos;
      }
      const ent = map.get(nome) || { totalOS: 0, receitaTotal: 0, custosTotal: 0, lucroTotal: 0 };
      ent.totalOS += 1;
      ent.receitaTotal += rec;
      ent.custosTotal += custos;
      ent.lucroTotal += lucro;
      map.set(nome, ent);
    });
    return Array.from(map.entries()).map(([nome, d]) => ({
      tecnico_id: nome,
      nome,
      ...d,
      margemMedia: d.receitaTotal > 0 ? (d.lucroTotal / d.receitaTotal) * 100 : 0
    })).sort((a, b) => b.lucroTotal - a.lucroTotal);
  }, [ordens, mesISO]);

  const dadosDiarios = useMemo(() => {
    const porDia = new Map<number, { dia: number; receita: number; custos: number; lucro: number }>();
    ordens.forEach(o => {
      (o.custos || []).filter(c => ((c.data_vencimento || '').toString().substring(0, 7)) === mesISO).forEach(c => {
        const d = parseInt(((c.data_vencimento || '').toString().split('-')[2]) || '1', 10);
        const ent = porDia.get(d) || { dia: d, receita: 0, custos: 0, lucro: 0 };
        ent.custos += c.valor || 0;
        porDia.set(d, ent);
      });
      (o.vendas || []).forEach(v => {
        const ds = (v.data_venda || '').toString().split('T')[0];
        const d = ds ? parseInt(ds.split('-')[2], 10) : 1;
        const ent = porDia.get(d) || { dia: d, receita: 0, custos: 0, lucro: 0 };
        ent.receita += v.total || 0;
        porDia.set(d, ent);
      });
    });
    porDia.forEach(ent => { ent.lucro = ent.receita - ent.custos; });
    return Array.from(porDia.values()).filter(d => d.receita > 0 || d.custos > 0).sort((a, b) => a.dia - b.dia);
  }, [ordens, mesISO]);

  const metricasPrevistasCompleto = useMemo(() => ({
    ...metricasPrevistas,
    saldoNaContaPrevisto
  }), [metricasPrevistas, saldoNaContaPrevisto]);

  return {
    loading,
    error,
    ordens,
    vendasFiltradas,
    metricas,
    metricasPrevistas: metricasPrevistasCompleto,
    custosEmpresa,
    analiseTecnicos,
    dadosDiarios,
    investimentosMes,
    refetch: loadAll
  };
}
