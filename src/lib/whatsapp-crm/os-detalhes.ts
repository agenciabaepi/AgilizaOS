export interface OsOrcamentoCampos {
  laudo?: string | null;
  servico?: string | null;
  qtd_servico?: number | null;
  valor_servico?: number | null;
  peca?: string | null;
  qtd_peca?: number | null;
  valor_peca?: number | null;
  desconto?: number | null;
  valor_faturado?: number | null;
}

const ENTIDADES: Record<string, string> = {
  '&nbsp;': ' ',
  '&amp;': '&',
  '&lt;': '<',
  '&gt;': '>',
  '&quot;': '"',
  '&#39;': "'",
};

/** Laudo é salvo em HTML pelo editor; no WhatsApp vai como texto simples. */
export function laudoTexto(html: string | null | undefined): string | null {
  if (!html?.trim()) return null;
  const texto = html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<li[^>]*>/gi, '\n• ')
    .replace(/<\/?(p|div|h[1-6])(\s[^>]*)?>|<\/li>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&[a-z#0-9]+;/gi, (e) => ENTIDADES[e.toLowerCase()] ?? ' ')
    .split('\n')
    .map((l) => l.replace(/\s+/g, ' ').trim())
    .filter(Boolean)
    .join('\n');
  return texto ? texto.slice(0, 700) : null;
}

const brl = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

/** O campo peça às vezes vem com "- Qtd: 1 - Valor: R$ ..." colado do catálogo. */
function nomeItem(texto: string | null | undefined): string | null {
  const nome = texto?.split(/\s+-\s+Qtd:/i)[0]?.trim();
  return nome || null;
}

function linhaItem(rotulo: string, nome: string | null, qtd: number, valor: number): string | null {
  if (!nome && valor <= 0) return null;
  const valorTxt = valor > 0 ? (qtd > 1 ? `${qtd} × ${brl(valor)} = ${brl(qtd * valor)}` : brl(valor)) : null;
  return `• ${rotulo}${nome ? `: ${nome}` : ''}${valorTxt ? ` — ${valorTxt}` : ''}`;
}

export function orcamentoOs(os: OsOrcamentoCampos): { linhas: string[]; total: number | null } {
  const qtdServico = Number(os.qtd_servico || 1);
  const qtdPeca = Number(os.qtd_peca || 1);
  const valorServico = Number(os.valor_servico || 0);
  const valorPeca = Number(os.valor_peca || 0);
  const desconto = Number(os.desconto || 0);

  const linhas = [
    linhaItem('Serviço', nomeItem(os.servico), qtdServico, valorServico),
    linhaItem('Peça', nomeItem(os.peca), qtdPeca, valorPeca),
    desconto > 0 ? `• Desconto — -${brl(desconto)}` : null,
  ].filter((l): l is string => !!l);

  const soma = valorServico * qtdServico + valorPeca * qtdPeca - desconto;
  const faturado = Number(os.valor_faturado || 0);
  const total = faturado > 0 ? faturado : soma > 0 ? soma : null;
  return { linhas, total };
}

/** Laudo + orçamento para o cliente; null quando a O.S. ainda não tem nenhum dos dois. */
export function textoDetalhesOs(os: OsOrcamentoCampos): string | null {
  const laudo = laudoTexto(os.laudo);
  const { linhas, total } = orcamentoOs(os);
  const blocos = [
    laudo ? `📝 *Laudo do técnico:*\n${laudo}` : null,
    linhas.length || total
      ? ['💰 *Orçamento:*', ...linhas, total ? `*Total: ${brl(total)}*` : null].filter(Boolean).join('\n')
      : null,
  ].filter(Boolean);
  return blocos.length ? blocos.join('\n\n') : null;
}

/** Versão em uma linha para o contexto da IA responder perguntas sobre o orçamento. */
export function resumoOrcamentoIA(os: OsOrcamentoCampos): string | null {
  const laudo = laudoTexto(os.laudo)?.replace(/\n/g, ' ');
  const { linhas, total } = orcamentoOs(os);
  const partes = [
    laudo ? `laudo do técnico: ${laudo}` : null,
    linhas.length ? `itens: ${linhas.map((l) => l.replace(/^• /, '')).join('; ')}` : null,
    total ? `total do orçamento: ${brl(total)}` : null,
  ].filter(Boolean);
  return partes.length ? partes.join(' | ') : null;
}
