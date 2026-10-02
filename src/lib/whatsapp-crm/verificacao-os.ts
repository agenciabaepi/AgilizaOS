export interface VerificacaoOsPendente {
  os_id: string;
  numero: number;
  etapa: 'aparelho' | 'nome';
  /** Quantas vezes a pergunta da etapa atual já foi repetida por resposta que não era sim/não */
  repeticoes: number;
  desde: string;
}

export interface VerificacaoOsEstado {
  pendente?: VerificacaoOsPendente | null;
  verificadas?: string[];
  tentativas?: string[];
  /** O.S. cujo link de acompanhamento já foi enviado nesta conversa */
  links_enviados?: string[];
}

export const BOTAO_ATENDENTE = { id: 'falar_atendente', title: 'Falar com atendente' };

const REGEX_PEDIDO_ATENDENTE =
  /^(quero )?(falar com )?(um |uma |o |a )?(atendente|atendimento humano|humano|pessoa|alguem|vendedor|tecnico)( por favor)?$/;

/** Mensagem que é só um pedido de atendente (inclui o toque no botão "Falar com atendente"). */
export function pedidoDeAtendente(texto: string): boolean {
  return REGEX_PEDIDO_ATENDENTE.test(normalizar(texto));
}

export function linkAcompanhamentoOs(osId: string): string {
  const site = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  const base = site && !/localhost|127\.0\.0\.1/.test(site) ? site : 'https://gestaoconsert.com.br';
  return `${base.replace(/\/+$/, '')}/os/${osId}/status`;
}

export const VERIFICACAO_EXPIRA_MS = 30 * 60 * 1000;
export const VERIFICACAO_MAX_TENTATIVAS = 3;
export const VERIFICACAO_JANELA_TENTATIVAS_MS = 24 * 60 * 60 * 1000;

export function pendenteAtiva(estado: VerificacaoOsEstado | null | undefined): VerificacaoOsPendente | null {
  const p = estado?.pendente;
  if (!p) return null;
  return Date.now() - new Date(p.desde).getTime() < VERIFICACAO_EXPIRA_MS ? p : null;
}

export function tentativasRecentes(estado: VerificacaoOsEstado | null | undefined): string[] {
  const limite = Date.now() - VERIFICACAO_JANELA_TENTATIVAS_MS;
  return (estado?.tentativas ?? []).filter((t) => new Date(t).getTime() >= limite);
}

function normalizar(texto: string): string {
  return texto
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9 ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const REGEX_NAO = /^(nao|n|negativo|errado|errada|nem|nope|incorreto)( |$)/;
const REGEX_SIM =
  /^(sim|s|ss|isso|exato|exatamente|correto|correta|certo|certa|confirmo|confirmado|positivo|aham|uhum|yes|claro|perfeito|e sim|e isso|e esse|e essa|e ele|e ela|isso mesmo)( |$)/;

export function classificarSimNao(texto: string): 'sim' | 'nao' | 'outro' {
  if (/👍|✅/.test(texto)) return 'sim';
  if (/👎|❌/.test(texto)) return 'nao';
  const t = normalizar(texto);
  if (REGEX_NAO.test(t)) return 'nao';
  if (t === 'e' || t === 'eh' || REGEX_SIM.test(t)) return 'sim';
  return 'outro';
}

function capitalizar(texto: string): string {
  return texto
    .toLowerCase()
    .split(' ')
    .filter(Boolean)
    .map((p) => {
      if (/^i(phone|pad|mac|pod)/.test(p)) return 'i' + p.charAt(1).toUpperCase() + p.slice(2);
      return p.charAt(0).toUpperCase() + p.slice(1);
    })
    .join(' ');
}

export function descricaoAparelho(os: {
  equipamento?: string | null;
  marca?: string | null;
  modelo?: string | null;
}): string | null {
  const texto = [os.marca, os.modelo].filter((s) => s?.trim()).join(' ') || os.equipamento?.trim() || '';
  return texto ? capitalizar(texto) : null;
}

export function primeiroNome(nome: string | null | undefined): string | null {
  const primeiro = nome?.trim().split(/\s+/)[0];
  return primeiro ? capitalizar(primeiro) : null;
}

export const TEXTOS_VERIFICACAO = {
  perguntaAparelho: (numero: number, aparelho: string) =>
    `Para sua segurança, preciso confirmar alguns dados da O.S. nº ${numero}. O aparelho é um *${aparelho}*? Responda *sim* ou *não*.`,
  perguntaNome: (nome: string, depoisDoAparelho: boolean) =>
    `${depoisDoAparelho ? 'Obrigado! E o' : 'Para sua segurança, preciso confirmar um dado. O'} nome no cadastro é *${nome}*? Responda *sim* ou *não*.`,
  repetir: (pergunta: string) => `Desculpe, não entendi. ${pergunta.replace(/^Para sua segurança, preciso confirmar .*?(?:nº \d+|um dado)\. /, '')}`,
  naoConfirmado:
    'Não consegui confirmar os dados dessa O.S. Por segurança, um atendente vai continuar o seu atendimento por aqui em breve.',
  limite: 'Por segurança, um atendente vai continuar a consulta da sua O.S. por aqui em breve.',
  acompanhamento: (numero: number, link: string | null, senha: string | null) =>
    [
      link && senha
        ? `📲 Você pode acompanhar o status da sua O.S. nº ${numero} ao vivo por aqui:\n${link}\n🔑 *Senha:* ${senha}`
        : null,
      'Se quiser tirar alguma dúvida com a nossa equipe, toque em *Falar com atendente*.',
    ]
      .filter(Boolean)
      .join('\n\n'),
  transferenciaPedida: 'Certo! Um atendente vai continuar o seu atendimento por aqui em breve. 😊',
};
