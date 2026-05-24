import type { HistoricoItem } from '@/hooks/useHistoricoOS';

export type CampoHistoricoOS =
  | 'status'
  | 'status_tecnico'
  | 'equipamento'
  | 'categoria'
  | 'marca'
  | 'modelo'
  | 'cor'
  | 'numero_serie'
  | 'problema_relatado'
  | 'observacao'
  | 'laudo'
  | 'servico'
  | 'peca'
  | 'imagens'
  | 'valor_faturado'
  | 'valor_servico'
  | 'valor_peca'
  | 'data_entrega'
  | 'prazo_entrega'
  | 'acessorios'
  | 'condicoes_equipamento'
  | 'tecnico_id'
  | 'cliente_id';

export interface AlteracaoHistorico {
  campo: CampoHistoricoOS;
  valorAnterior: unknown;
  valorNovo: unknown;
}

export interface EventoHistoricoGerado {
  acao: string;
  categoria: string;
  descricao: string;
  detalhes?: Record<string, unknown>;
  valorAnterior?: string;
  valorNovo?: string;
  campoAlterado?: string;
  observacoes?: string;
}

const CAMPOS_MONETARIOS: CampoHistoricoOS[] = ['valor_faturado', 'valor_servico', 'valor_peca'];

const LABEL_POR_CAMPO: Record<CampoHistoricoOS, string> = {
  status: 'Status',
  status_tecnico: 'Status técnico',
  equipamento: 'Equipamento',
  categoria: 'Categoria',
  marca: 'Marca',
  modelo: 'Modelo',
  cor: 'Cor',
  numero_serie: 'Número de série',
  problema_relatado: 'Problema relatado',
  observacao: 'Observações internas',
  laudo: 'Laudo técnico',
  servico: 'Serviços',
  peca: 'Produtos/peças',
  imagens: 'Imagens',
  valor_faturado: 'Valor total',
  valor_servico: 'Valor de serviços',
  valor_peca: 'Valor de peças',
  data_entrega: 'Data de entrega',
  prazo_entrega: 'Prazo de entrega',
  acessorios: 'Acessórios',
  condicoes_equipamento: 'Condições do equipamento',
  tecnico_id: 'Técnico responsável',
  cliente_id: 'Cliente',
};

/** Normaliza texto vazio (null, undefined, "", whitespace) */
export function normalizarTextoHistorico(valor: unknown): string {
  if (valor === null || valor === undefined) return '';
  return String(valor).trim();
}

export function textoVazio(valor: unknown): boolean {
  return normalizarTextoHistorico(valor) === '';
}

export function parseNumeroHistorico(valor: unknown): number | null {
  if (valor === null || valor === undefined || valor === '') return 0;
  if (typeof valor === 'number') return Number.isNaN(valor) ? null : valor;
  if (typeof valor === 'string') {
    const trimmed = valor.trim();
    if (!trimmed) return 0;
    const normalizado = trimmed.replace(/\./g, '').replace(',', '.');
    const n = Number(normalizado);
    return Number.isNaN(n) ? null : n;
  }
  return null;
}

