/** Extrai string do valor (Supabase pode retornar objeto da relação com .nome). */
function strVal(v: string | null | undefined | { nome?: string }): string {
  if (v == null || v === '') return '';
  if (typeof v === 'string') return v.trim();
  if (typeof v === 'object' && v !== null && 'nome' in v && typeof (v as { nome: string }).nome === 'string') {
    return (v as { nome: string }).nome.trim();
  }
  return String(v).trim();
}

function normKey(v: string): string {
  return v
    .toUpperCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/_/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function titleCaseStatus(raw: string): string {
  if (!raw) return raw;
  return raw
    .split(/\s+/)
    .map((w) => {
      if (!w) return w;
      const lower = w.toLocaleLowerCase('pt-BR');
      return lower.charAt(0).toLocaleUpperCase('pt-BR') + lower.slice(1);
    })
    .join(' ');
}

/** Rótulos conhecidos — match exato (evita engolir status personalizados). */
const LABEL_TECNICO: Record<string, string> = {
  'AGUARDANDO INICIO': 'Aguardando Início',
  'EM ANALISE': 'Em Análise',
  'ORCAMENTO CONCLUIDO': 'Orçamento Concluído',
  'EM ATENDIMENTO': 'Em Atendimento',
  'AGUARDANDO PECA': 'Aguardando Peça',
  'EM EXECUCAO': 'Em Execução',
  'REPARO CONCLUIDO': 'Reparo Concluído',
  CONCLUIDO: 'Reparo Concluído',
  'SEM REPARO': 'Sem Reparo',
  APROVADO: 'Aprovado',
  'AGUARDANDO APROVACAO': 'Aguardando Aprovação',
  'AGUARDANDO RETIRADA': 'Aguardando Retirada',
  ENTREGUE: 'Entregue',
  'CLIENTE RECUSOU': 'Cliente Recusou',
};

const LABEL_OS: Record<string, string> = {
  ORCAMENTO: 'Orçamento',
  'EM ANALISE': 'Em Análise',
  'ORCAMENTO CONCLUIDO': 'Orçamento Concluído',
  'EM ATENDIMENTO': 'Em Atendimento',
  'AGUARDANDO PECA': 'Aguardando Peça',
  APROVADO: 'Aprovado',
  'EM EXECUCAO': 'Em Execução',
  CONCLUIDO: 'Reparo Concluído',
  'REPARO CONCLUIDO': 'Reparo Concluído',
  'SEM REPARO': 'Sem Reparo',
  ENTREGUE: 'Entregue',
  'AGUARDANDO APROVACAO': 'Aguardando Aprovação',
  'AGUARDANDO RETIRADA': 'Aguardando Retirada',
  'RETORNO GARANTIA': 'Retorno Garantia',
  'CLIENTE RECUSOU': 'Cliente Recusou',
};

export type StatusTecnicoLabelOptions = {
  aparelhoSemConserto?: boolean;
  clienteRecusou?: boolean;
};

/**
 * Rótulos padronizados para status e status_tecnico de OS.
 * Usado em: Bancada, Ordens, Detalhe da OS, Editar OS, Dashboard técnico.
 * Prioriza status_tecnico para exibição; status personalizados aparecem com o nome real.
 */
export function getStatusTecnicoLabel(
  status?: string | null,
  statusTecnico?: string | null,
  options?: StatusTecnicoLabelOptions
): string {
  if (options?.clienteRecusou) return 'Cliente Recusou';
  if (options?.aparelhoSemConserto) return 'Sem Reparo';

  const stRaw = strVal(statusTecnico);
  const sRaw = strVal(status);
  const st = normKey(stRaw);
  const s = normKey(sRaw);

  if (st) {
    if (LABEL_TECNICO[st]) return LABEL_TECNICO[st];
    // Status personalizado do técnico: mostrar o nome como está
    return titleCaseStatus(stRaw);
  }

  if (s) {
    if (LABEL_OS[s]) return LABEL_OS[s];
    return titleCaseStatus(sRaw);
  }

  return 'Sem Status';
}
