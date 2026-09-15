/**
 * Verificação de conta no cadastro / primeiro login.
 * Desativada por enquanto: cadastro já libera o uso do sistema.
 * Futuro: reativar com código enviado pela API do WhatsApp (não SMS).
 */
export const SMS_VERIFICATION_ENABLED = false;

/** @deprecated Use SMS_VERIFICATION_ENABLED */
export const EMAIL_VERIFICATION_ENABLED = SMS_VERIFICATION_ENABLED;