export function formatValorHistorico(valor: unknown): string {
  if (textoVazio(valor)) return '';
  if (typeof valor === 'number') {
    return valor.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
  if (valor instanceof Date) {
    return valor.toLocaleDateString('pt-BR');
  }
  return String(valor).trim();
}

export function formatMoedaHistorico(valor: unknown): string {
  const num = parseNumeroHistorico(valor);
  if (num === null) return formatValorHistorico(valor);
  return num.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

/** Compara se dois valores representam a mesma informação */
export function valoresHistoricoIguais(campo: CampoHistoricoOS, anterior: unknown, novo: unknown): boolean {
  if (CAMPOS_MONETARIOS.includes(campo)) {
    const numAnterior = parseNumeroHistorico(anterior);
    const numNovo = parseNumeroHistorico(novo);
    if (numAnterior !== null && numNovo !== null) {
      return Math.abs(numAnterior - numNovo) < 0.000001;
    }
  }

  if (campo === 'imagens') {
    const urlsAnterior = parseUrlsImagens(anterior);
    const urlsNovo = parseUrlsImagens(novo);
    if (urlsAnterior.length !== urlsNovo.length) return false;
    return urlsAnterior.every((url, i) => url === urlsNovo[i]);
  }

  if (campo === 'servico' || campo === 'peca') {
    return normalizarLinhasItens(anterior).join('\n') === normalizarLinhasItens(novo).join('\n');
  }

  if (campo === 'data_entrega' || campo === 'prazo_entrega') {
    const a = normalizarTextoHistorico(anterior).slice(0, 10);
    const b = normalizarTextoHistorico(novo).slice(0, 10);
    return a === b;
  }

  const textoAnterior = normalizarTextoHistorico(anterior);
  const textoNovo = normalizarTextoHistorico(novo);
  return textoAnterior === textoNovo;
}

function parseUrlsImagens(valor: unknown): string[] {
  const texto = normalizarTextoHistorico(valor);
  if (!texto) return [];
  return texto.split(',').map((u) => u.trim()).filter(Boolean);
}

function normalizarLinhasItens(valor: unknown): string[] {
  const texto = normalizarTextoHistorico(valor);
  if (!texto) return [];
  return texto.split('\n').map((l) => l.trim()).filter(Boolean);
}

function diffLinhasItens(anterior: unknown, novo: unknown): { adicionados: string[]; removidos: string[] } {
  const ant = new Set(normalizarLinhasItens(anterior));
  const nov = new Set(normalizarLinhasItens(novo));
  const adicionados = [...nov].filter((item) => !ant.has(item));
  const removidos = [...ant].filter((item) => !nov.has(item));
  return { adicionados, removidos };
}

function resumirTexto(texto: string, max = 120): string {
  const limpo = texto.replace(/\s+/g, ' ').trim();
  if (limpo.length <= max) return limpo;
  return `${limpo.slice(0, max)}…`;
}

function diffImagens(anterior: unknown, novo: unknown): { adicionadas: number; removidas: number } {
  const ant = parseUrlsImagens(anterior);
  const nov = parseUrlsImagens(novo);
  const antSet = new Set(ant);
  const novSet = new Set(nov);
  const adicionadas = nov.filter((u) => !antSet.has(u)).length;
  const removidas = ant.filter((u) => !novSet.has(u)).length;
  return { adicionadas, removidas };
}

/** Gera eventos legíveis a partir das alterações detectadas */
export function gerarEventosHistorico(alteracoes: AlteracaoHistorico[]): EventoHistoricoGerado[] {
  const campos = new Set(alteracoes.map((a) => a.campo));
  const eventos: EventoHistoricoGerado[] = [];
  const camposConsumidos = new Set<CampoHistoricoOS>();

  const pegar = (campo: CampoHistoricoOS) => alteracoes.find((a) => a.campo === campo);

  // Status
  for (const campo of ['status', 'status_tecnico'] as const) {
    const alt = pegar(campo);
    if (!alt) continue;
    camposConsumidos.add(campo);
    const anterior = formatValorHistorico(alt.valorAnterior) || '(indefinido)';
    const novo = formatValorHistorico(alt.valorNovo) || '(indefinido)';
    eventos.push({
      acao: 'STATUS_CHANGE',
      categoria: 'STATUS',
      descricao: `${LABEL_POR_CAMPO[campo]} alterado de "${anterior}" para "${novo}"`,
      detalhes: { campo, valor_anterior: alt.valorAnterior, valor_novo: alt.valorNovo },
      valorAnterior: anterior,
      valorNovo: novo,
      campoAlterado: campo,
    });
  }

  // Serviços (ignora totais derivados)
  const altServico = pegar('servico');
  if (altServico) {
    camposConsumidos.add('servico');
    camposConsumidos.add('valor_servico');
    if (campos.has('valor_faturado') && !campos.has('peca')) camposConsumidos.add('valor_faturado');
    eventos.push(criarEventoItens('servico', altServico));
  }

  // Produtos/peças
  const altPeca = pegar('peca');
  if (altPeca) {
    camposConsumidos.add('peca');
    camposConsumidos.add('valor_peca');
    if (campos.has('valor_faturado') && !campos.has('servico')) camposConsumidos.add('valor_faturado');
    eventos.push(criarEventoItens('peca', altPeca));
  }

  // Se serviços E peças mudaram juntos, consolidar valor total
  if (altServico && altPeca) {
    camposConsumidos.add('valor_faturado');
    const altTotal = pegar('valor_faturado');
    if (altTotal) {
      eventos.push({
        acao: 'VALUE_CHANGE',
        categoria: 'FINANCEIRO',
        descricao: `Valor total atualizado para ${formatMoedaHistorico(altTotal.valorNovo)}`,
        detalhes: { campo: 'valor_faturado', valor_anterior: altTotal.valorAnterior, valor_novo: altTotal.valorNovo },
        valorAnterior: formatMoedaHistorico(altTotal.valorAnterior),
        valorNovo: formatMoedaHistorico(altTotal.valorNovo),
        campoAlterado: 'valor_faturado',
      });
    }
  }

  // Imagens
  const altImagens = pegar('imagens');
  if (altImagens) {
    camposConsumidos.add('imagens');
    const { adicionadas, removidas } = diffImagens(altImagens.valorAnterior, altImagens.valorNovo);
    let descricao = '';
    if (adicionadas > 0 && removidas > 0) {
      descricao = `${adicionadas} imagem(ns) adicionada(s) e ${removidas} removida(s)`;
    } else if (adicionadas > 0) {
      descricao = adicionadas === 1 ? 'Imagem anexada à OS' : `${adicionadas} imagens anexadas à OS`;
    } else if (removidas > 0) {
      descricao = removidas === 1 ? 'Imagem removida da OS' : `${removidas} imagens removidas da OS`;
    } else {
      descricao = 'Imagens da OS atualizadas';
    }
    eventos.push({
      acao: 'IMAGE_CHANGE',
      categoria: 'ANEXOS',
      descricao,
      detalhes: { adicionadas, removidas },
    });
  }

  // Laudo técnico
  const altLaudo = pegar('laudo');
  if (altLaudo) {
    camposConsumidos.add('laudo');
    const tinha = !textoVazio(altLaudo.valorAnterior);
    const tem = !textoVazio(altLaudo.valorNovo);
    let descricao = 'Laudo técnico atualizado';
    if (!tinha && tem) descricao = 'Laudo técnico adicionado';
    else if (tinha && !tem) descricao = 'Laudo técnico removido';
    eventos.push({
      acao: 'LAUDO_CHANGE',
      categoria: 'DADOS',
      descricao,
      observacoes: tem ? resumirTexto(normalizarTextoHistorico(altLaudo.valorNovo), 200) : undefined,
      detalhes: { campo: 'laudo' },
    });
  }

  // Demais campos
  for (const alt of alteracoes) {
    if (camposConsumidos.has(alt.campo)) continue;
    if (CAMPOS_MONETARIOS.includes(alt.campo)) {
      eventos.push({
        acao: 'VALUE_CHANGE',
        categoria: 'FINANCEIRO',
        descricao: `${LABEL_POR_CAMPO[alt.campo]} alterado de ${formatMoedaHistorico(alt.valorAnterior)} para ${formatMoedaHistorico(alt.valorNovo)}`,
        detalhes: { campo: alt.campo, valor_anterior: alt.valorAnterior, valor_novo: alt.valorNovo },
        valorAnterior: formatMoedaHistorico(alt.valorAnterior),
        valorNovo: formatMoedaHistorico(alt.valorNovo),
        campoAlterado: alt.campo,
      });
      continue;
    }

    const label = LABEL_POR_CAMPO[alt.campo] || alt.campo;
    const tinha = !textoVazio(alt.valorAnterior);
    const tem = !textoVazio(alt.valorNovo);

    let descricao = `${label} atualizado`;
    if (!tinha && tem) {
      if (alt.campo === 'problema_relatado') {
        descricao = 'Problema relatado registrado';
      } else if (alt.campo === 'observacao') {
        descricao = 'Observação interna adicionada';
      } else if (alt.campo === 'data_entrega') {
        descricao = `Data de entrega definida: ${formatValorHistorico(alt.valorNovo)}`;
      } else {
        descricao = `${label} definido`;
      }
    } else if (tinha && !tem) {
      descricao = `${label} removido`;
    } else if (alt.campo === 'problema_relatado' || alt.campo === 'observacao') {
      descricao = alt.campo === 'problema_relatado' ? 'Problema relatado alterado' : 'Observação interna alterada';
    } else if (alt.campo === 'marca' || alt.campo === 'modelo') {
      descricao = `Aparelho atualizado: ${formatValorHistorico(alt.valorAnterior)} → ${formatValorHistorico(alt.valorNovo)}`;
    } else {
      descricao = `${label} alterado`;
    }

    const categoria =
      alt.campo === 'data_entrega' || alt.campo === 'prazo_entrega'
        ? 'ENTREGA'
        : 'DADOS';

    eventos.push({
      acao: 'FIELD_CHANGE',
      categoria,
      descricao,
      observacoes:
        alt.campo === 'observacao' || alt.campo === 'problema_relatado'
          ? resumirTexto(normalizarTextoHistorico(alt.valorNovo), 200)
          : undefined,
      detalhes: { campo: alt.campo, valor_anterior: alt.valorAnterior, valor_novo: alt.valorNovo },
      valorAnterior: formatValorHistorico(alt.valorAnterior),
      valorNovo: formatValorHistorico(alt.valorNovo),
      campoAlterado: alt.campo,
    });
  }

  return eventos;
}

function criarEventoItens(tipo: 'servico' | 'peca', alt: AlteracaoHistorico): EventoHistoricoGerado {
  const { adicionados, removidos } = diffLinhasItens(alt.valorAnterior, alt.valorNovo);
  const singular = tipo === 'servico' ? 'serviço' : 'produto/peça';
  const plural = tipo === 'servico' ? 'serviços' : 'produtos/peças';
  const categoria = tipo === 'servico' ? 'SERVICOS' : 'PRODUTOS';

  let descricao = tipo === 'servico' ? 'Serviços atualizados' : 'Produtos/peças atualizados';

  if (adicionados.length > 0 && removidos.length === 0) {
    descricao =
      adicionados.length === 1
        ? `${tipo === 'servico' ? 'Serviço' : 'Produto/peça'} adicionado: ${adicionados[0]}`
        : `${adicionados.length} ${plural} adicionados`;
  } else if (removidos.length > 0 && adicionados.length === 0) {
    descricao =
      removidos.length === 1
        ? `${tipo === 'servico' ? 'Serviço' : 'Produto/peça'} removido: ${removidos[0]}`
        : `${removidos.length} ${plural} removidos`;
  }

  const detalhes: Record<string, unknown> = { campo: tipo };
  if (adicionados.length) detalhes.adicionados = adicionados;
  if (removidos.length) detalhes.removidos = removidos;

  return {
    acao: tipo === 'servico' ? 'SERVICE_CHANGE' : 'PRODUCT_CHANGE',
    categoria,
    descricao,
    detalhes,
    observacoes: adicionados.length === 1 ? adicionados[0] : removidos.length === 1 ? removidos[0] : undefined,
  };
}

/** Detecta alterações relevantes entre dados anteriores e novos */
export function detectarAlteracoesRelevantes(
  dadosAtualizacao: Record<string, unknown>,
  osAnterior: Record<string, unknown>,
  camposMonitorados: CampoHistoricoOS[]
): AlteracaoHistorico[] {
  const alteracoes: AlteracaoHistorico[] = [];

  for (const campo of camposMonitorados) {
    if (!(campo in dadosAtualizacao)) continue;
    const valorAnterior = osAnterior[campo];
    const valorNovo = dadosAtualizacao[campo];
    if (valoresHistoricoIguais(campo, valorAnterior, valorNovo)) continue;
    alteracoes.push({ campo, valorAnterior, valorNovo });
  }

  return alteracoes;
}

/** Filtra registros antigos/ruidosos na exibição */
export function filtrarHistoricoRelevante(historico: HistoricoItem[]): HistoricoItem[] {
  return historico.filter((item) => {
    const descricaoMelhorada = melhorarDescricaoHistorico(item);
    if (!descricaoMelhorada) return false;

    // Descartar alterações sem efeito real
    if (item.valor_anterior && item.valor_novo) {
      const ant = normalizarTextoHistorico(item.valor_anterior);
      const novo = normalizarTextoHistorico(item.valor_novo);
      if (ant === novo) return false;
      if ((ant === '' || ant === 'vazio') && (novo === '' || novo === 'vazio')) return false;
    }

    // Descartar descrições "vazio → vazio"
    if (/alterado de "vazio" para "vazio"/i.test(item.descricao)) return false;

    // Descartar totais derivados quando há evento de serviço/produto próximo
    if (
      item.campo_alterado === 'valor_servico' ||
      item.campo_alterado === 'valor_peca' ||
      (item.campo_alterado === 'valor_faturado' && item.acao === 'FIELD_CHANGE')
    ) {
      const proximo = historico.find(
        (h) =>
          h.id !== item.id &&
          h.os_id === item.os_id &&
          Math.abs(new Date(h.created_at).getTime() - new Date(item.created_at).getTime()) < 5000 &&
          (h.campo_alterado === 'servico' ||
            h.campo_alterado === 'peca' ||
            h.acao === 'SERVICE_CHANGE' ||
            h.acao === 'PRODUCT_CHANGE' ||
            h.categoria === 'SERVICOS' ||
            h.categoria === 'PRODUTOS')
      );
      if (proximo) return false;
    }

    return true;
  });
}

export function melhorarDescricaoHistorico(item: HistoricoItem): string {
  let descricao = item.descricao || '';

  // Registros antigos no formato técnico "Campo X alterado de..."
  const matchCampo = descricao.match(/^Campo (.+?) alterado de "(.*)" para "(.*)"$/i);
  if (matchCampo) {
    const [, label, anterior, novo] = matchCampo;
    const ant = anterior === 'vazio' ? '' : anterior;
    const nv = novo === 'vazio' ? '' : novo;
    if (!ant && !nv) return '';
    if (!ant && nv) {
      if (label.toLowerCase().includes('serviço') || label.toLowerCase().includes('servico')) {
        return `Valor de serviços definido: R$ ${nv}`;
      }
      if (label.toLowerCase().includes('peça') || label.toLowerCase().includes('peca')) {
        return `Valor de peças definido: R$ ${nv}`;
      }
      if (label.toLowerCase().includes('faturado')) {
        return `Valor total definido: R$ ${nv}`;
      }
      return `${label} definido`;
    }
    if (ant && !nv) return `${label} removido`;
    return `${label} alterado`;
  }

  if (descricao && !descricao.startsWith('Campo ')) {
    return descricao.replace(/de "vazio" para "vazio"/gi, '').trim() || descricao;
  }

  const campo = (item.campo_alterado || '') as CampoHistoricoOS;
  const label = LABEL_POR_CAMPO[campo] || campo;

  if (item.acao === 'STATUS_CHANGE' || item.categoria === 'STATUS') {
    if (item.valor_anterior && item.valor_novo) {
      return `Status alterado de "${item.valor_anterior}" para "${item.valor_novo}"`;
    }
    return 'Status da OS alterado';
  }

  if (item.categoria === 'ANEXOS' || item.acao === 'IMAGE_UPLOAD' || item.acao === 'IMAGE_CHANGE') {
    return item.descricao || 'Imagem anexada à OS';
  }

  if (campo === 'servico' || item.categoria === 'SERVICOS') {
    return item.descricao || 'Serviços atualizados';
  }

  if (campo === 'peca' || item.categoria === 'PRODUTOS') {
    return item.descricao || 'Produtos/peças atualizados';
  }

  if (campo === 'laudo') {
    return item.descricao || 'Laudo técnico atualizado';
  }

  if (item.categoria === 'FINANCEIRO' || CAMPOS_MONETARIOS.includes(campo)) {
    if (item.valor_anterior && item.valor_novo) {
      return `${label} alterado de ${item.valor_anterior} para ${item.valor_novo}`;
    }
    return `${label} alterado`;
  }

  if (item.valor_anterior && item.valor_novo) {
    const ant = item.valor_anterior === 'vazio' ? '' : item.valor_anterior;
    const novo = item.valor_novo === 'vazio' ? '' : item.valor_novo;
    if (!ant && novo) return `${label} adicionado`;
    if (ant && !novo) return `${label} removido`;
    if (ant && novo) return `${label} alterado`;
  }

  return item.descricao?.replace(/^Campo /, '') || 'Alteração registrada na OS';
}

export const CAMPOS_MONITORADOS_OS: CampoHistoricoOS[] = [
  'status',
  'status_tecnico',
  'equipamento',
  'categoria',
  'marca',
  'modelo',
  'cor',
  'numero_serie',
  'problema_relatado',
  'observacao',
  'laudo',
  'servico',
  'peca',
  'imagens',
  'valor_faturado',
  'valor_servico',
  'valor_peca',
  'data_entrega',
  'prazo_entrega',
  'acessorios',
  'condicoes_equipamento',
  'tecnico_id',
  'cliente_id',
];
