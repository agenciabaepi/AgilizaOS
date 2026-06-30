import { supabase } from '@/lib/supabaseClient';
import type { TurnoCaixa } from '@/hooks/useCaixa';
import {
  cupomNaoFiscalDocumentHtml,
  cupomPreviewHtml,
  cupomToHtml,
  type CupomEmpresaInfo,
  type CupomVendaDetalhes,
} from '@/lib/cupom-html';

export interface PdvCaixa {
  id: string;
  empresa_id: string;
  usuario_id: string;
  status: 'ABERTO' | 'FECHADO';
  valor_inicial: number;
  aberto_em: string;
}

export interface PdvProduto {
  id: string;
  nome: string;
  sku: string | null;
  codigo_barras: string | null;
  codigo: number | null;
  preco: number;
  imagem: string | null;
  ativo?: boolean;
}

export interface PdvCliente {
  id: string;
  nome: string;
  cpf_cnpj: string | null;
  endereco_logradouro?: string | null;
  endereco_numero?: string | null;
  endereco_bairro?: string | null;
  endereco_municipio?: string | null;
  endereco?: string | null;
}

export interface PdvUsuario {
  id: string;
  nome: string;
}

export interface CaixaResumoFechamento {
  saldo_atual: number;
  totais_por_forma: { forma: string; total: number }[];
}

export interface VendaComNfce {
  id: string;
  numero: number;
  total: number;
  status: string;
  created_at: string;
  nfce_emitida?: boolean;
}

export interface VendaDetalhes extends CupomVendaDetalhes {}

export interface FinalizarVendaInput {
  empresa_id: string;
  usuario_id: string;
  cliente_id?: string;
  itens: {
    produto_id: string;
    descricao: string;
    preco_unitario: number;
    quantidade: number;
    desconto: number;
  }[];
  pagamentos: { forma: string; valor: number }[];
  desconto_total: number;
  troco: number;
  observacao?: string;
}

export interface FinalizarVendaResult {
  id: string;
  numero: number;
}

const FORMA_LABELS: Record<string, string> = {
  DINHEIRO: 'Dinheiro',
  PIX: 'Pix',
  DEBITO: 'Cartão de débito',
  CREDITO: 'Cartão de crédito',
  OUTROS: 'Outros',
  A_PRAZO: 'A prazo',
  CASHBACK: 'Cashback',
};

export function turnoToPdvCaixa(turno: TurnoCaixa): PdvCaixa {
  return {
    id: turno.id,
    empresa_id: turno.empresa_id,
    usuario_id: turno.usuario_id,
    status: 'ABERTO',
    valor_inicial: turno.valor_abertura,
    aberto_em: turno.data_abertura,
  };
}

function rowToProduto(row: Record<string, unknown>): PdvProduto {
  const imagens = row.imagens_url;
  let imagem: string | null = null;
  if (Array.isArray(imagens) && imagens.length > 0 && typeof imagens[0] === 'string') {
    imagem = imagens[0];
  } else if (typeof imagens === 'string' && imagens.trim()) {
    imagem = imagens;
  }
  const codigoRaw = row.codigo;
  return {
    id: String(row.id),
    nome: String(row.nome ?? ''),
    sku: row.codigo != null ? String(row.codigo) : null,
    codigo_barras: row.codigo_barras != null ? String(row.codigo_barras) : null,
    codigo: typeof codigoRaw === 'number' ? codigoRaw : codigoRaw != null ? Number(codigoRaw) : null,
    preco: Number(row.preco) || 0,
    imagem,
    ativo: row.ativo !== false && row.situacao !== 'inativo',
  };
}

