import type { AutomacaoTemplateVars } from './types';

const VAR_PATTERN = /\{\{(\w+)\}\}/g;

export function renderAutomacaoTemplate(
  template: string,
  vars: AutomacaoTemplateVars
): string {
  return template.replace(VAR_PATTERN, (_, key: string) => {
    const value = vars[key as keyof AutomacaoTemplateVars];
    return value != null ? String(value) : '';
  });
}

export const AUTOMACOES_PADRAO = [
  {
    nome: 'OS cadastrada',
    evento: 'os_criada' as const,
    status_trigger: null,
    mensagem_template:
      'Olá {{cliente_nome}}! 👋\n\nSua ordem de serviço *#{{numero_os}}* foi registrada.\n\nAparelho: {{equipamento}} {{marca}} {{modelo}}\n\nEm breve entraremos em contato com atualizações.',
    ordem: 1,
  },
  {
    nome: 'Orçamento pronto',
    evento: 'os_orcamento_enviado' as const,
    status_trigger: 'ORÇAMENTO CONCLUÍDO',
    mensagem_template:
      'Olá {{cliente_nome}}!\n\nO orçamento da OS *#{{numero_os}}* está pronto.\n\nValor: {{valor}}\n\nAguardamos sua aprovação.',
    ordem: 2,
  },
  {
    nome: 'OS aprovada',
    evento: 'os_aprovada' as const,
    status_trigger: 'APROVADO',
    mensagem_template:
      'Olá {{cliente_nome}}!\n\nSua OS *#{{numero_os}}* foi *aprovada* e o reparo será iniciado. 🔧',
    ordem: 3,
  },
  {
    nome: 'Aguardando peça',
    evento: 'os_aguardando_peca' as const,
    status_trigger: 'AGUARDANDO PEÇA',
    mensagem_template:
      'Olá {{cliente_nome}}!\n\nA OS *#{{numero_os}}* está *aguardando peça*. Avisaremos assim que chegar.',
    ordem: 4,
  },
  {
    nome: 'Reparo concluído',
    evento: 'os_concluida' as const,
    status_trigger: 'CONCLUIDO',
    mensagem_template:
      'Olá {{cliente_nome}}!\n\nO reparo da OS *#{{numero_os}}* foi *concluído*! ✅\n\nAguardamos sua retirada.',
    ordem: 5,
  },
  {
    nome: 'OS entregue',
    evento: 'os_entregue' as const,
    status_trigger: 'ENTREGUE',
    mensagem_template:
      'Olá {{cliente_nome}}!\n\nSua OS *#{{numero_os}}* foi *entregue*. Obrigado pela confiança! 🙏',
    ordem: 6,
  },
];
