/**
 * JSON Schema para validação do payload de OS
 * Valida antes de enviar para o webhook
 */

export const osPayloadSchema = {
  type: "object",
  required: ["os_id", "numero_os", "status", "cliente_nome", "tecnico_whatsapp"],
  properties: {
    os_id: { type: "string", minLength: 1 },
    numero_os: { type: "number" },
    status: { type: "string" },
    cliente_nome: { type: "string" },
    cliente_telefone: { type: "string" },
    aparelho: { type: "string" },
    modelo: { type: "string" },
    defeito: { type: "string" },
    servico: { type: "string" },
    tecnico_nome: { type: "string" },
    tecnico_whatsapp: { type: "string", pattern: "^[0-9]{11,13}$" },
    link_os: { type: "string" }
  },
  additionalProperties: true
};

/**
 * Valida payload de OS antes de enviar
 */
export function validateOSPayload(payload: any): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  // Validar campos obrigatórios
  if (!payload.os_id) errors.push('os_id é obrigatório');
  if (!payload.numero_os && payload.numero_os !== 0) errors.push('numero_os é obrigatório');
  if (!payload.status) errors.push('status é obrigatório');
  if (!payload.cliente_nome) errors.push('cliente_nome é obrigatório');
  if (!payload.tecnico_whatsapp) errors.push('tecnico_whatsapp é obrigatório');
  
  // Validar formato do WhatsApp
  if (payload.tecnico_whatsapp) {
    const whatsappRegex = /^[0-9]{11,13}$/;
    if (!whatsappRegex.test(payload.tecnico_whatsapp)) {
      errors.push(`tecnico_whatsapp inválido: ${payload.tecnico_whatsapp} (deve ter 11-13 dígitos)`);
    }
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