function rowToCliente(row: Record<string, unknown>): PdvCliente {
  return {
    id: String(row.id),
    nome: String(row.nome ?? ''),
    cpf_cnpj: row.cpf_cnpj != null ? String(row.cpf_cnpj) : row.cpf != null ? String(row.cpf) : null,
    endereco_logradouro: row.rua != null ? String(row.rua) : row.endereco != null ? String(row.endereco) : null,
    endereco_numero: row.numero != null ? String(row.numero) : null,
    endereco_bairro: row.bairro != null ? String(row.bairro) : null,
    endereco_municipio: row.cidade != null ? String(row.cidade) : null,
    endereco: row.endereco != null ? String(row.endereco) : null,
  };
}

function parsePagamentosFromForma(formaPagamento: string | null): { forma: string; valor: number }[] {
  if (!formaPagamento?.trim()) return [];
  const parts = formaPagamento.split('·').map((p) => p.trim());
  return parts
    .map((part) => {
      const match = part.match(/^(.+?)\s+R\$\s*([\d.,]+)$/i);
      if (!match) return null;
      const valor = Number(match[2].replace('.', '').replace(',', '.')) || Number(match[2].replace(',', '.')) || 0;
      return { forma: match[1].trim(), valor };
    })
    .filter((p): p is { forma: string; valor: number } => p != null);
}

export interface PdvApiDeps {
  empresaId: string;
  authUserId: string;
  accessToken?: string;
  turnoAtual: TurnoCaixa | null;
  abrirCaixa: (valor: number, obs?: string) => Promise<TurnoCaixa>;
  fecharCaixa: (valorFechamento: number, valorTroco?: number, obs?: string) => Promise<unknown>;
  adicionarMovimentacao: (tipo: 'sangria' | 'suprimento', valor: number, descricao: string) => Promise<unknown>;
  registrarVenda: (vendaId: string, valor: number) => Promise<void>;
  calcularSaldoAtual: () => number;
  verificarTurnoAberto: () => Promise<void>;
  empresaNome?: string;
}

