/** Extrai string do valor (Supabase pode retornar objeto da relação com .nome). */
function strVal(v: string | null | undefined | { nome?: string }): string {
  if (v == null || v === '') return '';
  if (typeof v === 'string') return v.trim();
  if (typeof v === 'object' && v !== null && 'nome' in v && typeof (v as { nome: string }).nome === 'string') {
    return (v as { nome: string }).nome.trim();
  }
  return String(v).trim();
}

/**
 * Rótulos padronizados para status e status_tecnico de OS.
 * Usado em: Bancada, Ordens, Detalhe da OS, Editar OS, Dashboard técnico.
 * Prioriza status_tecnico para exibição.
 */
export function getStatusTecnicoLabel(status?: string | null, statusTecnico?: string | null): string {
  const st = strVal(statusTecnico).toUpperCase();
  const s = strVal(status).toUpperCase();

  if (st) {
    if (st.includes('SEM REPARO') || st.includes('SEM_REPARO')) return 'Sem Reparo';
    if (st.includes('AGUARDANDO INÍCIO')) return 'Aguardando Início';
    if (st.includes('EM ANÁLISE') || st.includes('EM_ANALISE')) return 'Em Análise';
    if (st.includes('ORÇAMENTO CONCLUÍDO') || st.includes('ORCAMENTO CONCLUIDO')) return 'Orçamento Concluído';
    if (st.includes('EM ATENDIMENTO')) return 'Em Atendimento';
    if (st.includes('AGUARDANDO PEÇA') || st.includes('AGUARDANDO_PECA')) return 'Aguardando Peça';
    if (st.includes('EM EXECUÇÃO') || st.includes('EM_EXECUCAO')) return 'Em Execução';
    if (st.includes('REPARO CONCLUÍDO') || st.includes('CONCLUIDO')) return 'Reparo Concluído';
    if (st === 'ENTREGUE') return 'Entregue';
  }

  if (s) {
    if (s.includes('SEM REPARO') || s.includes('SEM_REPARO')) return 'Sem Reparo';
    if (s.includes('ANÁLISE') || s.includes('ANALISE')) return 'Em Análise';
    if (s.includes('ORÇAMENTO') || s.includes('ORCAMENTO')) return 'Orçamento';
    if (s.includes('EM ATENDIMENTO')) return 'Em Atendimento';
    if (s.includes('AGUARDANDO PEÇA') || s.includes('AGUARDANDO_PECA')) return 'Aguardando Peça';
    if (s === 'APROVADO' || s.includes('APROVADO')) return 'Aprovado';
    if (s.includes('EXECUÇÃO') || s.includes('EXECUCAO')) return 'Em Execução';
    if (s.includes('CONCLUIDO') || s.includes('CONCLUÍDO')) return 'Reparo Concluído';
    if (s === 'ENTREGUE') return 'Entregue';
  }

  const raw = strVal(statusTecnico) || strVal(status);
  if (raw) return raw.charAt(0).toUpperCase() + raw.slice(1).toLowerCase();
  return 'Sem Status';
}
