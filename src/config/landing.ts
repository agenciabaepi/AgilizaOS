import { DIAS_TRIAL_GRATIS } from './trial';

export const LANDING_TRIAL = {
  days: DIAS_TRIAL_GRATIS,
  label: `${DIAS_TRIAL_GRATIS} dias grátis`,
  shortLabel: `Testar ${DIAS_TRIAL_GRATIS} dias grátis`,
  note: 'Sem cartão de crédito. Cancele quando quiser.',
  description: `Teste o sistema completo por ${DIAS_TRIAL_GRATIS} dias, sem compromisso.`,
} as const;

export const SYSTEM_FEATURES = [
  'Ordens de serviço completas',
  'App mobile para técnicos',
  'Dashboard e relatórios em tempo real',
  'Comissões de técnicos',
  'Contas a pagar',
  'Financeiro e lucro',
  'Produtos, estoque e catálogo',
  'Gestão de clientes',
  'Caixa e fluxo financeiro',
  'Laudos com IA',
  'WhatsApp integrado',
  'Checklist digital',
  'Orçamentos e PDV',
  'Bancada do técnico',
  'Multi-usuários e permissões',
  'Impressão e PDF',
  'Lembretes e alertas',
  'Fornecedores e equipamentos',
  'Sistema de notas fiscais (NFC)',
] as const;