export function createPdvApi(getDeps: () => PdvApiDeps) {
  const authHeaders = (): HeadersInit => {
    const { accessToken } = getDeps();
    return accessToken ? { Authorization: `Bearer ${accessToken}` } : {};
  };

  const buildVendaDetalhes = async (vendaId: string): Promise<VendaDetalhes | null> => {
    const { empresaId, empresaNome } = getDeps();
    const { data: venda } = await supabase.from('vendas').select('*').eq('id', vendaId).maybeSingle();
    if (!venda) return null;

    let clienteNome = '';
    let clienteDoc: string | null = null;
    if (venda.cliente_id) {
      const { data: c } = await supabase
        .from('clientes')
        .select('nome, cpf_cnpj, cpf')
        .eq('id', venda.cliente_id)
        .maybeSingle();
      clienteNome = c?.nome ?? '';
      clienteDoc = c?.cpf_cnpj ?? c?.cpf ?? null;
    }

    let cupomEmpresa: CupomEmpresaInfo | null = null;
    if (empresaId) {
      const { data: empresa } = await supabase
        .from('empresas')
        .select('nome, cnpj, telefone, endereco')
        .eq('id', empresaId)
        .maybeSingle();
      if (empresa) {
        cupomEmpresa = {
          razao_social: empresa.nome,
          cnpj: empresa.cnpj,
          telefone: empresa.telefone,
          endereco: empresa.endereco,
        };
      }
    }

    const produtos = Array.isArray(venda.produtos) ? venda.produtos : [];
    const itens = produtos.map(
      (p: {
        nome?: string;
        quantidade?: number;
        qtd?: number;
        preco_unitario?: number;
        preco?: number;
        desconto?: number;
        subtotal?: number;
      }) => {
        const qtd = p.quantidade ?? p.qtd ?? 1;
        const preco = p.preco_unitario ?? p.preco ?? 0;
        const desconto = p.desconto ?? 0;
        return {
          descricao: p.nome ?? 'Item',
          quantidade: qtd,
          preco_unitario: preco,
          desconto,
          total: p.subtotal ?? preco * qtd - desconto,
        };
      }
    );

    const subtotal = itens.reduce((acc, i) => acc + i.total, 0);
    const pagamentos = parsePagamentosFromForma(venda.forma_pagamento);

    return {
      venda: {
        numero: venda.numero_venda,
        total: Number(venda.total),
        subtotal,
        desconto_total: Number(venda.desconto) || 0,
        status: venda.status === 'finalizada' ? 'CONCLUIDA' : 'CANCELADA',
        created_at: venda.created_at ?? venda.data_venda,
        troco: 0,
      },
      itens,
      pagamentos,
      empresa_nome: cupomEmpresa?.razao_social ?? empresaNome ?? 'Empresa',
      cliente_nome_cupom: clienteNome || undefined,
      cliente_documento_cupom: clienteDoc,
      cupom_empresa: cupomEmpresa,
    };
  };

  const buildCupomHtml = async (vendaId: string): Promise<string> => {
    const detalhes = await buildVendaDetalhes(vendaId);
    if (!detalhes) return '';
    const body = cupomToHtml(detalhes, detalhes.cupom_empresa);
    return cupomPreviewHtml(body);
  };

  return {
    produtos: {
      list: async (_empresaId: string, options?: { apenasAtivos?: boolean }): Promise<PdvProduto[]> => {
        const { empresaId } = getDeps();
        const params = new URLSearchParams({
          empresaId,
          tipo: 'produto',
          apenasAtivos: options?.apenasAtivos !== false ? 'true' : 'false',
        });
        const res = await fetch(`/api/produtos-servicos/listar?${params}`, { headers: authHeaders() });
        if (!res.ok) throw new Error('Erro ao carregar produtos');
        const json = await res.json();
        const rows = Array.isArray(json) ? json : json.data ?? json.produtos ?? [];
        return rows.map((r: Record<string, unknown>) => rowToProduto(r));
      },
      getImagens: async (ids: string[]): Promise<Record<string, string | null>> => {
        if (ids.length === 0) return {};
        const map: Record<string, string | null> = Object.fromEntries(ids.map((id) => [id, null]));
        const { data, error } = await supabase
          .from('produtos_servicos')
          .select('id, imagens_url')
          .in('id', ids);
        if (error) return map;
        for (const row of data ?? []) {
          const imgs = row.imagens_url;
          if (Array.isArray(imgs) && imgs[0]) map[row.id] = String(imgs[0]);
          else if (typeof imgs === 'string' && imgs.trim()) map[row.id] = imgs;
        }
        return map;
      },
    },

    caixa: {
      getAberto: async (): Promise<PdvCaixa | null> => {
        const { turnoAtual } = getDeps();
        if (!turnoAtual) return null;
        return turnoToPdvCaixa(turnoAtual);
      },
      abrir: async (_empresaId: string, _usuarioId: string, valorInicial: number): Promise<PdvCaixa> => {
        const { abrirCaixa } = getDeps();
        const turno = await abrirCaixa(valorInicial);
        if (!turno) throw new Error('Não foi possível abrir o caixa.');
        return turnoToPdvCaixa(turno);
      },
      fechar: async (caixaId: string, valorContado?: number, valorTroco?: number): Promise<PdvCaixa | null> => {
        const { empresaId, fecharCaixa, calcularSaldoAtual, verificarTurnoAberto } = getDeps();
        const contado = valorContado ?? calcularSaldoAtual();
        await fecharCaixa(contado, valorTroco ?? 0);
        await verificarTurnoAberto();
        return {
          id: caixaId,
          empresa_id: empresaId,
          usuario_id: '',
          status: 'FECHADO',
          valor_inicial: 0,
          aberto_em: '',
        };
      },
      getResumoFechamento: async (_caixaId: string): Promise<CaixaResumoFechamento> => {
        const { turnoAtual, calcularSaldoAtual } = getDeps();
        const saldo_atual = calcularSaldoAtual();
        const totaisMap: Record<string, number> = {};

        if (turnoAtual) {
          const { data: vendas } = await supabase
            .from('vendas')
            .select('forma_pagamento, total')
            .eq('turno_id', turnoAtual.id)
            .eq('status', 'finalizada');

          for (const v of vendas ?? []) {
            const pags = parsePagamentosFromForma(v.forma_pagamento);
            if (pags.length === 0) {
              totaisMap['Outros'] = (totaisMap['Outros'] ?? 0) + Number(v.total);
            } else {
              for (const p of pags) {
                totaisMap[p.forma] = (totaisMap[p.forma] ?? 0) + p.valor;
              }
            }
          }
        }

        const totais_por_forma = Object.entries(totaisMap)
          .sort((a, b) => a[0].localeCompare(b[0]))
          .map(([forma, total]) => ({ forma, total }));

        return { saldo_atual, totais_por_forma };
      },
      registrarMovimento: async (d: {
        caixa_id?: string;
        empresa_id?: string;
        tipo: 'SANGRIA' | 'SUPRIMENTO';
        valor: number;
        motivo?: string;
        usuario_id?: string;
      }) => {
        const { adicionarMovimentacao } = getDeps();
        const tipo = d.tipo === 'SANGRIA' ? 'sangria' : 'suprimento';
        await adicionarMovimentacao(tipo, d.valor, d.motivo ?? tipo);
      },
      getHtmlFechamento: async (_caixaId: string, valorManter?: number): Promise<string | null> => {
        const { calcularSaldoAtual } = getDeps();
        const saldo = calcularSaldoAtual();
        return `<div style="font-family:monospace;padding:16px">
          <h3>Relatório de fechamento de caixa</h3>
          <p>Saldo esperado: R$ ${saldo.toFixed(2)}</p>
          ${valorManter ? `<p>Valor sugerido próxima abertura: R$ ${valorManter.toFixed(2)}</p>` : ''}
        </div>`;
      },
      imprimirFechamento: async (_caixaId?: string, _valorManter?: number) => ({
        ok: false as const,
        error: 'Impressão não disponível no modo web.',
      }),
    },

    vendas: {
      finalizar: async (input: FinalizarVendaInput): Promise<FinalizarVendaResult> => {
        const { turnoAtual, registrarVenda } = getDeps();
        if (!turnoAtual) throw new Error('Abra o caixa antes de vender.');

        const { data: ultimaVenda } = await supabase
          .from('vendas')
          .select('numero_venda')
          .eq('empresa_id', input.empresa_id)
          .order('numero_venda', { ascending: false })
          .limit(1)
          .maybeSingle();

        const proximoNumero = (ultimaVenda?.numero_venda || 0) + 1;
        const formaPagamentoStr = input.pagamentos
          .map((p) => `${FORMA_LABELS[p.forma] ?? p.forma} R$ ${p.valor.toFixed(2).replace('.', ',')}`)
          .join(' · ');

        const subtotalItens = input.itens.reduce(
          (acc, i) => acc + i.preco_unitario * i.quantidade - i.desconto,
          0
        );
        const total = subtotalItens - input.desconto_total;

        const payload = {
          numero_venda: proximoNumero,
          data_venda: new Date().toISOString(),
          empresa_id: input.empresa_id,
          cliente_id: input.cliente_id || null,
          turno_id: turnoAtual.id,
          total,
          forma_pagamento: formaPagamentoStr,
          status: 'finalizada',
          desconto: Math.max(0, input.desconto_total),
          acrescimo: input.desconto_total < 0 ? Math.abs(input.desconto_total) : 0,
          tipo_pedido: 'PDV',
          observacoes: input.observacao || null,
          produtos: input.itens.map((i) => ({
            id: i.produto_id,
            produto_id: i.produto_id,
            nome: i.descricao,
            quantidade: i.quantidade,
            preco_unitario: i.preco_unitario,
            preco: i.preco_unitario,
            qtd: i.quantidade,
            desconto: i.desconto,
            acrescimo: 0,
            subtotal: i.preco_unitario * i.quantidade - i.desconto,
          })),
        };

        const { data, error } = await supabase.from('vendas').insert(payload).select().single();
        if (error) throw new Error(error.message);

        await registrarVenda(data.id, total);

        return { id: data.id, numero: proximoNumero };
      },

      list: async (
        _empresaId: string,
        options?: { dataInicio?: string; dataFim?: string; limit?: number }
      ): Promise<VendaComNfce[]> => {
        const { empresaId } = getDeps();
        let query = supabase
          .from('vendas')
          .select('id, numero_venda, total, status, data_venda, created_at')
          .eq('empresa_id', empresaId)
          .eq('tipo_pedido', 'PDV')
          .order('data_venda', { ascending: false });

        if (options?.dataInicio) query = query.gte('data_venda', options.dataInicio);
        if (options?.dataFim) query = query.lte('data_venda', options.dataFim);
        if (options?.limit) query = query.limit(options.limit);

        const { data, error } = await query;
        if (error) throw error;

        return (data ?? []).map((v) => ({
          id: v.id,
          numero: v.numero_venda,
          total: Number(v.total),
          status: v.status === 'finalizada' ? 'CONCLUIDA' : 'CANCELADA',
          created_at: v.created_at ?? v.data_venda,
          nfce_emitida: false,
        }));
      },

      emitirNfce: async (_vendaId?: string) => ({
        ok: false as const,
        error: 'Emissão de NFC-e não configurada neste sistema.',
      }),
    },

    cupom: {
      getHtml: buildCupomHtml,

      getDetalhes: async (vendaId: string): Promise<VendaDetalhes | null> => {
        return buildVendaDetalhes(vendaId);
      },

      imprimir: async (vendaId: string) => {
        try {
          const detalhes = await buildVendaDetalhes(vendaId);
          if (!detalhes) return { ok: false as const, error: 'Venda não encontrada.' };
          const body = cupomToHtml(detalhes, detalhes.cupom_empresa);
          const html = cupomNaoFiscalDocumentHtml(body);
          const w = window.open('', '_blank', 'width=400,height=720');
          if (!w) return { ok: false as const, error: 'Pop-up bloqueado.' };
          w.document.write(html);
          w.document.close();
          w.focus();
          w.print();
          return { ok: true as const };
        } catch (e) {
          return { ok: false as const, error: e instanceof Error ? e.message : 'Erro ao imprimir' };
        }
      },

      imprimirNfce: async (_vendaId?: string) => ({ ok: false as const, error: 'NFC-e não disponível.' }),
    },

    clientes: {
      list: async (_empresaId: string): Promise<PdvCliente[]> => {
        const { empresaId } = getDeps();
        const res = await fetch(`/api/clientes?empresaId=${empresaId}`, { headers: authHeaders() });
        if (!res.ok) throw new Error('Erro ao carregar clientes');
        const json = await res.json();
        const rows = Array.isArray(json) ? json : json.data ?? json.clientes ?? [];
        return rows.map((r: Record<string, unknown>) => rowToCliente(r));
      },
    },

    usuarios: {
      list: async (_empresaId: string): Promise<PdvUsuario[]> => {
        const { empresaId } = getDeps();
        const { data, error } = await supabase
          .from('usuarios')
          .select('id, nome')
          .eq('empresa_id', empresaId)
          .order('nome');
        if (error) throw error;
        return (data ?? []).map((u) => ({ id: u.id, nome: u.nome }));
      },
      get: async (id: string): Promise<PdvUsuario | null> => {
        const { data } = await supabase.from('usuarios').select('id, nome').eq('id', id).maybeSingle();
        return data ? { id: data.id, nome: data.nome } : null;
      },
    },

    cashback: {
      getSaldoCliente: async (_empresaId?: string, _clienteId?: string) => null,
    },
  };
}

export type PdvApi = ReturnType<typeof createPdvApi>;
