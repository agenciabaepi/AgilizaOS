import type { StaticImageData } from 'next/image';
import ordensImage from '@/assets/imagens/ordens.png';
import dashboardImage from '@/assets/imagens/dashboard.png';
import comissoesImage from '@/assets/imagens/comissoes.png';
import financeiroImage from '@/assets/imagens/financeiro.png';
import contasPagarImage from '@/assets/imagens/contas-a-pagar.png';
import chatOsImage from '@/assets/imagens/chat-os.png';
import anexosOsImage from '@/assets/imagens/anexos-os.png';

export type SystemShowcaseIconId =
  | 'ordens'
  | 'dashboard'
  | 'financeiro'
  | 'contas'
  | 'comissoes'
  | 'chat-os'
  | 'anexos'
  | 'mais';

export type SystemShowcaseSlide = {
  id: SystemShowcaseIconId;
  label: string;
  image?: StaticImageData;
  imageAlt?: string;
  summary: string;
  features: string[];
  extraFeatures?: string[];
  /** Texto extra na página de detalhes */
  detailIntro?: string;
};

export const SYSTEM_SHOWCASE_SLIDES: SystemShowcaseSlide[] = [
  {
    id: 'ordens',
    label: 'Ordens de Serviço',
    image: ordensImage,
    imageAlt: 'Lista de ordens de serviço no Consert',
    summary:
      'Centralize todas as OS da assistência em uma única tela: filtros por status, técnico e tipo, KPIs do dia e busca rápida por cliente, aparelho ou número da ordem.',
    detailIntro:
      'A tela de Ordens de Serviço é o coração operacional da assistência. Em um só lugar você acompanha o volume do dia, filtra pelo status do fluxo e encontra qualquer OS em segundos.',
    features: [
      'KPIs do dia: OS abertas, faturamento, retornos e aprovados',
      'Filtros por status (orçamento, aprovada, concluída, garantia e mais)',
      'Busca por OS, cliente, aparelho, serviço ou técnico',
      'Visão completa de prazo, garantia, valores e status técnico/faturamento',
      'Criação rápida com o botão + Nova OS',
    ],
  },
  {
    id: 'dashboard',
    label: 'Dashboard',
    image: dashboardImage,
    imageAlt: 'Dashboard do sistema Consert',
    summary:
      'Visão geral do mês com faturamento, contas pagas, volume de OS e gráficos para entender o ritmo da assistência em segundos.',
    detailIntro:
      'O Dashboard mostra o pulso do negócio: quanto entrou, quanto saiu, quantas OS entraram e como o volume se distribui por tipo de equipamento e por dia.',
    features: [
      'Indicadores mensais de faturamento, despesas e volume de OS',
      'Comparativo com o mês anterior',
      'Gráfico de OS por categoria de equipamento',
      'Evolução diária de ordens no período',
      'Navegação rápida entre meses',
    ],
  },
  {
    id: 'financeiro',
    label: 'Lucro & Desempenho',
    image: financeiroImage,
    imageAlt: 'Lucro e desempenho no Consert',
    summary:
      'Acompanhe receita, despesas e lucro do mês com margem, composição de gastos e comparativo com o período anterior.',
    detailIntro:
      'Lucro & Desempenho transforma receita e despesas em uma leitura clara do resultado: lucro do mês, margem e comparação com o período anterior.',
    features: [
      'Receita, despesas e lucro do mês em um só lugar',
      'Margem de lucro calculada automaticamente',
      'Composição de despesas (peças, variáveis e fixas)',
      'Comparativo com o mês anterior e variação percentual',
      'Abas por OS, por técnico e DRE',
    ],
  },
  {
    id: 'contas',
    label: 'Contas a Pagar',
    image: contasPagarImage,
    imageAlt: 'Contas a pagar no Consert',
    summary:
      'Gerencie despesas fixas e variáveis com categorias, vencimentos, status de pagamento e ações rápidas para quitar, editar ou excluir.',
    detailIntro:
      'Contas a Pagar organiza o que a assistência deve pagar: fixas, variáveis, peças, categorias e status — com baixa rápida direto na lista.',
    features: [
      'Resumo de pendente, pago, total de despesas e quantidade de contas',
      'Separação entre contas fixas, variáveis e de peças',
      'Categorias coloridas e filtros por status/período',
      'Controle de recorrência (ex.: parcela 12/12)',
      'Baixa rápida, edição e exclusão direto na tabela',
    ],
  },
  {
    id: 'comissoes',
    label: 'Comissões',
    image: comissoesImage,
    imageAlt: 'Comissões dos técnicos no Consert',
    summary:
      'Resumo e gestão de comissões de todos os técnicos: totais, média por OS e status (paga, calculada, pendente e prevista).',
    detailIntro:
      'A tela de Comissões mostra quanto cada técnico gerou no período, a média por OS e o status de cada valor — paga, calculada, pendente ou prevista.',
    features: [
      'Total de comissões, técnicos ativos e média por OS',
      'Resumo por técnico com quantidade de OS',
      'Status visual: paga, calculada, pendente e prevista',
      'Filtro por mês e exportação em CSV/PDF',
      'Modo admin com edição habilitada',
    ],
  },
  {
    id: 'chat-os',
    label: 'Chat da OS',
    image: chatOsImage,
    imageAlt: 'Chat interno vinculado à ordem de serviço',
    summary:
      'Converse sobre cada ordem sem sair do fluxo: chats ligados à OS, histórico de conversas e contexto completo do cliente e do aparelho.',
    detailIntro:
      'O Chat da OS mantém a conversa da equipe ligada à ordem: você vê cliente, aparelho e checklist enquanto discute o reparo no mesmo contexto.',
    features: [
      'Chat interno vinculado à ordem de serviço',
      'Lista de conversas recentes por OS',
      'Contexto da OS, cliente e aparelho lado a lado',
      'Checklist de entrada e status sempre visíveis',
      'Comunicação da equipe sem perder o histórico',
    ],
  },
  {
    id: 'anexos',
    label: 'Anexos na OS',
    image: anexosOsImage,
    imageAlt: 'Anexos de imagens na ordem de serviço',
    summary:
      'Registre fotos do aparelho na entrada e no andamento do reparo — evidências visuais organizadas na própria ordem de serviço.',
    detailIntro:
      'Anexos na OS guardam o registro visual do aparelho: fotos da entrada, do dano e do andamento do reparo, sempre na ordem correta.',
    features: [
      'Upload e visualização de fotos direto na OS',
      'Registro visual do estado do aparelho',
      'Organização por ordem para consulta rápida',
      'Suporte ao fluxo de entrada e acompanhamento',
      'Histórico de imagens disponível para a equipe',
    ],
  },
  {
    id: 'mais',
    label: 'Muito mais',
    summary:
      'Além das telas acima, o Consert inclui recursos que cobrem o dia a dia completo da assistência técnica.',
    detailIntro:
      'O Gestão Consert vai além das telas do carrossel: app do técnico, WhatsApp, laudos com IA, checklist, caixa e muito mais no mesmo sistema.',
    features: [
      'Laudos com IA',
      'App mobile para técnicos',
      'WhatsApp integrado',
      'Checklist digital',
      'Caixa e PDV',
      'Notas fiscais',
    ],
    extraFeatures: ['Laudos com IA', 'App mobile', 'WhatsApp', 'Checklist', 'Caixa', 'Notas fiscais'],
  },
];

export function getSystemShowcaseSlide(slug: string): SystemShowcaseSlide | undefined {
  return SYSTEM_SHOWCASE_SLIDES.find((slide) => slide.id === slug);
}

export function getSystemShowcaseSlugs(): string[] {
  return SYSTEM_SHOWCASE_SLIDES.map((slide) => slide.id);
}
