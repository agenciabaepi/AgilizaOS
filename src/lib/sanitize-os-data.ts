/**
 * Helper para sanitizar e normalizar dados de OS antes de enviar para webhooks
 */

// Regex para detectar valores inválidos
const BAD = /^(n[ãa]o\s+informado|nao\s+informado|n[ãa]o\s+especificado|nao\s+especificado|n[ãa]o\s+informado|n[ãa]o\s+especificado|não\s+informado|não\s+especificado)$/i;

/**
 * Normaliza valor e retorna string vazia se for inválido
 */
const norm = (v: any): string => {
  const s = (v ?? '').toString().trim();
  return BAD.test(s) ? '' : s;
};

/**
 * Limpa valor removendo "Não especificado" e similares
 * Alias para norm (compatibilidade)
 */
export const clean = (v: any): string => norm(v);

/**
 * Remove valores como "Não informado", "Não especificado" e retorna string vazia
 */
export function sanitizeValue(value: string | null | undefined): string {
  return norm(value);
}

/**
 * Remove caracteres não numéricos de telefone
 */
export function sanitizePhone(phone: string | null | undefined): string {
  if (!phone) return '';
  return phone.toString().replace(/\D/g, '');
}

/**
 * Normaliza telefone BR para formato E.164
 * Remove espaços, +, parênteses, hífens
 * Adiciona DDI 55 se necessário
 * Substitui 0800 inicial por 55
 */
export function normalizeBRPhone(raw: string): string {
  let s = (raw || '').replace(/\D/g, '').replace(/^0+/, '');
  if (!s.startsWith('55')) s = '55' + s;
  s = s.replace(/^5555/, '55'); // corrigir duplicação
  return s; // sem + (o n8n coloca o +)
}

/**
 * Formata WhatsApp para o padrão com DDI (5512...)
 * Alias para normalizeBRPhone
 */
export function formatWhatsAppNumber(phone: string | null | undefined): string {
  if (!phone) return '';
  return normalizeBRPhone(phone);
}

/**
 * Monta payload sanitizado para webhook de nova OS
 */
export interface OSWebhookPayload {
  os_id: string;
  numero_os: number;
  status: string;
  cliente_nome: string;
  cliente_telefone: string;
  aparelho: string;
  modelo: string;
  defeito: string;
  servico: string;
  tecnico_nome: string;
  tecnico_whatsapp: string;
  link_os: string;
}

export function buildOSWebhookPayload(data: {
  os_id: string;
  numero_os: string | number;
  status?: string;
  cliente_nome?: string;
  cliente_telefone?: string;
  equipamento?: string;
  aparelho?: string;
  marca?: string;
  modelo?: string;
  problema_relatado?: string;
  defeito?: string;
  reclamacao?: string;
  servico?: string;
  tecnico_nome?: string;
  tecnico_whatsapp?: string;
  link_os: string;
}): OSWebhookPayload {
  // Mapear campos usando fallbacks múltiplos
  const aparelho = norm(data.aparelho || data.equipamento);
  const modelo = norm(data.modelo);
  const defeito = norm(data.defeito || data.problema_relatado || data.reclamacao);
  const servico = norm(data.servico);
  
  return {
    os_id: data.os_id || '',
    numero_os: Number(data.numero_os ?? 0),
    status: norm(data.status),
    cliente_nome: norm(data.cliente_nome),
    cliente_telefone: (data.cliente_telefone || '').toString().replace(/\D/g, ''),
    aparelho: aparelho || '',
    modelo: modelo || '',
    defeito: defeito || '',
    servico: servico || '',
    tecnico_nome: norm(data.tecnico_nome),
    tecnico_whatsapp: formatWhatsAppNumber(data.tecnico_whatsapp),
    link_os: data.link_os || (data.numero_os ? `https://gestaoconsert.com.br/ordens/${data.numero_os}` : '')
  };
}

