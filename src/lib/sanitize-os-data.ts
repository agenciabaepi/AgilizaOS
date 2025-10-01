/**
 * Helper para sanitizar e normalizar dados de OS antes de enviar para webhooks
 */

/**
 * Remove valores como "Não informado", "Não especificado" e retorna string vazia
 */
export function sanitizeValue(value: string | null | undefined): string {
  if (!value) return '';
  
  const str = value.toString().trim();
  
  // Lista de valores inválidos (case-insensitive, com ou sem acento)
  const invalidValues = [
    'não informado',
    'nao informado',
    'não especificado',
    'nao especificado',
    'não definido',
    'nao definido',
    '-',
    'n/a',
    'na'
  ];
  
  // Verifica se o valor é inválido
  const normalizedStr = str.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  if (invalidValues.some(invalid => normalizedStr === invalid)) {
    return '';
  }
  
  return str;
}

/**
 * Remove caracteres não numéricos de telefone
 */
export function sanitizePhone(phone: string | null | undefined): string {
  if (!phone) return '';
  return phone.toString().replace(/\D/g, '');
}

/**
 * Formata WhatsApp para o padrão com DDI (5512...)
 */
export function formatWhatsAppNumber(phone: string | null | undefined): string {
  if (!phone) return '';
  
  const cleanPhone = phone.toString().replace(/\D/g, '');
  
  // Se já começa com 55, retorna
  if (cleanPhone.startsWith('55')) {
    return cleanPhone;
  }
  
  // Adiciona 55
  return `55${cleanPhone}`;
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
  // Mapear aparelho de múltiplas fontes possíveis
  const aparelho = sanitizeValue(
    data.aparelho || data.equipamento
  );
  
  // Mapear modelo
  const modelo = sanitizeValue(data.modelo);
  
  // Mapear defeito de múltiplas fontes possíveis
  const defeito = sanitizeValue(
    data.defeito || data.problema_relatado || data.reclamacao
  );
  
  // Mapear serviço (usar defeito como fallback se não houver)
  const servico = sanitizeValue(data.servico) || defeito;
  
  return {
    os_id: data.os_id,
    numero_os: typeof data.numero_os === 'string' ? parseInt(data.numero_os) || 0 : data.numero_os || 0,
    status: sanitizeValue(data.status),
    cliente_nome: sanitizeValue(data.cliente_nome),
    cliente_telefone: sanitizePhone(data.cliente_telefone),
    aparelho: aparelho,
    modelo: modelo,
    defeito: defeito,
    servico: servico,
    tecnico_nome: sanitizeValue(data.tecnico_nome),
    tecnico_whatsapp: formatWhatsAppNumber(data.tecnico_whatsapp),
    link_os: data.link_os
  };
}

